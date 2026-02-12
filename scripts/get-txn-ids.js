const { parseEventLog } = require('../utils/parser');
const { inferPaymentTypeFromEvents } = require('../utils/payment-type-detector');

(async () => {
  const txnMap = await parseEventLog('/Users/peddakondannagari.r/Downloads/result_5265801_5606524.csv');

  const paymentTxns = [];

  for (const [txnId, events] of txnMap.entries()) {
    const paymentType = events.find(e => e.paymentType)?.paymentType || inferPaymentTypeFromEvents(events);

    if (paymentType !== 'UNKNOWN') {
      // Look for txn_request_id in properties (stored as 'txnId' in properties)
      const txnRequestId = events.find(e => e.properties && e.properties.txnId)?.properties?.txnId;
      if (txnRequestId) {
        paymentTxns.push(txnRequestId);
      }
    }
  }

  console.log('Total payment transactions with txn_request_id:', paymentTxns.length);
  console.log('\nAll transaction IDs:');
  paymentTxns.sort();
  paymentTxns.forEach(id => console.log(id));
})();
