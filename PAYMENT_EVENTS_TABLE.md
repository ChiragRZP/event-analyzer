# Payment Flow Events - Start and End Events Table

## Understanding Multiple End Events

### Why Multiple Success Events?

A successful payment doesn't end with just one event - it's a **sequence of events** that happen as the flow completes:

1. **Screen Display Event** - UI shows success screen to user (e.g., `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN`)
2. **Payment Success Marker** - Explicit success flag (e.g., `upi_payment_success`)
3. **Receipt/Print Events** - Auto-printing charge slip (e.g., `UPI_AUTOMATE_PRINT_CHANRGESLIP`, `UPI_print_status_result`)
4. **Thermal Print Events** - Physical receipt printing (e.g., `UPI_THERMAL_PRINT_START`)

**All of these can be "end events"** depending on where the sequence stops. The analyzer needs to recognize ANY of them as success indicators.

### Why Multiple Failure Events?

Similarly, failures can manifest in different ways:

1. **Screen Display Event** - UI shows failure screen (e.g., `UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN`)
2. **Payment Failure Marker** - Explicit failure flag (e.g., `card_payment_failure`)
3. **Action Ends Event** - Payment flow terminated (e.g., `UPI_ACTION_ENDS`)

Different failure scenarios may log different combinations of these events.

### Why Different Naming Formats?

You'll notice events like:
- `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` (full format)
- `UPI_TRANSACTION_SUCCESS_SCREEN_SHOWN` (shorter format)

This is because:
- **Code evolved over time** - older events use shorter names, newer ones are more descriptive
- **Different code paths** - some flows use the full event name, others use shortened versions
- **Both are valid** - the analyzer must recognize both formats

---

## Primary Events Reference

| Payment Type | Start Event | Success End Events | Failure End Events | Other End Events |
|--------------|-------------|-------------------|-------------------|------------------|
| **UPI** | `payment_initiated_upi`<br><br>**When**: User selects UPI payment method<br>**Location**: Payment orchestrator | **1. Screen Display:**<br>• `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown to user<br><br>**2. Success Marker:**<br>• `upi_payment_success` - Explicit success flag<br><br>**3. Receipt Events:**<br>• `UPI_print_status_result` - Print completed<br>• `UPI_THERMAL_PRINT_START` - Thermal printer started<br><br>**Why Multiple?** Sequence may end at any stage: after screen display, during printing, or after print completes | **1. Screen Display:**<br>• `UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen shown<br><br>**2. Flow Termination:**<br>• `UPI_ACTION_ENDS` - UPI payment flow ended<br><br>**Why Multiple?** Different failure paths (API failure vs timeout vs network error) may log different events | **User Actions (NOT system failures):**<br>• `PAYMENT_CANCELLED` - User pressed back/cancel button<br>• `PAYMENT_TIMEOUT` - QR code expired after 300 seconds<br>• `PAYMENT_MODE_SWITCH` - User switched to CARD/CASH/etc<br><br>**Why Separate?** These are expected user behaviors, not system drops |
| **BharatQR (BQR)** | `payment_initiated_upi`<br><br>**When**: User selects BharatQR payment<br>**Note**: Initially tracked as UPI, normalized to BQR in code<br>**Important**: Successful BQR → stored as "UPI" in database! | **1. Screen Display:**<br>• `BQR_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Short format<br>• `BHARATQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Full format with "BHARATQR" name<br><br>**2. Success Marker:**<br>• `bqr_payment_success`<br><br>**3. Receipt Events:**<br>• `BQR_print_status_result`<br><br>**Why Multiple Formats?** Two naming conventions: "BQR" (code internal) vs "BHARATQR" (user-facing) | **1. Screen Display:**<br>• `BQR_TRANSACTION_FAILURE_SCREEN_SHOWN`<br>• `BHARATQR_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN`<br><br>**2. Flow Termination:**<br>• `BQR_ACTION_ENDS`<br><br>**Note**: Failed/Expired BQR → stored as "BHARATQR" in database (different from successful!) | **Same as UPI:**<br>• `PAYMENT_CANCELLED`<br>• `PAYMENT_TIMEOUT`<br>• `PAYMENT_MODE_SWITCH`<br><br>**Note**: BQR uses same QR flow as UPI, just different event prefixes |
| **CARD** | `payment_initiated_card`<br><br>**When**: User selects CARD/contactless/swipe payment<br>**Location**: Payment orchestrator | **1. Screen Display:**<br>• `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Full format (newer)<br>• `CARD_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Short format (older)<br><br>**2. Success Marker:**<br>• `card_payment_success` - Explicit success flag<br><br>**3. Receipt Events:**<br>• `CARD_print_status_result` - Print completed<br><br>**Why Both Formats?** Code evolved over time - both formats are used in different code paths, analyzer must recognize both | **1. Screen Display:**<br>• `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Full format<br>• `CARD_TRANSACTION_FAILURE_SCREEN_SHOWN` - Short format<br><br>**2. Failure Marker:**<br>• `card_payment_failure` - Explicit failure flag<br><br>**Why Multiple?** Card failures can happen at different stages: card read error, PIN incorrect, bank decline, network timeout - each may log different event combinations | **User Actions:**<br>• `PAYMENT_CANCELLED` - User aborted during PIN entry or card reading<br>• `PAYMENT_TIMEOUT` - PIN entry timed out (user didn't enter PIN)<br>• `PAYMENT_MODE_SWITCH` - Switched to UPI/CASH/etc<br><br>**Why Track These?** Distinguish between system failures (drops) and intentional user actions |
| **EMI** | `EMI_CHECK_INITIATED`<br><br>**When**: Card is eligible for EMI and EMI check starts<br>**Note**: EMI flows through CARD, inherits CARD events | **EMI uses CARD success events:**<br>• `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN`<br>• `card_payment_success`<br>• `CARD_print_status_result`<br><br>**Difference**: Success events include `is_emi: true` property in event data<br><br>**Why Same as CARD?** EMI is a payment option ON TOP of card payment - after EMI plan selection, it follows normal card flow | **EMI uses CARD failure events:**<br>• `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN`<br>• `card_payment_failure`<br><br>**Difference**: Failure events include `is_emi: true` property<br><br>**Why Same?** EMI failures are still card payment failures at the core | **EMI-Specific:**<br>• `EMI_OPTION_NOT_SELECTED` - User declined EMI offer, proceeding with regular card payment<br>• `EMI_FULL_SWIPE_OFFER_DECLINED` - User declined full-swipe EMI offer<br><br>**Plus CARD events:**<br>• `PAYMENT_CANCELLED`<br>• `PAYMENT_TIMEOUT`<br>• `PAYMENT_MODE_SWITCH` |
| **CASH** | `cash_payment_screen_shown`<br><br>**When**: Cash payment screen displayed to user<br>**Note**: Simpler flow than card/UPI | **Two naming formats:**<br>• `CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Full format<br>• `CASH_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Short format<br><br>**Why Both?** Same reason as CARD - code evolution over time | **Screen Display:**<br>• `CASH_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Full<br>• `CASH_TRANSACTION_FAILURE_SCREEN_SHOWN` - Short<br><br>**Network Issues:**<br>• `cash_network_error` - Failed to record cash payment in backend<br><br>**Why Network Error Separate?** Helps diagnose if failure is connectivity vs business logic | • `PAYMENT_CANCELLED`<br>• `PAYMENT_MODE_SWITCH`<br><br>**No timeout for cash** - user confirms manually, no time limit |
| **CHEQUE** | `cheque_payment_screen_shown`<br><br>**When**: Cheque payment screen displayed<br>**Note**: Similar to cash, manual entry flow | **Two formats:**<br>• `cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Full<br>• `CHEQUE_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Short<br><br>**Simple flow** - enter cheque details, submit | **Two formats:**<br>• `cheque_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Full<br>• `CHEQUE_TRANSACTION_FAILURE_SCREEN_SHOWN` - Short<br><br>**Usually backend failures** - validation errors, duplicate check | • `PAYMENT_CANCELLED`<br>• `PAYMENT_MODE_SWITCH`<br><br>**Manual entry** - user can cancel anytime during form entry |
| **DEMAND DRAFT (DD)** | `dd_payment_screen_shown`<br><br>**When**: DD payment screen displayed<br>**Note**: Least common payment type | **Two formats:**<br>• `DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Full<br>• `DD_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Short<br><br>**Similar to cheque** - manual entry and submission | **Two formats:**<br>• `DD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Full<br>• `DD_TRANSACTION_FAILURE_SCREEN_SHOWN` - Short<br><br>**Backend validation** - DD number format, amount validation | • `PAYMENT_CANCELLED`<br>• `PAYMENT_MODE_SWITCH`<br><br>**Rarely used** - mostly for specific merchant types |

---

## Why This Matters for Event Analyzer

### The Challenge of Multiple Events

When analyzing event logs, the tool faces these challenges:

**1. Incomplete Sequences**
- Payment might succeed but sequence ends at different points:
  - Best case: Ends after `{TYPE}_print_status_result` (complete flow)
  - Common case: Ends after `{TYPE}_TRANSACTION_SUCCESS_SCREEN_SHOWN` (user navigated away before printing)
  - Edge case: Ends at `{type}_payment_success` (minimal success indicator)

**2. Need for Flexible Detection**
The analyzer must recognize **ANY** of the success events as valid completion:
```javascript
// Pseudocode from analyzer
const successIndicators = [
  'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
  'UPI_TRANSACTION_SUCCESS_SCREEN_SHOWN',
  'upi_payment_success',
  'UPI_print_status_result',
  'UPI_THERMAL_PRINT_START'
];

const hasSuccess = events.some(e => successIndicators.includes(e.eventName));
```

**3. Avoiding False Positives**
Must distinguish between:
- ❌ System failure (legitimate drop) → `UPI_TRANSACTION_FAILURE_SCREEN_SHOWN` + no success events
- ✅ User cancellation (NOT a drop) → `PAYMENT_CANCELLED` event present
- ⏱️ Timeout (NOT a drop for QR) → `PAYMENT_TIMEOUT` for QR expiry
- 🔄 Mode switch (NOT a drop) → `PAYMENT_MODE_SWITCH` event present

### Real Example from CSV Data

**UPI Success Sequence (from actual logs):**
```
1. payment_initiated_upi                           ← START
2. qr_generation_started
3. UPI_QR_GENERATE_API_REQUEST
4. qr_api_success
5. UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN
6. UPI_API_EVENT_REQ_CHECK_STATUS
7. UPI_API_EVENT_RESP_CHECK_STATUS
8. Create_TransactionResultActivity
9. UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN  ← SUCCESS END
10. UPI_AUTOMATE_PRINT_CHANRGESLIP
11. UPI_print_status_result                        ← FINAL END
12. ON_HOME_PRESSED                                ← USER NAVIGATION
```

**If sequence cut off at event #9**: Still success! ✅
**If sequence cut off at event #7**: Drop! Payment authorized but no success screen ❌

---

## Alternative Start Events (Also Valid)

These events may appear as the first event in a sequence depending on the flow:

| Payment Type | Alternative Start Events | Context |
|--------------|-------------------------|---------|
| **UPI** | • `qr_generation_started`<br>• `UPI_PAY_START` (`Create_PayViaUPIActivity`)<br>• `MQTT_P2P_HANDLE_PAYMENT_REQUEST` | • QR flow start<br>• Activity creation<br>• P2P payment request |
| **BQR** | • `qr_generation_started`<br>• `BQR_PAY_START` (`Create_PayViaBQRActivity`)<br>• `MQTT_P2P_HANDLE_PAYMENT_REQUEST` | • QR flow start<br>• Activity creation<br>• P2P payment request |
| **CARD** | • `CARD_PAYMENT_SELECTED`<br>• `CARD_PAY_START` (`Create_PayViaCardActivity`)<br>• `MQTT_P2P_HANDLE_PAYMENT_REQUEST` | • Payment method selection<br>• Activity creation<br>• P2P payment request |
| **EMI** | • `EMI_OVERLAY_SHOWN`<br>• `payment_initiated_card` | • EMI option display<br>• Inherits from CARD |
| **CASH** | • `CASH_PAYMENT_INITIATED` (`cash_payment_initiated`) | • Payment execution start |
| **CHEQUE** | • `CHEQUE_PAYMENT_INITIATED` (`cheque_payment_initiated`) | • Payment execution start |
| **DD** | • `DD_PAYMENT_INITIATED` (`dd_payment_initiated`) | • Payment execution start |

---

## Universal End Events (Common Across All Payment Types)

These events appear in most payment sequences regardless of type:

| Event Category | Events | When They Appear |
|----------------|--------|------------------|
| **Transaction Result** | • `Create_TransactionResultActivity` | Always before success/failure screen |
| **Post-Transaction Navigation** | • `ON_HOME_PRESSED`<br>• `checkbox_mounted`<br>• `checkbox_unmounted` | User navigates after completion |
| **Receipt/Printing** | • `{TYPE}_AUTOMATE_PRINT_CHANRGESLIP`<br>• `{TYPE}_print_status_check`<br>• `{TYPE}_print_status_result`<br>• `fetch_charge_slip_api_request`<br>• `CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_REQUEST`<br>• `CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_RESPONSE_SUCCESS`<br>• `{TYPE}_THERMAL_PRINT_START` | After success screen (if auto-print enabled) |
| **P2P Completion** | • `MQTT_P2P_ACKNOWLEDGEMENT_SENT`<br>• `EMIT_MQTT_P2P_CANCELLATION` | P2P flow completion/cancellation |

*Note: `{TYPE}` = UPI, BQR, CARD, etc.*

---

## Payment Event Lifecycle Explained

### Complete Success Flow (All Events Present)

```
┌─────────────────────────────────────────────────────────────────┐
│                        PAYMENT START                             │
├─────────────────────────────────────────────────────────────────┤
│ payment_initiated_upi                                           │
│ • User selects payment method                                   │
│ • Creates new sequence_id                                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CORE PAYMENT PROCESSING                       │
├─────────────────────────────────────────────────────────────────┤
│ qr_generation_started                                           │
│ UPI_QR_GENERATE_API_REQUEST                                     │
│ qr_api_success ← Backend txnId received here!                   │
│ UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN                                │
│ UPI_API_EVENT_REQ_CHECK_STATUS                                  │
│ UPI_API_EVENT_RESP_CHECK_STATUS                                 │
│ UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION ← Payment confirmed!    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SUCCESS SCREEN (First End)                    │
├─────────────────────────────────────────────────────────────────┤
│ Create_TransactionResultActivity                                │
│ UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN                   │
│ upi_payment_success                                             │
│                                                                  │
│ ✅ ANALYZER CAN STOP HERE - Success confirmed!                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RECEIPT GENERATION (Second End)               │
├─────────────────────────────────────────────────────────────────┤
│ UPI_AUTOMATE_PRINT_CHANRGESLIP                                  │
│ fetch_charge_slip_api_request                                   │
│ CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_RESPONSE_SUCCESS            │
│                                                                  │
│ ✅ ANALYZER CAN STOP HERE - Receipt fetched!                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    THERMAL PRINTING (Third End)                  │
├─────────────────────────────────────────────────────────────────┤
│ UPI_THERMAL_PRINT_START                                         │
│ UPI_print_status_check                                          │
│ UPI_print_status_result                                         │
│                                                                  │
│ ✅ ANALYZER CAN STOP HERE - Print complete!                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    USER NAVIGATION (Final End)                   │
├─────────────────────────────────────────────────────────────────┤
│ ON_HOME_PRESSED                                                 │
│ checkbox_mounted                                                │
│                                                                  │
│ ✅ Sequence truly ends - User navigated away                    │
└─────────────────────────────────────────────────────────────────┘
```

### Why Multiple Success Events Exist

As shown above, a payment progresses through **multiple stages**. Each stage has its own "end event":

| Stage | End Event | Why It Matters |
|-------|-----------|----------------|
| **Payment Authorized** | `UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` | Payment succeeded at backend, money transferred |
| **UI Updated** | `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` | User sees success message |
| **Success Marked** | `upi_payment_success` | Explicit success flag for analytics |
| **Receipt Ready** | `fetch_charge_slip_api_response` | Digital receipt available |
| **Print Complete** | `UPI_print_status_result` | Physical receipt printed |
| **User Left** | `ON_HOME_PRESSED` | User navigated to home screen |

**Any of these can be the last event** in the sequence depending on:
- User behavior (navigated away early)
- Auto-print settings (enabled/disabled)
- Network conditions (receipt fetch might fail but payment succeeded)
- Device capabilities (printer available or not)

### Implications for Drop Detection

**Scenario 1: Payment succeeds, user navigates away quickly**
```
Events: [...core payment...] → UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN → ON_HOME_PRESSED
Result: ✅ SUCCESS (screen shown = success, even though no print events)
```

**Scenario 2: Payment succeeds, receipt fetch fails**
```
Events: [...core payment...] → UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN → fetch_charge_slip_api_request → (network error)
Result: ✅ SUCCESS (payment succeeded, receipt issue is separate)
```

**Scenario 3: Payment authorized, but app crashes before showing screen**
```
Events: [...core payment...] → UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION → (crash, no more events)
Result: ⚠️ CRITICAL DROP (payment succeeded but user never saw confirmation!)
```

**Scenario 4: User cancels before payment completes**
```
Events: [...core payment...] → PAYMENT_CANCELLED
Result: 🚫 NOT A DROP (user action, not system failure)
```

---

## Critical Terminal Events (For Drop Detection)

Use these to determine if a sequence has reached a terminal state:

### Success Terminal Events (Payment Completed Successfully)
```
✅ {PAYMENT_TYPE}_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN
✅ {PAYMENT_TYPE}_TRANSACTION_SUCCESS_SCREEN_SHOWN
✅ {payment_type}_payment_success
✅ UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION (for UPI/BQR)
```

### Failure Terminal Events (Payment Failed)
```
❌ {PAYMENT_TYPE}_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN
❌ {PAYMENT_TYPE}_TRANSACTION_FAILURE_SCREEN_SHOWN
❌ {payment_type}_payment_failure
❌ {PAYMENT_TYPE}_ACTION_ENDS
```

### User Action Terminal Events (Not System Failures)
```
🚫 PAYMENT_CANCELLED - User cancellation (exclude from drop analysis)
⏱️ PAYMENT_TIMEOUT - Timeout (exclude from drop analysis for QR expiry)
🔄 PAYMENT_MODE_SWITCH - Mode switch (exclude from drop analysis)
```

---

## Event Naming Patterns

### Pattern Recognition

**Success Screen Events:**
- Format: `{PAYMENT_MODE}_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN`
- Or: `{PAYMENT_MODE}_TRANSACTION_SUCCESS_SCREEN_SHOWN`
- Examples: `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN`, `CARD_TRANSACTION_SUCCESS_SCREEN_SHOWN`

**Failure Screen Events:**
- Format: `{PAYMENT_MODE}_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN`
- Or: `{PAYMENT_MODE}_TRANSACTION_FAILURE_SCREEN_SHOWN`
- Examples: `UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN`, `CARD_TRANSACTION_FAILURE_SCREEN_SHOWN`

**Payment Success Events:**
- Format: `{payment_mode}_payment_success`
- Examples: `upi_payment_success`, `card_payment_success`, `bqr_payment_success`

**Print Events:**
- Format: `{PAYMENT_MODE}_print_status_result`
- Examples: `UPI_print_status_result`, `CARD_print_status_result`

---

## Quick Decision Tree for Event Classification

```
Is there a SUCCESS_SCREEN_SHOWN event?
├─ YES → ✅ Success (not a drop)
└─ NO → Is there a FAILURE_SCREEN_SHOWN event?
    ├─ YES → ❌ Legitimate Failure (could be a drop or expected failure)
    └─ NO → Is there PAYMENT_CANCELLED?
        ├─ YES → 🚫 User Cancellation (NOT a drop)
        └─ NO → Is there PAYMENT_MODE_SWITCH?
            ├─ YES → 🔄 Mode Switch (NOT a drop)
            └─ NO → Is there PAYMENT_TIMEOUT?
                ├─ YES → ⏱️ Timeout (NOT a drop for QR expiry)
                └─ NO → ⚠️ LIKELY A DROP - Missing terminal event
```

---

## Notes

1. **Multiple End Events**: A successful transaction typically has MULTIPLE end events in sequence:
   - First: Success screen event
   - Then: Print events (if enabled)
   - Finally: Navigation events

2. **P2P Flows**: Sequences with P2P events may have additional MQTT-related end events

3. **Backend Mapping**:
   - Successful BQR payments → stored as `payment_mode = 'UPI'` in database
   - Failed/Expired BQR → stored as `payment_mode = 'BHARATQR'`

4. **Event Ordering**: Events are sorted by `EVENT_TIME` property (millisecond precision) for accurate chronological ordering

5. **Sequence vs Transaction**:
   - One `sequence_id` = One payment attempt (frontend identifier)
   - One `txnId` = One backend transaction (can have multiple sequence attempts)

---

## Key Takeaways for Developers

### For Event Analyzer Development

1. **Check for ANY success indicator** - Don't require all success events to be present
   ```javascript
   // GOOD ✅
   const hasSuccess = events.some(e => successIndicators.includes(e.eventName));

   // BAD ❌
   const hasSuccess = events.includes('UPI_print_status_result'); // Too strict!
   ```

2. **Prioritize screen events over print events** - Screen display is more reliable indicator than printing
   ```javascript
   // Priority order for success detection:
   // 1. UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN (most reliable)
   // 2. upi_payment_success (explicit marker)
   // 3. UPI_print_status_result (nice to have, but optional)
   ```

3. **Exclude user actions from drop analysis** - These are not system failures:
   ```javascript
   if (events.includes('PAYMENT_CANCELLED')) {
     return { isLegitimate: false, category: 'USER_CANCELLATION' };
   }
   ```

4. **Handle both naming formats** - Old and new event names coexist:
   ```javascript
   const successScreenEvents = [
     'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',  // New format
     'UPI_TRANSACTION_SUCCESS_SCREEN_SHOWN'             // Old format
   ];
   ```

### For Data Analysts

1. **Don't panic if print events are missing** - Payment might have succeeded without printing
2. **Look for screen display events** - These are the most reliable success indicators
3. **Check for user action events** - High cancellation rate might indicate UX issues, not system problems
4. **BQR vs UPI in database** - Successful BQR → stored as UPI; only failed BQR → stored as BHARATQR

### For QA Testing

1. **Verify all success paths** - Test scenarios where user navigates away at different points
2. **Test user cancellations** - Ensure `PAYMENT_CANCELLED` is logged, not treated as drop
3. **Test mode switches** - Verify `PAYMENT_MODE_SWITCH` creates new sequence
4. **Test print failures** - Payment success shouldn't depend on printer functionality

---

**Last Updated:** 2026-02-05
**Source:** POS Codebase + Actual Event Logs Analysis
**Status:** Finalized
**Purpose:** Reference guide for Event Drop Analyzer development and payment flow understanding
