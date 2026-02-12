const { parseEventLog } = require('../utils/parser');
const { analyzeFlow } = require('../utils/analyzer');
const { classifyDrop } = require('../utils/classifier');
const { inferPaymentTypeFromEvents } = require('../utils/payment-type-detector');

(async () => {
  const txnMap = await parseEventLog('/Users/peddakondannagari.r/Downloads/result_5249649_5588877.csv');

  console.log('Finding non-standard BQR transactions:\n');

  for (const [txnId, events] of txnMap.entries()) {
    const paymentType = events.find(e => e.paymentType)?.paymentType || inferPaymentTypeFromEvents(events);

    if (paymentType === 'BQR') {
      const flowAnalysis = analyzeFlow(events, paymentType);
      const classification = classifyDrop(flowAnalysis, events);

      if (classification.category !== 'SUCCESS' &&
          classification.category !== 'USER_CANCELLATION' &&
          classification.category !== 'TIMEOUT' &&
          classification.category !== 'MODE_SWITCH') {
        console.log('Transaction:', txnId);
        console.log('Category:', classification.category);
        console.log('Reason:', classification.reason);
        console.log('hasSuccess:', flowAnalysis.hasSuccess);
        console.log('hasFailure:', flowAnalysis.hasFailure);
        console.log('Event count:', events.length);
        console.log('Events:', events.map(e => e.eventName).slice(0, 10).join(', '));
        console.log('');
      }
    }
  }
})();
