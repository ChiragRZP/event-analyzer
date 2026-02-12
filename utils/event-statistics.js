const { getExpectedEventCount } = require('./success-flows');
const { isNonPaymentEvent, getNonPaymentEventCategory } = require('./non-payment-events');

/**
 * Calculate comprehensive event statistics including expected vs actual
 * @param {Array} analyses - Array of analysis results from main analyzer
 * @returns {Object} - Detailed event statistics
 */
function calculateEventStatistics(analyses) {
  const stats = {
    // Overall counts
    totalTransactions: analyses.length,
    totalActualEvents: 0,
    totalExpectedEvents: 0,

    // Per payment type breakdown
    byPaymentType: {},

    // Missing events categorization
    missingEventsSummary: {
      dueToUserCancellation: 0,
      dueToLegitimateDrops: 0,
      optionalNotNeeded: 0,
      total: 0,
    },
  };

  // Track unique event names encountered
  const allEventNames = new Set();

  // Process each transaction
  for (const analysis of analyses) {
    const {
      paymentType,
      events,
      dropClassification,
      flowAnalysis
    } = analysis;

    // Initialize payment type stats if not exists
    if (!stats.byPaymentType[paymentType]) {
      stats.byPaymentType[paymentType] = {
        transactionCount: 0,
        expectedEventsPerTxn: getExpectedEventCount(paymentType),
        totalExpectedEvents: 0,
        totalActualEvents: 0,
        missingEvents: 0,

        // Breakdown by transaction outcome
        successCount: 0,
        failureCount: 0,
        userCancellationCount: 0,
        modeSwitchCount: 0,
        legitimateDropCount: 0,

        // Missing events categorization
        missingDueToUserCancellation: 0,
        missingDueToLegitimateDrops: 0,
        missingOptionalNotNeeded: 0,
      };
    }

    const typeStats = stats.byPaymentType[paymentType];

    // Count transactions
    typeStats.transactionCount++;

    // Count actual events (excluding non-payment events)
    const paymentEvents = events.filter(e => !isNonPaymentEvent(e.eventName));
    const actualEventCount = paymentEvents.length;
    typeStats.totalActualEvents += actualEventCount;
    stats.totalActualEvents += actualEventCount;

    // Track event names (only payment-related)
    paymentEvents.forEach(e => allEventNames.add(e.eventName));

    // Calculate expected events for this transaction
    const expectedEventCount = typeStats.expectedEventsPerTxn;
    typeStats.totalExpectedEvents += expectedEventCount;
    stats.totalExpectedEvents += expectedEventCount;

    // Calculate missing events for this transaction
    const missingEventCount = Math.max(0, expectedEventCount - actualEventCount);
    typeStats.missingEvents += missingEventCount;

    // Categorize the transaction outcome
    const category = dropClassification.category;

    if (category === 'SUCCESS') {
      typeStats.successCount++;
      // Even successful transactions might have fewer events than expected
      // (optional events not triggered), so count them as "optional not needed"
      if (missingEventCount > 0) {
        typeStats.missingOptionalNotNeeded += missingEventCount;
        stats.missingEventsSummary.optionalNotNeeded += missingEventCount;
      }
    } else if (category === 'FAILURE') {
      typeStats.failureCount++;
      // Failures are expected to have fewer events, don't count as missing
    } else if (category === 'USER_CANCELLATION') {
      typeStats.userCancellationCount++;
      typeStats.missingDueToUserCancellation += missingEventCount;
      stats.missingEventsSummary.dueToUserCancellation += missingEventCount;
    } else if (category === 'MODE_SWITCH') {
      typeStats.modeSwitchCount++;
      // Mode switches are user-initiated, count similarly to cancellations
      typeStats.missingDueToUserCancellation += missingEventCount;
      stats.missingEventsSummary.dueToUserCancellation += missingEventCount;
    } else if (dropClassification.isLegitimate) {
      typeStats.legitimateDropCount++;
      typeStats.missingDueToLegitimateDrops += missingEventCount;
      stats.missingEventsSummary.dueToLegitimateDrops += missingEventCount;
    } else {
      // NO_ISSUE or other categories
      if (missingEventCount > 0) {
        typeStats.missingOptionalNotNeeded += missingEventCount;
        stats.missingEventsSummary.optionalNotNeeded += missingEventCount;
      }
    }
  }

  // Calculate totals for missing events
  stats.missingEventsSummary.total =
    stats.missingEventsSummary.dueToUserCancellation +
    stats.missingEventsSummary.dueToLegitimateDrops +
    stats.missingEventsSummary.optionalNotNeeded;

  // Calculate percentages for each payment type
  for (const [paymentType, typeStats] of Object.entries(stats.byPaymentType)) {
    if (typeStats.totalExpectedEvents > 0) {
      typeStats.actualVsExpectedPercent = (
        (typeStats.totalActualEvents / typeStats.totalExpectedEvents) * 100
      ).toFixed(1);
    } else {
      typeStats.actualVsExpectedPercent = 0;
    }
  }

  // Overall percentage
  if (stats.totalExpectedEvents > 0) {
    stats.overallActualVsExpectedPercent = (
      (stats.totalActualEvents / stats.totalExpectedEvents) * 100
    ).toFixed(1);
  } else {
    stats.overallActualVsExpectedPercent = 0;
  }

  stats.uniqueEventTypes = allEventNames.size;

  // Track excluded non-payment events
  const allNonPaymentEvents = [];
  for (const analysis of analyses) {
    const nonPaymentEventsInTxn = analysis.events.filter(e => isNonPaymentEvent(e.eventName));
    allNonPaymentEvents.push(...nonPaymentEventsInTxn.map(e => e.eventName));
  }

  stats.excludedNonPaymentEvents = {
    total: allNonPaymentEvents.length,
    unique: new Set(allNonPaymentEvents).size,
    byCategory: {}
  };

  // Count excluded events by category
  for (const eventName of allNonPaymentEvents) {
    const category = getNonPaymentEventCategory(eventName);
    if (category) {
      stats.excludedNonPaymentEvents.byCategory[category] =
        (stats.excludedNonPaymentEvents.byCategory[category] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Format event statistics for display
 * @param {Object} stats - Event statistics from calculateEventStatistics
 * @returns {string} - Formatted string for console output
 */
function formatEventStatistics(stats) {
  const lines = [];

  lines.push('');
  lines.push('='.repeat(80));
  lines.push('📈 EVENT STATISTICS: EXPECTED VS ACTUAL (PAYMENT EVENTS ONLY)');
  lines.push('='.repeat(80));
  lines.push('');

  // Overall summary
  lines.push('OVERALL SUMMARY');
  lines.push('-'.repeat(80));
  lines.push(`Total Transactions: ${stats.totalTransactions}`);
  lines.push(`Total Expected Events (payment only): ${stats.totalExpectedEvents.toLocaleString()}`);
  lines.push(`Total Actual Events (payment only): ${stats.totalActualEvents.toLocaleString()}`);
  lines.push(`Overall Coverage: ${stats.overallActualVsExpectedPercent}%`);
  lines.push(`Unique Payment Event Types: ${stats.uniqueEventTypes}`);
  lines.push('');

  // Excluded non-payment events summary
  if (stats.excludedNonPaymentEvents && stats.excludedNonPaymentEvents.total > 0) {
    lines.push('EXCLUDED NON-PAYMENT EVENTS');
    lines.push('-'.repeat(80));
    lines.push(`Total Excluded: ${stats.excludedNonPaymentEvents.total.toLocaleString()}`);
    lines.push(`Unique Excluded: ${stats.excludedNonPaymentEvents.unique}`);
    lines.push('');
    lines.push('By Category:');
    for (const [category, count] of Object.entries(stats.excludedNonPaymentEvents.byCategory)) {
      lines.push(`  ${category}: ${count.toLocaleString()}`);
    }
    lines.push('');
  }

  // Missing events summary
  lines.push('MISSING PAYMENT EVENTS BREAKDOWN');
  lines.push('-'.repeat(80));
  lines.push(`Total Missing Events: ${stats.missingEventsSummary.total.toLocaleString()}`);
  lines.push(`  ❌ Due to Legitimate Drops: ${stats.missingEventsSummary.dueToLegitimateDrops.toLocaleString()}`);
  lines.push(`  🚫 Due to User Cancellations: ${stats.missingEventsSummary.dueToUserCancellation.toLocaleString()}`);
  lines.push(`  ✓  Optional Events (Not Needed): ${stats.missingEventsSummary.optionalNotNeeded.toLocaleString()}`);
  lines.push('');

  // Per payment type breakdown
  lines.push('PER PAYMENT TYPE BREAKDOWN (PAYMENT EVENTS ONLY)');
  lines.push('-'.repeat(80));

  // Sort by transaction count (descending)
  const sortedTypes = Object.entries(stats.byPaymentType)
    .sort((a, b) => b[1].transactionCount - a[1].transactionCount);

  for (const [paymentType, typeStats] of sortedTypes) {
    lines.push('');
    lines.push(`${paymentType}:`);
    lines.push(`  Transactions: ${typeStats.transactionCount}`);
    lines.push(`    ✅ Success: ${typeStats.successCount}`);
    lines.push(`    ❌ Legitimate Drops: ${typeStats.legitimateDropCount}`);
    lines.push(`    🚫 User Cancellations: ${typeStats.userCancellationCount}`);
    lines.push(`    🔄 Mode Switches: ${typeStats.modeSwitchCount}`);
    lines.push(`  Events:`);
    lines.push(`    Expected per txn: ${typeStats.expectedEventsPerTxn}`);
    lines.push(`    Total Expected: ${typeStats.totalExpectedEvents.toLocaleString()}`);
    lines.push(`    Total Actual: ${typeStats.totalActualEvents.toLocaleString()}`);
    lines.push(`    Coverage: ${typeStats.actualVsExpectedPercent}%`);
    lines.push(`  Missing Events: ${typeStats.missingEvents.toLocaleString()}`);
    lines.push(`    Due to Legitimate Drops: ${typeStats.missingDueToLegitimateDrops.toLocaleString()}`);
    lines.push(`    Due to User Actions: ${typeStats.missingDueToUserCancellation.toLocaleString()}`);
    lines.push(`    Optional (Not Needed): ${typeStats.missingOptionalNotNeeded.toLocaleString()}`);
  }

  lines.push('');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push('NOTE: Non-payment events (navigation, system, pre-payment UI, etc.) are');
  lines.push('excluded from these calculations. They are tracked separately above.');
  lines.push('='.repeat(80));
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  calculateEventStatistics,
  formatEventStatistics,
};
