-- ===============================================
-- ALL 10 CHUNK QUERIES - LIMIT/OFFSET APPROACH
-- ===============================================
-- Total events: 9,338,376
-- Each chunk gets 1M events (except last chunk gets ~338K)
--
-- HOW TO USE:
-- 1. Run CHUNK 1 first to test if ORDER BY works in Metabase
-- 2. If it completes successfully, run all 10 chunks in sequence
-- 3. Download each as CSV: chunk_01.csv, chunk_02.csv, ..., chunk_10.csv
-- 4. Combine using: node combine-csvs.js chunk_01.csv chunk_02.csv ... chunk_10.csv combined.csv
-- 5. Run analyzer: node index.js combined.csv
--
-- WARNING: If queries timeout, we need to switch to WHERE-clause chunking
-- ===============================================


-- ===============================================
-- CHUNK 1: Events 0 to 1,000,000
-- ===============================================
-- Save as: chunk_01.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 0;


-- ===============================================
-- CHUNK 2: Events 1,000,000 to 2,000,000
-- ===============================================
-- Save as: chunk_02.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 1000000;


-- ===============================================
-- CHUNK 3: Events 2,000,000 to 3,000,000
-- ===============================================
-- Save as: chunk_03.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 2000000;


-- ===============================================
-- CHUNK 4: Events 3,000,000 to 4,000,000
-- ===============================================
-- Save as: chunk_04.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 3000000;


-- ===============================================
-- CHUNK 5: Events 4,000,000 to 5,000,000
-- ===============================================
-- Save as: chunk_05.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 4000000;


-- ===============================================
-- CHUNK 6: Events 5,000,000 to 6,000,000
-- ===============================================
-- Save as: chunk_06.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 5000000;


-- ===============================================
-- CHUNK 7: Events 6,000,000 to 7,000,000
-- ===============================================
-- Save as: chunk_07.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 6000000;


-- ===============================================
-- CHUNK 8: Events 7,000,000 to 8,000,000
-- ===============================================
-- Save as: chunk_08.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 7000000;


-- ===============================================
-- CHUNK 9: Events 8,000,000 to 9,000,000
-- ===============================================
-- Save as: chunk_09.csv

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 8000000;


-- ===============================================
-- CHUNK 10: Events 9,000,000 to end (~9,338,376)
-- ===============================================
-- Save as: chunk_10.csv
-- This is the final chunk - only ~338K events

SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
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
    json_extract_path_text(properties::varchar, 'web_version') as web_version
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    json_extract_path_text(properties::varchar, 'dsn'),
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_time
LIMIT 1000000 OFFSET 9000000;
