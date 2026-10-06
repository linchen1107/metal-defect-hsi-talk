(function () {
  'use strict';
  const root = document.getElementById('algorithms-demo');
  if (!root) return;
  const A = window.PR && PR.algorithmData;
  if (!A) { root.textContent = 'Image data did not load. Please refresh the page.'; return; }
  const find = s => root.querySelector(s), D = A.defect(1);
  const source = find('.ai-source'), result = find('.ai-result'), chart = find('.ai-spectrum');
  const eta = find('.ai-eta'), play = find('.ai-play');
  const off = document.createElement('canvas'); off.width = D.W; off.height = D.H;
  source.width = result.width = D.W; source.height = result.height = D.H;
  let method = 'SAM', indices = Array.from({length:12},(_,i)=>i+3), band = 5;
  let scores, reference, x = 88, y = 82, shown = D.W, raf = 0, started = 0, pausedAt = 0;
  const explanations = {
    SAM:'SAM compares the brightness pattern across the lights. Getting brighter overall does not necessarily make a difference; the pixel looks less like the reference only when the pattern changes.',
    RX:'RX compares this position with how the background normally varies. The further it falls outside the usual range, the higher the anomaly score.',
    SID:'SID turns each component into its share of the total brightness, then compares those shares with the reference.',
    TAU:'TAU compares the brightness ranking across the lights. A different ranking may mean the pixel differs from the background.',
    AMF:'AMF matches against a template taken from the dent center and weights it using the background covariance. The score is also affected by overall brightness.',
    ACE:'ACE weights by the background covariance, then compares the direction of this position with the dent template.'
  };
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf=0; }
    play.textContent = shown < D.W ? '▶ Resume scan' : '▶ Replay scan';
    play.setAttribute('aria-pressed','false');
  }
  function compute() {
    stop(); shown = D.W; pausedAt = 0;
    const target = method==='AMF'||method==='ACE';
    scores = A.score(method,1,indices,target?'t1':'t4');
    reference = A.targetVec(1,indices,target?'t1':'t4');
    eta.value = A.farAt(scores,D.gt).eta.toFixed(3);
    root.querySelectorAll('[data-method]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.method===method)));
    find('.ai-method').textContent=method;
    find('.ai-explain').textContent=explanations[method];
    paintBase(); render(); stop();
  }
  function paintBase() {
    const ctx=off.getContext('2d'), img=ctx.createImageData(D.W,D.H);
    for(let i=0;i<D.N;i++) { const v=D.raw[band*D.N+i]; img.data.set([v,v,v,255],i*4); }
    ctx.putImageData(img,0,0);
  }
  function marker(ctx) {
    ctx.strokeStyle='#fbbf24'; ctx.lineWidth=1.8;
    ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-11,y);ctx.lineTo(x-7,y);ctx.moveTo(x+7,y);ctx.lineTo(x+11,y);ctx.moveTo(x,y-11);ctx.lineTo(x,y-7);ctx.moveTo(x,y+7);ctx.lineTo(x,y+11);ctx.stroke();
  }
  function render() {
    const left=source.getContext('2d'), right=result.getContext('2d');
    left.drawImage(off,0,0); right.drawImage(off,0,0);
    const image=right.getImageData(0,0,D.W,D.H), t=+eta.value;
    let tp=0, fn=0, fp=0, bg=0, reviewed=0;
    for(let j=0;j<D.N;j++) {
      if(j%D.W>=shown) continue;
      reviewed++;
      const hit=scores[j]>=t, truth=D.gt[j];
      if(!truth) bg++;
      let c=null;
      if(hit&&truth){tp++;c=[251,191,36];}
      else if(truth){fn++;c=[251,113,133];}
      else if(hit){fp++;c=[103,232,249];}
      if(c) for(let channel=0;channel<3;channel++) image.data[j*4+channel]=.65*c[channel]+.35*image.data[j*4+channel];
    }
    right.putImageData(image,0,0);
    if(shown<D.W) {
      for(const ctx of [left,right]) {ctx.fillStyle='rgba(5,10,18,.6)';ctx.fillRect(shown,0,D.W-shown,D.H);ctx.strokeStyle='#67e8f9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(shown,0);ctx.lineTo(shown,D.H);ctx.stroke();}
    }
    marker(left);marker(right);
    find('.ai-eta-value').textContent=t.toFixed(3);
    find('.ai-progress').textContent=shown<D.W?'Scan progress '+Math.round(shown/D.W*100)+'%':'Whole part analyzed';
    find('.ai-outcome').textContent=(shown<D.W?'Scanned so far: ':'Result: ')+'Found dent '+(tp+fn?100*tp/(tp+fn):0).toFixed(1)+'%  |  Missed dent '+(tp+fn?100*fn/(tp+fn):0).toFixed(1)+'%  |  Background marked by mistake '+(bg?100*fp/bg:0).toFixed(2)+'%';
    const i=y*D.W+x;
    find('.ai-point').textContent='Position ('+x+', '+y+') · '+(D.gt[i]?'inside the dent':'on normal background')+' · Score '+scores[i].toFixed(3)+' '+(scores[i]>=t?'≥':'<')+' Threshold '+t.toFixed(3)+' → '+(scores[i]>=t?'marked':'not marked');
    drawChart(i);
  }
  function drawChart(i) {
    const width=chart.clientWidth||500, height=150, dpr=window.devicePixelRatio||1;
    chart.width=width*dpr;chart.height=height*dpr;
    const ctx=chart.getContext('2d');ctx.scale(dpr,dpr);
    const values=indices.map(b=>D.raw[b*D.N+i]);
    const max=255, l=30, r=width-30, top=12, bottom=115;
    ctx.font='10px sans-serif';ctx.fillStyle='#94a3b8';ctx.strokeStyle='#334155';
    [0,128,255].forEach(v=>{const Y=bottom-v/max*(bottom-top);ctx.fillText(String(v),0,Y+3);ctx.beginPath();ctx.moveTo(l,Y);ctx.lineTo(r,Y);ctx.stroke();});
    [reference,values].forEach((v,j)=>{ctx.strokeStyle=j?'#fbbf24':'#60a5fa';ctx.lineWidth=2;ctx.beginPath();v.forEach((n,k)=>{const X=l+k/(v.length-1)*(r-l),Y=bottom-n/max*(bottom-top);k?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.stroke();v.forEach((n,k)=>{ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(l+k/(v.length-1)*(r-l),bottom-n/max*(bottom-top),2.5,0,7);ctx.fill();});});
    indices.forEach((b,k)=>{ctx.save();ctx.translate(l+k/(indices.length-1)*(r-l),bottom+9);ctx.rotate(-.45);ctx.fillStyle='#94a3b8';ctx.fillText(HSI.bands[b],-12,8);ctx.restore();});
    find('.ai-chart-label').textContent='Brightness (0–255) · Yellow: selected position / Blue: '+(method==='AMF'||method==='ACE'?'dent template':'image average');
  }
  function tick(now) {
    if(!started) started=now-pausedAt;
    const elapsed=now-started; shown=Math.min(D.W,Math.floor(elapsed/6000*D.W));render();
    if(shown===D.W){raf=0;pausedAt=0;started=0;stop();return;}
    pausedAt=elapsed;raf=requestAnimationFrame(tick);
  }
  play.addEventListener('click',()=>{
    if(raf){stop();started=0;return;}
    if(shown===D.W){shown=0;pausedAt=0;}
    started=0;play.textContent='⏸ Pause scan';play.setAttribute('aria-pressed','true');raf=requestAnimationFrame(tick);
  });
  find('.ai-all').addEventListener('click',()=>{shown=D.W;pausedAt=0;stop();render();});
  eta.addEventListener('input',()=>{shown=D.W;pausedAt=0;stop();render();});
  find('.ai-light').addEventListener('change',e=>{band=+e.target.value;paintBase();render();});
  find('.ai-cube').addEventListener('change',e=>{const n=+e.target.value;indices=Array.from({length:n},(_,i)=>n===12?i+3:i);compute();});
  root.querySelectorAll('[data-method]').forEach(b=>b.addEventListener('click',()=>{method=b.dataset.method;compute();}));
  function selectPoint(px,py) {x=Math.max(0,Math.min(D.W-1,px));y=Math.max(0,Math.min(D.H-1,py));render();}
  for(const cv of [source,result]) {
    cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect();selectPoint(Math.floor((e.clientX-r.left)/r.width*D.W),Math.floor((e.clientY-r.top)/r.height*D.H));});
    cv.addEventListener('keydown',e=>{const move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(move){e.preventDefault();selectPoint(x+move[0],y+move[1]);}});
  }
  find('.ai-dent').addEventListener('click',()=>selectPoint(88,82));
  find('.ai-bg').addEventListener('click',()=>selectPoint(200,140));
  window.addEventListener('resize',()=>render());
  document.addEventListener('visibilitychange',()=>{if(document.hidden) {stop();started=0;}});
  compute();
})();
