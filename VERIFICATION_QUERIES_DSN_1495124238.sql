-- ================================================================================
-- EVENT ANALYZER VERIFICATION QUERIES
-- DSN: 1495124238
-- Date: February 5, 2026
-- File: full_day_logs_05feb.csv
-- ================================================================================

-- DEVICE INFO
-- DSN: 1495124238
-- MID: 02EZ01000026857
-- TID: 21333691
-- Username: 2133369100
-- Acquirer: SBI
-- Org: CSMCL_SBI


-- ================================================================================
-- QUERY 1: OVERALL TRANSACTION AND EVENT COUNTS
-- Event Analyzer Results:
--   Total Transactions: 814
--   Total Events: 10,902
--   Avg Events/Txn: 13.39
-- ================================================================================

SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as total_transactions,
    COUNT(*) as total_events,
    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')), 2) as avg_events_per_txn
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238';

-- Expected Results:
-- total_transactions: 814
-- total_events: 10,902
-- avg_events_per_txn: 13.39


-- ================================================================================
-- QUERY 2: BQR TRANSACTION COUNT
-- Event Analyzer Results:
--   BQR: 518 sequences
--   Success: 476
--   Cancellations: 40
--   Mode Switches: 1
-- ================================================================================

-- Total BQR sequences (all BQR transactions including success/cancelled)
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as total_bqr_sequences
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND json_extract_scalar(properties, '$.sequence_id') IN (
        -- Find all sequences that have BQR-related events
        SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id')
        FROM events.pos_v1
        WHERE created_date >= '2026-02-05'
            AND created_date <= '2026-02-06'
            AND json_extract_scalar(properties, '$.dsn') = '1495124238'
            AND (
                event_name LIKE '%BQR%'
                OR event_name = 'WALLET_QR_GENERATE_API_REQUEST'
                OR event_name = 'WALLET_QR_GENERATE_API_RESPONSE_SUCCESS'
            )
    );

-- Expected: 518


-- BQR Success Count
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as bqr_success_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN';

-- Expected: 476


-- BQR Cancellations (sequences with cancellation events but not success)
WITH bqr_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name LIKE '%BQR%'
),
success_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
),
cancelled_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND (
            event_name LIKE '%CANCELLED%'
            OR event_name LIKE '%ABORT%'
            OR event_name = 'ON_BACK_PRESSED'
        )
)
SELECT
    COUNT(DISTINCT b.sequence_id) as bqr_cancellations
FROM bqr_sequences b
LEFT JOIN success_sequences s ON b.sequence_id = s.sequence_id
WHERE s.sequence_id IS NULL
    AND b.sequence_id IN (SELECT sequence_id FROM cancelled_sequences);

-- Expected: ~40


-- ================================================================================
-- QUERY 3: CARD TRANSACTION COUNT
-- Event Analyzer Results:
--   CARD: 3 sequences
--   Success: 3
-- ================================================================================

SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as card_success_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN';

-- Expected: 3


-- Get the 3 CARD transaction IDs
SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as card_txn_id
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
ORDER BY card_txn_id;

-- Expected: ML7IWTOF7Z6H1M, ML7IWTOF7Z6HHQ, ML7IWTOF7Z6HME


-- ================================================================================
-- QUERY 4: BQR EVENT COUNTS (PAYMENT EVENTS ONLY)
-- Event Analyzer Results:
--   Expected: 8,806 (518 txns × 17 events)
--   Actual: 8,962
--   Coverage: 101.8%
-- ================================================================================

WITH bqr_success_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
)
SELECT
    COUNT(DISTINCT e.sequence_id) as bqr_success_txns,
    COUNT(*) as total_events_in_bqr_txns,
    -- Exclude non-payment events for accurate count
    SUM(CASE
        WHEN e.event_name NOT IN (
            'amount_screen_shown',
            'button_menu_collect_payment',
            'ON_HOME_PRESSED',
            'ON_BACK_PRESSED',
            'SDK_MPOS_FUNCTIONS_STATUS',
            'APP_LIFECYCLE'
        )
        AND e.event_name NOT LIKE '%TXN_HISTORY%'
        AND e.event_name NOT LIKE '%TXN_LIST%'
        AND e.event_name NOT LIKE '%LOGIN%'
        AND e.event_name NOT LIKE '%SESSION%'
        THEN 1 ELSE 0
    END) as payment_events_only,
    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT e.sequence_id), 2) as avg_events_per_txn
FROM events.pos_v1 e
JOIN (
    SELECT sequence_id, json_extract_scalar(properties, '$.sequence_id') as seq_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    GROUP BY sequence_id, json_extract_scalar(properties, '$.sequence_id')
) s ON json_extract_scalar(e.properties, '$.sequence_id') = s.seq_id
WHERE e.created_date >= '2026-02-05'
    AND e.created_date <= '2026-02-06'
    AND json_extract_scalar(e.properties, '$.dsn') = '1495124238'
    AND s.seq_id IN (SELECT sequence_id FROM bqr_success_sequences);

-- Expected Results:
-- bqr_success_txns: 476-518
-- payment_events_only: ~8,962


-- ================================================================================
-- QUERY 5: CARD EVENT COUNTS
-- Event Analyzer Results:
--   CARD: 3 transactions
--   Expected: 66 (3 txns × 22 events)
--   Actual: 66
--   Coverage: 100%
-- ================================================================================

WITH card_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
)
SELECT
    COUNT(DISTINCT json_extract_scalar(e.properties, '$.sequence_id')) as card_txns,
    COUNT(*) as total_events,
    -- Exclude non-payment events
    SUM(CASE
        WHEN e.event_name NOT IN ('amount_screen_shown')
        AND e.event_name NOT LIKE '%TXN_HISTORY%'
        THEN 1 ELSE 0
    END) as payment_events_only,
    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT json_extract_scalar(e.properties, '$.sequence_id')), 2) as avg_events_per_txn
FROM events.pos_v1 e
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(e.properties, '$.dsn') = '1495124238'
    AND json_extract_scalar(e.properties, '$.sequence_id') IN (
        SELECT sequence_id FROM card_sequences
    );

-- Expected Results:
-- card_txns: 3
-- payment_events_only: 66
-- avg_events_per_txn: 22.00 (or 23.00 if including amount_screen_shown)


-- ================================================================================
-- QUERY 6: NON-PAYMENT EVENTS VERIFICATION
-- Event Analyzer Results:
--   Total Excluded: 1,796
--   PRE_PAYMENT_UI: 802
--   SYSTEM: 581
--   NAVIGATION: 292
--   TRANSACTION_HISTORY: 91
--   LOGIN_SESSION: 18
--   PROMOS: 12
-- ================================================================================

-- PRE_PAYMENT_UI Events
SELECT
    'PRE_PAYMENT_UI' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name IN (
        'amount_screen_shown',
        'button_menu_collect_payment',
        'ON_COLLECT_PAYMENT_BTN_PRESS',
        'collect_payment_screen_shown',
        'COLLECT_PAYMENT_SCREEN_SHOWN',
        'payment_type_selection_screen_shown',
        'PAYMENT_TYPE_SELECTION_SCREEN_SHOWN',
        'amount_entered',
        'AMOUNT_ENTERED',
        'payment_mode_selected',
        'PAYMENT_MODE_SELECTED',
        'payment_options_shown'
    )

UNION ALL

-- SYSTEM Events
SELECT
    'SYSTEM' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND (
        event_name LIKE '%APP_LIFECYCLE%'
        OR event_name = 'SDK_MPOS_FUNCTIONS_STATUS'
        OR event_name = 'SDK_INPUT'
        OR event_name LIKE '%DEVICE_%'
        OR event_name LIKE '%BATTERY_%'
        OR event_name LIKE '%NETWORK_%'
        OR event_name = 'APP_INITIALIZATION_COMPLETED'
        OR event_name = 'LAUNCH_MPOS'
    )

UNION ALL

-- NAVIGATION Events
SELECT
    'NAVIGATION' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name IN (
        'ON_HOME_PRESSED',
        'ON_BACK_PRESSED',
        'HOME_SCREEN_SHOWN',
        'NAVIGATION_DRAWER_OPENED',
        'MENU_ITEM_CLICKED'
    )

UNION ALL

-- TRANSACTION_HISTORY Events
SELECT
    'TRANSACTION_HISTORY' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND (
        event_name LIKE '%TXN_HISTORY%'
        OR event_name LIKE '%TXN_LIST%'
        OR event_name LIKE '%TRANSACTION_HISTORY%'
    )

UNION ALL

-- LOGIN_SESSION Events
SELECT
    'LOGIN_SESSION' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND (
        event_name LIKE '%LOGIN%'
        OR event_name LIKE '%LOGOUT%'
        OR event_name = 'IS_SESSION_VALID'
        OR event_name = 'login_flow_start'
    )

UNION ALL

-- PROMOS Events
SELECT
    'PROMOS' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name LIKE '%PROMO%'

ORDER BY event_count DESC;

-- Expected Results:
-- PRE_PAYMENT_UI: 802
-- SYSTEM: 581
-- NAVIGATION: 292
-- TRANSACTION_HISTORY: 91
-- LOGIN_SESSION: 18
-- PROMOS: 12


-- ================================================================================
-- QUERY 7: POLLING EVENTS VERIFICATION (BQR)
-- Event Analyzer Results:
--   Polling events occur 1-12 times per transaction
--   Average: 1.12 rounds
-- ================================================================================

WITH bqr_success_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
),
polling_counts AS (
    SELECT
        json_extract_scalar(e.properties, '$.sequence_id') as sequence_id,
        SUM(CASE WHEN e.event_name = 'UPI_API_EVENT_REQ_CHECK_STATUS' THEN 1 ELSE 0 END) as req_check_status_count,
        SUM(CASE WHEN e.event_name = 'PAYMENT_STATUS_API_REQUEST' THEN 1 ELSE 0 END) as status_api_request_count,
        SUM(CASE WHEN e.event_name = 'UPI_API_EVENT_RESP_CHECK_STATUS' THEN 1 ELSE 0 END) as resp_check_status_count,
        SUM(CASE WHEN e.event_name = 'PAYMENT_STATUS_API_RESPONSE_SUCCESS' THEN 1 ELSE 0 END) as status_api_response_count
    FROM events.pos_v1 e
    WHERE e.created_date >= '2026-02-05'
        AND e.created_date <= '2026-02-06'
        AND json_extract_scalar(e.properties, '$.dsn') = '1495124238'
        AND json_extract_scalar(e.properties, '$.sequence_id') IN (SELECT sequence_id FROM bqr_success_sequences)
    GROUP BY json_extract_scalar(e.properties, '$.sequence_id')
)
SELECT
    MIN(req_check_status_count) as min_polling_rounds,
    MAX(req_check_status_count) as max_polling_rounds,
    ROUND(AVG(req_check_status_count), 2) as avg_polling_rounds,
    COUNT(*) as total_bqr_successes
FROM polling_counts;

-- Expected Results:
-- min_polling_rounds: 1
-- max_polling_rounds: 12
-- avg_polling_rounds: 1.12
-- total_bqr_successes: 476


-- Polling distribution
WITH bqr_success_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
),
polling_counts AS (
    SELECT
        json_extract_scalar(e.properties, '$.sequence_id') as sequence_id,
        SUM(CASE WHEN e.event_name = 'UPI_API_EVENT_REQ_CHECK_STATUS' THEN 1 ELSE 0 END) as polling_rounds
    FROM events.pos_v1 e
    WHERE e.created_date >= '2026-02-05'
        AND e.created_date <= '2026-02-06'
        AND json_extract_scalar(e.properties, '$.dsn') = '1495124238'
        AND json_extract_scalar(e.properties, '$.sequence_id') IN (SELECT sequence_id FROM bqr_success_sequences)
    GROUP BY json_extract_scalar(e.properties, '$.sequence_id')
)
SELECT
    polling_rounds,
    COUNT(*) as transaction_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM polling_counts), 2) as percentage
FROM polling_counts
GROUP BY polling_rounds
ORDER BY polling_rounds;


-- ================================================================================
-- QUERY 8: PRINT EVENTS VERIFICATION
-- Event Analyzer expects: print failures in ~100% of successes (printer out of paper)
-- ================================================================================

WITH success_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name LIKE '%TRANSACTION_SUCCESS_SCREEN_SHOWN%'
)
SELECT
    SUM(CASE WHEN e.event_name LIKE '%AUTOMATE_PRINT_CHANRGESLIP%' THEN 1 ELSE 0 END) as print_initiated,
    SUM(CASE WHEN e.event_name = 'print_status_check_failed' THEN 1 ELSE 0 END) as print_status_failed,
    SUM(CASE WHEN e.event_name = 'print_receipt_failed' THEN 1 ELSE 0 END) as print_receipt_failed,
    SUM(CASE WHEN e.event_name LIKE '%print_status_check%' THEN 1 ELSE 0 END) as print_status_checks,
    COUNT(DISTINCT json_extract_scalar(e.properties, '$.sequence_id')) as total_success_txns
FROM events.pos_v1 e
WHERE e.created_date >= '2026-02-05'
    AND e.created_date <= '2026-02-06'
    AND json_extract_scalar(e.properties, '$.dsn') = '1495124238'
    AND json_extract_scalar(e.properties, '$.sequence_id') IN (SELECT sequence_id FROM success_sequences);


-- ================================================================================
-- QUERY 9: SPECIFIC CARD TRANSACTION VALIDATION
-- Verify event sequences for the 3 CARD transactions
-- ================================================================================

-- Get event sequence for ML7IWTOF7Z6H1M
SELECT
    json_extract_scalar(properties, '$.sequence_id') as txn_id,
    event_name,
    from_unixtime(event_timestamp) as event_time,
    ROW_NUMBER() OVER (
        PARTITION BY json_extract_scalar(properties, '$.sequence_id')
        ORDER BY event_timestamp
    ) as event_number
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND json_extract_scalar(properties, '$.sequence_id') = 'ML7IWTOF7Z6H1M'
ORDER BY event_timestamp;

-- Expected: 23 total events (22 payment + 1 amount_screen_shown)


-- ================================================================================
-- QUERY 10: PAYMENT TYPE CLASSIFICATION
-- Verify how transactions are classified
-- ================================================================================

SELECT
    CASE
        WHEN event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'BQR'
        WHEN event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CARD'
        WHEN event_name = 'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'UPI'
        WHEN event_name = 'CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CASH'
        ELSE 'OTHER'
    END as payment_type,
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as success_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name LIKE '%TRANSACTION_SUCCESS_SCREEN_SHOWN%'
GROUP BY
    CASE
        WHEN event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'BQR'
        WHEN event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CARD'
        WHEN event_name = 'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'UPI'
        WHEN event_name = 'CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CASH'
        ELSE 'OTHER'
    END
ORDER BY success_count DESC;

-- Expected:
-- BQR: 476
-- CARD: 3


-- ================================================================================
-- QUERY 11: SUMMARY - ONE-STOP VERIFICATION
-- ================================================================================

WITH device_events AS (
    SELECT
        json_extract_scalar(properties, '$.sequence_id') as sequence_id,
        event_name,
        event_timestamp
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
)
SELECT
    COUNT(DISTINCT sequence_id) as total_transactions,
    COUNT(*) as total_events,
    SUM(CASE WHEN event_name LIKE '%BQR%' THEN 1 ELSE 0 END) as bqr_related_events,
    SUM(CASE WHEN event_name LIKE '%CARD%' OR event_name LIKE '%Card_%' THEN 1 ELSE 0 END) as card_related_events,
    SUM(CASE WHEN event_name LIKE '%TRANSACTION_SUCCESS_SCREEN_SHOWN%' THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN event_name = 'amount_screen_shown' THEN 1 ELSE 0 END) as pre_payment_ui_count,
    SUM(CASE WHEN event_name = 'ON_BACK_PRESSED' THEN 1 ELSE 0 END) as back_pressed_count,
    SUM(CASE WHEN event_name = 'ON_HOME_PRESSED' THEN 1 ELSE 0 END) as home_pressed_count
FROM device_events;

-- Expected Results:
-- total_transactions: 814
-- total_events: 10,902
-- bqr_related_events: ~1,246
-- card_related_events: ~66
-- success_count: 479
-- pre_payment_ui_count: 802


-- ================================================================================
-- QUERY 12: UNIQUE EVENT TYPES COUNT
-- Event Analyzer: 68 unique payment event types
-- ================================================================================

WITH device_events AS (
    SELECT DISTINCT event_name
    FROM events.pos_v1
    WHERE created_date >= '2026-02-05'
        AND created_date <= '2026-02-06'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        -- Exclude non-payment events
        AND event_name NOT IN (
            'amount_screen_shown',
            'button_menu_collect_payment',
            'ON_HOME_PRESSED',
            'ON_BACK_PRESSED',
            'SDK_MPOS_FUNCTIONS_STATUS',
            'SDK_INPUT',
            'APP_LIFECYCLE',
            'APP_INITIALIZATION_COMPLETED',
            'LAUNCH_MPOS',
            'IS_SESSION_VALID',
            'login_flow_start'
        )
        AND event_name NOT LIKE '%TXN_HISTORY%'
        AND event_name NOT LIKE '%TXN_LIST%'
        AND event_name NOT LIKE '%LOGIN%'
        AND event_name NOT LIKE '%PROMO%'
)
SELECT COUNT(*) as unique_payment_event_types
FROM device_events;

-- Expected: 68


-- ================================================================================
-- QUERY 13: GET ALL UNIQUE EVENT NAMES (FOR DEBUGGING)
-- ================================================================================

SELECT
    event_name,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as txn_count
FROM events.pos_v1
WHERE created_date >= '2026-02-05'
    AND created_date <= '2026-02-06'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
GROUP BY event_name
ORDER BY occurrence_count DESC;
