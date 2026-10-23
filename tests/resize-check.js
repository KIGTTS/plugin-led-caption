async (page) => {
  const checks=[];const check=(ok,name)=>{if(!ok)throw new Error(name);checks.push(name);};
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:8768/index.html');
  for(const [width,height] of [[393,540],[851,300]]){
    await page.setViewportSize({width,height});
    for(const text of ['你好','KIGTTS']){
      await page.evaluate(text=>KigttsSubtitle.update({text,fontSizePercent:100,safeArea:{top:50,bottom:50,left:12,right:12},settings:{fontScale:3,displayHeightFraction:1,adaptiveMultiLine:false,glowEnabled:false}}),text);
      await page.waitForTimeout(300);
      const ink=await page.evaluate(()=>{
        const c=document.querySelector('#lamps'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        let top=c.height,bottom=0;
        for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>160){top=Math.min(top,y);bottom=Math.max(bottom,y);}
        const s=KigttsSubtitle.snapshot();return {fill:(bottom-top)/(s.viewport.height*s.dpr),top,bottom,s};
      });
      check(ink.fill>.8,`${text} max ink fills ${width}x${height} safe height (${ink.fill.toFixed(2)})`);
      check(ink.top>=50&&ink.bottom<height-50,`${text} preserves controls`);
      await page.screenshot({path:`output/playwright/led-max-${width}-${text==='你好'?'zh':'en'}.png`});
    }
  }
  await page.evaluate(()=>KigttsSubtitle.update({text:'连续调整字号时保留正在阅读的内容。'.repeat(30),fontSizePercent:45}));
  await page.waitForFunction(()=>KigttsSubtitle.snapshot().scroll>3,null,{timeout:6000});
  const samples=await page.evaluate(async()=>{
    const samples=[];
    for(let i=0;i<18;i++){
      KigttsSubtitle.update({fontSizePercent:46+i});
      await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
      const c=document.querySelector('#lamps');const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      samples.push({...KigttsSubtitle.snapshot(),visible:p.some((v,j)=>j%4===3&&v>200)});
    }
    return samples;
  });
  check(samples.every(s=>s.scroll>0&&!s.fading&&s.visible),'live scaling never resets scroll or fades the board blank');
  check(samples.every(s=>s.text===samples[0].text),'live scaling retains current text');
  return {passed:checks.length,checks};
}
