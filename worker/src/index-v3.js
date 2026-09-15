import { scenarios } from './scenarios-v3.js';

const MAX_TURNS = 14;
const MAX_MESSAGE = 900;
const gateIds = ['pretext','context','pressure','unsafe_request','question','refuse','verify','report'];

const chatSchema = {
  type:'object',
  properties:{
    reply:{type:'string'},
    observed_gates:{type:'array',items:{type:'string'}},
    tactics_seen:{type:'array',items:{type:'string'}},
    short_reason:{type:'string'}
  },
  required:['reply','observed_gates','tactics_seen','short_reason'],
  additionalProperties:false
};

const debriefSchema = {
  type:'object',
  properties:{
    classification:{type:'string'},
    outcome:{type:'string'},
    strengths:{type:'array',items:{type:'string'}},
    missed_clues:{type:'array',items:{type:'string'}},
    techniques_seen:{type:'array',items:{type:'string'}},
    recommended_controls:{type:'array',items:{type:'string'}},
    exam_paragraph:{type:'string'}
  },
  required:['classification','outcome','strengths','missed_clues','techniques_seen','recommended_controls','exam_paragraph'],
  additionalProperties:false
};

function corsHeaders(origin, env){
  const allowed = env.ALLOWED_ORIGIN || 'https://southernadd-cmyk.github.io';
  const ok = origin === allowed || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
  };
}
function json(data,status,origin,env){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders(origin,env),'Content-Type':'application/json; charset=utf-8'}});}

function sanitiseMessages(messages){
  if(!Array.isArray(messages)) return [];
  return messages.slice(-MAX_TURNS).map(m=>({role:m?.role==='assistant'?'assistant':'user',content:String(m?.content||'').slice(0,MAX_MESSAGE)})).filter(m=>m.content.trim());
}
function sanitiseProgress(progress,valid){
  const set=new Set(valid);
  return [...new Set((Array.isArray(progress)?progress:[]).map(String).filter(x=>set.has(x)))];
}
function realWorldTargeting(text){
  const t=String(text||'').toLowerCase();
  const patterns=[/real (person|company|employee|target)/,/their (email|phone number|password|account)/,/credential harvester/,/login page clone/,/malware/,/payload/,/bypass (mfa|2fa) on/,/phish (my|this|the) (boss|teacher|coworker|employee|company)/];
  return patterns.some(r=>r.test(t));
}
function baseSafety(){
  return `This is a closed classroom simulation. Every person, organisation, account, link and transaction is fictional. Keep all activity inside the scenario. Never redirect toward a real person or organisation, ask for real personal data, generate real credential-harvesting links, malware, payloads or operational attack instructions.`;
}
function requiredCount(difficulty){return difficulty==='easy'?2:difficulty==='hard'?4:3;}
function validGateList(s,mode){return (mode==='attacker'?s.redGates:s.blueGates).map(g=>g.id);}
function gateLabels(s,mode){return Object.fromEntries((mode==='attacker'?s.redGates:s.blueGates).map(g=>[g.id,g.label]));}
function hasRequiredGate(mode,difficulty,progress){
  const p=new Set(progress);
  if(mode==='attacker') return p.has('unsafe_request');
  if(difficulty==='easy') return p.has('refuse') || p.has('verify');
  return p.has('refuse') && p.has('verify');
}
function didWin(mode,difficulty,progress){return progress.length>=requiredCount(difficulty) && hasRequiredGate(mode,difficulty,progress);}

function actorSystem(s,mode,difficulty,progress,opening){
  const gates=mode==='attacker'?s.redGates:s.blueGates;
  const labels=gateLabels(s,mode);
  const achieved=progress.map(id=>labels[id]).filter(Boolean);
  const threshold=requiredCount(difficulty);
  const remaining=gates.filter(g=>!progress.includes(g.id)).map(g=>`${g.id}: ${g.label}`).join('; ');
  const realism=difficulty==='easy'?'guided and susceptible':difficulty==='hard'?'cautious but still winnable':'realistic and moderately cautious';
  const common=`${baseSafety()}\nScenario: ${s.title}. Setting: ${s.setting}. Difficulty: ${difficulty}. The game requires ${threshold} progress gates. Already achieved: ${achieved.length?achieved.join(', '):'none'}. Remaining gates: ${remaining||'none'}. Do not invent facts, policies, verification requirements or credentials that are not in the scenario definition. Keep replies brief and natural. Return observed_gates ONLY for progress demonstrated by the STUDENT'S latest message. Do not award a gate just because your own reply mentions it.`;
  if(mode==='attacker'){
    return `${common}\n\nYou play the FICTIONAL EMPLOYEE/DEFENDER: ${s.persona}. Policy: ${s.policy}. Human vulnerability: ${s.vulnerability}. The student is Red Team and plays: ${s.attackerRole}. Their objective: ${s.attackGoal}. Be ${realism}. React like a real employee, not an unbeatable security robot. On easy difficulty, a plausible pretext plus a clear unsafe request should often be enough. On medium, challenge weak/incomplete stories once but become more receptive when the student uses accurate context and appropriate pressure. On hard, challenge inconsistencies but remain persuadable when all four gates are demonstrated. NEVER create new verification hurdles. If the server later decides the gates are sufficient, it will replace your reply with the success outcome. ${opening?'This is the opening turn: greet/respond naturally and do not award any progress gates.':''}`;
  }
  return `${common}\n\nYou play the FICTIONAL SOCIAL ENGINEER. The student is Blue Team and plays ${s.target}. Attacker role: ${s.attackerRole}. Attacker knows only: ${s.attackerKnows.join(' | ')}. The student knows: ${s.defenderKnows.join(' | ')}. Be ${realism}. Make the attack believable and adapt to the student's questions, but never invent extra real-world details. The defender succeeds by questioning, refusing the unsafe action, independently verifying and reporting/escalating. If the server later decides the gates are sufficient, it will replace your reply with the defensive success outcome. ${opening?'This is the opening turn: begin the attack naturally using scenario facts and do not award any progress gates.':''}`;
}

function debriefSystem(s,mode,difficulty,progress,status){
  const gates=mode==='attacker'?s.redGates:s.blueGates;
  const labels=Object.fromEntries(gates.map(g=>[g.id,g.label]));
  const achieved=progress.map(id=>labels[id]).filter(Boolean);
  const missed=gates.filter(g=>!progress.includes(g.id)).map(g=>g.label);
  return `${baseSafety()}\nYou are an AAQ Alternative Qualification IT Unit 2 teacher assessor. Analyse only this fictional simulation. Scenario: ${s.title}. Channel: ${s.channel}. Mode: ${mode}. Difficulty: ${difficulty}. Outcome status: ${status}. Progress achieved: ${achieved.join('; ')||'none'}. Progress missed: ${missed.join('; ')||'none'}. Expected techniques: ${s.techniques.join(', ')}. Useful controls: ${s.controls.join(', ')}. Give concise curriculum-focused feedback. For Red Team, frame feedback around recognising how social engineering exploits human factors, not improving real-world wrongdoing. The exam_paragraph must be 90-140 words and use threat -> vulnerability -> impact -> control -> why the control works.`;
}

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function promptForJson(kind){
  return kind==='chat'?'Respond ONLY as valid JSON with reply (string), observed_gates (array of strings), tactics_seen (array of strings), short_reason (string).':'Respond ONLY as valid JSON with classification, outcome, strengths (array), missed_clues (array), techniques_seen (array), recommended_controls (array), exam_paragraph.';
}
async function requestGroq(messages,env,responseFormat,maxTokens){
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:env.GROQ_MODEL||'openai/gpt-oss-20b',messages,temperature:0.5,max_completion_tokens:maxTokens,response_format:responseFormat})
  });
  const text=await response.text(); let data=null; try{data=JSON.parse(text);}catch{}
  return {response,text,data};
}
function extractMessage(data){return data?.choices?.[0]?.message||null;}
async function groq(messages,env,schemaName,schema,maxTokens,kind){
  if(!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured on the Worker.');
  const strict={type:'json_schema',json_schema:{name:schemaName,strict:true,schema}};
  let result=await requestGroq(messages,env,strict,maxTokens);
  if(result.response.ok){const m=extractMessage(result.data); if(m?.content){try{return JSON.parse(m.content);}catch{}}}
  if(result.response.status===400 || result.response.ok){
    const fallback=[...messages.slice(0,1),{role:'system',content:promptForJson(kind)},...messages.slice(1)];
    result=await requestGroq(fallback,env,{type:'json_object'},maxTokens);
    if(result.response.ok){const m=extractMessage(result.data); if(m?.content){try{return JSON.parse(m.content);}catch{}}}
  }
  if(result.response.status===429){await wait(500);throw new Error('PROVIDER_429');}
  if(result.response.status===401||result.response.status===403)throw new Error(`PROVIDER_${result.response.status}`);
  if(result.response.status>=500)throw new Error(`PROVIDER_${result.response.status}`);
  throw new Error(`PROVIDER_${result.response.status||'INVALID'}`);
}

async function handleChat(request,env,origin){
  const body=await request.json();
  const s=scenarios[String(body.scenarioId||'')];
  if(!s)return json({error:'Unknown scenario.'},400,origin,env);
  const mode=body.mode==='attacker'?'attacker':'defender';
  const difficulty=['easy','medium','hard'].includes(body.difficulty)?body.difficulty:'medium';
  const opening=Boolean(body.opening);
  const valid=validGateList(s,mode);
  const existing=sanitiseProgress(body.progress,valid);
  const messages=sanitiseMessages(body.messages);
  const last=messages.at(-1)?.content||'';
  if(realWorldTargeting(last))return json({reply:'Keep the exercise inside the fictional training scenario. Use only the people, organisations and facts in the mission briefing.',status:'ongoing',short_reason:'Real-world targeting is outside this classroom simulation.',achieved_gates:existing,required_count:requiredCount(difficulty),tactics_seen:[]},200,origin,env);
  const userPrompt=opening?'Begin the scenario naturally now.':`Continue the scenario. Classify any progress gates demonstrated by the student's latest message.`;
  const parsed=await groq([{role:'system',content:actorSystem(s,mode,difficulty,existing,opening)},...messages,{role:'user',content:userPrompt}],env,'guided_turn',chatSchema,900,'chat');
  const observed=(Array.isArray(parsed.observed_gates)?parsed.observed_gates:[]).map(String).filter(x=>valid.includes(x));
  const achieved=opening?existing:[...new Set([...existing,...observed])];
  const win=!opening && didWin(mode,difficulty,achieved);
  const status=win?(mode==='attacker'?'attacker_success':'defender_success'):'ongoing';
  let reply=String(parsed.reply||'The conversation continues.').slice(0,1800);
  if(win){reply=mode==='attacker'?s.redSuccessReply:s.blueSuccessReply;}
  return json({reply,status,short_reason:String(parsed.short_reason||'').slice(0,300),achieved_gates:achieved,required_count:requiredCount(difficulty),tactics_seen:Array.isArray(parsed.tactics_seen)?parsed.tactics_seen.slice(0,8):[],training_flag:win&&mode==='attacker'?`MISSION-${s.number}-COMPLETE`:null},200,origin,env);
}

async function handleDebrief(request,env,origin){
  const body=await request.json(); const s=scenarios[String(body.scenarioId||'')]; if(!s)return json({error:'Unknown scenario.'},400,origin,env);
  const mode=body.mode==='attacker'?'attacker':'defender'; const difficulty=['easy','medium','hard'].includes(body.difficulty)?body.difficulty:'medium';
  const valid=validGateList(s,mode); const progress=sanitiseProgress(body.progress,valid); const status=String(body.status||'ongoing');
  const messages=sanitiseMessages(body.messages); const transcript=messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n').slice(0,12000);
  const parsed=await groq([{role:'system',content:debriefSystem(s,mode,difficulty,progress,status)},{role:'user',content:`Simulation transcript:\n${transcript}`}],env,'guided_debrief',debriefSchema,1600,'debrief');
  const ratio=progress.length/Math.max(1,valid.length); const successful=status==='attacker_success'||status==='defender_success';
  const score=Math.max(0,Math.min(100,successful?Math.round(78+22*ratio):Math.round(35+45*ratio)));
  return json({...parsed,score,progress,required_count:requiredCount(difficulty)},200,origin,env);
}
function friendlyError(err){const m=String(err?.message||'');if(m.includes('GROQ_API_KEY'))return m;if(m==='PROVIDER_429')return 'The AI service is busy or rate-limited. Wait a few seconds and try again.';if(m==='PROVIDER_401'||m==='PROVIDER_403')return 'The AI service could not authenticate. Check the Groq API key in Cloudflare.';if(/^PROVIDER_5\d\d$/.test(m))return 'The AI provider is temporarily unavailable. Please try again in a moment.';return 'The simulation service hit an error. Please try again.';}

export default {async fetch(request,env){
  const url=new URL(request.url); const origin=request.headers.get('Origin')||''; const allowed=env.ALLOWED_ORIGIN||'https://southernadd-cmyk.github.io';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(origin,env)});
  if(origin&&origin!==allowed&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))return json({error:'Origin not allowed.'},403,origin,env);
  try{
    if(request.method==='GET'&&url.pathname==='/health')return json({ok:true,model:env.GROQ_MODEL||'openai/gpt-oss-20b',groqConfigured:Boolean(env.GROQ_API_KEY),workerVersion:'v3-guided-gates'},200,origin,env);
    if(request.method==='POST'&&url.pathname==='/api/chat')return await handleChat(request,env,origin);
    if(request.method==='POST'&&url.pathname==='/api/debrief')return await handleDebrief(request,env,origin);
    return json({error:'Not found.'},404,origin,env);
  }catch(err){console.error(err);return json({error:friendlyError(err)},500,origin,env);}
}};
