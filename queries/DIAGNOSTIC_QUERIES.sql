-- ===============================================
-- DIAGNOSTIC QUERIES - Run these in Metabase first
-- to understand your data before chunking
-- ===============================================

-- Query 1: Count events by DSN prefix (to see distribution)
-- -------------------------------------------------------
SELECT
    LEFT(json_extract_path_text(properties::varchar, 'dsn'), 3) as dsn_prefix,
    COUNT(*) as event_count,
    COUNT(DISTINCT json_extract_path_text(properties::varchar, 'dsn')) as device_count,
    COUNT(DISTINCT json_extract_path_text(properties::varchar, 'sequence_id')) as transaction_count
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
GROUP BY LEFT(json_extract_path_text(properties::varchar, 'dsn'), 3)
ORDER BY event_count DESC;

-- This will show you:
-- dsn_prefix | event_count | device_count | transaction_count
-- 149        | 500,000     | 2,000        | 35,000
-- 082        | 400,000     | 1,500        | 28,000
-- etc.


-- ===============================================
-- Query 2: Total event count (to see if it exceeds 1M)
-- -------------------------------------------------------
SELECT
    COUNT(*) as total_events,
    COUNT(DISTINCT json_extract_path_text(properties::varchar, 'dsn')) as total_devices,
    COUNT(DISTINCT json_extract_path_text(properties::varchar, 'sequence_id')) as total_transactions
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';

-- This tells you if your total data exceeds Metabase's 1M limit


-- ===============================================
-- Query 3: Count by device_type field (if it exists)
-- -------------------------------------------------------
SELECT
    json_extract_path_text(properties::varchar, 'device_name') as device_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT json_extract_path_text(properties::varchar, 'dsn')) as device_count
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
GROUP BY json_extract_path_text(properties::varchar, 'device_name')
ORDER BY event_count DESC;


-- ===============================================
-- Query 4: Sample DSN values to see patterns
-- -------------------------------------------------------
SELECT DISTINCT
    json_extract_path_text(properties::varchar, 'dsn') as dsn,
    json_extract_path_text(properties::varchar, 'device_name') as device_type
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
LIMIT 100;
