#!/usr/bin/env node

const { parseEventLog } = require('./utils/parser');
const path = require('path');

/**
 * View all events for a specific sequence ID
 * Usage: node view-sequence.js <file-path> <sequence-id>
 */
async function viewSequence() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node view-sequence.js <file-path> <sequence-id>');
    console.log('');
    console.log('Examples:');
    console.log('  node view-sequence.js data.csv POS1234567890');
    console.log('  node view-sequence.js data.xlsx ABC123XYZ');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  const sequenceId = args[1];

  console.log(`\n🔍 Searching for sequence ID: ${sequenceId}`);
  console.log(`📁 File: ${filePath}\n`);

  try {
    // Parse the event log
    const transactionMap = await parseEventLog(filePath);

    // Find all events matching the sequence ID
    let found = false;
    let matchingEvents = [];
    let matchingTxnId = null;

    for (const [txnId, events] of transactionMap.entries()) {
      // Check if any event has this sequence ID
      const hasMatch = events.some(e =>
        e.sequenceId === sequenceId ||
        e.txnId === sequenceId ||
        e.properties?.sequence_id === sequenceId ||
        e.properties?.SEQUENCE_ID === sequenceId
      );

      if (hasMatch) {
        found = true;
        matchingTxnId = txnId;
        matchingEvents = events;
        break;
      }
    }

    if (!found) {
      console.log(`❌ No events found for sequence ID: ${sequenceId}\n`);
      process.exit(0);
    }

    // Display header
    console.log(`✅ Found ${matchingEvents.length} events for sequence ID: ${sequenceId}`);
    console.log(`📝 Transaction ID: ${matchingTxnId}`);
    console.log('─'.repeat(100));

    // Display each event
    matchingEvents.forEach((event, index) => {
      console.log(`\n[${index + 1}/${matchingEvents.length}] ${event.eventName}`);
      console.log(`    Time: ${event.eventTime}`);

      if (event.properties.EVENT_TIME) {
        const date = new Date(parseInt(event.properties.EVENT_TIME));
        console.log(`    Timestamp (ms): ${event.properties.EVENT_TIME} (${date.toISOString()})`);
      }

      // Display key properties
      const keyProps = [
        'dsn', 'DSN',
        'mid', 'MID',
        'tid', 'TID',
        'PAYMENT_TYPE', 'payment_type',
        'amount', 'AMOUNT',
        'success',
        'status',
        'txnId', 'backend_txn_id',
        'errorCode', 'error_code',
        'error',
        'message',
        'newSource', 'new_source',
        'appVersionName', 'app_version',
        'web_version',
      ];

      console.log('    Properties:');
      keyProps.forEach(key => {
        if (event.properties[key] !== undefined && event.properties[key] !== null) {
          console.log(`      ${key}: ${event.properties[key]}`);
        }
      });

      // Show any additional properties not in the key list
      const displayedKeys = new Set(keyProps);
      const otherProps = Object.keys(event.properties).filter(k => !displayedKeys.has(k) && k !== 'sequence_id' && k !== 'SEQUENCE_ID');

      if (otherProps.length > 0) {
        console.log('    Additional Properties:');
        otherProps.forEach(key => {
          const value = event.properties[key];
          if (value !== undefined && value !== null && value !== '') {
            console.log(`      ${key}: ${value}`);
          }
        });
      }
    });

    console.log('\n' + '─'.repeat(100));
    console.log(`\n📊 Summary:`);
    console.log(`   • Total Events: ${matchingEvents.length}`);
    console.log(`   • Sequence ID: ${sequenceId}`);
    console.log(`   • Transaction ID: ${matchingTxnId}`);

    if (matchingEvents[0]?.properties?.dsn || matchingEvents[0]?.properties?.DSN) {
      console.log(`   • Device (DSN): ${matchingEvents[0].properties.dsn || matchingEvents[0].properties.DSN}`);
    }

    if (matchingEvents[0]?.paymentType) {
      console.log(`   • Payment Type: ${matchingEvents[0].paymentType}`);
    }

    if (matchingEvents[0]?.amount) {
      console.log(`   • Amount: ${matchingEvents[0].amount}`);
    }

    console.log('');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

viewSequence();
