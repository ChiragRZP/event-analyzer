# Event Drop Analyzer

AI-powered analyzer for POS payment event logs that identifies **legitimate event drops** while intelligently filtering out user-initiated actions.

## Quick Start

```bash
# Install dependencies (already done)
npm install

# Run with test data
npm test

# Run with your own data
node index.js /path/to/your/events.csv

# Or specify output path
node index.js /path/to/events.csv /path/to/output_report.csv
```

## What It Does

### ✅ Identifies Legitimate Drops

#### UPI/BQR (Dynamic QR) Drops:
- **QR Generation Drop**: QR API failed or never completed
- **QR Display Drop**: QR generated but never shown to user
- **Status Polling Drop**: Polling never started or failed
- **Authorization Drop** (CRITICAL): Payment notification lost (payment may have succeeded!)
- **Timeout**: Payment expired after time limit

#### Card Payment Drops:
- **Card PIN Drop**: Card detected but PIN never entered
- **Card API Drop**: PIN entered but API never called
- **Card API Response Drop** (CRITICAL): API request sent but no response
- **EMV Failure**: EMV transaction processing failed
- **Card Payment Failure**: Card payment API returned failure

#### Cash/Cheque/DD Drops:
- **Completion Drop**: Payment initiated but completion screen never shown

#### Paylink/CNP Drops:
- **Paylink Send Drop**: Link send initiated but never succeeded
- **Paylink Status Drop**: Link sent but payment status never received

#### EMI Drops:
- **EMI Selection Drop**: Plan selection viewed but never proceeded
- **EMI Validation Drop**: Validation API request sent but no response

#### NCMC Drops:
- **NCMC Load Drop**: Balance load API request sent but no response

### ❌ Excludes User Actions

- **User Cancellations**: Back button pressed
- **Payment Mode Switches**: User changed payment method
- **Successful Payments**: Completed successfully

## Input Format

Your CSV/Excel file must have these columns:

| Column       | Description                              | Example                |
| ------------ | ---------------------------------------- | ---------------------- |
| `txn_id`     | Transaction identifier                   | `txn_12345`            |
| `event_name` | Event name                               | `UPI_QR_SHOWN`         |
| `event_time` | Timestamp (ISO 8601 or Unix ms)          | `2026-02-03T10:00:00`  |
| `properties` | JSON with sequence_id, PAYMENT_TYPE, etc | `{"PAYMENT_TYPE":"UPI"}` |

### Getting Data from Querybook

Use this query to export event logs:

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

Replace `YOUR_DEVICE_SERIAL` with your device serial number.

## Output

### CSV Report

Generates a CSV file with:

- Transaction ID
- Payment Type
- Drop Category
- Severity (CRITICAL, HIGH, MEDIUM, INFO)
- Drop Reason
- Missing Events
- Event Count
- Duration
- First/Last Event Times
- Notes

### Console Summary

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

--- Transactions by Payment Type ---
  UPI: 850
  CARD: 120
  BQR: 30

======================================================================
```

## Example

```bash
# Run analyzer
node index.js device_logs.csv

# Output
events_analysis_report_2026-02-03.csv
```

Open the CSV in Excel:
- Create pivot table by `Drop Category`
- Filter by `Severity` = CRITICAL
- Sort by `Duration` to find slow failures

## Project Structure

```
.claude/skills/event-analyzer/
├── README.md              # This file
├── skill.md               # Skill documentation
├── package.json           # Dependencies
├── index.js               # Main entry point
├── utils/                 # Core components
│   ├── parser.js          # CSV/Excel parsing
│   ├── analyzer.js        # Flow analysis
│   ├── classifier.js      # Drop classification
│   └── reporter.js        # CSV report generation
├── patterns/              # Event flow patterns
│   ├── upi-flows.md       # UPI payment patterns
│   └── common-patterns.md # Common patterns
└── tests/
    └── sample-drops.csv   # Test fixture
```

## Testing

```bash
# Run with test data
npm test

# Expected output:
# - 8 transactions total
# - 5 legitimate drops (reported)
# - 1 user cancellation (excluded)
# - 1 mode switch (excluded)
# - 1 successful payment (excluded)
```

## Supported Payment Types

- **UPI (Dynamic QR)**: Full support with all drop categories (QR generation, display, polling, authorization)
- **BQR (Bharat QR)**: Full support with BQR-specific event patterns
- **CARD**: Comprehensive support (PIN entry, API calls, EMV processing, DCC)
- **CASH**: Basic support (payment initiation and completion)
- **CHEQUE**: Basic support (payment initiation and completion)
- **DD (Demand Draft)**: Basic support (payment initiation and completion)
- **PAYLINK/CNP**: Full support (link sending, payment status polling)
- **EMI (Bank/Brand)**: Full support (plan selection, validation, card flow)
- **NCMC**: Basic support (balance check, load operations)
- **WALLET**: Minimal support (limited events available)
- **Others**: Generic drop detection based on missing critical events

## Limitations

- Optimized for UPI/BQR flows
- Requires well-formatted input CSV
- Column names must match expected format (or common variations)

## Future Enhancements

- Direct Querybook API integration
- Extended CARD/EMI/Cash flow support
- Trend analysis over time
- Root cause correlation
- Auto-fix suggestions

## Support

See `skill.md` for detailed documentation on:
- Drop classification logic
- Expected event flows
- Exclusion criteria
- Pattern definitions
