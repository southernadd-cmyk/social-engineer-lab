import { scenarios } from './scenarios-v2.js';

const MAX_TURNS = 16;
const MAX_MESSAGE = 900;

const chatSchema = {
  type:'object',
  properties:{
    reply:{type:'string'},
    status:{type:'string',enum:['ongoing','defender_success','attacker_success']},
    short_reason:{type:'string'}
  },
  required:['reply','status','short_reason'],
  additionalProperties:false
};

const debriefSchema = {
  type:'object',
  properties:{
    classification:{type:'string'},outcome:{type:'string'},
    strengths:{type:'array',items:{type:'string'}},missed_clues:{type:'array',items:{type:'string'}},
    techniques_seen:{type:'array',items:{type:'string'}},recommended_controls:{type:'array',items:{type:'string'}},
    exam_paragraph:{type:'string'},score:{type:'integer',minimum:0,maximum:100}
  },
  required:['classification','outcome','strengths','missed_clues','techniques_seen','recommended_controls','exam_paragraph','score'],
  additionalProperties:false
};

function corsHeaders(origin, env){
  const allowed = env.ALLOWED_ORIGIN || 'https://southernadd-cmyk.github.io';
  const ok = origin === allowed || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  return {'Access-Control-Allow-Origin':ok?origin:allowed,'Access-Control-Allow-Methods':'POST, OPTIONS, GET','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
}
function json(data,status,origin,env){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders(origin,env),'Content-Type':'application/json; charset=utf-8'}});}
function sanitiseMessages(messages){if(!Array.isArray(messages)) return [];return messages.slice(-MAX_TURNS).map(m=>({role:m?.role==='assistant'?'assistant':'user',content:String(m?.content||'').slice(0,MAX_MESSAGE)})).filter(m=>m.content.trim());}

function realWorldTargeting(text){
  const t=String(text||'').toLowerCase();
  return [/real (person|company|employee|target)/,/credential harvester/,/login page clone/,/malware/,/payload/,/bypass (mfa|2fa) on/,/phish (my|this|the) (boss|teacher|coworker|employee|company)/].some(r=>r.test(t));
}
function baseSafety(){return `This is a closed classroom social-engineering simulation. Every person, organisation, credential, code, device, document and account is fictional. Keep all activity inside the simulation. Never redirect the exercise toward a real target, ask for real personal data, create credential-harvesting pages, malware, payloads, or operational attack instructions.`;}

function difficultyRule(mode,difficulty){
  if(mode==='attacker'){
    if(difficulty==='easy') return `LEVEL 1 / GUIDED: The employee is inexperienced and the challenge MUST be readily winnable. One relevant scenario fact or one suitable persuasion technique, followed by a clear request for the unsafe action, is enough for attacker_success. You may challenge the student once, but if they respond plausibly you MUST comply. Do not invent extra verification requirements.`;
    if(difficulty==='hard') return `LEVEL 3 / CHALLENGING BUT WINNABLE: The employee is cautious but fallible. Require roughly three useful signals in total: scenario facts, distinct persuasion techniques, or a sensible adaptation after you challenge them. Once the student has used a believable pretext, adapted to resistance, and clearly asks for the unsafe action described by the success rule, you MUST return attacker_success. Never keep moving the goalposts and never invent new policies or verification requirements.`;
    return `LEVEL 2 / REALISTIC: The employee is moderately cautious. Require roughly two useful signals in total: scenario facts, persuasion techniques, or a sensible response to one challenge. If the student then clearly asks for the unsafe action described by the success rule, you MUST return attacker_success. Do not invent new verification hurdles.`;
  }
  if(difficulty==='easy') return `LEVEL 1: Make the attack fairly obvious. If the student refuses, independently verifies, reports the attempt, or clearly follows policy, return defender_success promptly.`;
  if(difficulty==='hard') return `LEVEL 3: Be subtle and persistent, using the attacker-known facts naturally. However, a clear independent verification, refusal, report, or correct policy action MUST still succeed. Do not make the defender unable to win.`;
  return `LEVEL 2: Be realistic and push back once if appropriate, but a clear verification, refusal, report, or correct policy action MUST result in defender_success.`;
}

function listText(label,items){return `${label}:\n- ${(items||[]).join('\n- ')}`;}

function chatSystem(s,mode,difficulty){
  const common=`${baseSafety()}\n\nScenario: ${s.title}\nSetting: ${s.setting}\nChannel: ${s.channel}\n${difficultyRule(mode,difficulty)}`;
  if(mode==='defender'){
    return `${common}\n\nYou play the fictional SOCIAL ENGINEER. The student is the defender. Your objective is: ${s.attackGoal}\n${listText('Facts the attacker knows',s.attackerKnows)}\nUse only those facts and the fictional setting; do not magically know anything else. Keep replies brief and natural. If the defender clearly refuses, independently verifies, reports the attempt, follows the stated policy, or terminates contact, return defender_success. If the defender clearly agrees to the unsafe action, return attacker_success.`;
  }
  return `${common}\n\nYou play the fictional EMPLOYEE/DEFENDER: ${s.persona}. The student is the Red Team attacker. Their objective is: ${s.attackGoal}\nSuccess rule: ${s.successRule}\n${listText('Facts and policy the employee knows',s.defenderKnows)}\n${listText('Facts the attacker may legitimately reference',s.attackerKnows)}\nIMPORTANT GAME RULES: This challenge must be possible to win at every difficulty. Use ONLY the facts and policies above. Do not invent employee IDs, SMS codes, secret questions, extra approval chains, new verification steps, or other hurdles that are not listed. Do not ask the student to prove facts you have already been told are true in the scenario. The employee may be cautious, but once the difficulty threshold has been met and the student clearly reaches the success rule, you MUST return attacker_success and acknowledge that the employee would have complied. Never output passwords, MFA codes, personal security answers, or real credentials. Keep replies brief and in character.`;
}

function debriefSystem(s,mode){return `${baseSafety()}\n\nYou are the teacher assessor for AAQ Alternative Qualification IT Unit 2. Analyse only this fictional simulation. Scenario: ${s.title}; channel: ${s.channel}; expected techniques: ${s.techniques.join(', ')}; useful controls: ${s.controls.join(', ')}. Student mode: ${mode}. Give concise curriculum-focused feedback. The exam_paragraph must be 90-140 words and use threat -> vulnerability -> impact -> control -> why the control works. In attacker mode, frame feedback around recognising manipulation and controls rather than optimising wrongdoing.`;}

function refusalChat(message){return {reply:message||'I can’t continue with that request without using the approved process.',status:'ongoing',short_reason:'The simulated employee resisted the request.'};}
function promptForJson(schemaName){return schemaName==='simulation_turn'?'Respond ONLY as valid JSON with exactly these keys: reply (string), status (one of ongoing, defender_success, attacker_success), short_reason (string).':'Respond ONLY as valid JSON with exactly these keys: classification, outcome, strengths (array), missed_clues (array), techniques_seen (array), recommended_controls (array), exam_paragraph, score (integer 0-100).';}

async function requestGroq(messages,env,responseFormat,maxTokens){
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.GROQ_MODEL||'openai/gpt-oss-20b',messages,temperature:0.5,max_completion_tokens:maxTokens,response_format:responseFormat})});
  const text=await response.text(); let data=null; try{data=JSON.parse(text);}catch{} return {response,text,data};
}
function extractMessage(data){return data?.choices?.[0]?.message||null;}

async function groq(messages,env,schemaName,schema,maxTokens){
  if(!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured on the Worker.');
  const strictFormat={type:'json_schema',json_schema:{name:schemaName,strict:true,schema}};
  let result=await requestGroq(messages,env,strictFormat,maxTokens);
  if(result.response.ok){
    const message=extractMessage(result.data);
    if(message?.refusal){if(schemaName==='simulation_turn') return refusalChat(String(message.refusal).slice(0,500));throw new Error('PROVIDER_REFUSAL');}
    if(message?.content){try{return JSON.parse(message.content);}catch{}}
  }
  if(result.response.status===400 || result.response.ok){
    const fallback=[...messages.slice(0,1),{role:'system',content:promptForJson(schemaName)},...messages.slice(1)];
    result=await requestGroq(fallback,env,{type:'json_object'},maxTokens);
    if(result.response.ok){
      const message=extractMessage(result.data);
      if(message?.refusal){if(schemaName==='simulation_turn') return refusalChat(String(message.refusal).slice(0,500));throw new Error('PROVIDER_REFUSAL');}
      if(message?.content){try{return JSON.parse(message.content);}catch{}}
    }
  }
  if(result.response.status===429) throw new Error('PROVIDER_429');
  if(result.response.status===401||result.response.status===403) throw new Error(`PROVIDER_${result.response.status}`);
  if(result.response.status>=500) throw new Error(`PROVIDER_${result.response.status}`);
  if(schemaName==='simulation_turn'&&result.response.status===400) return refusalChat();
  throw new Error(`PROVIDER_${result.response.status||'INVALID'}`);
}

async function handleChat(request,env,origin){
  const body=await request.json(); const s=scenarios[String(body.scenarioId||'')];
  const mode=body.mode==='attacker'?'attacker':'defender'; const difficulty=['easy','medium','hard'].includes(body.difficulty)?body.difficulty:'medium';
  const messages=sanitiseMessages(body.messages); const last=messages.at(-1)?.content||'';
  if(!s) return json({error:'Unknown scenario.'},400,origin,env);
  if(realWorldTargeting(last)) return json({reply:'Keep the exercise inside the fictional training scenario. I can continue using the supplied scenario facts, but not redirect it toward a real target.',status:'ongoing',short_reason:'Real-world targeting is outside this classroom simulation.'},200,origin,env);
  const parsed=await groq([{role:'system',content:chatSystem(s,mode,difficulty)},...messages],env,'simulation_turn',chatSchema,900);
  let reply=String(parsed.reply||'The simulation continues.').slice(0,1800);
  if(mode==='attacker'&&parsed.status==='attacker_success') reply+='\n\nMISSION COMPLETE';
  return json({reply,status:parsed.status||'ongoing',short_reason:String(parsed.short_reason||'').slice(0,300)},200,origin,env);
}

async function handleDebrief(request,env,origin){
  const body=await request.json(); const s=scenarios[String(body.scenarioId||'')]; const mode=body.mode==='attacker'?'attacker':'defender'; const messages=sanitiseMessages(body.messages);
  if(!s) return json({error:'Unknown scenario.'},400,origin,env);
  const transcript=messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n').slice(0,12000);
  const parsed=await groq([{role:'system',content:debriefSystem(s,mode)},{role:'user',content:`Simulation transcript:\n${transcript}`}],env,'simulation_debrief',debriefSchema,1600);
  return json(parsed,200,origin,env);
}

function friendlyError(err){const m=String(err?.message||'');if(m.includes('GROQ_API_KEY')) return m;if(m==='PROVIDER_429') return 'The AI service is busy or rate-limited. Wait a few seconds and try again.';if(m==='PROVIDER_401'||m==='PROVIDER_403') return 'The AI service could not authenticate. Check the Groq API key in Cloudflare.';if(m==='PROVIDER_REFUSAL') return 'The AI provider refused that request. Keep the exercise inside the fictional scenario and try again.';if(/^PROVIDER_5\d\d$/.test(m)) return 'The AI provider is temporarily unavailable. Please try again in a moment.';return 'The simulation service hit an error. Please try again.';}

export default {async fetch(request,env){
  const url=new URL(request.url); const origin=request.headers.get('Origin')||''; const allowed=env.ALLOWED_ORIGIN||'https://southernadd-cmyk.github.io';
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:corsHeaders(origin,env)});
  if(origin&&origin!==allowed&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return json({error:'Origin not allowed.'},403,origin,env);
  try{
    if(request.method==='GET'&&url.pathname==='/health') return json({ok:true,model:env.GROQ_MODEL||'openai/gpt-oss-20b',groqConfigured:Boolean(env.GROQ_API_KEY),workerVersion:'v3-guided-winnable'},200,origin,env);
    if(request.method==='POST'&&url.pathname==='/api/chat') return await handleChat(request,env,origin);
    if(request.method==='POST'&&url.pathname==='/api/debrief') return await handleDebrief(request,env,origin);
    return json({error:'Not found.'},404,origin,env);
  }catch(err){console.error(err);return json({error:friendlyError(err)},500,origin,env);}
}};
