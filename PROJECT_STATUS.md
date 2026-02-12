# POS Event Drop Analyzer - Project Status

## 1. Problem Statement

**Issue**: POS payment transactions are failing due to event drops, but it's difficult to distinguish between:
- **Legitimate event drops** (system failures that need investigation)
- **User-initiated actions** (cancellations, payment mode switches - expected behavior)

**Impact**: Without proper classification, teams waste time investigating normal user behavior instead of actual system issues.

**Current Gap**: No automated tool exists to:
- Parse POS event logs from Querybook
- Identify legitimate event drops vs user actions
- Provide actionable reports for debugging

---

## 2. Solution Being Built

**Event Drop Analyzer Tool** - A CLI skill that:

### Core Functionality
1. **Parses event logs** (CSV/Excel from Querybook)
   - Groups events by sequence_id (frontend) and txnId (backend)
   - Sorts events chronologically using EVENT_TIME from properties
   - Detects payment types: UPI, CARD, BQR, EMI, CASH, etc.

2. **Classifies drop reasons** with intelligent filtering:
   - ❌ **Excludes (NOT drops)**:
     - User cancellations (`PAYMENT_CANCELLED` event)
     - Payment mode switches (`PAYMENT_MODE_SWITCH` event)
     - Successful payments
   - ✅ **Includes (Legitimate drops)**:
     - QR generation failures
     - Status polling drops
     - Authorization notification drops
     - Timeouts and API failures

3. **Generates CSV reports**:
   - Transaction ID, payment type, drop category, severity
   - Missing events, duration, notes
   - Breakdown by payment type and severity
   - Shows both sequence counts and unique backend transaction counts

### Technology Stack
- **Language**: Node.js (JavaScript)
- **Dependencies**: csv-parser, csv-writer, xlsx, papaparse
- **Location**: `.claude/skills/event-analyzer/`

---

## 3. Current Status & Discrepancies

### What's Working
✅ Event parsing and chronological ordering (using EVENT_TIME)
✅ Payment type detection (UPI, CARD, BQR patterns)
✅ Backend transaction ID extraction (properties.txnId)
✅ Sequence vs backend transaction counting (using Sets to avoid duplicates)
✅ Drop classification logic
✅ CSV report generation

### Observed Discrepancies

**When comparing Event Analyzer output with Metabase transaction counts, inconsistencies are appearing:**

#### Example Case: Device 1495048843, Feb 4, 2026

| Source | Count | Notes |
|--------|-------|-------|
| **Metabase** (`ezetap_new.txn`) | 66 transactions | `WHERE DATE(created_time) = '2026-02-04' AND device_serial = '1495048843'` |
| **Events Database** (verified via query) | 63 unique txnIds | Transactions that have events in `events.pos_v1` |
| **Event Analyzer** | 63 transactions | Parsing events from Querybook export |
| **Discrepancy** | -3 transactions | Missing from event logs |

**Breakdown by Payment Type (Metabase):**
- CARD AUTHORIZED: 1
- CARD FAILED: 1
- UPI AUTHORIZED: 55
- UPI EXPIRED: 8
- UPI FAILED: 1
- **Total: 66**

**Breakdown by Payment Type (Analyzer):**
- CARD: 2 unique backend txnIds (3 sequences)
- UPI: 61 unique backend txnIds (61 sequences)
- **Total: 63**

#### Missing Transactions Identified

Through comparison, 3 specific transactions found in Metabase but NOT in event logs:

1. `260204024051132E887567617` - UPI AUTHORIZED - Created: 2026-02-04T02:40:51
2. `260204032053723E892143698` - UPI AUTHORIZED - Created: 2026-02-04T03:20:54
3. `260204034607682E773258410` - UPI AUTHORIZED - Created: 2026-02-04T03:46:08

**Pattern**: All 3 occurred between **2:40-3:46 AM**, but CSV events only start at **4:05 AM**.

### Unverified Hypotheses

**Potential causes being investigated:**

1. **Event logging gap**
   - Backend created transactions but events never reached `events.pos_v1` table
   - App crash during transaction flow
   - Event tracking code not executed for certain flows

2. **Querybook export timing**
   - Query might have row limits causing early morning events to be excluded
   - Partition timing: events from 2:40-4:05 AM might be in different partition

3. **P2P (Peer-to-Peer) flow complexity**
   - 85 sequences in full export have P2P events (MQTT messages)
   - Payment initiated on one device, completed on another
   - Backend records receiving device, but events split across devices

4. **Query filter issues**
   - `created_date` (partition date) vs `EVENT_TIME` (actual occurrence) mismatch
   - Timezone handling between backend timestamps and event timestamps
   - EVENT_TIMESTAMP filter syntax not working as expected

### Queries Used

**Querybook (Events Export):**
```sql
SELECT
    json_extract_scalar(properties, '$.sequence_id') as txn_id,
    event_name,
    from_unixtime(event_timestamp) as event_time,
    properties
FROM events.pos_v1
WHERE created_date = date_format(current_date - INTERVAL '1' DAY, '%Y-%m-%d')
    AND json_extract_scalar(properties, '$.dsn') = '1495048843'
ORDER BY
    json_extract_scalar(properties, '$.sequence_id'),
    event_timestamp ASC;
```

**Metabase (Transaction Count):**
```sql
SELECT
    payment_mode,
    status,
    COUNT(*) as transaction_count
FROM ezetap_new.txn
WHERE DATE(created_time) = '2026-02-04'
    AND device_serial = '1495048843'
GROUP BY payment_mode, status
ORDER BY payment_mode, status;
```

### What Needs Verification

1. **Cross-database validation**
   - `events.pos_v1` and `ezetap_new.txn` are in different databases
   - Cannot join directly to verify event-to-transaction mapping
   - Need manual comparison of txnId lists

2. **Complete event coverage**
   - Are all transactions SUPPOSED to have events?
   - Or are some transactions created via backend APIs without UI interaction?
   - Is event tracking mandatory for all payment flows?

3. **P2P flow event logging**
   - How should P2P transactions be counted?
   - Which device's events should be analyzed?
   - Are P2P events logged on both initiating and receiving devices?

4. **BQR to UPI mapping**
   - Backend stores successful BQR payments as `payment_mode = 'UPI'`
   - Need to verify event analyzer correctly identifies BQR vs UPI from event patterns
   - Verify backend mapping logic matches event classification

### Next Steps

- [ ] Verify if all 66 Metabase transactions SHOULD have events (check with backend team)
- [ ] Investigate P2P flow: are these transactions expected to have complete events?
- [ ] Query events database directly for Feb 4 2:40-4:05 AM to see if events exist
- [ ] Test analyzer with known-good data set (manually verified transactions)
- [ ] Document expected behavior for transactions without events
- [ ] Add analyzer feature to report "transactions without events" explicitly

---

## Files & Locations

**Event Analyzer Code:**
- Location: `/Users/peddakondannagari.r/.claude/skills/event-analyzer/`
- Main entry: `index.js`
- Core modules:
  - `utils/parser.js` - CSV/Excel parsing
  - `utils/analyzer.js` - Flow analysis
  - `utils/classifier.js` - Drop classification
  - `utils/reporter.js` - CSV report generation
  - `utils/payment-type-detector.js` - Payment type inference

**Test Data:**
- `card_payment_test_2.csv` - Original test file (3126 events, 63 txnIds)
- `test_3_1495048843.csv` - Multi-day export (4379 events, 85 txnIds - includes Feb 5)
- `test_4_1495048843.csv` - Feb 4 only (63 txnIds)
- `csv_txnids.txt` - List of 63 backend txnIds found in events

**Documentation:**
- `CARD_TEST_2_ANALYSIS.md` - Detailed analysis of discrepancy
- `QUERY_ISSUES_ANALYSIS.md` - Querybook query investigation
- `DISCREPANCY_EXPLAINED.md` - Previous analysis of different discrepancy case

---

**Last Updated**: 2026-02-05
**Status**: Under Investigation - Discrepancies between Metabase and Event Analyzer not fully verified
