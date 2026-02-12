const { parseEventLog } = require('../utils/parser');
const { analyzeFlow } = require('../utils/analyzer');
const { classifyDrop } = require('../utils/classifier');
const { inferPaymentTypeFromEvents } = require('../utils/payment-type-detector');

(async () => {
  const txnMap = await parseEventLog(
    '/Users/peddakondannagari.r/Downloads/result_5249649_5588877.csv'
  );

  const categoryCounts = {};
  const bqrTxns = [];

  for (const [txnId, events] of txnMap.entries()) {
    const paymentType =
      events.find(e => e.paymentType)?.paymentType ||
      inferPaymentTypeFromEvents(events);

    if (paymentType === 'BQR') {
      const flowAnalysis = analyzeFlow(events, paymentType);
      const classification = classifyDrop(flowAnalysis, events);

      const category = classification.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      bqrTxns.push({
        txnId,
        category,
        isLegitimate: classification.isLegitimate,
      });
    }
  }

  console.log('BQR Transaction Classification Breakdown:\n');
  for (const [category, count] of Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${category}: ${count}`);
  }

  const total = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
  console.log(`  ----`);
  console.log(`  TOTAL: ${total}`);

  console.log('\nMetabase Comparison:');
  console.log('  UPI (successful BQR): 379');
  console.log('  BHARATQR (expired BQR): 32');
  console.log('  Total: 411');

  console.log('\nDiscrepancies:');
  const success = categoryCounts.SUCCESS || 0;
  const cancelled = categoryCounts.USER_CANCELLATION || 0;
  console.log(`  Success: ${success} (expected 379) - diff: ${379 - success}`);
  console.log(`  Cancelled: ${cancelled} (expected 32) - diff: ${32 - cancelled}`);
})();
