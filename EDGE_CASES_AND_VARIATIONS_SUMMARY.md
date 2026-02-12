# Payment Flow Edge Cases & Variations - Executive Summary

**Date**: February 12, 2026
**Analysis**: Complete codebase verification of all payment flows

---

## 🎯 YOUR CONCERNS WERE VALID!

You were absolutely right to question the success flows. Here's what we found:

---

## 1. CARD PAYMENT - PIN IS NOT ALWAYS REQUIRED ✅

### Your Question:
> "in card entering pin isnt compulsory always"

### Answer: **CORRECT!**

**PIN is OPTIONAL in these scenarios:**

| Card Type | PIN Requirement |
|-----------|----------------|
| **Contactless (NFC)** | Almost NEVER (uses CVMLimit instead) |
| **MAG Swipe** | Optional (service code digit determines requirement) |
| **CHIP** | Optional (online PIN bypass possible) |

**Evidence**:
- `/lib/pos/card/util.ts:510-513` - `getServicePin()` function
- Service code check: Digit 2 == '0' or '6' → PIN required
- Otherwise: PIN can be bypassed

**Success Variations Found:**

1. **Minimal (MAG, No PIN)**: 7-8 events
2. **With PIN**: 22-23 events
3. **International with DCC + PIN**: 30+ events

### Other OPTIONAL Card Events:

- `DCC_OPTED` / `DCC_NOT_OPTED` - Only for international cards (currency mismatch)
- `FETCH_SERVICE_FEE` / `SERVICE_FEE_ACCEPTED` - Only for SALE transactions when enabled
- `Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN` - Only when PIN required
- `Card_APP_EVENT_PIN_ENTERED` - Only when PIN entered

---

## 2. UPI - DOES NOT ALWAYS START WITH payment_initiated_upi ❌

### Your Question:
> "in upi is it possible that the transaction starts not with payment_initiated_upi but with qr_api_generate or something like that"

### Answer: **NO - Always starts with payment_initiated_upi**

**Evidence**:
- `/modules/payment/index.ts:256` - Single entry point
- `payment_initiated_upi` ALWAYS emitted first
- Then routes to `payViaUpi()` → QR component
- QR generation happens AFTER payment initiation

**Flow is strictly:**
```
payment_initiated_upi (ALWAYS FIRST)
  ↓
qr_generation_started
  ↓
QR API calls
  ↓
...rest of flow
```

**However**: We found OTHER critical issues with UPI flow!

---

## 3. UPI - TWO SUCCESS MECHANISMS (RACE CONDITION) ✅

### What We Found:

**UPI/BQR can complete via TWO INDEPENDENT PATHS:**

#### Path A: Status Polling
```
UPI_API_REQ_CHECK_STATUS (polls 1-12 times)
  ↓
UPI_API_RESP_CHECK_STATUS returns AUTHORIZED
  ↓
onComplete() called
```

#### Path B: MQTT Notification
```
MQTT_PAYMENT_NOTIFICATION_RECEIVED
  ↓
UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION
  ↓
onComplete() called
```

**Critical Insight**: Whichever completes FIRST triggers success!

**This means**:
- Transaction can succeed WITHOUT MQTT notification (polling only)
- Transaction can succeed WITHOUT polling completion (MQTT only)
- Both can happen simultaneously (race condition)

**Evidence**:
- `/lib/eze/qr.ts:127-142` - Polling setup
- `/modules/payment/payment-notifications.ts:39-76` - MQTT listener
- Both call `onComplete()` independently

---

## 4. POLLING EVENTS OCCUR MULTIPLE TIMES ✅

### What We Found:

**These events repeat 1-12 times per transaction:**

| Event | Min | Max | Avg |
|-------|-----|-----|-----|
| `UPI_API_REQ_CHECK_STATUS` | 1 | 12 | 1.12 |
| `PAYMENT_STATUS_API_REQUEST` | 1 | 12 | 1.12 |
| `UPI_API_RESP_CHECK_STATUS` | 1 | 12 | 1.12 |
| `PAYMENT_STATUS_API_RESPONSE_SUCCESS` | 1 | 12 | 1.12 |

**Why?**
- Polling continues until terminal status
- Each poll = 1 REQ + 1 RESP event
- Customer scan speed varies (fast scan = 1 round, slow scan = 12 rounds)

**Evidence**:
- `/lib/eze/payment-actions.ts:178-216` - Recursive polling
- Production data: 477 BQR transactions, average 1.12 polling rounds

**Impact**: Can't use fixed event count in success flow!

---

## 5. EVENT NEVER EMITTED (DEFINED BUT UNUSED) ✅

### What We Found:

**This event is DEFINED but NEVER EMITTED:**
```javascript
UPI_UI_EVENT_UPI_CHECK_STATUS_PROGRESS_INITIATED
```

**Evidence**:
- `/lib/track/const.ts:53-54` - Defined in constants
- Codebase search: NO `track()` calls emit this event
- Polling happens silently via API events instead

**Recommendation**: Remove from UPI success flow

---

## 6. PRINT EVENTS ARE POST-PAYMENT (NOT CRITICAL) ✅

### What We Found:

**All printing events happen AFTER payment success:**

```javascript
// complete.svelte - AFTER payment completed
handlePrintReceipt() {
  track(`${paymentMode}_AUTOMATE_PRINT_CHANRGESLIP`);
  try {
    await printChargeslipWithAnimation();
  } catch (e) {
    track(TRACK_EVENTS.PRINT_RECEIPT_FAILED);
    // Error shown but payment already succeeded!
  }
}
```

**Print events are OPTIONAL:**
- `AUTOMATE_PRINT_CHANRGESLIP`
- `{PAYMENT_MODE}_print_status_check`
- `print_status_check_failed` - Common (printer out of paper)
- `print_receipt_failed` - Common

**Evidence**: `/pages/pay/complete.svelte` - Print happens on success screen

**Impact**: Payment succeeds even if printing fails

---

## 7. BQR USES UPI EVENTS (SHARED FLOW) ✅

### What We Found:

**BQR and UPI share most events:**

| Event | UPI | BQR | Notes |
|-------|-----|-----|-------|
| `payment_initiated_upi` | ✅ | ✅ | Same entry! |
| `qr_generation_started` | ✅ | ✅ | Shared |
| `qr_api_success` | ✅ | ✅ | Shared |
| `UPI_API_REQ_CHECK_STATUS` | ✅ | ✅ | Polling shared |
| `UPI_PAY_AUTHORIZED...` | ✅ | ❌ | UPI specific |
| `BQR_PAY_AUTHORIZED...` | ❌ | ✅ | BQR specific |
| `UPI_QR_SHOWN` | ✅ | ❌ | UPI specific |
| `BQR_QR_SHOWN` | ❌ | ✅ | BQR specific |

**Evidence**:
- `/modules/payment/index.ts:183-188` - Both route to `payViaUpi()`
- `/lib/eze/qr.ts` - Shared QR generation logic
- `/modules/payment/payment-notifications.ts:53-60` - Differentiates notification events

**Impact**: BQR success flow very similar to UPI with minor event name differences

---

## 8. CASH/CHEQUE/DD - MINIMAL API CALLS ✅

### What We Found:

**CASH**:
- API call: `/api/2.0/payment/cash` (ALWAYS required)
- Optional: Customer auth data (PAN/Form 60) if amount >= cutoff
- Optional: Additional PIN if configured

**CHEQUE**:
- NO API call during payment!
- Validation happens locally
- Transaction creation API called but no "cheque payment" API

**DD**:
- API call: `/api/2.0/payment/demandDraft` (ALWAYS required)
- Stricter validation: DD number exactly 6 digits (vs 6+ for cheque)
- Date range limit: 84 days in past

**Evidence**:
- `/lib/eze/cash.ts` - createCashPayment()
- `/lib/eze/cheque.ts` - createChequePayment()
- `/lib/eze/demandDraft.ts` - createDemandDraftPayment()

---

## 9. EMI - TWO TYPES WITH DIFFERENT FLOWS ✅

### What We Found:

**Bank EMI vs Brand EMI:**

| Aspect | Bank EMI | Brand EMI |
|--------|----------|-----------|
| **Type** | `EMI_TYPE.NORMAL` | `EMI_TYPE.MYDISCOUNTEMI` |
| **API** | `/api/3.0/emi/fetchEmiOptions` | Same + catalog API |
| **Selection** | Bank + Tenure | Brand + Tenure |
| **Card Entry** | After selection | After selection |

**Key Insight**: EMI selection happens BEFORE card entry

**Evidence**:
- `/modules/payment/emi/emi-flow.ts:48-163` - EMI detection
- `/pages/pay/EMI/BankEmi.svelte` - Selection UI
- Card payment gets `emiDetails` in payload

---

## 10. PAYLINK - 15 SECOND DELAY BEFORE POLLING ✅

### What We Found:

**PAYLINK has unique timing:**

1. Send link API → `PAYLINK_SEND_SUCCESS`
2. **Wait 15 seconds** (SMS delivery time)
3. Start polling with `PAYLINK_POLL_STATUS_INITIATED`
4. Continue until AUTHORIZED/EXPIRED/FAILED

**Different from UPI/BQR:**
- UPI/BQR: QR shown locally, poll immediately
- PAYLINK: Link sent remotely, delay for delivery

**Evidence**:
- `/modules/payment/paylink/PaylinkWaiting.svelte:54` - 15s delay
- `/lib/eze/paylink.ts` - createPaylinkPayment()

---

## 📊 SUMMARY OF EDGE CASES FOUND

| Payment Type | Edge Cases Found | Impact |
|--------------|------------------|--------|
| **CARD** | PIN optional, DCC optional, Service fee optional | 3 different success variations |
| **UPI** | Two completion paths (poll vs MQTT) | Can succeed with different event sets |
| **BQR** | Shares UPI flow, two completion paths | Same as UPI + BQR-specific events |
| **CASH** | Customer auth optional, PIN optional | 2 variations |
| **CHEQUE** | No API call during payment | Simpler flow than expected |
| **DD** | Strict validation (84-day window) | Similar to cheque with constraints |
| **EMI** | Two types (Bank vs Brand) | Different flows |
| **PAYLINK** | 15s delay before polling | Timing-dependent |
| **WALLET** | Same as UPI QR mechanism | Shares flow |
| **NCMC** | Three sub-flows (check/update/load) | Multiple variations |

---

## ✅ WHAT TO DO NEXT

### 1. Update Success Flows:

**Mark events as:**
- `CRITICAL` - Always present (100% of successes)
- `OPTIONAL` - Conditional (PIN, DCC, service fee, etc.)
- `POLLING` - Repeat 1-12 times (handle separately)
- `POST_PAYMENT` - After success (printing)

### 2. Remove Unused Events:

- `UPI_UI_EVENT_UPI_CHECK_STATUS_PROGRESS_INITIATED` - Never emitted

### 3. Handle Variations:

**CARD** needs 3 flow definitions:
- Minimal (no PIN, no DCC)
- Standard (with PIN)
- Maximum (PIN + DCC + Service Fee)

**UPI/BQR** needs 2 completion paths:
- Via polling
- Via MQTT
- Via both (race condition)

### 4. Polling Event Handling (Task #3):

Instead of counting polling events once:
```javascript
expectedEvents = coreEvents + (pollingEvents × avgRounds)
// = 13 + (4 × 1.12) = 17.48 events per BQR transaction
```

---

## 🎓 KEY LEARNINGS

1. **Your instincts were right** - PIN isn't always required for CARD
2. **UPI doesn't have alternative entry points** - Always starts with payment_initiated_upi
3. **But UPI/BQR have TWO success mechanisms** - Polling OR MQTT
4. **Polling events repeat** - Can't use fixed count
5. **Print events are post-payment** - Not critical to success
6. **Some events are defined but never emitted** - Codebase has unused constants

---

## 📁 DOCUMENTATION CREATED

1. `/CODEBASE_DEEP_DIVE_FINDINGS.md` - Complete technical analysis
2. `/EDGE_CASES_AND_VARIATIONS_SUMMARY.md` - This executive summary
3. `/IMPLEMENTATION_SUMMARY.md` - What we implemented (Tasks 1 & 2)
4. `/COMPREHENSIVE_ANALYSIS_FINDINGS.md` - UNKNOWN payment type analysis

---

**Next Step**: Would you like me to update `success-flows.js` with the CRITICAL/OPTIONAL/POLLING structure based on these findings?
