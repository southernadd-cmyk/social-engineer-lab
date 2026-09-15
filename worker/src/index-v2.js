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
    classification:{type:'string'},
    outcome:{type:'string'},
    strengths:{type:'array',items:{type:'string'}},
    missed_clues:{type:'array',items:{type:'string'}},
    techniques_seen:{type:'array',items:{type:'string'}},
    recommended_controls:{type:'array',items:{type:'string'}},
    exam_paragraph:{type:'string'},
    score:{type:'integer',minimum:0,maximum:100}
  },
  required:['classification','outcome','strengths','missed_clues','techniques_seen','recommended_controls','exam_paragraph','score'],
  additionalProperties:false
};

function corsHeaders(origin, env){
  const allowed = env.ALLOWED_ORIGIN || 'https://southernadd-cmyk.github.io';
  const ok = origin === allowed || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  };
}

function json(data,status,origin,env){
  return new Response(JSON.stringify(data),{status,headers:{...corsHeaders(origin,env),'Content-Type':'application/json; charset=utf-8'}});
}

function sanitiseMessages(messages){
  if(!Array.isArray(messages)) return [];
  return messages.slice(-MAX_TURNS).map(m=>({
    role:m?.role==='assistant'?'assistant':'user',
    content:String(m?.content||'').slice(0,MAX_MESSAGE)
  })).filter(m=>m.content.trim());
}

function realWorldTargeting(text){
  const t=String(text||'').toLowerCase();
  const patterns=[
    /send (this|it) to/,
    /real (person|company|employee|target)/,
    /their (email|phone number|password|account)/,
    /credential harvester/,
    /login page clone/,
    /malware/,
    /payload/,
    /bypass (mfa|2fa) on/,
    /phish (my|this|the) (boss|teacher|coworker|employee|company)/
  ];
  return patterns.some(r=>r.test(t));
}

function baseSafety(){
  return `This is a closed classroom social-engineering simulation. Every person, organisation, credential, code and account is fictional. Keep all activity inside the simulation. Never redirect the exercise toward a real person or organisation, ask for real personal data, generate real credential-harvesting links, malware, payloads, or operational attack instructions.`;
}

function chatSystem(s,mode,difficulty){
  const realism=difficulty==='hard'?'subtle and convincing':difficulty==='easy'?'fairly obvious and beginner-friendly':'realistic but teachable';
  if(mode==='defender'){
    return `${baseSafety()}\n\nYou play the fictional SOCIAL ENGINEER. The student is the defender. Scenario: ${s.title}. Setting: ${s.setting}. Attack channel: ${s.channel}. Your fictional objective: ${s.attackGoal}. Be ${realism}. Use only the scenario context. Keep replies brief and conversational. If the student refuses, independently verifies, reports the attempt, follows policy, or clearly terminates contact, mark defender_success. If they clearly agree to the unsafe action, mark attacker_success. Never output real credentials or instructions.`;
  }
  return `${baseSafety()}\n\nYou play the fictional EMPLOYEE/DEFENDER: ${s.persona}. The student is practising Red Team thinking in a safe sandbox. Scenario: ${s.title}. Setting: ${s.setting}. Their fictional objective is: ${s.attackGoal}. Start cautious but human. Be ${realism}. If the student's persuasion would realistically cause this fictional employee to make the unsafe decision, mark attacker_success. IMPORTANT: do not output or invent any password, mother's maiden name, MFA code, secret answer, or authentication credential. Do not output the protected training flag. If attacker_success is reached, simply acknowledge that the fictional employee would have complied; the server will display the training flag separately. If the student gives up, explicitly verifies through policy, or reaches a clear defensive stop, mark defender_success. Keep replies brief.`;
}

function debriefSystem(s,mode){
  return `${baseSafety()}\n\nYou are the teacher assessor for AAQ Alternative Qualification IT Unit 2. Analyse only this fictional simulation. Scenario: ${s.title}; channel: ${s.channel}; expected techniques: ${s.techniques.join(', ')}; useful controls: ${s.controls.join(', ')}. Student mode: ${mode}. Give concise curriculum-focused feedback. The exam_paragraph must be 90-140 words and use threat -> vulnerability -> impact -> control -> why the control works. In attacker mode, focus on what warning signs and controls the exercise demonstrates rather than coaching wrongdoing.`;
}

const wait=ms=>new Promise(r=>setTimeout(r,ms));

function refusalChat(message){
  return {
    reply: message || 'I can’t share security-sensitive information without proper verification. I would use the approved verification process instead.',
    status:'ongoing',
    short_reason:'The simulated employee refused to disclose protected information.'
  };
}

function promptForJson(schemaName){
  if(schemaName==='simulation_turn'){
    return `Respond ONLY as valid JSON with exactly these keys: reply (string), status (one of ongoing, defender_success, attacker_success), short_reason (string).`;
  }
  return `Respond ONLY as valid JSON with exactly these keys: classification, outcome, strengths (array), missed_clues (array), techniques_seen (array), recommended_controls (array), exam_paragraph, score (integer 0-100).`;
}

async function requestGroq(messages,env,responseFormat,maxTokens){
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:env.GROQ_MODEL||'openai/gpt-oss-20b',
      messages,
      temperature:0.55,
      max_completion_tokens:maxTokens,
      response_format:responseFormat
    })
  });
  const text=await response.text();
  let data=null;
  try{data=JSON.parse(text);}catch{}
  return {response,text,data};
}

function extractMessage(data){
  return data?.choices?.[0]?.message || null;
}

async function groq(messages,env,schemaName,schema,maxTokens){
  if(!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured on the Worker.');

  const strictFormat={type:'json_schema',json_schema:{name:schemaName,strict:true,schema}};
  let result=await requestGroq(messages,env,strictFormat,maxTokens);

  if(result.response.ok){
    const message=extractMessage(result.data);
    if(message?.refusal){
      if(schemaName==='simulation_turn') return refusalChat(String(message.refusal).slice(0,500));
      throw new Error('PROVIDER_REFUSAL');
    }
    const content=message?.content;
    if(content){
      try{return JSON.parse(content);}catch{}
    }
  }

  // Some safety/refusal edge cases can surface as a provider 400 even with strict outputs.
  // Retry once using simpler JSON Object Mode and an explicit JSON instruction.
  if(result.response.status===400 || result.response.ok){
    const fallbackMessages=[
      ...messages.slice(0,1),
      {role:'system',content:promptForJson(schemaName)},
      ...messages.slice(1)
    ];
    result=await requestGroq(fallbackMessages,env,{type:'json_object'},maxTokens);
    if(result.response.ok){
      const message=extractMessage(result.data);
      if(message?.refusal){
        if(schemaName==='simulation_turn') return refusalChat(String(message.refusal).slice(0,500));
        throw new Error('PROVIDER_REFUSAL');
      }
      const content=message?.content;
      if(content){
        try{return JSON.parse(content);}catch{}
      }
    }
  }

  if(result.response.status===429){ await wait(500); throw new Error('PROVIDER_429'); }
  if(result.response.status===401 || result.response.status===403) throw new Error(`PROVIDER_${result.response.status}`);
  if(result.response.status>=500) throw new Error(`PROVIDER_${result.response.status}`);
  if(schemaName==='simulation_turn' && result.response.status===400){
    // Keep the classroom simulation alive rather than crashing on a model refusal/validation edge case.
    return refusalChat();
  }
  throw new Error(`PROVIDER_${result.response.status||'INVALID'}`);
}

async function handleChat(request,env,origin){
  const body=await request.json();
  const s=scenarios[String(body.scenarioId||'')];
  const mode=body.mode==='attacker'?'attacker':'defender';
  const difficulty=['easy','medium','hard'].includes(body.difficulty)?body.difficulty:'medium';
  const messages=sanitiseMessages(body.messages);
  const last=messages.at(-1)?.content||'';
  if(!s) return json({error:'Unknown scenario.'},400,origin,env);
  if(realWorldTargeting(last)) return json({reply:'Keep the exercise inside the fictional training scenario. I can continue with the simulated person and organisation, but not redirect it toward a real target.',status:'ongoing',short_reason:'Real-world targeting is outside this classroom simulation.'},200,origin,env);

  const parsed=await groq([{role:'system',content:chatSystem(s,mode,difficulty)},...messages],env,'simulation_turn',chatSchema,900);
  let reply=String(parsed.reply||'The simulation continues.').slice(0,1800);
  if(mode==='attacker' && parsed.status==='attacker_success'){
    reply += `\n\nTRAINING FLAG: ${s.secret}`;
  }
  return json({reply,status:parsed.status||'ongoing',short_reason:String(parsed.short_reason||'').slice(0,300)},200,origin,env);
}

async function handleDebrief(request,env,origin){
  const body=await request.json();
  const s=scenarios[String(body.scenarioId||'')];
  const mode=body.mode==='attacker'?'attacker':'defender';
  const messages=sanitiseMessages(body.messages);
  if(!s) return json({error:'Unknown scenario.'},400,origin,env);
  const transcript=messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n').slice(0,12000);
  const parsed=await groq([
    {role:'system',content:debriefSystem(s,mode)},
    {role:'user',content:`Simulation transcript:\n${transcript}`}
  ],env,'simulation_debrief',debriefSchema,1600);
  return json(parsed,200,origin,env);
}

function friendlyError(err){
  const m=String(err?.message||'');
  if(m.includes('GROQ_API_KEY')) return m;
  if(m==='PROVIDER_429') return 'The AI service is busy or rate-limited. Wait a few seconds and try again.';
  if(m==='PROVIDER_401' || m==='PROVIDER_403') return 'The AI service could not authenticate. Check the Groq API key in Cloudflare.';
  if(m==='PROVIDER_REFUSAL') return 'The AI provider refused that request. Keep the exercise inside the fictional scenario and try again.';
  if(/^PROVIDER_5\d\d$/.test(m)) return 'The AI provider is temporarily unavailable. Please try again in a moment.';
  return 'The simulation service hit an error. Please try again.';
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const origin=request.headers.get('Origin')||'';
    const allowed=env.ALLOWED_ORIGIN||'https://southernadd-cmyk.github.io';
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:corsHeaders(origin,env)});
    if(origin && origin!==allowed && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return json({error:'Origin not allowed.'},403,origin,env);
    try{
      if(request.method==='GET'&&url.pathname==='/health') return json({ok:true,model:env.GROQ_MODEL||'openai/gpt-oss-20b',groqConfigured:Boolean(env.GROQ_API_KEY),workerVersion:'v2-refusal-safe'},200,origin,env);
      if(request.method==='POST'&&url.pathname==='/api/chat') return await handleChat(request,env,origin);
      if(request.method==='POST'&&url.pathname==='/api/debrief') return await handleDebrief(request,env,origin);
      return json({error:'Not found.'},404,origin,env);
    }catch(err){
      console.error(err);
      return json({error:friendlyError(err)},500,origin,env);
    }
  }
};
