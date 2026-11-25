(function(global){
  'use strict';
  const layout=global.KigttsLedLayout||(typeof require==='function'?require('./layout.js'):null);
  function viewport(board,insets,heightFraction){
    const safe=layout.viewport(board,insets),rows=Math.max(8,Math.floor(safe.rows*heightFraction));
    return {...safe,rows,offsetY:safe.offsetY+Math.floor((safe.rows-rows)/2)*safe.pitch};
  }
  function plan(text,geo,measure,sizePercent,settings,measureInk){
    const pitch=geo.pitch*geo.dpr,cellBudget=Math.min(60000,Math.floor(5900000/(pitch*pitch)));
    if(settings.adaptiveMultiLine){
      const model=layout.layout(text,geo,measure,sizePercent*settings.fontScale),lines=model.pages.flat();
      const maxLines=Math.max(1,Math.min(80,Math.floor((cellBudget/geo.columns-6)/model.lineHeight),Math.floor((4096/pitch-6)/model.lineHeight)));
      const pages=[];for(let start=0;start<lines.length;start+=maxLines)pages.push(lines.slice(start,start+maxLines));
      return {...model,pages,axis:'y',totalColumns:geo.columns,pageStarts:pages.map(()=>0),pageWidths:pages.map(()=>geo.columns)};
    }
    // Fit visible glyph ink, not a font's em box plus a second line of padding.
    const ink=measureInk?measureInk(text):{ascent:.8,descent:.2};
    const fill=Math.max(0,Math.min(1,Math.max((settings.fontScale-1)/2,(sizePercent-28)/22)));
    const fit=(geo.rows-.5)/(ink.ascent+ink.descent),preferred=geo.columns*Math.max(1,Math.min(100,sizePercent))*settings.fontScale/100;
    const font=Math.max(1,Math.min(512,preferred+(fit-preferred)*fill,fit));
    const baseline=.25+font*ink.ascent,lineHeight=Math.min(geo.rows,Math.ceil(font*(ink.ascent+ink.descent)+.5));
    const maxColumns=Math.max(font+6,Math.min(1800,Math.floor(4096/pitch),Math.floor(cellBudget/(lineHeight+6))));
    const parts=layout.graphemes(text.replace(/[\r\n\t]+/g,' ')),pages=[],pageWidths=[],pageStarts=[];
    let line='',width=0,total=0;
    const append=()=>{const cells=Math.max(1,Math.ceil(width));pages.push([line]);pageStarts.push(total);pageWidths.push(cells);total+=cells;line='';width=0;};
    for(const character of parts){const advance=measure(character,font);if(line&&width+advance>maxColumns)append();line+=character;width+=advance;}
    if(line||!pages.length)append();
    return {font,lineHeight,baseline,padding:0,pages,axis:'x',totalColumns:total,pageStarts,pageWidths,columns:geo.columns,rows:geo.rows,scrolling:total>geo.columns};
  }
  function horizontalOffset(elapsed,model,geo,settings,reduced){
    if(!model.scrolling)return 0;
    const gap=settings.loopGapDp/geo.pitch,period=model.totalColumns+gap;
    const distance=reduced?Math.floor(elapsed/6000)*Math.max(1,geo.columns-6):Math.floor(Math.max(0,elapsed-1600)/1000*settings.scrollSpeedDpPerSecond/geo.pitch);
    return distance%period;
  }
  const api={viewport,plan,horizontalOffset};global.KigttsLedScene=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
