-- ===============================================
-- 24 HOURLY CHUNK QUERIES (NO ORDER BY)
-- ===============================================
-- Total events: 9,338,376
-- Average per hour: ~389K events (well under 1M limit)
-- Date: 2026-02-11 (00:00 to 23:59)
--
-- HOW TO USE:
-- 1. Run all 24 queries in Metabase (should be fast - no ORDER BY!)
-- 2. Download each as CSV: hour_00.csv, hour_01.csv, ..., hour_23.csv
-- 3. Combine using bash or Node.js (see bottom of file)
-- 4. Run analyzer: node index.js combined.csv
--
-- The code will handle sorting by DSN → sequence_id → event_time
-- ===============================================


-- ===============================================
-- HOUR 00: 2026-02-11 00:00:00 to 00:59:59
-- ===============================================
-- Save as: hour_00.csv

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
WHERE event_timestamp >= '2026-02-11 00:00:00'
    AND event_timestamp < '2026-02-11 01:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 01: 2026-02-11 01:00:00 to 01:59:59
-- ===============================================
-- Save as: hour_01.csv

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
WHERE event_timestamp >= '2026-02-11 01:00:00'
    AND event_timestamp < '2026-02-11 02:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 02: 2026-02-11 02:00:00 to 02:59:59
-- ===============================================
-- Save as: hour_02.csv

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
WHERE event_timestamp >= '2026-02-11 02:00:00'
    AND event_timestamp < '2026-02-11 03:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 03: 2026-02-11 03:00:00 to 03:59:59
-- ===============================================
-- Save as: hour_03.csv

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
WHERE event_timestamp >= '2026-02-11 03:00:00'
    AND event_timestamp < '2026-02-11 04:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 04: 2026-02-11 04:00:00 to 04:59:59
-- ===============================================
-- Save as: hour_04.csv

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
WHERE event_timestamp >= '2026-02-11 04:00:00'
    AND event_timestamp < '2026-02-11 05:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 05: 2026-02-11 05:00:00 to 05:59:59
-- ===============================================
-- Save as: hour_05.csv

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
WHERE event_timestamp >= '2026-02-11 05:00:00'
    AND event_timestamp < '2026-02-11 06:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 06: 2026-02-11 06:00:00 to 06:59:59
-- ===============================================
-- Save as: hour_06.csv

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
WHERE event_timestamp >= '2026-02-11 06:00:00'
    AND event_timestamp < '2026-02-11 07:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 07: 2026-02-11 07:00:00 to 07:59:59
-- ===============================================
-- Save as: hour_07.csv

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
WHERE event_timestamp >= '2026-02-11 07:00:00'
    AND event_timestamp < '2026-02-11 08:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 08: 2026-02-11 08:00:00 to 08:59:59
-- ===============================================
-- Save as: hour_08.csv

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
WHERE event_timestamp >= '2026-02-11 08:00:00'
    AND event_timestamp < '2026-02-11 09:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 09: 2026-02-11 09:00:00 to 09:59:59
-- ===============================================
-- Save as: hour_09.csv

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
WHERE event_timestamp >= '2026-02-11 09:00:00'
    AND event_timestamp < '2026-02-11 10:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 10: 2026-02-11 10:00:00 to 10:59:59
-- ===============================================
-- Save as: hour_10.csv

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
WHERE event_timestamp >= '2026-02-11 10:00:00'
    AND event_timestamp < '2026-02-11 11:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 11: 2026-02-11 11:00:00 to 11:59:59
-- ===============================================
-- Save as: hour_11.csv

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
WHERE event_timestamp >= '2026-02-11 11:00:00'
    AND event_timestamp < '2026-02-11 12:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 12: 2026-02-11 12:00:00 to 12:59:59
-- ===============================================
-- Save as: hour_12.csv

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
WHERE event_timestamp >= '2026-02-11 12:00:00'
    AND event_timestamp < '2026-02-11 13:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 13: 2026-02-11 13:00:00 to 13:59:59
-- ===============================================
-- Save as: hour_13.csv

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
WHERE event_timestamp >= '2026-02-11 13:00:00'
    AND event_timestamp < '2026-02-11 14:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 14: 2026-02-11 14:00:00 to 14:59:59
-- ===============================================
-- Save as: hour_14.csv

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
WHERE event_timestamp >= '2026-02-11 14:00:00'
    AND event_timestamp < '2026-02-11 15:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 15: 2026-02-11 15:00:00 to 15:59:59
-- ===============================================
-- Save as: hour_15.csv

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
WHERE event_timestamp >= '2026-02-11 15:00:00'
    AND event_timestamp < '2026-02-11 16:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 16: 2026-02-11 16:00:00 to 16:59:59
-- ===============================================
-- Save as: hour_16.csv

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
WHERE event_timestamp >= '2026-02-11 16:00:00'
    AND event_timestamp < '2026-02-11 17:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 17: 2026-02-11 17:00:00 to 17:59:59
-- ===============================================
-- Save as: hour_17.csv

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
WHERE event_timestamp >= '2026-02-11 17:00:00'
    AND event_timestamp < '2026-02-11 18:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 18: 2026-02-11 18:00:00 to 18:59:59
-- ===============================================
-- Save as: hour_18.csv

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
WHERE event_timestamp >= '2026-02-11 18:00:00'
    AND event_timestamp < '2026-02-11 19:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 19: 2026-02-11 19:00:00 to 19:59:59
-- ===============================================
-- Save as: hour_19.csv

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
WHERE event_timestamp >= '2026-02-11 19:00:00'
    AND event_timestamp < '2026-02-11 20:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 20: 2026-02-11 20:00:00 to 20:59:59
-- ===============================================
-- Save as: hour_20.csv

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
WHERE event_timestamp >= '2026-02-11 20:00:00'
    AND event_timestamp < '2026-02-11 21:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 21: 2026-02-11 21:00:00 to 21:59:59
-- ===============================================
-- Save as: hour_21.csv

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
WHERE event_timestamp >= '2026-02-11 21:00:00'
    AND event_timestamp < '2026-02-11 22:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 22: 2026-02-11 22:00:00 to 22:59:59
-- ===============================================
-- Save as: hour_22.csv

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
WHERE event_timestamp >= '2026-02-11 22:00:00'
    AND event_timestamp < '2026-02-11 23:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOUR 23: 2026-02-11 23:00:00 to 23:59:59
-- ===============================================
-- Save as: hour_23.csv

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
WHERE event_timestamp >= '2026-02-11 23:00:00'
    AND event_timestamp < '2026-02-12 00:00:00'
    AND json_extract_path_text(properties::varchar, 'dsn') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123';


-- ===============================================
-- HOW TO COMBINE THE CSV FILES
-- ===============================================

-- After downloading all 24 CSV files (hour_00.csv through hour_23.csv),
-- combine them using one of these methods:

-- METHOD 1: Using Node.js combine-csvs.js script
-- -----------------------------------------------
-- cd ~/Downloads
-- node /Users/peddakondannagari.r/.claude/skills/event-analyzer/combine-csvs.js \
--   hour_00.csv hour_01.csv hour_02.csv hour_03.csv hour_04.csv hour_05.csv \
--   hour_06.csv hour_07.csv hour_08.csv hour_09.csv hour_10.csv hour_11.csv \
--   hour_12.csv hour_13.csv hour_14.csv hour_15.csv hour_16.csv hour_17.csv \
--   hour_18.csv hour_19.csv hour_20.csv hour_21.csv hour_22.csv hour_23.csv \
--   combined_full_day.csv

-- METHOD 2: Using pure bash (simple one-liner)
-- -----------------------------------------------
-- cd ~/Downloads
-- head -n 1 hour_00.csv > combined_full_day.csv && \
-- tail -n +2 -q hour_*.csv >> combined_full_day.csv

-- Verify row count (should be ~9,338,377 = 9,338,376 events + 1 header):
-- wc -l combined_full_day.csv

-- ===============================================
-- RUN THE ANALYZER
-- ===============================================
-- cd /Users/peddakondannagari.r/.claude/skills/event-analyzer
-- node index.js ~/Downloads/combined_full_day.csv
