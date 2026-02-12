/**
 * Defines complete success flow events for each payment type
 *
 * Based on comprehensive codebase analysis (Feb 12, 2026):
 * - Production log analysis (477 BQR successes, 3 CARD successes)
 * - Events Master Excel documentation
 * - POS codebase verification (/Users/peddakondannagari.r/newpos/pos)
 *
 * Structure:
 * - CRITICAL: Events that ALWAYS occur in successful transactions (100% presence)
 * - OPTIONAL: Events that MAY occur based on conditions (config, card type, user choice)
 * - POLLING: Events that occur multiple times per transaction
 * - POST_PAYMENT: Events after payment success (printing, etc.)
 * - VARIATIONS: Different success paths for the same payment type
 */

const SUCCESS_FLOWS = {
  /**
   * BQR (BharatQR) Payment Flow
   *
   * Based on: 477 successful transactions analyzed (Feb 5, 2026 production logs)
   * Codebase: /modules/payment/qr/, /lib/eze/qr.ts
   *
   * Key Insight: Two parallel completion mechanisms (polling OR MQTT)
   */
  BQR: {
    CRITICAL: [
      // Entry & Initiation (shared with UPI)
      'payment_initiated_upi',           // Entry point (BQR uses UPI event)
      'qr_generation_started',            // QR generation starts

      // QR Generation API (BQR-specific endpoint)
      'WALLET_QR_GENERATE_API_REQUEST',   // BQR uses wallet endpoint
      'WALLET_QR_GENERATE_API_RESPONSE_SUCCESS',
      'qr_api_success',

      // QR Display
      'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN', // QR shown to customer

      // Success & Result
      'Create_TransactionResultActivity',  // Legacy event still active
      'BQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],

    OPTIONAL: {
      // Completion Mechanism A: Status Polling (see POLLING section)
      polling_completion: [
        // These are in POLLING section below
      ],

      // Completion Mechanism B: MQTT Notification
      mqtt_completion: [
        'MQTT_PAYMENT_NOTIFICATION_RECEIVED',
        'BQR_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
      ],

      // Note: At least ONE completion mechanism must succeed
      // Either polling OR MQTT (or both in race condition)
    },

    POLLING: {
      // These events repeat 1-12 times per transaction (avg: 1.12)
      // Production data: min=1, max=12, avg=1.12 rounds
      events: [
        'UPI_API_EVENT_REQ_CHECK_STATUS',      // Poll request
        'PAYMENT_STATUS_API_REQUEST',           // Parallel poll request
        'UPI_API_EVENT_RESP_CHECK_STATUS',     // Poll response
        'PAYMENT_STATUS_API_RESPONSE_SUCCESS',  // Parallel poll response
      ],
      avgOccurrences: 1.12,  // From production analysis
      minOccurrences: 1,
      maxOccurrences: 12,
    },

    POST_PAYMENT: [
      // Printing (happens AFTER payment success, errors don't fail payment)
      'BQR_AUTOMATE_PRINT_CHANRGESLIP',
      'BQR_print_status_check',
      'BQR_print_status_check_result',
      'print_status_check_failed',       // Common (printer out of paper)
      'print_receipt_failed',             // Common (printer out of paper)
    ],
  },

  /**
   * UPI (Dynamic QR) Payment Flow
   *
   * Based on: Events Master Excel + codebase analysis
   * Codebase: /modules/payment/qr/, /lib/eze/qr.ts
   *
   * Key Insight: Similar to BQR with different event names, two completion mechanisms
   */
  UPI: {
    CRITICAL: [
      // Entry & Initiation
      'payment_initiated_upi',
      'qr_generation_started',

      // QR Generation API (UPI-specific endpoint)
      'UPI_API_EVENT_REQ_PAY_UPI_QR',
      'UPI_API_EVENT_RESP_PAY_UPI_QR',
      'qr_api_success',

      // QR Display
      'UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN',

      // Success
      'UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],

    OPTIONAL: {
      // Completion Mechanism A: Status Polling (see POLLING section)
      polling_completion: [],

      // Completion Mechanism B: MQTT Notification
      mqtt_completion: [
        'MQTT_PAYMENT_NOTIFICATION_RECEIVED',
        'UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
      ],
    },

    POLLING: {
      events: [
        'UPI_API_EVENT_REQ_CHECK_STATUS',
        'UPI_API_EVENT_RESP_CHECK_STATUS',
      ],
      avgOccurrences: 1.0,  // Estimate (less production data than BQR)
    },

    POST_PAYMENT: [
      'AUTOMATE_PRINT_CHANRGESLIP',
    ],

    REMOVED_EVENTS: [
      // These events are DEFINED but NEVER EMITTED in codebase
      'UPI_UI_EVENT_UPI_CHECK_STATUS_PROGRESS_INITIATED',  // Not found in code
    ],
  },

  /**
   * CARD Payment Flow
   *
   * Based on: 3 successful transactions (production) + comprehensive codebase analysis
   * Codebase: /modules/payment/card/, /lib/eze/card.ts, /lib/pos/card/
   *
   * Key Insight: HIGHLY VARIABLE based on card type, amount, and merchant config
   *
   * Variations:
   * 1. Minimal: MAG card, no PIN, no DCC, no service fee (10 events)
   * 2. Standard: CHIP card with PIN (17 events)
   * 3. Maximum: International CHIP with PIN + DCC + Service Fee (24 events)
   * 4. NFC: Contactless payment (11 events)
   */
  CARD: {
    CRITICAL: [
      // Core events present in ALL 3 production transactions (Feb 5, 2026)
      // Note: PIN is theoretically optional per codebase, but appeared in 100% of production samples
      'CARD_PAYMENT_SELECTED',
      'payment_initiated_card',
      'Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN',
      'PREPARING_FOR_TXN',
      'TXN_IN_PROGRESS',
      'Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN',
      'Card_APP_EVENT_PIN_ENTERED',
      'CARD_PAYMENT_API_REQUEST',
      'CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD',
      'CARD_PAYMENT_API_RESPONSE_SUCCESS',
      'CARD_PAYMENT_API_EVENT_RESP_API_3.0_PAYMENT_CARD',
      'PAYMENT_CONFIRM_API_REQUEST',
      'CARD_PAYMENT_API_EVENT_REQ_API_2.0_PAYMENT_CONFIRM',
      'PAYMENT_CONFIRM_API_RESPONSE_SUCCESS',
      'CARD_PAYMENT_API_EVENT_RESP_API_2.0_PAYMENT_CONFIRM',
      'Create_TransactionResultActivity',
      'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],

    OPTIONAL: {
      // EMV Flow (CHIP/NFC cards only, not MAG)
      emv_flow: [
        'TXN_IN_PROGRESS',  // May appear 1-3 times in flow
      ],

      // PIN Entry (optional based on card type and service code)
      // NFC: Almost never requires PIN (CVMLimit)
      // MAG: Optional (service code determines)
      // CHIP: Optional (online bypass possible)
      pin_entry: [
        'Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN',
        'Card_APP_EVENT_PIN_ENTERED',
      ],

      // DCC (Dynamic Currency Conversion) - ONLY for international cards
      // Condition: Card currency != Merchant currency AND DCC enabled
      dcc_flow: [
        'DCC_INFO_API_EVENT_REQ',
        'DCC_INFO_API_EVENT_RESP_SUCCESS',  // May fail, flow continues
        'DCC_OPTED',  // OR 'DCC_NOT_OPTED' (user choice)
      ],

      // Service Fee - ONLY for SALE/CASHBACK/SALE_CASHBACK transactions
      // Condition: isServiceFeeEnabled() && applicable service type
      service_fee: [
        'FETCH_SERVICE_FEE',
        'SHOW_SERVICE_FEE',
        'SERVICE_FEE_ACCEPTED',  // User must accept to proceed
      ],

      // Payment Confirmation (after online authorization)
      payment_confirm: [
        'PAYMENT_CONFIRM_API_REQUEST',
        'CARD_PAYMENT_API_EVENT_REQ_API_2.0_PAYMENT_CONFIRM',
        'PAYMENT_CONFIRM_API_RESPONSE_SUCCESS',
        'CARD_PAYMENT_API_EVENT_RESP_API_2.0_PAYMENT_CONFIRM',
      ],
    },

    POST_PAYMENT: [
      'CARD_AUTOMATE_PRINT_CHANRGESLIP',
      'CARD_print_status_check',
      'CARD_print_status_check_result',
      'print_status_check_failed',
      'print_receipt_failed',
    ],

    // Different success variations based on card type and conditions
    VARIATIONS: [
      {
        name: 'Minimal (MAG, No PIN, No DCC, No Service Fee)',
        description: 'MAG card swipe with service code allowing PIN bypass, domestic card',
        conditions: {
          cardType: 'MAG',
          pinRequired: false,
          isDccEligible: false,
          isServiceFeeApplicable: false,
        },
        events: [
          'CARD_PAYMENT_SELECTED',
          'TAP_SWIPE_DIP_CARD',
          'EMV_CARD_READ',
          'PREPARING_FOR_TXN',
          'CARD_PAYMENT_API_REQUEST',
          'CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD',
          'CARD_PAYMENT_API_RESPONSE_SUCCESS',
          'CARD_PAYMENT_API_EVENT_RESP_API_3.0_PAYMENT_CARD',
          'Create_TransactionResultActivity',
          'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
        ],
        expectedCount: 10,
      },
      {
        name: 'Standard (CHIP with PIN)',
        description: 'Standard domestic CHIP card transaction with PIN entry',
        conditions: {
          cardType: 'CHIP',
          pinRequired: true,
          isDccEligible: false,
          isServiceFeeApplicable: false,
        },
        events: [
          'CARD_PAYMENT_SELECTED',
          'TAP_SWIPE_DIP_CARD',
          'EMV_CARD_READ',
          'PREPARING_FOR_TXN',
          'TXN_IN_PROGRESS',
          'Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN',
          'Card_APP_EVENT_PIN_ENTERED',
          'CARD_PAYMENT_API_REQUEST',
          'CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD',
          'CARD_PAYMENT_API_RESPONSE_SUCCESS',
          'CARD_PAYMENT_API_EVENT_RESP_API_3.0_PAYMENT_CARD',
          'PAYMENT_CONFIRM_API_REQUEST',
          'CARD_PAYMENT_API_EVENT_REQ_API_2.0_PAYMENT_CONFIRM',
          'PAYMENT_CONFIRM_API_RESPONSE_SUCCESS',
          'CARD_PAYMENT_API_EVENT_RESP_API_2.0_PAYMENT_CONFIRM',
          'Create_TransactionResultActivity',
          'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
        ],
        expectedCount: 17,
      },
      {
        name: 'Maximum (International CHIP + PIN + DCC + Service Fee)',
        description: 'International card with all optional flows',
        conditions: {
          cardType: 'CHIP',
          pinRequired: true,
          isDccEligible: true,
          isServiceFeeApplicable: true,
        },
        events: [
          'CARD_PAYMENT_SELECTED',
          'TAP_SWIPE_DIP_CARD',
          'EMV_CARD_READ',
          'PREPARING_FOR_TXN',
          'FETCH_SERVICE_FEE',
          'SHOW_SERVICE_FEE',
          'SERVICE_FEE_ACCEPTED',
          'TXN_IN_PROGRESS',
          'DCC_INFO_API_EVENT_REQ',
          'DCC_INFO_API_EVENT_RESP_SUCCESS',
          'DCC_OPTED',
          'TXN_IN_PROGRESS',
          'Card_UI_EVENT_CARD_ENTER_PIN_SCREEN_SHOWN',
          'Card_APP_EVENT_PIN_ENTERED',
          'CARD_PAYMENT_API_REQUEST',
          'CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD',
          'CARD_PAYMENT_API_RESPONSE_SUCCESS',
          'CARD_PAYMENT_API_EVENT_RESP_API_3.0_PAYMENT_CARD',
          'PAYMENT_CONFIRM_API_REQUEST',
          'CARD_PAYMENT_API_EVENT_REQ_API_2.0_PAYMENT_CONFIRM',
          'PAYMENT_CONFIRM_API_RESPONSE_SUCCESS',
          'CARD_PAYMENT_API_EVENT_RESP_API_2.0_PAYMENT_CONFIRM',
          'Create_TransactionResultActivity',
          'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
        ],
        expectedCount: 24,
      },
      {
        name: 'NFC Contactless (No PIN)',
        description: 'Contactless payment below CVMLimit',
        conditions: {
          cardType: 'NFC',
          pinRequired: false,
          isDccEligible: false,
          isServiceFeeApplicable: false,
        },
        events: [
          'CARD_PAYMENT_SELECTED',
          'TAP_SWIPE_DIP_CARD',
          'EMV_CARD_READ',
          'PREPARING_FOR_TXN',
          'TXN_IN_PROGRESS',
          'CARD_PAYMENT_API_REQUEST',
          'CARD_PAYMENT_API_EVENT_REQ_API_3.0_PAYMENT_CARD',
          'CARD_PAYMENT_API_RESPONSE_SUCCESS',
          'CARD_PAYMENT_API_EVENT_RESP_API_3.0_PAYMENT_CARD',
          'Create_TransactionResultActivity',
          'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
        ],
        expectedCount: 11,
      },
    ],
  },

  /**
   * CASH Payment Flow
   *
   * Based on: Codebase analysis (/modules/payment/cash/Cash.svelte)
   * Key Insight: Customer auth and additional PIN are optional based on amount and config
   */
  CASH: {
    CRITICAL: [
      'cash_payment_screen_shown',
      'cash_payment_initiated',
      'API_REQUEST',
      'API_RESPONSE_SUCCESS',
      'CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],

    OPTIONAL: {
      // Customer authentication (PAN/Form 60)
      // Condition: customerAuthDataCaptureEnabled && amount >= authCutoffAmount
      customer_auth: [],  // No specific events, data sent in API payload

      // Additional PIN
      // Condition: addlAuthReqdForCash setting enabled
      additional_pin: [],  // No specific events, PIN sent in API payload
    },

    POST_PAYMENT: [
      'AUTOMATE_PRINT_CHANRGESLIP',
    ],
  },

  /**
   * CHEQUE Payment Flow
   *
   * Based on: Codebase analysis (/modules/payment/cash/Cheque.svelte)
   * Key Insight: No API call during payment (validation is local)
   */
  CHEQUE: {
    CRITICAL: [
      'cheque_payment_screen_shown',
      'cheque_payment_initiated',
      'cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],

    OPTIONAL: {},

    POST_PAYMENT: [
      'AUTOMATE_PRINT_CHANRGESLIP',
    ],
  },

  /**
   * DD (Demand Draft) Payment Flow
   *
   * Based on: Codebase analysis (/modules/payment/cash/DemandDraft.svelte)
   * Key Insight: Similar to CHEQUE but with API call and stricter validation
   */
  DD: {
    CRITICAL: [
      'dd_payment_screen_shown',
      'dd_payment_initiated',
      'API_REQUEST',
      'API_RESPONSE_SUCCESS',
      'DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],

    OPTIONAL: {},

    POST_PAYMENT: [
      'AUTOMATE_PRINT_CHANRGESLIP',
    ],
  },

  /**
   * EMI Payment Flow
   *
   * Based on: Codebase analysis (/modules/payment/emi/)
   * Key Insight: EMI selection happens BEFORE card entry, then flows to CARD payment
   */
  EMI: {
    CRITICAL: [
      'payment_initiated_card',
      'emi_plan_selection_page_viewed',
      'emi_plans_api_event_req',
      'emi_plans_api_event_resp_success',
      'emi_plan_bank_selected',
      'emi_tenure_selection_page_viewed',
      'emi_tenure_option_selected',
      'emi_proceed_button_tapped',
      // Then continues with CARD payment flow (with emiDetails in payload)
      'Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN',
      'Card_APP_EVENT_PIN_ENTERED',
      'CARD_PAYMENT_API_EVENT_REQ',
      'CARD_PAYMENT_API_EVENT_RESP_SUCCESS',
      'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],

    OPTIONAL: {
      // EMI validation
      emi_validation: [
        'emi_validation_api_event_req',
        'emi_validation_api_event_resp_success',
      ],

      // Full Swipe offers (currently disabled in code)
      full_swipe: [],
    },

    POST_PAYMENT: [],
  },

  /**
   * PAYLINK (CNP - Card Not Present) Payment Flow
   *
   * Based on: Codebase analysis (/modules/payment/paylink/)
   * Key Insight: Remote payment with 15-second delay before polling
   */
  PAYLINK: {
    CRITICAL: [
      'PAYLINK_INPUT_SCREEN_SHOWN',
      'PAYLINK_SEND_INITIATED',
      // Either success or failure (one of these two)
      // 'PAYLINK_SEND_SUCCESS' OR 'PAYLINK_SEND_FAILED'
    ],

    OPTIONAL: {
      // If send succeeds, polling begins after 15s delay
      successful_send: [
        'PAYLINK_SEND_SUCCESS',
        // Then polling events (see POLLING section)
        'PAYLINK_PAYMENT_SUCCESS',
        'CNP_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      ],

      // If send fails
      failed_send: [
        'PAYLINK_SEND_FAILED',
        'PAYLINK_RETRY_ATTEMPTED',  // If user retries
      ],

      // Other optional outcomes
      invalid_mobile: [
        'PAYLINK_INVALID_MOBILE',
      ],

      expired: [
        'PAYLINK_PAYMENT_EXPIRED',  // 900s timeout
      ],

      aborted: [
        'PAYLINK_PAYMENT_ABORTED',  // User cancelled
      ],
    },

    POLLING: {
      // Starts 15 seconds after PAYLINK_SEND_SUCCESS
      events: [
        'PAYLINK_POLL_STATUS_INITIATED',
      ],
      avgOccurrences: 1.0,  // Estimate
    },

    POST_PAYMENT: [
      'AUTOMATE_PRINT_CHANRGESLIP',
    ],
  },

  /**
   * CNP (Card Not Present) Payment Flow
   *
   * Similar to PAYLINK but without print
   */
  CNP: {
    CRITICAL: [
      'PAYLINK_INPUT_SCREEN_SHOWN',
      'PAYLINK_SEND_INITIATED',
    ],

    OPTIONAL: {
      successful_send: [
        'PAYLINK_SEND_SUCCESS',
        'PAYLINK_PAYMENT_SUCCESS',
        'CNP_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
      ],
    },

    POLLING: {
      events: [
        'PAYLINK_POLL_STATUS_INITIATED',
      ],
      avgOccurrences: 1.0,
    },

    POST_PAYMENT: [],
  },

  /**
   * WALLET Payment Flow
   *
   * Based on: Codebase analysis (/modules/payment/Wallet.svelte, /modules/payment/qr/)
   * Key Insight: Same QR mechanism as UPI, different endpoint
   */
  WALLET: {
    CRITICAL: [
      'qr_generation_started',
      'qr_api_success',
      'qr_page_viewed',
      'UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
    ],

    OPTIONAL: {
      // Optional UI event
      wallet_page: [
        'wallet_page_viewed',
      ],
    },

    POLLING: {
      events: [
        'UPI_API_EVENT_REQ_CHECK_STATUS',
        'UPI_API_EVENT_RESP_CHECK_STATUS',
      ],
      avgOccurrences: 1.0,
    },

    POST_PAYMENT: [],
  },

  /**
   * NCMC (National Common Mobility Card) Payment Flow
   *
   * Based on: Codebase analysis (/pages/menu/Ncmc.svelte, /lib/eze/card.ts)
   * Key Insight: Three distinct sub-flows (balance check, update, load)
   */
  NCMC: {
    CRITICAL: [],  // No single flow - see VARIATIONS

    OPTIONAL: {},

    POST_PAYMENT: [],

    VARIATIONS: [
      {
        name: 'Balance Check',
        description: 'NFC card read to check balance (no API call)',
        events: [
          'NCMC_BALANCE_CHECK_CLICKED',
          'NCMC_BALANCE_CHECK_SUCCESS',
        ],
        expectedCount: 2,
      },
      {
        name: 'Balance Update',
        description: 'Refresh balance from backend (amount = 0)',
        events: [
          'NCMC_BALANCE_UPDATE_CLICKED',
          'NCMC_BALANCE_UPDATE_API_EVENT_REQ',
          'NCMC_BALANCE_UPDATE_API_EVENT_RESP_SUCCESS',
        ],
        expectedCount: 3,
      },
      {
        name: 'Balance Load (CARD)',
        description: 'Topup via card payment',
        events: [
          'NCMC_BALANCE_LOAD_CARD_CLICKED',
          'NCMC_BALANCE_LOAD_CARD_API_EVENT_REQ',
          // Then continues with CARD payment flow
        ],
        expectedCount: 2,  // Plus CARD flow events
      },
      {
        name: 'Balance Load (CASH)',
        description: 'Topup via cash payment',
        events: [
          'NCMC_BALANCE_LOAD_CASH_CLICKED',
          'NCMC_BALANCE_LOAD_CASH_API_EVENT_REQ',
          // Then continues with CASH payment flow
        ],
        expectedCount: 2,  // Plus CASH flow events
      },
    ],
  },
};

/**
 * Get typical success flow for a payment type
 * @param {string} paymentType - Payment type (UPI, CARD, BQR, etc.)
 * @returns {Object} - Flow definition with CRITICAL/OPTIONAL/POLLING structure
 */
function getSuccessFlow(paymentType) {
  return SUCCESS_FLOWS[paymentType] || {
    CRITICAL: [],
    OPTIONAL: {},
    POLLING: {},
    POST_PAYMENT: [],
  };
}

/**
 * Get CRITICAL events for a payment type
 * @param {string} paymentType - Payment type
 * @returns {Array<string>} - Critical event names
 */
function getCriticalEvents(paymentType) {
  const flow = getSuccessFlow(paymentType);
  return flow.CRITICAL || [];
}

/**
 * Get expected event count for a payment type
 * Calculates: CRITICAL + POLLING (once) + POST_PAYMENT events
 * @param {string} paymentType - Payment type
 * @param {Object} options - Optional conditions for variations
 * @returns {number} - Number of expected events in successful transaction
 */
function getExpectedEventCount(paymentType, options = {}) {
  const flow = getSuccessFlow(paymentType);

  // If payment type has variations, try to find matching variation
  if (flow.VARIATIONS && flow.VARIATIONS.length > 0) {
    // For CARD, check if variation conditions match
    if (paymentType === 'CARD' && options.variation) {
      const variation = flow.VARIATIONS.find(v => v.name === options.variation);
      if (variation) {
        // Variation count + POST_PAYMENT events (printing always attempted)
        return variation.expectedCount + (flow.POST_PAYMENT || []).length;
      }
    }

    // For NCMC, return variation count
    if (paymentType === 'NCMC' && options.operation) {
      const variation = flow.VARIATIONS.find(v => v.name === options.operation);
      if (variation) {
        // Variation count includes operation-specific events only
        // POST_PAYMENT may not apply to all NCMC operations (balance check is local)
        return variation.expectedCount;
      }
    }
  }

  // Default calculation: CRITICAL + POLLING (counted once) + POST_PAYMENT
  // Note: Polling events are counted once here. Task 4 will multiply by avgOccurrences.
  let count = (flow.CRITICAL || []).length;

  // Add polling events (counted once, not multiplied)
  const polling = flow.POLLING || {};
  count += (polling.events || []).length;

  // Add post-payment events (always attempted in production)
  count += (flow.POST_PAYMENT || []).length;

  return count;
}

/**
 * Get polling events for a payment type
 * @param {string} paymentType - Payment type
 * @returns {Object} - Polling configuration {events, avgOccurrences}
 */
function getPollingEvents(paymentType) {
  const flow = getSuccessFlow(paymentType);
  return flow.POLLING || { events: [], avgOccurrences: 0 };
}

/**
 * Get average polling rounds for a payment type
 * @param {string} paymentType - Payment type
 * @returns {number} - Average number of polling rounds
 */
function getPollingAverage(paymentType) {
  const polling = getPollingEvents(paymentType);
  return polling.avgOccurrences || 0;
}

/**
 * Get post-payment events for a payment type
 * @param {string} paymentType - Payment type
 * @returns {Array<string>} - Post-payment event names
 */
function getPostPaymentEvents(paymentType) {
  const flow = getSuccessFlow(paymentType);
  return flow.POST_PAYMENT || [];
}

/**
 * Get optional events for a payment type
 * @param {string} paymentType - Payment type
 * @returns {Object} - Optional events by category
 */
function getOptionalEvents(paymentType) {
  const flow = getSuccessFlow(paymentType);
  return flow.OPTIONAL || {};
}

/**
 * Get all variations for a payment type
 * @param {string} paymentType - Payment type
 * @returns {Array<Object>} - Array of variation definitions
 */
function getVariations(paymentType) {
  const flow = getSuccessFlow(paymentType);
  return flow.VARIATIONS || [];
}

/**
 * Check if an event is a polling event
 * @param {string} eventName - Event name
 * @param {string} paymentType - Payment type
 * @returns {boolean} - True if event is a polling event
 */
function isPollingEvent(eventName, paymentType) {
  const polling = getPollingEvents(paymentType);
  return (polling.events || []).includes(eventName);
}

/**
 * Check if an event is a post-payment event
 * @param {string} eventName - Event name
 * @param {string} paymentType - Payment type
 * @returns {boolean} - True if event is post-payment
 */
function isPostPaymentEvent(eventName, paymentType) {
  const postPayment = getPostPaymentEvents(paymentType);
  return postPayment.includes(eventName);
}

module.exports = {
  SUCCESS_FLOWS,
  getSuccessFlow,
  getCriticalEvents,
  getExpectedEventCount,
  getPollingEvents,
  getPollingAverage,
  getPostPaymentEvents,
  getOptionalEvents,
  getVariations,
  isPollingEvent,
  isPostPaymentEvent,
};
