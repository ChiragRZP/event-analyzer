-- =============================================================================
-- SINGLE DEVICE EVENT LOG QUERY
-- =============================================================================
--
-- PURPOSE: Get event logs for a SPECIFIC device (DSN) for a specific date
--
-- INSTRUCTIONS:
-- 1. Replace '1495346626' with the desired DSN
-- 2. Replace '2026-02-16' with the desired date
-- 3. Execute this query in Metabase/Querybook
-- 4. Download the result as CSV (e.g., device_1495346626_2026-02-16.csv)
-- 5. Run analyzer: node index.js device_1495346626_2026-02-16.csv
--
-- =============================================================================

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event_name,
    event_timestamp as event_time,
    json_extract_path_text(properties::varchar, 'dsn') as dsn,
    json_extract_path_text(properties::varchar, 'mid') as mid,
    json_extract_path_text(properties::varchar, 'tid') as tid,
    json_extract_path_text(properties::varchar, 'PAYMENT_TYPE') as payment_type,
    json_extract_path_text(properties::varchar, 'amount') as amount,
    json_extract_path_text(properties::varchar, 'EVENT_TIME') as event_timestamp_ms,
    json_extract_path_text(properties::varchar, 'success') as success,
    json_extract_path_text(properties::varchar, 'status') as status,
    json_extract_path_text(properties::varchar, 'txnId') as backend_txn_id,
    json_extract_path_text(properties::varchar, 'errorCode') as error_code,
    json_extract_path_text(properties::varchar, 'error') as error,
    json_extract_path_text(properties::varchar, 'message') as message,
    json_extract_path_text(properties::varchar, 'newSource') as new_source,
    json_extract_path_text(properties::varchar, 'appVersionName') as app_version,
    json_extract_path_text(properties::varchar, 'web_version') as web_version,
    properties
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-16'
    AND event_timestamp < '2026-02-17'
    AND json_extract_path_text(properties::varchar, 'dsn') = '1495346626'
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
ORDER BY
    json_extract_path_text(properties::varchar, 'sequence_id'),
    json_extract_path_text(properties::varchar, 'EVENT_TIME')
LIMIT 100000;

-- =============================================================================
-- NOTES:
-- - This query extracts individual columns for better readability
-- - Still includes full 'properties' JSON for complete analysis
-- - Filters by specific DSN: 1495346626
-- - Date range: 2026-02-16 00:00:00 to 2026-02-17 00:00:00
-- - Orders by sequence_id and EVENT_TIME for chronological flow
-- - LIMIT 100000: Should be more than enough for a single device's daily events
--
-- CUSTOMIZE:
-- - Change DSN: Replace '1495346626' with your target device
-- - Change Date: Replace '2026-02-16' and '2026-02-17' with your date range
-- - Add version filters (if needed):
--   AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
--   AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
--
-- TROUBLESHOOTING:
-- - If no results: Check if DSN exists in that date range
-- - If too many results: Add time range filter (hour specific)
-- - If timeout: Reduce date range to hourly chunks
-- =============================================================================
