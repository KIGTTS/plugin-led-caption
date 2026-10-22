'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../src/main/assets/led/layout.js');
const measure=(character,font)=>character.codePointAt(0)>255?font:font*.6;

test('safe text viewport preserves the full card lattice in both orientations',()=>{
  for(const [width,height] of [[393,540],[851,230]]) {
    const board=api.geometry(width,height,3),geo=api.viewport(board,{top:60,right:12,bottom:56,left:12});
    assert.ok(geo.offsetY>=60);assert.ok(geo.offsetX>=12);
    assert.ok(geo.offsetY+geo.rows*geo.pitch<=height-56);
    assert.ok(geo.offsetX+geo.columns*geo.pitch<=width-12);
    assert.ok(Math.abs((geo.offsetX-board.offsetX)/geo.pitch-Math.round((geo.offsetX-board.offsetX)/geo.pitch))<1e-8);
    assert.equal(geo.width,width);assert.equal(geo.height,height);
  }
  const board=api.geometry(240,120,1),bounded=api.viewport(board,{top:1e9,bottom:1e9,right:NaN,left:-3});
  assert.ok(bounded.rows>=8&&bounded.columns>=8);
  assert.deepEqual(api.safeArea(null),{top:0,right:0,bottom:0,left:0});
});
test('keeps emoji sequences and Chinese graphemes intact',()=>{
  assert.deepEqual(api.graphemes('你👩🏽‍💻好é'),['你','👩🏽‍💻','好','é']);
});
test('short subtitles fit and remain centered with finite geometry in both orientations',()=>{
  for(const [width,height] of [[393,540],[851,230],[240,120],[1920,1080]]){
    const geo=api.geometry(width,height,3),model=api.layout('你好，KIGTTS',geo,measure,28);
    assert.ok(geo.dpr<=1.5);assert.equal(model.pages.length,1);
    assert.ok(model.font>=6);
    assert.equal(model.scrolling,model.pages[0].length*model.lineHeight>model.rows);
    assert.ok(model.pages.flat().every(line=>Array.from(line).reduce((sum,char)=>sum+measure(char,model.font),0)<=model.columns+1));
  }
});
test('long content is paginated without truncation and each cached canvas is bounded',()=>{
  const text='这是很长的字幕。'.repeat(1800),geo=api.geometry(1920,1080,4),model=api.layout(text,geo,measure,50);
  assert.ok(model.scrolling);assert.ok(model.pages.length>1);
  assert.equal(model.pages.flat().join(''),text);
  for(const page of model.pages){
    const pixels=Math.ceil(geo.columns*geo.pitch*geo.dpr)*Math.ceil((page.length*model.lineHeight+6)*geo.pitch*geo.dpr);
    assert.ok(pixels<=6100000,`cached pixels ${pixels}`);
  }
});
test('manual newlines and empty placeholder lines remain meaningful',()=>{
  assert.deepEqual(api.wrap(api.graphemes('一\n\n二'),14,60,measure),['一','','二']);
  assert.deepEqual(api.wrap([],14,60,measure),['']);
});
test('larger font requests grow the text when space is available',()=>{
  const geo=api.geometry(1200,720,1);
  assert.ok(api.layout('你好',geo,measure,50).font>api.layout('你好',geo,measure,10).font);
});
test('Latin words stay together when a whole word can fit the line',()=>{
  const lines=api.wrap(api.graphemes('LED 字幕 KIGTTS'),14,90,measure);
  assert.ok(lines.some(line=>line.includes('KIGTTS')));
  assert.equal(lines.join(''),'LED 字幕 KIGTTS');
});
