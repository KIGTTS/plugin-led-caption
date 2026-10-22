(function (global) {
  'use strict';
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined,{granularity:'grapheme'}) : null;
  function graphemes(text) {
    if (segmenter) return Array.from(segmenter.segment(text),item=>item.segment);
    const result=[];
    for(const char of Array.from(text)) {
      const code=char.codePointAt(0), previous=result[result.length-1];
      if(previous && (char==='\u200d' || previous.endsWith('\u200d') || /[\u0300-\u036f\ufe00-\ufe0f]/.test(char) || (code>=0x1f3fb && code<=0x1f3ff))) result[result.length-1]+=char;
      else result.push(char);
    }
    return result;
  }
  function geometry(width,height,dpr,spacing=1) {
    const scale=Number.isFinite(spacing)?Math.max(.75,Math.min(1.5,spacing)):1;
    const pitch=Math.max(3.5,Math.min(7,width/72,height/48))*scale;
    const columns=Math.max(8,Math.floor(width/pitch)),rows=Math.max(8,Math.floor(height/pitch));
    return {width,height,pitch,columns,rows,dpr:Math.max(1,Math.min(1.5,dpr||1)),offsetX:(width-columns*pitch)/2,offsetY:(height-rows*pitch)/2};
  }
  function safeArea(value={}) {
    const inset=side=>Number.isFinite(value?.[side])?Math.max(0,value[side]):0;
    return {top:inset('top'),right:inset('right'),bottom:inset('bottom'),left:inset('left')};
  }
  function viewport(board,insets={}) {
    const area=safeArea(insets),cells=(value,max)=>Math.min(Math.max(0,max),Math.ceil(value/board.pitch));
    const left=cells(area.left,board.columns-8),right=cells(area.right,board.columns-left-8);
    const top=cells(area.top,board.rows-8),bottom=cells(area.bottom,board.rows-top-8);
    return {...board,columns:board.columns-left-right,rows:board.rows-top-bottom,
      offsetX:board.offsetX+left*board.pitch,offsetY:board.offsetY+top*board.pitch};
  }
  function wrap(parts,font,columns,measure,stopAfter=Infinity) {
    const lines=[];let line='',advance=0;
    const tokens=[];
    for(const character of parts){
      if(/^[A-Za-z0-9_'’-]+$/.test(character)&&tokens.length&&/^[A-Za-z0-9_'’-]+$/.test(tokens[tokens.length-1]))tokens[tokens.length-1]+=character;
      else tokens.push(character);
    }
    const widthOf=value=>/^[A-Za-z0-9_'’-]+$/.test(value)?Array.from(value).reduce((sum,character)=>sum+measure(character,font),0):measure(value,font);
    for(const token of tokens) {
      const tokenWidth=widthOf(token);
      const characters=tokenWidth>columns?graphemes(token):[token];
      for(const character of characters){
      if(character==='\r') continue;
      if(character==='\n'){lines.push(line);line='';advance=0;if(lines.length>stopAfter)return lines;continue;}
      const width=widthOf(character);
      if(line && advance+width>columns){lines.push(line);line='';advance=0;if(lines.length>stopAfter)return lines;}
      line+=character;advance+=width;
      }
    }
    lines.push(line);
    return lines;
  }
  function layout(text,geo,measure,sizePercent=28) {
    const parts=graphemes(text),columns=Math.max(4,geo.columns-6),rows=Math.max(4,geo.rows-6);
    const minimum=Math.min(14,Math.max(6,Math.floor(rows*.65)),Math.max(6,Math.floor(columns*.8)));
    const preferred=Math.max(minimum,Math.min(512,Math.floor(columns*Math.max(4,Math.min(225,sizePercent))/100),Math.floor(rows*.85)));
    let lo=minimum,hi=preferred,chosen=minimum,lines;
    while(lo<=hi){
      const font=Math.floor((lo+hi)/2),lineHeight=Math.ceil(font*1.2),available=Math.max(1,Math.floor(rows/lineHeight));
      const candidate=wrap(parts,font,columns,measure,available);
      if(candidate.length*lineHeight<=rows){chosen=font;lines=candidate;lo=font+1;}else hi=font-1;
    }
    lines=lines||wrap(parts,chosen,columns,measure);
    const lineHeight=Math.ceil(chosen*1.2);
    const pixelWidth=Math.max(1,geo.columns*geo.pitch*geo.dpr);
    const maxPixelHeight=Math.min(4096,6000000/pixelWidth);
    const maxLines=Math.max(1,Math.min(80,Math.floor((maxPixelHeight/(geo.pitch*geo.dpr)-6)/lineHeight)));
    const pages=[];
    for(let start=0;start<lines.length;start+=maxLines)pages.push(lines.slice(start,start+maxLines));
    return {font:chosen,lineHeight,pages,columns,rows,scrolling:lines.length*lineHeight>rows,graphemes:parts.length};
  }
  const api={geometry,safeArea,viewport,graphemes,wrap,layout};
  global.KigttsLedLayout=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
