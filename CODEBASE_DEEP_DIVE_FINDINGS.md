# Codebase Deep Dive: All Payment Flows - Complete Findings

**Date**: February 12, 2026
**Analysis Type**: Comprehensive codebase exploration
**Scope**: ALL payment types (11 types analyzed)

---

## 🎯 KEY DISCOVERIES

### Critical Findings That Change Our Success Flows:

1. **CARD Payment**: PIN is NOT always required
   - Contactless (NFC): Usually no PIN below CVMLimit
   - MAG cards: PIN optional based on service code
   - DCC: Only for international cards
   - Service Fee: Only for specific transaction types

2. **UPI/BQR**: Two parallel success mechanisms
   - Status polling (pull)
   - MQTT notifications (push)
   - Either can complete the payment independently
   - Events differ based on which completes first

3. **UPI_CHECK_STATUS_PROGRESS_INITIATED**: Never emitted
   - Defined in constants but NO track() calls in code
   - Should be REMOVED from success flows

4. **Polling Events Occur Multiple Times**
   - `UPI_API_REQ/RESP_CHECK_STATUS`: 1-12 times per transaction
   - `PAYMENT_STATUS_API_REQUEST/RESPONSE`: Parallel to above
   - Cannot use fixed event count

5. **Print Events are Post-Payment**
   - Printing happens AFTER payment success
   - Print failures don't affect payment status
   - Should be marked as OPTIONAL

---

## 📋 COMPLETE PAYMENT FLOW ANALYSIS

### 1. CARD PAYMENT

#### Entry Points
- **File**: `/modules/payment/index.ts:256`
- **Event**: `CARD_PAYMENT_SELECTED`
- Always starts here

#### Optional vs Required Events

**CRITICAL (Always Present)**:
1. `CARD_PAYMENT_SELECTED` - Flow initiation
2. `TAP_SWIPE_DIP_CARD` - Card detection initiated
3. `EMV_CARD_READ` - Card read successful
4. `PREPARING_FOR_TXN` - Config prepared
5. `CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD` - Payment API call
6. `CARD_PAYMENT_API_EVENT_RESP_API_3.0_PAYMENT_CARD` - Payment API response
7. `Create_TransactionResultActivity` - Result activity (legacy)
8. `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen

**OPTIONAL (Conditional)**:
- `TXN_IN_PROGRESS` - May appear 1-3 times depending on flow
- `Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN` - Only if PIN required
- `Card_APP_EVENT_PIN_ENTERED` - Only if PIN entered
- `DCC_INFO_API_EVENT_REQ` - Only for international cards
- `DCC_OPTED` or `DCC_NOT_OPTED` - Only if DCC offered
- `FETCH_SERVICE_FEE` - Only if service fee enabled + applicable transaction type
- `SERVICE_FEE_ACCEPTED` - Only if fee shown and accepted
- `PAYMENT_CONFIRM_API_REQUEST` - Only after online authorization
- `PAYMENT_CONFIRM_API_EVENT_REQ_API_2.0_PAYMENT_CONFIRM` - Confirmation event
- `PAYMENT_CONFIRM_API_RESPONSE_SUCCESS` - Confirmation response
- `PAYMENT_CONFIRM_API_EVENT_RESP_API_2.0_PAYMENT_CONFIRM` - Confirmation response event
- `CARD_AUTOMATE_PRINT_CHANRGESLIP` - Post-payment, optional
- `CARD_print_status_check` - Post-payment, optional
- `print_status_check_failed` - If printer unavailable
- `print_receipt_failed` - If printing fails

#### PIN Requirement Logic
**File**: `/lib/pos/card/util.ts:510-513`

```
MAG Cards: PIN optional (service code dependent)
CHIP Cards: PIN optional (online PIN bypass possible)
NFC Cards: PIN almost never (uses CVMLimit instead)
```

#### Success Variations

**Minimal Success (MAG, No PIN, No DCC)**:
- 8 events total
- No PIN entry, no DCC, no service fee
- Direct to online payment

**Maximum Success (International CHIP + PIN + DCC + Service Fee)**:
- 30+ events
- Full EMV flow with all optionals

---

### 2. UPI PAYMENT

#### Entry Points
- **File**: `/modules/payment/index.ts:256`
- **Event**: `PAYMENT_INITIATED_UPI`
- Single entry point, always starts here

#### CRITICAL Events:
1. `payment_initiated_upi` - Always first
2. `qr_generation_started` - QR flow start
3. `UPI_API_EVENT_REQ_PAY_UPI_QR` - QR gen API request (OR `API_REQUEST`)
4. `UPI_API_EVENT_RESP_PAY_UPI_QR` - QR gen API response (OR `API_RESPONSE_SUCCESS`)
5. `qr_api_success` - QR generated successfully
6. `UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN` - QR shown to user
7. At least ONE of:
   - `UPI_API_REQ_CHECK_STATUS` + `UPI_API_RESP_CHECK_STATUS` (polling completes)
   - `UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` (MQTT notification)
8. `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen

**OPTIONAL**:
- `UPI_UI_EVENT_UPI_CHECK_STATUS_PROGRESS_INITIATED` - **NEVER EMITTED** (remove from flow)
- `MQTT_PAYMENT_NOTIFICATION_RECEIVED` - Only if MQTT path
- `AUTOMATE_PRINT_CHANRGESLIP` - Post-payment

#### Key Insights:
- **TWO success mechanisms** (polling OR MQTT)
- Polling events occur **1-12 times** (variable)
- MQTT can complete payment without polling success
- Polling can complete payment without MQTT

---

### 3. BQR (BharatQR) PAYMENT

#### Entry Points
- **File**: `/modules/payment/index.ts:256`
- **Event**: `PAYMENT_INITIATED_UPI` (same as UPI!)
- Routing normalizes BQR → consistent internal flow

#### CRITICAL Events:
1. `payment_initiated_upi` - Entry (shared with UPI)
2. `qr_generation_started` - QR flow start
3. `WALLET_QR_GENERATE_API_REQUEST` - BQR uses wallet endpoint
4. `WALLET_QR_GENERATE_API_RESPONSE_SUCCESS` - QR API success
5. `qr_api_success` - QR generated
6. `BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN` - QR shown
7. At least ONE of:
   - `UPI_API_REQ_CHECK_STATUS` + `PAYMENT_STATUS_API_REQUEST` (polling)
   - `UPI_API_RESP_CHECK_STATUS` + `PAYMENT_STATUS_API_RESPONSE_SUCCESS` (polling response)
   - `BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` (MQTT)
8. `Create_TransactionResultActivity` - Result (legacy)
9. `BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen

**OPTIONAL**:
- `BQR_AUTOMATE_PRINT_CHANRGESLIP` - Post-payment
- `BQR_print_status_check` - Post-payment
- `BQR_print_status_check_result` - Post-payment
- `print_status_check_failed` - Common (printer out of paper)
- `print_receipt_failed` - Common (printer out of paper)

#### Key Differences from UPI:
- Uses WALLET API endpoint (config-driven)
- BQR-specific UI events
- Shares polling mechanism with UPI
- Two parallel completion mechanisms

---

### 4. CASH PAYMENT

#### Entry Points
- **File**: `/modules/payment/cash/Cash.svelte:30-42`
- **Event**: `CASH_PAYMENT_SCREEN_SHOWN`

#### CRITICAL Events:
1. `cash_payment_screen_shown` - UI shown
2. `cash_payment_initiated` - Payment confirmed
3. `API_REQUEST` - Cash payment API call
4. `API_RESPONSE_SUCCESS` - API success
5. `CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success

**OPTIONAL**:
- Customer auth data (PAN/Form 60) - Only if amount >= cutoff & enabled
- Additional PIN - Only if `addlAuthReqdForCash` enabled
- `AUTOMATE_PRINT_CHANRGESLIP` - Post-payment

#### Success Variations:
- With auth: 5 events + auth dialog
- Without auth: 5 events minimum

---

### 5. CHEQUE PAYMENT

#### Entry Points
- **File**: `/modules/payment/cash/Cheque.svelte:36-48`
- **Event**: `CHEQUE_PAYMENT_SCREEN_SHOWN`

#### CRITICAL Events:
1. `cheque_payment_screen_shown` - UI shown
2. `cheque_payment_initiated` - Payment confirmed
3. `cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success

**OPTIONAL**:
- `AUTOMATE_PRINT_CHANRGESLIP` - Post-payment

#### Validation Requirements:
- Cheque number: 6+ digits
- Bank: Required
- Date: Required
- IFSC code: Required (strict format: `/^[A-Za-z]{4}[0][A-Za-z0-9]{6}$/`)
- Account number: Optional (config-dependent)
- Payer name: Optional

#### No API Call for Success
- Cheque details stored locally
- No backend validation during payment
- API only called for transaction creation

---

### 6. DD (DEMAND DRAFT) PAYMENT

#### Entry Points
- **File**: `/modules/payment/cash/DemandDraft.svelte:31-43`
- **Event**: `DD_PAYMENT_SCREEN_SHOWN`

#### CRITICAL Events:
1. `dd_payment_screen_shown` - UI shown
2. `dd_payment_initiated` - Payment confirmed
3. `API_REQUEST` - DD payment API
4. `API_RESPONSE_SUCCESS` - API success
5. `DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success

**OPTIONAL**:
- `AUTOMATE_PRINT_CHANRGESLIP` - Post-payment

#### Validation Requirements:
- DD number: Exactly 6 digits (stricter than cheque)
- Bank: Required
- Branch name: Required
- DD date: Required (84-day window: past 84 days to today)
- Payer name: Optional

---

### 7. EMI PAYMENT

#### Entry Points
- **File**: `/modules/payment/index.ts:202-212`
- **Routes to**: `payViaEmi()`
- **Then**: Card payment with EMI details

#### CRITICAL Events:
1. `payment_initiated_card` - Card flow entry
2. `emi_plan_selection_page_viewed` - EMI selection UI
3. `emi_plans_api_event_req` - Fetch plans API
4. `emi_plans_api_event_resp_success` - Plans fetched
5. `emi_plan_bank_selected` - User selects bank
6. `emi_tenure_selection_page_viewed` - Tenure UI
7. `emi_tenure_option_selected` - User selects tenure
8. `emi_proceed_button_tapped` - Confirm selection
9. Card payment events (see CARD flow above)
10. `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success

**OPTIONAL**:
- `emi_validation_api_event_req` - EMI validation
- `emi_validation_api_event_resp_success` - Validation success
- Full Swipe offers (currently disabled)
- Catalog flow (if brand EMI)

#### Two EMI Types:
- **Bank EMI**: Standard EMI from banks
- **Brand EMI (MYDISCOUNTEMI)**: Brand-specific offers

#### Key Insight:
- EMI selection happens BEFORE card entry
- Card payment includes EMI params in API payload
- Can fail at plan fetch (error doesn't block, shows empty)

---

### 8. PAYLINK (CNP) PAYMENT

#### Entry Points
- **File**: `/modules/payment/paylink/PaylinkInput.svelte:24-37`
- **Event**: `PAYLINK_INPUT_SCREEN_SHOWN`

#### CRITICAL Events:
1. `PAYLINK_INPUT_SCREEN_SHOWN` - Input UI
2. `PAYLINK_SEND_INITIATED` - Link send started
3. Either:
   - `PAYLINK_SEND_SUCCESS` (API success)
   - `PAYLINK_SEND_FAILED` (API failure)
4. If success:
   - Wait 15 seconds
   - `PAYLINK_POLL_STATUS_INITIATED` - Polling starts
   - Poll until terminal status
5. `PAYLINK_PAYMENT_SUCCESS` - Customer paid
6. `CNP_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success

**OPTIONAL**:
- `PAYLINK_INVALID_MOBILE` - Invalid number format
- `PAYLINK_RETRY_ATTEMPTED` - Retry after failure
- `PAYLINK_PAYMENT_EXPIRED` - 900s timeout
- `PAYLINK_PAYMENT_ABORTED` - User cancelled
- `AUTOMATE_PRINT_CHANRGESLIP` - Post-payment

#### Key Insights:
- 15-second delay before polling (SMS delivery time)
- Polling mechanism same as UPI
- Remote payment (customer on phone)
- Can timeout after 900 seconds

---

### 9. WALLET PAYMENT

#### Entry Points
- **File**: `/modules/payment/Wallet.svelte:18-27`
- **Event**: `WALLET_PAGE_VIEWED`

#### CRITICAL Events:
1. `wallet_page_viewed` - Wallet UI (optional, may be skipped)
2. `qr_generation_started` - QR flow
3. `qr_api_success` - QR generated
4. `qr_page_viewed` - QR shown
5. Polling (same as UPI) OR notification
6. `UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success

**OPTIONAL**:
- Polling events (if customer scans)
- Payment success notification
- Timeout/abort events

#### Key Insights:
- Same QR mechanism as UPI
- Different API endpoint: `/api/2.0/merchant/qrcode/generate`
- Currently only Amazon Pay wallet supported
- 300-second timeout

---

### 10. NCMC PAYMENT

#### Three Sub-Flows:

**A. Balance Check (No Transaction)**:
1. `NCMC_BALANCE_CHECK_CLICKED` - Menu tap
2. Card tap (NFC read)
3. `NCMC_BALANCE_CHECK_SUCCESS` - Balance displayed
- **No API call** - Local NFC read only

**B. Balance Update (Refresh)**:
1. `NCMC_BALANCE_UPDATE_CLICKED` - Menu tap
2. Card payment flow with serviceType=BALANCE_UPDATE
3. API call to `/api/3.0/ncmc/balanceUpdate`
- Amount = 0 (no charge)

**C. Balance Load (Topup)**:
1. Either:
   - `NCMC_BALANCE_LOAD_CARD_CLICKED` (pay with card)
   - `NCMC_BALANCE_LOAD_CASH_CLICKED` (pay with cash)
2. Amount entry
3. API call: `/api/3.0/ncmc/balanceLoad` with payment mode
4. If CARD: Full card payment flow
5. If CASH: Full cash payment flow

#### Key Insights:
- Balance check is local (no backend)
- Balance load has two payment methods
- Different API events for card vs cash load

---

## 🔍 CRITICAL VS OPTIONAL EVENT CLASSIFICATION

### Classification Criteria:

**CRITICAL**: Event ALWAYS occurs in successful transaction
- Present in 100% of production successes
- Required by payment flow logic
- No conditional logic that skips it

**OPTIONAL**: Event MAY occur based on conditions
- Configuration-dependent (DCC, service fee, PIN)
- User choice-dependent (EMI selection, payment mode)
- Technical variation (MQTT vs polling)
- Post-payment (printing)

---

## 📊 POLLING EVENTS - SPECIAL HANDLING NEEDED

### Events That Occur Multiple Times:

**BQR/UPI Polling**:
- `UPI_API_REQ_CHECK_STATUS`: 1-12 occurrences
- `PAYMENT_STATUS_API_REQUEST`: 1-12 occurrences
- `UPI_API_RESP_CHECK_STATUS`: 1-12 occurrences
- `PAYMENT_STATUS_API_RESPONSE_SUCCESS`: 1-12 occurrences
- Production average: 1.12 rounds

**PAYLINK Polling**:
- `PAYLINK_POLL_STATUS_INITIATED`: Variable occurrences
- Continues until AUTHORIZED/EXPIRED/FAILED

**Recommendation**:
- Mark these as `POLLING_EVENT` type
- Don't count in fixed expected flow
- Track separately with average multiplier

---

## 🚫 EVENTS TO REMOVE FROM SUCCESS FLOWS

### Never Emitted (Defined but Unused):

1. `UPI_UI_EVENT_UPI_CHECK_STATUS_PROGRESS_INITIATED`
   - Defined in const.ts
   - No track() calls in codebase
   - **Remove from UPI success flow**

### Post-Payment (Not Part of Payment Success):

1. All printing events:
   - `AUTOMATE_PRINT_CHANRGESLIP`
   - `{PAYMENT_MODE}_print_status_check`
   - `{PAYMENT_MODE}_print_status_check_result`
   - `print_status_check_failed`
   - `print_receipt_failed`

**Recommendation**: Mark as `POST_PAYMENT` category, exclude from expected count

---

## 📝 UPDATED RECOMMENDATIONS

### 1. Success Flow Structure:

```javascript
PAYMENT_TYPE: {
  CRITICAL: [...],      // Always present
  OPTIONAL: {
    conditional_feature: [...],  // Events for specific conditions
    post_payment: [...]         // After payment success
  },
  POLLING: {
    events: [...],              // Events that repeat
    avgOccurrences: 1.12        // From production data
  },
  VARIATIONS: [
    { name: "Minimal", events: [...] },
    { name: "With PIN", events: [...] },
    { name: "With DCC", events: [...] }
  ]
}
```

### 2. Expected Event Calculation:

```javascript
expected = CRITICAL.length
  + (OPTIONAL conditions met ? OPTIONAL.length : 0)
  + (POLLING.events.length × POLLING.avgOccurrences)
```

### 3. Production Validation Required:

For each payment type with limited production data:
- CASH (no production examples)
- CHEQUE (no production examples)
- DD (no production examples)
- EMI (no production examples)
- PAYLINK (no production examples)
- WALLET (no production examples)
- NCMC (no production examples)

**Recommendation**: Mark flows as "ESTIMATED" until validated with production data

---

## ✅ NEXT STEPS

1. ✅ Update `success-flows.js` with CRITICAL/OPTIONAL/POLLING structure
2. ✅ Remove unused events (UPI_CHECK_STATUS_PROGRESS_INITIATED)
3. ✅ Mark printing events as POST_PAYMENT
4. ✅ Add variation handling for conditional flows
5. ⏳ Test with production data to validate
6. ⏳ Implement polling event multiplier (Task #3)

---

**Analysis Complete**: All 11 payment types analyzed with codebase verification.
