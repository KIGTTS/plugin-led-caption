'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../src/main/assets/led/style.js'),scene=require('../src/main/assets/led/scene.js');
const measure=(character,font)=>character.codePointAt(0)>255?font:font*.6;
test('all nineteen settings have safe typed defaults and malformed values never enter paint',()=>{
  assert.equal(Object.keys(api.defaults).length,19);
  assert.deepEqual(api.normalize(null),api.defaults);
  const value=api.normalize({textColor:'<script>',backgroundColor:'red',dotRowsPerLine:Infinity,dotSizeFraction:-2,glowStrength:99,scrollDirection:'diagonal',screenBrightness:NaN});
  assert.equal(value.textColor,'#FFFFFF');assert.equal(value.backgroundColor,'#000000');assert.equal(value.dotRowsPerLine,24);
  assert.equal(value.dotSizeFraction,.1);assert.equal(value.glowStrength,1);assert.equal(value.scrollDirection,'left');assert.equal(value.screenBrightness,1);
});

test('larger font visibly increases height in both orientations while remaining bounded',()=>{
  for(const [width,height] of [[393,540],[851,300]]){
    function physical(scale){const settings=api.normalize({fontScale:scale,displayHeightFraction:1}),geo=scene.viewport(api.geometry(width,height,2,18,settings),{},1),model=scene.plan('大字幕',geo,measure,18,settings);return {height:model.font*geo.pitch,geo,model};}
    const normal=physical(1),large=physical(3);
    assert.ok(large.height>normal.height*1.15,`${width}x${height} actually enlarges glyphs`);
    assert.ok(large.height<=height);assert.ok(large.geo.columns*large.geo.rows<=120000);
  }
  assert.equal(api.normalize({fontScale:Infinity}).fontScale,1);assert.equal(api.normalize({fontScale:99}).fontScale,3);
});
test('0.1.1 named presets migrate without losing their visible color and intensity',()=>{
  const migrated=api.normalize({color:'cyan',density:'bold',glow:'soft',speed:'slow'});
  assert.equal(migrated.textColor,'#41CAF3');assert.equal(migrated.dotRowsPerLine,18);assert.equal(migrated.glowStrength,.2);assert.equal(migrated.scrollSpeedDpPerSecond,36);
});
test('density and diameter are independent, bounded by visible resolution',()=>{
  const fine=api.geometry(393,540,3,28,{dotRowsPerLine:256}),bold=api.geometry(393,540,3,28,{dotRowsPerLine:8});
  assert.ok(fine.columns>bold.columns);assert.ok(fine.columns*fine.rows<=120000);assert.equal(fine.dpr,1.5);
  assert.equal(api.normalize({dotSizeFraction:.9}).dotSizeFraction,.9);
});
test('arbitrary colors and disabled glow produce valid render tokens',()=>{
  const value=api.tokens({textColor:'#038387',backgroundColor:'#aabbcc',glowEnabled:false});
  assert.equal(value.palette.body,'#038387');assert.equal(value.backgroundColor,'#AABBCC');assert.equal(value.glowAlpha,0);
  for(const color of Object.values(value.palette).slice(0,4))assert.match(color,/^#[a-f0-9]{6}$/i);
});
test('marquee preserves all graphemes and every page remains bounded for huge content',()=>{
  const settings=api.normalize(),geo=scene.viewport(api.geometry(1920,1080,3,28,settings),{top:56,bottom:56},settings.displayHeightFraction);
  const text='字幕👩🏽‍💻KIGTTS'.repeat(5000),model=scene.plan(text,geo,measure,28,settings);
  assert.equal(model.axis,'x');assert.ok(model.scrolling);assert.equal(model.pages.flat().join(''),text);
  for(let i=0;i<model.pages.length;i++)assert.ok(Math.ceil(model.pageWidths[i]*geo.pitch*geo.dpr)*Math.ceil((model.lineHeight+6)*geo.pitch*geo.dpr)<6100000);
  assert.equal(scene.horizontalOffset(1500,model,geo,settings,false),0);
  assert.ok(scene.horizontalOffset(3000,model,geo,settings,false)>0);
  assert.ok(scene.horizontalOffset(6100,model,geo,settings,true)>0);
});
test('automatic wrapping preserves safe area, full board phase and height control',()=>{
  const settings=api.normalize({adaptiveMultiLine:true,displayHeightFraction:.5}),board=api.geometry(851,300,2,28,settings),geo=scene.viewport(board,{top:50,bottom:50,left:16,right:16},.5);
  assert.ok(geo.offsetY>=50&&geo.offsetY+geo.rows*geo.pitch<=250);assert.ok(geo.rows<board.rows/2);
  const model=scene.plan('换行字幕。'.repeat(100),geo,measure,28,settings);assert.equal(model.axis,'y');assert.ok(model.pages.length>0);
});
