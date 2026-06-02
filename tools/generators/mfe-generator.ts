/**
 * MFE Scaffolding Generator
 * Usage: npx ts-node tools/generators/mfe-generator.ts my-mfe
 */

import * as fs from 'fs';
import * as path from 'path';

const mfeName = process.argv[2] || 'example-mfe';

const structure = {
  [`apps/${mfeName}/src`]: {
    app: {},
    components: {},
    hooks: {},
    pages: {},
    services: {},
    state: {},
    styles: {},
    tests: {},
    types: {},
  },
};

function createStructure(base: string, obj: any) {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path.join(base, key);
    if (typeof value === 'object' && value !== null) {
      fs.mkdirSync(fullPath, { recursive: true });
      createStructure(fullPath, value);
    }
  }
}

createStructure('.', structure);
console.log(`MFE scaffold created at apps/${mfeName}`);
