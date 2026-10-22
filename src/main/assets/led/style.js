(function(global){
  'use strict';
  const palettes={
    amber:{core:'#fffce0',mid:'#ffe7a1',body:'#ffc15a',edge:'#ed872d',rgb:'255,164,36'},
    white:{core:'#ffffff',mid:'#f6faff',body:'#dde9fa',edge:'#a7bfdc',rgb:'200,224,255'},
    green:{core:'#eeffe4',mid:'#d1ffc0',body:'#87ec9c',edge:'#3fbd84',rgb:'78,228,143'},
    cyan:{core:'#efffff',mid:'#c8ffff',body:'#71e1f2',edge:'#339ac7',rgb:'65,202,243'},
    rose:{core:'#fff0f8',mid:'#ffcee8',body:'#ff8ac2',edge:'#d44f94',rgb:'255,96,177'}
  };
  const defaults=Object.freeze({color:'amber',density:'balanced',glow:'standard',speed:'standard'});
  function normalize(value){
    value=value&&typeof value==='object'?value:{};
    return {color:Object.prototype.hasOwnProperty.call(palettes,value.color)?value.color:defaults.color,
      density:['fine','balanced','bold'].includes(value.density)?value.density:defaults.density,
      glow:['soft','standard','bright'].includes(value.glow)?value.glow:defaults.glow,
      speed:['slow','standard','fast'].includes(value.speed)?value.speed:defaults.speed};
  }
  function tokens(value){
    const settings=normalize(value);
    return {...settings,palette:palettes[settings.color],pitch:{fine:.8,balanced:1,bold:1.35}[settings.density],
      glowAlpha:{soft:.35,standard:.7,bright:1}[settings.glow],speedRows:{slow:2.5,standard:5,fast:9}[settings.speed]};
  }
  const api={defaults,normalize,tokens};global.KigttsLedStyle=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
