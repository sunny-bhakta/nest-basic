#!/usr/bin/env node

/**
 * Test runner script for Enhanced Security Headers Middleware
 * Run specific tests or all tests with detailed output
 */

const { execSync } = require('child_process');
const path = require('path');

const testFiles = [
  'enhanced-security-headers.middleware.spec.ts',
  'security-headers.middleware.spec.ts', // if exists
];

const testCategories = {
  unit: 'Unit Tests',
  integration: 'Integration Tests',
  e2e: 'End-to-End Tests'
};

function runTest(testFile, options = {}) {
  const { verbose = false, coverage = false, watch = false } = options;
  
  let command = 'npm test';
  
  if (testFile) {
    command += ` -- ${testFile}`;
  }
  
  if (verbose) {
    command += ' --verbose';
  }
  
  if (coverage) {
    command += ' --coverage';
  }
  
  if (watch) {
    command += ' --watch';
  }
  
  console.log(`🧪 Running: ${command}`);
  console.log('━'.repeat(50));
  
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd() 
    });
    console.log('✅ Tests completed successfully!');
  } catch (error) {
    console.error('❌ Tests failed!');
    process.exit(1);
  }
}

function displayHelp() {
  console.log(`
🧪 Enhanced Security Headers Middleware Test Runner

Usage:
  node test-runner.js [options] [test-file]

Options:
  --verbose, -v     Show detailed test output
  --coverage, -c    Generate coverage report  
  --watch, -w       Watch mode for development
  --help, -h        Show this help message

Examples:
  node test-runner.js                                          # Run all tests
  node test-runner.js enhanced-security-headers               # Run specific test
  node test-runner.js --coverage                             # Run with coverage
  node test-runner.js --watch enhanced-security-headers      # Watch mode

Available Test Files:
${testFiles.map(file => `  📄 ${file}`).join('\n')}
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    displayHelp();
    return;
  }
  
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: args.includes('--coverage') || args.includes('-c'),
    watch: args.includes('--watch') || args.includes('-w'),
  };
  
  // Find test file argument (non-option argument)
  const testFile = args.find(arg => !arg.startsWith('-'));
  
  console.log('🛡️  Enhanced Security Headers Middleware Tests');
  console.log('━'.repeat(50));
  
  if (testFile) {
    console.log(`📄 Target: ${testFile}`);
  } else {
    console.log('📦 Running all middleware tests');
  }
  
  console.log(`🔧 Options: ${JSON.stringify(options, null, 2)}`);
  console.log('━'.repeat(50));
  
  runTest(testFile, options);
}

if (require.main === module) {
  main();
}

module.exports = { runTest, displayHelp };