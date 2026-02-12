const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const { getPaymentTypeMapping } = require('./payment-type-mapper');

/**
 * Generate CSV report for Excel analysis
 * @param {Array} analyses - Array of analysis results
 * @param {string} outputPath - Output file path
 * @returns {Promise<Object>} - Report metadata
 */
async function generateReport(analyses, outputPath) {
  // Filter to only legitimate drops
  const legitimateDrops = analyses.filter(a => a.dropClassification.isLegitimate);

  // Prepare CSV records
  const records = legitimateDrops.map(a => {
    const outcome = a.dropClassification.category;
    const typeMapping = getPaymentTypeMapping(a.paymentType, outcome);
    return {
      txn_id: a.txnId,
      event_payment_type: typeMapping.eventType,
      db_payment_type: typeMapping.dbType,
      drop_category: a.dropClassification.category,
      severity: a.dropClassification.severity,
      drop_reason: a.dropClassification.reason,
      missing_events: a.missingCritical.join(', '),
      event_count: a.events.length,
      duration_sec: a.duration,
      first_event_time: a.events[0]?.eventTime || '',
      last_event_time: a.events[a.events.length - 1]?.eventTime || '',
      notes: generateNotes(a),
    };
  });

  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'txn_id', title: 'Transaction ID' },
      { id: 'event_payment_type', title: 'Event Payment Type' },
      { id: 'db_payment_type', title: 'Database Payment Type' },
      { id: 'drop_category', title: 'Drop Category' },
      { id: 'severity', title: 'Severity' },
      { id: 'drop_reason', title: 'Drop Reason' },
      { id: 'missing_events', title: 'Missing Events' },
      { id: 'event_count', title: 'Event Count' },
      { id: 'duration_sec', title: 'Duration (sec)' },
      { id: 'first_event_time', title: 'First Event Time' },
      { id: 'last_event_time', title: 'Last Event Time' },
      { id: 'notes', title: 'Notes' },
    ],
  });

  // Write records to CSV
  await csvWriter.writeRecords(records);

  // Generate summary statistics
  const summary = generateSummary(analyses, legitimateDrops);

  return {
    outputPath,
    totalTransactions: analyses.length,
    legitimateDrops: legitimateDrops.length,
    excludedUserActions: analyses.length - legitimateDrops.length,
    summary,
  };
}

/**
 * Generate notes/insights for a transaction
 * @param {Object} analysis - Analysis result
 * @returns {string}
 */
function generateNotes(analysis) {
  const notes = [];
  const { dropClassification, events } = analysis;

  // Add details from classification
  if (dropClassification.details) {
    const details = dropClassification.details;

    if (details.missing) {
      notes.push(`Missing: ${details.missing}`);
    }

    if (details.failedAt) {
      notes.push(`Failed at: ${details.failedAt}`);
    }

    if (details.hasStatusPolling) {
      notes.push('Status polling was active');
    }

    if (details.errorMessage) {
      notes.push(`Error: ${details.errorMessage}`);
    }
  }

  // Check for sequence ID changes (might indicate retry or mode switch)
  const sequenceIds = new Set(events.map(e => e.sequenceId).filter(Boolean));
  if (sequenceIds.size > 1) {
    notes.push(`Multiple sequence IDs detected (${sequenceIds.size})`);
  }

  return notes.join(' | ') || 'None';
}

/**
 * Generate summary statistics
 * @param {Array} allAnalyses - All analyses
 * @param {Array} legitimateDrops - Legitimate drops only
 * @returns {Object}
 */
function generateSummary(allAnalyses, legitimateDrops) {
  const summary = {
    total: allAnalyses.length,
    legitimateDrops: legitimateDrops.length,
    userCancellations: 0,
    modeSwitches: 0,
    successes: 0,
    byCategory: {},
    bySeverity: {
      INFO: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    },
    byPaymentType: {},
    backendTransactions: {}, // Count unique backend transactions (excluding UNKNOWN)
  };

  // Track unique backend transaction IDs globally (for actual payments only)
  const allBackendTxnIds = new Set();

  // Track unique backend transaction IDs per payment type (to avoid counting duplicates)
  const backendTxnIdsByType = {};

  for (const analysis of allAnalyses) {
    const { category, severity } = analysis.dropClassification;
    const paymentType = analysis.paymentType || 'UNKNOWN';

    // Count by category
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;

    // Count user actions
    if (category === 'USER_CANCELLATION') summary.userCancellations++;
    if (category === 'MODE_SWITCH') summary.modeSwitches++;
    if (category === 'SUCCESS') summary.successes++;

    // Count by severity
    summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;

    // Count by payment type (sequences)
    summary.byPaymentType[paymentType] = (summary.byPaymentType[paymentType] || 0) + 1;

    // Track unique backend transactions (only for actual payment types, not UNKNOWN)
    if (paymentType !== 'UNKNOWN') {
      const backendTxnId = analysis.events.find(e => e.properties?.txnId)?.properties?.txnId;
      if (backendTxnId) {
        allBackendTxnIds.add(backendTxnId);

        // Track unique txnIds per payment type using Sets
        if (!backendTxnIdsByType[paymentType]) {
          backendTxnIdsByType[paymentType] = new Set();
        }
        backendTxnIdsByType[paymentType].add(backendTxnId);
      }
    }
  }

  // Convert Sets to counts (unique txnIds per payment type)
  for (const [type, idSet] of Object.entries(backendTxnIdsByType)) {
    summary.backendTransactions[type] = idSet.size;
  }

  summary.totalBackendTransactions = allBackendTxnIds.size;

  return summary;
}

/**
 * Print summary to console
 * @param {Object} reportMetadata - Report metadata from generateReport
 * @param {Object} eventStats - Optional event statistics (expected vs actual)
 */
function printSummary(reportMetadata, eventStats) {
  const { summary } = reportMetadata;

  console.log('\n' + '='.repeat(70));
  console.log('📊 EVENT DROP ANALYSIS SUMMARY');
  console.log('='.repeat(70));

  console.log(`\nTotal Transactions Analyzed: ${summary.total}`);
  console.log(`  ✅ Successful Payments: ${summary.successes}`);
  console.log(`  ❌ Legitimate Drops: ${reportMetadata.legitimateDrops}`);
  console.log(
    `  ℹ️  User Actions (Excluded): ${reportMetadata.excludedUserActions}`
  );
  console.log(`     - User Cancellations: ${summary.userCancellations}`);
  console.log(`     - Payment Mode Switches: ${summary.modeSwitches}`);

  console.log('\n--- Legitimate Drops by Category ---');
  const categoryCounts = Object.entries(summary.byCategory)
    .filter(([cat]) => !['USER_CANCELLATION', 'MODE_SWITCH', 'SUCCESS', 'NO_ISSUE'].includes(cat))
    .sort((a, b) => b[1] - a[1]);

  for (const [category, count] of categoryCounts) {
    console.log(`  ${category}: ${count}`);
  }

  console.log('\n--- Drops by Severity ---');
  console.log(`  🔴 CRITICAL: ${summary.bySeverity.CRITICAL}`);
  console.log(`  🟠 HIGH: ${summary.bySeverity.HIGH}`);
  console.log(`  🟡 MEDIUM: ${summary.bySeverity.MEDIUM}`);
  console.log(`  🟢 INFO: ${summary.bySeverity.INFO}`);

  console.log('\n--- Transactions by Payment Type ---');
  for (const [eventType, count] of Object.entries(summary.byPaymentType).sort(
    (a, b) => b[1] - a[1]
  )) {
    const backendCount = summary.backendTransactions[eventType] || 0;
    const sequenceInfo = backendCount > 0 ? ` sequences → ${backendCount} backend txns` : ' sequences';

    if (eventType === 'BQR') {
      console.log(`  ${eventType}: ${count}${sequenceInfo} (DB: successful=UPI, expired=BHARATQR)`);
    } else {
      const mapping = getPaymentTypeMapping(eventType);
      const arrow = mapping.isMappedDifferently ? ' → ' + mapping.dbType : '';
      console.log(`  ${eventType}${arrow}: ${count}${sequenceInfo}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✨ Report saved to: ${reportMetadata.outputPath}`);
  console.log('='.repeat(70) + '\n');

  // Print enhanced event statistics if provided
  if (eventStats) {
    printEventStatistics(eventStats);
  }
}

/**
 * Print enhanced event statistics (expected vs actual)
 * @param {Object} eventStats - Event statistics from calculateEventStatistics
 */
function printEventStatistics(eventStats) {
  console.log('='.repeat(80));
  console.log('📈 EVENT STATISTICS: EXPECTED VS ACTUAL (PAYMENT EVENTS ONLY)');
  console.log('='.repeat(80));
  console.log('');

  // Overall summary
  console.log('OVERALL SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total Transactions: ${eventStats.totalTransactions}`);
  console.log(`Total Expected Events (payment only): ${eventStats.totalExpectedEvents.toLocaleString()}`);
  console.log(`Total Actual Events (payment only): ${eventStats.totalActualEvents.toLocaleString()}`);
  console.log(`Overall Coverage: ${eventStats.overallActualVsExpectedPercent}%`);
  console.log(`Unique Payment Event Types: ${eventStats.uniqueEventTypes}`);
  console.log('');

  // Excluded non-payment events summary
  if (eventStats.excludedNonPaymentEvents && eventStats.excludedNonPaymentEvents.total > 0) {
    console.log('EXCLUDED NON-PAYMENT EVENTS');
    console.log('-'.repeat(80));
    console.log(`Total Excluded: ${eventStats.excludedNonPaymentEvents.total.toLocaleString()}`);
    console.log(`Unique Excluded: ${eventStats.excludedNonPaymentEvents.unique}`);
    console.log('');
    console.log('By Category:');
    const sortedCategories = Object.entries(eventStats.excludedNonPaymentEvents.byCategory)
      .sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sortedCategories) {
      console.log(`  ${category}: ${count.toLocaleString()}`);
    }
    console.log('');
  }

  // Missing events summary
  console.log('MISSING PAYMENT EVENTS BREAKDOWN');
  console.log('-'.repeat(80));
  console.log(`Total Missing Events: ${eventStats.missingEventsSummary.total.toLocaleString()}`);
  console.log(`  ❌ Due to Legitimate Drops: ${eventStats.missingEventsSummary.dueToLegitimateDrops.toLocaleString()}`);
  console.log(`  🚫 Due to User Cancellations/Mode Switches: ${eventStats.missingEventsSummary.dueToUserCancellation.toLocaleString()}`);
  console.log(`  ✓  Optional Events (Not Needed): ${eventStats.missingEventsSummary.optionalNotNeeded.toLocaleString()}`);
  console.log('');

  // Per payment type breakdown
  console.log('PER PAYMENT TYPE BREAKDOWN (PAYMENT EVENTS ONLY)');
  console.log('-'.repeat(80));

  // Sort by transaction count (descending)
  const sortedTypes = Object.entries(eventStats.byPaymentType)
    .sort((a, b) => b[1].transactionCount - a[1].transactionCount);

  for (const [paymentType, typeStats] of sortedTypes) {
    console.log('');
    console.log(`${paymentType}:`);
    console.log(`  Transactions: ${typeStats.transactionCount}`);
    console.log(`    ✅ Success: ${typeStats.successCount}`);
    console.log(`    ⚠️  Failure: ${typeStats.failureCount}`);
    console.log(`    ❌ Legitimate Drops: ${typeStats.legitimateDropCount}`);
    console.log(`    🚫 User Cancellations: ${typeStats.userCancellationCount}`);
    console.log(`    🔄 Mode Switches: ${typeStats.modeSwitchCount}`);
    console.log(`  Events:`);
    console.log(`    Expected per txn: ${typeStats.expectedEventsPerTxn}`);
    console.log(`    Total Expected: ${typeStats.totalExpectedEvents.toLocaleString()}`);
    console.log(`    Total Actual: ${typeStats.totalActualEvents.toLocaleString()}`);
    console.log(`    Coverage: ${typeStats.actualVsExpectedPercent}%`);
    console.log(`  Missing Events: ${typeStats.missingEvents.toLocaleString()}`);
    console.log(`    ❌ Due to Legitimate Drops: ${typeStats.missingDueToLegitimateDrops.toLocaleString()}`);
    console.log(`    🚫 Due to User Actions: ${typeStats.missingDueToUserCancellation.toLocaleString()}`);
    console.log(`    ✓  Optional (Not Needed): ${typeStats.missingOptionalNotNeeded.toLocaleString()}`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('NOTE: Non-payment events (navigation, system, pre-payment UI, etc.) are');
  console.log('excluded from these calculations. They are tracked separately above.');
  console.log('='.repeat(80));
  console.log('');
}

module.exports = {
  generateReport,
  generateNotes,
  generateSummary,
  printSummary,
  printEventStatistics,
};
