(function () {
  'use strict';
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const quad=(a,M,b)=>a.reduce((s,v,i)=>s+v*b.reduce((r,w,j)=>r+M[i*a.length+j]*w,0),0);
  function pixelScore(method,x,s,mu,Ci) {
    if(method==='RX') {const d=x.map((v,i)=>v-mu[i]);return quad(d,Ci,d);}
    if(method==='AMF'||method==='ACE') {
      const n=quad(s,Ci,x)**2,ss=quad(s,Ci,s);
      return method==='AMF'?n/ss:n/(ss*quad(x,Ci,x)+1e-12);
    }
    if(method==='SID') {
      const S=s.reduce((a,v)=>a+v+1e-6,0),X=x.reduce((a,v)=>a+v+1e-6,0);
      return s.reduce((a,v,i)=>{const p=(v+1e-6)/S,q=(x[i]+1e-6)/X;return a+p*Math.log(p/q)+q*Math.log(q/p);},0);
    }
    let acc=0;
    for(let a=0;a<x.length-1;a++) for(let b=a+1;b<x.length;b++) acc+=Math.sign((x[b]-x[a])*(s[b]-s[a]));
    return 2*acc/(x.length*(x.length-1));
  }
  if(typeof module!=='undefined'&&module.exports) module.exports={pixelScore};
  if(typeof document==='undefined') return;
  const A=window.PR&&PR.algorithmData;
  const roots=[...document.querySelectorAll('.al-lesson')];
  if(!A) {roots.forEach(r=>r.textContent='Image data has not loaded yet. Please refresh the page.');return;}
  const D=A.defect(1),idx=Array.from({length:12},(_,i)=>i+3), st=A.stats(1,idx);
  const vector=(x,y)=>idx.map(b=>D.raw[b*D.N+y*D.W+x]);
  const backgroundImage=document.createElement('canvas');backgroundImage.width=D.W;backgroundImage.height=D.H;
  const baseCtx=backgroundImage.getContext('2d'),base=baseCtx.createImageData(D.W,D.H);
  for(let i=0;i<D.N;i++){const v=D.raw[D.N+i];base.data.set([v,v,v,255],i*4);}baseCtx.putImageData(base,0,0);
  const fmt=v=>Math.abs(v)>=1000?v.toFixed(1):v.toFixed(4);
  function fit(cv,h) {const w=cv.clientWidth||500,d=window.devicePixelRatio||1;cv.width=w*d;cv.height=h*d;const c=cv.getContext('2d');c.scale(d,d);c.font='12px sans-serif';return {c,w,h};}
  function mark(cv,x,y,colour='#fbbf24') {const c=cv.getContext('2d');c.strokeStyle=colour;c.lineWidth=2;c.beginPath();c.arc(x,y,7,0,7);c.stroke();}
  function text(c,t,x,y,colour='#94a3b8') {c.fillStyle=colour;c.fillText(t,x,y);}
  function lineGraph(cv,a,b,title,active,spread) {
    const {c,w,h}=fit(cv,240),l=36,r=w-34,t=30,bottom=185;
    const max=Math.max(...a,...b,...(spread?a.map((v,i)=>v+spread[i]):[]),1)*1.1;
    const X=i=>l+i/(a.length-1)*(r-l),Y=v=>bottom-v/max*(bottom-t);
    text(c,title,l,18);
    if(spread) {
      c.fillStyle='rgba(96,165,250,.18)';c.beginPath();a.forEach((v,i)=>i?c.lineTo(X(i),Y(v+spread[i])):c.moveTo(X(i),Y(v+spread[i])));
      for(let i=a.length-1;i>=0;i--)c.lineTo(X(i),Y(Math.max(0,a[i]-spread[i])));c.closePath();c.fill();
    }
    c.strokeStyle='#334155';c.beginPath();c.moveTo(l,t);c.lineTo(l,bottom);c.lineTo(r,bottom);c.stroke();
    [0,max/2,max].forEach(v=>text(c,v.toFixed(max<2?2:0),1,Y(v)+4));
    [a,b].forEach((v,j)=>{
      c.strokeStyle=j?'#fbbf24':'#60a5fa';c.lineWidth=2;c.beginPath();v.forEach((n,i)=>i?c.lineTo(X(i),Y(n)):c.moveTo(X(i),Y(n)));c.stroke();
      v.forEach((n,i)=>{c.fillStyle=c.strokeStyle;c.beginPath();c.arc(X(i),Y(n),active===i?6:2.5,0,7);c.fill();});
    });
    if(active>=0){c.strokeStyle='#fbbf24';c.setLineDash([3,3]);c.beginPath();c.moveTo(X(active),t);c.lineTo(X(active),bottom);c.stroke();c.setLineDash([]);}
    idx.forEach((b,i)=>{c.save();c.translate(X(i)-5,bottom+15);c.rotate(-.5);text(c,HSI.bands[b],0,0);c.restore();});
  }
  function detector(root,method) {
    const isTarget=method==='AMF'||method==='ACE',ref=A.targetVec(1,idx,isTarget?'t1':'t4');
    root.innerHTML=`<div class="al-controls"><button data-pick="dent">Dent center</button><button data-pick="background">Normal background</button><button data-pick="reference">The reference itself</button><label>Overall brightness × <input class="al-gain" type="range" min=".5" max="2" step=".05" value="1" aria-label="${method} overall brightness multiplier"> <output>1.00</output></label></div><div class="al-grid"><figure><figcaption>The same part: click the position you want to check</figcaption><canvas class="al-image" tabindex="0" aria-label="${method} sampled image of the part; arrow keys move the position"></canvas><p class="al-location"></p><p class="al-status"></p><div class="al-controls"><button class="al-play">▶ Watch the comparison</button><button class="al-reset">Back to full comparison</button></div></figure><figure><figcaption>${method==='TAU'?'Green: same order / Pink: opposite / Gray: equal':'Blue: '+(isTarget?'dent template':'background reference')+' / Yellow: selected position'}</figcaption><canvas class="al-plot" aria-label="${method} comparison chart"></canvas></figure></div><p class="al-result" aria-live="polite"></p>`;
    const image=root.querySelector('.al-image'), plot=root.querySelector('.al-plot'), gain=root.querySelector('.al-gain'),out=root.querySelector('output');
    image.width=D.W;image.height=D.H;
    if(method==='TAU') {
      const controls=document.createElement('div');controls.className='al-controls';
      controls.innerHTML='<label>Check pair by pair <input class="al-pair" type="range" min="0" max="65" step="1" value="0" aria-label="TAU pair position"> <output class="al-pair-value">1 / 66</output></label><button class="al-next-pair">Next pair</button>';
      root.querySelector('.al-grid').before(controls);
    }
    let x=88,y=82,pick='dent',active=-1,timer=0;
    function stop() {clearInterval(timer);timer=0;root.querySelector('.al-play').textContent='▶ Watch the comparison';}
    function render() {
      const original=pick==='reference'?Array.from(ref):vector(x,y),k=+gain.value,values=original.map(v=>v*k);
      const score=pixelScore(method,values,ref,st.mu,st.Ci),baseScore=pixelScore(method,original,ref,st.mu,st.Ci);
      image.getContext('2d').drawImage(backgroundImage,0,0);if(pick!=='reference')mark(image,x,y);
      root.querySelectorAll('[data-pick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pick===pick)));
      out.textContent=k.toFixed(2);
      root.querySelector('.al-location').textContent=pick==='reference'?(isTarget?'Comparing the dent template with itself':'Comparing the background average with itself'):'Sample position ('+x+', '+y+') · '+(D.gt[y*D.W+x]?'inside the dent':'normal background');
      let result='';
      if(method==='SID') {
        const sum=v=>v.reduce((a,b)=>a+b,0),a=ref.map(v=>100*v/sum(ref)),b=values.map(v=>100*v/sum(values));
        lineGraph(plot,a,b,'Share of total brightness (%)',active);
        result='SID divergence score '+fmt(score)+'. '+(score<1e-8?'The two sets of shares are identical.':'The yellow and blue shares differ.')+' Multiplying all the brightness values by '+k.toFixed(2)+' does not change each component\'s share.';
      } else if(method==='TAU') {
        const {c,w}=fit(plot,240),pairs=[];
        for(let a=0;a<11;a++)for(let b=a+1;b<12;b++)pairs.push({a,b,sign:Math.sign((values[b]-values[a])*(ref[b]-ref[a]))});
        const cw=(w-24)/11;
        pairs.forEach((p,i)=>{const X=12+(i%11)*cw,Y=35+Math.floor(i/11)*27;c.globalAlpha=active>=0&&i>active?.25:1;c.fillStyle=p.sign>0?'#34d399':p.sign<0?'#fb7185':'#64748b';c.fillRect(X+1,Y,cw-4,20);if(i===active){c.globalAlpha=1;c.strokeStyle='#fbbf24';c.lineWidth=2;c.strokeRect(X,Y-1,cw-2,22);}});c.globalAlpha=1;
        const p=pairs[Math.max(0,active)],n=pairs.filter(p=>p.sign>0).length,m=pairs.filter(p=>p.sign<0).length;
        text(c,'Each cell is one pair; 66 pairs in total',12,18);text(c,'Same order '+n+' / Opposite '+m+' / Equal '+(66-n-m),12,222);
        root.querySelector('.al-status').textContent=active>=0?'Comparing '+HSI.bands[idx[p.a]]+' with '+HSI.bands[idx[p.b]]+': '+(p.sign>0?'same order':p.sign<0?'opposite order':'at least one equal value'):'';
        root.querySelector('.al-pair').value=Math.max(0,active);
        root.querySelector('.al-pair-value').textContent=active<0?'All 66 pairs':(active+1)+' / 66';
        result='TAU similarity score '+fmt(score)+'. The closer to 1, the more consistent the brightness ordering of the two sets; this measures ranking similarity, not defect probability.';
      } else {
        const spread=method==='RX'?idx.map((_,i)=>Math.sqrt(st.C[i*12+i])):null;
        lineGraph(plot,ref,values,'Input brightness (after the multiplier, not clipped at 255)',active,spread);
        if(method==='RX')result='RX anomaly score '+fmt(score)+'. The blue band only hints at how much each component\'s brightness varies; it is not RX\'s decision range. The score also accounts for correlations between components, and a threshold is then applied.';
        if(method==='AMF')result='AMF score '+fmt(score)+'. At multiplier 1 it is '+fmt(baseScore)+'; at the current multiplier '+k.toFixed(2)+', the score is '+(k*k).toFixed(2)+' times the original. The curves show the input; the score also uses the background weighting.';
        if(method==='ACE')result='ACE similarity score '+fmt(score)+'. At multiplier 1 it is '+fmt(baseScore)+'; with the template and background weighting fixed, multiplying all the brightness values of the tested pixel by the same positive number leaves the score unchanged. The curves show the input; the score also uses the background weighting.';
      }
      if(method!=='TAU')root.querySelector('.al-status').textContent=active<0?'Full comparison: 12 lighting and channel components':'Now viewing '+HSI.bands[idx[active]]+': reference '+ref[active].toFixed(1)+', selected position '+values[active].toFixed(1);
      root.querySelector('.al-result').textContent=result;
    }
    root.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>{stop();active=-1;pick=b.dataset.pick;if(pick==='dent'){x=88;y=82;}if(pick==='background'){x=200;y=140;}render();}));
    gain.addEventListener('input',()=>{stop();active=-1;render();});
    root.querySelector('.al-play').addEventListener('click',()=>{
      if(timer){stop();return;}active=0;render();root.querySelector('.al-play').textContent='⏸ Pause';
      timer=setInterval(()=>{active++;if(active>=(method==='TAU'?66:12)){active=-1;stop();}render();},method==='TAU'?250:400);
    });
    if(method==='TAU') {
      root.querySelector('.al-pair').addEventListener('input',e=>{stop();active=+e.target.value;render();});
      root.querySelector('.al-next-pair').addEventListener('click',()=>{stop();active=(active+1)%66;render();});
    }
    root.querySelector('.al-reset').addEventListener('click',()=>{stop();active=-1;render();});
    function sample(px,py){stop();active=-1;pick='custom';x=Math.max(0,Math.min(D.W-1,px));y=Math.max(0,Math.min(D.H-1,py));render();}
    image.addEventListener('click',e=>{const r=image.getBoundingClientRect();sample(Math.floor((e.clientX-r.left)/r.width*D.W),Math.floor((e.clientY-r.top)/r.height*D.H));});
    image.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();sample(x+d[0],y+d[1]);}});
    window.addEventListener('resize',render);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});render();
  }
  function assessment(root,roc) {
    root.innerHTML=`<div class="al-controls"><label>Algorithm <select aria-label="${roc?'ROC':'Threshold'} algorithm"><option>SAM</option><option>RX</option></select></label><button data-case="strict">Mark less</button><button data-case="fair">Find at least 90%</button><button data-case="loose">Mark more</button><label>Threshold <input type="range" class="al-eta" min="0" max="1" step=".001" aria-label="${roc?'ROC':'Threshold'} decision threshold"><output></output></label></div><div class="al-grid"><figure><figcaption>${roc?'When the threshold changes, the point on the curve at right moves too':'Original image of the part: white-light G channel'}</figcaption><canvas class="al-image" aria-label="${roc?'ROC with matching detection area':'Part image for the threshold'}"></canvas></figure><figure><figcaption>${roc?'Horizontal axis: background false alarm rate PFA / Vertical axis: dent detection rate PD':'Yellow: found dent / Pink: missed / Blue: background marked by mistake'}</figcaption><canvas class="${roc?'al-plot':'al-image al-mask'}" aria-label="${roc?'ROC curve':'Threshold detection area'}"></canvas></figure></div><div class="al-metrics"><span>Found dent <strong class="al-pd"></strong></span><span>Background marked by mistake <strong class="al-pfa"></strong></span></div><div class="al-controls"><button class="al-play">▶ ${roc?'Move the threshold along the ROC':'From marking less to marking more'}</button></div><p class="al-result" aria-live="polite"></p>`;
    if(roc){const zoom=document.createElement('label');zoom.innerHTML='False alarm range of the chart <select class="al-zoom" aria-label="False alarm range of the ROC chart"><option value=".05">0–5%: low false alarm region</option><option value="1">0–100%: full curve</option></select>';root.querySelector('.al-controls').append(zoom);}
    root.querySelectorAll('figcaption')[0].textContent=roc?'Detection area: scored using the 12 monochromatic components':'Base image of the part: white-light G channel preview';
    if(!roc)root.querySelectorAll('figcaption')[1].textContent='Scored with the 12 monochromatic components: yellow found / pink missed / blue marked by mistake';
    const input=root.querySelector('input'),source=root.querySelector('canvas'),second=root.querySelectorAll('canvas')[1],methodSelect=root.querySelector('select');
    source.width=D.W;source.height=D.H;if(!roc){second.width=D.W;second.height=D.H;}
    let method='SAM',scores,curve,fair,timer=0,step=0;
    function stop(){clearInterval(timer);timer=0;root.querySelector('.al-play').textContent='▶ '+(roc?'Move the threshold along the ROC':'From marking less to marking more');}
    function reset(){stop();scores=A.score(method,1,idx,'t4');curve=A.sweep(scores,D.gt);fair=A.farAt(scores,D.gt);input.value=fair.eta;render();}
    function render() {
      const t=+input.value;root.querySelector('output').textContent=t.toFixed(3);
      let tp=0,fp=0,P=0,N=0;
      const c=(roc?source:second).getContext('2d');c.drawImage(backgroundImage,0,0);const image=c.getImageData(0,0,D.W,D.H);
      if(!roc)source.getContext('2d').drawImage(backgroundImage,0,0);
      for(let i=0;i<D.N;i++) {
        const truth=D.gt[i],hit=scores[i]>=t;truth?P++:N++;if(hit){truth?tp++:fp++;}
        const col=truth?(hit?[251,191,36]:[251,113,133]):hit?[103,232,249]:null;
        if(col)for(let j=0;j<3;j++)image.data[i*4+j]=.65*col[j]+.35*image.data[i*4+j];
      }c.putImageData(image,0,0);
      const pd=tp/P,pfa=fp/N;
      root.querySelector('.al-pd').textContent=(pd*100).toFixed(1)+'%';root.querySelector('.al-pfa').textContent=(pfa*100).toFixed(2)+'%';
      root.querySelectorAll('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case==='fair'&&Math.abs(t-fair.eta)<1e-6)));
      if(roc) {
        const limit=+root.querySelector('.al-zoom').value;
        const {c,w}=fit(second,240),l=46,r=w-20,top=20,b=195,X=v=>l+v/limit*(r-l),Y=v=>b-v*(b-top);
        [0,.5,1].forEach(v=>{c.strokeStyle='#334155';c.beginPath();c.moveTo(l,Y(v));c.lineTo(r,Y(v));c.moveTo(X(v*limit),top);c.lineTo(X(v*limit),b);c.stroke();text(c,(v*limit*100).toFixed(limit<1?1:0)+'%',X(v*limit)-10,b+18);text(c,(v*100)+'%',4,Y(v)+4);});
        c.save();c.beginPath();c.rect(l,top,r-l,b-top);c.clip();c.strokeStyle='#60a5fa';c.lineWidth=2;c.beginPath();for(let i=1000;i>=0;i--){const xx=X(curve.pfa[i]),yy=Y(curve.pd[i]);i===1000?c.moveTo(xx,yy):c.lineTo(xx,yy);}c.stroke();c.restore();
        c.strokeStyle='#fbbf24';c.setLineDash([4,4]);c.beginPath();c.moveTo(l,Y(.9));c.lineTo(r,Y(.9));c.stroke();c.setLineDash([]);
        c.fillStyle='#fbbf24';c.beginPath();c.arc(X(Math.min(pfa,limit)),Y(pd),6,0,7);c.fill();text(c,pfa>limit?'The current false alarm rate is outside this range; switch to the full curve':'Yellow dot: (false alarm rate, detection rate) at the current threshold',l,235);
        root.querySelector('.al-result').textContent='Threshold '+t.toFixed(3)+': found '+(100*pd).toFixed(1)+'% of the dent, background marked by mistake '+(100*pfa).toFixed(2)+'%. '+(Math.abs(t-fair.eta)<1e-6?'Under the condition of finding at least 90%, the FAR of '+method+' is '+(fair.far*100).toFixed(2)+'%.':'Press "Find at least 90%" first, then switch methods to compare FAR under the same condition.');
      } else root.querySelector('.al-result').textContent='Currently missing '+((1-pd)*100).toFixed(1)+'% of the dent; '+(pfa*100).toFixed(2)+'% of the normal background is marked by mistake. Lowering the threshold enlarges the marked area; raising it shrinks it.';
    }
    input.addEventListener('input',()=>{stop();render();});methodSelect.addEventListener('change',()=>{method=methodSelect.value;reset();});
    if(roc)root.querySelector('.al-zoom').addEventListener('change',render);
    root.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{stop();input.value=b.dataset.case==='fair'?fair.eta:b.dataset.case==='strict'?Math.min(1,fair.eta*2):fair.eta*.25;render();}));
    root.querySelector('.al-play').addEventListener('click',()=>{if(timer){stop();return;}step=0;input.value=1;render();root.querySelector('.al-play').textContent='⏸ Pause';timer=setInterval(()=>{step++;input.value=Math.max(0,1-step/60);render();if(step>=60)stop();},100);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('resize',render);reset();
  }
  roots.forEach(root=>{const type=root.dataset.algorithm;if(type==='threshold'||type==='roc')assessment(root,type==='roc');else detector(root,type);});
})();
