/**
 * Detect payment type from event names when PAYMENT_TYPE property is missing
 * Based on Events Master Excel sheet patterns
 */

/**
 * Infer payment type from event names
 * @param {Array} events - Array of event objects
 * @returns {string|null} - Detected payment type or null
 */
function inferPaymentTypeFromEvents(events) {
  const eventNames = events.map(e => e.eventName);
  const eventNamesStr = eventNames.join('|');

  // Card payment indicators
  const cardIndicators = [
    'payment_initiated_card',
    'Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN',
    'Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN',
    'Card_APP_EVENT_PIN_ENTERED',
    'CARD_PAYMENT_API_EVENT',
    'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    'CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
    'CARD_PAYMENT_SELECTED',
  ];

  // BQR payment indicators (takes priority over UPI since BQR uses UPI events)
  const bqrIndicators = [
    'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN',
    'BHARATQR_QR_SHOWN',  // Alternative event name
    'BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
    'BQR_AUTOMATE_PRINT_CHANRGESLIP',
    'BQR_print_status_check',
    'BQR_print_receipt_button_clicked',
    'BQR_THERMAL_PRINT_START',
    'BQR_API_EVENT_REQ_STOP_PAYMENT',
    'BQR_API_EVENT_RESP_STOP_PAYMENT',
    'BHARATQR_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
    'WALLET_QR_GENERATE_API',  // Matches both REQUEST and RESPONSE_SUCCESS
    'BQR_API_EVENT_REQ_GENERATE_QR',
    'BQR_API_EVENT_RESP_GENERATE_QR',
    'BQR_API_EVENT_REQ_PAY_BQR_QR',
    'BQR_API_EVENT_RESP_PAY_BQR_QR',
    'BQR_API_EVENT_REQ_CHECK_STATUS',
    'BQR_API_EVENT_RESP_CHECK_STATUS',
    'BQR_UI_EVENT_BQR_CHECK_STATUS_PROGRESS_INITIATED',
  ];

  // UPI payment indicators
  const upiIndicators = [
    'UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN',
    'UPI_API_EVENT_REQ_PAY_UPI_QR',
    'UPI_API_EVENT_RESP_PAY_UPI_QR',
    'UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
    'UPI_UI_EVENT_UPI_CHECK_STATUS_PROGRESS_INITIATED',
    'UPI_QR_GENERATE_API_REQUEST',
    'UPI_QR_GENERATE_API_RESPONSE_SUCCESS',
    'UPI_API_EVENT_REQ_CHECK_STATUS',
    'UPI_API_EVENT_RESP_CHECK_STATUS',
    'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    'UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
    'UPI_AUTOMATE_PRINT_CHANRGESLIP',
  ];

  // Cash payment indicators
  const cashIndicators = [
    'cash_payment_screen_shown',
    'cash_payment_initiated',
    'cash_network_error',
    'CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    'CASH_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
  ];

  // Cheque payment indicators
  const chequeIndicators = [
    'cheque_payment_screen_shown',
    'cheque_payment_initiated',
    'cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    'cheque_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
  ];

  // DD payment indicators
  const ddIndicators = [
    'dd_payment_screen_shown',
    'dd_payment_initiated',
    'DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    'DD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN',
  ];

  // EMI payment indicators
  const emiIndicators = [
    'emi_plan_selection_page_viewed',
    'emi_plan_bank_selected',
    'emi_tenure_option_selected',
    'emi_proceed_button_tapped',
    'emi_validation_api_event',
    'emi_flow_abandoned',
  ];

  // Paylink/CNP indicators
  const paylinkIndicators = [
    'PAYLINK_INPUT_SCREEN_SHOWN',
    'PAYLINK_SEND_INITIATED',
    'PAYLINK_SEND_SUCCESS',
    'PAYLINK_SEND_FAILED',
    'PAYLINK_PAYMENT_SUCCESS',
    'PAYLINK_PAYMENT_EXPIRED',
    'PAYLINK_PAYMENT_ABORTED',
  ];

  // Wallet indicators
  const walletIndicators = [
    'wallet_page_viewed',
  ];

  // NCMC indicators
  const ncmcIndicators = [
    'NCMC_BALANCE_CHECK_CLICKED',
    'NCMC_BALANCE_CHECK_SUCCESS',
    'NCMC_BALANCE_UPDATE_CLICKED',
    'NCMC_BALANCE_LOAD',
  ];

  // Check in priority order (BQR before UPI since BQR uses UPI events)
  if (bqrIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'BQR';
  }

  if (cardIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'CARD';
  }

  if (upiIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'UPI';
  }

  if (cashIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'CASH';
  }

  if (chequeIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'CHEQUE';
  }

  if (ddIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'DD';
  }

  if (emiIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'EMI';
  }

  if (paylinkIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'PAYLINK';
  }

  if (walletIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'WALLET';
  }

  if (ncmcIndicators.some(indicator => eventNamesStr.includes(indicator))) {
    return 'NCMC';
  }

  // Check for generic UPI initiation
  if (eventNames.includes('payment_initiated_upi')) {
    // Could be UPI or BQR, default to UPI
    return 'UPI';
  }

  return null;
}

module.exports = {
  inferPaymentTypeFromEvents,
};
