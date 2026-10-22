(function () {
  'use strict';
  const layoutApi=window.KigttsLedLayout,styleApi=window.KigttsLedStyle,scene=window.KigttsLedScene,paint=window.KigttsLedPaint;
  const board=document.getElementById('board'),grid=document.getElementById('grid'),lamps=document.getElementById('lamps'),ctx=lamps.getContext('2d',{alpha:true});
  const accessible=document.getElementById('accessible-text'),measureCtx=document.createElement('canvas').getContext('2d');
  const family='"Noto Sans CJK SC","Microsoft YaHei",sans-serif',reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let content={text:'',placeholder:'点击输入文字',fontSizePercent:28,safeArea:layoutApi.safeArea()},boardGeo,geo,model,previous;
  let settings=styleApi.normalize(),style=styleApi.tokens(settings);
  let pageIndex=0,scroll=0,fadeStart=0,pageStart=0,frame=0,lastTick=0,paused=false;
  let layoutCount=0,rasterCount=0,drawCount=0,resizeTimer=0,pendingUpdate=0,readingTimer=0,pauseAt=0,resizePending=false;
  const metrics=new Map(),cache=new Map();
  function measure(character,font){
    const key=font+':'+character;if(metrics.has(key))return metrics.get(key);
    measureCtx.font='700 '+font+'px '+family;const width=measureCtx.measureText(character).width;
    if(metrics.size>12000)metrics.clear();metrics.set(key,width);return width;
  }
  function clearCache(){for(const item of cache.values())paint.release(item);cache.clear();}
  function raster(index){
    if(cache.has(index)){const item=cache.get(index);cache.delete(index);cache.set(index,item);return item;}
    rasterCount++;const item=paint.raster(index,model,geo,style,family,content.text.length?1:.3);cache.set(index,item);
    const pixels=()=>Array.from(cache.values()).reduce((sum,value)=>sum+value.image.width*value.image.height,0);
    while(cache.size>1&&(cache.size>3||pixels()>6000000)){const first=cache.keys().next().value;paint.release(cache.get(first));cache.delete(first);}
    return item;
  }
  function retainFrame(){
    paint.release(previous);previous=null;
    if(lamps.width&&lamps.height){const image=document.createElement('canvas');image.width=lamps.width;image.height=lamps.height;image.getContext('2d').drawImage(lamps,0,0);previous={image};}
  }
  function draw(now){
    if(!geo||!model)return;drawCount++;ctx.clearRect(0,0,lamps.width,lamps.height);
    const ratio=reduced.matches?1:Math.min(1,(now-fadeStart)/180),pitch=geo.pitch*geo.dpr;
    if(previous&&ratio<1){ctx.globalAlpha=1-ratio;ctx.drawImage(previous.image,0,0);}
    ctx.globalAlpha=ratio;ctx.save();ctx.beginPath();ctx.rect(geo.offsetX*geo.dpr,geo.offsetY*geo.dpr,geo.columns*pitch,geo.rows*pitch);ctx.clip();
    if(model.axis==='x'){
      let origin=0;
      if(model.scrolling)origin=settings.scrollDirection==='left'?-scroll:geo.columns-model.totalColumns+scroll;
      else origin=settings.shortTextAlignment==='start'?0:settings.shortTextAlignment==='end'?geo.columns-model.totalColumns:(geo.columns-model.totalColumns)/2;
      const period=model.totalColumns+settings.loopGapDp/geo.pitch,copies=model.scrolling?[-period,0,period]:[0];
      for(const copy of copies)for(let index=0;index<model.pages.length;index++){
        const left=origin+copy+model.pageStarts[index],right=left+model.pageWidths[index];if(right<0||left>geo.columns)continue;
        const item=raster(index),top=Math.max(0,Math.floor((geo.rows-item.rows)/2));
        ctx.drawImage(item.image,(geo.offsetX+left*geo.pitch)*geo.dpr,(geo.offsetY+top*geo.pitch)*geo.dpr);
      }
    }else{
      const item=raster(pageIndex),top=Math.max(0,Math.floor((geo.rows-item.rows)/2));
      ctx.drawImage(item.image,geo.offsetX*geo.dpr,(geo.offsetY+(top-scroll)*geo.pitch)*geo.dpr);
    }
    ctx.restore();if(previous&&ratio>=1){paint.release(previous);previous=null;}
  }
  function animated(){return model&&(model.axis==='x'?model.scrolling:(raster(pageIndex).rows>geo.rows||model.pages.length>1));}
  function request(){
    if(frame||readingTimer||paused||document.hidden)return;
    if(reduced.matches){
      const elapsed=Math.max(0,performance.now()-pageStart),wait=Math.max(80,(Math.floor(elapsed/6000)+1)*6000-elapsed+40);
      readingTimer=setTimeout(()=>{readingTimer=0;if(!paused&&!document.hidden)frame=requestAnimationFrame(tick);},wait);
    }else frame=requestAnimationFrame(tick);
  }
  function tick(now){
    frame=0;if(paused||document.hidden)return;
    if(!reduced.matches&&lastTick&&now-lastTick>200){pageStart+=now-lastTick;fadeStart+=now-lastTick;}
    lastTick=now;const elapsed=now-pageStart;
    if(model.axis==='x')scroll=scene.horizontalOffset(elapsed,model,geo,settings,reduced.matches);
    else{
      const item=raster(pageIndex),overflow=Math.max(0,item.rows-geo.rows),speed=settings.scrollSpeedDpPerSecond/geo.pitch;
      if(reduced.matches){const slices=Math.max(1,Math.ceil(item.rows/Math.max(1,geo.rows-6))),slice=Math.floor(elapsed/6000);scroll=Math.min(overflow,(slice%slices)*Math.max(1,geo.rows-6));if(slice>=slices&&model.pages.length>1)nextPage(now);}
      else{scroll=Math.min(overflow,Math.floor(Math.max(0,(elapsed-1600)/1000)*speed));if(elapsed>1600+overflow/speed*1000+2000&&(overflow>0||model.pages.length>1))nextPage(now);}
    }
    draw(now);if((!reduced.matches&&(previous||now-fadeStart<180))||animated())request();
  }
  function nextPage(now){retainFrame();pageIndex=(pageIndex+1)%model.pages.length;scroll=0;pageStart=now;fadeStart=now;}
  function rebuild(resize){
    if(board.clientWidth<1||board.clientHeight<1)return;clearTimeout(readingTimer);readingTimer=0;const now=performance.now();
    if(resize){paint.release(previous);previous=null;
      boardGeo=styleApi.geometry(board.clientWidth,board.clientHeight,window.devicePixelRatio,content.fontSizePercent,settings);
      geo=scene.viewport(boardGeo,content.safeArea,settings.displayHeightFraction);
      paint.background(grid,boardGeo,style);lamps.width=Math.ceil(boardGeo.width*boardGeo.dpr);lamps.height=Math.ceil(boardGeo.height*boardGeo.dpr);
    }else{retainFrame();paint.background(grid,boardGeo,style);}
    clearCache();const displayed=content.text.length?content.text:content.placeholder;
    model=scene.plan(displayed,geo,measure,content.fontSizePercent,settings);layoutCount++;
    pageIndex=0;scroll=0;pageStart=now;fadeStart=now;lastTick=0;
    accessible.textContent=displayed;board.setAttribute('aria-label',displayed||'LED 字幕');draw(now);request();
  }
  function update(value){
    if(!value||typeof value!=='object')return;
    const next={text:typeof value.text==='string'?value.text:content.text,placeholder:typeof value.placeholder==='string'?value.placeholder:content.placeholder,fontSizePercent:Number.isFinite(value.fontSizePercent)?value.fontSizePercent:content.fontSizePercent,
      safeArea:value.safeArea?layoutApi.safeArea(value.safeArea):content.safeArea};
    const incoming=styleApi.normalize(value.settings?{...settings,...value.settings}:settings),changed=JSON.stringify(incoming)!==JSON.stringify(settings);
    const geometryChanged=incoming.dotRowsPerLine!==settings.dotRowsPerLine||incoming.fontScale!==settings.fontScale||incoming.displayHeightFraction!==settings.displayHeightFraction||next.fontSizePercent!==content.fontSizePercent;
    const areaChanged=JSON.stringify(next.safeArea)!==JSON.stringify(content.safeArea);
    if(next.text===content.text&&next.placeholder===content.placeholder&&next.fontSizePercent===content.fontSizePercent&&geo&&!changed&&!areaChanged)return;
    settings=incoming;style=styleApi.tokens(settings);content=next;resizePending=resizePending||geometryChanged||areaChanged;
    if(!pendingUpdate)pendingUpdate=requestAnimationFrame(()=>{pendingUpdate=0;const resize=!geo||resizePending;resizePending=false;rebuild(resize);});
  }
  function pause(){if(!paused)pauseAt=performance.now();paused=true;if(frame)cancelAnimationFrame(frame);clearTimeout(readingTimer);readingTimer=0;frame=0;lastTick=0;}
  function resume(){if(paused){const held=performance.now()-pauseAt;pageStart+=held;fadeStart+=held;}paused=false;lastTick=0;if(animated())request();}
  function resized(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>rebuild(true),70);}
  new ResizeObserver(resized).observe(board);let hiddenAt=0;
  document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=performance.now();if(frame)cancelAnimationFrame(frame);clearTimeout(readingTimer);readingTimer=0;frame=0;lastTick=0;}else{const held=performance.now()-hiddenAt;pageStart+=held;fadeStart+=held;if(animated())request();}});
  reduced.addEventListener('change',()=>{if(geo)rebuild(false);});
  window.KigttsSubtitle=Object.freeze({ready:true,update,pause,resume,
    snapshot:()=>({text:content.text,placeholder:content.placeholder,settings:{...settings},safeArea:{...content.safeArea},axis:model?.axis,
      page:pageIndex,pages:model?.pages.length||0,scroll,font:model?.font||0,columns:geo?.columns||0,rows:geo?.rows||0,dpr:geo?.dpr||0,
      layoutCount,rasterCount,drawCount,paused,cachedPages:cache.size,canvasPixels:Math.max(0,...Array.from(cache.values(),item=>item.image.width*item.image.height))})});
  rebuild(true);
})();
