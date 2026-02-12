---
name: event-analyzer
description: Analyze POS event logs for legitimate event drops, excluding user cancellations and payment mode switches
---

# Event Drop Analyzer

AI-powered analyzer for POS payment event logs that identifies **legitimate event drops** while intelligently filtering out user-initiated actions (cancellations and payment mode switches).

## Usage

Upload a CSV or Excel file containing event logs:

```
User: "Analyze this event log for drops"
[Attach: device_events_2026-02-03.csv]
```

Or specify a file path:

```
User: "Analyze event drops in /path/to/events.csv"
```

## Input Format

The input file (CSV or Excel) must contain these columns:

### Required Columns

1. **txn_id** (or `UNIQUE_TRANSACTION_ID` or `transaction_id`)
   - Transaction identifier that groups related events

2. **event_name** (or `event` or `EVENT_NAME`)
   - Event name (e.g., `UPI_QR_SHOWN`, `PAYMENT_CANCELLED`)

3. **event_time** (or `EVENT_TIMESTAMP` or `timestamp`)
   - Event timestamp (ISO 8601 format or Unix milliseconds)

4. **properties** (or `PROPERTIES`)
   - JSON object containing:
     - `sequence_id` - Sequence identifier (changes on mode switch)
     - `PAYMENT_TYPE` - Payment method (UPI, CARD, BQR, etc.)
     - `amount` - Transaction amount
     - Additional metadata (error codes, txnId, etc.)

### Querybook Query to Extract Events

Use this query in Querybook to get data in the correct format:

```sql
SELECT
    json_extract_scalar(properties, '$.UNIQUE_TRANSACTION_ID') as txn_id,
    event as event_name,
    from_unixtime(CAST(json_extract_scalar(properties, '$.EVENT_TIMESTAMP') AS BIGINT) / 1000) as event_time,
    properties
FROM events.pos_v1
WHERE created_date = date_format(current_date - INTERVAL '1' DAY, '%Y-%m-%d')
    AND json_extract_scalar(properties, '$.dsn') = 'YOUR_DEVICE_SERIAL'
ORDER BY
    json_extract_scalar(properties, '$.UNIQUE_TRANSACTION_ID'),
    CAST(json_extract_scalar(properties, '$.EVENT_TIMESTAMP') AS BIGINT) ASC
LIMIT 10000;
```

Replace `YOUR_DEVICE_SERIAL` with the actual device serial number.

## Output Format

The analyzer generates a CSV file with these columns:

| Column             | Description                                           |
| ------------------ | ----------------------------------------------------- |
| Transaction ID     | Unique transaction identifier                         |
| Payment Type       | UPI, CARD, BQR, etc.                                  |
| Drop Category      | Category of drop (see below)                          |
| Severity           | CRITICAL, HIGH, MEDIUM, or INFO                       |
| Drop Reason        | Human-readable explanation                            |
| Missing Events     | Comma-separated list of missing critical events       |
| Event Count        | Total events in this transaction                      |
| Duration (sec)     | Time elapsed from first to last event                 |
| First Event Time   | Timestamp of first event                              |
| Last Event Time    | Timestamp of last event                               |
| Notes              | Additional insights                                   |

## Drop Categories

### ❌ Excluded (Not Legitimate Drops)

- **USER_CANCELLATION**: User pressed back button
- **MODE_SWITCH**: User switched payment methods
- **SUCCESS**: Payment completed successfully
- **NO_ISSUE**: No issues detected

### ✅ Included (Legitimate Drops)

#### UPI/BQR Specific

- **QR_GENERATION_DROP** (HIGH): QR generation API failed or never completed
- **QR_DISPLAY_DROP** (HIGH): QR generated but never displayed to user
- **STATUS_POLLING_DROP** (HIGH): Status polling never started or failed
- **AUTHORIZATION_DROP** (CRITICAL): Payment authorization notification lost (payment may have succeeded)
- **TIMEOUT** (MEDIUM): Payment timed out (QR expired after 300 seconds)

#### CARD Specific

- **EMV_FAILURE** (HIGH): EMV transaction processing failed
- **EMV_DROP** (HIGH): Card detected but EMV processing never completed

#### Generic

- **PAYMENT_FAILURE** (HIGH): Generic payment failure
- **UNKNOWN_DROP** (MEDIUM): Incomplete flow with missing critical events

## Example

### Input

1000 transactions from event log CSV:
- 300 user cancellations (excluded)
- 150 mode switches (excluded)
- 480 successful payments (excluded)
- 70 legitimate drops (included in report):
  - 25 QR generation failures
  - 20 authorization drops
  - 15 timeouts
  - 10 status polling failures

### Output

CSV file: `events_analysis_report_2026-02-03.csv` with 70 rows containing only the legitimate drops.

Console summary:
```
📊 EVENT DROP ANALYSIS SUMMARY
======================================================================

Total Transactions Analyzed: 1000
  ✅ Successful Payments: 480
  ❌ Legitimate Drops: 70
  ℹ️  User Actions (Excluded): 450
     - User Cancellations: 300
     - Payment Mode Switches: 150

--- Legitimate Drops by Category ---
  QR_GENERATION_DROP: 25
  AUTHORIZATION_DROP: 20
  TIMEOUT: 15
  STATUS_POLLING_DROP: 10

--- Drops by Severity ---
  🔴 CRITICAL: 20
  🟠 HIGH: 35
  🟡 MEDIUM: 15
  🟢 INFO: 0

--- Transactions by Payment Type ---
  UPI: 850
  CARD: 120
  BQR: 30

======================================================================
✨ Report saved to: events_analysis_report_2026-02-03.csv
======================================================================
```

## Expected Event Flows

### UPI Success Flow

```
PAYMENT_START
→ QR_GENERATION_STARTED
→ UPI_API_REQUEST_QR_GENERATION
→ UPI_API_RESPONSE_QR_GENERATION
→ QR_API_SUCCESS                             ← Critical
→ UPI_QR_SHOWN                               ← Critical
→ UPI_CHECK_STATUS_PROGRESS_INITIATED
→ UPI_API_REQ_CHECK_STATUS (polling)
→ UPI_API_RESP_CHECK_STATUS (polling)        ← Critical
→ UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION    ← Critical
→ TRANSACTION_SUCCESS_SCREEN_SHOWN
```

### User Cancellation Flow (Excluded)

```
PAYMENT_START
→ QR_GENERATION_STARTED
→ QR_API_SUCCESS
→ UPI_QR_SHOWN
→ [User presses back button]
→ PAYMENT_CANCELLED                          ← Triggers exclusion
→ UPI_API_REQ_STOP_PAYMENT
→ UPI_API_RESP_STOP_PAYMENT
```

### Payment Mode Switch Flow (Excluded)

```
PAYMENT_START (UPI)
→ QR_GENERATION_STARTED
→ QR_API_SUCCESS
→ UPI_QR_SHOWN
→ [User selects different payment method]
→ PAYMENT_MODE_SWITCH {from: 'UPI', to: 'CARD'}  ← Triggers exclusion
→ [New sequence_id generated]
→ PAYMENT_START (CARD)
→ CARD_DETECTED
→ ...
```

## Technical Details

- **Language**: JavaScript (Node.js)
- **Dependencies**:
  - `csv-parser` - CSV parsing
  - `csv-writer` - CSV report generation
  - `xlsx` - Excel file support
  - `papaparse` - Robust CSV parsing

## Files

```
.claude/skills/event-analyzer/
├── skill.md                 # This file
├── index.js                 # Main entry point
├── utils/
│   ├── parser.js           # CSV/Excel parsing
│   ├── analyzer.js         # Flow analysis
│   ├── classifier.js       # Drop classification
│   └── reporter.js         # CSV report generation
└── patterns/
    ├── upi-flows.md        # UPI payment patterns
    └── common-patterns.md  # Common event patterns
```

## Limitations

- Currently optimized for UPI/BQR payment flows
- CARD payment analysis is basic (EMV-focused)
- Other payment types (EMI, Cash, Wallet) treated as generic flows
- Requires well-formatted input CSV with correct column names

## Future Enhancements

- Direct Querybook integration (fetch events via API)
- Extended support for CARD, EMI, Cash payment flows
- Trend analysis (detect if drops increasing over time)
- Root cause correlation (find common patterns across drops)
- Auto-fix suggestions for common drop scenarios
