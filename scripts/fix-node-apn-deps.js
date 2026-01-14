#!/usr/bin/env node
/**
 * Post-install script to fix node-apn bundled dependencies
 * Replaces vulnerable jsonwebtoken@8.5.1 with secure jsonwebtoken@9.0.3
 */

const fs = require('fs');
const path = require('path');

const apnJsonwebtokenPath = path.join(__dirname, '..', 'node_modules', 'node-apn', 'node_modules', 'jsonwebtoken');
const secureJsonwebtokenPath = path.join(__dirname, '..', 'node_modules', 'jsonwebtoken');

try {
  // Check if both paths exist
  if (fs.existsSync(secureJsonwebtokenPath) && fs.existsSync(apnJsonwebtokenPath)) {
    // Verify the secure version
    const securePackageJson = JSON.parse(fs.readFileSync(path.join(secureJsonwebtokenPath, 'package.json'), 'utf8'));
    const apnPackageJson = JSON.parse(fs.readFileSync(path.join(apnJsonwebtokenPath, 'package.json'), 'utf8'));
    
    if (securePackageJson.version.startsWith('9.') && apnPackageJson.version.startsWith('8.')) {
      console.log(`🔧 Replacing node-apn's jsonwebtoken@${apnPackageJson.version} with jsonwebtoken@${securePackageJson.version}`);
      
      // Remove old version
      fs.rmSync(apnJsonwebtokenPath, { recursive: true, force: true });
      
      // Copy secure version
      fs.cpSync(secureJsonwebtokenPath, apnJsonwebtokenPath, { recursive: true });
      
      console.log('✅ Successfully patched node-apn dependencies');
    } else {
      console.log('ℹ️  node-apn already using secure jsonwebtoken version or versions match');
    }
  } else {
    console.log('ℹ️  node-apn dependencies not found, skipping patch');
  }
} catch (error) {
  console.error('⚠️  Error patching node-apn dependencies:', error.message);
  // Don't fail the install if patching fails
  process.exit(0);
}
