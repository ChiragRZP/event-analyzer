const { parseEventLog } = require('./utils/parser');
const { inferPaymentTypeFromEvents } = require('./utils/payment-type-detector');

(async () => {
  const txnMap = await parseEventLog('/Users/peddakondannagari.r/Downloads/full_day_logs_05feb.csv');

  console.log('=== ANALYZING DISCREPANCY ===\n');

  const bqrTxnIds = new Set();
  const cardTxnIds = new Set();
  const unknownTxnIds = new Set();
  const allTxnIds = new Set();

  let bqrSeqCount = 0;
  let cardSeqCount = 0;
  let unknownSeqCount = 0;

  const unknownWithTxnId = [];

  for (const [seqId, events] of txnMap.entries()) {
    const paymentType = events.find(e => e.paymentType)?.paymentType || inferPaymentTypeFromEvents(events);
    const txnId = events.find(e => e.properties?.txnId)?.properties?.txnId;

    if (txnId) {
      allTxnIds.add(txnId);
    }

    if (paymentType === 'BQR') {
      bqrSeqCount++;
      if (txnId) bqrTxnIds.add(txnId);
    } else if (paymentType === 'CARD') {
      cardSeqCount++;
      if (txnId) cardTxnIds.add(txnId);
    } else if (paymentType === 'UNKNOWN' || !paymentType) {
      unknownSeqCount++;
      if (txnId) {
        unknownTxnIds.add(txnId);
        unknownWithTxnId.push({
          seqId,
          txnId,
          events: events.map(e => e.eventName).slice(0, 5)
        });
      }
    }
  }

  console.log('BQR:');
  console.log('  Sequences:', bqrSeqCount);
  console.log('  Unique txnIds:', bqrTxnIds.size);
  console.log('  Difference:', bqrSeqCount - bqrTxnIds.size);

  console.log('\nCARD:');
  console.log('  Sequences:', cardSeqCount);
  console.log('  Unique txnIds:', cardTxnIds.size);

  console.log('\nUNKNOWN:');
  console.log('  Sequences:', unknownSeqCount);
  console.log('  Unique txnIds:', unknownTxnIds.size);

  console.log('\nTotal unique txnIds across all types:', allTxnIds.size);

  if (unknownWithTxnId.length > 0) {
    console.log('\n=== UNKNOWN SEQUENCES WITH TXNID ===');
    unknownWithTxnId.forEach((u, i) => {
      console.log(`${i + 1}. ${u.seqId}`);
      console.log(`   TxnId: ${u.txnId}`);
      console.log(`   Events: ${u.events.join(', ')}`);
    });
  }

  // Check for duplicate txnIds in BQR
  console.log('\n=== CHECKING FOR DUPLICATE TXNIDS IN BQR ===');
  const bqrTxnIdCounts = {};
  for (const [seqId, events] of txnMap.entries()) {
    const paymentType = events.find(e => e.paymentType)?.paymentType || inferPaymentTypeFromEvents(events);
    const txnId = events.find(e => e.properties?.txnId)?.properties?.txnId;

    if (paymentType === 'BQR' && txnId) {
      bqrTxnIdCounts[txnId] = (bqrTxnIdCounts[txnId] || 0) + 1;
    }
  }

  const duplicates = Object.entries(bqrTxnIdCounts).filter(([id, count]) => count > 1);
  console.log('BQR sequences with duplicate txnIds:', duplicates.length);
  if (duplicates.length > 0) {
    console.log('Duplicates:');
    duplicates.slice(0, 5).forEach(([id, count]) => {
      console.log(`  ${id}: appears in ${count} sequences`);
    });
  }

  console.log('\n=== EXPLANATION ===');
  console.log('Expected in Metabase: 521 transactions');
  console.log('Actual unique txnIds: ' + allTxnIds.size);
  console.log('Difference: ' + (allTxnIds.size - 521));
})();
