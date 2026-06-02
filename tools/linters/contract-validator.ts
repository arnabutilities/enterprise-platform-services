/**
 * Validate contracts are properly exported
 */

import fs from 'fs';
import path from 'path';

const contractsDir = 'contracts/src';
const appsDirs = fs.readdirSync('apps');

appsDirs.forEach((app) => {
  const contractImportPath = path.join('apps', app, 'src', 'types', 'index.ts');
  if (!fs.existsSync(contractImportPath)) {
    console.warn(`⚠️  ${app} missing contract type index`);
    return;
  }

  const contractImport = fs.readFileSync(contractImportPath, 'utf-8');

  if (!contractImport.includes('@enterprise-platform/contracts')) {
    console.warn(`⚠️  ${app} not using contracts`);
  }
});

console.log('✓ Contract validation complete');
