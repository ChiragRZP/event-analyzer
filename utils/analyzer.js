/**
 * Expected event patterns for different payment types
 */
const PAYMENT_PATTERNS = {
  UPI: {
    // UPI Dynamic QR - Based on Events Master Excel: UPI(Dynamic)-Events sheet
    required: [
      'payment_initiated_upi',
      'qr_api_success', // QR generation must succeed
    ],
    optional: [
      'qr_generation_started',
      'qr_api_failure',
      // Alternative UPI QR generation events (newer format)
      'UPI_QR_GENERATE_API_REQUEST',
      'UPI_QR_GENERATE_API_RESPONSE_SUCCESS',
      'UPI_QR_GENERATE_API_RESPONSE_FAILED',
      'UPI_UI_EVENT_UPI_CHECK_STATUS_PROGRESS_INITIATED',
      'UPI_API_EVENT_REQ_CHECK_STATUS',
      'UPI_API_EVENT_RESP_CHECK_STATUS',
      'UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
      'MQTT_PAYMENT_NOTIFICATION_RECEIVED',
      'MQTT_PAYMENT_NOTIFICATION_FAILED_TO_PROCESS',
      'UPI_API_EVENT_REQ_STOP_PAYMENT',
      'UPI_API_EVENT_RESP_STOP_PAYMENT',
      'PAYMENT_PROMOS_API_REQUEST',
      'PAYMENT_PROMOS_API_RESPONSE',
      'PAYMENT_STATUS_API_REQUEST',
      'PAYMENT_STATUS_API_RESPONSE_SUCCESS',
    ],
    successIndicators: [
      'UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
      'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      'UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],
    failureIndicators: [
      'PAYMENT_CANCELLED',
      'PAYMENT_TIMEOUT',
      'qr_api_failure',
      'UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
      'UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
      'UPI_API_EVENT_REQ_STOP_PAYMENT',
    ],
  },
  BQR: {
    // BharatQR Payment - Based on Events Master Excel: BQR Payment (Bharat QR) sheet
    // Note: BQR uses same UPI events but with different QR generation (WALLET_QR_GENERATE)
    required: [
      'payment_initiated_upi',
      // QR must be generated - either generic or BQR-specific
      // At least one of: qr_api_success OR WALLET_QR_GENERATE_API_RESPONSE_SUCCESS OR BQR_GENERATE_API_RESPONSE_SUCCESS
    ],
    optional: [
      'qr_generation_started',
      'qr_api_success',
      'qr_api_failure',
      // BQR QR generation (newer format)
      'BQR_GENERATE_API_REQUEST',
      'BQR_GENERATE_API_RESPONSE_SUCCESS',
      'BQR_GENERATE_API_RESPONSE_FAILED',
      // WALLET QR generation (older format)
      'WALLET_QR_GENERATE_API_REQUEST',
      'WALLET_QR_GENERATE_API_RESPONSE_SUCCESS',
      'WALLET_QR_GENERATE_API_RESPONSE_FAILED',
      'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN',
      'UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN',
      'UPI_API_EVENT_REQ_CHECK_STATUS',
      'UPI_API_EVENT_RESP_CHECK_STATUS',
      'PAYMENT_STATUS_API_REQUEST',
      'PAYMENT_STATUS_API_RESPONSE_SUCCESS',
      'MQTT_PAYMENT_NOTIFICATION_RECEIVED',
      'MQTT_PAYMENT_NOTIFICATION_FAILED_TO_PROCESS',
      'BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
      'BQR_AUTOMATE_PRINT_CHANRGESLIP',
      'AUTOMATE_PRINT_CHANRGESLIP',
      'BQR_print_status_check',
      'BQR_print_status_check_result',
      'UPI_API_EVENT_REQ_STOP_PAYMENT',
      'UPI_API_EVENT_RESP_STOP_PAYMENT',
      'BQR_API_EVENT_REQ_STOP_PAYMENT',
      'BQR_API_EVENT_RESP_STOP_PAYMENT',
      // E-receipt events (post-payment)
      'api_send_receipt_request',
      'api_send_receipt_response',
      'send_e_receipt_button_clicked',
      'send_e_receipt_success',
    ],
    successIndicators: [
      'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      'UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      'BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
      'PAYMENT_STATUS_API_RESPONSE_SUCCESS',
    ],
    failureIndicators: [
      'PAYMENT_CANCELLED',
      'PAYMENT_TIMEOUT',
      'qr_api_failure',
      'WALLET_QR_GENERATE_API_RESPONSE_FAILED',
      'BHARATQR_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
      'UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
      'UPI_API_EVENT_REQ_STOP_PAYMENT',
      'BQR_API_EVENT_REQ_STOP_PAYMENT',
    ],
  },
  CARD: {
    // Card Payment - Based on Events Master Excel: Card-Events sheet
    // Supports both domestic (without DCC) and international (with DCC) cards
    required: [
      'payment_initiated_card',
      'Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN',
      // NOTE: Card_APP_EVENT_PIN_ENTERED is NOT required because:
      // - Contactless payments may not require PIN
      // - PIN might be entered on terminal (no event logged)
      // - Some cards/amounts don't require PIN
    ],
    optional: [
      'PREPARING_FOR_TXN',
      'TXN_IN_PROGRESS',
      // Pre-payment events
      'CARD_PAYMENT_SELECTED',
      'CARD_PAYMENT_EVENT_LISTENED',
      'Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN',
      'Card_APP_EVENT_PIN_ENTERED', // MOVED FROM REQUIRED - not all cards need PIN
      'CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD',
      'CARD_PAYMENT_API_EVENT_RESP_API_3.0_PAYMENT_CARD',
      'CARD_PAYMENT_API_EVENT_REQ',
      'CARD_PAYMENT_API_EVENT_RESP',
      'CARD_PAYMENT_API_REQUEST',
      'CARD_PAYMENT_API_RESPONSE_SUCCESS',
      'PAYMENT_CONFIRM_API_REQUEST',
      'PAYMENT_CONFIRM_API_RESPONSE_SUCCESS',
      // DCC (Dynamic Currency Conversion) for international cards
      'DCC_INFO_API_EVENT_REQ',
      'DCC_INFO_API_EVENT_RESP_SUCCESS',
      'DCC_INFO_API_EVENT_RESP_FAILURE',
      'DCC_OPTED',
      'DCC_NOT_OPTED',
      // Printing
      'AUTOMATE_PRINT_CHANRGESLIP',
      'CARD_AUTOMATE_PRINT_CHANRGESLIP',
      'THERMAL_PRINT_START',
      'CARD_print_status_check',
      'CARD_print_status_check_result',
    ],
    successIndicators: [
      'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      'CARD_PAYMENT_API_EVENT_RESP_SUCCESS',
      'CARD_PAYMENT_API_RESPONSE_SUCCESS',
      'PAYMENT_CONFIRM_API_RESPONSE_SUCCESS',
    ],
    failureIndicators: [
      'PAYMENT_CANCELLED',
      'CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
      'CARD_PAYMENT_API_EVENT_RESP_FAILURE',
      'CARD_PAYMENT_API_RESPONSE_FAILED',
      'EMV_FAILURE',
    ],
  },
  CASH: {
    // Cash Payment - Based on Events Master Excel: Cash Events sheet
    required: [
      'cash_payment_screen_shown',
      'cash_payment_initiated',
    ],
    optional: [
      'cash_network_error',
      // API events (generic)
      'API_REQUEST',
      'API_RESPONSE_SUCCESS',
      'API_RESPONSE_FAILED',
      // Cash-specific API events
      'CASH_PAYMENT_API_REQUEST',
      'CASH_PAYMENT_API_RESPONSE_SUCCESS',
      'CASH_PAYMENT_API_RESPONSE_FAILED',
      // Printing
      'AUTOMATE_PRINT_CHANRGESLIP',
      'THERMAL_PRINT_START',
      // E-receipt events
      'api_send_receipt_request',
      'api_send_receipt_response',
      'send_e_receipt_button_clicked',
      'send_e_receipt_success',
    ],
    successIndicators: [
      'CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      'API_RESPONSE_SUCCESS',
    ],
    failureIndicators: [
      'CASH_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
      'API_RESPONSE_FAILED',
      'cash_network_error',
    ],
  },
  CHEQUE: {
    // Cheque Payment - Based on Events Master Excel: Cheque Events sheet
    required: [
      'cheque_payment_screen_shown',
      'cheque_payment_initiated',
    ],
    optional: [
      'AUTOMATE_PRINT_CHANRGESLIP',
    ],
    successIndicators: [
      'cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],
    failureIndicators: [
      'cheque_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
    ],
  },
  DD: {
    // Demand Draft - Based on Events Master Excel: DD Events sheet
    required: [
      'dd_payment_screen_shown',
      'dd_payment_initiated',
    ],
    optional: [
      'API_REQUEST',
      'API_RESPONSE_SUCCESS',
      'API_RESPONSE_FAILED',
      'AUTOMATE_PRINT_CHANRGESLIP',
    ],
    successIndicators: [
      'DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      'API_RESPONSE_SUCCESS',
    ],
    failureIndicators: [
      'DD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
      'API_RESPONSE_FAILED',
    ],
  },
  PAYLINK: {
    // Paylink (CNP - Card Not Present) - Based on Events Master Excel: paylink events sheet
    required: [
      'PAYLINK_INPUT_SCREEN_SHOWN',
      'PAYLINK_SEND_INITIATED',
    ],
    optional: [
      // Paylink creation
      'PAYLINK_CREATE_API_REQUEST',
      'PAYLINK_CREATE_API_RESPONSE_SUCCESS',
      'PAYLINK_CREATE_API_RESPONSE_FAILED',
      // Paylink sending
      'PAYLINK_SEND_SUCCESS',
      'PAYLINK_SEND_FAILED',
      'PAYLINK_INVALID_MOBILE',
      'PAYLINK_RETRY_ATTEMPTED',
      // Paylink status
      'PAYLINK_POLL_STATUS_INITIATED',
      'PAYLINK_PAYMENT_ABORTED',
      // Generic events
      'PAYMENT_PROMOS_API_REQUEST',
      'PAYMENT_PROMOS_API_RESPONSE',
      'AUTOMATE_PRINT_CHANRGESLIP',
      'PAYLINK_API_EVENT_REQ_STOP_PAYMENT',
      'PAYLINK_API_EVENT_RESP_STOP_PAYMENT',
    ],
    successIndicators: [
      'PAYLINK_PAYMENT_SUCCESS',
      'CNP_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],
    failureIndicators: [
      'PAYLINK_SEND_FAILED',
      'PAYLINK_INVALID_MOBILE',
      'PAYLINK_PAYMENT_EXPIRED',
      'PAYLINK_PAYMENT_ABORTED',
      'PAYLINK_API_EVENT_REQ_STOP_PAYMENT',
    ],
  },
  CNP: {
    // Card Not Present - alias for PAYLINK
    required: [
      'PAYLINK_INPUT_SCREEN_SHOWN',
      'PAYLINK_SEND_INITIATED',
      'PAYLINK_SEND_SUCCESS',
    ],
    optional: [
      'PAYLINK_RETRY_ATTEMPTED',
      'PAYLINK_POLL_STATUS_INITIATED',
    ],
    successIndicators: [
      'PAYLINK_PAYMENT_SUCCESS',
      'CNP_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],
    failureIndicators: [
      'PAYLINK_SEND_FAILED',
      'PAYLINK_PAYMENT_EXPIRED',
      'PAYLINK_PAYMENT_ABORTED',
    ],
  },
  EMI: {
    // EMI Payment (Bank EMI / Brand EMI) - Based on Events Master Excel: EMI sheet
    // EMI uses card payment flow with additional EMI-specific events
    required: [
      'payment_initiated_card', // EMI uses card flow
      'emi_plan_selection_page_viewed',
    ],
    optional: [
      'menu_emi_tapped',
      'emi_plan_bank_selected',
      'emi_tenure_selection_page_viewed',
      'emi_tenure_option_selected',
      'emi_tenure_view_breakup_tapped',
      'emi_breakup_modal_viewed',
      'emi_breakup_modal_closed',
      'emi_proceed_button_tapped',
      // API Events
      'emi_plans_api_event_req',
      'emi_plans_api_event_resp_success',
      'emi_plans_api_event_resp_failure',
      'emi_validation_api_event_req',
      'emi_validation_api_event_resp_success',
      'emi_validation_api_event_resp_failure',
      // Filter Events
      'emi_filter_bank_tapped',
      'emi_bank_filter_modal_viewed',
      'emi_bank_filter_search_started',
      'emi_bank_filter_bank_toggled',
      'emi_bank_filter_apply_tapped',
      'emi_bank_filter_closed',
      // Business/Full Swipe Offers
      'emi_full_swipe_offer_shown',
      'emi_full_swipe_offer_accepted',
      'emi_full_swipe_offer_declined',
      // Card events
      'Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN',
      'Card_APP_EVENT_PIN_ENTERED',
    ],
    successIndicators: [
      'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      'emi_validation_api_event_resp_success',
    ],
    failureIndicators: [
      'emi_error_popup_viewed',
      'emi_error_cancel_payment_tapped',
      'emi_flow_abandoned',
      'emi_validation_api_event_resp_failure',
      'emi_plans_api_event_resp_failure',
    ],
  },
  NCMC: {
    // NCMC (National Common Mobility Card) - Based on Events Master Excel: NCMC sheet
    required: [
      'NCMC_BALANCE_CHECK_CLICKED',
    ],
    optional: [
      'NCMC_BALANCE_CHECK_SUCCESS',
      'NCMC_BALANCE_UPDATE_CLICKED',
      'NCMC_BALANCE_LOAD_CARD_CLICKED',
      'NCMC_BALANCE_LOAD_CASH_CLICKED',
      'NCMC_BALANCE_LOAD_CARD_API_EVENT_REQ',
      'NCMC_BALANCE_LOAD_CASH_API_EVENT_REQ',
      'NCMC_BALANCE_UPDATE_API_EVENT_RESP_SUCCESS',
      'NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP_SUCCESS',
      'NCMC_BALANCE_LOAD_CASH_API_EVENT_RESP_SUCCESS',
      'NCMC_BALANCE_UPDATE_API_EVENT_RESP_FAILURE',
      'NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP_FAILURE',
      'NCMC_BALANCE_LOAD_CASH_API_EVENT_RESP_FAILURE',
    ],
    successIndicators: [
      'NCMC_BALANCE_CHECK_SUCCESS',
      'NCMC_BALANCE_UPDATE_API_EVENT_RESP_SUCCESS',
      'NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP_SUCCESS',
      'NCMC_BALANCE_LOAD_CASH_API_EVENT_RESP_SUCCESS',
    ],
    failureIndicators: [
      'NCMC_BALANCE_UPDATE_API_EVENT_RESP_FAILURE',
      'NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP_FAILURE',
      'NCMC_BALANCE_LOAD_CASH_API_EVENT_RESP_FAILURE',
    ],
  },
  WALLET: {
    // Wallet Payment (Amazon Pay) - Based on Events Master Excel: Wallet sheet
    required: [
      'wallet_page_viewed',
    ],
    optional: [
      'qr_generation_started',
      'qr_api_success',
      'qr_api_failure',
      'qr_page_viewed',
    ],
    successIndicators: [
      'UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],
    failureIndicators: [
      'UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
      'qr_api_failure',
    ],
  },
};

/**
 * Get expected pattern for a payment type
 * @param {string} paymentType - Payment type (UPI, CARD, BQR, etc.)
 * @returns {Object} - Expected pattern
 */
function getExpectedPattern(paymentType) {
  return PAYMENT_PATTERNS[paymentType] || {
    required: [],
    optional: [],
    successIndicators: ['PAYMENT_SUCCESS', 'TRANSACTION_SUCCESS_SCREEN_SHOWN'],
    failureIndicators: ['PAYMENT_CANCELLED', 'PAYMENT_FAILURE', 'PAYMENT_TIMEOUT'],
  };
}

/**
 * Find missing events from expected list
 * @param {Array<string>} expected - Expected events
 * @param {Array<string>} actual - Actual events
 * @returns {Array<string>} - Missing events
 */
function findMissingEvents(expected, actual) {
  const actualSet = new Set(actual);
  return expected.filter(event => !actualSet.has(event));
}

/**
 * Check if any event from list is present
 * @param {Array<string>} events - Event list
 * @param {Array<string>} indicators - Events to check for
 * @returns {boolean}
 */
function containsAny(events, indicators) {
  const eventSet = new Set(events);
  return indicators.some(indicator => eventSet.has(indicator));
}

/**
 * Analyze event flow against expected pattern
 * @param {Array} events - Array of event objects
 * @param {string} paymentType - Payment type
 * @returns {Object} - Analysis result
 */
function analyzeFlow(events, paymentType) {
  const expectedFlow = getExpectedPattern(paymentType);
  const actualEvents = events.map(e => e.eventName);

  return {
    paymentType,
    eventCount: events.length,
    missingCritical: findMissingEvents(expectedFlow.required, actualEvents),
    missingOptional: findMissingEvents(expectedFlow.optional, actualEvents),
    hasSuccess: containsAny(actualEvents, expectedFlow.successIndicators),
    hasFailure: containsAny(actualEvents, expectedFlow.failureIndicators),
    allEvents: actualEvents,
  };
}

/**
 * Calculate duration of event sequence
 * @param {Array} events - Array of event objects
 * @returns {number} - Duration in seconds
 */
function calculateDuration(events) {
  if (events.length < 2) return 0;

  const startTime = new Date(events[0].eventTime).getTime();
  const endTime = new Date(events[events.length - 1].eventTime).getTime();
  return ((endTime - startTime) / 1000).toFixed(2);
}

module.exports = {
  getExpectedPattern,
  findMissingEvents,
  containsAny,
  analyzeFlow,
  calculateDuration,
};
