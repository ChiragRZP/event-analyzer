# Payment Flow Analysis Documentation

This document explains how the Event Drop Analyzer determines success, failure, and legitimate drops for each payment type.

## Table of Contents

1. [Overview](#overview)
2. [Classification Priority](#classification-priority)
3. [Payment Flows](#payment-flows)
   - [UPI (Dynamic QR)](#upi-dynamic-qr)
   - [BQR (BharatQR)](#bqr-bharatqr)
   - [CARD](#card)
   - [CASH](#cash)
   - [CHEQUE](#cheque)
   - [DD (Demand Draft)](#dd-demand-draft)
   - [PAYLINK/CNP](#paylinkcnp-card-not-present)
   - [EMI](#emi)
   - [NCMC](#ncmc-national-common-mobility-card)
   - [WALLET](#wallet)
4. [Common Patterns](#common-patterns)

---

## Overview

The Event Drop Analyzer examines event sequences for each transaction and classifies them into:

- **SUCCESS**: Payment completed successfully
- **FAILURE**: Payment failed but showed proper failure screen
- **USER_CANCELLATION**: User intentionally cancelled the payment
- **MODE_SWITCH**: User switched to a different payment method
- **REPRINT_SESSION**: Post-payment receipt reprint (not a new transaction)
- **LEGITIMATE_DROP**: Payment flow incomplete due to system/technical issues

---

## Classification Priority

The analyzer checks conditions in this order (higher priority first):

1. **REPRINT_SESSION** - Detect post-payment receipt reprints
2. **USER_CANCELLATION** - Check if user cancelled the payment
3. **MODE_SWITCH** - Check if user switched payment methods
4. **SUCCESS** - Check for successful payment indicators
5. **FAILURE** - Check for failure screen indicators
6. **LEGITIMATE_DROPS** - Payment-type-specific drop detection
7. **UNKNOWN_DROP** - Missing critical events with no clear reason
8. **NO_ISSUE** - All required events present, no problems detected

---

## Payment Flows

### UPI (Dynamic QR)

#### Required Events
- `payment_initiated_upi` - Payment initiation
- `qr_api_success` - QR generation must succeed

#### Success Indicators
- `UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` - Payment authorized
- `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown
- `UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Generic success screen

#### Failure Indicators
- `PAYMENT_CANCELLED` - User cancelled
- `PAYMENT_TIMEOUT` - QR expired (300 seconds)
- `qr_api_failure` - QR generation failed
- `UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen shown
- `UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Generic failure screen
- `UPI_API_EVENT_REQ_STOP_PAYMENT` - Stop payment requested

#### Drop Detection Logic

1. **QR Generation Drop** (Severity: HIGH)
   - Condition: `qr_generation_started` present but `qr_api_success` missing OR `qr_api_failure` present
   - Reason: QR generation API call failed or never completed
   - Impact: Customer cannot proceed with payment

2. **QR Display Drop** (Severity: HIGH)
   - Condition: `qr_api_success` present but `UPI_QR_SHOWN` missing
   - Reason: QR generated successfully but never displayed to user
   - Impact: Customer cannot scan QR even though it was generated

3. **Status Polling Drop** (Severity: HIGH)
   - Condition: `UPI_QR_SHOWN` present but `UPI_API_RESP_CHECK_STATUS` missing or returns FAILED
   - Reason: Status polling never started or returned failure
   - Impact: System cannot detect if customer completed payment

4. **Authorization Drop** (Severity: CRITICAL)
   - Condition: `UPI_QR_SHOWN` present, status polling started, but `UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` missing
   - Reason: Payment may have succeeded but authorization notification was lost
   - Impact: **CRITICAL** - Payment might be successful but not acknowledged
   - Note: This is the most serious drop type as money may have been deducted

5. **Timeout** (Severity: MEDIUM)
   - Condition: `PAYMENT_TIMEOUT` present
   - Reason: QR expired after 300 seconds
   - Impact: Customer took too long to complete payment

---

### BQR (BharatQR)

#### Required Events
- `payment_initiated_upi` - Payment initiation (BQR uses UPI events)
- QR generation success - Either `qr_api_success` OR `WALLET_QR_GENERATE_API_RESPONSE_SUCCESS`

#### Success Indicators
- `BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - BQR success screen
- `UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - UPI success screen
- `UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Generic success screen
- `BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION` - Payment authorized
- `PAYMENT_STATUS_API_RESPONSE_SUCCESS` - Payment status success

#### Failure Indicators
- `PAYMENT_CANCELLED` - User cancelled
- `PAYMENT_TIMEOUT` - QR expired
- `qr_api_failure` - QR generation failed
- `WALLET_QR_GENERATE_API_RESPONSE_FAILED` - BQR-specific QR generation failed
- `BHARATQR_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen
- `UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Generic failure screen
- `UPI_API_EVENT_REQ_STOP_PAYMENT` - UPI stop payment
- `BQR_API_EVENT_REQ_STOP_PAYMENT` - BQR stop payment

#### Drop Detection Logic

1. **QR Generation Drop** (Severity: HIGH)
   - Condition: `payment_initiated_upi` present but `WALLET_QR_GENERATE_API_RESPONSE_SUCCESS` missing OR `WALLET_QR_GENERATE_API_RESPONSE_FAILED` present
   - Reason: BQR QR generation API failed or never completed
   - Impact: Customer cannot proceed with BQR payment

2. **QR Display Drop** (Severity: HIGH)
   - Condition: `WALLET_QR_GENERATE_API_RESPONSE_SUCCESS` present but `BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN` missing
   - Reason: BQR QR generated but never displayed
   - Impact: Customer cannot scan BQR code

3. **Status Polling Drop** (Severity: HIGH)
   - Condition: `BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN` present but `UPI_API_EVENT_RESP_CHECK_STATUS` missing or returns FAILED
   - Reason: Status polling failed for BQR transaction
   - Impact: Cannot detect payment completion

4. **Timeout** (Severity: MEDIUM)
   - Condition: `PAYMENT_TIMEOUT` present
   - Reason: BQR QR expired
   - Impact: Customer took too long to scan and complete

---

### CARD

#### Required Events
- `payment_initiated_card` - Card payment initiated
- `Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN` - Card detection screen shown

**Note**: `Card_APP_EVENT_PIN_ENTERED` is NOT required because:
- Contactless payments may not require PIN
- PIN might be entered on terminal (no event logged in app)
- Some cards/amounts don't require PIN entry

#### Success Indicators
- `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown
- `CARD_PAYMENT_API_EVENT_RESP_SUCCESS` - API responded with success
- `CARD_PAYMENT_API_RESPONSE_SUCCESS` - Payment API success
- `PAYMENT_CONFIRM_API_RESPONSE_SUCCESS` - Payment confirmation success

#### Failure Indicators
- `PAYMENT_CANCELLED` - User cancelled
- `CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen shown
- `CARD_PAYMENT_API_EVENT_RESP_FAILURE` - API responded with failure
- `CARD_PAYMENT_API_RESPONSE_FAILED` - Payment API failed
- `EMV_FAILURE` - EMV chip processing failed

#### Drop Detection Logic

1. **Card PIN Drop** (Severity: HIGH)
   - Condition: `Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN` present but `Card_APP_EVENT_PIN_ENTERED` missing
   - Reason: Card detected but PIN never entered
   - Impact: Payment cannot proceed
   - Note: This is considered a drop, not a cancellation, as it could be a technical issue

2. **Card API Drop** (Severity: HIGH)
   - Condition: `Card_APP_EVENT_PIN_ENTERED` present but `CARD_PAYMENT_API_EVENT_REQ` missing
   - Reason: PIN entered but payment API was never called
   - Impact: Payment data not sent to backend

3. **Card API Response Drop** (Severity: CRITICAL)
   - Condition: `CARD_PAYMENT_API_EVENT_REQ` present but `CARD_PAYMENT_API_EVENT_RESP` missing
   - Reason: Payment API request sent but never received response
   - Impact: **CRITICAL** - Unknown payment status, money might be deducted

4. **EMV Failure** (Severity: HIGH)
   - Condition: `EMV_FAILURE` present
   - Reason: EMV chip transaction processing failed
   - Impact: Card transaction cannot be completed

5. **Card Payment Failure** (Severity: HIGH)
   - Condition: `CARD_PAYMENT_API_EVENT_RESP_FAILURE` present
   - Reason: Card payment API returned failure response
   - Impact: Backend rejected the payment

---

### CASH

#### Required Events
- `cash_payment_screen_shown` - Cash payment screen displayed
- `cash_payment_initiated` - Cash payment initiated

#### Success Indicators
- `CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown
- `API_RESPONSE_SUCCESS` - API responded successfully

#### Failure Indicators
- `CASH_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen shown
- `API_RESPONSE_FAILED` - API returned failure
- `cash_network_error` - Network error occurred

#### Drop Detection Logic

1. **Cash Completion Drop** (Severity: MEDIUM)
   - Condition: `cash_payment_initiated` present but neither success nor failure screen shown
   - Reason: Cash payment initiated but completion screen never appeared
   - Impact: Transaction status unclear

---

### CHEQUE

#### Required Events
- `cheque_payment_screen_shown` - Cheque payment screen displayed
- `cheque_payment_initiated` - Cheque payment initiated

#### Success Indicators
- `cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown

#### Failure Indicators
- `cheque_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen shown

#### Drop Detection Logic

1. **Cheque Completion Drop** (Severity: MEDIUM)
   - Condition: `cheque_payment_initiated` present but neither success nor failure screen shown
   - Reason: Cheque payment initiated but completion screen never appeared
   - Impact: Transaction status unclear

---

### DD (Demand Draft)

#### Required Events
- `dd_payment_screen_shown` - DD payment screen displayed
- `dd_payment_initiated` - DD payment initiated

#### Success Indicators
- `DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown
- `API_RESPONSE_SUCCESS` - API responded successfully

#### Failure Indicators
- `DD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen shown
- `API_RESPONSE_FAILED` - API returned failure

#### Drop Detection Logic

1. **DD Completion Drop** (Severity: MEDIUM)
   - Condition: `dd_payment_initiated` present but neither success nor failure screen shown
   - Reason: DD payment initiated but completion screen never appeared
   - Impact: Transaction status unclear

---

### PAYLINK/CNP (Card Not Present)

#### Required Events
- `PAYLINK_INPUT_SCREEN_SHOWN` - Paylink input screen shown
- `PAYLINK_SEND_INITIATED` - Paylink send initiated

#### Success Indicators
- `PAYLINK_PAYMENT_SUCCESS` - Payment succeeded
- `CNP_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown

#### Failure Indicators
- `PAYLINK_SEND_FAILED` - Paylink send failed
- `PAYLINK_INVALID_MOBILE` - Invalid mobile number
- `PAYLINK_PAYMENT_EXPIRED` - Payment link expired
- `PAYLINK_PAYMENT_ABORTED` - Payment aborted
- `PAYLINK_API_EVENT_REQ_STOP_PAYMENT` - Stop payment requested

#### Drop Detection Logic

1. **Paylink Send Drop** (Severity: HIGH)
   - Condition: `PAYLINK_SEND_INITIATED` present but `PAYLINK_SEND_SUCCESS` missing
   - Reason: Paylink send initiated but never succeeded
   - Impact: Customer never received payment link

2. **Paylink Status Drop** (Severity: MEDIUM)
   - Condition: `PAYLINK_SEND_SUCCESS` present but no payment status event (success/expired/aborted)
   - Reason: Paylink sent successfully but payment status never received
   - Impact: Unknown whether customer completed payment
   - Note: Customer may complete payment later

---

### EMI

#### Required Events
- `payment_initiated_card` - Card payment initiated (EMI uses card flow)
- `emi_plan_selection_page_viewed` - EMI plan selection shown

#### Success Indicators
- `CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown
- `emi_validation_api_event_resp_success` - EMI validation successful

#### Failure Indicators
- `emi_error_popup_viewed` - Error popup shown
- `emi_error_cancel_payment_tapped` - User cancelled after error
- `emi_flow_abandoned` - EMI flow abandoned
- `emi_validation_api_event_resp_failure` - EMI validation failed
- `emi_plans_api_event_resp_failure` - EMI plans API failed

#### Drop Detection Logic

1. **EMI Selection Drop** (Severity: MEDIUM)
   - Condition: `emi_plan_selection_page_viewed` present but `emi_proceed_button_tapped` missing
   - Reason: EMI plan selection viewed but user never proceeded
   - Impact: Customer viewed EMI options but didn't continue

2. **EMI Validation Drop** (Severity: HIGH)
   - Condition: `emi_validation_api_event_req` present but no response (success/failure)
   - Reason: EMI validation API request sent but no response received
   - Impact: Cannot validate if card is eligible for EMI

---

### NCMC (National Common Mobility Card)

#### Required Events
- `NCMC_BALANCE_CHECK_CLICKED` - Balance check initiated

#### Success Indicators
- `NCMC_BALANCE_CHECK_SUCCESS` - Balance check successful
- `NCMC_BALANCE_UPDATE_API_EVENT_RESP_SUCCESS` - Balance update successful
- `NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP_SUCCESS` - Card load successful
- `NCMC_BALANCE_LOAD_CASH_API_EVENT_RESP_SUCCESS` - Cash load successful

#### Failure Indicators
- `NCMC_BALANCE_UPDATE_API_EVENT_RESP_FAILURE` - Balance update failed
- `NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP_FAILURE` - Card load failed
- `NCMC_BALANCE_LOAD_CASH_API_EVENT_RESP_FAILURE` - Cash load failed

#### Drop Detection Logic

1. **NCMC Load Drop** (Severity: HIGH)
   - Condition: `NCMC_BALANCE_LOAD_CARD_API_EVENT_REQ` present but no response (success/failure)
   - Reason: NCMC balance load API request sent but no response received
   - Impact: Unknown if balance was loaded

---

### WALLET

#### Required Events
- `wallet_page_viewed` - Wallet page viewed

#### Success Indicators
- `UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN` - Success screen shown

#### Failure Indicators
- `UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN` - Failure screen shown
- `qr_api_failure` - QR generation failed (if wallet uses QR)

#### Drop Detection Logic
Wallet payments use generic drop detection logic based on missing critical events.

---

## Common Patterns

### User Cancellation Detection

The analyzer identifies user cancellations through these events:

1. **Stop Payment Events**
   - `UPI_API_EVENT_REQ_STOP_PAYMENT` / `UPI_API_EVENT_RESP_STOP_PAYMENT`
   - `BQR_API_EVENT_REQ_STOP_PAYMENT` / `BQR_API_EVENT_RESP_STOP_PAYMENT`
   - `PAYLINK_API_EVENT_REQ_STOP_PAYMENT` / `PAYLINK_API_EVENT_RESP_STOP_PAYMENT`
   - `STOP_PAYMENT_API_REQUEST` / `STOP_PAYMENT_API_RESPONSE_FAILED`

2. **Card PIN Abort**
   - `EMV_ERR_RECEIVED` with `errorCode='PIN_ABORTED'`
   - Indicates user cancelled during PIN entry

3. **Navigation Events (Early Cancellation)**
   - `ON_BACK_PRESSED` - User pressed back button
   - `ON_HOME_PRESSED` - User pressed home button
   - Only counted as cancellation if triggered BEFORE success/failure screen

4. **Generic Cancellation**
   - `PAYMENT_CANCELLED`

**Important**: Navigation events AFTER success/failure screens are considered normal dismissal, NOT cancellation.

### Mode Switch Detection

- Event: `PAYMENT_MODE_SWITCH`
- Properties: `from` and `to` indicate the switch direction
- Example: User started UPI payment but switched to Card
- **Not counted as a drop** - User intentionally changed payment method

### Reprint Session Detection

Characteristics of a reprint session (NOT a real transaction):

1. `fetch_charge_slip_api_response` with `success=true` and `txnId` present
2. No payment initiation events (`payment_initiated_*`)
3. Has print-related events:
   - `BQR_print_receipt_button_clicked`
   - `UPI_print_receipt_button_clicked`
   - `CARD_print_receipt_button_clicked`
   - `BQR_THERMAL_PRINT_START`
   - `CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_REQUEST`

**Not counted as a drop** - This is post-payment activity.

### Session Expiry Detection

- Event: `API_SESSION_EXPIRY`
- Or: `LOGOUT` event combined with API failures
- Classified as FAILURE, not a drop
- Reason: User was logged out mid-transaction

### Generic Timeout

- Event: `PAYMENT_TIMEOUT`
- Typically 300 seconds (5 minutes) for QR-based payments
- Classified as legitimate drop with MEDIUM severity
- User took too long to complete payment

### Unknown Drop

If a transaction has:
- Missing critical events
- No explicit success/failure indicators
- No user cancellation markers
- No specific drop patterns matched

Then it's classified as `UNKNOWN_DROP` with severity MEDIUM and details about missing events.

---

## Severity Levels

- **CRITICAL**: Payment may have succeeded but acknowledgment was lost (money might be deducted)
- **HIGH**: Clear technical failure preventing payment completion
- **MEDIUM**: Payment incomplete, but likely no financial impact
- **INFO**: Not a drop (success, failure, cancellation, mode switch, reprint)

---

## Report Output

The analyzer generates a CSV report with these columns for legitimate drops:

1. `transaction_id` - Unique transaction identifier
2. `sequence_id` - Sequence ID for verification
3. `dsn` - Device Serial Number
4. `mid` - Merchant ID
5. `tid` - Terminal ID
6. `payment_type` - Payment method (UPI, CARD, etc.)
7. `drop_category` - Type of drop
8. `severity` - Impact level
9. `reason` - Human-readable explanation
10. `missing_events` - Critical events that were missing
11. `event_count` - Total number of events
12. `duration_seconds` - Time from first to last event
13. `first_event_time` - Timestamp of first event
14. `last_event_time` - Timestamp of last event

---

## Usage

To view all events for a specific sequence ID and verify if it's actually a drop:

```bash
node view-sequence.js <data-file.csv> <sequence-id>
```

This displays all events in chronological order with their properties, allowing manual verification of the analyzer's classification.
