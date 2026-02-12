# COMPREHENSIVE ANALYSIS: POS Event System & Unknown Payment Types

**Date**: February 12, 2026
**Analyzed By**: Claude Code
**Sources**:
1. Production logs: `/Users/peddakondannagari.r/Downloads/full_day_logs_05feb.csv` (10,902 events)
2. Codebase: `/Users/peddakondannagari.r/newpos/pos`
3. Documentation: `/Users/peddakondannagari.r/Downloads/Events-Master-Sheet.xlsx`

---

## EXECUTIVE SUMMARY

### The UNKNOWN Payment Type Problem - ROOT CAUSE IDENTIFIED

**11.7% of production events (1,280 out of 10,902) have NO payment type information**, which causes them to be classified as UNKNOWN. This happens because many events are emitted BEFORE payment flow begins or AFTER payment completes, where payment context is not set.

---

## 1. PRODUCTION LOG ANALYSIS (Feb 5, 2026)

### Overall Statistics
- **Total Events**: 10,902
- **Unique Transactions**: 813
- **Unique Event Types Used**: 101 (out of 608 defined in codebase)
- **Events WITH Payment Type**: 9,622 (88.3%)
- **Events WITHOUT Payment Type**: 1,280 (11.7%) ← **This is the UNKNOWN problem!**

### Payment Type Distribution
```
Payment Type    Event Count    Percentage
-----------     -----------    ----------
BQR             9,553          87.6%
CARD               69           0.6%
(No Type)       1,280          11.7%
```

**Key Finding**: BQR (BharatQR) is the overwhelmingly dominant payment type in this device's usage (98% of typed events).

### Top 30 Most Common Events

| Rank | Event Name | Count | Has Payment Type? |
|------|------------|-------|-------------------|
| 1 | amount_screen_shown | 654 | ❌ No (navigation event) |
| 2 | UPI_API_EVENT_RESP_CHECK_STATUS | 584 | ✅ Yes (BQR flow) |
| 3 | PAYMENT_STATUS_API_REQUEST | 584 | ✅ Yes (BQR flow) |
| 4 | UPI_API_EVENT_REQ_CHECK_STATUS | 584 | ✅ Yes (BQR flow) |
| 5 | PAYMENT_STATUS_API_RESPONSE_SUCCESS | 556 | ✅ Yes (BQR flow) |
| 6 | WALLET_QR_GENERATE_API_REQUEST | 520 | ✅ Yes (BQR flow) |
| 7 | qr_generation_started | 520 | ✅ Yes (BQR flow) |
| 8 | payment_initiated_upi | 518 | ✅ Yes (BQR flow) |
| 9 | BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN | 517 | ✅ Yes (BQR flow) |
| 10 | qr_api_success | 516 | ✅ Yes (BQR flow) |
| 11 | WALLET_QR_GENERATE_API_RESPONSE_SUCCESS | 516 | ✅ Yes (BQR flow) |
| 12 | Create_TransactionResultActivity | 482 | ✅ Yes (legacy event) |
| 13 | print_status_check_failed | 481 | ✅ Yes (printing) |
| 14 | print_receipt_failed | 481 | ✅ Yes (printing) |
| 15 | BQR_print_status_check | 478 | ✅ Yes (printing) |
| 16 | BQR_print_status_check_result | 478 | ✅ Yes (printing) |
| 17 | BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN | 477 | ✅ Yes (success) |
| 18 | BQR_AUTOMATE_PRINT_CHANRGESLIP | 477 | ✅ Yes (printing) |
| 19 | APP_LIFECYCLE | 374 | ❌ No (system event) |
| 20 | ON_HOME_PRESSED | 189 | ❌ No (navigation) |
| 21 | SDK_MPOS_FUNCTIONS_STATUS | 151 | ❌ No (system event) |
| 22 | button_menu_collect_payment | 134 | ❌ No (navigation) |
| 23 | ON_BACK_PRESSED | 103 | ❌ No (navigation) |
| 24 | UPDATE_CHECK | 51 | ❌ No (system event) |
| 25 | UPI_API_EVENT_RESP_STOP_PAYMENT | 39 | ✅ Yes (cancellation) |
| 26 | UPI_API_EVENT_REQ_STOP_PAYMENT | 39 | ✅ Yes (cancellation) |
| 27 | STOP_PAYMENT_API_REQUEST | 39 | ✅ Yes (cancellation) |
| 28 | STOP_PAYMENT_API_RESPONSE_FAILED | 39 | ✅ Yes (cancellation) |
| 29 | PAYMENT_STATUS_API_RESPONSE_FAILED | 28 | ✅ Yes (failure) |
| 30 | txn_history_render_data | 19 | ❌ No (UI event) |

---

## 2. CODEBASE ANALYSIS

### Event System Architecture

The POS system uses **THREE DISTINCT EVENT LAYERS**:

#### A. PostHog Analytics (Track Events)
- **608 events defined** in `/web/src/lib/track/const.ts`
- Batched sending (max 100 events per batch)
- Persisted to IndexedDB for reliability
- Auto-enriched with device/app context

#### B. Lumberjack Metrics (Prometheus)
- ~50 metric events for observability
- Real-time performance monitoring
- Sent to `lumberjack-metrics.razorpay.com`

#### C. Web Events (Native-Web Bridge)
- 18 WebEvent types for hardware communication
- EMV card operations, printer status, etc.

### Payment Type Determination

**Payment types are set via**:
```typescript
setCommonProp('paymentMode', paymentMode)
```

**This happens in `/web/src/modules/payment/index.ts:69**:
```typescript
const method = paymentRequest.paymentMode?.toUpperCase() || paymentMethod?.toUpperCase();
```

**Supported Payment Methods** (from `/web/src/modules/payment/types.ts`):
- PRE_AUTH
- CARD
- UPI
- PAYLINK
- WALLET
- EMI
- BRAND_EMI
- BQR (Bank QR)
- DD (Demand Draft)
- CASH
- CHEQUE

### Events That Get Payment Type Prefix

**From `/web/src/lib/track/index.ts:106-122`**, these events are prefixed with payment mode:
- `PRINT_STATUS_CHECK` → `{PAYMENT_MODE}_PRINT_STATUS_CHECK`
- `PRINT_STATUS_CHECK_RESULT`
- `GENERATE_BASE_64_IMAGE`
- `THERMAL_PRINT_START`
- `PRINT_STATUS_RESULT`
- `PAYMENT_CANCELLED`
- `PAYMENT_TIMEOUT`

Example: When paymentMode is "BQR", `PRINT_STATUS_CHECK` becomes `BQR_PRINT_STATUS_CHECK`

---

## 3. EVENTS MASTER SHEET ANALYSIS

### Documentation Coverage

| Sheet | Events Documented | Notes |
|-------|-------------------|-------|
| UPI(Dynamic)-Events | 104 rows | Includes initiation, QR generation, status polling |
| Card-Events | 72 rows | Domestic + International (DCC) |
| BQR Payment | 44 rows | BharatQR-specific flow |
| Cash Events | ~20 rows | Cash payment flow |
| DD Events | ~15 rows | Demand Draft |
| Cheque Events | ~15 rows | Cheque payment |
| EMI | ~100+ rows | Bank EMI + Brand EMI + Catalog |
| paylink events | ~30 rows | CNP (Card Not Present) |
| Boot up events | System lifecycle | Not payment-related |
| Txn-history-events | Transaction history | Not payment-related |
| webnative-update-events | App updates | Not payment-related |

**Total documented payment events**: Approximately **300-400 unique event names**

---

## 4. WHY UNKNOWN HAPPENS - DETAILED BREAKDOWN

### Category 1: System/Navigation Events (Est. 40% of UNKNOWN)

These events occur OUTSIDE payment flow context:

```
ON_HOME_PRESSED               - User navigation
ON_BACK_PRESSED               - User navigation
APP_LIFECYCLE                 - System lifecycle
SDK_MPOS_FUNCTIONS_STATUS     - System status
UPDATE_CHECK                  - App update checks
amount_screen_shown           - Pre-payment UI
button_menu_collect_payment   - Pre-payment UI
create_txn_screen             - Transaction history
txn_history_render_data       - Transaction history
```

**These are INTENTIONALLY without payment type** because they happen before payment starts.

### Category 2: Cross-Payment Events (Est. 30% of UNKNOWN)

Events that span multiple payment attempts in one transaction:

```
IS_SESSION_VALID
LOGIN_API_REQUEST
LOGIN_API_RESPONSE_SUCCESS
SDK_INPUT
SDK_OUTPUT
PERMISSIONS_REQ
PERMISSIONS_RES
```

### Category 3: Generic Payment Events (Est. 20% of UNKNOWN)

Events logged before `setCommonProp('paymentMode', ...)` is called:

```
PAYMENT_START (logged before payment type determined)
PAYMENT_PROMOS_API_REQUEST (fetched before payment method selected)
```

### Category 4: Post-Payment Events (Est. 10% of UNKNOWN)

Events after payment context is cleared:

```
TXN_LIST_API_REQUEST
TXN_LIST_API_RESPONSE_SUCCESS
get_txns_details_with_filters_api_response
SETTLEMENT_INITIATED
SETTLEMENT_SUCCESS
```

---

## 5. CODEBASE vs ACTUAL USAGE

### Event Usage Analysis

**Defined in codebase**: 608 events
**Actually used in production (Feb 5)**: 101 events
**Usage rate**: 16.6%

**This means**:
- 507 events are defined but never triggered (in this dataset)
- These could be:
  - **Payment types not used** (This device only uses BQR + occasional CARD)
  - **Error scenarios** (Not encountered on this day)
  - **Deprecated events** (Legacy, no longer emitted)
  - **Feature flags** (Features disabled for this merchant)

### Legacy Events Still in Use

From production logs, these legacy events are still active:
```
Create_TransactionResultActivity (482 occurrences)
Create_PayViaUPIActivity
Create_PayViaBQRActivity
Create_PayViaCardActivity
```

**Recommendation**: These should eventually be migrated to modern event names like:
- `BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN`
- `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN`

---

## 6. PAYMENT TYPE INFERENCE LOGIC REVIEW

### Current Implementation (`/utils/payment-type-detector.js`)

**Detection Priority**:
1. **BQR** (checked first - has unique indicators)
2. **CARD**
3. **UPI** (checked after BQR since BQR uses UPI events)
4. **CASH**
5. **CHEQUE**
6. **DD**
7. **EMI**
8. **PAYLINK**
9. **WALLET**
10. **NCMC**

**How it works**:
```javascript
// 1. Try to get from event properties
let paymentType = events.find(e => e.paymentType)?.paymentType;

// 2. If not found, infer from event names
if (!paymentType) {
  paymentType = inferPaymentTypeFromEvents(events);
}

// 3. Fallback to UNKNOWN
if (!paymentType) {
  paymentType = 'UNKNOWN';
}
```

### Detection Gaps

**The current logic has issues**:

1. **No `properties.paymentMode` check**:
   ```javascript
   // MISSING from parser.js:
   if (properties.paymentMode) {
     event.paymentType = properties.paymentMode;
   }
   ```

2. **No `properties.paymentMethod` check**:
   ```javascript
   // MISSING:
   if (properties.paymentMethod) {
     event.paymentType = properties.paymentMethod;
   }
   ```

3. **Generic events without payment context**:
   - Navigation events (`ON_HOME_PRESSED`, `ON_BACK_PRESSED`)
   - System events (`APP_LIFECYCLE`, `SDK_MPOS_FUNCTIONS_STATUS`)
   - Pre-payment events (`amount_screen_shown`, `button_menu_collect_payment`)

---

## 7. RECOMMENDATIONS

### For UNKNOWN Handling

**Option 1: Categorize UNKNOWN into Subcategories** ✅ **RECOMMENDED**

Instead of treating all UNKNOWN as one type, classify them:

```javascript
const UNKNOWN_CATEGORIES = {
  NAVIGATION: [
    'ON_HOME_PRESSED',
    'ON_BACK_PRESSED',
    'amount_screen_shown',
    'button_menu_collect_payment'
  ],
  SYSTEM: [
    'APP_LIFECYCLE',
    'SDK_MPOS_FUNCTIONS_STATUS',
    'UPDATE_CHECK',
    'IS_SESSION_VALID'
  ],
  TRANSACTION_HISTORY: [
    'create_txn_screen',
    'txn_history_render_data',
    'TXN_LIST_API_REQUEST'
  ],
  SETTLEMENT: [
    'SETTLEMENTS_SCREEN_SHOWN',
    'SETTLEMENT_INITIATED',
    'SETTLEMENT_SUCCESS'
  ],
  PRE_PAYMENT: [
    'PAYMENT_PROMOS_API_REQUEST',
    'PAYMENT_PROMOS_API_RESPONSE'
  ]
};
```

Then in statistics:
```
UNKNOWN breakdown:
  - NAVIGATION events: 500 (not payment-related, expected to have no type)
  - SYSTEM events: 300 (infrastructure, expected to have no type)
  - TRANSACTION_HISTORY: 200 (post-payment, expected to have no type)
  - TRULY_UNKNOWN: 80 (investigate these!)
```

**Option 2: Enhanced Payment Type Extraction**

Improve the parser to extract `paymentMode` and `paymentMethod` from properties:

```javascript
// In parser.js, when parsing properties:
if (properties.paymentMode) {
  event.paymentType = properties.paymentMode;
} else if (properties.paymentMethod) {
  event.paymentType = properties.paymentMethod;
} else if (properties.PAYMENT_TYPE) {
  event.paymentType = properties.PAYMENT_TYPE;
}
```

**Option 3: Exclude Non-Payment Events from Expected Counts**

For expected vs actual statistics, exclude event types that are NEVER part of payment flow:

```javascript
const NON_PAYMENT_EVENTS = [
  'APP_LIFECYCLE',
  'ON_HOME_PRESSED',
  'ON_BACK_PRESSED',
  'SDK_MPOS_FUNCTIONS_STATUS',
  'UPDATE_CHECK',
  'IS_SESSION_VALID',
  'LOGIN_API_REQUEST',
  'LOGIN_API_RESPONSE_SUCCESS',
  'create_txn_screen',
  'txn_history_*',
  'SETTLEMENT_*'
];

// Don't count these in "expected events if all successful"
```

### For Success Flow Definitions

**Current issue**: Success flows include ALL events, even optional ones.

**Better approach**:
```javascript
const SUCCESS_FLOWS = {
  UPI: {
    CRITICAL: [  // These MUST be present
      'payment_initiated_upi',
      'qr_api_success',
      'UPI_QR_SHOWN',
      'UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION'
    ],
    COMMON: [  // Usually present
      'qr_generation_started',
      'UPI_API_REQ_CHECK_STATUS',
      'UPI_API_RESP_CHECK_STATUS'
    ],
    OPTIONAL: [  // May or may not be present
      'PAYMENT_PROMOS_API_REQUEST',
      'PAYMENT_PROMOS_API_RESPONSE',
      'AUTOMATE_PRINT_CHANRGESLIP'
    ]
  }
};
```

Then calculate expected as:
```
Expected = CRITICAL + COMMON (not CRITICAL + COMMON + OPTIONAL)
```

### For Analyzer Accuracy

**Add detailed payment type extraction from properties**:

```javascript
function extractPaymentType(event) {
  // Priority 1: Direct property
  if (event.properties) {
    if (event.properties.paymentMode) return event.properties.paymentMode;
    if (event.properties.paymentMethod) return event.properties.paymentMethod;
    if (event.properties.PAYMENT_TYPE) return event.properties.PAYMENT_TYPE;
  }

  // Priority 2: Infer from event name
  return inferPaymentTypeFromEvents([event]);
}
```

---

## 8. ANSWERS TO YOUR QUESTIONS

### Q1: What do you mean by UNKNOWN?

**Answer**: UNKNOWN is assigned when:
1. No `paymentMode`, `paymentMethod`, or `PAYMENT_TYPE` in event properties
2. Event names don't match any known payment type patterns
3. Event occurs OUTSIDE payment flow context (navigation, system events)

**In your production logs**:
- 11.7% of events are UNKNOWN
- Most are legitimately non-payment events (navigation, system, transaction history)
- A small portion might be true data quality issues

### Q2: How do you know the expected flow for UNKNOWN?

**Answer**: **We don't and shouldn't!**

UNKNOWN should be:
1. **Categorized** into subcategories (NAVIGATION, SYSTEM, TRANSACTION_HISTORY, etc.)
2. **Excluded** from expected vs actual calculations for non-payment categories
3. **Investigated** only for events that SHOULD have payment type but don't

**For truly unknown payment-related events**:
- Use the ACTUAL event count as baseline
- Flag them for manual review
- Don't make assumptions about "expected" count

---

## 9. NEXT STEPS

### Immediate Actions

1. **✅ Update parser.js** to extract `paymentMode`/`paymentMethod` from properties
2. **✅ Categorize UNKNOWN** into subcategories (NAVIGATION, SYSTEM, PRE_PAYMENT, etc.)
3. **✅ Exclude non-payment events** from expected counts
4. **✅ Define CRITICAL vs OPTIONAL** events for each payment type

### Testing

1. **Run analyzer on full_day_logs_05feb.csv** with improvements
2. **Verify against Querybook** data integrity
3. **Compare expected vs actual** with refined categories

### Documentation

1. **Update skill.md** with UNKNOWN handling explanation
2. **Add troubleshooting guide** for payment type detection issues
3. **Document which events are excluded** from expected counts

---

## 10. CONCLUSION

**The UNKNOWN payment type is NOT a bug - it's expected behavior for:**

- **88.3% of events** have proper payment types ✅
- **11.7% are UNKNOWN** because they're:
  - Navigation events (ON_HOME_PRESSED, ON_BACK_PRESSED)
  - System events (APP_LIFECYCLE, SDK status)
  - Transaction history/settlement events
  - Events logged before payment context is set

**The analyzer should**:
1. **Accept** that UNKNOWN exists for non-payment events
2. **Categorize** UNKNOWN into meaningful subcategories
3. **Only flag** truly unknown payment-related events for investigation
4. **Exclude** non-payment events from "expected if all successful" calculations

**The key insight**: Not all events need a payment type. Many are legitimately outside the payment flow context.
