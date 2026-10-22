(function () {
  'use strict';
  const layoutApi=window.KigttsLedLayout;
  const board=document.getElementById('board'),grid=document.getElementById('grid'),lamps=document.getElementById('lamps');
  const gridCtx=grid.getContext('2d',{alpha:true}),ctx=lamps.getContext('2d',{alpha:true});
  const accessible=document.getElementById('accessible-text');
  const measureCanvas=document.createElement('canvas'),measureCtx=measureCanvas.getContext('2d');
  const family='"Noto Sans CJK SC","Microsoft YaHei",sans-serif';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let content={text:'',placeholder:'点击输入文字',fontSizePercent:28},geo,model,current,previous;
  let pageIndex=0,scroll=0,fadeStart=0,pageStart=0,frame=0,lastTick=0,paused=false;
  let layoutCount=0,rasterCount=0,drawCount=0,resizeTimer=0,pendingUpdate=0,readingTimer=0;
  const metrics=new Map();
  function measure(character,font){
    const key=font+':'+character;
    if(metrics.has(key))return metrics.get(key);
    measureCtx.font='700 '+font+'px '+family;
    const width=measureCtx.measureText(character).width;
    if(metrics.size>12000)metrics.clear();
    metrics.set(key,width);return width;
  }
  function canvas(width,height){const item=document.createElement('canvas');item.width=Math.max(1,Math.ceil(width));item.height=Math.max(1,Math.ceil(height));return item;}
  function resizeCanvas(item){item.width=Math.ceil(geo.width*geo.dpr);item.height=Math.ceil(geo.height*geo.dpr);}
  function background(){
    resizeCanvas(grid);resizeCanvas(lamps);
    const pitch=geo.pitch*geo.dpr;
    gridCtx.clearRect(0,0,grid.width,grid.height);
    const p=gridCtx;
    // Draw once at exact fractional pitch; rounded repeating tiles drift away from the lit LEDs.
    for(let y=0;y<geo.rows;y++)for(let x=0;x<geo.columns;x++){
      const cx=geo.offsetX*geo.dpr+(x+.5)*pitch,cy=geo.offsetY*geo.dpr+(y+.5)*pitch;
      const dark=p.createRadialGradient(cx-pitch*.08,cy-pitch*.12,0,cx,cy,pitch*.37);
      dark.addColorStop(0,'#222b24');dark.addColorStop(.42,'#151f18');dark.addColorStop(1,'#090e0b');
      p.fillStyle=dark;p.beginPath();p.arc(cx,cy,pitch*.37,0,Math.PI*2);p.fill();
      p.strokeStyle='rgba(73,89,72,.22)';p.lineWidth=Math.max(.5,geo.dpr*.4);p.stroke();
    }
  }
  function sprite(){
    const pitch=geo.pitch*geo.dpr,size=Math.ceil(pitch*3),image=canvas(size,size),p=image.getContext('2d'),center=size/2;
    const glow=p.createRadialGradient(center,center,pitch*.13,center,center,pitch*1.42);
    glow.addColorStop(0,'rgba(255,177,46,.57)');glow.addColorStop(.34,'rgba(255,154,27,.22)');glow.addColorStop(1,'rgba(255,139,18,0)');
    p.fillStyle=glow;p.fillRect(0,0,size,size);
    const bead=p.createRadialGradient(center-pitch*.08,center-pitch*.1,0,center,center,pitch*.35);
    bead.addColorStop(0,'#fffce0');bead.addColorStop(.24,'#ffe7a1');bead.addColorStop(.65,'#ffc15a');bead.addColorStop(1,'#ed872d');
    p.fillStyle=bead;p.beginPath();p.arc(center,center,pitch*.34,0,Math.PI*2);p.fill();
    p.fillStyle='rgba(255,255,241,.76)';p.beginPath();p.arc(center-pitch*.07,center-pitch*.1,pitch*.09,0,Math.PI*2);p.fill();
    return image;
  }
  function raster(index){
    rasterCount++;
    const lines=model.pages[index],rows=lines.length*model.lineHeight+6;
    const mask=canvas(geo.columns,rows),p=mask.getContext('2d',{willReadFrequently:true});
    p.font='700 '+model.font+'px '+family;p.textAlign='center';p.textBaseline='middle';p.fillStyle='#fff';
    lines.forEach((line,i)=>p.fillText(line,geo.columns/2,3+(i+.5)*model.lineHeight));
    const pixels=p.getImageData(0,0,mask.width,mask.height).data,pitch=geo.pitch*geo.dpr;
    const image=canvas(geo.columns*pitch,rows*pitch),draw=image.getContext('2d'),lamp=sprite(),half=lamp.width/2;
    const dim=content.text.length===0?.3:1;
    for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++){
      const alpha=pixels[(y*mask.width+x)*4+3]/255;
      if(alpha<.13)continue;
      draw.globalAlpha=dim*Math.pow(alpha,.7);draw.drawImage(lamp,(x+.5)*pitch-half,(y+.5)*pitch-half);
    }
    return {image,rows};
  }
  function release(item){if(item){item.image.width=1;item.image.height=1;}}
  function draw(now){
    if(!geo||!current)return;
    drawCount++;ctx.clearRect(0,0,lamps.width,lamps.height);
    const ratio=reduced.matches?1:Math.min(1,(now-fadeStart)/180);
    const top=item=>Math.max(0,Math.floor((geo.rows-item.rows)/2))*geo.pitch*geo.dpr;
    if(previous&&ratio<1){ctx.globalAlpha=1-ratio;ctx.drawImage(previous.image,geo.offsetX*geo.dpr,geo.offsetY*geo.dpr+top(previous)-(previous.scroll||0)*geo.pitch*geo.dpr);}
    ctx.globalAlpha=ratio;ctx.drawImage(current.image,geo.offsetX*geo.dpr,geo.offsetY*geo.dpr+top(current)-scroll*geo.pitch*geo.dpr);ctx.globalAlpha=1;
    if(previous&&ratio>=1){release(previous);previous=null;}
  }
  function request(){
    if(frame||readingTimer||paused||document.hidden)return;
    if(reduced.matches){
      const wait=Math.max(80,6000-(performance.now()-pageStart)%6000);
      readingTimer=setTimeout(()=>{readingTimer=0;if(!paused&&!document.hidden)frame=requestAnimationFrame(tick);},wait);
    }else frame=requestAnimationFrame(tick);
  }
  function tick(now){
    frame=0;if(paused||document.hidden)return;
    // Pauses do not fast-forward a long subtitle or skip its first reading hold.
    if(lastTick&&now-lastTick>200){pageStart+=now-lastTick;fadeStart+=now-lastTick;}
    lastTick=now;
    const overflow=Math.max(0,current.rows-geo.rows),elapsed=now-pageStart;
    if(reduced.matches){
      const slices=Math.max(1,Math.ceil(current.rows/Math.max(1,geo.rows-6)));
      const slice=Math.floor(elapsed/6000);scroll=Math.min(overflow,(slice%slices)*Math.max(1,geo.rows-6));
      if(slice>=slices&&model.pages.length>1)nextPage(now);
    }else{
      // Lamps stay on the physical board lattice while the characters move by whole rows.
      scroll=Math.min(overflow,Math.floor(Math.max(0,(elapsed-1600)/1000)*5));
      if(elapsed>1600+overflow/5*1000+2000&&(overflow>0||model.pages.length>1))nextPage(now);
    }
    draw(now);
    if(previous||(!reduced.matches&&now-fadeStart<180)||overflow>0||model.pages.length>1)request();
  }
  function nextPage(now){
    release(previous);previous=current;previous.scroll=scroll;
    pageIndex=(pageIndex+1)%model.pages.length;current=raster(pageIndex);scroll=0;pageStart=now;fadeStart=now;
  }
  function rebuild(resize){
    if(board.clientWidth<1||board.clientHeight<1)return;
    clearTimeout(readingTimer);readingTimer=0;
    const now=performance.now();
    if(resize){geo=layoutApi.geometry(board.clientWidth,board.clientHeight,window.devicePixelRatio);background();release(previous);previous=null;}
    else{release(previous);previous=current;if(previous)previous.scroll=scroll;}
    const displayed=content.text.length?content.text:content.placeholder;
    model=layoutApi.layout(displayed,geo,measure,content.fontSizePercent);layoutCount++;
    pageIndex=0;scroll=0;pageStart=now;fadeStart=now;lastTick=0;
    if(resize)release(current);
    current=raster(0);accessible.textContent=displayed;board.setAttribute('aria-label',displayed||'LED 字幕');
    draw(now);request();
  }
  function update(value){
    if(!value||typeof value!=='object')return;
    const next={text:typeof value.text==='string'?value.text:'',placeholder:typeof value.placeholder==='string'?value.placeholder:'',fontSizePercent:Number.isFinite(value.fontSizePercent)?value.fontSizePercent:28};
    if(next.text===content.text&&next.placeholder===content.placeholder&&next.fontSizePercent===content.fontSizePercent&&geo)return;
    content=next;
    // Streaming recognition can publish many partial results in a frame: rasterize the newest one once.
    if(!pendingUpdate)pendingUpdate=requestAnimationFrame(()=>{pendingUpdate=0;rebuild(!geo);});
  }
  let pauseAt=0;
  function pause(){if(!paused)pauseAt=performance.now();paused=true;if(frame)cancelAnimationFrame(frame);clearTimeout(readingTimer);readingTimer=0;frame=0;lastTick=0;}
  function resume(){if(paused){const held=performance.now()-pauseAt;pageStart+=held;fadeStart+=held;}paused=false;lastTick=0;request();}
  function resized(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>rebuild(true),70);}
  new ResizeObserver(resized).observe(board);
  let hiddenAt=0;
  document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=performance.now();if(frame)cancelAnimationFrame(frame);clearTimeout(readingTimer);readingTimer=0;frame=0;lastTick=0;}else{const held=performance.now()-hiddenAt;pageStart+=held;fadeStart+=held;request();}});
  reduced.addEventListener('change',()=>{if(geo)rebuild(false);});
  window.KigttsSubtitle=Object.freeze({ready:true,update,pause,resume,
    snapshot:()=>({text:content.text,placeholder:content.placeholder,page:pageIndex,pages:model?.pages.length||0,scroll,font:model?.font||0,columns:geo?.columns||0,rows:geo?.rows||0,dpr:geo?.dpr||0,layoutCount,rasterCount,drawCount,paused,canvasPixels:current?current.image.width*current.image.height:0})});
  rebuild(true);
})();
