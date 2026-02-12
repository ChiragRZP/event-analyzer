# Payment Flow Events - Finalized Reference

**Sources Analyzed:**
1. POS Codebase (`/Users/peddakondannagari.r/newpos/pos/`)
2. Actual CSV Event Logs (card_payment_test_2.csv, test_3, test_4)
3. Event Analyzer Payment Type Detector
4. Events Master Sheet (reference)

**Last Updated:** 2026-02-05

---

## Table of Contents
- [UPI Payment Flow](#upi-payment-flow)
- [BharatQR (BQR) Payment Flow](#bharatqr-bqr-payment-flow)
- [CARD Payment Flow](#card-payment-flow)
- [EMI Payment Flow](#emi-payment-flow)
- [CASH Payment Flow](#cash-payment-flow)
- [CHEQUE Payment Flow](#cheque-payment-flow)
- [DEMAND DRAFT Payment Flow](#demand-draft-dd-payment-flow)
- [Common Patterns & Universal Events](#common-patterns--universal-events)
- [P2P (Peer-to-Peer) Flow](#p2p-peer-to-peer-flow)

---

## UPI Payment Flow

### Start Events (First event in sequence)

**Primary Start Events:**
- `payment_initiated_upi` - When UPI is selected from payment method screen
- `qr_generation_started` - QR code generation begins
- `UPI_PAY_START` (`Create_PayViaUPIActivity`) - Activity creation

**P2P Flow Starts:**
- `MQTT_MESSAGE_RECEIVED_TO_WEB` - P2P payment request received
- `MQTT_P2P_MESSAGE_RECEIVED` - P2P message received
- `MQTT_P2P_HANDLE_PAYMENT_REQUEST` - Handling P2P payment request
- `MQTT_P2P_ACKNOWLEDGEMENT_SENT` - P2P request acknowledged

**Preceding Events (often seen before payment):**
- `ON_HOME_PRESSED` - User navigation
- `button_menu_collect_payment` - Collect payment button clicked
- `amount_screen_shown` - Amount entry screen

### Core Flow Events

**QR Generation:**
- `UPI_QR_GENERATE_API_REQUEST` - Requesting QR from backend
- `UPI_QR_GENERATE_API_RESPONSE_SUCCESS` - QR generated successfully
- `UPI_QR_GENERATE_API_RESPONSE_FAILURE` - QR generation failed
- `qr_api_success` - QR API success (contains `txnId` property)
- `qr_api_failure` - QR API failure
- `UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN` - QR displayed to user

**Status Polling:**
- `UPI_UI_EVENT_UPI_CHECK_STATUS_PROGRESS_INITIATED` - Status check started
- `UPI_API_EVENT_REQ_CHECK_STATUS` - Status check request (contains `PAYMENT_TYPE: UPI`)
- `PAYMENT_STATUS_API_REQUEST` - Generic status API request
- `PAYMENT_STATUS_API_RESPONSE_SUCCESS` - Status check response
- `PAYMENT_STATUS_API_RESPONSE_FAILED` - Status check failed
- `UPI_API_EVENT_RESP_CHECK_STATUS` - Status check response (contains `PAYMENT_TYPE: UPI`)

**Payment Authorization:**
- `UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` - Payment authorized via MQTT notification

**User Actions:**
- `PAYMENT_CANCELLED` - User cancelled payment (back button)
- `PAYMENT_TIMEOUT` - QR expired (300 seconds timeout)
- `UPI_API_EVENT_REQ_STOP_PAYMENT` - Stop payment request
- `UPI_API_EVENT_RESP_STOP_PAYMENT` - Stop payment response
- `PAYMENT_MODE_SWITCH` - User switched to different payment mode

### End Events (Terminal states)

**Success Path:**
- `Create_TransactionResultActivity` - Transaction result activity created
- `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen displayed
- `upi_payment_success` - UPI payment success marker
- `UPI_APP_EVENT_TRANSACTION_RESULT` - Transaction result event
- `UPI_AUTOMATE_PRINT_CHANRGESLIP` - Auto-print charge slip
- `UPI_print_status_check` - Print status check
- `UPI_print_status_check_result` - Print result
- `fetch_charge_slip_api_request` - Fetching charge slip
- `CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_REQUEST` - Receipt image fetch
- `CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_RESPONSE_SUCCESS` - Receipt fetched
- `fetch_charge_slip_api_response` - Charge slip fetched
- `UPI_THERMAL_PRINT_START` - Thermal print started
- `UPI_print_status_result` - Final print status

**Failure Path:**
- `UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen displayed
- `UPI_ACTION_ENDS` (`UPI_APP_EVENT_ACTION_ENDS`) - UPI flow ended

**Post-Transaction Navigation:**
- `ON_HOME_PRESSED` - User returned to home
- `checkbox_mounted` / `checkbox_unmounted` - UI state events
- `MQTT_P2P_ACKNOWLEDGEMENT_SENT` - P2P acknowledgement sent (for P2P flows)
- `EMIT_MQTT_P2P_CANCELLATION` - P2P cancellation emitted

### Code References
- **QR Flow**: `/web/src/modules/payment/qr/index.svelte`
- **Event Constants**: `/web/src/lib/track/const.ts`
- **Payment Orchestration**: `/web/src/modules/payment/index.ts` (line 256)
- **Completion Screen**: `/web/src/pages/pay/complete.svelte` (line 223)

---

## BharatQR (BQR) Payment Flow

### Start Events

**Same as UPI, with BQR prefix:**
- `payment_initiated_upi` - Initially tracked as UPI (normalized to BQR in code)
- `qr_generation_started`
- `BQR_PAY_START` (`Create_PayViaBQRActivity`)

**BQR-Specific:**
- `BQR_API_EVENT_REQ_PAY_BQR_QR` - BQR QR generation request
- `BQR_API_EVENT_RESP_PAY_BQR_QR` - BQR QR generation response

### Core Flow Events

**QR Generation (BQR-prefixed):**
- `BQR_API_EVENT_REQ_PAY_BQR_QR`
- `BQR_API_EVENT_RESP_PAY_BQR_QR`
- `BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN` - BQR QR displayed

**Status Polling:**
- `BQR_UI_EVENT_BQR_CHECK_STATUS_PROGRESS_INITIATED`
- `BQR_API_EVENT_REQ_CHECK_STATUS`
- `BQR_API_EVENT_RESP_CHECK_STATUS`

**Authorization:**
- `BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION`

**User Actions:**
- `PAYMENT_CANCELLED`
- `PAYMENT_TIMEOUT`
- `BQR_API_EVENT_REQ_STOP_PAYMENT`
- `BQR_API_EVENT_RESP_STOP_PAYMENT`

### End Events

**Success Path:**
- `Create_TransactionResultActivity`
- `BQR_TRANSACTION_SUCCESS_SCREEN_SHOWN` (or `BHARATQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN`)
- `bqr_payment_success`
- `BQR_APP_EVENT_TRANSACTION_RESULT`
- `BQR_AUTOMATE_PRINT_CHANRGESLIP`
- `BQR_print_status_check`
- `BQR_print_status_check_result`

**Failure Path:**
- `BQR_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` (or `BHARATQR_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN`)
- `BQR_ACTION_ENDS` (`BQR_APP_EVENT_ACTION_ENDS`)

### Important Notes
- **Backend Mapping**: Successful BQR payments are stored as `payment_mode = 'UPI'` in database
- **Event Differentiation**: Events start with `BQR_` prefix to distinguish from UPI
- BQR uses same QR flow component as UPI (qr/index.svelte), differentiated by `paymentMethod` parameter

### Code References
- **QR Flow**: `/web/src/modules/payment/qr/index.svelte` (line 36: PaymentFlow determination)
- **Event Constants**: `/web/src/lib/track/const.ts`

---

## CARD Payment Flow

### Start Events

**Primary Start Events:**
- `payment_initiated_card` - When CARD is selected
- `CARD_PAYMENT_SELECTED` - Card payment method selected
- `CARD_PAY_START` (`Create_PayViaCardActivity`)

**P2P Flow Starts (observed in CSV):**
- `MQTT_MESSAGE_RECEIVED_TO_WEB`
- `MQTT_P2P_MESSAGE_RECEIVED`
- `MQTT_P2P_HANDLE_PAYMENT_REQUEST`
- `MQTT_P2P_ACKNOWLEDGEMENT_SENT`

### Core Flow Events

**Card Reading:**
- `Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN` - Waiting for card
- `PREPARING_FOR_TXN` - Preparing transaction
- `TXN_IN_PROGRESS` - Transaction processing (appears multiple times)

**PIN Entry:**
- `Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN` - PIN entry screen shown
- `Card_APP_EVENT_PIN_ENTERED` - PIN entered by user

**DCC (Dynamic Currency Conversion):**
- `DCC_INFO_API_EVENT_REQ` - DCC information request
- `DCC_INFO_API_EVENT_RESP_SUCCESS` / `DCC_INFO_API_EVENT_RESP_FAILURE`

**Payment Processing:**
- `CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD` - Payment request
- `CARD_PAYMENT_API_REQUEST` - Generic payment API request
- `CARD_PAYMENT_API_RESPONSE_SUCCESS` - Payment successful
- `CARD_PAYMENT_API_RESPONSE_FAILED` - Payment failed
- `CARD_PAYMENT_API_EVENT_RESP_API_3.0_PAYMENT_CARD` - Payment response

**Payment Confirmation:**
- `CARD_PAYMENT_API_EVENT_REQ_API_2.0_PAYMENT_CONFIRM` - Confirm request
- `PAYMENT_CONFIRM_API_REQUEST`
- `PAYMENT_CONFIRM_API_RESPONSE_SUCCESS`
- `CARD_PAYMENT_API_EVENT_RESP_API_2.0_PAYMENT_CONFIRM` - Confirm response

**User Actions:**
- `PAYMENT_CANCELLED` - User cancelled (PIN abort, card removal)
- `PAYMENT_TIMEOUT` - PIN entry timeout

### End Events

**Success Path:**
- `Create_TransactionResultActivity`
- `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` (or `CARD_TRANSACTION_SUCCESS_SCREEN_SHOWN`)
- `card_payment_success`
- `CARD_AUTOMATE_PRINT_CHANRGESLIP`
- `CARD_print_status_check`
- `CARD_print_status_check_result`
- `fetch_charge_slip_api_request`
- `CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_REQUEST`
- `CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_RESPONSE_SUCCESS`
- `CARD_THERMAL_PRINT_START`
- `CARD_print_status_result`

**Failure Path:**
- `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` (or `CARD_TRANSACTION_FAILURE_SCREEN_SHOWN`)
- `card_payment_failure`

**Post-Transaction:**
- `ON_HOME_PRESSED`
- `MQTT_P2P_ACKNOWLEDGEMENT_SENT` (P2P flows)
- `EMIT_MQTT_P2P_CANCELLATION` (P2P cancellation)

### Code References
- **Card Flow**: `/web/src/modules/payment/card/card-flow.svelte.ts`
- **Event Constants**: `/web/src/lib/track/const.ts`
- **Payment Orchestration**: `/web/src/modules/payment/index.ts` (line 262)
- **Completion Screen**: `/web/src/pages/pay/complete.svelte` (line 223)

---

## EMI Payment Flow

### Start Events

**EMI-Specific:**
- `EMI_CHECK_INITIATED` (`emi_check_initiated`) - EMI eligibility check started
- `EMI_OVERLAY_SHOWN` - EMI selection overlay displayed

**Inherits CARD start events:**
- `payment_initiated_card` (with EMI context)
- Card reading events (TAP_SWIPE_DIP, etc.)

### Core Flow Events

**EMI Plan Selection:**
- `EMI_PLANS_API_EVENT_REQ` - Request EMI plans
- `EMI_PLANS_API_EVENT_RESP_SUCCESS` - Plans retrieved
- `EMI_PLANS_API_EVENT_RESP_FAILURE` - Plans fetch failed
- `EMI_OPTION_SELECTED` (`emi_option_selected`) - User selected EMI plan
- `EMI_OPTION_NOT_SELECTED` (`emi_option_not_selected`) - User declined EMI

**Full Swipe Offers:**
- `EMI_FULL_SWIPE_OFFER_SHOWN` (`emi_full_swipe_offer_shown`) - Full swipe offer displayed
- `EMI_FULL_SWIPE_OFFER_ACCEPTED` (`emi_full_swipe_offer_accepted`) - User accepted
- `EMI_FULL_SWIPE_OFFER_DECLINED` (`emi_full_swipe_offer_declined`) - User declined

**EMI Validation:**
- `EMI_VALIDATION_API_EVENT_REQ` - Validate EMI transaction
- `EMI_VALIDATION_API_EVENT_RESP_SUCCESS` - Validation success
- `EMI_VALIDATION_API_EVENT_RESP_FAILURE` - Validation failed

### End Events

**Inherits CARD end events with EMI flag:**
- `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` (with `is_emi: true` property)
- `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` (with `is_emi: true` property)
- Standard card completion events

### Code References
- **EMI Flow**: `/web/src/modules/payment/emi/emi-flow.ts`
- **EMI Events**: `/web/src/lib/track/emi.ts`
- **Full Swipe**: `/web/src/modules/payment/card/FullSwipe.svelte`

---

## CASH Payment Flow

### Start Events
- `cash_payment_screen_shown` - Cash payment screen displayed
- `CASH_PAYMENT_INITIATED` (`cash_payment_initiated`) - Cash payment initiated

### Core Flow Events
- `cash_network_error` - Network error during cash payment

### End Events

**Success:**
- `CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` (or `CASH_TRANSACTION_SUCCESS_SCREEN_SHOWN`)

**Failure:**
- `CASH_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` (or `CASH_TRANSACTION_FAILURE_SCREEN_SHOWN`)

### Code References
- **Cash Flow**: `/web/src/modules/payment/cash/Cash.svelte`
- **Completion Screen**: `/web/src/pages/pay/complete.svelte` (line 223)

---

## CHEQUE Payment Flow

### Start Events
- `cheque_payment_screen_shown` - Cheque payment screen displayed
- `CHEQUE_PAYMENT_INITIATED` (`cheque_payment_initiated`) - Cheque payment initiated

### End Events

**Success:**
- `cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` (or `CHEQUE_TRANSACTION_SUCCESS_SCREEN_SHOWN`)

**Failure:**
- `cheque_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` (or `CHEQUE_TRANSACTION_FAILURE_SCREEN_SHOWN`)

### Code References
- **Cheque Flow**: `/web/src/modules/payment/cash/Cheque.svelte`

---

## DEMAND DRAFT (DD) Payment Flow

### Start Events
- `dd_payment_screen_shown` - DD payment screen displayed
- `DD_PAYMENT_INITIATED` (`dd_payment_initiated`) - DD payment initiated

### End Events

**Success:**
- `DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` (or `DD_TRANSACTION_SUCCESS_SCREEN_SHOWN`)

**Failure:**
- `DD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` (or `DD_TRANSACTION_FAILURE_SCREEN_SHOWN`)

### Code References
- **DD Flow**: `/web/src/modules/payment/cash/DemandDraft.svelte`

---

## Common Patterns & Universal Events

### Universal Start Pattern

**Payment Initiation (from payment method selection):**
```
button_menu_collect_payment
→ amount_screen_shown
→ payment_method_selection_screen_shown
→ payment_initiated_<type>  // type = upi, card, cash, etc.
→ <Type>_PAY_START
```

**Code Location**: `/web/src/modules/payment/index.ts` (lines 256, 262)

### Universal End Pattern

**Success Screen Format:**
```
Create_TransactionResultActivity
→ {PAYMENT_MODE}_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN
→ {PAYMENT_MODE}_AUTOMATE_PRINT_CHANRGESLIP
→ {PAYMENT_MODE}_print_status_check
→ fetch_charge_slip_api_request
→ CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_RESPONSE_SUCCESS
→ {PAYMENT_MODE}_THERMAL_PRINT_START
→ {PAYMENT_MODE}_print_status_result
```

**Failure Screen Format:**
```
Create_TransactionResultActivity
→ {PAYMENT_MODE}_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN
```

**Code Location**: `/web/src/pages/pay/complete.svelte` (lines 223, 237)

### Universal User Actions

**Available across ALL payment types:**
- `PAYMENT_CANCELLED` - User cancellation (back button, abort)
- `PAYMENT_TIMEOUT` - Payment timeout
- `PAYMENT_MODE_SWITCH` - User switched payment method
  - Properties: `{from: 'UPI', to: 'CARD'}` or similar
  - Triggers new `sequence_id` generation
  - **Code**: `/web/src/modules/payment/index.ts` (line 112)

### Vajra Metrics (Universal)

**Tracked for ALL payment types:**
- `PAYMENT_START` - Payment flow initialized
- `PAYMENT_SUCCESS` - Payment succeeded
- `PAYMENT_FAILURE` - Payment failed
- `PAYMENT_CANCELLED` - Payment cancelled
- `PAYMENT_TIMEOUT` - Payment timed out

**PaymentFlow enum values:**
- `'Payment_UPI'`
- `'Payment_BQR'`
- `'Payment_CARD'`
- `'Payment_CASH'`
- `'Payment_CHEQUE'`
- `'Payment_DD'`
- `'Payment_EMI'`
- `'Payment_WALLET'`

**Code Location**: `/web/src/lib/eze/payment-actions.ts` (lines 86-103)

---

## P2P (Peer-to-Peer) Flow

### Overview
P2P flow enables payment requests to be sent from one device to another via MQTT messaging.

### P2P Event Markers

**P2P Initiation (appears at start of sequence):**
- `MQTT_MESSAGE_RECEIVED_TO_WEB` - MQTT message received
- `MQTT_P2P_MESSAGE_RECEIVED` - P2P message received
- `MQTT_P2P_HANDLE_PAYMENT_REQUEST` - Handling payment request
- `MQTT_P2P_ACKNOWLEDGEMENT_SENT` - Request acknowledged

**P2P Completion:**
- `MQTT_P2P_ACKNOWLEDGEMENT_SENT` - Final acknowledgement
- `EMIT_MQTT_P2P_CANCELLATION` - P2P cancellation emitted

### P2P Flow Pattern

```
Device A (Initiator)              Device B (Receiver - your device)
    │                                      │
    │──────── Send Payment Request ───────>│
    │                                      │ MQTT_MESSAGE_RECEIVED_TO_WEB
    │                                      │ MQTT_P2P_MESSAGE_RECEIVED
    │                                      │ MQTT_P2P_HANDLE_PAYMENT_REQUEST
    │                                      │ MQTT_P2P_ACKNOWLEDGEMENT_SENT
    │                                      │
    │                                      │ <Normal Payment Flow>
    │                                      │ (UPI, CARD, etc.)
    │                                      │
    │<──── Payment Result/Cancellation ────│
                                           │ MQTT_P2P_ACKNOWLEDGEMENT_SENT
```

### Key Characteristics

1. **Event Logging**: Events are logged on the RECEIVING device (Device B)
2. **Backend Transaction**: Created with Device B's serial number
3. **Sequence ID**: Generated on Device B
4. **Backend txnId**: Shared across both devices for same transaction

### P2P Detection in Events

**Indicators of P2P flow:**
- Sequence starts with `MQTT_*` or `P2P_*` events
- No `button_menu_collect_payment` or `amount_screen_shown` at start
- Has `MQTT_P2P_HANDLE_PAYMENT_REQUEST` early in sequence

**Code References:**
- Event constants in `/web/src/lib/track/const.ts`
- Search for `P2P` and `MQTT` events

---

## Backend Transaction ID (`txnId`)

### When txnId Appears in Events

**Properties field `txnId` is populated in these events:**
- `qr_api_success` - After successful QR generation (UPI/BQR)
- `CARD_PAYMENT_API_RESPONSE_SUCCESS` - After successful card payment
- `fetch_charge_slip_api_request` - When fetching receipt
- `fetch_charge_slip_api_response` - Receipt fetched
- `UPI_AUTOMATE_PRINT_CHANRGESLIP` / `CARD_AUTOMATE_PRINT_CHANRGESLIP` - Auto-print events

**Format**: 25 characters, starts with date (e.g., `260204041941313E859618250`)
**Corresponds to**: `txn_request_id` in `ezetap_new.txn` table in Metabase

---

## Event Analyzer Detection Logic

### Payment Type Inference Priority

**File**: `/web/src/.claude/skills/event-analyzer/utils/payment-type-detector.js`

**Priority Order (highest to lowest):**
1. **BQR** - Checked first (since BQR uses UPI events, must prioritize)
2. **CARD** - Card-specific events
3. **UPI** - UPI/QR events
4. **CASH** - Cash payment events
5. **CHEQUE** - Cheque events
6. **DD** - Demand Draft events
7. **EMI** - EMI-specific events
8. **PAYLINK** - Payment link events
9. **WALLET** - Wallet events
10. **NCMC** - NCMC card events

### Indicator Events Used by Analyzer

See the payment-type-detector.js file for full list. Key indicators:

**BQR Indicators:**
- `BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN`
- `BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION`
- `BQR_API_EVENT_*`

**UPI Indicators:**
- `UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN`
- `UPI_API_EVENT_REQ_PAY_UPI_QR`
- `UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION`
- `UPI_QR_GENERATE_API_REQUEST`
- `payment_initiated_upi`

**CARD Indicators:**
- `payment_initiated_card`
- `Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN`
- `CARD_PAYMENT_SELECTED`
- `Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN`
- `Card_APP_EVENT_PIN_ENTERED`

---

## Critical Events for Drop Analysis

### Must-Have Events for Complete Flow

**UPI/BQR Success:**
1. `qr_api_success` - QR generated (contains txnId)
2. `UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN` - QR displayed
3. `UPI_API_EVENT_RESP_CHECK_STATUS` - At least one status check
4. `UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` - Payment authorized
5. `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen

**CARD Success:**
1. `Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN` - Card read
2. `Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN` - PIN requested
3. `Card_APP_EVENT_PIN_ENTERED` - PIN entered
4. `CARD_PAYMENT_API_RESPONSE_SUCCESS` - Payment success
5. `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen

### Legitimate Event Drops (Missing Critical Events)

**UPI/BQR Drops:**
- Missing `qr_api_success` after `qr_generation_started` → QR Generation Drop
- Missing `UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN` → QR Display Drop
- Missing `UPI_API_EVENT_RESP_CHECK_STATUS` → Status Polling Drop
- Missing `UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` → Authorization Drop

**CARD Drops:**
- Missing PIN entry events → PIN Entry Drop
- Missing payment response → Payment API Drop

### NOT Event Drops (Exclude from Analysis)

**User Actions:**
- Has `PAYMENT_CANCELLED` → User cancellation
- Has `PAYMENT_MODE_SWITCH` → Mode switch
- Has `PAYMENT_TIMEOUT` → Timeout (expected for QR expiry)
- Has stop payment events (`UPI_API_EVENT_REQ_STOP_PAYMENT`) → User abort

**Success Cases:**
- Has success screen event → Not a drop, successful payment

---

## Summary Tables

### Start Event Quick Reference

| Payment Type | Primary Start Event | Alternative/Observed Starts |
|--------------|--------------------|-----------------------------|
| UPI | `payment_initiated_upi` | `qr_generation_started`, `MQTT_P2P_HANDLE_PAYMENT_REQUEST` |
| BQR | `payment_initiated_upi` | `qr_generation_started`, `BQR_PAY_START` |
| CARD | `payment_initiated_card` | `CARD_PAYMENT_SELECTED`, `MQTT_P2P_HANDLE_PAYMENT_REQUEST` |
| EMI | `EMI_CHECK_INITIATED` | Inherits CARD + `EMI_OVERLAY_SHOWN` |
| CASH | `cash_payment_screen_shown` | `CASH_PAYMENT_INITIATED` |
| CHEQUE | `cheque_payment_screen_shown` | `CHEQUE_PAYMENT_INITIATED` |
| DD | `dd_payment_screen_shown` | `DD_PAYMENT_INITIATED` |

### End Event Quick Reference

| Payment Type | Success End | Failure End | Common Final Events |
|--------------|-------------|-------------|---------------------|
| UPI | `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` | `UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` | `UPI_print_status_result`, `ON_HOME_PRESSED` |
| BQR | `BQR_TRANSACTION_SUCCESS_SCREEN_SHOWN` | `BQR_TRANSACTION_FAILURE_SCREEN_SHOWN` | `BQR_print_status_result`, `ON_HOME_PRESSED` |
| CARD | `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` | `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` | `CARD_print_status_result`, `ON_HOME_PRESSED` |
| EMI | Same as CARD (with `is_emi: true`) | Same as CARD (with `is_emi: true`) | Same as CARD |
| CASH | `CASH_TRANSACTION_SUCCESS_SCREEN_SHOWN` | `CASH_TRANSACTION_FAILURE_SCREEN_SHOWN` | - |
| CHEQUE | `CHEQUE_TRANSACTION_SUCCESS_SCREEN_SHOWN` | `CHEQUE_TRANSACTION_FAILURE_SCREEN_SHOWN` | - |
| DD | `DD_TRANSACTION_SUCCESS_SCREEN_SHOWN` | `DD_TRANSACTION_FAILURE_SCREEN_SHOWN` | - |

---

**Document Status**: Finalized based on codebase analysis and actual event logs
**Maintained By**: Event Analyzer Team
**Version**: 1.0
