---
name: event-analyzer
description: Analyze POS event logs for legitimate event drops, excluding user cancellations and payment mode switches
---

# Event Drop Analyzer

AI-powered analyzer for POS payment event logs that identifies **legitimate event drops** while intelligently filtering out user-initiated actions (cancellations and payment mode switches).

## Features

✅ **Single-Device Analysis** - Analyze logs from one device
✅ **Multi-Device Analysis** - Analyze logs from thousands of devices at once (auto-detected)
✅ **Large File Support** - Handles 800MB+ CSV files using streaming parser
✅ **Smart Classification** - Distinguishes legitimate drops from user actions
✅ **Comprehensive Reports** - Per-device summaries, aggregate statistics, and drop details

## Usage

### As a Claude Skill

Simply ask Claude to analyze event logs:

```
User: "Analyze this event log for drops"
[Attach: device_events_2026-02-11.csv]
```

Or specify a file path:

```
User: "Analyze event drops in /Users/me/Downloads/query_result.csv"
```

Claude will automatically:
1. Detect if it's single-device or multi-device log
2. Use streaming parser for large files (>100MB)
3. Generate comprehensive reports
4. Provide summary statistics

### Direct Command Line

```bash
cd /Users/peddakondannagari.r/.claude/skills/event-analyzer
node index.js /path/to/event_log.csv
```

## Input Format

The input file (CSV or Excel) must contain these columns:

### Required Columns

1. **txn_id** (or `sequence_id` from properties)
   - Transaction/sequence identifier that groups related events

2. **event_name** (or `event`)
   - Event name (e.g., `UPI_QR_SHOWN`, `PAYMENT_CANCELLED`)

3. **event_time** (or `EVENT_TIMESTAMP`)
   - Event timestamp (ISO 8601 format or Unix milliseconds)

4. **properties** (JSON string or object)
   - Required fields:
     - `sequence_id` - Sequence identifier (changes on mode switch)
     - `dsn` - Device Serial Number (for multi-device analysis)
     - `mid` - Merchant ID
     - `tid` - Terminal ID
     - `PAYMENT_TYPE` or `paymentMode` - Payment method (UPI, CARD, BQR, etc.)
     - `amount` - Transaction amount
     - `newSource` - Architecture version (ReArch recommended)
     - `appVersionName` - App version
     - `web_version` - Web version

### Metabase Query to Extract Events (All Devices)

Use this query in Metabase to get data in the correct format:

```sql
SELECT
    json_extract_path_text(properties::varchar, 'sequence_id') as txn_id,
    event as event_name,
    event_time,
    properties
FROM reporting.posthog_events
WHERE event_timestamp >= '2026-02-11'
    AND event_timestamp < '2026-02-12'
    AND device_type = 'A910'
    AND json_extract_path_text(properties::varchar, 'sequence_id') IS NOT NULL
    AND json_extract_path_text(properties::varchar, 'newSource') = 'ReArch'
    AND json_extract_path_text(properties::varchar, 'appVersionName') = '10.18.228'
    AND json_extract_path_text(properties::varchar, 'web_version') = '123'
ORDER BY
    dsn,
    json_extract_path_text(properties::varchar, 'sequence_id'),
    event_timestamp;
```

**Filters Explained:**
- `device_type = 'A910'` - Only analyze A910 devices
- `newSource = 'ReArch'` - Only ReArch architecture (clean production data)
- `appVersionName = '10.18.228'` - Latest stable build
- `web_version = '123'` - Latest web version

Replace the date range and filters as needed.

### Single-Device Query (Querybook/Athena)

For analyzing a specific device:

```sql
SELECT
    json_extract_scalar(properties, '$.sequence_id') as txn_id,
    event_name,
    json_extract_scalar(properties, '$.EVENT_TIMESTAMP') as event_time,
    properties
FROM events.pos_v1
WHERE created_date >= '2026-02-11'
    AND created_date <= '2026-02-12'
    AND json_extract_scalar(properties, '$.dsn') = 'YOUR_DEVICE_SERIAL'
    AND json_extract_scalar(properties, '$.sequence_id') IS NOT NULL
ORDER BY
    json_extract_scalar(properties, '$.sequence_id'),
    json_extract_scalar(properties, '$.EVENT_TIME')
LIMIT 100000;
```

## Output Format

### Single-Device Mode

Generates one CSV file: `events_analysis_report_YYYY-MM-DD.csv`

### Multi-Device Mode (Auto-detected when >1 device)

Generates three files:

1. **`multi_device_report_YYYY-MM-DD_drops.csv`** - All legitimate drops from all devices

| Column               | Description                                           |
| -------------------- | ----------------------------------------------------- |
| DSN                  | Device Serial Number                                  |
| Merchant ID          | Merchant identifier                                   |
| Terminal ID          | Terminal identifier                                   |
| Transaction ID       | Sequence identifier                                   |
| Event Payment Type   | Payment type from events (BQR, CARD, UPI, etc.)       |
| Database Payment Type| Expected type in database (UPI, BHARATQR, CARD, etc.) |
| Drop Category        | Category of drop (see below)                          |
| Severity             | CRITICAL, HIGH, MEDIUM, or INFO                       |
| Drop Reason          | Human-readable explanation                            |
| Missing Events       | Comma-separated list of missing critical events       |
| Event Count          | Total events in this transaction                      |
| Duration (sec)       | Time elapsed from first to last event                 |
| First Event Time     | Timestamp of first event                              |
| Last Event Time      | Timestamp of last event                               |
| Notes                | Additional insights                                   |

2. **`multi_device_report_YYYY-MM-DD_summary.csv`** - Per-device metrics

| Column                | Description                                    |
| --------------------- | ---------------------------------------------- |
| DSN                   | Device Serial Number                           |
| Merchant ID           | Merchant identifier                            |
| Terminal ID           | Terminal identifier                            |
| Total Transactions    | Total sequences analyzed                       |
| Successes             | Successful payments                            |
| Failures              | Payment failures                               |
| Legitimate Drops      | Legitimate event drops                         |
| User Cancellations    | User-initiated cancellations                   |
| Mode Switches         | Payment mode switches                          |
| Success Rate (%)      | Percentage of successful transactions          |
| Drop Rate (%)         | Percentage of legitimate drops                 |

3. **`multi_device_report_YYYY-MM-DD_stats.json`** - Aggregate statistics

```json
{
  "date": "2026-02-11",
  "totalDevices": 3399,
  "totalTransactions": 76200,
  "totalEvents": 1048575,
  "summary": {
    "successes": 19676,
    "failures": 3064,
    "legitimateDrops": 61,
    "userCancellations": 36960,
    "successRate": 25.82,
    "dropRate": 0.08
  },
  "byPaymentType": {
    "CARD": { "transactionCount": 10111, "successCount": 6250, ... },
    "BQR": { "transactionCount": 7013, "successCount": 6132, ... },
    ...
  },
  "topProblematicDevices": [
    { "dsn": "1490345737", "drops": 10, "transactions": 23, "dropRate": 43.48 },
    ...
  ]
}
```

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

- **CARD_PIN_DROP** (HIGH): Card detected but PIN was never entered
- **CARD_API_DROP** (HIGH): PIN entered but payment API was never called
- **EMV_FAILURE** (HIGH): EMV transaction processing failed
- **EMV_DROP** (HIGH): Card detected but EMV processing never completed

#### CASH Specific

- **CASH_COMPLETION_DROP** (MEDIUM): Cash payment initiated but completion screen never shown

#### Generic

- **PAYMENT_FAILURE** (HIGH): Generic payment failure
- **UNKNOWN_DROP** (MEDIUM): Incomplete flow with missing critical events

## Example

### Multi-Device Analysis

**Input:**
- CSV with 1,048,575 events from 3,399 devices (801MB file)
- Events from Feb 11, 2026

**Processing:**
- Automatic streaming parser (large file detected)
- Auto-detected multi-device mode (>1 device)
- Analyzed 76,200 transactions in ~4 minutes

**Output:**

```
🔍 Multi-Device Event Drop Analyzer
================================================================================

📋 Parsed Multi-Device Event Log:
  Total Devices: 3399
  Total Transactions: 76200
  Total Events: 1048575
  Avg Events/Txn: 13.76

  Top 10 Devices by Transaction Count:
    1490445546: 559 txns, 9022 events
    1490441400: 335 txns, 3244 events
    ...

🔬 Analyzing 3399 devices...
  Processing device 3399/3399: 1490823246...

  ✅ Completed analysis of 3399 devices

📝 Generating reports...

================================================================================
📊 MULTI-DEVICE ANALYSIS SUMMARY
================================================================================

Total Devices: 3399
Total Transactions: 76200
Total Events: 1048575

Overall Results:
  ✅ Successful Payments: 19676 (25.82%)
  ❌ Legitimate Drops: 61 (0.08%)
  🚫 User Cancellations: 36960
  🔄 Mode Switches: 1101

Payment Type Breakdown:
  CARD: 10111 transactions (6250 success, 2899 failures, 19 drops)
  CASH: 7170 transactions (7086 success, 6 drops)
  BQR: 7013 transactions (6132 success, 34 drops)
  UPI: 312 transactions (205 success, 2 drops)

Top 10 Problematic Devices (Highest Drop Rates):
  1. DSN 1490345737 - 10 drops / 23 txns (43.48%)
  2. DSN 1490328961 - 1 drops / 4 txns (25.00%)
  ...

📁 Reports saved to:
  - Drops Report: multi_device_report_2026-02-13_drops.csv
  - Device Summary: multi_device_report_2026-02-13_summary.csv
  - Aggregate Stats: multi_device_report_2026-02-13_stats.json

================================================================================
```

## Expected Event Flows

### UPI Success Flow

```
PAYMENT_START
→ QR_GENERATION_STARTED
→ UPI_API_REQUEST_QR_GENERATION
→ UPI_API_RESPONSE_QR_GENERATION
→ qr_api_success                             ← Critical
→ UPI_QR_SHOWN                               ← Critical
→ payment_initiated_upi                      ← Critical
→ UPI_CHECK_STATUS_PROGRESS_INITIATED
→ UPI_API_EVENT_REQ_CHECK_STATUS (polling)
→ UPI_API_EVENT_RESP_CHECK_STATUS (polling)  ← Critical
→ payment_authorized_upi                     ← Critical
→ TRANSACTION_SUCCESS_SCREEN_SHOWN
```

### BQR Success Flow

```
PAYMENT_START
→ BQR_API_EVENT_REQ_GENERATE_QR
→ BQR_API_EVENT_RESP_GENERATE_QR
→ qr_api_success                             ← Critical
→ BHARATQR_QR_SHOWN                          ← Critical
→ payment_initiated_upi                      ← Critical
→ UPI_API_EVENT_REQ_CHECK_STATUS (polling)
→ UPI_API_EVENT_RESP_CHECK_STATUS (polling)  ← Critical
→ payment_authorized_upi                     ← Critical
→ TRANSACTION_SUCCESS_SCREEN_SHOWN
```

### CARD Success Flow

```
PAYMENT_START
→ Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN  ← Critical
→ Card_APP_EVENT_CARD_DETECTED                    ← Critical
→ Card_APP_EVENT_PIN_ENTERED                      ← Critical
→ payment_initiated_card                          ← Critical
→ CARD_PAYMENT_API_EVENT_REQ                      ← Critical
→ CARD_PAYMENT_API_EVENT_RESP                     ← Critical
→ payment_authorized_card                         ← Critical
→ TRANSACTION_SUCCESS_SCREEN_SHOWN
```

### User Cancellation Flow (Excluded)

```
PAYMENT_START
→ QR_GENERATION_STARTED
→ qr_api_success
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
→ qr_api_success
→ UPI_QR_SHOWN
→ [User selects different payment method]
→ PAYMENT_MODE_SWITCH {from: 'UPI', to: 'CARD'}  ← Triggers exclusion
→ [New sequence_id generated]
→ PAYMENT_START (CARD)
→ CARD_DETECTED
→ ...
```

## Technical Details

### Performance

- **Single-Device**: ~1 second for 10,000 events
- **Multi-Device**: ~4 minutes for 1M events across 3,399 devices
- **Memory**: ~2GB peak for 800MB CSV file (streaming parser)
- **Concurrency**: Processes all devices sequentially (parallelization possible)

### Dependencies

- `csv-parser` - Streaming CSV parsing (handles large files)
- `csv-writer` - CSV report generation
- `xlsx` - Excel file support
- `papaparse` - Robust CSV parsing (small files)

### Language

JavaScript (Node.js 16+)

## Files

```
.claude/skills/event-analyzer/
├── skill.md                     # This file
├── index.js                     # Main entry point (single + multi-device)
├── utils/
│   ├── parser.js               # CSV/Excel parsing + streaming
│   ├── analyzer.js             # Flow analysis
│   ├── classifier.js           # Drop classification
│   ├── reporter.js             # CSV report generation
│   ├── success-flows.js        # Expected event flows per payment type
│   ├── payment-type-detector.js # Infer payment type from events
│   ├── payment-type-mapper.js   # Map event types to DB types
│   └── event-statistics.js     # Calculate expected vs actual events
├── queries/
│   └── daily-all-devices.sql   # Metabase query template
└── tests/
    └── sample-drops.csv        # Test data
```

## Limitations

- Properties JSON must be parseable (supports double-encoded JSON)
- Requires sequence_id or txn_id for grouping events
- DSN must be in properties for multi-device analysis
- Polling events currently counted once (should be multiplied by avg occurrences)

## Future Enhancements

- Direct Metabase/Querybook API integration (automated data fetching)
- Parallel device processing (reduce analysis time)
- Fix polling event count in expected events calculation
- Slack integration for daily automated reports
- Trend analysis (detect if drops increasing over time)
- Root cause correlation (find common patterns across drops)
- Auto-fix suggestions for common drop scenarios

## Branch Structure

- **master**: Stable single-device analyzer
- **feature/multi-device-support**: Multi-device analyzer (current)

Use `git checkout feature/multi-device-support` to access multi-device features.
