const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Metabase API Client with robust timeout handling and retry logic
 * Handles long-running queries (10+ minutes) that may timeout
 */
class MetabaseClient {
  constructor(config) {
    this.baseUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
    this.sessionToken = config.sessionToken || null; // Allow pre-provided session token
    this.database = config.database;
    this.queryTimeout = config.queryTimeout || 900000; // 15 minutes default
    this.retryAttempts = config.retryAttempts || 5;
    this.retryDelay = config.retryDelay || 30000; // 30 seconds default
  }

  /**
   * Get session token using username/password
   * Session tokens are valid for 14 days by default
   * @private
   */
  async _getSessionToken() {
    if (this.sessionToken) {
      return this.sessionToken; // Reuse existing token
    }

    if (!this.username || !this.password) {
      throw new Error('Username and password required for session authentication');
    }

    console.log('🔐 Authenticating with Metabase...');

    return new Promise((resolve, reject) => {
      // Construct API URL properly
      const apiPath = this.baseUrl.endsWith('/')
        ? this.baseUrl + 'api/session'
        : this.baseUrl + '/api/session';
      const url = new URL(apiPath);
      const postData = JSON.stringify({
        username: this.username,
        password: this.password
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const protocol = url.protocol === 'https:' ? require('https') : require('http');

      const req = protocol.request(url, options, (res) => {
        let data = '';

        res.on('data', chunk => { data += chunk; });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              this.sessionToken = response.id;
              console.log('✅ Authentication successful');
              resolve(this.sessionToken);
            } catch (error) {
              reject(new Error('Failed to parse session response'));
            }
          } else {
            reject(new Error(`Authentication failed: HTTP ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Execute a native SQL query and download results as CSV
   * Includes retry logic and extended timeout handling
   * @param {string} sqlQuery - Native SQL query to execute
   * @param {string} outputPath - Path to save CSV file (optional)
   * @returns {Promise<string>} - Path to saved CSV or CSV content
   */
  async executeQueryAsCSV(sqlQuery, outputPath = null) {
    // Get session token if using username/password auth
    if (!this.apiKey && (this.username && this.password)) {
      await this._getSessionToken();
    }

    let attempt = 0;
    let lastError = null;

    while (attempt < this.retryAttempts) {
      attempt++;

      try {
        console.log(`\n🔄 Attempt ${attempt}/${this.retryAttempts}: Executing Metabase query...`);
        console.log(`   Query timeout: ${this.queryTimeout / 1000}s`);

        const startTime = Date.now();

        // Execute query and get CSV
        const csvData = await this._makeRequest(sqlQuery);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Query completed successfully in ${elapsed}s`);

        // Save to file if outputPath provided
        if (outputPath) {
          const dir = path.dirname(outputPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(outputPath, csvData, 'utf8');
          console.log(`📁 CSV saved to: ${outputPath}`);
          return outputPath;
        }

        return csvData;

      } catch (error) {
        lastError = error;
        const errorMsg = error.message || error.toString();

        console.error(`❌ Attempt ${attempt} failed: ${errorMsg}`);

        // Check if it's a timeout or server error that we should retry
        const shouldRetry = this._shouldRetry(error, attempt);

        if (shouldRetry && attempt < this.retryAttempts) {
          const waitTime = this.retryDelay * attempt; // Exponential backoff
          console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
          await this._sleep(waitTime);
        } else if (!shouldRetry) {
          // Non-retryable error
          throw error;
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed to execute query after ${this.retryAttempts} attempts. ` +
      `Last error: ${lastError.message || lastError}`
    );
  }

  /**
   * Make HTTP request to Metabase API
   * @private
   */
  _makeRequest(sqlQuery) {
    return new Promise((resolve, reject) => {
      // Construct API URL properly - append to baseUrl instead of replacing
      const apiPath = this.baseUrl.endsWith('/')
        ? this.baseUrl + 'api/dataset/csv'
        : this.baseUrl + '/api/dataset/csv';
      const url = new URL(apiPath);

      // Prepare query payload
      const queryPayload = {
        database: this.database,
        type: 'native',
        native: {
          query: sqlQuery
        }
      };

      const postData = JSON.stringify({ query: queryPayload });

      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };

      // Use API key if available, otherwise use session token
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      } else if (this.sessionToken) {
        headers['X-Metabase-Session'] = this.sessionToken;
      } else {
        throw new Error('No authentication method available (API key or session token)');
      }

      const options = {
        method: 'POST',
        headers,
        timeout: this.queryTimeout
      };

      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(url, options, (res) => {
        let data = '';
        let receivedBytes = 0;
        const totalBytes = parseInt(res.headers['content-length'], 10);

        // Handle different status codes
        if (res.statusCode === 202) {
          // Query accepted but still processing (some Metabase versions)
          console.log('⏳ Query accepted, processing in background...');
        } else if (res.statusCode !== 200) {
          let errorData = '';
          res.on('data', chunk => { errorData += chunk; });
          res.on('end', () => {
            reject(new Error(
              `HTTP ${res.statusCode}: ${res.statusMessage}\n${errorData}`
            ));
          });
          return;
        }

        res.on('data', (chunk) => {
          data += chunk;
          receivedBytes += chunk.length;

          // Show progress if content-length is available
          if (totalBytes && receivedBytes % (1024 * 1024) === 0) {
            const progress = ((receivedBytes / totalBytes) * 100).toFixed(1);
            process.stdout.write(`   Downloading: ${progress}% (${(receivedBytes / 1024 / 1024).toFixed(1)}MB)\r`);
          }
        });

        res.on('end', () => {
          if (totalBytes) {
            console.log(`   Download complete: ${(receivedBytes / 1024 / 1024).toFixed(2)}MB`);
          }
          resolve(data);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.queryTimeout / 1000}s`));
      });

      // Write payload and send request
      req.write(postData);
      req.end();
    });
  }

  /**
   * Determine if error is retryable
   * @private
   */
  _shouldRetry(error, attempt) {
    const errorMsg = error.message || error.toString();

    // Retry on timeout errors
    if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
      console.log(`   → Timeout detected, will retry`);
      return true;
    }

    // Retry on connection errors
    if (errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('ENOTFOUND')) {
      console.log(`   → Connection error, will retry`);
      return true;
    }

    // Retry on 5xx server errors
    if (errorMsg.includes('HTTP 5')) {
      console.log(`   → Server error (5xx), will retry`);
      return true;
    }

    // Retry on 429 (rate limit)
    if (errorMsg.includes('HTTP 429')) {
      console.log(`   → Rate limited, will retry`);
      return true;
    }

    // Don't retry on 4xx client errors (except 429)
    if (errorMsg.includes('HTTP 4')) {
      console.log(`   → Client error (4xx), won't retry`);
      return false;
    }

    // For unknown errors, retry a few times
    if (attempt < 3) {
      console.log(`   → Unknown error, will retry`);
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build SQL query with date range and filters
   * @param {Object} params - Query parameters
   * @returns {string} - SQL query string
   */
  buildEventQuery(params) {
    const {
      startDate,
      endDate,
      newSource = 'ReArch',
      appVersionName = null,
      webVersion = null,
      deviceType = null,
      dsn = null
    } = params;

    let query = `SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
    properties
FROM reporting.posthog_events
WHERE event_timestamp >= '${startDate}'
    AND event_timestamp < '${endDate}'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL`;

    // Add optional filters
    if (newSource) {
      query += `\n    AND json_extract_path_text(properties::varchar, 'newSource') = '${newSource}'`;
    }

    if (appVersionName) {
      query += `\n    AND json_extract_path_text(properties::varchar, 'appVersionName') = '${appVersionName}'`;
    }

    if (webVersion) {
      query += `\n    AND json_extract_path_text(properties::varchar, 'web_version') = '${webVersion}'`;
    }

    if (deviceType) {
      query += `\n    AND device_type = '${deviceType}'`;
    }

    if (dsn) {
      query += `\n    AND json_extract_path_text(properties::varchar, 'dsn') = '${dsn}'`;
    }

    query += `
ORDER BY
    dsn,
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_timestamp;`;

    return query;
  }
}

module.exports = MetabaseClient;
