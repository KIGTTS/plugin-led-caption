'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../src/main/assets/led/style.js');
const layout=require('../src/main/assets/led/layout.js');
test('style values are allowlisted and malformed inputs recover to defaults',()=>{
  assert.deepEqual(api.normalize({color:'<script>',density:0,glow:'bad',speed:'warp'}),api.defaults);
  assert.deepEqual(api.normalize(null),api.defaults);
  assert.equal(api.normalize({color:'cyan'}).color,'cyan');
});
test('density presets visibly change lamp spacing without changing the board bounds',()=>{
  const fine=layout.geometry(393,540,3,api.tokens({density:'fine'}).pitch);
  const bold=layout.geometry(393,540,3,api.tokens({density:'bold'}).pitch);
  assert.ok(fine.columns>bold.columns);assert.equal(fine.width,bold.width);assert.equal(fine.height,bold.height);
});
test('glow and speed presets remain bounded and ordered',()=>{
  assert.ok(api.tokens({glow:'soft'}).glowAlpha<api.tokens({glow:'bright'}).glowAlpha);
  assert.ok(api.tokens({speed:'slow'}).speedRows<api.tokens({speed:'fast'}).speedRows);
  for(const color of ['amber','white','green','cyan','rose'])assert.match(api.tokens({color}).palette.body,/^#[a-f0-9]{6}$/i);
});
