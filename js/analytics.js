function renderAnalytics(){
  const content=document.getElementById('analytics-content');content.innerHTML='';
  const blocks=getBlocks();const s=getStreak(),sc=getScore();

  if(!blocks.length){
    content.innerHTML='<div class="an-card" style="text-align:center;padding:40px 20px;color:var(--muted)">📊<br><br>No blocks on today\'s schedule yet.<br>Head to <strong>Schedule</strong> to plan your day.</div>';
    return;
  }

  // ── Core metrics ────────────────────────────────────────────────────────────
  // FIX: durationH now reads from style.height (not offsetHeight) so it is
  //      correct even when the home view is hidden. See blocks.js getBlocks().
  const totalH=blocks.reduce((s,b)=>s+b.durationH,0);
  const doneCount=blocks.filter(b=>b.done).length;
  const completedH=blocks.filter(b=>b.done).reduce((s,b)=>s+b.durationH,0);
  const freeH=Math.max(0,24-totalH);

  // FIX: Productivity = completed hours / total scheduled hours × 100.
  //      Old formula (totalH/16×100) measured schedule density, not completion.
  //      When no blocks are done yet, score is 0 — accurate, not a bug.
  const prodScore=totalH>0?Math.min(100,Math.round(completedH/totalH*100)):0;

  // Hourly density array for bar chart
  const hourLoad=new Array(24).fill(0);
  blocks.forEach(b=>{
    const st=Math.floor(b.startH),en=Math.min(24,Math.ceil(b.startH+b.durationH));
    for(let h=st;h<en;h++)hourLoad[h]++;
  });
  const busiestH=hourLoad.indexOf(Math.max(...hourLoad));

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const statHtml=`<div class="stat-row">
    <div class="stat-card"><div class="stat-val">${blocks.length}</div><div class="stat-lbl">Blocks</div></div>
    <div class="stat-card"><div class="stat-val">${totalH.toFixed(1)}h</div><div class="stat-lbl">Scheduled</div></div>
    <div class="stat-card"><div class="stat-val">${completedH.toFixed(1)}h</div><div class="stat-lbl">Completed</div></div>
    <div class="stat-card"><div class="stat-val">${prodScore}%</div><div class="stat-lbl">Productivity</div></div>
  </div>`;
  content.innerHTML=statHtml;

  const anGrid=document.createElement('div');anGrid.className='an-grid';

  // ── Pie chart — by category ─────────────────────────────────────────────────
  // FIX: categories now accumulate correctly because durationH is non-zero.
  const catMap={};
  blocks.forEach(b=>{
    const k=b.catId||'__none';
    if(!catMap[k])catMap[k]={catId:k,hours:0,cat:CAT_MAP[b.catId]};
    catMap[k].hours+=b.durationH;
  });
  if(freeH>0)catMap['__free']={catId:'__free',hours:freeH,cat:{name:'Free',color:'#374151',emoji:'🕐'}};
  const slices=Object.values(catMap).sort((a,b)=>b.hours-a.hours);
  const totalAll=slices.reduce((s,x)=>s+x.hours,0);

  const pieCard=document.createElement('div');pieCard.className='an-card';
  pieCard.innerHTML=`<div class="an-card-title">Time by Category</div><div class="an-card-sub">Today's time distribution</div>`;
  const pw=document.createElement('div');pw.className='pie-wrap';
  const canvas=document.createElement('canvas');canvas.width=148;canvas.height=148;pw.appendChild(canvas);
  const legend=document.createElement('div');legend.className='pie-legend';
  slices.forEach(s=>{
    const pct=(s.hours/totalAll*100).toFixed(0);const col=(s.cat?.color)||'#6B7280';
    const nm=s.cat?`${s.cat.emoji||''} ${s.cat.name}`:'Uncategorised';
    legend.innerHTML+=`<div class="pie-legend-item"><div class="pie-legend-dot" style="background:${col}"></div><span style="flex:1">${nm}</span><span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">${pct}%</span></div>`;
  });
  pw.appendChild(legend);pieCard.appendChild(pw);anGrid.appendChild(pieCard);

  requestAnimationFrame(()=>{
    const ctx=canvas.getContext('2d');let a=-Math.PI/2;
    slices.forEach(s=>{
      const sw=s.hours/totalAll*Math.PI*2;const col=(s.cat?.color)||'#6B7280';
      ctx.beginPath();ctx.moveTo(74,74);ctx.arc(74,74,64,a,a+sw);ctx.closePath();
      ctx.fillStyle=col;ctx.fill();
      ctx.strokeStyle=document.documentElement.getAttribute('data-theme')==='dark'?'#0D0D14':'#F4F3FF';
      ctx.lineWidth=2;ctx.stroke();a+=sw;
    });
    ctx.beginPath();ctx.arc(74,74,26,0,Math.PI*2);
    ctx.fillStyle=document.documentElement.getAttribute('data-theme')==='dark'?'#16161F':'#FFFFFF';ctx.fill();
    ctx.fillStyle=document.documentElement.getAttribute('data-theme')==='dark'?'#fff':'#111';
    ctx.textAlign='center';ctx.font='bold 9px DM Sans,sans-serif';
    ctx.fillText(totalH.toFixed(1)+'h',74,75);
    ctx.font='8px DM Sans,sans-serif';ctx.fillStyle='rgba(128,128,128,.8)';
    ctx.fillText('scheduled',74,86);
  });

  // ── Bar chart — hourly density ──────────────────────────────────────────────
  const barCard=document.createElement('div');barCard.className='an-card';
  barCard.innerHTML=`<div class="an-card-title">Hourly Distribution</div><div class="an-card-sub">Block density across the day</div>`;
  const bc=document.createElement('div');bc.className='bar-chart';
  const maxL=Math.max(...hourLoad,1);
  for(let h=0;h<24;h++){
    const col=document.createElement('div');col.className='bar-col';
    const fill=document.createElement('div');fill.className='bar-fill';
    fill.style.background=hourLoad[h]>0?`hsl(${258+h*3},65%,${55-hourLoad[h]*5}%)`:'rgba(255,255,255,.05)';
    fill.style.height=(hourLoad[h]/maxL*90)+'%';
    // FIX: tooltip uses 12-hour AM/PM format
    fill.setAttribute('data-tip',`${fmt12h(h)} · ${hourLoad[h]} block${hourLoad[h]!==1?'s':''}`);
    const lbl=document.createElement('div');lbl.className='bar-lbl';
    // Show label every 4 hours using 12h format
    lbl.textContent=h%4===0?(h===0?'12a':h===12?'12p':h<12?`${h}a`:`${h-12}p`):'';
    col.appendChild(fill);col.appendChild(lbl);bc.appendChild(col);
  }
  barCard.appendChild(bc);anGrid.appendChild(barCard);

  // ── Insight card ─────────────────────────────────────────────────────────────
  // FIX: insights were generating but data was all-zero (totalH=0) due to the
  //      offsetHeight bug. Now they compute correctly.
  const ignored=['sleep','work','study'];
  const catRanked=Object.values(catMap).filter(x=>!ignored.includes(x.catId)&&x.catId!=='__free').sort((a,b)=>b.hours-a.hours);
  const topCat=catRanked[0];
  const studyH=(catMap['study']?.hours||0);
  const sleepH=(catMap['sleep']?.hours||0);
  const workH=(catMap['work']?.hours||0);

  // Busiest hour label
  const busiestLabel=fmt12h(busiestH);

  let insight=`You've scheduled <strong>${totalH.toFixed(1)} hours</strong> today`;
  if(doneCount>0){
    insight+=`, completing <strong>${completedH.toFixed(1)}h</strong> with a productivity score of <strong>${prodScore}%</strong>`;
  } else {
    insight+=` — start completing blocks to track your productivity`;
  }
  insight+='.';
  if(topCat)insight+=` Your top activity outside work & study is <strong>${topCat.cat?.name||'Uncategorised'}</strong> at ${topCat.hours.toFixed(1)}h.`;
  if(totalH>0)insight+=` Peak hour: <strong>${busiestLabel}</strong>.`;

  const suggestions=[];
  if(sleepH<7&&sleepH>0)suggestions.push({icon:'😴',text:`You've scheduled ${sleepH.toFixed(1)}h of sleep — aim for at least 7h for peak performance`});
  if(sleepH===0)suggestions.push({icon:'😴',text:'Consider adding a sleep block — 7–9 hours helps memory and recovery'});
  if(studyH<1)suggestions.push({icon:'📚',text:'Try to include at least 1h of study or learning time'});
  if(totalH<8)suggestions.push({icon:'📅',text:'Your schedule has a lot of free time — consider adding more structured activities'});
  if(doneCount===0&&blocks.length>0)suggestions.push({icon:'✅',text:'Tick the ✓ on any block when you finish it to earn reward points!'});
  if(prodScore>0&&prodScore<50)suggestions.push({icon:'🎯',text:`You're at ${prodScore}% completion — keep going, you can do it!`});
  if(prodScore>=80&&doneCount>0)suggestions.push({icon:'🏆',text:`Outstanding! ${prodScore}% completion rate today — keep that momentum!`});

  // Completion trend (percentage display)
  const completionBar=doneCount>0?`<div style="margin-top:10px">
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px"><span>Completion</span><span>${doneCount}/${blocks.length} blocks</span></div>
    <div style="height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden"><div style="height:100%;width:${prodScore}%;background:var(--accent);border-radius:3px;transition:width .4s"></div></div>
  </div>`:'';

  const insCard=document.createElement('div');insCard.className='an-card full';
  insCard.innerHTML=`<div class="an-card-title">AI Insights</div><div class="an-card-sub">Smart analysis of your schedule</div>
  <div class="insight-box"><div class="insight-text">${insight}</div>${completionBar}</div>
  ${suggestions.length?`<div style="margin-top:12px"><div class="an-card-sub" style="margin-bottom:8px">💡 Suggestions</div>${suggestions.map(sg=>`<div class="suggestion-item"><span class="suggestion-icon">${sg.icon}</span>${sg.text}</div>`).join('')}</div>`:''}`;
  anGrid.appendChild(insCard);
  content.appendChild(anGrid);
}
