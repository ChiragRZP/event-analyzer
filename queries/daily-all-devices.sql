-- =============================================================================
-- QUERYBOOK: All Devices Event Log Query (Daily)
-- =============================================================================
--
-- PURPOSE: Get event logs for ALL devices for a specific date
--
-- INSTRUCTIONS:
-- 1. Replace '2026-02-11' with the desired date
-- 2. Execute this query in Querybook
-- 3. Download the result as CSV (e.g., all_devices_2026-02-11.csv)
-- 4. Run analyzer: node index.js all_devices_2026-02-11.csv
--
-- =============================================================================

SELECT
    json_extract_scalar(properties, '$.sequence_id') as txn_id,
    event_name,
    json_extract_scalar(properties, '$.EVENT_TIMESTAMP') as event_time,
    properties
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') IS NOT NULL
    AND json_extract_scalar(properties, '$.sequence_id') IS NOT NULL
ORDER BY
    json_extract_scalar(properties, '$.dsn'),
    json_extract_scalar(properties, '$.sequence_id'),
    json_extract_scalar(properties, '$.EVENT_TIME')
LIMIT 1000000;

-- =============================================================================
-- NOTES:
-- - Using sequence_id (NOT UNIQUE_TRANSACTION_ID) because:
--   * sequence_id exists for ALL events from start of payment flow
--   * UNIQUE_TRANSACTION_ID only exists after backend transaction is created
--   * This ensures we capture pre-transaction events (QR generation, user cancellations, etc.)
--
-- - EVENT_TIMESTAMP is ISO string format (2026-02-11T06:13:22.494Z)
-- - EVENT_TIME is numeric milliseconds timestamp (used for sorting)
-- - DSN, MID, TID are extracted from properties JSON during analysis
--
-- - Date filtering uses >= and <= to include full day (created_date is partition key)
--
-- - LIMIT 1000000: Safety limit to prevent memory issues
--
-- - If query times out or returns too many rows, consider:
--   1. Batching by DSN ranges (e.g., AND json_extract_scalar(properties, '$.dsn') < '2000000000')
--   2. Splitting by hour ranges
--   3. Processing smaller time windows
-- =============================================================================
