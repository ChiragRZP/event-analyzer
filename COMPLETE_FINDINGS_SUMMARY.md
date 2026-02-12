# Complete Event Analyzer Findings & Fixes

**Date**: February 12, 2026
**Analyzed**: Feb 11 logs + POS codebase

---

## 🎯 SUMMARY OF ALL ISSUES

### 1. **CHEQUE Misclassification** ❌
- **What's Wrong**: 2 CHEQUE transactions classified as "legitimate drops"
- **Actual**: User pressed back button immediately after seeing cheque screen
- **Should Be**: User cancellations
- **Impact**: Inflates "legitimate drop" count, hides user abandonment

### 2. **CARD Count Discrepancy** ❌
- **What's Wrong**: Shows 6 CARD transactions, but only 2 success + 0 failures = WHERE ARE THE OTHER 4?
- **Actual**: 2 success + **3 failures** + 1 drop = 6 total
- **Should Be**: Display failure count separately
- **Impact**: Failures are invisible in the report

### 3. **ON_BACK_PRESSED / ON_HOME_PRESSED Not Detected** ❌
- **What's Wrong**: Classifier doesn't recognize navigation events as user cancellations
- **Actual**: These ARE user cancellations when they happen during payment flow
- **Should Be**: Detect and classify as USER_CANCELLATION
- **Impact**: Many user cancellations marked as "legitimate drops"

### 4. **Dynamic Events Not Captured** ⚠️
- **What's Wrong**: Event analyzer uses fixed event lists from success-flows.js
- **Actual**: Codebase generates many events dynamically at runtime
- **Should Be**: Understand and handle dynamic event patterns
- **Impact**: May miss some API events in expected flows

---

## 🔧 FIXES REQUIRED

### Fix #1: Detect Navigation Events as User Cancellations

**File**: `/utils/classifier.js` (line 14-59)

**Add this logic BEFORE checking for legitimate drops:**

```javascript
// Check for early navigation away from payment screens
const hasBackPress = eventNames.has('ON_BACK_PRESSED');
const hasHomePress = eventNames.has('ON_HOME_PRESSED');

// Navigation during payment (NOT after success/failure) = cancellation
const isEarlyCancellation = (hasBackPress || hasHomePress) &&
  !hasSuccess &&   // Not after success screen
  !hasFailure;     // Not after failure screen

if (eventNames.has('PAYMENT_CANCELLED') ||
    hasUPIStopPayment ||
    hasBQRStopPayment ||
    hasPayLinkStopPayment ||
    hasGenericStopPayment ||
    isEarlyCancellation) {  // ← ADD THIS

  let stopMethod = 'back button';
  if (hasBackPress) stopMethod = 'back button (navigation)';
  if (hasHomePress) stopMethod = 'home button (navigation)';
  // ... other methods

  return {
    category: 'USER_CANCELLATION',
    isLegitimate: false,
    severity: 'INFO',
    reason: `User cancelled the payment using ${stopMethod}`,
  };
}
```

---

### Fix #2: Add Failure Count to Statistics

**File**: `/utils/event-statistics.js`

**Add failure counter:**

```javascript
// In typeStats initialization
failureCount: 0,  // ← ADD THIS

// In categorization logic (around line 85-115)
if (category === 'SUCCESS') {
  typeStats.successCount++;
} else if (category === 'FAILURE') {  // ← ADD THIS BLOCK
  typeStats.failureCount++;
} else if (category === 'USER_CANCELLATION') {
  typeStats.userCancellationCount++;
} else if (category === 'MODE_SWITCH') {
  typeStats.modeSwitchCount++;
} else if (dropClassification.isLegitimate) {
  typeStats.legitimateDropCount++;
}
```

**File**: `/utils/reporter.js`

**Display failure count:**

```javascript
lines.push(`  Transactions: ${typeStats.transactionCount}`);
lines.push(`    ✅ Success: ${typeStats.successCount}`);
lines.push(`    ⚠️  Failure: ${typeStats.failureCount}`);  // ← ADD THIS
lines.push(`    ❌ Legitimate Drops: ${typeStats.legitimateDropCount}`);
lines.push(`    🚫 User Cancellations: ${typeStats.userCancellationCount}`);
lines.push(`    🔄 Mode Switches: ${typeStats.modeSwitchCount}`);
```

---

### Fix #3: Handle Dynamic API Events (Optional Enhancement)

**Discovered 6 dynamic event patterns in codebase:**

#### Pattern 1: API Event Factory
```typescript
// Generates: {LABEL}_API_REQUEST, {LABEL}_API_RESPONSE_SUCCESS, {LABEL}_API_RESPONSE_FAILED
// Examples:
LOGIN_API_REQUEST
CARD_PAYMENT_API_REQUEST
UPI_QR_GENERATE_API_REQUEST
```

#### Pattern 2: Payment Mode Prefix
```typescript
// Generates: {PAYMENT_MODE}_{EVENT_NAME}
// Examples:
UPI_PRINT_STATUS_CHECK
CARD_PAYMENT_TIMEOUT
BQR_PAYMENT_CANCELLED
```

#### Pattern 3: URL-to-Event Mapping
```typescript
// Generates: CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD
// URL /api/3.0/payment/card → API_3.0_PAYMENT_CARD
```

#### Pattern 4: Success/Failure Screen Events
```typescript
// Generates: {PAYMENT_MODE}_TRANSACTION_SUCCESS_SCREEN_SHOWN
// Examples:
CARD_TRANSACTION_SUCCESS_SCREEN_SHOWN
UPI_TRANSACTION_FAILURE_SCREEN_SHOWN
```

#### Pattern 5: Network Error Code Events
```typescript
// Generates: Login_API_{ERROR_CODE}
// Examples:
Login_API_NETWORK_ERROR
Login_Failed_CONNECTION_ISSUE
```

#### Pattern 6: Dynamic BQR Detection
```typescript
// Any URL with /qr/ or /qrcode/ (excluding /upi/) → BQR_GENERATE
```

**Recommendation**: Update success-flows.js to use pattern matching instead of fixed event names for these dynamic patterns.

---

## 📊 EXPECTED RESULTS AFTER FIXES

### Feb 11 Logs - CARD (Before vs After):

**BEFORE (Current):**
```
CARD:
  Transactions: 6
    ✅ Success: 2
    ⚠️  Failure: 0  ← WRONG!
    ❌ Legitimate Drops: 0
    🚫 User Cancellations: 0
```

**AFTER (Fixed):**
```
CARD:
  Transactions: 6
    ✅ Success: 2
    ⚠️  Failure: 3  ← FIXED!
    ❌ Legitimate Drops: 1
    🚫 User Cancellations: 0
```

---

### Feb 11 Logs - CHEQUE (Before vs After):

**BEFORE (Current):**
```
CHEQUE:
  Transactions: 2
    ✅ Success: 0
    ⚠️  Failure: 0
    ❌ Legitimate Drops: 2  ← WRONG!
    🚫 User Cancellations: 0
```

**AFTER (Fixed):**
```
CHEQUE:
  Transactions: 2
    ✅ Success: 0
    ⚠️  Failure: 0
    ❌ Legitimate Drops: 0  ← FIXED!
    🚫 User Cancellations: 2  ← FIXED!
```

---

## 🔍 EVIDENCE FROM LOGS

### CHEQUE Transaction MLHJ0NG4H77BJZ:
```csv
cheque_payment_screen_shown  ← User saw screen
ON_BACK_PRESSED              ← User immediately pressed back
amount_screen_shown          ← Went back to amount entry
```

**Classification**: User cancellation (not a drop!)

### CARD Transaction MLHJ0NG4H77BE8:
```csv
CARD_PAYMENT_SELECTED
payment_initiated_card
Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN
Card_APP_EVENT_PIN_ENTERED
CARD_PAYMENT_API_REQUEST
CARD_PAYMENT_API_RESPONSE_FAILED         ← FAILED!
CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN  ← Failure screen shown
```

**Classification**: Failure (should be counted!)

---

## 📁 FILES TO MODIFY

### Priority 1 (Critical):
1. ✅ `/utils/classifier.js` - Add ON_BACK_PRESSED/ON_HOME_PRESSED detection
2. ✅ `/utils/event-statistics.js` - Add failureCount tracking
3. ✅ `/utils/reporter.js` - Display failure count

### Priority 2 (Enhancement):
4. ⚠️ `/utils/success-flows.js` - Add dynamic event pattern support (optional)

---

## 🧪 TESTING PLAN

After implementing fixes, test with Feb 11 logs:

### Test Case 1: CHEQUE Transactions
```bash
node index.js /Users/peddakondannagari.r/Downloads/feb11_full_logs.csv
```

**Expected**:
- CHEQUE: 2 transactions
- User Cancellations: 2 (not 0)
- Legitimate Drops: 0 (not 2)

### Test Case 2: CARD Transactions
**Expected**:
- CARD: 6 transactions
- Success: 2
- Failure: 3 (not 0)
- Legitimate Drops: 1

### Test Case 3: Overall Counts
**Expected**:
- Total transactions: 1,019
- All payment types add up correctly
- No transactions with (success=0, failure=0, drops=0, cancellation=0)

---

## 🎓 KEY LEARNINGS

### Learning #1: Navigation Events Are User Actions
- `ON_BACK_PRESSED` and `ON_HOME_PRESSED` are **user-initiated**
- They should be classified as **USER_CANCELLATION**, not legitimate drops
- EXCEPT when they occur AFTER success/failure screens (those are dismissals, not cancellations)

### Learning #2: Failures Need Visibility
- Current analyzer groups failures with "other" category
- Failures are important to track separately
- They indicate payment issues, not user behavior

### Learning #3: Dynamic Events Exist Everywhere
- 6 different dynamic event generation patterns found in codebase
- Payment mode prefixes, API labels, URL paths, error codes
- Fixed event lists may miss dynamically generated events

### Learning #4: Context Matters
- Same event (`ON_BACK_PRESSED`) can mean different things:
  - During payment flow = Cancellation
  - After success screen = Dismissal (normal)
  - After failure screen = Dismissal (normal)
- Need to analyze event sequence, not just event presence

---

## 🚀 IMPLEMENTATION ORDER

1. **Implement Fix #1** (Navigation event detection)
   - ⏱️ Time: ~30 minutes
   - 🎯 Impact: Fixes CHEQUE misclassification

2. **Implement Fix #2** (Failure count)
   - ⏱️ Time: ~20 minutes
   - 🎯 Impact: Fixes CARD count discrepancy

3. **Test with Feb 11 logs**
   - ⏱️ Time: ~10 minutes
   - 🎯 Impact: Verify fixes work correctly

4. **Optional: Fix #3** (Dynamic events)
   - ⏱️ Time: ~2-4 hours
   - 🎯 Impact: Future-proofs analyzer for new event patterns

---

## 📝 NEXT STEPS

1. ✅ Review this document
2. ✅ Approve fixes #1 and #2
3. ⏳ Implement changes
4. ⏳ Test with Feb 11 logs
5. ⏳ Verify against Querybook
6. ⏳ Consider dynamic event support (Fix #3)

---

**All findings documented. Ready to implement fixes!** 🎯
