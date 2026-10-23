(function(global){
  'use strict';
  const createCanvas=(width,height)=>{const item=document.createElement('canvas');item.width=Math.max(1,Math.ceil(width));item.height=Math.max(1,Math.ceil(height));return item;};
  function dot(p,x,y,radius,shape){p.beginPath();if(shape==='square')p.rect(x-radius,y-radius,radius*2,radius*2);else p.arc(x,y,radius,0,Math.PI*2);p.fill();}
  function lamp(pitch,style,dark=false){
    const size=Math.ceil(pitch*3),image=createCanvas(size,size),p=image.getContext('2d'),center=size/2;
    const radius=pitch*style.dotSizeFraction*(style.dotShape==='square'?1:Math.SQRT2)/2;
    if(dark){p.fillStyle='rgba(128,128,128,.13)';dot(p,center,center,radius,style.dotShape);p.fillStyle='rgba(255,255,255,.055)';dot(p,center-pitch*.05,center-pitch*.07,radius*.54,style.dotShape);return image;}
    const palette=style.palette,alpha=style.glowAlpha;
    if(alpha){const glow=p.createRadialGradient(center,center,radius*.3,center,center,pitch*1.42);glow.addColorStop(0,'rgba('+palette.rgb+','+alpha*.8+')');glow.addColorStop(.34,'rgba('+palette.rgb+','+alpha*.31+')');glow.addColorStop(1,'rgba('+palette.rgb+',0)');p.fillStyle=glow;p.fillRect(0,0,size,size);}
    const bead=p.createRadialGradient(center-radius*.2,center-radius*.28,0,center,center,radius);
    bead.addColorStop(0,palette.core);bead.addColorStop(.24,palette.mid);bead.addColorStop(.65,palette.body);bead.addColorStop(1,palette.edge);
    p.fillStyle=bead;dot(p,center,center,radius,style.dotShape);
    p.fillStyle='rgba(255,255,255,.5)';dot(p,center-radius*.2,center-radius*.28,radius*.21,style.dotShape);
    return image;
  }
  const backgrounds=new WeakMap();
  function background(target,board,style){
    const key=[board.width,board.height,board.pitch,board.dpr,style.backgroundColor,style.dotMatrixEnabled,style.dotShape,style.dotSizeFraction].join(':');
    if(backgrounds.get(target)===key)return;
    backgrounds.set(target,key);
    const p=target.getContext('2d'),pitch=board.pitch*board.dpr;
    target.width=Math.ceil(board.width*board.dpr);target.height=Math.ceil(board.height*board.dpr);
    p.fillStyle=style.backgroundColor;p.fillRect(0,0,target.width,target.height);
    if(!style.dotMatrixEnabled)return;
    // One repeating tile replaces thousands of per-bead canvas commands during resizing.
    const cell=Math.ceil(pitch),tile=createCanvas(cell,cell),t=tile.getContext('2d'),sprite=lamp(cell,style,true),half=sprite.width/2;
    for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)t.drawImage(sprite,(x+.5)*cell-half,(y+.5)*cell-half);
    const pattern=p.createPattern(tile,'repeat');
    pattern.setTransform(new DOMMatrix().translate(board.offsetX*board.dpr,board.offsetY*board.dpr).scale(pitch/cell));
    p.fillStyle=pattern;p.fillRect(0,0,target.width,target.height);
  }
  function raster(index,model,geo,style,family,dim){
    const lines=model.pages[index],rows=lines.length*model.lineHeight+(model.padding??6),columns=model.pageWidths[index],pitch=geo.pitch*geo.dpr;
    const baseline=model.baseline??(3+model.lineHeight/2),textBaseline=model.baseline===undefined?'middle':'alphabetic';
    const image=createCanvas(columns*pitch,rows*pitch),p=image.getContext('2d');
    const left=model.axis==='x'||style.shortTextAlignment==='start',right=model.axis==='y'&&style.shortTextAlignment==='end';
    const align=left?'left':right?'right':'center',x=left?0:right?columns:columns/2;
    if(!style.dotMatrixEnabled){
      p.scale(pitch,pitch);p.font='700 '+model.font+'px '+family;p.textAlign=align;p.textBaseline=textBaseline;p.fillStyle=style.textColor;p.globalAlpha=dim;
      if(style.glowAlpha){p.shadowColor=style.textColor;p.shadowBlur=model.font*style.glowAlpha*.18;}
      lines.forEach((line,i)=>p.fillText(line,x,baseline+i*model.lineHeight));return {image,rows,columns};
    }
    const mask=createCanvas(columns,rows),sample=mask.getContext('2d',{willReadFrequently:true});
    sample.font='700 '+model.font+'px '+family;sample.textAlign=align;sample.textBaseline=textBaseline;sample.fillStyle='#fff';
    lines.forEach((line,i)=>sample.fillText(line,x,baseline+i*model.lineHeight));
    const pixels=sample.getImageData(0,0,mask.width,mask.height).data,sprite=lamp(pitch,style),half=sprite.width/2;
    for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++){
      const alpha=pixels[(y*mask.width+x)*4+3]/255;if(alpha<.13)continue;
      p.globalAlpha=dim*Math.pow(alpha,.7);p.drawImage(sprite,(x+.5)*pitch-half,(y+.5)*pitch-half);
    }
    return {image,rows,columns};
  }
  const release=item=>{if(item){item.image.width=1;item.image.height=1;}};
  global.KigttsLedPaint={background,raster,release};
})(window);
