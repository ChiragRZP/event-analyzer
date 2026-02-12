#!/usr/bin/env node

const path = require('path');
const { parseEventLog, getEventStatistics } = require('./utils/parser');
const { analyzeFlow, calculateDuration } = require('./utils/analyzer');
const { classifyDrop } = require('./utils/classifier');
const { generateReport, printSummary } = require('./utils/reporter');
const { inferPaymentTypeFromEvents } = require('./utils/payment-type-detector');
const { calculateEventStatistics } = require('./utils/event-statistics');

/**
 * Main entry point for event drop analyzer
 * @param {string} inputFilePath - Path to CSV/Excel event log file
 * @param {string} outputFilePath - Optional output path for report
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeEventLog(inputFilePath, outputFilePath) {
  try {
    console.log('\n🔍 Event Drop Analyzer');
    console.log('='.repeat(70));
    console.log(`\nReading event log: ${inputFilePath}\n`);

    // Parse event log
    const transactionMap = await parseEventLog(inputFilePath);
    const stats = getEventStatistics(transactionMap);

    console.log('📋 Parsed Event Log:');
    console.log(`  Total Transactions: ${stats.totalTransactions}`);
    console.log(`  Total Events: ${stats.totalEvents}`);
    console.log(`  Avg Events/Txn: ${stats.avgEventsPerTxn}`);
    console.log('\n  Payment Types:');
    for (const [type, count] of Object.entries(stats.paymentTypeCounts).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`    ${type}: ${count} events`);
    }

    console.log('\n🔬 Analyzing payment flows...\n');

    // Analyze each transaction
    const analyses = [];

    for (const [txnId, events] of transactionMap.entries()) {
      // Determine payment type
      // First try to get from event properties
      let paymentType = events.find(e => e.paymentType)?.paymentType;

      // If not found in properties, infer from event names
      if (!paymentType) {
        paymentType = inferPaymentTypeFromEvents(events);
      }

      // Final fallback
      if (!paymentType) {
        paymentType = 'UNKNOWN';
      }

      // Analyze flow
      const flowAnalysis = analyzeFlow(events, paymentType);

      // Classify drop
      const dropClassification = classifyDrop(flowAnalysis, events);

      // Calculate duration
      const duration = calculateDuration(events);

      // Store analysis result
      analyses.push({
        txnId,
        paymentType,
        events,
        flowAnalysis,
        dropClassification,
        duration,
        missingCritical: flowAnalysis.missingCritical,
      });
    }

    // Generate output file path
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultOutputPath = path.join(
      process.cwd(),
      `events_analysis_report_${timestamp}.csv`
    );
    const finalOutputPath = outputFilePath || defaultOutputPath;

    // Generate report
    console.log('📝 Generating report...\n');
    const reportMetadata = await generateReport(analyses, finalOutputPath);

    // Calculate enhanced event statistics
    const eventStats = calculateEventStatistics(analyses);

    // Print summary (including enhanced statistics)
    printSummary(reportMetadata, eventStats);

    return {
      analyses,
      reportMetadata,
      stats,
      eventStats,
    };
  } catch (error) {
    console.error('\n❌ Error during analysis:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * CLI interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node index.js <input-file> [output-file]

Arguments:
  input-file   Path to CSV or Excel file containing event logs
  output-file  Optional path for output CSV report (default: events_analysis_report_YYYY-MM-DD.csv)

Examples:
  node index.js events.csv
  node index.js /path/to/device_logs.xlsx custom_report.csv
  node index.js ~/Downloads/querybook_export.csv
`);
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  analyzeEventLog(inputFile, outputFile)
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      process.exit(1);
    });
}

module.exports = {
  analyzeEventLog,
};
