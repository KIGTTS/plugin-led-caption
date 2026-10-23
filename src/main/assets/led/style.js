(function(global){
  'use strict';
  const legacyColors={amber:'#FFA424',white:'#C8E0FF',green:'#4EE48F',cyan:'#41CAF3',rose:'#FF60B1'};
  const defaults=Object.freeze({textColor:'#FFFFFF',backgroundColor:'#000000',dotMatrixEnabled:true,dotShape:'circle',
    dotRowsPerLine:24,dotSizeFraction:.58,glowEnabled:true,glowStrength:.42,displayHeightFraction:.72,fontScale:1,
    adaptiveMultiLine:false,scrollSpeedDpPerSecond:72,scrollDirection:'left',loopGapDp:96,
    shortTextAlignment:'center',quickSwipeOpensQuickText:true,keepScreenOn:true,followSystemBrightness:false,screenBrightness:1});
  function normalize(value){
    value=value&&typeof value==='object'?value:{};
    const color=(key,fallback)=>/^#[a-f\d]{6}$/i.test(value[key])?value[key].toUpperCase():fallback;
    const number=(key,fallback,min,max)=>typeof value[key]==='number'&&Number.isFinite(value[key])?Math.max(min,Math.min(max,value[key])):fallback;
    const bool=key=>typeof value[key]==='boolean'?value[key]:defaults[key];
    const choice=(key,options)=>options.includes(value[key])?value[key]:defaults[key];
    return {textColor:color('textColor',legacyColors[value.color]||defaults.textColor),backgroundColor:color('backgroundColor',defaults.backgroundColor),
      dotMatrixEnabled:bool('dotMatrixEnabled'),dotShape:choice('dotShape',['circle','square']),
      dotRowsPerLine:Math.round(number('dotRowsPerLine',{fine:30,bold:18}[value.density]||24,8,256)),
      dotSizeFraction:number('dotSizeFraction',.58,.1,1),glowEnabled:bool('glowEnabled'),
      glowStrength:number('glowStrength',{soft:.2,bright:.8}[value.glow]??.42,0,1),displayHeightFraction:number('displayHeightFraction',.72,.35,1),fontScale:number('fontScale',1,.5,3),
      adaptiveMultiLine:bool('adaptiveMultiLine'),scrollSpeedDpPerSecond:number('scrollSpeedDpPerSecond',{slow:36,fast:128}[value.speed]||72,24,1600),
      scrollDirection:choice('scrollDirection',['left','right']),loopGapDp:number('loopGapDp',96,24,1600),
      shortTextAlignment:choice('shortTextAlignment',['start','center','end']),quickSwipeOpensQuickText:bool('quickSwipeOpensQuickText'),
      keepScreenOn:bool('keepScreenOn'),followSystemBrightness:bool('followSystemBrightness'),screenBrightness:number('screenBrightness',1,.1,1)};
  }
  const rgb=color=>[1,3,5].map(start=>parseInt(color.slice(start,start+2),16));
  const mix=(parts,amount)=>'#'+parts.map(value=>Math.max(0,Math.min(255,Math.round(amount<0?value*(1+amount):value+(255-value)*amount))).toString(16).padStart(2,'0')).join('');
  function tokens(value){
    const settings=normalize(value),parts=rgb(settings.textColor);
    return {...settings,palette:{core:mix(parts,.9),mid:mix(parts,.55),body:settings.textColor,edge:mix(parts,-.18),rgb:parts.join(',')},
      glowAlpha:settings.glowEnabled?settings.glowStrength:0};
  }
  function geometry(width,height,dpr,fontPercent,value,insets={}){
    const availableWidth=Math.max(1,width-(insets.left||0)-(insets.right||0)),availableHeight=Math.max(1,height-(insets.top||0)-(insets.bottom||0));
    const settings=normalize(value),fill=fillProgress(fontPercent,settings),heightLimit=availableHeight*heightFraction(fontPercent,settings);
    const preferred=availableWidth*Math.max(1,Math.min(100,fontPercent))*settings.fontScale/100;
    const font=Math.max(12,Math.min(preferred+(heightLimit-preferred)*fill,heightLimit));
    // Beyond physical pixel resolution, extra samples add cost without additional visible detail.
    const pitch=Math.max(2,Math.sqrt(width*height/24000),font*1.2/settings.dotRowsPerLine),columns=Math.max(8,Math.floor(width/pitch)),rows=Math.max(8,Math.floor(height/pitch));
    return {width,height,pitch,columns,rows,dpr:Math.max(1,Math.min(1.5,dpr||1)),offsetX:(width-columns*pitch)/2,offsetY:(height-rows*pitch)/2};
  }
  const fillProgress=(fontPercent,settings)=>settings.adaptiveMultiLine?0:Math.max(0,Math.min(1,Math.max((settings.fontScale-1)/2,(fontPercent-28)/22)));
  const heightFraction=(fontPercent,settings)=>settings.displayHeightFraction+(1-settings.displayHeightFraction)*fillProgress(fontPercent,settings);
  const api={defaults,normalize,tokens,geometry,fillProgress,heightFraction};global.KigttsLedStyle=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
