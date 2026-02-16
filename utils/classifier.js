/**
 * Classify drop reason with intelligent filtering
 * Excludes user-initiated cancellations and payment mode switches
 * @param {Object} flowAnalysis - Flow analysis result
 * @param {Array} events - Array of event objects
 * @returns {Object} - Drop classification
 */
function classifyDrop(flowAnalysis, events) {
  const eventNames = new Set(events.map(e => e.eventName));
  const { paymentType, missingCritical, hasSuccess, hasFailure, allEvents } =
    flowAnalysis;

  // ========================================
  // PRIORITY 0: Reprint Sessions (NOT a drop)
  // ========================================
  // Detect receipt reprint sessions - these are POST-PAYMENT activities
  // Characteristics:
  // 1. Has successful charge slip fetch (fetch_charge_slip_api_response with success=true)
  // 2. Has txnId in event properties (indicates payment already completed)
  // 3. No payment initiation events (payment_initiated_*)
  // 4. Has print-related events (BQR_print_receipt_button_clicked, etc.)

  const hasChargeSlipFetch = events.some(e =>
    e.eventName === 'fetch_charge_slip_api_response' &&
    e.properties?.success === true &&
    e.properties?.txnId  // Has a backend transaction ID
  );

  const hasPaymentInitiation = events.some(e =>
    e.eventName === 'payment_initiated_upi' ||
    e.eventName === 'payment_initiated_card' ||
    e.eventName === 'payment_initiated_bqr' ||
    e.eventName === 'cash_payment_initiated' ||
    e.eventName === 'payment_initiated_cheque' ||
    e.eventName === 'payment_initiated_dd' ||
    e.eventName === 'payment_initiated_emi' ||
    e.eventName === 'payment_initiated_paylink' ||
    e.eventName === 'payment_initiated_wallet' ||
    e.eventName === 'payment_initiated_ncmc'
  );

  const hasPrintEvents =
    eventNames.has('BQR_print_receipt_button_clicked') ||
    eventNames.has('UPI_print_receipt_button_clicked') ||
    eventNames.has('CARD_print_receipt_button_clicked') ||
    eventNames.has('BQR_THERMAL_PRINT_START') ||
    eventNames.has('CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_REQUEST');

  if (hasChargeSlipFetch && !hasPaymentInitiation && hasPrintEvents) {
    // Extract the backend txnId for reference
    const chargeSlipEvent = events.find(e =>
      e.eventName === 'fetch_charge_slip_api_response' &&
      e.properties?.success === true
    );
    const backendTxnId = chargeSlipEvent?.properties?.txnId || 'UNKNOWN';

    return {
      category: 'REPRINT_SESSION',
      isLegitimate: false,
      severity: 'INFO',
      reason: `Post-payment receipt reprint session (original payment: ${backendTxnId})`,
      details: {
        backendTxnId,
        hasChargeSlipFetch: true,
        hasPaymentInitiation: false,
        hasPrintEvents: true,
      },
    };
  }

  // ========================================
  // PRIORITY 1: User Cancellation (NOT a drop)
  // ========================================

  // Check for stop payment events (UPI/BQR/Paylink specific)
  const hasUPIStopPayment =
    eventNames.has('UPI_API_EVENT_REQ_STOP_PAYMENT') ||
    eventNames.has('UPI_API_EVENT_RESP_STOP_PAYMENT');

  const hasBQRStopPayment =
    eventNames.has('BQR_API_EVENT_REQ_STOP_PAYMENT') ||
    eventNames.has('BQR_API_EVENT_RESP_STOP_PAYMENT');

  const hasPayLinkStopPayment =
    eventNames.has('PAYLINK_API_EVENT_REQ_STOP_PAYMENT') ||
    eventNames.has('PAYLINK_API_EVENT_RESP_STOP_PAYMENT');

  const hasGenericStopPayment =
    eventNames.has('STOP_PAYMENT_API_REQUEST') ||
    eventNames.has('STOP_PAYMENT_API_RESPONSE_FAILED');

  // Check for card PIN abort (user cancelled PIN entry)
  const hasPinAbort = events.some(e =>
    e.eventName === 'EMV_ERR_RECEIVED' &&
    (e.properties?.errorCode === 'PIN_ABORTED' ||
     e.properties?.error === 'PIN_ABORTED' ||
     e.properties?.message === 'PIN_ABORTED')
  );

  // Check for navigation events (back/home button presses)
  const hasBackPress = eventNames.has('ON_BACK_PRESSED');
  const hasHomePress = eventNames.has('ON_HOME_PRESSED');

  // Navigation during payment (NOT after success/failure) = user cancellation
  // If user presses back/home AFTER success or failure screen, it's just dismissal (not cancellation)
  const isEarlyCancellation = (hasBackPress || hasHomePress) &&
    !hasSuccess &&   // Not after success screen
    !hasFailure;     // Not after failure screen

  if (eventNames.has('PAYMENT_CANCELLED') ||
      hasPinAbort ||
      hasUPIStopPayment ||
      hasBQRStopPayment ||
      hasPayLinkStopPayment ||
      hasGenericStopPayment ||
      isEarlyCancellation) {

    // Determine which stop payment method was used
    let stopMethod = 'back button';
    if (hasPinAbort) stopMethod = 'card PIN abort (user cancelled PIN entry)';
    if (hasUPIStopPayment) stopMethod = 'UPI stop payment';
    if (hasBQRStopPayment) stopMethod = 'BQR stop payment';
    if (hasPayLinkStopPayment) stopMethod = 'Paylink stop payment';
    if (hasBackPress && isEarlyCancellation) stopMethod = 'back button (navigation)';
    if (hasHomePress && isEarlyCancellation) stopMethod = 'home button (navigation)';

    return {
      category: 'USER_CANCELLATION',
      isLegitimate: false,
      severity: 'INFO',
      reason: `User cancelled the payment using ${stopMethod}`,
      details: {
        stopMethod,
        hasUPIStopPayment,
        hasBQRStopPayment,
        hasPayLinkStopPayment,
        hasGenericStopPayment,
        hasBackPress,
        hasHomePress,
        isEarlyCancellation,
      },
    };
  }

  // ========================================
  // PRIORITY 2: Payment Mode Switch (NOT a drop)
  // ========================================
  if (eventNames.has('PAYMENT_MODE_SWITCH')) {
    // Find the mode switch event to get from/to details
    const modeSwitchEvent = events.find(e => e.eventName === 'PAYMENT_MODE_SWITCH');
    const fromMode = modeSwitchEvent?.properties?.from || 'UNKNOWN';
    const toMode = modeSwitchEvent?.properties?.to || 'UNKNOWN';

    return {
      category: 'MODE_SWITCH',
      isLegitimate: false,
      severity: 'INFO',
      reason: `User switched payment method from ${fromMode} to ${toMode}`,
      details: {
        fromMode,
        toMode,
      },
    };
  }

  // ========================================
  // PRIORITY 3: Successful Payment (NOT a drop)
  // ========================================
  if (hasSuccess) {
    return {
      category: 'SUCCESS',
      isLegitimate: false,
      severity: 'INFO',
      reason: 'Payment completed successfully',
      details: {
        missingCritical: missingCritical.length > 0 ? missingCritical : undefined,
      },
    };
  }

  // ========================================
  // PRIORITY 4: Failed Payment (NOT a drop)
  // ========================================
  // If payment reached a failure screen, it's a legitimate failure, not a drop

  // Check for session expiry (user was logged out mid-transaction)
  const hasSessionExpiry = events.some(e =>
    e.eventName === 'API_SESSION_EXPIRY' ||
    (e.eventName === 'LOGOUT' && events.some(ev => ev.eventName.includes('_API_RESPONSE_FAILED')))
  );

  if (hasFailure || hasSessionExpiry) {
    // Find failure indicators that were present
    const failureEvents = events
      .filter(e =>
        e.eventName.includes('FAILURE_SCREEN_SHOWN') ||
        e.eventName.includes('_FAILURE') ||
        e.eventName.includes('_FAILED') ||
        e.eventName === 'API_SESSION_EXPIRY' ||
        e.eventName === 'APP_EXCEPTION'
      )
      .map(e => e.eventName);

    let reason = 'Payment failed and failure screen was shown';
    if (hasSessionExpiry) {
      reason = 'Payment failed due to session expiry (user was logged out mid-transaction)';
    }

    return {
      category: 'FAILURE',
      isLegitimate: false,
      severity: 'INFO',
      reason,
      details: {
        failureIndicatorsFound: failureEvents,
        hasSessionExpiry,
      },
    };
  }

  // ========================================
  // LEGITIMATE DROPS - UPI/BQR Specific
  // ========================================

  // ========================================
  // LEGITIMATE DROPS - UPI Specific
  // ========================================

  if (paymentType === 'UPI') {
    // QR Generation Drop
    if (eventNames.has('QR_GENERATION_STARTED')) {
      if (eventNames.has('QR_API_FAILURE')) {
        return {
          category: 'QR_GENERATION_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'QR generation API call failed',
          details: {
            failedAt: 'QR_API_FAILURE',
          },
        };
      }

      if (!eventNames.has('QR_API_SUCCESS')) {
        return {
          category: 'QR_GENERATION_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'QR generation started but never received success response',
          details: {
            missing: 'QR_API_SUCCESS',
          },
        };
      }
    }

    // QR Display Drop
    if (eventNames.has('QR_API_SUCCESS') && !eventNames.has('UPI_QR_SHOWN')) {
      return {
        category: 'QR_DISPLAY_DROP',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'QR generated successfully but never displayed to user',
        details: {
          missing: 'UPI_QR_SHOWN',
        },
      };
    }

    // Status Polling Drop
    if (eventNames.has('UPI_QR_SHOWN')) {
      const hasStatusResponse = eventNames.has('UPI_API_RESP_CHECK_STATUS');

      if (!hasStatusResponse) {
        return {
          category: 'STATUS_POLLING_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'QR shown but status polling never started or received no response',
          details: {
            missing: 'UPI_API_RESP_CHECK_STATUS',
          },
        };
      }

      // Check if status polling returned failure
      const statusEvents = events.filter(e => e.eventName === 'UPI_API_RESP_CHECK_STATUS');
      const failedStatus = statusEvents.find(e => e.properties?.status === 'FAILED');

      if (failedStatus) {
        return {
          category: 'STATUS_POLLING_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'Status polling returned FAILED status',
          details: {
            failureReason: failedStatus.properties?.errorMessage || 'Unknown',
          },
        };
      }
    }

    // Authorization Drop (CRITICAL)
    if (
      eventNames.has('UPI_QR_SHOWN') &&
      !eventNames.has('UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION')
    ) {
      // Check if timeout occurred
      if (eventNames.has('PAYMENT_TIMEOUT')) {
        return {
          category: 'TIMEOUT',
          isLegitimate: true,
          severity: 'MEDIUM',
          reason: 'Payment timed out after 300 seconds (QR expired)',
          details: {
            timeoutDuration: 300,
          },
        };
      }

      // True authorization drop - payment may have succeeded but notification lost
      return {
        category: 'AUTHORIZATION_DROP',
        isLegitimate: true,
        severity: 'CRITICAL',
        reason:
          'QR shown and status polling started, but never received payment authorization notification. Payment may have succeeded but notification was lost.',
        details: {
          missing: 'UPI_PAY_AUTHORIZED_PAYMENT_NOTIFICATION',
          hasStatusPolling: eventNames.has('UPI_API_RESP_CHECK_STATUS'),
        },
      };
    }
  }

  // ========================================
  // LEGITIMATE DROPS - BQR Specific
  // ========================================

  if (paymentType === 'BQR') {
    // QR Generation Drop
    if (eventNames.has('payment_initiated_upi')) {
      if (eventNames.has('WALLET_QR_GENERATE_API_RESPONSE_FAILED')) {
        return {
          category: 'QR_GENERATION_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'BQR QR generation API call failed',
          details: {
            failedAt: 'WALLET_QR_GENERATE_API_RESPONSE_FAILED',
          },
        };
      }

      if (!eventNames.has('WALLET_QR_GENERATE_API_RESPONSE_SUCCESS')) {
        return {
          category: 'QR_GENERATION_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'BQR QR generation started but never received success response',
          details: {
            missing: 'WALLET_QR_GENERATE_API_RESPONSE_SUCCESS',
          },
        };
      }
    }

    // QR Display Drop
    if (
      eventNames.has('WALLET_QR_GENERATE_API_RESPONSE_SUCCESS') &&
      !eventNames.has('BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN')
    ) {
      return {
        category: 'QR_DISPLAY_DROP',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'BQR QR generated successfully but never displayed to user',
        details: {
          missing: 'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN',
        },
      };
    }

    // Status Polling Drop
    if (eventNames.has('BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN')) {
      const hasStatusResponse = eventNames.has('UPI_API_EVENT_RESP_CHECK_STATUS');

      if (!hasStatusResponse) {
        return {
          category: 'STATUS_POLLING_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'BQR QR shown but status polling never started or received no response',
          details: {
            missing: 'UPI_API_EVENT_RESP_CHECK_STATUS',
          },
        };
      }

      // Check if status polling returned failure
      const statusEvents = events.filter(e => e.eventName === 'UPI_API_EVENT_RESP_CHECK_STATUS');
      const failedStatus = statusEvents.find(e => e.properties?.status === 'FAILED');

      if (failedStatus) {
        return {
          category: 'STATUS_POLLING_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'BQR status polling returned FAILED status',
          details: {
            failureReason: failedStatus.properties?.errorMessage || 'Unknown',
          },
        };
      }
    }

    // Check if timeout occurred
    if (eventNames.has('PAYMENT_TIMEOUT')) {
      return {
        category: 'TIMEOUT',
        isLegitimate: true,
        severity: 'MEDIUM',
        reason: 'BQR payment timed out (QR expired)',
        details: {
          timeoutDuration: 300,
        },
      };
    }
  }

  // ========================================
  // LEGITIMATE DROPS - CARD Specific
  // ========================================

  if (paymentType === 'CARD') {
    // Card tap/swipe screen shown but PIN entry never happened
    if (
      eventNames.has('Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN') &&
      !eventNames.has('Card_APP_EVENT_PIN_ENTERED')
    ) {
      return {
        category: 'CARD_PIN_DROP',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'Card detected but PIN was never entered',
        details: {
          missing: 'Card_APP_EVENT_PIN_ENTERED',
        },
      };
    }

    // PIN entered but API call never made
    if (
      eventNames.has('Card_APP_EVENT_PIN_ENTERED') &&
      !eventNames.has('CARD_PAYMENT_API_EVENT_REQ')
    ) {
      return {
        category: 'CARD_API_DROP',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'PIN entered but payment API was never called',
        details: {
          missing: 'CARD_PAYMENT_API_EVENT_REQ',
        },
      };
    }

    // API request made but no response
    if (
      eventNames.has('CARD_PAYMENT_API_EVENT_REQ') &&
      !eventNames.has('CARD_PAYMENT_API_EVENT_RESP')
    ) {
      return {
        category: 'CARD_API_RESPONSE_DROP',
        isLegitimate: true,
        severity: 'CRITICAL',
        reason: 'Payment API request sent but never received response',
        details: {
          missing: 'CARD_PAYMENT_API_EVENT_RESP',
        },
      };
    }

    // EMV failure
    if (eventNames.has('EMV_FAILURE')) {
      return {
        category: 'EMV_FAILURE',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'EMV transaction processing failed',
      };
    }

    // Card payment API failure
    if (eventNames.has('CARD_PAYMENT_API_EVENT_RESP_FAILURE')) {
      return {
        category: 'CARD_PAYMENT_FAILURE',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'Card payment API returned failure response',
      };
    }
  }

  // ========================================
  // LEGITIMATE DROPS - CASH Specific
  // ========================================

  if (paymentType === 'CASH') {
    // Cash payment initiated but no success/failure
    if (
      eventNames.has('cash_payment_initiated') &&
      !eventNames.has('CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN') &&
      !eventNames.has('CASH_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN')
    ) {
      return {
        category: 'CASH_COMPLETION_DROP',
        isLegitimate: true,
        severity: 'MEDIUM',
        reason: 'Cash payment initiated but completion screen never shown',
        details: {
          missing: 'CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
        },
      };
    }
  }

  // ========================================
  // LEGITIMATE DROPS - CHEQUE Specific
  // ========================================

  if (paymentType === 'CHEQUE') {
    // Cheque payment initiated but no success/failure
    if (
      eventNames.has('cheque_payment_initiated') &&
      !eventNames.has('cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN') &&
      !eventNames.has('cheque_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN')
    ) {
      return {
        category: 'CHEQUE_COMPLETION_DROP',
        isLegitimate: true,
        severity: 'MEDIUM',
        reason: 'Cheque payment initiated but completion screen never shown',
        details: {
          missing: 'cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
        },
      };
    }
  }

  // ========================================
  // LEGITIMATE DROPS - DD (Demand Draft) Specific
  // ========================================

  if (paymentType === 'DD') {
    // DD payment initiated but no success/failure
    if (
      eventNames.has('dd_payment_initiated') &&
      !eventNames.has('DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN') &&
      !eventNames.has('DD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN')
    ) {
      return {
        category: 'DD_COMPLETION_DROP',
        isLegitimate: true,
        severity: 'MEDIUM',
        reason: 'Demand Draft payment initiated but completion screen never shown',
        details: {
          missing: 'DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN',
        },
      };
    }
  }

  // ========================================
  // LEGITIMATE DROPS - PAYLINK/CNP Specific
  // ========================================

  if (paymentType === 'PAYLINK' || paymentType === 'CNP') {
    // Paylink send initiated but never succeeded
    if (
      eventNames.has('PAYLINK_SEND_INITIATED') &&
      !eventNames.has('PAYLINK_SEND_SUCCESS')
    ) {
      return {
        category: 'PAYLINK_SEND_DROP',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'Paylink send initiated but never succeeded',
        details: {
          missing: 'PAYLINK_SEND_SUCCESS',
          hasFailed: eventNames.has('PAYLINK_SEND_FAILED'),
        },
      };
    }

    // Paylink sent successfully but no payment status
    if (
      eventNames.has('PAYLINK_SEND_SUCCESS') &&
      !eventNames.has('PAYLINK_PAYMENT_SUCCESS') &&
      !eventNames.has('PAYLINK_PAYMENT_EXPIRED') &&
      !eventNames.has('PAYLINK_PAYMENT_ABORTED')
    ) {
      return {
        category: 'PAYLINK_STATUS_DROP',
        isLegitimate: true,
        severity: 'MEDIUM',
        reason: 'Paylink sent successfully but payment status never received',
        details: {
          missing: 'Payment status (success/expired/aborted)',
        },
      };
    }
  }

  // ========================================
  // LEGITIMATE DROPS - EMI Specific
  // ========================================

  if (paymentType === 'EMI') {
    // EMI plan selection shown but never proceeded
    if (
      eventNames.has('emi_plan_selection_page_viewed') &&
      !eventNames.has('emi_proceed_button_tapped')
    ) {
      return {
        category: 'EMI_SELECTION_DROP',
        isLegitimate: true,
        severity: 'MEDIUM',
        reason: 'EMI plan selection viewed but user never proceeded',
        details: {
          missing: 'emi_proceed_button_tapped',
        },
      };
    }

    // EMI validation API request but no response
    if (
      eventNames.has('emi_validation_api_event_req') &&
      !eventNames.has('emi_validation_api_event_resp_success') &&
      !eventNames.has('emi_validation_api_event_resp_failure')
    ) {
      return {
        category: 'EMI_VALIDATION_DROP',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'EMI validation API request sent but no response received',
        details: {
          missing: 'emi_validation_api_event_resp',
        },
      };
    }
  }

  // ========================================
  // LEGITIMATE DROPS - NCMC Specific
  // ========================================

  if (paymentType === 'NCMC') {
    // Balance load API request but no response
    if (
      eventNames.has('NCMC_BALANCE_LOAD_CARD_API_EVENT_REQ') &&
      !eventNames.has('NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP_SUCCESS') &&
      !eventNames.has('NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP_FAILURE')
    ) {
      return {
        category: 'NCMC_LOAD_DROP',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'NCMC balance load API request sent but no response received',
        details: {
          missing: 'NCMC_BALANCE_LOAD_CARD_API_EVENT_RESP',
        },
      };
    }
  }

  // ========================================
  // GENERIC TIMEOUT
  // ========================================

  if (eventNames.has('PAYMENT_TIMEOUT')) {
    return {
      category: 'TIMEOUT',
      isLegitimate: true,
      severity: 'MEDIUM',
      reason: 'Payment timed out',
    };
  }

  // ========================================
  // GENERIC FAILURE
  // ========================================

  if (eventNames.has('PAYMENT_FAILURE')) {
    const failureEvent = events.find(e => e.eventName === 'PAYMENT_FAILURE');
    return {
      category: 'PAYMENT_FAILURE',
      isLegitimate: true,
      severity: 'HIGH',
      reason: 'Payment failed',
      details: {
        errorMessage: failureEvent?.properties?.errorMessage || 'Unknown error',
      },
    };
  }

  // ========================================
  // UNKNOWN DROP
  // ========================================

  // If we reach here, it's an incomplete flow without explicit failure
  if (missingCritical.length > 0) {
    return {
      category: 'UNKNOWN_DROP',
      isLegitimate: true,
      severity: 'MEDIUM',
      reason: `Payment flow incomplete. Missing critical events: ${missingCritical.join(', ')}`,
      details: {
        missingCritical,
      },
    };
  }

  // ========================================
  // NO ISSUE DETECTED
  // ========================================

  return {
    category: 'NO_ISSUE',
    isLegitimate: false,
    severity: 'INFO',
    reason: 'No issues detected',
  };
}

module.exports = {
  classifyDrop,
};
