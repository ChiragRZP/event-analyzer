# Event Analyzer Classification Issues & Fixes

**Date**: February 12, 2026
**Analyzed**: Feb 11 logs (`feb11_full_logs.csv`)

---

## 🔴 CRITICAL ISSUES FOUND

### Issue #1: `ON_BACK_PRESSED` and `ON_HOME_PRESSED` Not Detected as User Cancellation

**Current Behavior:**
- Classifier only detects `PAYMENT_CANCELLED` and stop payment API events as user cancellations
- Does NOT detect `ON_BACK_PRESSED` or `ON_HOME_PRESSED` as cancellations
- These are classified as "LEGITIMATE_DROP" instead

**Evidence from Feb 11 Logs:**

#### CHEQUE Transactions (2 total):
Both have the SAME pattern:

**Transaction MLHJ0NG4H77BJZ:**
```
cheque_payment_screen_shown
ON_BACK_PRESSED  ← USER PRESSED BACK BUTTON!
amount_screen_shown
```

**Transaction MLIYH1IWWSIK47:**
```
cheque_payment_screen_shown
ON_BACK_PRESSED  ← USER PRESSED BACK BUTTON!
amount_screen_shown
```

**Current Classification:** `CHEQUE_COMPLETION_DROP` (legitimate drop) ❌
**Should Be:** `USER_CANCELLATION` ✅

---

### Issue #2: CARD Transactions Showing Wrong Counts

**Event Analyzer Output:**
```
CARD:
  Transactions: 6
    ✅ Success: 2
    ❌ Legitimate Drops: 0  ← WHERE ARE THE OTHER 4?
    🚫 User Cancellations: 0
    🔄 Mode Switches: 0
```

**Actual Feb 11 CARD Transactions:**

| Transaction ID | Outcome | Evidence |
|---------------|---------|----------|
| MLHJ0NG4H77BE7 | **FAILURE** | `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` + `EMV_ERR_RECEIVED` |
| MLHJ0NG4H77BE8 | **FAILURE** | `CARD_PAYMENT_API_RESPONSE_FAILED` + `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` |
| MLHJ0NG4H77BE9 | **FAILURE** | `CARD_PAYMENT_API_RESPONSE_FAILED` + `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` |
| MLHJ0NG4H77BHA | **DROP** | API request sent, no response/completion |
| MLHJ0NG4H77BHB | **DROP** | API request sent, no response/completion |
| ??? | **SUCCESS** | 2 successful transactions |

**Issue:** The 3 FAILURE transactions should show up in the failure count, not as "0"!

---

### Issue #3: Discrepancy in Success/Failure/Drop Categorization

The analyzer reports:
- **Total transactions: 6**
- **Success: 2**
- **Everything else: 0**

This doesn't add up. The missing 4 transactions (3 failures + 1-2 drops) are being counted somewhere but not shown in the breakdown.

**Hypothesis:** The classifier is correctly detecting failures (line 100-120 in classifier.js), but the reporter/statistics module is not counting them properly in the breakdown.

---

## 🔧 ROOT CAUSES

### Root Cause #1: Missing Navigation Events in User Cancellation Detection

**File:** `/utils/classifier.js` (lines 14-59)

**Current code only checks:**
```javascript
if (eventNames.has('PAYMENT_CANCELLED') ||
    hasUPIStopPayment ||
    hasBQRStopPayment ||
    hasPayLinkStopPayment ||
    hasGenericStopPayment) {
  return { category: 'USER_CANCELLATION', ... };
}
```

**Missing:**
- `ON_BACK_PRESSED`
- `ON_HOME_PRESSED`
- Early navigation away from payment screens

---

### Root Cause #2: Navigation Events Need Context

**Problem:** Not all `ON_BACK_PRESSED` events are cancellations!

Examples:
1. ✅ **Cancellation**: `cheque_payment_screen_shown` → `ON_BACK_PRESSED` (user abandoned payment)
2. ❌ **NOT Cancellation**: `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` → `ON_BACK_PRESSED` (user dismissed failure screen)

**Solution needed:** Check WHEN the back/home press happened in the flow.

---

### Root Cause #3: Failure Transactions Not Counted in Statistics

**File:** `/utils/event-statistics.js` or `/utils/reporter.js`

The statistics module likely only counts:
- Success
- User Cancellations
- Mode Switches
- Legitimate Drops

But doesn't have a separate count for **FAILURE** category transactions!

---

## ✅ FIXES NEEDED

### Fix #1: Add Navigation Event Detection to Classifier

**File:** `/utils/classifier.js`
**Location:** Lines 14-59 (USER_CANCELLATION section)

**Add this logic:**

```javascript
// Check for early navigation away from payment screens
const hasEarlyBackPress = eventNames.has('ON_BACK_PRESSED');
const hasEarlyHomePress = eventNames.has('ON_HOME_PRESSED');

// Determine if back/home press was DURING payment (cancellation)
// vs AFTER payment completed/failed (dismissal)
const isEarlyCancellation = (hasEarlyBackPress || hasEarlyHomePress) &&
  !hasSuccess &&  // Not after success
  !hasFailure;     // Not after failure

if (eventNames.has('PAYMENT_CANCELLED') ||
    hasUPIStopPayment ||
    hasBQRStopPayment ||
    hasPayLinkStopPayment ||
    hasGenericStopPayment ||
    isEarlyCancellation) {  // ← ADD THIS

  let stopMethod = 'back button';
  if (hasUPIStopPayment) stopMethod = 'UPI stop payment';
  if (hasBQRStopPayment) stopMethod = 'BQR stop payment';
  if (hasPayLinkStopPayment) stopMethod = 'Paylink stop payment';
  if (hasEarlyBackPress) stopMethod = 'back button (navigation)';
  if (hasEarlyHomePress) stopMethod = 'home button (navigation)';

  return {
    category: 'USER_CANCELLATION',
    isLegitimate: false,
    severity: 'INFO',
    reason: `User cancelled the payment using ${stopMethod}`,
    details: {
      stopMethod,
      hasBackPress: hasEarlyBackPress,
      hasHomePress: hasEarlyHomePress,
    },
  };
}
```

---

### Fix #2: Update CHEQUE/CASH/DD Classification Logic

**File:** `/utils/classifier.js`
**Locations:** Lines 432-473 (CHEQUE, CASH, DD sections)

**Problem:** These sections check for `cheque_payment_initiated` but don't check for navigation events.

**Fix:** The new logic in Fix #1 will handle this automatically by detecting early navigation events BEFORE checking for these drops.

---

### Fix #3: Add Failure Count to Statistics & Reporter

**File:** `/utils/event-statistics.js`

**Current counts:**
```javascript
successCount: 0,
userCancellationCount: 0,
modeSwitchCount: 0,
legitimateDropCount: 0,
```

**Add:**
```javascript
failureCount: 0,  // ← ADD THIS
```

**Update the categorization logic:**
```javascript
const category = dropClassification.category;

if (category === 'SUCCESS') {
  typeStats.successCount++;
} else if (category === 'FAILURE') {  // ← ADD THIS
  typeStats.failureCount++;
} else if (category === 'USER_CANCELLATION') {
  typeStats.userCancellationCount++;
} else if (category === 'MODE_SWITCH') {
  typeStats.modeSwitchCount++;
} else if (dropClassification.isLegitimate) {
  typeStats.legitimateDropCount++;
}
```

**File:** `/utils/reporter.js`

**Update the report output to show failure count:**
```javascript
lines.push(`  Transactions: ${typeStats.transactionCount}`);
lines.push(`    ✅ Success: ${typeStats.successCount}`);
lines.push(`    ⚠️  Failure: ${typeStats.failureCount}`);  // ← ADD THIS
lines.push(`    ❌ Legitimate Drops: ${typeStats.legitimateDropCount}`);
lines.push(`    🚫 User Cancellations: ${typeStats.userCancellationCount}`);
lines.push(`    🔄 Mode Switches: ${typeStats.modeSwitchCount}`);
```

---

## 🔍 ADDITIONAL INVESTIGATION NEEDED

### Check for Dynamic API Events in Codebase

User mentioned: *"they said that there are some dynamic events which are set up in the codebase for api calls and stuff"*

**Need to search codebase for:**
1. Dynamic event name generation patterns
2. API call events that might be created at runtime
3. Event templates or factories

**Files to check:**
- `/lib/track/` - Event tracking utilities
- `/lib/eze/` - API call wrappers
- `/modules/payment/` - Payment flow logic

**Search patterns:**
```javascript
track(`${paymentMode}_...`)  // Dynamic event names
track(generateEventName(...))  // Event name generation
```

---

## 📋 TESTING CHECKLIST

After implementing fixes, test with Feb 11 logs:

### CHEQUE Tests
- [ ] Both CHEQUE transactions should be classified as `USER_CANCELLATION`
- [ ] Reason should mention "back button"
- [ ] Should NOT be "legitimate drops"

### CARD Tests
- [ ] 6 total CARD transactions detected ✅
- [ ] 2 successes ✅
- [ ] 3 failures (new count) ✅
- [ ] 1 legitimate drop ✅
- [ ] Total = 6 (2+3+1) ✅

### Overall Tests
- [ ] Total transactions: 1,019 ✅
- [ ] BQR: 594 transactions ✅
- [ ] Success count across all types matches database
- [ ] User cancellations properly detected for all payment types

---

## 🎯 EXPECTED RESULTS AFTER FIXES

### Feb 11 Logs - CARD Breakdown (After Fix):
```
CARD:
  Transactions: 6
    ✅ Success: 2
    ⚠️  Failure: 3  ← NEW!
    ❌ Legitimate Drops: 1
    🚫 User Cancellations: 0
    🔄 Mode Switches: 0
```

### Feb 11 Logs - CHEQUE Breakdown (After Fix):
```
CHEQUE:
  Transactions: 2
    ✅ Success: 0
    ⚠️  Failure: 0
    ❌ Legitimate Drops: 0  ← CHANGED FROM 2
    🚫 User Cancellations: 2  ← CHANGED FROM 0
    🔄 Mode Switches: 0
```

---

## 💡 ADDITIONAL IMPROVEMENTS

### Improvement #1: Detect "Partial Entry" Cancellations

Some users start entering payment details then abandon:

**Examples:**
- CARD: Tap card → See PIN screen → Press back (not entered PIN yet)
- CHEQUE: See cheque form → Press back (not filled form)

**Pattern:**
```
{payment_type}_screen_shown
→ (NO data entry events)
→ ON_BACK_PRESSED or ON_HOME_PRESSED
```

**Classification:** `USER_CANCELLATION` (subcategory: "Partial entry abandoned")

---

### Improvement #2: Track "Retry After Failure"

Some transactions have:
```
CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN
→ TXN_RETRY_BUTTON  ← User clicked retry!
→ payment_initiated_card (again)
```

**This is NOT a drop** - it's a retry. Should link to the next transaction in the sequence.

---

### Improvement #3: Add Event Time Analysis

Detect suspiciously quick cancellations:

**Example:**
```
cheque_payment_screen_shown (12:50:47.652)
ON_BACK_PRESSED             (12:50:47.652)  ← SAME TIMESTAMP!
```

**Classification:** `USER_CANCELLATION` (reason: "Immediate abandonment - same timestamp")

This indicates user pressed back within milliseconds of seeing the screen.

---

## 🚀 PRIORITY ORDER

1. **HIGH PRIORITY** - Fix #1: Add ON_BACK_PRESSED/ON_HOME_PRESSED detection
2. **HIGH PRIORITY** - Fix #3: Add failure count to statistics & reporter
3. **MEDIUM PRIORITY** - Fix #2: Update CHEQUE/CASH/DD logic (handled by Fix #1)
4. **LOW PRIORITY** - Investigate dynamic API events
5. **LOW PRIORITY** - Additional improvements (retry detection, time analysis)

---

## 📝 FILES TO MODIFY

1. `/utils/classifier.js` - Add navigation event detection
2. `/utils/event-statistics.js` - Add failure count
3. `/utils/reporter.js` - Display failure count
4. Test with Feb 11 logs to verify

---

**Next Steps:** Implement Fix #1 and Fix #3, then re-run analyzer on Feb 11 logs to verify counts match expectations.
