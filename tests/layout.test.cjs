'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../src/main/assets/led/layout.js');
const measure=(character,font)=>character.codePointAt(0)>255?font:font*.6;
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
