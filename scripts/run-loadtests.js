#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const suite = [
  { name: 'auth', script: 'loadtest:auth' },
  { name: 'constitution', script: 'loadtest:constitution' },
  { name: 'performance', script: 'loadtest:performance' },
  { name: 'governance', script: 'loadtest:governance' },
  { name: 'health', script: 'loadtest:health' },
  { name: 'search', script: 'loadtest:search' },
  { name: 'payment', script: 'loadtest:payment' },
  { name: 'mixed', script: 'loadtest:mixed' },
];

function run(script) {
  const result = spawnSync(npmCommand, ['run', script], { stdio: 'inherit' });
  if (typeof result.status === 'number') return result.status;
  if (result.signal) return 1;
  return 0;
}

function main() {
  const failures = [];

  for (const test of suite) {
    console.log(`\n=== Running ${test.name} (${test.script}) ===\n`);
    const exitCode = run(test.script);
    if (exitCode !== 0) failures.push({ ...test, exitCode });
  }

  if (failures.length > 0) {
    console.error('\nLoad test suite completed with failures:');
    for (const failure of failures) {
      console.error(`- ${failure.name} (${failure.script}) exit ${failure.exitCode}`);
    }
    process.exit(1);
  }

  console.log('\nLoad test suite completed successfully.');
}

main();
