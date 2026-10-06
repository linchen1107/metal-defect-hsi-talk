(function () {
  'use strict';
  function show() {
    const root=document.querySelector('.formula-reference-list');
    if(!root)return;
    const ids=['eq-u3','eq-u1','eq-u2','eq-u4','eq-1','eq-2','eq-3','eq-4','eq-5','eq-6'];
    ids.forEach(id=>{
      const source=document.getElementById(id), original=source.querySelector('.tex-block');
      const row=document.createElement('div');row.className='formula-reference-row';row.dataset.formula=id;
      const link=document.createElement('a');link.href='#'+id;link.textContent=source.querySelector('h3').textContent;
      const eq=document.createElement('div');eq.className='tex-block';
      // Reuse the formal formula source; only line breaks differ.
      const raw=original.dataset.src||original.textContent;
      row.dataset.source=raw;
      const wrapped=id==='eq-6'?raw.replace(' = ', ' = \\qquad '):raw;
      const lines=wrapped.split(/,?\\q(?:quad|uad)\s*/);
      eq.textContent=lines.length>1?'\\begin{gathered}'+lines.join('\\\\')+'\\end{gathered}':raw;
      row.append(link,eq); if(id=== 'eq-u4'){const note=document.createElement('p');note.className='sub';note.textContent='The 20-run average covers 5 cubes × 4 references; RX is averaged over only 5 runs.';row.append(note);} root.append(row);
    });
    PR.renderTex(root);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show);else show();
})();
