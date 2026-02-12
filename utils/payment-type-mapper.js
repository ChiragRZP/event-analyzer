/**
 * Map between event-level payment types and database-level payment types
 * This resolves the BQR vs UPI confusion:
 * - Events tag payments as "BQR" (Bharat QR)
 * - Database stores them as "UPI" (payment protocol)
 */

/**
 * Mapping from event payment type to database payment type
 *
 * IMPORTANT: BQR has conditional mapping based on transaction outcome:
 *   - Successful BQR → Database stores as 'UPI'
 *   - Cancelled/Expired BQR → Database stores as 'BHARATQR'
 *
 * This is backend business logic and cannot be determined from events alone.
 */
const EVENT_TO_DATABASE_MAPPING = {
  // BQR is special - maps differently based on outcome (see note above)
  BQR: 'UPI or BHARATQR (depends on outcome)',

  // All others map directly
  UPI: 'UPI',
  CARD: 'CARD',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  DD: 'DD',
  EMI: 'EMI',
  PAYLINK: 'PAYLINK',
  CNP: 'PAYLINK', // Card Not Present is same as Paylink
  WALLET: 'WALLET',
  NCMC: 'NCMC',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Get both event-level and database-level payment types
 * @param {string} eventPaymentType - Payment type from events
 * @param {string} outcome - Optional: SUCCESS, USER_CANCELLATION, etc.
 * @returns {Object} - { eventType, dbType, description }
 */
function getPaymentTypeMapping(eventPaymentType, outcome) {
  let dbType = EVENT_TO_DATABASE_MAPPING[eventPaymentType] || eventPaymentType;

  // Special handling for BQR - database type depends on outcome
  if (eventPaymentType === 'BQR') {
    if (outcome === 'SUCCESS') {
      dbType = 'UPI';
    } else if (outcome === 'USER_CANCELLATION' || outcome === 'TIMEOUT') {
      dbType = 'BHARATQR';
    } else {
      dbType = 'UPI/BHARATQR';
    }
  }

  let description = '';
  if (eventPaymentType === 'BQR') {
    description =
      'BQR - Successful=UPI in DB, Cancelled/Expired=BHARATQR in DB';
  } else if (eventPaymentType === 'UPI') {
    description = 'UPI (Dynamic QR) - customer scans merchant QR code';
  } else if (eventPaymentType === 'CNP') {
    description = 'CNP (Card Not Present) - same as Paylink';
  }

  return {
    eventType: eventPaymentType,
    dbType,
    description,
    isMappedDifferently: eventPaymentType !== dbType,
  };
}

/**
 * Get all payment types that map to a given database type
 * @param {string} dbPaymentType - Database payment type
 * @returns {Array<string>} - Array of event types that map to this DB type
 */
function getEventTypesForDbType(dbPaymentType) {
  return Object.entries(EVENT_TO_DATABASE_MAPPING)
    .filter(([_, dbType]) => dbType === dbPaymentType)
    .map(([eventType, _]) => eventType);
}

module.exports = {
  EVENT_TO_DATABASE_MAPPING,
  getPaymentTypeMapping,
  getEventTypesForDbType,
};
