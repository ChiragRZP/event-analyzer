/**
 * Events that are NOT part of payment flow and should be excluded from
 * "expected events if all successful" calculations
 *
 * These events occur:
 * - Before payment flow starts (navigation, UI)
 * - After payment flow ends (transaction history, settlement)
 * - Outside payment context (system, infrastructure)
 */

const NON_PAYMENT_EVENTS = {
  /**
   * Navigation Events
   * User navigation that happens before or during but not specific to payment
   */
  NAVIGATION: [
    'ON_HOME_PRESSED',
    'ON_BACK_PRESSED',
    'NAVSTACK_PUSH_NULL_ELEMENT',
    'APP_NAVIGATION_CHANGED',
    'APP_SCREEN_CHANGED',
  ],

  /**
   * Pre-Payment UI Events
   * Screens shown BEFORE payment method is selected
   */
  PRE_PAYMENT_UI: [
    'amount_screen_shown',
    'button_menu_collect_payment',
    'button_menu_transactions',
    'button_menu_settlements',
    'button_menu_more',
    'PAYMENT_AMOUNT_SCREEN_SHOWN',
    'UNIVERSAL_PAY_SCREEN_SHOWN',
    'UPI_BUTTON_CLICKED_ON_UNIVERSAL_PAY_SCREEN',
    'CARD_BUTTON_CLICKED_ON_UNIVERSAL_PAY_SCREEN',
    'DASHBOARD_SCREEN_SHOWN',
    'DASHBOARD_DATA_RECEIVED',
  ],

  /**
   * System/Lifecycle Events
   * Infrastructure events not related to payments
   */
  SYSTEM: [
    'APP_LAUNCHED',
    'APP_INITIALIZATION_COMPLETED',
    'APP_CLOSED',
    'APP_BACKGROUNDED',
    'APP_FOREGROUNDED',
    'APP_LIFECYCLE',
    'SDK_MPOS_FUNCTIONS_STATUS',
    'SDK_INPUT',
    'SDK_OUTPUT',
    'UPDATE_CHECK',
    'AUTH_DATA_LOADED_FROM_STORAGE',
    'PERMISSIONS_REQ',
    'PERMISSIONS_RES',
  ],

  /**
   * Login/Session Events
   * Authentication not specific to a payment
   */
  LOGIN_SESSION: [
    'LoginValidation',
    'IS_SESSION_VALID',
    'Login_API_EVENT_REQ_APP_LOGIN',
    'Login_API_EVENT_REQ_AUTO_LOGIN',
    'Login_API_EVENT_REQ_DSN_LOGIN',
    'Login_API_EVENT_REQ_MANUAL_LOGIN',
    'Login_API_EVENT_RESP_APP_LOGIN',
    'Login_API_EVENT_RESP_AUTO_LOGIN',
    'Login_API_EVENT_RESP_DSN_LOGIN',
    'Login_API_EVENT_RESP_MANUAL_LOGIN',
    'Login_Success',
    'Login_Failed',
    'LOGOUT',
    'API_SESSION_EXPIRY',
    'API_SESSION_EXPIRY_RETRY',
    'API_SESSION_EXPIRY_RETRY_FAILED',
    'LOGIN_API_REQUEST',
    'LOGIN_API_RESPONSE_SUCCESS',
    'LOGIN_API_RESPONSE_FAILED',
    'login_flow_start',
    'LAUNCH_MPOS',
  ],

  /**
   * Transaction History Events
   * Post-payment transaction viewing
   */
  TRANSACTION_HISTORY: [
    'create_txn_screen',
    'txn_history_render_data',
    'txn_history_transform_result',
    'txn_history_ui_state',
    'txn_history_indexeddb_read',
    'txn_history_indexeddb_write',
    'TXN_LIST_API_REQUEST',
    'TXN_LIST_API_RESPONSE_SUCCESS',
    'TXN_LIST_API_RESPONSE_FAILED',
    'TXN_DETAIL_SCREEN_SHOWN',
    'TXN_LIST_ITEM_CLICKED',
    'LOAD_MORE_TXNS_API_REQUEST',
    'LOAD_MORE_TXNS_API_RESPONSE',
    'get_txns_details_with_filters_api_response',
  ],

  /**
   * Settlement Events
   * Post-payment settlement operations
   */
  SETTLEMENT: [
    'SETTLEMENTS_TAB_CLICKED',
    'SETTLEMENTS_SCREEN_SHOWN',
    'SETTLEMENT_INITIATED',
    'SETTLEMENT_SUCCESS',
    'SETTLEMENT_FAILED',
    'SETTLEMENT_NETWORK_ERROR',
    'SETTLEMENT_HISTORY_API_REQUEST',
    'SETTLEMENT_HISTORY_API_SUCCESS',
    'SETTLEMENT_HISTORY_API_FAILED',
    'SETTLEMENT_PRINT_RECEIPT_CLICKED',
    'SETTLEMENT_PRINT_SUCCESS',
    'SETTLEMENT_PRINT_FAILED',
    'SHIFT_END_API_REQUEST',
    'SHIFT_END_API_RESPONSE',
    'BUTTON_SHIFT_MANAGEMENT_CLICKED',
    'BUTTON_END_SHIFT_CLICKED',
  ],

  /**
   * Promo/Offer Events (Pre-Payment)
   * Fetched before payment method selection
   */
  PROMOS: [
    'PAYMENT_PROMOS_API_REQUEST',
    'PAYMENT_PROMOS_API_RESPONSE',
    'PAYMENT_PROMOS_API_RESPONSE_SUCCESS',
    'PAYMENT_PROMOS_API_RESPONSE_FAILED',
    'PAYMENT_PROMOS_CACHE_UPDATED',
    'PAYMENT_PROMOS_DIALOG_SHOWN',
    'PAYMENT_PROMOS_DIALOG_CLOSED',
  ],

  /**
   * Refund/Void Events
   * Post-payment operations (not part of original payment flow)
   */
  REFUND_VOID: [
    'VOID_DIALOG_OPENED',
    'VOID_DIALOG_CLOSED',
    'VOID_API_REQUEST',
    'VOID_API_RESPONSE',
    'REFUND_API_REQUEST',
    'REFUND_API_RESPONSE',
    'REFUND_SUCCESS',
    'REFUND_SUCCESS_DIALOG_CLOSED',
    'REFUND_BUTTON_CLICKED',
    'REFUND_API_PASSWORD',
  ],

  /**
   * E-Receipt Events
   * Post-payment optional action
   */
  E_RECEIPT: [
    'SEND_E_RECEIPT_BUTTON_CLICKED',
    'SEND_E_RECEIPT_DIALOG_OPENED',
    'SEND_E_RECEIPT_DIALOG_CLOSED',
    'SEND_E_RECEIPT_SUCCESS',
    'SEND_E_RECEIPT_FAILURE',
  ],

  /**
   * Merchant Config/Settings Events
   * System configuration not part of payment
   */
  CONFIG: [
    'LOAD_MERCHANT_CONFIG_FAILED',
  ],

  /**
   * Health Check/Device Events
   * System diagnostics not part of payment
   */
  HEALTH_CHECK: [
    'HEALTH_CHECK_INITIATED',
    'HEALTH_CHECK_UI_SHOWN',
    'BATTERY_OPTIMIZATIONS_BLUETOOTH',
    'BATTERY_OPTIMIZATIONS_NETWORK_SWITCH',
    'LOCATION_CAPTURE_SUCCESS',
    'LOCATION_CAPTURE_FAILED',
    'NETWORK_HEALTH_CHECK_START',
    'NETWORK_HEALTH_CHECK_RESULT',
  ],

  /**
   * MQTT Service Events
   * Infrastructure events (payment notifications are included in success flows)
   */
  MQTT_INFRASTRUCTURE: [
    'MQTT_SERVICE_INITIALIZED',
    'MQTT_SERVICE_STARTED',
    'MQTT_SERVICE_FAILED',
    'MQTT_CONNECTION_SUCCESS',
    'MQTT_CONNECTION_FAILED',
    'MQTT_MESSAGE_RECEIVED_TO_WEB',  // Generic message, specific payment notifications are in success flows
  ],

  /**
   * RKI (Remote Key Injection) Events
   * Security/certificate management not part of payment
   */
  RKI: [
    'RKI_BUTTON_CLICKED',
    'RKI_FETCH_CERTS_API_REQUEST',
    'RKI_FETCH_CERTS_API_RESPONSE_SUCCESS',
    'RKI_FETCH_CERTS_API_RESPONSE_FAILED',
    'RKI_CSR_FAILED',
    'RKI_CSR_API_REQUEST',
    'RKI_SUCCESSFUL',
    'RKI_FAILED',
  ],
};

/**
 * Get all non-payment events as a flat array
 * @returns {Array<string>} - All non-payment event names
 */
function getAllNonPaymentEvents() {
  const allEvents = [];
  for (const category of Object.values(NON_PAYMENT_EVENTS)) {
    allEvents.push(...category);
  }
  return allEvents;
}

/**
 * Check if an event is a non-payment event
 * @param {string} eventName - Event name to check
 * @returns {boolean} - True if event should be excluded from payment flow calculations
 */
function isNonPaymentEvent(eventName) {
  const allNonPaymentEvents = getAllNonPaymentEvents();
  return allNonPaymentEvents.includes(eventName);
}

/**
 * Get the category of a non-payment event
 * @param {string} eventName - Event name
 * @returns {string|null} - Category name or null if not a non-payment event
 */
function getNonPaymentEventCategory(eventName) {
  for (const [category, events] of Object.entries(NON_PAYMENT_EVENTS)) {
    if (events.includes(eventName)) {
      return category;
    }
  }
  return null;
}

module.exports = {
  NON_PAYMENT_EVENTS,
  getAllNonPaymentEvents,
  isNonPaymentEvent,
  getNonPaymentEventCategory,
};
