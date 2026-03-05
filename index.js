#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { parseEventLog, getEventStatistics, groupByDevice, getDeviceStatistics } = require('./utils/parser');
const { analyzeFlow, calculateDuration } = require('./utils/analyzer');
const { classifyDrop } = require('./utils/classifier');
const { generateReport, printSummary } = require('./utils/reporter');
const { inferPaymentTypeFromEvents } = require('./utils/payment-type-detector');
const { calculateEventStatistics } = require('./utils/event-statistics');

/**
 * Analyze multiple devices from a single log file
 * @param {string} inputFilePath - Path to CSV/Excel event log file
 * @param {string} outputFilePath - Optional output path for report
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeMultiDeviceLog(inputFilePath, outputFilePath) {
  try {
    console.log('\n🔍 Multi-Device Event Drop Analyzer');
    console.log('='.repeat(80));
    console.log(`\nReading event log: ${inputFilePath}\n`);

    // Parse event log
    const transactionMap = await parseEventLog(inputFilePath);

    // Group by device
    const deviceMap = groupByDevice(transactionMap);
    const deviceStats = getDeviceStatistics(deviceMap);

    console.log('📋 Parsed Multi-Device Event Log:');
    console.log(`  Total Devices: ${deviceStats.totalDevices}`);
    console.log(`  Total Transactions: ${deviceStats.totalTransactions}`);
    console.log(`  Total Events: ${deviceStats.totalEvents}`);
    console.log(`  Avg Events/Txn: ${deviceStats.avgEventsPerTxn}`);
    console.log('\n  Top 10 Devices by Transaction Count:');
    for (const device of deviceStats.devices.slice(0, 10)) {
      console.log(`    ${device.dsn}: ${device.transactions} txns, ${device.events} events`);
    }

    console.log(`\n🔬 Analyzing ${deviceStats.totalDevices} devices...\n`);

    // Analyze each device
    const allAnalyses = [];
    const deviceSummaries = [];
    let processedDevices = 0;

    for (const [dsn, deviceTransactionMap] of deviceMap.entries()) {
      processedDevices++;
      process.stdout.write(`  Processing device ${processedDevices}/${deviceStats.totalDevices}: ${dsn}...\r`);

      const deviceAnalyses = [];

      // Build timeline: sort transactions by first event timestamp
      const txnTimeline = Array.from(deviceTransactionMap.entries()).map(([txnId, events]) => {
        const timestamps = events
          .map(e => parseInt(e.properties?.EVENT_TIME))
          .filter(t => !isNaN(t));
        const firstEventTime = timestamps.length > 0 ? Math.min(...timestamps) : 0;
        const lastEventTime = timestamps.length > 0 ? Math.max(...timestamps) : 0;
        return { txnId, events, firstEventTime, lastEventTime };
      }).sort((a, b) => a.firstEventTime - b.firstEventTime);

      // Analyze each transaction with context about the next sequence
      for (let i = 0; i < txnTimeline.length; i++) {
        const { txnId, events, lastEventTime } = txnTimeline[i];

        // Determine payment type
        let paymentType = events.find(e => e.paymentType)?.paymentType;
        if (!paymentType) {
          paymentType = inferPaymentTypeFromEvents(events);
        }
        if (!paymentType) {
          paymentType = 'UNKNOWN';
        }

        // Build next sequence context (within 15 second window)
        let nextSequenceContext = null;
        if (i < txnTimeline.length - 1) {
          const nextSeq = txnTimeline[i + 1];
          const timeDiffMs = nextSeq.firstEventTime - lastEventTime;

          if (timeDiffMs > 0 && timeDiffMs <= 15000) {
            nextSequenceContext = {
              sequenceId: nextSeq.txnId,
              timeDiffMs,
              events: nextSeq.events,
            };
          }
        }

        // Analyze flow
        const flowAnalysis = analyzeFlow(events, paymentType);
        const dropClassification = classifyDrop(flowAnalysis, events, nextSequenceContext);
        const duration = calculateDuration(events);

        // Extract device metadata
        const mid = events[0]?.properties?.mid || events[0]?.properties?.MID || '';
        const tid = events[0]?.properties?.tid || events[0]?.properties?.TID || '';

        const analysis = {
          txnId,
          dsn,
          mid,
          tid,
          paymentType,
          events,
          flowAnalysis,
          dropClassification,
          duration,
          missingCritical: flowAnalysis.missingCritical,
        };

        deviceAnalyses.push(analysis);
        allAnalyses.push(analysis);
      }

      // Calculate per-device summary
      const deviceEventStats = calculateEventStatistics(deviceAnalyses);
      deviceSummaries.push({
        dsn,
        mid: deviceAnalyses[0]?.mid || '',
        tid: deviceAnalyses[0]?.tid || '',
        ...deviceEventStats,
      });
    }

    console.log(`\n  ✅ Completed analysis of ${deviceStats.totalDevices} devices\n`);

    // Generate output file paths
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = path.dirname(outputFilePath || process.cwd());
    const baseFilename = path.basename(outputFilePath || `multi_device_report_${timestamp}.csv`, '.csv');

    const dropsReportPath = path.join(outputDir, `${baseFilename}_drops.csv`);
    const summaryReportPath = path.join(outputDir, `${baseFilename}_summary.csv`);
    const statsPath = path.join(outputDir, `${baseFilename}_stats.json`);

    // Generate reports
    console.log('📝 Generating reports...\n');
    const reportMetadata = await generateReport(allAnalyses, dropsReportPath);

    // Generate device summary CSV
    const summaryCSV = generateDeviceSummaryCSV(deviceSummaries);
    fs.writeFileSync(summaryReportPath, summaryCSV);

    // Calculate overall statistics
    const overallEventStats = calculateEventStatistics(allAnalyses);

    // Generate aggregate statistics JSON
    const aggregateStats = generateAggregateStats(deviceSummaries, overallEventStats, deviceStats);
    fs.writeFileSync(statsPath, JSON.stringify(aggregateStats, null, 2));

    // Print summary
    printMultiDeviceSummary(deviceStats, overallEventStats, deviceSummaries, {
      dropsReportPath,
      summaryReportPath,
      statsPath,
    });

    return {
      deviceCount: deviceStats.totalDevices,
      allAnalyses,
      deviceSummaries,
      reportMetadata,
      overallEventStats,
      aggregateStats,
    };
  } catch (error) {
    console.error('\n❌ Error during multi-device analysis:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Main entry point for event drop analyzer (single device)
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

    // Check if this is a multi-device log
    const deviceMap = groupByDevice(transactionMap);
    if (deviceMap.size > 1) {
      console.log(`⚠️  Detected ${deviceMap.size} devices in log file. Switching to multi-device mode...\n`);
      return analyzeMultiDeviceLog(inputFilePath, outputFilePath);
    }

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

    // Build timeline: sort transactions by first event timestamp
    const txnTimeline = Array.from(transactionMap.entries()).map(([txnId, events]) => {
      const timestamps = events
        .map(e => parseInt(e.properties?.EVENT_TIME))
        .filter(t => !isNaN(t));
      const firstEventTime = timestamps.length > 0 ? Math.min(...timestamps) : 0;
      const lastEventTime = timestamps.length > 0 ? Math.max(...timestamps) : 0;
      return { txnId, events, firstEventTime, lastEventTime };
    }).sort((a, b) => a.firstEventTime - b.firstEventTime);

    // Analyze each transaction with context about the next sequence
    const analyses = [];

    for (let i = 0; i < txnTimeline.length; i++) {
      const { txnId, events, lastEventTime } = txnTimeline[i];

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

      // Build next sequence context (within 15 second window)
      let nextSequenceContext = null;
      if (i < txnTimeline.length - 1) {
        const nextSeq = txnTimeline[i + 1];
        const timeDiffMs = nextSeq.firstEventTime - lastEventTime;

        if (timeDiffMs > 0 && timeDiffMs <= 15000) {
          nextSequenceContext = {
            sequenceId: nextSeq.txnId,
            timeDiffMs,
            events: nextSeq.events,
          };
        }
      }

      // Analyze flow
      const flowAnalysis = analyzeFlow(events, paymentType);

      // Classify drop
      const dropClassification = classifyDrop(flowAnalysis, events, nextSequenceContext);

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

/**
 * Generate device summary CSV
 * @param {Array} deviceSummaries - Array of device summaries
 * @returns {string} - CSV content
 */
function generateDeviceSummaryCSV(deviceSummaries) {
  const headers = [
    'dsn',
    'mid',
    'tid',
    'total_transactions',
    'total_events',
    'success_count',
    'failure_count',
    'legitimate_drops',
    'user_cancellations',
    'mode_switches',
    'drop_rate_pct',
  ];

  const rows = [headers.join(',')];

  for (const summary of deviceSummaries) {
    const totalTxns = summary.totalTransactions;
    const successCount = summary.byPaymentType
      ? Object.values(summary.byPaymentType).reduce((sum, type) => sum + (type.successCount || 0), 0)
      : 0;
    const failureCount = summary.byPaymentType
      ? Object.values(summary.byPaymentType).reduce((sum, type) => sum + (type.failureCount || 0), 0)
      : 0;
    const dropCount = summary.byPaymentType
      ? Object.values(summary.byPaymentType).reduce((sum, type) => sum + (type.legitimateDropCount || 0), 0)
      : 0;
    const cancelCount = summary.byPaymentType
      ? Object.values(summary.byPaymentType).reduce((sum, type) => sum + (type.userCancellationCount || 0), 0)
      : 0;
    const modeSwitchCount = summary.byPaymentType
      ? Object.values(summary.byPaymentType).reduce((sum, type) => sum + (type.modeSwitchCount || 0), 0)
      : 0;

    const dropRate = totalTxns > 0 ? ((dropCount / totalTxns) * 100).toFixed(2) : '0.00';

    rows.push([
      summary.dsn,
      summary.mid || '',
      summary.tid || '',
      totalTxns,
      summary.totalActualEvents || 0,
      successCount,
      failureCount,
      dropCount,
      cancelCount,
      modeSwitchCount,
      dropRate,
    ].join(','));
  }

  return rows.join('\n');
}

/**
 * Generate aggregate statistics JSON
 * @param {Array} deviceSummaries - Array of device summaries
 * @param {Object} overallEventStats - Overall event statistics
 * @param {Object} deviceStats - Device statistics
 * @returns {Object} - Aggregate statistics
 */
function generateAggregateStats(deviceSummaries, overallEventStats, deviceStats) {
  // Calculate totals across all devices
  const totalSuccess = deviceSummaries.reduce((sum, d) =>
    sum + Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.successCount || 0), 0), 0);
  const totalFailure = deviceSummaries.reduce((sum, d) =>
    sum + Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.failureCount || 0), 0), 0);
  const totalDrops = deviceSummaries.reduce((sum, d) =>
    sum + Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.legitimateDropCount || 0), 0), 0);
  const totalCancellations = deviceSummaries.reduce((sum, d) =>
    sum + Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.userCancellationCount || 0), 0), 0);

  // Find top problematic devices
  const topProblematicDevices = deviceSummaries
    .map(d => {
      const drops = Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.legitimateDropCount || 0), 0);
      const dropRate = d.totalTransactions > 0 ? (drops / d.totalTransactions) * 100 : 0;
      return {
        dsn: d.dsn,
        drops,
        transactions: d.totalTransactions,
        dropRate: parseFloat(dropRate.toFixed(2)),
      };
    })
    .filter(d => d.drops > 0)
    .sort((a, b) => b.dropRate - a.dropRate)
    .slice(0, 20);

  return {
    date: new Date().toISOString().split('T')[0],
    totalDevices: deviceStats.totalDevices,
    totalTransactions: deviceStats.totalTransactions,
    totalEvents: deviceStats.totalEvents,
    summary: {
      successes: totalSuccess,
      failures: totalFailure,
      legitimateDrops: totalDrops,
      userCancellations: totalCancellations,
      successRate: deviceStats.totalTransactions > 0
        ? parseFloat(((totalSuccess / deviceStats.totalTransactions) * 100).toFixed(2))
        : 0,
      dropRate: deviceStats.totalTransactions > 0
        ? parseFloat(((totalDrops / deviceStats.totalTransactions) * 100).toFixed(2))
        : 0,
    },
    byPaymentType: overallEventStats.byPaymentType,
    topProblematicDevices,
  };
}

/**
 * Print multi-device summary to console
 * @param {Object} deviceStats - Device statistics
 * @param {Object} overallEventStats - Overall event statistics
 * @param {Array} deviceSummaries - Array of device summaries
 * @param {Object} reportPaths - Report file paths
 */
function printMultiDeviceSummary(deviceStats, overallEventStats, deviceSummaries, reportPaths) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 MULTI-DEVICE EVENT DROP ANALYSIS SUMMARY');
  console.log('='.repeat(80));

  console.log(`\n📋 OVERALL SUMMARY`);
  console.log(`  Devices Analyzed: ${deviceStats.totalDevices}`);
  console.log(`  Total Transactions: ${deviceStats.totalTransactions.toLocaleString()}`);
  console.log(`  Total Events: ${deviceStats.totalEvents.toLocaleString()}`);

  // Calculate aggregate counts
  const totalSuccess = deviceSummaries.reduce((sum, d) =>
    sum + Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.successCount || 0), 0), 0);
  const totalFailure = deviceSummaries.reduce((sum, d) =>
    sum + Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.failureCount || 0), 0), 0);
  const totalDrops = deviceSummaries.reduce((sum, d) =>
    sum + Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.legitimateDropCount || 0), 0), 0);
  const totalCancellations = deviceSummaries.reduce((sum, d) =>
    sum + Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.userCancellationCount || 0), 0), 0);

  const successRate = deviceStats.totalTransactions > 0
    ? ((totalSuccess / deviceStats.totalTransactions) * 100).toFixed(2)
    : '0.00';
  const dropRate = deviceStats.totalTransactions > 0
    ? ((totalDrops / deviceStats.totalTransactions) * 100).toFixed(2)
    : '0.00';

  console.log(`  ✅ Successful: ${totalSuccess.toLocaleString()} (${successRate}%)`);
  console.log(`  ⚠️  Failed: ${totalFailure.toLocaleString()}`);
  console.log(`  ❌ Legitimate Drops: ${totalDrops.toLocaleString()} (${dropRate}%)`);
  console.log(`  🚫 User Cancellations: ${totalCancellations.toLocaleString()}`);

  // Top problematic devices
  const problematicDevices = deviceSummaries
    .map(d => {
      const drops = Object.values(d.byPaymentType || {}).reduce((s, t) => s + (t.legitimateDropCount || 0), 0);
      const dropRate = d.totalTransactions > 0 ? (drops / d.totalTransactions) * 100 : 0;
      return { dsn: d.dsn, drops, txns: d.totalTransactions, dropRate };
    })
    .filter(d => d.drops > 0)
    .sort((a, b) => b.dropRate - a.dropRate)
    .slice(0, 10);

  if (problematicDevices.length > 0) {
    console.log(`\n⚠️  TOP 10 PROBLEMATIC DEVICES (Highest Drop Rates):`);
    problematicDevices.forEach((d, i) => {
      console.log(`  ${i + 1}. DSN ${d.dsn} - ${d.drops} drops / ${d.txns} txns (${d.dropRate.toFixed(2)}%)`);
    });
  }

  console.log(`\n📁 Reports saved to:`);
  console.log(`  - Drops Report: ${reportPaths.dropsReportPath}`);
  console.log(`  - Device Summary: ${reportPaths.summaryReportPath}`);
  console.log(`  - Aggregate Stats: ${reportPaths.statsPath}`);

  console.log('\n' + '='.repeat(80) + '\n');
}

module.exports = {
  analyzeEventLog,
  analyzeMultiDeviceLog,
};
