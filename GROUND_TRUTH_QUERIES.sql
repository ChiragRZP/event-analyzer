-- ================================================================================
-- GROUND TRUTH QUERIES - ACTUAL BQR TRANSACTIONS FROM DATABASE
-- DSN: 1495124238
-- Date: February 11, 2026
-- ================================================================================

-- These queries extract the ACTUAL number of BQR transactions that happened,
-- regardless of what the event analyzer identifies.


-- ================================================================================
-- METHOD 1: BACKEND TRANSACTIONS TABLE (MOST ACCURATE)
-- ================================================================================

-- Get BQR transactions from backend database
-- BQR successful transactions are stored with payment_mode = 'UPI'
-- BQR expired/failed transactions are stored with payment_mode = 'BHARATQR'
SELECT
    payment_mode,
    status,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions
WHERE DATE(created_at) = '2026-02-11'
    AND dsn = '1495124238'
    AND payment_mode IN ('UPI', 'BHARATQR')
GROUP BY payment_mode, status
ORDER BY payment_mode, status;

-- Expected columns:
-- payment_mode='UPI', status='SUCCESS' → BQR successful transactions
-- payment_mode='BHARATQR', status='EXPIRED' → BQR expired transactions
-- payment_mode='BHARATQR', status='FAILED' → BQR failed transactions


-- Total BQR count from backend
SELECT
    COUNT(*) as total_bqr_transactions,
    SUM(CASE WHEN payment_mode = 'UPI' AND status = 'SUCCESS' THEN 1 ELSE 0 END) as bqr_success,
    SUM(CASE WHEN payment_mode = 'BHARATQR' THEN 1 ELSE 0 END) as bqr_failed_expired
FROM transactions
WHERE DATE(created_at) = '2026-02-11'
    AND dsn = '1495124238'
    AND payment_mode IN ('UPI', 'BHARATQR');


-- ================================================================================
-- METHOD 2: FROM EVENTS - payment_initiated_upi
-- ================================================================================

-- All transactions that started with payment_initiated_upi
-- This includes both BQR and UPI (they both use this event)
-- But we can filter by looking at subsequent events
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as upi_initiated_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name = 'payment_initiated_upi';

-- This gives us all UPI+BQR initiated transactions


-- ================================================================================
-- METHOD 3: FROM EVENTS - WALLET_QR_GENERATE (BQR Specific)
-- ================================================================================

-- BQR uses WALLET_QR_GENERATE API, UPI uses different API
-- So this is a definitive BQR identifier
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as bqr_count_by_wallet_qr
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND (
        event_name = 'WALLET_QR_GENERATE_API_REQUEST'
        OR event_name = 'WALLET_QR_GENERATE_API_RESPONSE_SUCCESS'
    );

-- This should give the TRUE BQR count


-- ================================================================================
-- METHOD 4: FROM EVENTS - BQR QR Screen Shown
-- ================================================================================

-- Any transaction that showed the BQR QR screen
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as bqr_qr_shown_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name = 'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN';


-- ================================================================================
-- METHOD 5: FROM EVENTS - Any BQR Event Present
-- ================================================================================

-- Any sequence that has ANY event with 'BQR' in the name
-- (This might over-count if there are generic BQR events)
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as sequences_with_any_bqr_event
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name LIKE '%BQR%';

-- This is likely your 907 number


-- ================================================================================
-- METHOD 6: DETAILED BREAKDOWN - Show what events are in those 907
-- ================================================================================

-- Get all BQR event types and their counts
SELECT
    event_name,
    COUNT(*) as event_count,
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as unique_sequences
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name LIKE '%BQR%'
GROUP BY event_name
ORDER BY unique_sequences DESC, event_count DESC;

-- This will show you which BQR events are causing the high count


-- ================================================================================
-- METHOD 7: COMPARE payment_initiated_upi vs WALLET_QR_GENERATE
-- ================================================================================

-- How many payment_initiated_upi DON'T have WALLET_QR_GENERATE?
-- Those are likely UPI (not BQR)
WITH upi_initiated AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-11'
        AND created_date <= '2026-02-12'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name = 'payment_initiated_upi'
),
wallet_qr AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-11'
        AND created_date <= '2026-02-12'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name LIKE 'WALLET_QR_GENERATE%'
),
upi_qr AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-11'
        AND created_date <= '2026-02-12'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name LIKE 'UPI_QR_GENERATE%'
)
SELECT
    (SELECT COUNT(*) FROM upi_initiated) as total_upi_initiated,
    (SELECT COUNT(*) FROM wallet_qr) as has_wallet_qr_BQR,
    (SELECT COUNT(*) FROM upi_qr) as has_upi_qr_UPI,
    (SELECT COUNT(*) FROM upi_initiated WHERE sequence_id IN (SELECT sequence_id FROM wallet_qr)) as bqr_count,
    (SELECT COUNT(*) FROM upi_initiated WHERE sequence_id IN (SELECT sequence_id FROM upi_qr)) as upi_count,
    (SELECT COUNT(*) FROM upi_initiated WHERE sequence_id NOT IN (SELECT sequence_id FROM wallet_qr) AND sequence_id NOT IN (SELECT sequence_id FROM upi_qr)) as neither;


-- ================================================================================
-- METHOD 8: GET BACKEND TRANSACTION IDS TO CROSS-REFERENCE
-- ================================================================================

-- Get all backend transaction IDs for BQR on this date
SELECT
    transaction_id,
    unique_transaction_id,
    payment_mode,
    status,
    amount,
    created_at
FROM transactions
WHERE DATE(created_at) = '2026-02-11'
    AND dsn = '1495124238'
    AND payment_mode IN ('UPI', 'BHARATQR')
ORDER BY created_at
LIMIT 50;

-- Cross-reference these IDs with events to see if they all appear


-- ================================================================================
-- METHOD 9: FINAL RECOMMENDATION - MOST ACCURATE BQR COUNT
-- ================================================================================

-- Use WALLET_QR_GENERATE as the definitive BQR identifier
-- Combined with success/failure screen to get complete picture
WITH bqr_qr_generated AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-11'
        AND created_date <= '2026-02-12'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name LIKE 'WALLET_QR_GENERATE%'
)
SELECT
    COUNT(*) as total_bqr_transactions,
    SUM(CASE
        WHEN sequence_id IN (
            SELECT json_extract_scalar(properties, '$.sequence_id')
            FROM events.pos_v1
            WHERE created_date >= '2026-02-11'
                AND created_date <= '2026-02-12'
                AND json_extract_scalar(properties, '$.dsn') = '1495124238'
                AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
        ) THEN 1 ELSE 0
    END) as bqr_success,
    SUM(CASE
        WHEN sequence_id NOT IN (
            SELECT json_extract_scalar(properties, '$.sequence_id')
            FROM events.pos_v1
            WHERE created_date >= '2026-02-11'
                AND created_date <= '2026-02-12'
                AND json_extract_scalar(properties, '$.dsn') = '1495124238'
                AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
        ) THEN 1 ELSE 0
    END) as bqr_failed_cancelled
FROM bqr_qr_generated;


-- ================================================================================
-- SUMMARY: Run these in order
-- ================================================================================

-- 1. METHOD 1 - Backend transactions table (GROUND TRUTH if available)
-- 2. METHOD 3 - WALLET_QR_GENERATE count (Most reliable from events)
-- 3. METHOD 5 - Any BQR event (Your 907 - to see what it includes)
-- 4. METHOD 6 - Breakdown of what BQR events exist
-- 5. METHOD 7 - Compare UPI vs BQR classification

-- The TRUE BQR count should come from METHOD 1 or METHOD 3
