/* Small teaching examples; independent of the paper's experimental data. */
(function () {
  'use strict';
  const cosine = (a,b) => a.reduce((n,v,i)=>n+v*b[i],0)/(Math.hypot(...a)*Math.hypot(...b));
  const alignedValue = shift => [100,100,30,100,100,100][2-shift];
  const annotation = radius => {
    let tp=0,fp=0,fn=0,tn=0;
    for(let y=0;y<7;y++)for(let x=0;x<7;x++){
      const predicted=Math.abs(x-3)<=1&&Math.abs(y-3)<=1;
      const marked=Math.abs(x-3)<=radius&&Math.abs(y-3)<=radius;
      if(predicted&&marked)tp++;else if(predicted)fp++;else if(marked)fn++;else tn++;
    }
    return {tp,fp,fn,tn,pd:tp/(tp+fn),pfa:fp/(fp+tn)};
  };
  if(typeof module!=='undefined')module.exports={cosine,alignedValue,annotation};
  if(typeof document==='undefined')return;
  const make=(parent,tag,attrs={},text='')=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));e.textContent=text;parent.appendChild(e);return e;};
  const text=(svg,x,y,t,fill='#cbd5e1')=>make(svg,'text',{x,y,fill,'font-size':16},t);
  document.querySelectorAll('.extra-demo').forEach(root=>{
    const svg=root.querySelector('svg'),result=root.querySelector('.extra-result');
    function draw(){
      svg.replaceChildren();
      const kind=root.dataset.kind;
      if(kind==='contrast'){
        const offset=+root.querySelector('[name=overall]').value,difference=+root.querySelector('[name=contrast]').value;
        const bg=100+offset,defect=bg-difference;
        root.querySelector('[data-output=overall]').textContent=offset;root.querySelector('[data-output=contrast]').textContent=difference;
        make(svg,'rect',{x:40,y:35,width:480,height:155,fill:`rgb(${bg},${bg},${bg})`});
        make(svg,'ellipse',{cx:280,cy:110,rx:65,ry:28,fill:`rgb(${defect},${defect},${defect})`});
        text(svg,40,225,`Background brightness ${bg}    Defect brightness ${defect}    Difference ${difference}`);
        result.textContent=difference===0?'Same brightness: this image cannot tell the defect apart by brightness difference.':'Making everything brighter together leaves the difference unchanged; only changing the difference makes the defect stand out more.';
      }else if(kind==='alignment'){
        const shift=+root.querySelector('input').value;root.querySelector('output').textContent=shift;
        const rows=[[120,120,40,120,120,120],[100,100,30,100,100,100]];
        rows.forEach((row,r)=>{text(svg,25,65+r*90,`Image ${r+1}`);for(let j=0;j<6;j++){
          const source=j-(r?shift:0),v=source>=0?row[source]:null,x=120+j*63,y=35+r*90;
          make(svg,'rect',{x,y,width:58,height:55,fill:v===null?'#1e293b':`rgb(${v},${v},${v})`});
          if(v!==null)text(svg,x+12,y+33,String(v),'#f8fafc');
          if(j===2)make(svg,'rect',{x:x-2,y:y-2,width:62,height:59,fill:'none',stroke:'#fbbf24','stroke-width':3});
        }});
        text(svg,25,235,`Always read cell 3 → brightness record [40, ${alignedValue(shift)}]`);
        result.textContent=shift===0?'The two images are aligned: both read the same defect position.':'Positions are offset: the same cell number now reads different places on the part.';
      }else if(kind==='reference'){
        const mode=root.querySelector('select').value,ref=mode==='background'?[100,50]:[50,100];
        const records=[[100,50],[200,100],[50,100]],labels=['Background','Background 2× brighter','Defect template'];
        text(svg,30,30,`Reference record [${ref.join(', ')}]    SAM cosine score: closer to 1 means more like the reference`);
        records.forEach((r,i)=>{const value=cosine(r,ref),x=75+i*175;make(svg,'rect',{x,y:190-value*130,width:80,height:value*130,fill:mode==='background'?'#60a5fa':'#fbbf24'});text(svg,x,48,String(value.toFixed(2)));text(svg,x-12,222,labels[i]);});
        result.textContent=mode==='background'?'Background as reference: look for places that do not resemble the background, so the similarity score must be flipped into a difference.':'Defect as reference: look for places that resemble this defect template; one template may not represent every defect.';
      }else{
        const radius=+root.querySelector('input').value,stats=annotation(radius);
        root.querySelector('output').textContent=['1 cell','3 × 3 cells','5 × 5 cells'][radius];
        for(let y=0;y<7;y++)for(let x=0;x<7;x++){
          const predicted=Math.abs(x-3)<=1&&Math.abs(y-3)<=1;
          make(svg,'rect',{x:40+x*27,y:35+y*27,width:23,height:23,fill:predicted?'#fbbf24':'#334155'});
        }
        make(svg,'rect',{x:40+(3-radius)*27-3,y:35+(3-radius)*27-3,width:(radius*2+1)*27+2,height:(radius*2+1)*27+2,fill:'none',stroke:'#67e8f9','stroke-width':3});
        text(svg,280,75,`Marked area found ${(stats.pd*100).toFixed(0)}%`);text(svg,280,115,`Background marked by mistake ${(stats.pfa*100).toFixed(1)}%`);
        text(svg,280,170,`Correct ${stats.tp} cells   Wrong ${stats.fp} cells`);text(svg,280,205,`Missed ${stats.fn} cells`);
        result.textContent='The yellow detection is fixed at 9 cells; changing only the blue marked area changes the score.';
      }
    }
    root.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',draw));draw();
  });
})();
