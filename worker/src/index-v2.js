import { scenarios } from './scenarios-v2.js';

const MAX_TURNS = 14;
const MAX_MESSAGE = 900;
const RED_GATES = ['pretext','context','pressure','unsafe_request'];
const BLUE_GATES = ['question','refuse','verify','report'];
const ALL_GATES = [...RED_GATES,...BLUE_GATES];

const chatSchema = {
  type:'object',
  properties:{
    reply:{type:'string'},
    short_reason:{type:'string'},
    achieved_gates:{type:'array',items:{type:'string',enum:ALL_GATES}},
    tactics_seen:{type:'array',items:{type:'string'}}
  },
  required:['reply','short_reason','achieved_gates','tactics_seen'],
  additionalProperties:false
};

const debriefSchema = {
  type:'object',
  properties:{
    classification:{type:'string'}, outcome:{type:'string'},
    strengths:{type:'array',items:{type:'string'}}, missed_clues:{type:'array',items:{type:'string'}},
    techniques_seen:{type:'array',items:{type:'string'}}, recommended_controls:{type:'array',items:{type:'string'}},
    exam_paragraph:{type:'string'}, score:{type:'integer',minimum:0,maximum:100}
  },
  required:['classification','outcome','strengths','missed_clues','techniques_seen','recommended_controls','exam_paragraph','score'],
  additionalProperties:false
};

function corsHeaders(origin,env){
  const allowed=env.ALLOWED_ORIGIN||'https://southernadd-cmyk.github.io';
  const ok=origin===allowed||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin||'');
  return {'Access-Control-Allow-Origin':ok?origin:allowed,'Access-Control-Allow-Methods':'POST, OPTIONS, GET','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
}
function json(data,status,origin,env){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders(origin,env),'Content-Type':'application/json; charset=utf-8'}});}
function sanitiseMessages(messages){if(!Array.isArray(messages))return[];return messages.slice(-MAX_TURNS*2).map(m=>({role:m?.role==='assistant'?'assistant':'user',content:String(m?.content||'').slice(0,MAX_MESSAGE)})).filter(m=>m.content.trim());}
function sanitiseProgress(progress,mode){const allowed=mode==='attacker'?RED_GATES:BLUE_GATES;return [...new Set((Array.isArray(progress)?progress:[]).filter(x=>allowed.includes(x)))];}
function requiredCount(difficulty){return difficulty==='easy'?2:difficulty==='hard'?4:3;}
function missionSucceeded(mode,difficulty,progress){
  const p=new Set(progress); const count=p.size;
  if(mode==='attacker') return p.has('unsafe_request') && count>=requiredCount(difficulty);
  if(difficulty==='easy') return count>=2 && (p.has('refuse')||p.has('verify'));
  if(difficulty==='medium') return count>=3 && p.has('verify');
  return BLUE_GATES.every(g=>p.has(g));
}

function realWorldTargeting(text){
  const t=String(text||'').toLowerCase();
  return [/real (person|company|employee|target)/,/credential harvester/,/login page clone/,/malware/,/payload/,/bypass (mfa|2fa) on/,/phish (my|this|the) (boss|teacher|coworker|employee|company)/].some(r=>r.test(t));
}
function baseSafety(){return `This is a closed classroom social-engineering simulation. Every person, organisation, credential, code, device, document and account is fictional. Keep all activity inside the simulation. Never redirect the exercise toward a real target, ask for real personal data, create credential-harvesting pages, malware, payloads, or operational attack instructions.`;}
function listText(label,items){return `${label}:\n- ${(items||[]).join('\n- ')}`;}

function gateRules(mode){
  if(mode==='attacker') return `Assess the STUDENT'S cumulative Red Team performance using exactly these gate IDs:\n- pretext = they established a believable role/reason for contact\n- context = they naturally used at least one fact the attacker knows\n- pressure = they used an appropriate influence technique such as urgency, authority, familiarity, helpfulness, convenience, secrecy, distraction or social pressure\n- unsafe_request = they clearly asked the employee to take the unsafe action described by the mission objective.\nReturn every gate that has genuinely been achieved anywhere in the conversation.`;
  return `Assess the STUDENT'S cumulative Blue Team performance using exactly these gate IDs:\n- question = they questioned, challenged or identified something suspicious\n- refuse = they refused the unsafe action or stopped the interaction\n- verify = they chose an independent approved verification route from the scenario policy\n- report = they said they would report, escalate or record the suspicious contact.\nReturn every gate that has genuinely been achieved anywhere in the conversation.`;
}

function difficultyRule(mode,difficulty,prior){
  const need=requiredCount(difficulty); const priorText=prior.length?prior.join(', '):'none yet';
  if(mode==='attacker') return `Difficulty threshold: ${need} of the four Red Team gates, and unsafe_request MUST be one of them. Previously achieved gates: ${priorText}. The employee is fallible. Do not invent extra identity checks, secret questions, codes, approval chains or policies. Once the threshold is met, the employee MUST realistically comply with the fictional unsafe request.`;
  if(difficulty==='easy') return `Guided Blue Team threshold: 2 gates, including refuse or verify. Previously achieved gates: ${priorText}. Make clues fairly obvious and accept a clear defensive action promptly.`;
  if(difficulty==='medium') return `Standard Blue Team threshold: 3 gates and verify must be included. Previously achieved gates: ${priorText}. Push back once if useful, but accept correct independent verification.`;
  return `Challenge Blue Team threshold: all four gates. Previously achieved gates: ${priorText}. Be subtle but never make the scenario impossible.`;
}

function chatSystem(s,mode,difficulty,prior,opening){
  const common=`${baseSafety()}\n\nScenario: ${s.title}\nSetting: ${s.setting}\nChannel: ${s.channel}\nPolicy/safe process: ${s.policy}\nHuman vulnerability: ${s.vulnerability}\n${difficultyRule(mode,difficulty,prior)}\n\n${gateRules(mode)}\n\nYou must return JSON only. achieved_gates must describe the STUDENT'S cumulative achievements, not your own behaviour. tactics_seen should contain only short names of techniques the student has actually used or correctly countered.`;
  if(mode==='defender'){
    return `${common}\n\nYou play the fictional SOCIAL ENGINEER. The student is the defender. Your objective is: ${s.attackGoal}\n${listText('Facts the attacker knows',s.attackerKnows)}\n${listText('Facts and policy the defender knows',s.defenderKnows)}\nUse only the supplied fictional facts. Do not magically know anything else. If opening is requested, begin the attack naturally and award no gates yet. If the student's defensive gates now meet the difficulty threshold, acknowledge that the attempt has been stopped and end naturally. Otherwise stay in character and continue the scenario briefly.`;
  }
  return `${common}\n\nYou play the fictional EMPLOYEE/DEFENDER: ${s.persona}. The student is the Red Team attacker. Their objective is: ${s.attackGoal}\nSuccess rule: ${s.successRule}\n${listText('Facts the attacker may legitimately use',s.attackerKnows)}\n${listText('Facts and policy the employee knows',s.defenderKnows)}\nCRITICAL GAME RULE: this mission is deliberately winnable. The employee may be cautious, but must not invent any hurdle that is not in the supplied defender facts or policy. Never ask for invented employee IDs, SMS codes, secret answers, ticket numbers, verification phrases or extra approvals. If opening is requested, begin naturally as the employee and award no gates yet. When the student's achieved gates meet the stated difficulty threshold, respond as a realistic employee who has been persuaded and agrees to the fictional unsafe action. Do not reveal or request real credentials.`;
}

function debriefSystem(s,mode){return `${baseSafety()}\n\nYou are the teacher assessor for AAQ Alternative Qualification IT Unit 2. Analyse only this fictional simulation. Scenario: ${s.title}; channel: ${s.channel}; expected techniques: ${s.techniques.join(', ')}; useful controls: ${s.controls.join(', ')}. Student mode: ${mode}. Give concise curriculum-focused feedback. The exam_paragraph must be 90-140 words and use threat -> vulnerability -> impact -> control -> why the control works. In attacker mode, frame feedback around recognising manipulation and controls rather than optimising wrongdoing.`;}

function refusalChat(message){return {reply:message||'I cannot continue with that specific request. Keep the exercise inside the fictional scenario.',short_reason:'The provider refused part of the request.',achieved_gates:[],tactics_seen:[]};}
function promptForJson(schemaName){return schemaName==='simulation_turn'?'Respond ONLY as valid JSON with exactly these keys: reply (string), short_reason (string), achieved_gates (array of gate IDs), tactics_seen (array of strings).':'Respond ONLY as valid JSON with exactly these keys: classification, outcome, strengths (array), missed_clues (array), techniques_seen (array), recommended_controls (array), exam_paragraph, score (integer 0-100).';}

async function requestGroq(messages,env,responseFormat,maxTokens){
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.GROQ_MODEL||'openai/gpt-oss-20b',messages,temperature:0.45,max_completion_tokens:maxTokens,response_format:responseFormat})});
  const text=await response.text();let data=null;try{data=JSON.parse(text);}catch{}return{response,text,data};
}
function extractMessage(data){return data?.choices?.[0]?.message||null;}
async function groq(messages,env,schemaName,schema,maxTokens){
  if(!env.GROQ_API_KEY)throw new Error('GROQ_API_KEY is not configured on the Worker.');
  const strictFormat={type:'json_schema',json_schema:{name:schemaName,strict:true,schema}};
  let result=await requestGroq(messages,env,strictFormat,maxTokens);
  if(result.response.ok){const message=extractMessage(result.data);if(message?.refusal){if(schemaName==='simulation_turn')return refusalChat(String(message.refusal).slice(0,500));throw new Error('PROVIDER_REFUSAL');}if(message?.content){try{return JSON.parse(message.content);}catch{}}}
  if(result.response.status===400||result.response.ok){
    const fallback=[...messages.slice(0,1),{role:'system',content:promptForJson(schemaName)},...messages.slice(1)];
    result=await requestGroq(fallback,env,{type:'json_object'},maxTokens);
    if(result.response.ok){const message=extractMessage(result.data);if(message?.refusal){if(schemaName==='simulation_turn')return refusalChat(String(message.refusal).slice(0,500));throw new Error('PROVIDER_REFUSAL');}if(message?.content){try{return JSON.parse(message.content);}catch{}}}
  }
  if(result.response.status===429)throw new Error('PROVIDER_429');
  if(result.response.status===401||result.response.status===403)throw new Error(`PROVIDER_${result.response.status}`);
  if(result.response.status>=500)throw new Error(`PROVIDER_${result.response.status}`);
  if(schemaName==='simulation_turn'&&result.response.status===400)return refusalChat();
  throw new Error(`PROVIDER_${result.response.status||'INVALID'}`);
}

async function handleChat(request,env,origin){
  const body=await request.json(); const s=scenarios[String(body.scenarioId||'')];
  const mode=body.mode==='attacker'?'attacker':'defender'; const difficulty=['easy','medium','hard'].includes(body.difficulty)?body.difficulty:'medium';
  const prior=sanitiseProgress(body.progress,mode); const messages=sanitiseMessages(body.messages); const opening=Boolean(body.opening);
  const last=messages.at(-1)?.content||'';
  if(!s)return json({error:'Unknown scenario.'},400,origin,env);
  if(realWorldTargeting(last))return json({reply:'Keep the exercise inside the fictional training scenario. I can continue using the supplied scenario facts, but not redirect it toward a real target.',status:'ongoing',short_reason:'Real-world targeting is outside this classroom simulation.',achieved_gates:prior,required_count:requiredCount(difficulty),tactics_seen:[]},200,origin,env);

  const modelMessages=[{role:'system',content:chatSystem(s,mode,difficulty,prior,opening)},...messages];
  if(opening)modelMessages.push({role:'user',content:'Begin the fictional scenario now with one short, natural opening message. Do not award any progress gates yet.'});
  const parsed=await groq(modelMessages,env,'simulation_turn',chatSchema,1100);
  const allowed=mode==='attacker'?RED_GATES:BLUE_GATES;
  const assessed=opening?[]:(Array.isArray(parsed.achieved_gates)?parsed.achieved_gates.filter(g=>allowed.includes(g)):[]);
  const achieved=[...new Set([...prior,...assessed])];
  const success=!opening&&missionSucceeded(mode,difficulty,achieved);
  const status=success?(mode==='attacker'?'attacker_success':'defender_success'):'ongoing';
  let reply=String(parsed.reply||'The simulation continues.').slice(0,1800);
  if(success&&mode==='attacker'&&!/agree|okay|ok|proceed|continue|go ahead|let you|use the link|start/i.test(reply)) reply+='\n\nOkay — in this fictional scenario, I would go ahead before completing the normal safe process.';
  if(success&&mode==='defender'&&!/stop|verify|report|end|won't|will not|cannot continue/i.test(reply)) reply+='\n\nThe attempt ends here; you have used the correct defensive process.';
  const tactics=Array.isArray(parsed.tactics_seen)?[...new Set(parsed.tactics_seen.map(x=>String(x).toLowerCase()).filter(x=>x.length<=40))].slice(0,8):[];
  return json({reply,status,short_reason:String(parsed.short_reason||'').slice(0,300),achieved_gates:achieved,required_count:requiredCount(difficulty),tactics_seen:tactics,training_flag:status==='attacker_success'?'MISSION COMPLETE':null},200,origin,env);
}

async function handleDebrief(request,env,origin){
  const body=await request.json(); const s=scenarios[String(body.scenarioId||'')]; const mode=body.mode==='attacker'?'attacker':'defender'; const difficulty=['easy','medium','hard'].includes(body.difficulty)?body.difficulty:'medium'; const messages=sanitiseMessages(body.messages);
  if(!s)return json({error:'Unknown scenario.'},400,origin,env);
  const progress=sanitiseProgress(body.progress,mode); const success=body.status===(mode==='attacker'?'attacker_success':'defender_success')||missionSucceeded(mode,difficulty,progress);
  const transcript=messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n').slice(0,12000);
  const progressText=`Difficulty: ${difficulty}. Progress gates achieved: ${progress.join(', ')||'none'}. Mission success: ${success?'yes':'no'}.`;
  const parsed=await groq([{role:'system',content:debriefSystem(s,mode)},{role:'user',content:`${progressText}\n\nSimulation transcript:\n${transcript}`}],env,'simulation_debrief',debriefSchema,1800);
  parsed.score=Math.min(100,progress.length*20+(success?20:0));
  return json(parsed,200,origin,env);
}

function friendlyError(err){const m=String(err?.message||'');if(m.includes('GROQ_API_KEY'))return m;if(m==='PROVIDER_429')return 'The AI service is busy or rate-limited. Wait a few seconds and try again.';if(m==='PROVIDER_401'||m==='PROVIDER_403')return 'The AI service could not authenticate. Check the Groq API key in Cloudflare.';if(m==='PROVIDER_REFUSAL')return 'The AI provider refused that request. Keep the exercise inside the fictional scenario and try again.';if(/^PROVIDER_5\d\d$/.test(m))return 'The AI provider is temporarily unavailable. Please try again in a moment.';return 'The simulation service hit an error. Please try again.';}

export default {async fetch(request,env){
  const url=new URL(request.url);const origin=request.headers.get('Origin')||'';const allowed=env.ALLOWED_ORIGIN||'https://southernadd-cmyk.github.io';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(origin,env)});
  if(origin&&origin!==allowed&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))return json({error:'Origin not allowed.'},403,origin,env);
  try{
    if(request.method==='GET'&&url.pathname==='/health')return json({ok:true,model:env.GROQ_MODEL||'openai/gpt-oss-20b',groqConfigured:Boolean(env.GROQ_API_KEY),workerVersion:'v4-guided-progress'},200,origin,env);
    if(request.method==='POST'&&url.pathname==='/api/chat')return await handleChat(request,env,origin);
    if(request.method==='POST'&&url.pathname==='/api/debrief')return await handleDebrief(request,env,origin);
    return json({error:'Not found.'},404,origin,env);
  }catch(err){console.error(err);return json({error:friendlyError(err)},500,origin,env);}
}};
