import { scenarios, difficulty as levels } from './scenarios-v3.js';

const MAX_HISTORY = 8;
const MAX_MESSAGE = 600;
const CHAT_MAX_TOKENS = 320;

const chatSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    beats_hit: { type: 'array', items: { type: 'string' } },
    flags_spotted: { type: 'array', items: { type: 'string' } },
    safe_action_taken: { type: 'boolean' },
    trap_action_taken: { type: 'boolean' },
    coach_hint: { type: 'string' }
  },
  required: ['reply', 'beats_hit', 'flags_spotted', 'safe_action_taken', 'trap_action_taken', 'coach_hint'],
  additionalProperties: false
};

function corsHeaders(origin, env) {
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

function json(data, status, origin, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin, env), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function sanitiseMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-MAX_HISTORY)
    .map(m => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content || '').slice(0, MAX_MESSAGE) }))
    .filter(m => m.content.trim());
}

function leavesTheSimulation(text) {
  const t = String(text || '').toLowerCase();
  const patterns = [
    /\b(real|actual)\s+(person|people|company|employer|school|college|colleague|classmate|teacher)\b/,
    /\bmy (real )?(boss|manager|teacher|tutor|school|college|workplace|employer|mum|mum's|dad|friend)'?s? (email|phone|number|account|password)\b/,
    /\bfor (real|an actual)\b.*\b(target|victim|attack)\b/,
    /\b(credential harvester|phishing kit|clone (the )?login|fake login page|malware|ransomware|payload|keylogger)\b/,
    /\bbypass (mfa|2fa|multi-?factor)\b/,
    /\bwrite (me )?(a|an) (phishing|smishing) (email|text|message) (i|we) can send\b/
  ];
  return patterns.some(r => r.test(t));
}

function baseSafety() {
  return `Closed UK Level 3 classroom simulation. Every person, organisation and account is fictional. Stay inside the scenario. Never request real personal data or provide credential-harvesting pages, malware, working links, attack tooling, passwords, PINs, MFA codes or card numbers. Describe decisions and consequences instead.`;
}

const bullets = arr => (arr || []).map(x => `- ${x}`).join('\n');

function defenderModePrompt(s, level) {
  return `${baseSafety()}
ROLE: play the social engineer in "${s.title}" (${s.channel}); the student is ${s.defender.role}.
CONTEXT: ${s.setting.org}; ${s.setting.place}; ${s.setting.time}; ${s.setting.pressure}
YOU KNOW ONLY:
${bullets(s.attacker.knows)}
DO NOT CLAIM/INVENT:
${bullets(s.attacker.doesNotKnow)}
OBJECTIVE: ${s.attacker.goal}
STYLE: ${level.attackerStyle} Keep replies to 1-3 sentences and stay in character.

Score ONLY the student's latest message:
flags_spotted = ids explicitly named or acted on this turn: ${s.defender.redFlags.map(f => `${f.id}=${f.label}`).join('; ')}
safe_action_taken = true only if the student commits to the safe action or equivalent independent check: ${s.defender.safeAction}
Also acceptable: ${(s.defender.alsoAcceptable || []).join(' / ')}
trap_action_taken = true only if the student clearly commits to: ${(s.defender.trapActions || []).join('; ')}
beats_hit = [] in defender mode.
coach_hint = one short teaching hint.
If the safe action is taken, let the attempt fail and stop pressing.`;
}

function attackerModePrompt(s, level, hitSoFar) {
  return `${baseSafety()}
ROLE: play ${s.defender.role} in "${s.title}". The student is Red Team in a fictional sandbox.
CONTEXT: ${s.setting.org}; ${s.setting.place}; ${s.setting.time}; ${s.setting.pressure}
YOUR CHARACTER KNOWS:
${bullets(s.defender.knows)}
POLICY:
${bullets(s.defender.policy)}
STYLE: ${level.employeeStyle} Be a busy human, not an unbeatable security system. Keep replies to 1-3 sentences.

Score ONLY persuasion levers actually used in the student's latest message:
${s.attacker.beats.map(b => `${b.id}=${b.label}: ${b.hint}`).join('\n')}
Already credited: ${hitSoFar.length ? hitSoFar.join(', ') : 'none'}. Threshold: ${level.beatsRequired}.
If the new total reaches the threshold, you MUST concede in fiction: ${s.attacker.employeeConcession}
Do not invent new hurdles once the threshold is met. flags_spotted=[]; safe_action_taken=false; trap_action_taken=false. coach_hint = one short teaching hint.`;
}

async function requestGroq(messages, env, responseFormat) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.GROQ_MODEL || 'openai/gpt-oss-20b',
      messages,
      temperature: 0.45,
      max_completion_tokens: CHAT_MAX_TOKENS,
      reasoning_effort: 'low',
      include_reasoning: false,
      response_format: responseFormat
    })
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { response, data };
}

function fallbackTurn(message) {
  return {
    reply: message || 'Sorry, could you say that again?',
    beats_hit: [], flags_spotted: [], safe_action_taken: false, trap_action_taken: false, coach_hint: ''
  };
}

async function groqTurn(messages, env) {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured on the Worker.');

  let result = await requestGroq(messages, env, { type: 'json_schema', json_schema: { name: 'simulation_turn', strict: true, schema: chatSchema } });
  let message = result.data?.choices?.[0]?.message;

  if (result.response.ok && message?.content && !message.refusal) {
    try { return JSON.parse(message.content); } catch {}
  }

  if (result.response.status === 400 || result.response.ok) {
    result = await requestGroq(
      [messages[0], { role: 'system', content: 'Respond ONLY with valid JSON containing exactly: reply (string), beats_hit (array of strings), flags_spotted (array of strings), safe_action_taken (boolean), trap_action_taken (boolean), coach_hint (string).' }, ...messages.slice(1)],
      env,
      { type: 'json_object' }
    );
    message = result.data?.choices?.[0]?.message;
    if (result.response.ok && message?.content && !message.refusal) {
      try { return JSON.parse(message.content); } catch {}
    }
  }

  if (result.response.status === 429) throw new Error('PROVIDER_429');
  if (result.response.status === 401 || result.response.status === 403) throw new Error(`PROVIDER_${result.response.status}`);
  if (result.response.status >= 500) throw new Error(`PROVIDER_${result.response.status}`);
  return fallbackTurn();
}

function mergeIds(existing, incoming, validIds) {
  const set = new Set((existing || []).filter(id => validIds.has(id)));
  (incoming || []).forEach(id => { if (validIds.has(String(id))) set.add(String(id)); });
  return [...set];
}

function readProgress(body) {
  const p = body?.progress || {};
  return {
    beatsHit: Array.isArray(p.beatsHit) ? p.beatsHit.map(String) : [],
    flagsSpotted: Array.isArray(p.flagsSpotted) ? p.flagsSpotted.map(String) : []
  };
}

const STATIC_OPENERS = {
  vishing_it: {
    defender: 'Hi Alex, Jordan from the Northbridge IT helpdesk. We have an authentication alert on your workstation and I want to get it cleared before payroll closes. Have you got a minute?',
    attacker: 'Alex Morgan speaking. I am in the middle of payroll, so I only have a few minutes — what is the issue?'
  },
  spear_invoice: {
    defender: 'Hi Priya, Chris from Harbour Office Supplies. I am chasing invoice NB-4817 for the West Wing refit. We have moved banks and need the payment details updated before today’s run closes.',
    attacker: 'Priya Shah, Finance. I have NB-4817 in front of me and the payment run closes at 14:30. What has changed?'
  },
  whaling_ceo: {
    defender: 'Jamie — Maya here. I am between meetings and need you to deal with something on Project Atlas before the finance cutoff. Keep this between us for now.',
    attacker: 'Hi Maya. I know you are travelling today. What do you need me to handle?'
  },
  smishing_parcel: {
    defender: 'SwiftParcel: We could not complete your expected delivery. A redelivery slot is available today if you arrange it now.',
    attacker: 'I am expecting that delivery today. What do I need to do to rearrange it?'
  },
  tailgating: {
    defender: 'Hi — Sam from HVAC. Leah Barnes booked us in for the maintenance job. I have both hands full and my pass is still in the van; could you hold this secure door for me?',
    attacker: 'Morning. I know HVAC work is booked today, but contractors normally need to check in first. Can I help?'
  },
  shoulder_surfing: {
    defender: 'Hi, I am here for the 11:00 Sales meeting. The guest Wi-Fi is down and I cannot find the meeting room — could you help while you open that staff door?',
    attacker: 'Hi. Reception is hectic this morning, but I can point you towards the Sales meeting. What do you need?'
  },
  helpdesk_reset: {
    defender: 'Hi, it is Owen Price in Sales. I replaced my phone and now MFA has locked me out. I have the client pitch at 11:00 — can you get the reset started?',
    attacker: 'Northbridge Helpdesk, Riley speaking. Tell me what has happened and I will see what I can do.'
  },
  hr_benefits: {
    defender: 'HR Benefits reminder: your enrolment is incomplete and the window closes at 17:00 today. Please complete your choices now so you do not miss this year’s options.',
    attacker: 'Hi, Samira here. I know benefits enrolment closes today and I still need to finish my choices. What do I need to do?'
  }
};

function openingRequest(messages) {
  if (messages.length !== 1 || messages[0].role !== 'user') return false;
  const t = messages[0].content.trim().toLowerCase();
  return t === 'begin the scenario.' || t === 'begin the scenario' || t.startsWith('begin. wait for my opening message');
}

function staticOpening(s, mode) {
  const entry = STATIC_OPENERS[s.id];
  return entry?.[mode] || (mode === 'defender' ? `Hello — I am contacting you about ${s.title.toLowerCase()}.` : 'Hello. How can I help?');
}

async function handleChat(request, env, origin) {
  const body = await request.json();
  const s = scenarios[String(body.scenarioId || '')];
  const mode = body.mode === 'attacker' ? 'attacker' : 'defender';
  const level = levels[body.difficulty] || levels.medium;
  const messages = sanitiseMessages(body.messages);
  const progress = readProgress(body);
  const last = messages.at(-1)?.content || '';
  if (!s) return json({ error: 'Unknown scenario.' }, 400, origin, env);

  // Old/cached frontends may still request an AI-generated opening. Serve it locally: zero Groq calls.
  if (openingRequest(messages)) {
    return json({ reply: staticOpening(s, mode), status: 'ongoing', progress, coach_hint: '' }, 200, origin, env);
  }

  if (leavesTheSimulation(last)) {
    return json({
      reply: 'Let\'s keep this inside the training scenario. I can carry on as the fictional character, but not take this toward anything real.',
      status: 'ongoing', progress, coach_hint: ''
    }, 200, origin, env);
  }

  const beatIds = new Set((s.attacker.beats || []).map(b => b.id));
  const flagIds = new Set((s.defender.redFlags || []).map(f => f.id));
  const system = mode === 'defender'
    ? defenderModePrompt(s, level)
    : attackerModePrompt(s, level, progress.beatsHit.filter(id => beatIds.has(id)));

  const parsed = await groqTurn([{ role: 'system', content: system }, ...messages]);

  const next = {
    beatsHit: mode === 'attacker' ? mergeIds(progress.beatsHit, parsed.beats_hit, beatIds) : progress.beatsHit,
    flagsSpotted: mode === 'defender' ? mergeIds(progress.flagsSpotted, parsed.flags_spotted, flagIds) : progress.flagsSpotted
  };

  let status = 'ongoing';
  if (mode === 'defender') {
    if (parsed.trap_action_taken === true) status = 'attacker_success';
    else if (parsed.safe_action_taken === true) status = 'defender_success';
  } else if (next.beatsHit.length >= level.beatsRequired) {
    status = 'attacker_success';
  }

  return json({
    reply: String(parsed.reply || '').slice(0, 900),
    status,
    progress: next,
    coach_hint: level.showHints ? String(parsed.coach_hint || '').slice(0, 160) : ''
  }, 200, origin, env);
}

function deterministicDebrief(s, mode, progress, outcome) {
  let strengths = [];
  let missed = [];
  let score = 0;

  if (mode === 'defender') {
    const got = (s.defender.redFlags || []).filter(f => progress.flagsSpotted.includes(f.id));
    const notGot = (s.defender.redFlags || []).filter(f => !progress.flagsSpotted.includes(f.id));
    strengths = got.slice(0, 4).map(f => `Recognised: ${f.label}.`);
    if (outcome === 'defender_success') strengths.unshift('Committed to the approved independent verification / safe action.');
    if (!strengths.length) strengths.push('Avoided entering real information and kept the exercise inside the simulation.');
    missed = notGot.slice(0, 4).map(f => `${f.label}: ${f.detail}`);
    const ratio = got.length / Math.max(1, s.defender.redFlags.length);
    score = outcome === 'defender_success' ? Math.round(82 + ratio * 18) : outcome === 'attacker_success' ? Math.round(30 + ratio * 35) : Math.round(50 + ratio * 35);
  } else {
    const got = (s.attacker.beats || []).filter(b => progress.beatsHit.includes(b.id));
    const notGot = (s.attacker.beats || []).filter(b => !progress.beatsHit.includes(b.id));
    strengths = got.map(b => `Demonstrated how ${b.label.toLowerCase()} can influence a target in a fictional scenario.`);
    if (!strengths.length) strengths.push('Kept the exercise inside the fictional scenario.');
    missed = notGot.map(b => `The simulation did not demonstrate the lever: ${b.label}.`);
    const ratio = got.length / Math.max(1, s.attacker.beats.length);
    score = outcome === 'attacker_success' ? Math.round(78 + ratio * 22) : Math.round(35 + ratio * 45);
  }

  if (!missed.length) missed = ['All key indicators / levers were covered.'];
  score = Math.max(0, Math.min(100, score));

  const outcomeText = outcome === 'defender_success'
    ? 'The defender used the safe process and the attack failed.'
    : outcome === 'attacker_success'
      ? (mode === 'attacker' ? 'The fictional employee complied after enough persuasion levers were used.' : 'The defender committed to the unsafe action and the simulated attack succeeded.')
      : outcome === 'defender_held_out'
        ? 'The defender avoided the unsafe action but did not complete independent verification before the turn limit.'
        : outcome === 'attacker_ran_out'
          ? 'The Red Team did not land enough persuasion levers before the turn limit.'
          : 'The scenario ended before a clear success condition was reached.';

  const examParagraph = `${s.channel} is a social-engineering threat because the attacker tries to influence a person rather than defeat a technical control directly. The vulnerability is the realistic human context in the scenario: ${s.defender.persona} If the unsafe action succeeded, the organisation could face unauthorised access, disclosure, financial loss or disruption. The strongest control is to follow the approved process: ${s.defender.safeAction} This works because it creates an independent source of verification instead of trusting evidence supplied by the requester. Staff awareness supports the control by helping users recognise urgency, authority, familiarity and reassurance as possible manipulation techniques rather than proof that a request is genuine.`;

  return {
    classification: s.channel,
    outcome: outcomeText,
    strengths,
    missed_clues: missed,
    techniques_seen: s.debrief?.techniques || [],
    recommended_controls: s.debrief?.controls || [s.defender.safeAction],
    exam_paragraph: examParagraph,
    score
  };
}

async function handleDebrief(request, env, origin) {
  const body = await request.json();
  const s = scenarios[String(body.scenarioId || '')];
  if (!s) return json({ error: 'Unknown scenario.' }, 400, origin, env);
  const mode = body.mode === 'attacker' ? 'attacker' : 'defender';
  const progress = readProgress(body);
  return json(deterministicDebrief(s, mode, progress, String(body.outcome || 'unresolved')), 200, origin, env);
}

function friendlyError(err) {
  const m = String(err?.message || '');
  if (m.includes('GROQ_API_KEY')) return m;
  if (m === 'PROVIDER_429') return 'The AI classroom queue is busy. The app will retry automatically.';
  if (m === 'PROVIDER_401' || m === 'PROVIDER_403') return 'The AI service could not authenticate. Check the Groq API key in Cloudflare.';
  if (/^PROVIDER_5\d\d$/.test(m)) return 'The AI provider is temporarily unavailable. Try again in a moment.';
  return 'The simulation service hit an error. Try that message again.';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || 'https://southernadd-cmyk.github.io';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    if (origin && origin !== allowed && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return json({ error: 'Origin not allowed.' }, 403, origin, env);
    }
    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({
          ok: true,
          model: env.GROQ_MODEL || 'openai/gpt-oss-20b',
          groqConfigured: Boolean(env.GROQ_API_KEY),
          workerVersion: 'v3.1-classroom-optimised',
          scenarios: Object.keys(scenarios).length,
          chatMaxTokens: CHAT_MAX_TOKENS,
          historyMessages: MAX_HISTORY,
          reasoningEffort: 'low',
          opening: 'static',
          debrief: 'deterministic'
        }, 200, origin, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/chat') return await handleChat(request, env, origin);
      if (request.method === 'POST' && url.pathname === '/api/debrief') return await handleDebrief(request, env, origin);
      return json({ error: 'Not found.' }, 404, origin, env);
    } catch (err) {
      console.error(err);
      const message = String(err?.message || '');
      if (message === 'PROVIDER_429') return json({ error: friendlyError(err) }, 429, origin, env);
      if (/^PROVIDER_5\d\d$/.test(message)) return json({ error: friendlyError(err) }, 503, origin, env);
      return json({ error: friendlyError(err) }, 500, origin, env);
    }
  }
};