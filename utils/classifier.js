/**
 * Classify drop reason with intelligent filtering
 * Excludes user-initiated cancellations and payment mode switches
 * @param {Object} flowAnalysis - Flow analysis result
 * @param {Array} events - Array of event objects
 * @param {Object} nextSequenceContext - Optional context about the next sequence from same device
 * @returns {Object} - Drop classification
 */
function classifyDrop(flowAnalysis, events, nextSequenceContext = null) {
  const eventNames = new Set(events.map(e => e.eventName));
  const { paymentType, missingCritical, hasSuccess, hasFailure, allEvents } =
    flowAnalysis;

  // ========================================
  // PRIORITY 0: Non-Payment Sessions (NOT drops)
  // ========================================

  // PRIORITY 0-PRE-1: SDK Input/Output Sessions
  // These are SDK callback/response events when POS is used as SDK by another app
  // Characteristics:
  // 1. Has SDK_INPUT or SDK_OUTPUT events
  // 2. No payment initiation or completion
  // 3. Often just print events + SDK events
  // 4. Very short sequences (< 10 events)

  const hasSDKEvents = events.some(e =>
    e.eventName === 'SDK_INPUT' ||
    e.eventName === 'SDK_OUTPUT' ||
    e.eventName === 'SDK_MPOS_FUNCTIONS_STATUS'
  );

  const hasPaymentCompletionScreen = events.some(e =>
    e.eventName.includes('SUCCESS_SCREEN_SHOWN') ||
    e.eventName.includes('FAILURE_SCREEN_SHOWN')
  );

  if (hasSDKEvents && !hasPaymentCompletionScreen && events.length < 10) {
    return {
      category: 'SDK_SESSION',
      isLegitimate: false,
      severity: 'INFO',
      reason: 'SDK input/output session (POS app used as SDK by another application, not a direct payment attempt)',
      details: {
        hasSDKEvents: true,
        hasPaymentCompletionScreen: false,
        eventCount: events.length,
      },
    };
  }

  // PRIORITY 0-PRE-2: MQTT P2P Communication Sessions
  // These are peer-to-peer payment communication events (not actual payment attempts)
  // Characteristics:
  // 1. Has MQTT P2P events (message received, acknowledgement sent, handle request)
  // 2. May have API calls but no actual payment UI completion
  // 3. These are communication/synchronization events between devices

  const hasMQTTP2PEvents = events.some(e =>
    e.eventName === 'MQTT_MESSAGE_RECEIVED_TO_WEB' ||
    e.eventName === 'MQTT_P2P_MESSAGE_RECEIVED' ||
    e.eventName === 'MQTT_P2P_ACKNOWLEDGEMENT_SENT' ||
    e.eventName === 'MQTT_P2P_HANDLE_PAYMENT_REQUEST' ||
    e.eventName === 'EMIT_MQTT_P2P_PAYMENT' ||
    e.eventName === 'EMIT_MQTT_P2P_CANCELLATION'
  );

  // Check if this is primarily an MQTT communication session
  // (MQTT events present, no payment completion screens shown)
  if (hasMQTTP2PEvents && !hasPaymentCompletionScreen) {
    // Count MQTT events vs total events to determine if this is primarily MQTT
    const mqttEventCount = events.filter(e =>
      e.eventName.startsWith('MQTT_') ||
      e.eventName.includes('MQTT')
    ).length;

    const mqttRatio = mqttEventCount / events.length;

    // If more than 20% of events are MQTT, consider this an MQTT session
    if (mqttRatio > 0.2 || mqttEventCount >= 3) {
      return {
        category: 'MQTT_P2P_SESSION',
        isLegitimate: false,
        severity: 'INFO',
        reason: 'MQTT P2P communication session (peer-to-peer payment communication/synchronization, not a payment attempt on this device)',
        details: {
          hasMQTTP2PEvents: true,
          mqttEventCount,
          totalEvents: events.length,
          mqttRatio: (mqttRatio * 100).toFixed(1) + '%',
        },
      };
    }
  }

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

  // PRIORITY 0A: Reprint/Print Sessions
  // Detect receipt reprint/print sessions - these are POST-PAYMENT activities
  // Two patterns:
  // Pattern A: Charge slip fetch + print (full reprint flow)
  // Pattern B: Print events + navigation without payment initiation (print after payment)

  const hasChargeSlipFetch = events.some(e =>
    e.eventName === 'fetch_charge_slip_api_response' &&
    e.properties?.success === true &&
    e.properties?.txnId  // Has a backend transaction ID
  );

  const hasPrintEvents =
    eventNames.has('BQR_print_receipt_button_clicked') ||
    eventNames.has('UPI_print_receipt_button_clicked') ||
    eventNames.has('CARD_print_receipt_button_clicked') ||
    eventNames.has('BQR_THERMAL_PRINT_START') ||
    eventNames.has('CHARGE_SLIP_RECEIPT_IMAGE_FETCH_API_REQUEST') ||
    eventNames.has('BQR_print_status_result') ||
    eventNames.has('UPI_print_status_result') ||
    eventNames.has('CARD_print_status_result');

  // Pattern A: Full reprint with charge slip fetch
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

  // Pattern B: Print + navigation without payment (printing completed payment's receipt)
  // Characteristics:
  // 1. Has print events (THERMAL_PRINT_START, print_status_result)
  // 2. No payment initiation events
  // 3. Has navigation to new payment (amount_screen_shown, button_menu_collect_payment)
  // 4. Very short sequence (< 10 events)
  const hasPrintNavigation =
    eventNames.has('button_menu_collect_payment') ||
    eventNames.has('amount_screen_shown');

  if (hasPrintEvents && !hasPaymentInitiation && hasPrintNavigation && events.length < 10) {
    const printStatusEvent = events.find(e =>
      e.eventName === 'BQR_print_status_result' ||
      e.eventName === 'UPI_print_status_result' ||
      e.eventName === 'CARD_print_status_result'
    );
    const printStatus = printStatusEvent?.properties?.status || 'unknown';

    return {
      category: 'PRINT_AND_NAVIGATE_SESSION',
      isLegitimate: false,
      severity: 'INFO',
      reason: `Post-payment print and navigation session (print status: ${printStatus}, then navigating to new payment)`,
      details: {
        hasPrintEvents: true,
        hasPaymentInitiation: false,
        hasPrintNavigation: true,
        printStatus,
        eventCount: events.length,
      },
    };
  }

  // PRIORITY 0B: Status Check / Navigation Sessions
  // Detect post-payment status checks and navigation - NOT actual payment attempts
  // Characteristics:
  // 1. Has status check events with AUTHORIZED status
  // 2. No payment initiation events (payment_initiated_*)
  // 3. Has navigation events (button_menu_collect_payment, amount_screen_shown)
  // 4. Typically very short sequences (< 10 events)

  const hasStatusCheckWithAuthorized = events.some(e =>
    (e.eventName === 'UPI_API_EVENT_RESP_CHECK_STATUS' ||
     e.eventName === 'PAYMENT_STATUS_API_RESPONSE_SUCCESS' ||
     e.eventName === 'CARD_API_EVENT_RESP_CHECK_STATUS') &&
    (e.properties?.status === 'AUTHORIZED' || e.properties?.status === 'SUCCESS')
  );

  const hasNavigationToNewPayment =
    eventNames.has('button_menu_collect_payment') ||
    eventNames.has('amount_screen_shown');

  // Check if this is a status check of an already completed payment with navigation
  if (hasStatusCheckWithAuthorized && !hasPaymentInitiation && hasNavigationToNewPayment && events.length < 10) {
    return {
      category: 'STATUS_CHECK_SESSION',
      isLegitimate: false,
      severity: 'INFO',
      reason: 'Post-payment status check and navigation session (checking completed payment, not a new payment attempt)',
      details: {
        hasStatusCheckWithAuthorized: true,
        hasPaymentInitiation: false,
        hasNavigationToNewPayment: true,
        eventCount: events.length,
      },
    };
  }

  // PRIORITY 0C: Orphaned Status Polling Sessions
  // Detect status polling fragments that are NOT part of an actual payment flow
  // These are remnants of crashed sessions, background polling, or checking external payments
  // Characteristics:
  // 1. ONLY has status check API events (req/resp)
  // 2. No payment initiation events
  // 3. No QR shown events
  // 4. No payment screen events
  // 5. Usually very short (< 15 events)

  const hasStatusCheckEvents = events.some(e =>
    e.eventName === 'UPI_API_EVENT_REQ_CHECK_STATUS' ||
    e.eventName === 'UPI_API_EVENT_RESP_CHECK_STATUS' ||
    e.eventName === 'PAYMENT_STATUS_API_REQUEST' ||
    e.eventName === 'PAYMENT_STATUS_API_RESPONSE_SUCCESS' ||
    e.eventName === 'PAYMENT_STATUS_API_RESPONSE_FAILED' ||
    e.eventName === 'CARD_API_EVENT_REQ_CHECK_STATUS' ||
    e.eventName === 'CARD_API_EVENT_RESP_CHECK_STATUS'
  );

  const hasPaymentUIEvents = events.some(e =>
    e.eventName.includes('QR_SHOWN') ||
    e.eventName.includes('SCREEN_SHOWN') ||
    e.eventName.includes('_UI_EVENT_') ||
    e.eventName.includes('payment_initiated') ||
    e.eventName.includes('PAYMENT_SELECTED')
  );

  // Check if this is ONLY status polling without any actual payment UI
  if (hasStatusCheckEvents && !hasPaymentInitiation && !hasPaymentUIEvents && events.length < 15) {
    // Check if status is PENDING or AUTHORIZED (checking ongoing/completed payment)
    const statusEvent = events.find(e =>
      e.eventName === 'UPI_API_EVENT_RESP_CHECK_STATUS' ||
      e.eventName === 'CARD_API_EVENT_RESP_CHECK_STATUS'
    );
    const status = statusEvent?.properties?.status;

    return {
      category: 'ORPHANED_STATUS_POLLING',
      isLegitimate: false,
      severity: 'INFO',
      reason: `Orphaned status polling session (checking ${status || 'unknown'} payment, no actual payment flow in this sequence)`,
      details: {
        hasStatusCheckEvents: true,
        hasPaymentInitiation: false,
        hasPaymentUIEvents: false,
        eventCount: events.length,
        status: status || 'unknown',
      },
    };
  }

  // ========================================
  // PRIORITY 1: Cross-Sequence User Action (NOT a drop)
  // ========================================
  // Check if user action happened in the NEXT sequence (different sequence ID)
  // This handles cases where:
  // - User presses home/back button which creates a new sequence ID
  // - User switches payment mode which creates a new sequence ID
  // - User cancels payment which creates a new sequence ID
  // These show up as separate sequences but happen immediately after (within seconds)

  if (nextSequenceContext) {
    const { sequenceId, timeDiffMs, events: nextEvents } = nextSequenceContext;

    // Only consider if next sequence starts within 15 seconds
    if (timeDiffMs <= 15000) {
      const nextEventNames = new Set(nextEvents.map(e => e.eventName));

      // Check for user action indicators in the next sequence
      const hasModeSwitchInNext = nextEventNames.has('PAYMENT_MODE_SWITCH');
      const hasBackPressInNext = nextEventNames.has('ON_BACK_PRESSED');
      const hasHomePressInNext = nextEventNames.has('ON_HOME_PRESSED');
      const hasCancellationInNext = nextEventNames.has('PAYMENT_CANCELLED') ||
                                     nextEventNames.has('CARD_PAYMENT_CANCELLED');
      const hasP2PCancellationInNext = nextEventNames.has('EMIT_MQTT_P2P_CANCELLATION');
      const hasEMICancellationInNext = nextEventNames.has('emi_error_cancel_payment_tapped');
      const hasStopPaymentInNext = nextEventNames.has('UPI_API_EVENT_REQ_STOP_PAYMENT') ||
                                    nextEventNames.has('UPI_API_EVENT_RESP_STOP_PAYMENT') ||
                                    nextEventNames.has('BQR_API_EVENT_REQ_STOP_PAYMENT') ||
                                    nextEventNames.has('BQR_API_EVENT_RESP_STOP_PAYMENT') ||
                                    nextEventNames.has('PAYLINK_API_EVENT_REQ_STOP_PAYMENT') ||
                                    nextEventNames.has('PAYLINK_API_EVENT_RESP_STOP_PAYMENT') ||
                                    nextEventNames.has('STOP_PAYMENT_API_REQUEST') ||
                                    nextEventNames.has('STOP_PAYMENT_API_RESPONSE_FAILED');

      if (hasModeSwitchInNext) {
        // Find the mode switch event to get from/to details
        const modeSwitchEvent = nextEvents.find(e => e.eventName === 'PAYMENT_MODE_SWITCH');
        const fromMode = modeSwitchEvent?.properties?.from || paymentType || 'UNKNOWN';
        const toMode = modeSwitchEvent?.properties?.to || 'UNKNOWN';

        return {
          category: 'CROSS_SEQUENCE_MODE_SWITCH',
          isLegitimate: false,
          severity: 'INFO',
          reason: `User switched payment method from ${fromMode} to ${toMode} (detected in next sequence ${sequenceId}, ${(timeDiffMs / 1000).toFixed(2)}s later)`,
          details: {
            fromMode,
            toMode,
            nextSequenceId: sequenceId,
            timeDiffMs,
          },
        };
      }

      if (hasBackPressInNext || hasHomePressInNext || hasCancellationInNext ||
          hasP2PCancellationInNext || hasEMICancellationInNext || hasStopPaymentInNext) {

        let action = 'navigation';
        if (hasBackPressInNext) action = 'back button';
        if (hasHomePressInNext) action = 'home button';
        if (hasCancellationInNext) action = 'cancellation';
        if (hasP2PCancellationInNext) action = 'P2P cancellation';
        if (hasEMICancellationInNext) action = 'EMI error cancel button';
        if (hasStopPaymentInNext) action = 'stop payment API';

        return {
          category: 'CROSS_SEQUENCE_USER_CANCELLATION',
          isLegitimate: false,
          severity: 'INFO',
          reason: `User cancelled payment using ${action} (detected in next sequence ${sequenceId}, ${(timeDiffMs / 1000).toFixed(2)}s later)`,
          details: {
            action,
            nextSequenceId: sequenceId,
            timeDiffMs,
            hasBackPress: hasBackPressInNext,
            hasHomePress: hasHomePressInNext,
            hasCancellation: hasCancellationInNext,
            hasP2PCancellation: hasP2PCancellationInNext,
            hasEMICancellation: hasEMICancellationInNext,
            hasStopPayment: hasStopPaymentInNext,
          },
        };
      }
    }
  }

  // ========================================
  // PRIORITY 2: User Cancellation (NOT a drop)
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

  // Check for P2P (peer-to-peer) payment cancellation
  const hasP2PCancellation = eventNames.has('EMIT_MQTT_P2P_CANCELLATION');

  // Check for EMI user cancellation (user explicitly tapped cancel after seeing error)
  const hasEMIUserCancellation = eventNames.has('emi_error_cancel_payment_tapped');

  // Navigation during payment (NOT after success/failure) = user cancellation
  // If user presses back/home AFTER success or failure screen, it's just dismissal (not cancellation)
  const isEarlyCancellation = (hasBackPress || hasHomePress) &&
    !hasSuccess &&   // Not after success screen
    !hasFailure;     // Not after failure screen

  if (eventNames.has('PAYMENT_CANCELLED') ||
      eventNames.has('CARD_PAYMENT_CANCELLED') ||
      hasPinAbort ||
      hasUPIStopPayment ||
      hasBQRStopPayment ||
      hasPayLinkStopPayment ||
      hasGenericStopPayment ||
      hasP2PCancellation ||
      hasEMIUserCancellation ||
      isEarlyCancellation) {

    // Determine which stop payment method was used
    let stopMethod = 'back button';
    if (hasPinAbort) stopMethod = 'card PIN abort (user cancelled PIN entry)';
    if (hasUPIStopPayment) stopMethod = 'UPI stop payment';
    if (hasBQRStopPayment) stopMethod = 'BQR stop payment';
    if (hasPayLinkStopPayment) stopMethod = 'Paylink stop payment';
    if (hasP2PCancellation) stopMethod = 'P2P payment cancellation';
    if (hasEMIUserCancellation) stopMethod = 'EMI error cancel button (user cancelled after error)';
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
        hasP2PCancellation,
        hasEMIUserCancellation,
        hasBackPress,
        hasHomePress,
        isEarlyCancellation,
      },
    };
  }

  // ========================================
  // PRIORITY 3: Payment Mode Switch (NOT a drop)
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
  // PRIORITY 4: Successful Payment (NOT a drop)
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
  // PRIORITY 5: Failed Payment (NOT a drop)
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
    // Check both generic qr_api_* events and UPI-specific UPI_QR_GENERATE_API_* events
    const hasQRGenerationStarted = eventNames.has('qr_generation_started') ||
                                    eventNames.has('UPI_QR_GENERATE_API_REQUEST');
    const hasQRGenerationFailed = eventNames.has('qr_api_failure') ||
                                   eventNames.has('UPI_QR_GENERATE_API_RESPONSE_FAILED');
    const hasQRGenerationSuccess = eventNames.has('qr_api_success') ||
                                    eventNames.has('UPI_QR_GENERATE_API_RESPONSE_SUCCESS');

    if (hasQRGenerationStarted) {
      if (hasQRGenerationFailed) {
        return {
          category: 'QR_GENERATION_DROP',
          isLegitimate: false,
          severity: 'INFO',
          reason: 'UPI QR generation API call failed (usually due to user network error)',
          details: {
            failedAt: eventNames.has('qr_api_failure') ? 'qr_api_failure' : 'UPI_QR_GENERATE_API_RESPONSE_FAILED',
            userError: true,
            errorType: 'network',
          },
        };
      }

      if (!hasQRGenerationSuccess) {
        return {
          category: 'QR_GENERATION_DROP',
          isLegitimate: false,
          severity: 'INFO',
          reason: 'UPI QR generation started but never received success response (usually due to user network error)',
          details: {
            missing: 'qr_api_success or UPI_QR_GENERATE_API_RESPONSE_SUCCESS',
            userError: true,
            errorType: 'network',
          },
        };
      }
    }

    // QR Display Drop
    const hasUPIQRShown = eventNames.has('UPI_QR_SHOWN') ||
                          eventNames.has('UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN');

    if (hasQRGenerationSuccess && !hasUPIQRShown) {
      return {
        category: 'QR_DISPLAY_DROP',
        isLegitimate: false,
        severity: 'INFO',
        reason: 'UPI QR generated successfully but never displayed to user (usually user error or navigation)',
        details: {
          missing: 'UPI_QR_SHOWN or UPI_UI_EVENT_UPI_QR_SCREEN_SHOWN',
          userError: true,
        },
      };
    }

    // Status Polling Drop
    if (hasUPIQRShown) {
      const hasStatusResponse = eventNames.has('UPI_API_EVENT_RESP_CHECK_STATUS') ||
                                 eventNames.has('UPI_API_RESP_CHECK_STATUS') ||
                                 eventNames.has('PAYMENT_STATUS_API_RESPONSE_SUCCESS');

      if (!hasStatusResponse) {
        return {
          category: 'STATUS_POLLING_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'UPI QR shown but status polling never started or received no response',
          details: {
            missing: 'UPI_API_EVENT_RESP_CHECK_STATUS or PAYMENT_STATUS_API_RESPONSE_SUCCESS',
          },
        };
      }

      // Check if status polling returned failure
      const statusEvents = events.filter(e =>
        e.eventName === 'UPI_API_EVENT_RESP_CHECK_STATUS' ||
        e.eventName === 'UPI_API_RESP_CHECK_STATUS'
      );
      const failedStatus = statusEvents.find(e => e.properties?.status === 'FAILED');

      if (failedStatus) {
        return {
          category: 'STATUS_POLLING_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'UPI status polling returned FAILED status',
          details: {
            failureReason: failedStatus.properties?.errorMessage || 'Unknown',
          },
        };
      }
    }

    // Authorization Drop (CRITICAL)
    if (
      hasUPIQRShown &&
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
    // Check both WALLET_QR_GENERATE and BQR_GENERATE events
    const hasBQRGenerationStarted = eventNames.has('payment_initiated_upi') ||
                                     eventNames.has('BQR_GENERATE_API_REQUEST') ||
                                     eventNames.has('WALLET_QR_GENERATE_API_REQUEST');
    const hasBQRGenerationFailed = eventNames.has('WALLET_QR_GENERATE_API_RESPONSE_FAILED') ||
                                    eventNames.has('BQR_GENERATE_API_RESPONSE_FAILED');
    const hasBQRGenerationSuccess = eventNames.has('WALLET_QR_GENERATE_API_RESPONSE_SUCCESS') ||
                                     eventNames.has('BQR_GENERATE_API_RESPONSE_SUCCESS') ||
                                     eventNames.has('qr_api_success');

    if (hasBQRGenerationStarted) {
      if (hasBQRGenerationFailed) {
        return {
          category: 'QR_GENERATION_DROP',
          isLegitimate: false,
          severity: 'INFO',
          reason: 'BQR QR generation API call failed (usually due to user network error)',
          details: {
            failedAt: eventNames.has('WALLET_QR_GENERATE_API_RESPONSE_FAILED')
              ? 'WALLET_QR_GENERATE_API_RESPONSE_FAILED'
              : 'BQR_GENERATE_API_RESPONSE_FAILED',
            userError: true,
            errorType: 'network',
          },
        };
      }

      if (!hasBQRGenerationSuccess) {
        return {
          category: 'QR_GENERATION_DROP',
          isLegitimate: false,
          severity: 'INFO',
          reason: 'BQR QR generation started but never received success response (usually due to user network error)',
          details: {
            missing: 'WALLET_QR_GENERATE_API_RESPONSE_SUCCESS or BQR_GENERATE_API_RESPONSE_SUCCESS',
            userError: true,
            errorType: 'network',
          },
        };
      }
    }

    // QR Display Drop
    const hasBQRQRShown = eventNames.has('BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN');

    if (hasBQRGenerationSuccess && !hasBQRQRShown) {
      return {
        category: 'QR_DISPLAY_DROP',
        isLegitimate: false,
        severity: 'INFO',
        reason: 'BQR QR generated successfully but never displayed to user (usually user error or navigation)',
        details: {
          missing: 'BQR_UI_EVENT_BQR_QR_SCREEN_SHOWN',
          userError: true,
        },
      };
    }

    // Status Polling Drop
    if (hasBQRQRShown) {
      const hasStatusResponse = eventNames.has('UPI_API_EVENT_RESP_CHECK_STATUS') ||
                                 eventNames.has('UPI_API_RESP_CHECK_STATUS') ||
                                 eventNames.has('PAYMENT_STATUS_API_RESPONSE_SUCCESS');

      if (!hasStatusResponse) {
        return {
          category: 'STATUS_POLLING_DROP',
          isLegitimate: true,
          severity: 'HIGH',
          reason: 'BQR QR shown but status polling never started or received no response',
          details: {
            missing: 'UPI_API_EVENT_RESP_CHECK_STATUS or PAYMENT_STATUS_API_RESPONSE_SUCCESS',
          },
        };
      }

      // Check if status polling returned failure
      const statusEvents = events.filter(e =>
        e.eventName === 'UPI_API_EVENT_RESP_CHECK_STATUS' ||
        e.eventName === 'UPI_API_RESP_CHECK_STATUS'
      );
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
    // Card payment initiated and tap/swipe screen shown, but user backed out immediately
    // before even tapping the card (no card detection events)
    // This is a MODE_SWITCH pattern where user started card flow but abandoned it
    const hasCardTapSwipeScreen = eventNames.has('Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN');
    const hasPreparingForTxn = eventNames.has('PREPARING_FOR_TXN');
    const hasTxnInProgress = eventNames.has('TXN_IN_PROGRESS');
    const hasCardRead = eventNames.has('CARD_READ') ||
                        eventNames.has('Card_APP_EVENT_CARD_DETECTED') ||
                        eventNames.has('Card_APP_EVENT_CARD_READ');
    const hasPinEntered = eventNames.has('Card_APP_EVENT_PIN_ENTERED');

    // If tap/swipe screen was shown but no card was detected and no PIN entered
    // and the flow was started (PREPARING_FOR_TXN), this is user backing out
    if (hasCardTapSwipeScreen && (hasPreparingForTxn || hasTxnInProgress) &&
        !hasCardRead && !hasPinEntered) {

      // Check if duration is very short (< 1 second = immediate abandon)
      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      const firstTime = parseInt(firstEvent.properties?.EVENT_TIME);
      const lastTime = parseInt(lastEvent.properties?.EVENT_TIME);
      const durationMs = lastTime - firstTime;

      if (durationMs < 1000) {
        return {
          category: 'MODE_SWITCH',
          isLegitimate: false,
          severity: 'INFO',
          reason: 'Card payment flow started but user backed out immediately before tapping card',
          details: {
            hasCardTapSwipeScreen,
            hasPreparingForTxn,
            hasTxnInProgress,
            durationMs,
            pattern: 'quick_abandon',
          },
        };
      }
    }

    // Card tap/swipe screen shown but PIN entry never happened
    if (
      eventNames.has('Card_UI_EVENT_CARD_TAP_SWIPE_DIP_SCREEN_SHOWN') &&
      !eventNames.has('Card_APP_EVENT_PIN_ENTERED')
    ) {
      return {
        category: 'CARD_PIN_DROP',
        isLegitimate: false,
        severity: 'INFO',
        reason: 'Card detected but PIN was never entered (usually user error or user cancelled)',
        details: {
          missing: 'Card_APP_EVENT_PIN_ENTERED',
          userError: true,
        },
      };
    }

    // Backend payment succeeded but success screen never shown to user
    const hasBackendSuccess =
      eventNames.has('CARD_PAYMENT_API_RESPONSE_SUCCESS') ||
      eventNames.has('PAYMENT_CONFIRM_API_RESPONSE_SUCCESS') ||
      eventNames.has('PRE_AUTH_API_RESPONSE_SUCCESS') ||
      events.some(e => e.eventName.includes('CARD_PAYMENT_API') && e.eventName.includes('RESPONSE_SUCCESS'));

    const hasSuccessScreen =
      eventNames.has('CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN') ||
      eventNames.has('CARD_TRANSACTION_SUCCESS_SCREEN_SHOWN') ||
      eventNames.has('PRE_AUTH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN');

    if (hasBackendSuccess && !hasSuccessScreen) {
      const missingScreen = eventNames.has('PRE_AUTH_API_RESPONSE_SUCCESS')
        ? 'PRE_AUTH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN'
        : 'CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN';

      return {
        category: 'CARD_SUCCESS_SCREEN_DROP',
        isLegitimate: true,
        severity: 'HIGH',
        reason: 'Payment succeeded on backend but success screen was never shown to user',
        details: {
          hasBackendSuccess: true,
          missing: missingScreen,
        },
      };
    }

    // PIN entered but API call never made
    if (
      eventNames.has('Card_APP_EVENT_PIN_ENTERED') &&
      !eventNames.has('CARD_PAYMENT_API_EVENT_REQ') &&
      !events.some(e => e.eventName.includes('CARD_PAYMENT_API_EVENT_REQ'))
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
