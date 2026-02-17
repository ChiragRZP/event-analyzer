#!/usr/bin/env node

/**
 * Automated Event Drop Analyzer with Metabase Integration
 *
 * Fetches event logs directly from Metabase and runs analysis
 * Handles long-running queries with retry logic
 *
 * Usage:
 *   node fetch-and-analyze.js [config-file]
 *   node fetch-and-analyze.js --date 2026-02-11
 *   node fetch-and-analyze.js --date-range 2026-02-11 2026-02-12
 */

const fs = require('fs');
const path = require('path');
const MetabaseClient = require('./utils/metabase-client');
const { parseEventLog, groupByDevice, getDeviceStatistics } = require('./utils/parser');
const { analyzeFlow, calculateDuration } = require('./utils/analyzer');
const { classifyDrop } = require('./utils/classifier');
const { generateReport, printSummary } = require('./utils/reporter');
const { inferPaymentTypeFromEvents } = require('./utils/payment-type-detector');
const { calculateEventStatistics } = require('./utils/event-statistics');

/**
 * Load configuration from file or use defaults
 */
function loadConfig(configPath = './config.json') {
  try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configFile);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`\n❌ Config file not found: ${configPath}`);
      console.error(`\nPlease create a config.json file based on config.example.json:`);
      console.error(`  cp config.example.json config.json`);
      console.error(`  # Then edit config.json with your Metabase credentials\n`);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    configFile: './config.json',
    startDate: null,
    endDate: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--date' && args[i + 1]) {
      // Single date: use same day
      options.startDate = args[i + 1];
      const date = new Date(args[i + 1]);
      date.setDate(date.getDate() + 1);
      options.endDate = date.toISOString().split('T')[0];
      i++;
    } else if (arg === '--date-range' && args[i + 2]) {
      // Date range
      options.startDate = args[i + 1];
      options.endDate = args[i + 2];
      i += 2;
    } else if (arg === '--config' && args[i + 1]) {
      options.configFile = args[i + 1];
      i++;
    } else if (!arg.startsWith('--')) {
      // Assume it's a config file path
      options.configFile = arg;
    }
  }

  return options;
}

/**
 * Save temporary CSV for analysis
 */
function saveTempCSV(csvData) {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const tempFile = path.join(tempDir, `metabase_events_${timestamp}.csv`);

  fs.writeFileSync(tempFile, csvData, 'utf8');
  return tempFile;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 AUTOMATED EVENT DROP ANALYZER WITH METABASE INTEGRATION');
    console.log('='.repeat(80));

    // Parse command line arguments
    const options = parseArgs();

    // Load configuration
    console.log(`\n📋 Loading configuration from: ${options.configFile}`);
    const config = loadConfig(options.configFile);

    // Override dates from command line if provided
    const startDate = options.startDate || config.query.dateRange.start;
    const endDate = options.endDate || config.query.dateRange.end;

    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    console.log(`🔧 Filters:`);
    console.log(`   - newSource: ${config.query.filters.newSource || 'Any'}`);
    console.log(`   - appVersionName: ${config.query.filters.appVersionName || 'Any'}`);
    console.log(`   - web_version: ${config.query.filters.web_version || 'Any'}`);

    // Initialize Metabase client
    console.log(`\n🔌 Connecting to Metabase: ${config.metabase.url}`);
    const metabase = new MetabaseClient(config.metabase);

    // Build query
    const query = metabase.buildEventQuery({
      startDate,
      endDate,
      newSource: config.query.filters.newSource,
      appVersionName: config.query.filters.appVersionName,
      webVersion: config.query.filters.web_version
    });

    console.log(`\n📝 SQL Query:\n${query}\n`);

    // Fetch data from Metabase
    console.log('=' + '='.repeat(79));
    console.log('⬇️  FETCHING DATA FROM METABASE');
    console.log('=' + '='.repeat(79));
    console.log('⚠️  This may take 10+ minutes for large datasets...\n');

    const csvData = await metabase.executeQueryAsCSV(query);

    console.log(`\n✅ Data fetched successfully (${(csvData.length / 1024 / 1024).toFixed(2)}MB)`);

    // Save to temporary file
    const tempFile = saveTempCSV(csvData);
    console.log(`💾 Saved temporary CSV: ${tempFile}`);

    // Parse and analyze
    console.log('\n' + '='.repeat(80));
    console.log('🔬 ANALYZING EVENT LOGS');
    console.log('='.repeat(80));

    const transactionMap = await parseEventLog(tempFile);
    const deviceMap = groupByDevice(transactionMap);
    const deviceStats = getDeviceStatistics(deviceMap);

    console.log('\n📊 Parsed Event Log:');
    console.log(`  Total Devices: ${deviceStats.totalDevices}`);
    console.log(`  Total Transactions: ${deviceStats.totalTransactions}`);
    console.log(`  Total Events: ${deviceStats.totalEvents}`);
    console.log(`  Avg Events/Txn: ${deviceStats.avgEventsPerTxn}`);

    // Analyze each device
    console.log(`\n🔬 Analyzing ${deviceStats.totalDevices} devices...\n`);

    const allAnalyses = [];
    const deviceSummaries = [];
    let processedDevices = 0;

    for (const [dsn, deviceTransactionMap] of deviceMap.entries()) {
      processedDevices++;
      process.stdout.write(`  Processing device ${processedDevices}/${deviceStats.totalDevices}: ${dsn}...\r`);

      const deviceAnalyses = [];

      for (const [txnId, events] of deviceTransactionMap.entries()) {
        let paymentType = events.find(e => e.paymentType)?.paymentType;
        if (!paymentType) {
          paymentType = inferPaymentTypeFromEvents(events);
        }
        if (!paymentType) {
          paymentType = 'UNKNOWN';
        }

        const flowAnalysis = analyzeFlow(events, paymentType);
        const dropClassification = classifyDrop(flowAnalysis, events);
        const duration = calculateDuration(events);

        const mid = events[0]?.properties?.mid || events[0]?.properties?.MID || '';
        const tid = events[0]?.properties?.tid || events[0]?.properties?.TID || '';

        const analysis = {
          txnId,
          dsn,
          mid,
          tid,
          paymentType,
          events,
          flowAnalysis,
          dropClassification,
          duration,
          missingCritical: flowAnalysis.missingCritical,
        };

        deviceAnalyses.push(analysis);
        allAnalyses.push(analysis);
      }

      const deviceEventStats = calculateEventStatistics(deviceAnalyses);
      deviceSummaries.push({
        dsn,
        mid: deviceAnalyses[0]?.mid || '',
        tid: deviceAnalyses[0]?.tid || '',
        ...deviceEventStats,
      });
    }

    console.log(`\n  ✅ Completed analysis of ${deviceStats.totalDevices} devices\n`);

    // Generate reports
    console.log('📝 Generating reports...\n');

    const outputDir = config.output?.directory || './reports';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const reportFiles = generateReport(
      allAnalyses,
      deviceSummaries,
      deviceStats,
      outputDir,
      timestamp
    );

    // Print summary
    printSummary(allAnalyses, deviceSummaries, deviceStats);

    console.log('\n📁 Reports saved to:');
    for (const file of reportFiles) {
      console.log(`  - ${file}`);
    }

    // Clean up temp file unless configured to keep
    if (!config.output?.keepRawCSV) {
      fs.unlinkSync(tempFile);
      console.log(`\n🗑️  Cleaned up temporary CSV file`);
    } else {
      console.log(`\n💾 Raw CSV preserved: ${tempFile}`);
    }

    console.log('\n✅ Analysis complete!\n');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { main, loadConfig, parseArgs };
