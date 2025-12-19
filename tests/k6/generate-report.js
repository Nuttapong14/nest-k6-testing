#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const REPORTS_DIR = path.join(__dirname, 'reports');
const RESULTS_DIR = path.join(__dirname, 'results');

// Ensure directories exist
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Generate HTML report from k6 results
function generateHtmlReport(resultsFile, reportFile) {
  console.log(`Generating HTML report from ${resultsFile}...`);

  // Try to use k6-to-html if available
  try {
    execSync(`npx k6-to-html ${resultsFile} -o ${reportFile}`, { stdio: 'inherit' });
  } catch (error) {
    console.log('k6-to-html not available, generating basic report...');

    // Basic report generation
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    const metrics = results.metrics;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>K6 Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e8f4f8; border-radius: 5px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .metric-label { font-size: 14px; color: #7f8c8d; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .pass { color: green; }
        .fail { color: red; }
    </style>
</head>
<body>
    <div class="header">
        <h1>K6 Load Test Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p>Test Duration: ${metrics.test_duration?.value || 'N/A'}</p>
    </div>

    <h2>Key Metrics</h2>
    <div class="metric">
        <div class="metric-value">${Math.round(metrics.http_req_duration?.avg || 0)}ms</div>
        <div class="metric-label">Avg Response Time</div>
    </div>
    <div class="metric">
        <div class="metric-value">${Math.round(metrics.http_req_duration?.p95 || 0)}ms</div>
        <div class="metric-label">95th Percentile</div>
    </div>
    <div class="metric">
        <div class="metric-value">${Math.round(metrics.http_reqs?.rate || 0)}</div>
        <div class="metric-label">Requests/sec</div>
    </div>
    <div class="metric">
        <div class="metric-value">${((metrics.http_req_failed?.rate || 0) * 100).toFixed(2)}%</div>
        <div class="metric-label">Error Rate</div>
    </div>
    <div class="metric">
        <div class="metric-value">${metrics.vus?.max || 0}</div>
        <div class="metric-label">Max VUs</div>
    </div>

    <h2>Thresholds</h2>
    <table>
        <tr>
            <th>Threshold</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Status</th>
        </tr>
        ${generateThresholdRows(metrics)}
    </table>

    <h2>All Metrics</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Type</th>
        </tr>
        ${generateMetricRows(metrics)}
    </table>
</body>
</html>`;

    fs.writeFileSync(reportFile, html);
    console.log(`Basic HTML report generated: ${reportFile}`);
  }
}

// Generate threshold status rows
function generateThresholdRows(metrics) {
  const thresholds = [
    { name: 'Response Time (p95)', expected: '<200ms', actual: `${Math.round(metrics.http_req_duration?.p95 || 0)}ms` },
    { name: 'Error Rate', expected: '<5%', actual: `${((metrics.http_req_failed?.rate || 0) * 100).toFixed(2)}%` },
    { name: 'Throughput', expected: '>100 req/s', actual: `${Math.round(metrics.http_reqs?.rate || 0)} req/s` },
  ];

  return thresholds.map(t => `
    <tr>
        <td>${t.name}</td>
        <td>${t.expected}</td>
        <td>${t.actual}</td>
        <td class="${t.actual.includes(t.expected.replace(/[<>]/g, '')) ? 'pass' : 'fail'}">
            ${t.actual.includes(t.expected.replace(/[<>]/g, '')) ? 'PASS' : 'FAIL'}
        </td>
    </tr>
  `).join('');
}

// Generate all metrics rows
function generateMetricRows(metrics) {
  return Object.entries(metrics || {})
    .filter(([key]) => !key.startsWith('threshold_'))
    .map(([key, metric]) => {
      let value = 'N/A';
      if (metric.value !== undefined) value = metric.value;
      else if (metric.avg !== undefined) value = Math.round(metric.avg);
      else if (metric.count !== undefined) value = metric.count;
      else if (metric.rate !== undefined) value = (metric.rate * 100).toFixed(2) + '%';

      return `
        <tr>
            <td>${key}</td>
            <td>${value}</td>
            <td>${metric.type || 'N/A'}</td>
        </tr>
      `;
    })
    .join('');
}

// Generate CSV report
function generateCsvReport(resultsFile, csvFile) {
  console.log(`Generating CSV report from ${resultsFile}...`);

  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  const metrics = results.metrics;

  let csv = 'Metric,Value,Type\n';

  Object.entries(metrics || {})
    .filter(([key]) => !key.startsWith('threshold_'))
    .forEach(([key, metric]) => {
      let value = 'N/A';
      if (metric.value !== undefined) value = metric.value;
      else if (metric.avg !== undefined) value = Math.round(metric.avg);
      else if (metric.count !== undefined) value = metric.count;
      else if (metric.rate !== undefined) value = (metric.rate * 100).toFixed(2) + '%';

      csv += `"${key}","${value}","${metric.type || 'N/A'}"\n`;
    });

  fs.writeFileSync(csvFile, csv);
  console.log(`CSV report generated: ${csvFile}`);
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'mixed'; // auth, search, payment, mixed

  console.log(`Generating reports for ${testType} load test...`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(RESULTS_DIR, `${testType}-results-${timestamp}.json`);
  const htmlReportFile = path.join(REPORTS_DIR, `${testType}-report-${timestamp}.html`);
  const csvReportFile = path.join(REPORTS_DIR, `${testType}-report-${timestamp}.csv`);

  // Check if results file exists
  if (!fs.existsSync(resultsFile)) {
    console.error(`Results file not found: ${resultsFile}`);
    console.log('Please run the load test first to generate results.');
    process.exit(1);
  }

  // Generate reports
  generateHtmlReport(resultsFile, htmlReportFile);
  generateCsvReport(resultsFile, csvReportFile);

  console.log('\nReports generated successfully!');
  console.log(`HTML Report: ${htmlReportFile}`);
  console.log(`CSV Report: ${csvReportFile}`);

  // Open HTML report if in interactive mode
  if (process.stdout.isTTY) {
    try {
      execSync(`open "${htmlReportFile}"`); // macOS
    } catch {
      try {
        execSync(`xdg-open "${htmlReportFile}"`); // Linux
      } catch {
        console.log('Please open the HTML report manually to view results.');
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateHtmlReport,
  generateCsvReport,
};