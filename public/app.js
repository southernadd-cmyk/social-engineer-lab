const state = { mode:'defender', scenario:null, scenarios:[], difficulty:'medium', messages:[], status:'ongoing', busy:false };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const API_BASE = String(window.SELAB_API_BASE || '').replace(/\/$/, '');
const API_READY = /^https:\/\//.test(API_BASE) && !API_BASE.includes('REPLACE-WITH-YOUR-WORKER');

async function api(url, options={}){
  if(!API_READY) throw new Error('AI backend not connected yet. The GitHub Pages frontend is live, but the Cloudflare Worker URL still needs to be added to config.js.');
  const res = await fetch(`${API_BASE}${url}`, {headers:{'Content-Type':'application/json'}, ...options});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function text(el, value){ el.textContent = value ?? ''; }
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function renderScenarios(){
  const grid = $('#scenarioGrid'); grid.innerHTML='';
  state.scenarios.forEach(s=>{
    const b=document.createElement('button'); b.type='button'; b.className='scenario-card'; b.dataset.id=s.id;
    const brief = state.mode==='defender'?s.defenderBrief:s.attackerBrief;
    b.innerHTML=`<span>${escapeHtml(s.channel)}</span><strong>${escapeHtml(s.title)}</strong><p>${escapeHtml(brief)}</p>`;
    b.addEventListener('click',()=>{state.scenario=s; $$('.scenario-card').forEach(x=>x.classList.toggle('selected',x.dataset.id===s.id)); $('#startBtn').disabled=false;});
    grid.appendChild(b);
  });
}

function addBubble(kind, content, who=''){
  const div=document.createElement('div'); div.className=`bubble ${kind}`;
  if(who){const w=document.createElement('span'); w.className='who'; w.textContent=who; div.appendChild(w);}
  const t=document.createElement('span'); t.textContent=content; div.appendChild(t); $('#chat').appendChild(div); $('#chat').scrollTop=$('#chat').scrollHeight; return div;
}

function setBusy(v){ state.busy=v; $('#sendBtn').disabled=v; $('#message').disabled=v; $('#finishBtn').disabled=v; }
function objectiveFor(s){return state.mode==='defender'?'Recognise the manipulation, protect information/access, verify independently and stop the attack.':s.attackGoal+' Keep everything fictional and inside the simulator.';}

function difficultyText(){
  if(state.mode==='defender'){
    if(state.difficulty==='easy') return 'Level 1: the attacker will leave obvious clues. Correctly refusing, verifying or reporting can stop the scenario quickly.';
    if(state.difficulty==='hard') return 'Level 3: the attacker will be subtle and persistent, but a clear independent verification, refusal or report still wins.';
    return 'Level 2: the attacker will be realistic and may push back once. Use policy and independent verification to stop them.';
  }
  if(state.difficulty==='easy') return 'Level 1: one believable piece of context plus a clear unsafe request can be enough. The employee may challenge you once.';
  if(state.difficulty==='hard') return 'Level 3: combine several facts or persuasion techniques and adapt after a challenge. The employee is cautious, but the mission is still winnable.';
  return 'Level 2: combine at least two useful pieces of context or persuasion techniques, then make the unsafe request clearly.';
}

function renderIntel(){
  const list=$('#intelList'); list.innerHTML='';
  const items = state.mode==='attacker' ? (state.scenario.attackerKnows||[]) : (state.scenario.defenderKnows||[]);
  items.forEach(item=>{ const li=document.createElement('li'); li.textContent=item; list.appendChild(li); });
  text($('#intelTitle'), state.mode==='attacker' ? 'Red Team intelligence' : 'Blue Team information');
  text($('#intelIntro'), state.mode==='attacker' ? 'These are the fictional facts your attacker already knows. Use them to build a believable pretext.' : 'These are the facts and policies your defender knows before the conversation starts.');
  text($('#difficultyBrief'), difficultyText());
}

$$('.mode-card').forEach(btn=>btn.addEventListener('click',()=>{
  state.mode=btn.dataset.mode; state.scenario=null; $('#startBtn').disabled=true;
  $$('.mode-card').forEach(x=>x.classList.toggle('selected',x===btn)); renderScenarios();
}));
$('#difficulty').addEventListener('change',e=>state.difficulty=e.target.value);
$('#startBtn').addEventListener('click', startSimulation);
$('#backBtn').addEventListener('click', ()=>show('setup'));
$('#newScenario').addEventListener('click', ()=>{state.scenario=null; $('#startBtn').disabled=true; renderScenarios(); show('setup');});
$('#finishBtn').addEventListener('click', finishDebrief);
$('#chatForm').addEventListener('submit', sendMessage);
$('#copyReport').addEventListener('click', copyReport);

function show(id){ ['setup','simulation','debrief'].forEach(x=>$('#'+x).classList.toggle('hidden',x!==id)); window.scrollTo({top:0,behavior:'smooth'}); }

async function startSimulation(){
  if(!state.scenario) return;
  state.messages=[]; state.status='ongoing'; $('#chat').innerHTML='';
  text($('#scenarioTitle'),state.scenario.title); text($('#channel'),state.scenario.channel); text($('#briefText'),state.mode==='defender'?state.scenario.defenderBrief:state.scenario.attackerBrief); text($('#objectiveText'),objectiveFor(state.scenario));
  renderIntel();
  const pill=$('#modePill'); pill.className='pill'+(state.mode==='attacker'?' red':''); pill.textContent=state.mode==='defender'?'BLUE TEAM · DEFENDER':'RED TEAM · ATTACKER';
  updateTurns(); show('simulation'); addBubble('system','Simulation started. Use only the fictional information in the scenario panel. You can end the scenario at any time.');
  setBusy(true);
  try{
    const seed = state.mode==='defender'?'Begin the fictional attack naturally using only the scenario facts available to the attacker.':'Begin naturally as the fictional employee. Use only the scenario facts and policy shown to the defender. Do not invent extra verification requirements.';
    state.messages.push({role:'user',content:seed});
    const data=await api('/api/chat',{method:'POST',body:JSON.stringify(payload())});
    state.messages.push({role:'assistant',content:data.reply});
    addBubble('ai',data.reply,state.mode==='defender'?'SIMULATED ATTACKER':'FICTIONAL EMPLOYEE'); state.status=data.status;
  }catch(e){addBubble('system',e.message);}
  finally{setBusy(false); updateTurns(); $('#message').focus();}
}

function payload(){return {mode:state.mode,scenarioId:state.scenario.id,difficulty:state.difficulty,messages:state.messages};}

async function sendMessage(e){
  e.preventDefault(); if(state.busy||state.status!=='ongoing') return;
  const input=$('#message'); const content=input.value.trim(); if(!content)return;
  input.value=''; addBubble('user',content,'YOU'); state.messages.push({role:'user',content}); updateTurns();
  setBusy(true); const typing=addBubble('ai','Thinking…',state.mode==='defender'?'SIMULATED ATTACKER':'FICTIONAL EMPLOYEE'); typing.classList.add('typing');
  try{
    const data=await api('/api/chat',{method:'POST',body:JSON.stringify(payload())});
    typing.remove(); state.messages.push({role:'assistant',content:data.reply}); addBubble('ai',data.reply,state.mode==='defender'?'SIMULATED ATTACKER':'FICTIONAL EMPLOYEE'); state.status=data.status;
    if(state.status!=='ongoing'){
      addBubble('system',state.status==='defender_success'?'The defender has successfully stopped the scenario.':'Red Team achieved the fictional mission objective.');
      $('#message').disabled=true; $('#sendBtn').disabled=true;
    }
  }catch(err){typing.remove(); addBubble('system',err.message);}
  finally{
    setBusy(false); updateTurns();
    const userTurns=state.messages.filter(m=>m.role==='user').length;
    if(state.mode==='attacker' && userTurns>=5 && state.status==='ongoing') text($('#simHint'),'Need a nudge? Use facts from the intelligence panel, combine two different persuasion techniques, and make the unsafe action you want explicit.');
    if(state.messages.length>=16&&state.status==='ongoing'){state.status='defender_success'; addBubble('system','Turn limit reached. End the scenario to see the debrief.'); $('#message').disabled=true; $('#sendBtn').disabled=true;}
  }
}

function updateTurns(){const userTurns=state.messages.filter(m=>m.role==='user').length; text($('#turnCount'),`${Math.min(userTurns,16)} / 16 turns`);}

async function finishDebrief(){
  if(state.busy||!state.scenario)return; setBusy(true); $('#finishBtn').textContent='Building debrief…';
  try{
    const d=await api('/api/debrief',{method:'POST',body:JSON.stringify({mode:state.mode,scenarioId:state.scenario.id,messages:state.messages})});
    renderDebrief(d); show('debrief');
  }catch(e){addBubble('system',e.message);}
  finally{setBusy(false); $('#finishBtn').textContent='End scenario & debrief';}
}

function list(id,items){const ul=$(id); ul.innerHTML=''; (Array.isArray(items)?items:[]).forEach(x=>{const li=document.createElement('li');li.textContent=x;ul.appendChild(li);});}
function renderDebrief(d){
  const score=Math.max(0,Math.min(100,Number(d.score)||0)); text($('#score'),score); $('#scoreRing').style.background=`conic-gradient(var(--green) 0 ${score}%,#20344f ${score}% 100%)`;
  text($('#classification'),d.classification||state.scenario.channel); text($('#outcome'),d.outcome||'Simulation complete.'); list('#strengths',d.strengths); list('#missed',d.missed_clues); list('#controls',d.recommended_controls); text($('#examParagraph'),d.exam_paragraph||'');
  const chips=$('#techniques'); chips.innerHTML=''; (d.techniques_seen||[]).forEach(x=>{const span=document.createElement('span');span.className='chip';span.textContent=x;chips.appendChild(span);});
  $('#copyStatus').textContent='';
}

async function copyReport(){
  const lines=[`SOCIAL ENGINEER LAB — EVIDENCE`,`Scenario: ${state.scenario.title}`,`Mode: ${state.mode==='defender'?'Defender':'Attacker'}`,`Classification: ${$('#classification').textContent}`,`Outcome: ${$('#outcome').textContent}`,`Score: ${$('#score').textContent}/100`,'',`Strengths:`,...$$('#strengths li').map(x=>'- '+x.textContent),'',`Missed clues / opportunities:`,...$$('#missed li').map(x=>'- '+x.textContent),'',`Recommended controls:`,...$$('#controls li').map(x=>'- '+x.textContent),'',`Exam-style paragraph:`, $('#examParagraph').textContent];
  try{await navigator.clipboard.writeText(lines.join('\n')); $('#copyStatus').textContent='Copied. Paste this into your Class Notebook evidence document.';}catch{ $('#copyStatus').textContent='Copy was blocked by the browser. Select the report text manually.'; }
}

(async function init(){
  try{
    const res = await fetch('./scenarios.json', {cache:'no-store'});
    if(!res.ok) throw new Error(`Could not load scenarios (${res.status}).`);
    const data = await res.json();
    state.scenarios=data.scenarios||[];
    renderScenarios();
    if(!API_READY){
      const warning=$('#backendWarning');
      warning.classList.remove('hidden');
      warning.innerHTML='<strong>Frontend deployed.</strong> The AI simulation will become active after the Cloudflare Worker URL is added to <code>public/config.js</code>.';
    }
  }
  catch(e){$('#scenarioGrid').innerHTML=`<p class="bubble system">${escapeHtml(e.message)}</p>`;}
})();
