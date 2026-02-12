-- ================================================================================
-- CORRECTED EVENT ANALYZER VERIFICATION QUERIES
-- DSN: 1495124238
-- Date: February 11, 2026
-- File: feb11_full_logs.csv
-- ================================================================================

-- ================================================================================
-- QUERY 1: OVERALL TRANSACTION AND EVENT COUNTS
-- Event Analyzer Results (Feb 11):
--   Total Transactions: 1,019
--   Total Events: 13,126
--   Avg Events/Txn: 12.88
-- ================================================================================

SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as total_transactions,
    COUNT(*) as total_events,
    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')), 2) as avg_events_per_txn
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238';

-- Expected Results:
-- total_transactions: 1,019
-- total_events: 13,126
-- avg_events_per_txn: 12.88


-- ================================================================================
-- QUERY 2: BQR TRANSACTION COUNT (CORRECTED)
-- Event Analyzer Results:
--   BQR: 594 sequences (total)
--   Success: 557
--   Cancellations: 36
--   Mode Switches: 1
-- ================================================================================

-- Total BQR sequences (using same logic as event analyzer)
-- BQR is identified by having ANY of these specific indicator events:
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as total_bqr_sequences
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND json_extract_scalar(properties, '$.sequence_id') IN (
        -- Find sequences with BQR indicator events (matches payment-type-detector.js logic)
        SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id')
        FROM events.pos_v1
        WHERE created_date >= '2026-02-11'
            AND created_date <= '2026-02-12'
            AND json_extract_scalar(properties, '$.dsn') = '1495124238'
            AND (
                -- BQR-specific events
                event_name = 'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN'
                OR event_name = 'BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION'
                OR event_name = 'BQR_AUTOMATE_PRINT_CHANRGESLIP'
                OR event_name LIKE 'BQR_print_status_check%'
                OR event_name = 'BQR_API_EVENT_REQ_STOP_PAYMENT'
                OR event_name = 'BQR_API_EVENT_RESP_STOP_PAYMENT'
                OR event_name = 'BHARATQR_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN'
                OR event_name LIKE 'WALLET_QR_GENERATE_API%'  -- Includes REQUEST and RESPONSE_SUCCESS
                OR event_name = 'BQR_API_EVENT_REQ_PAY_BQR_QR'
                OR event_name = 'BQR_API_EVENT_RESP_PAY_BQR_QR'
                OR event_name = 'BQR_API_EVENT_REQ_CHECK_STATUS'
                OR event_name = 'BQR_API_EVENT_RESP_CHECK_STATUS'
                OR event_name = 'BQR_UI_EVENT_BQR_CHECK_STATUS_PROGRESS_INITIATED'
                OR event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
            )
    );

-- Expected: 594


-- BQR Success Count
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as bqr_success_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN';

-- Expected: 557


-- BQR Cancellations (BQR sequences without success screen)
WITH bqr_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-11'
        AND created_date <= '2026-02-12'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND (
            event_name = 'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN'
            OR event_name = 'BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION'
            OR event_name = 'BQR_AUTOMATE_PRINT_CHANRGESLIP'
            OR event_name LIKE 'BQR_print_status_check%'
            OR event_name LIKE 'WALLET_QR_GENERATE_API%'
            OR event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
        )
),
success_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-11'
        AND created_date <= '2026-02-12'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
)
SELECT
    COUNT(DISTINCT b.sequence_id) as bqr_non_success,
    (SELECT COUNT(*) FROM success_sequences) as bqr_success,
    (SELECT COUNT(*) FROM bqr_sequences) as bqr_total
FROM bqr_sequences b
LEFT JOIN success_sequences s ON b.sequence_id = s.sequence_id
WHERE s.sequence_id IS NULL;

-- Expected:
-- bqr_non_success: ~37 (594 - 557)
-- bqr_success: 557
-- bqr_total: 594


-- ================================================================================
-- QUERY 3: CARD TRANSACTION COUNT
-- Event Analyzer Results:
--   CARD: 6 sequences
--   Success: 2
-- ================================================================================

-- Total CARD sequences
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as total_card_sequences
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND json_extract_scalar(properties, '$.sequence_id') IN (
        SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id')
        FROM events.pos_v1
        WHERE created_date >= '2026-02-11'
            AND created_date <= '2026-02-12'
            AND json_extract_scalar(properties, '$.dsn') = '1495124238'
            AND (
                event_name = 'payment_initiated_card'
                OR event_name = 'Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN'
                OR event_name = 'Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN'
                OR event_name = 'Card_APP_EVENT_PIN_ENTERED'
                OR event_name LIKE 'CARD_PAYMENT_API_EVENT%'
                OR event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
                OR event_name = 'CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN'
                OR event_name = 'CARD_PAYMENT_SELECTED'
            )
    );

-- Expected: 6


-- CARD Success Count
SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as card_success_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN';

-- Expected: 2


-- ================================================================================
-- QUERY 4: CHEQUE TRANSACTION COUNT
-- Event Analyzer Results:
--   CHEQUE: 2 sequences
--   Success: 0
--   Drops: 2
-- ================================================================================

SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as total_cheque_sequences
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND json_extract_scalar(properties, '$.sequence_id') IN (
        SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id')
        FROM events.pos_v1
        WHERE created_date >= '2026-02-11'
            AND created_date <= '2026-02-12'
            AND json_extract_scalar(properties, '$.dsn') = '1495124238'
            AND (
                event_name = 'cheque_payment_screen_shown'
                OR event_name = 'cheque_payment_initiated'
                OR event_name = 'cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
                OR event_name = 'cheque_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN'
            )
    );

-- Expected: 2


-- ================================================================================
-- QUERY 5: BQR EVENT COUNTS (PAYMENT EVENTS ONLY)
-- Event Analyzer Results:
--   Expected: 10,098 (594 txns × 17 events)
--   Actual: 10,548
--   Coverage: 104.5%
-- ================================================================================

WITH bqr_sequences AS (
    SELECT DISTINCT json_extract_scalar(properties, '$.sequence_id') as sequence_id
    FROM events.pos_v1
    WHERE created_date >= '2026-02-11'
        AND created_date <= '2026-02-12'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
        AND (
            event_name = 'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN'
            OR event_name LIKE 'WALLET_QR_GENERATE_API%'
            OR event_name = 'BQR_AUTOMATE_PRINT_CHANRGESLIP'
            OR event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
        )
)
SELECT
    COUNT(DISTINCT json_extract_scalar(e.properties, '$.sequence_id')) as bqr_txns,
    COUNT(*) as total_events_in_bqr_txns,
    -- Exclude non-payment events
    SUM(CASE
        WHEN e.event_name NOT IN (
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
        AND e.event_name NOT LIKE '%TXN_HISTORY%'
        AND e.event_name NOT LIKE '%TXN_LIST%'
        AND e.event_name NOT LIKE '%LOGIN%'
        AND e.event_name NOT LIKE '%PROMO%'
        AND e.event_name NOT LIKE '%SESSION%'
        THEN 1 ELSE 0
    END) as payment_events_only,
    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT json_extract_scalar(e.properties, '$.sequence_id')), 2) as avg_events_per_txn
FROM events.pos_v1 e
WHERE e.created_date >= '2026-02-11'
    AND e.created_date <= '2026-02-12'
    AND json_extract_scalar(e.properties, '$.dsn') = '1495124238'
    AND json_extract_scalar(e.properties, '$.sequence_id') IN (SELECT sequence_id FROM bqr_sequences);

-- Expected Results:
-- bqr_txns: 594
-- payment_events_only: ~10,548


-- ================================================================================
-- QUERY 6: TOTAL SUCCESS COUNT (ALL PAYMENT TYPES)
-- Event Analyzer Results:
--   Total Successful Payments: 559
-- ================================================================================

SELECT
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as total_success_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name LIKE '%TRANSACTION_SUCCESS_SCREEN_SHOWN%';

-- Expected: 559


-- Breakdown by payment type
SELECT
    CASE
        WHEN event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'BQR'
        WHEN event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CARD'
        WHEN event_name = 'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'UPI'
        WHEN event_name = 'CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CASH'
        WHEN event_name = 'cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CHEQUE'
        ELSE 'OTHER'
    END as payment_type,
    COUNT(DISTINCT json_extract_scalar(properties, '$.sequence_id')) as success_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name LIKE '%TRANSACTION_SUCCESS_SCREEN_SHOWN%'
GROUP BY
    CASE
        WHEN event_name = 'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'BQR'
        WHEN event_name = 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CARD'
        WHEN event_name = 'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'UPI'
        WHEN event_name = 'CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CASH'
        WHEN event_name = 'cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN' THEN 'CHEQUE'
        ELSE 'OTHER'
    END
ORDER BY success_count DESC;

-- Expected:
-- BQR: 557
-- CARD: 2
-- CHEQUE: 0


-- ================================================================================
-- QUERY 7: NON-PAYMENT EVENTS VERIFICATION
-- Event Analyzer Results:
--   Total Excluded: 2,398
--   PRE_PAYMENT_UI: 1,009
--   SYSTEM: 843
--   NAVIGATION: 422
--   TRANSACTION_HISTORY: 85
--   PROMOS: 21
--   LOGIN_SESSION: 18
-- ================================================================================

SELECT
    'PRE_PAYMENT_UI' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
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

SELECT
    'SYSTEM' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
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

SELECT
    'NAVIGATION' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name IN (
        'ON_HOME_PRESSED',
        'ON_BACK_PRESSED',
        'HOME_SCREEN_SHOWN',
        'NAVIGATION_DRAWER_OPENED',
        'MENU_ITEM_CLICKED'
    )

UNION ALL

SELECT
    'TRANSACTION_HISTORY' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND (
        event_name LIKE '%TXN_HISTORY%'
        OR event_name LIKE '%TXN_LIST%'
        OR event_name LIKE '%TRANSACTION_HISTORY%'
    )

UNION ALL

SELECT
    'LOGIN_SESSION' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND (
        event_name LIKE '%LOGIN%'
        OR event_name LIKE '%LOGOUT%'
        OR event_name = 'IS_SESSION_VALID'
        OR event_name = 'login_flow_start'
    )

UNION ALL

SELECT
    'PROMOS' as category,
    COUNT(*) as event_count
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = '1495124238'
    AND event_name LIKE '%PROMO%'

ORDER BY event_count DESC;

-- Expected Results:
-- PRE_PAYMENT_UI: 1,009
-- SYSTEM: 843
-- NAVIGATION: 422
-- TRANSACTION_HISTORY: 85
-- PROMOS: 21
-- LOGIN_SESSION: 18


-- ================================================================================
-- QUERY 8: SUMMARY - ONE-STOP VERIFICATION
-- ================================================================================

WITH device_events AS (
    SELECT
        json_extract_scalar(properties, '$.sequence_id') as sequence_id,
        event_name,
        event_timestamp
    FROM events.pos_v1
    WHERE created_date >= '2026-02-11'
        AND created_date <= '2026-02-12'
        AND json_extract_scalar(properties, '$.dsn') = '1495124238'
)
SELECT
    COUNT(DISTINCT sequence_id) as total_transactions,
    COUNT(*) as total_events,
    SUM(CASE WHEN event_name LIKE '%BQR%' OR event_name LIKE '%WALLET_QR_GENERATE%' THEN 1 ELSE 0 END) as bqr_related_events,
    SUM(CASE WHEN event_name LIKE '%CARD%' OR event_name LIKE '%Card_%' THEN 1 ELSE 0 END) as card_related_events,
    SUM(CASE WHEN event_name LIKE '%TRANSACTION_SUCCESS_SCREEN_SHOWN%' THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN event_name = 'amount_screen_shown' THEN 1 ELSE 0 END) as pre_payment_ui_count,
    SUM(CASE WHEN event_name = 'ON_BACK_PRESSED' THEN 1 ELSE 0 END) as back_pressed_count
FROM device_events;

-- Expected Results:
-- total_transactions: 1,019
-- total_events: 13,126
-- success_count: 559
-- pre_payment_ui_count: 1,009
