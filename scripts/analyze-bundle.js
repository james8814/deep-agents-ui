#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Analyzes Next.js build output for size optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUNDLE_BUDGET = {
  total: 1048576, // 1MB
  js: 512000, // 500KB
  css: 102400, // 100KB
};

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function analyzeNextBuild() {
  const buildDir = path.join(__dirname, '../.next');
  const publicDir = path.join(__dirname, '../public');

  console.log('\n📦 BUNDLE SIZE ANALYSIS\n');
  console.log('='.repeat(60));

  // Analyze .next/static/chunks
  const chunksDir = path.join(buildDir, 'static/chunks');
  let totalJsSize = 0;
  let jsFiles = [];

  if (fs.existsSync(chunksDir)) {
    const files = fs.readdirSync(chunksDir);
    files.forEach((file) => {
      if (file.endsWith('.js')) {
        const filePath = path.join(chunksDir, file);
        const size = getFileSize(filePath);
        totalJsSize += size;
        jsFiles.push({ name: file, size });
      }
    });

    jsFiles.sort((a, b) => b.size - a.size);
  }

  // Analyze .next/static/css
  const cssDir = path.join(buildDir, 'static/css');
  let totalCssSize = 0;
  let cssFiles = [];

  if (fs.existsSync(cssDir)) {
    const files = fs.readdirSync(cssDir);
    files.forEach((file) => {
      if (file.endsWith('.css')) {
        const filePath = path.join(cssDir, file);
        const size = getFileSize(filePath);
        totalCssSize += size;
        cssFiles.push({ name: file, size });
      }
    });

    cssFiles.sort((a, b) => b.size - a.size);
  }

  // JavaScript Analysis
  console.log('\n📊 JAVASCRIPT BUNDLES:\n');
  console.log(`Total JS Size: ${formatBytes(totalJsSize)}`);
  console.log(`Budget: ${formatBytes(BUNDLE_BUDGET.js)}`);
  console.log(`Status: ${totalJsSize <= BUNDLE_BUDGET.js ? '✓ PASS' : '✗ FAIL'}\n`);

  console.log('Top 10 Largest JS Files:');
  jsFiles.slice(0, 10).forEach((file, i) => {
    const percentage = ((file.size / totalJsSize) * 100).toFixed(1);
    console.log(
      `  ${i + 1}. ${file.name.padEnd(40)} ${formatBytes(file.size).padStart(10)} (${percentage}%)`
    );
  });

  // CSS Analysis
  console.log('\n🎨 CSS BUNDLES:\n');
  console.log(`Total CSS Size: ${formatBytes(totalCssSize)}`);
  console.log(`Budget: ${formatBytes(BUNDLE_BUDGET.css)}`);
  console.log(`Status: ${totalCssSize <= BUNDLE_BUDGET.css ? '✓ PASS' : '✗ FAIL'}\n`);

  if (cssFiles.length > 0) {
    console.log('CSS Files:');
    cssFiles.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file.name.padEnd(40)} ${formatBytes(file.size).padStart(10)}`);
    });
  }

  // Total Size
  const totalSize = totalJsSize + totalCssSize;
  console.log('\n📈 TOTAL BUNDLE SIZE:\n');
  console.log(`JS + CSS: ${formatBytes(totalSize)}`);
  console.log(`Budget: ${formatBytes(BUNDLE_BUDGET.total)}`);
  console.log(`Status: ${totalSize <= BUNDLE_BUDGET.total ? '✓ PASS' : '✗ FAIL'}\n`);

  // Recommendations
  console.log('💡 OPTIMIZATION RECOMMENDATIONS:\n');

  const recommendations = [];

  if (totalJsSize > BUNDLE_BUDGET.js * 0.8) {
    recommendations.push(
      '  1. JavaScript bundle is approaching limit - consider code splitting'
    );
    recommendations.push('     - Review large dependencies in node_modules');
    recommendations.push('     - Use dynamic imports for heavy components');
    recommendations.push('     - Remove unused dependencies');
  }

  if (totalCssSize > BUNDLE_BUDGET.css * 0.8) {
    recommendations.push('  2. CSS bundle is large - optimize styling');
    recommendations.push('     - Remove unused CSS classes');
    recommendations.push('     - Use CSS-in-JS selectively');
    recommendations.push('     - Inline critical CSS');
  }

  if (jsFiles.length > 0) {
    const largestFile = jsFiles[0];
    if (largestFile.size > 100000) {
      recommendations.push(
        `  3. Largest JS file (${largestFile.name}) is ${formatBytes(largestFile.size)}`
      );
      recommendations.push('     - Consider code splitting for this chunk');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('  ✓ All bundle sizes are optimal!');
  }

  recommendations.forEach((rec) => console.log(rec));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ SUMMARY:\n');
  console.log(`JavaScript:   ${formatBytes(totalJsSize).padStart(12)} / ${formatBytes(BUNDLE_BUDGET.js).padEnd(12)} ${totalJsSize <= BUNDLE_BUDGET.js ? '✓' : '✗'}`);
  console.log(`CSS:          ${formatBytes(totalCssSize).padStart(12)} / ${formatBytes(BUNDLE_BUDGET.css).padEnd(12)} ${totalCssSize <= BUNDLE_BUDGET.css ? '✓' : '✗'}`);
  console.log(`Total:        ${formatBytes(totalSize).padStart(12)} / ${formatBytes(BUNDLE_BUDGET.total).padEnd(12)} ${totalSize <= BUNDLE_BUDGET.total ? '✓' : '✗'}`);
  console.log('\n');

  return {
    js: totalJsSize,
    css: totalCssSize,
    total: totalSize,
    passed: totalSize <= BUNDLE_BUDGET.total && totalJsSize <= BUNDLE_BUDGET.js,
  };
}

// Run analysis
if (require.main === module) {
  try {
    const result = analyzeNextBuild();
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('Error analyzing bundle:', error.message);
    process.exit(1);
  }
}

module.exports = { analyzeNextBuild };
