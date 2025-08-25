#!/usr/bin/env bun
/**
 * Build script with Bun --define optimizations
 * Builds the application with production defines for dead code elimination
 * Now with YAML configuration support
 */

import { $ } from 'bun';
import path from 'path';
import fs from 'fs/promises';
import { app, server } from '../config/app.yaml';

const defines = require('../config/bun-defines.js');

async function build() {
  console.log('🚀 Building with Bun --define optimizations...\n');

  // Clean dist directory
  console.log('📦 Cleaning dist directory...');
  await $`rm -rf dist`;
  await $`mkdir -p dist`;

  // Get production defines
  const prodDefines = defines.production;
  
  // Format defines for CLI
  const defineFlags = Object.entries(prodDefines)
    .map(([key, value]) => `--define ${key}=${JSON.stringify(value)}`)
    .join(' ');

  console.log('🔧 Using production defines:');
  console.log('  - NODE_ENV: production');
  console.log('  - Console logs: disabled');
  console.log('  - Debug mode: disabled');
  console.log('  - Dev tools: disabled');
  console.log('  - Config source: YAML');
  console.log(`  - App: ${app.name} v${app.version}\n`);

  // Build main entry points
  const entryPoints = [
    'src/index.tsx',
    'src/server/admin/index.ts',
    'src/admin_portal_server.ts',
    'src/client/admin-mobile/server.ts',
  ];

  for (const entry of entryPoints) {
    const entryPath = path.resolve(entry);
    
    // Check if file exists
    try {
      await fs.access(entryPath);
    } catch {
      console.log(`⏭️  Skipping ${entry} (not found)`);
      continue;
    }

    console.log(`📦 Building ${entry}...`);
    
    const outputName = path.basename(entry, path.extname(entry));
    
    // Build command with defines
    const buildCmd = `bun build ${defineFlags} \
      --target=bun \
      --splitting \
      --minify \
      --sourcemap=external \
      --outdir=dist \
      --entry-naming=[name]-[hash].js \
      ${entryPath}`;

    try {
      await $`sh -c "${buildCmd}"`;
      console.log(`✅ Built ${outputName}\n`);
    } catch (error) {
      console.error(`❌ Failed to build ${entry}:`, error);
      process.exit(1);
    }
  }

  // Build React app separately with browser target
  console.log('📦 Building React app for browser...');
  
  const reactBuildCmd = `bun build ${defineFlags} \
    --target=browser \
    --splitting \
    --minify \
    --sourcemap=external \
    --outdir=dist/static \
    --entry-naming=[name]-[hash].js \
    --asset-naming=[name]-[hash].[ext] \
    src/App.tsx`;

  try {
    await $`sh -c "${reactBuildCmd}"`;
    console.log('✅ Built React app\n');
  } catch (error) {
    console.error('❌ Failed to build React app:', error);
    process.exit(1);
  }

  // Copy static assets
  console.log('📁 Copying static assets...');
  try {
    await $`cp -r public/* dist/ 2>/dev/null || true`;
    await $`cp -r static/* dist/static/ 2>/dev/null || true`;
  } catch {
    // Ignore errors if directories don't exist
  }

  // Generate build report
  console.log('📊 Generating build report...');
  
  const distSize = await $`du -sh dist`.text();
  const fileCount = await $`find dist -type f | wc -l`.text();
  
  console.log('\n✨ Build completed successfully!\n');
  console.log('📊 Build Statistics:');
  console.log(`  - Total size: ${distSize.trim()}`);
  console.log(`  - File count: ${fileCount.trim()} files`);
  console.log(`  - Output directory: dist/`);
  console.log('\n🎯 Optimizations applied:');
  console.log('  - Dead code elimination');
  console.log('  - Console logs removed');
  console.log('  - Debug code stripped');
  console.log('  - React DevTools removed');
  console.log('  - Code splitting enabled');
  console.log('  - Minification enabled');
  
  console.log('\n🚀 Ready for production deployment!');
}

// Run build
build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});