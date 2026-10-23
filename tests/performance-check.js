async page => {
 await page.route('**/*', route=>route.continue());
  await page.goto('http://127.0.0.1:8768/index.html');await page.setViewportSize({width:1280,height:800});
 const samples=await page.evaluate(async()=>{
  const results=[];
  for(let i=0;i<36;i++){
   KigttsSubtitle.update({text:'LED performance 字幕'.repeat(80),fontSizePercent:1+(i%9)*.2,safeArea:{top:48,bottom:48,left:2,right:2},settings:{fontScale:.5,dotRowsPerLine:256,glowEnabled:true}});
   await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   results.push(KigttsSubtitle.snapshot());
  }
  return results;
 });
 const times=samples.map(s=>s.lastRebuildMs).sort((a,b)=>a-b),p95=times[Math.floor(times.length*.95)];
 if(!samples.every(s=>s.rows*s.columns<=24000&&s.canvasPixels<=6100000))throw Error('Exceeded bead/cache limit');
 if(p95>60)throw Error('Small-font rebuild p95 '+p95+'ms');
 return {samples:samples.length,p95Ms:p95,maxMs:Math.max(...times),maxCells:Math.max(...samples.map(s=>s.rows*s.columns)),parts:samples.slice(-4).map(s=>s.lastRebuildParts)};
}
