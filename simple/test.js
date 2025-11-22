const assert = require('assert');
const path = require('path');
const { Rooter, Config } = require('../server');
const logger = require('../lib/logger');

(async () => {
  // set views directory to simple/html for includes
  // __dirname is already the `simple` folder, so join to the local `html` folder
  const viewsDir = path.join(__dirname, 'html');

  const config = new Config();
  config.set(config.names.views, viewsDir);

  const mockReq = { res: { setHeader: () => { }, send: () => { }, json: () => { } }, data: {} };
  const r = new Rooter(mockReq);

  // 1) simple variable lookup
  let out = r.run({ title: 'Express' }, '{{ title }}');
  assert.ok(out.includes('Express'), 'Simple variable should render');

  // 2) include literal
  out = r.run({ title: 'Express', description: 'A minimal Easy Viewer example.' }, "{{ include('index'); }}");
  assert.ok(out.includes('text-2xl') && out.includes('A minimal Easy Viewer example.'), 'Include literal should include index.html content');

  // 3) include identifier (file_name)
  out = r.run({ file_name: 'index', title: 'Express', description: 'A minimal Easy Viewer example.' }, '{{ include(file_name); }}');
  assert.ok(out.includes('text-2xl') && out.includes('A minimal Easy Viewer example.'), 'Include identifier should include index.html content');

  // 4) dotted path identifier
  out = r.run({ obj: { name: 'index' }, title: 'Express', description: 'A minimal Easy Viewer example.' }, '{{ include(obj.name); }}');
  assert.ok(out.includes('text-2xl') && out.includes('A minimal Easy Viewer example.'), 'Include dotted path should include index.html');

  // 5) forbidden token should be rejected
  out = r.run({}, 'X {{ process.exit() }} Y');
  assert.ok(out.indexOf('process') === -1, 'Forbidden token should not be present in output');

  // 7) function calls should be disallowed by AST validator
  out = r.run({}, 'A {{ (function(){ return 1; })() }} B');
  assert.ok(out.indexOf('1') === -1, 'Function call result should not be rendered');

  // 8) method calls (toString) should be disallowed
  out = r.run({}, '{{ (123).toString() }}');
  assert.ok(out === '', 'Method call should be disallowed and render empty');

  // 9) Date.now() or other builtin calls should be disallowed
  out = r.run({}, '{{ Date.now() }}');
  assert.ok(out === '', 'Builtin function calls should be disallowed');

  // 10) computed member access should be disallowed
  out = r.run({ obj: { a: 'X', constructor: 'Y' } }, '{{ obj["a"] }}');
  assert.ok(out === '', 'Computed member access should be disallowed');

  // 11) accessing constructor should be disallowed
  out = r.run({ obj: { constructor: 'Y' } }, '{{ obj.constructor }}');
  assert.ok(out === '', 'Accessing constructor should be disallowed');

  // 6) simple escaping
  out = r.run({}, '{{ title }}');
  assert.ok(out === '', 'Missing variable should render empty string');

  // Ensure no unexpected throw
  logger.info('→ Template tests: OK');
  process.exit(0);
})();