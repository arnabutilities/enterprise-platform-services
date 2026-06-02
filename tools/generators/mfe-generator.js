'use strict';
/**
 * MFE Scaffolding Generator
 * Usage: npx ts-node tools/generators/mfe-generator.ts my-mfe
 */
var _a;
exports.__esModule = true;
var fs_1 = require('fs');
var path_1 = require('path');
var mfeName = process.argv[2] || 'example-mfe';
var structure =
  ((_a = {}),
  (_a['apps/'.concat(mfeName, '/src')] = {
    app: {},
    components: {},
    hooks: {},
    pages: {},
    services: {},
    state: {},
    styles: {},
    tests: {},
    types: {},
  }),
  _a);
function createStructure(base, obj) {
  for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
    var _b = _a[_i],
      key = _b[0],
      value = _b[1];
    var fullPath = path_1['default'].join(base, key);
    if (typeof value === 'object' && value !== null) {
      fs_1['default'].mkdirSync(fullPath, { recursive: true });
      createStructure(fullPath, value);
    }
  }
}
createStructure('.', structure);
console.log('\u2713 MFE scaffold created at apps/'.concat(mfeName));
