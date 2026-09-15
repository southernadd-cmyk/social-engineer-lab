import { scenarios, difficulty as levels } from './scenarios-v3.js';

const MAX_HISTORY = 40;
const MAX_MESSAGE = 900;

// The model no longer decides who won. It reports observations; the Worker scores them.
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

const debriefSchema = {
  type: 'object',
  properties: {
    classification: { type: 'string' },
    outcome: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    missed_clues: { type: 'array', items: { type: 'string' } },
    techniques_seen: { type: 'array', items: { type: 'string' } },
    recommended_controls: { type: 'array', items: { type: 'string' } },
    exam_paragraph: { type: 'string' },
    score: { type: 'integer', minimum: 0, maximum: 100 }
  },
  required: ['classification', 'outcome', 'strengths', 'missed_clues', 'techniques_seen', 'recommended_controls', 'exam_paragraph', 'score'],
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

// Only fires on attempts to leave the fiction. Deliberately narrow: the old version
// tripped on correct defensive answers such as "I'll ring them on their phone number".
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
  return `This is a closed classroom simulation for a UK Level 3 IT course. Every person, organisation, reference, code and account in it is fictional. Stay inside the fiction. Never redirect the exercise toward a real person or organisation, never request real personal data, and never produce credential-harvesting pages, malware, payloads, working links or operational attack tooling. Never output or invent a password, PIN, MFA code, card number or other credential, even a fictional one: describe decisions and consequences instead.`;
}

const bullets = arr => (arr || []).map(x => `- ${x}`).join('\n');

function defenderModePrompt(s, level) {
  // Student defends. Model plays the social engineer AND observes the student's decisions.
  return `${baseSafety()}

ROLE: you play the fictional social engineer in "${s.title}" (${s.channel}). The student plays ${s.defender.role}.

SITUATION
${s.setting.org} · ${s.setting.place} · ${s.setting.time}
${s.setting.pressure}

WHAT YOU KNOW (use this and nothing beyond it)
${bullets(s.attacker.knows)}

WHAT YOU DO NOT KNOW (never claim or invent these)
${bullets(s.attacker.doesNotKnow)}

YOUR OBJECTIVE: ${s.attacker.goal}

HOW TO PLAY: ${level.attackerStyle} Work through these levers, roughly in order, one per message: ${s.attacker.beats.map(b => b.label).join('; ')}. Keep every message short — one to three sentences for a phone call or text, a short paragraph for an email. Stay in character; do not narrate or explain the technique.

OBSERVE THE STUDENT each turn and report honestly:
- flags_spotted: ids of warning signs the student has explicitly named or acted on THIS turn. ${s.defender.redFlags.map(f => `${f.id}=${f.label}`).join('; ')}
- safe_action_taken: true only when the student clearly commits to the safe action or an equivalent independent check. Safe action: ${s.defender.safeAction} Also acceptable: ${(s.defender.alsoAcceptable || []).join(' / ')} Being suspicious, stalling or asking questions is NOT enough — they must commit to the check.
- trap_action_taken: true when the student clearly commits to any of: ${(s.defender.trapActions || []).join('; ')}
- beats_hit: leave empty in this mode.
- coach_hint: one short sentence of teacher guidance for a stuck student${level.showHints ? '' : ' (it will not be shown at this level, but fill it in anyway)'}.

If the student takes the safe action, react in character as the attempt fails — do not keep pressing after that.`;
}

function attackerModePrompt(s, level, hitSoFar) {
  const remaining = Math.max(0, level.beatsRequired - hitSoFar.length);
  return `${baseSafety()}

ROLE: you play ${s.defender.role} in "${s.title}". The student is practising attacker-side thinking in a sandbox so they can recognise these techniques later.

SITUATION
${s.setting.org} · ${s.setting.place} · ${s.setting.time}
${s.setting.pressure}

WHAT YOUR CHARACTER KNOWS
${bullets(s.defender.knows)}

YOUR CHARACTER'S TRAINING AND POLICY
${bullets(s.defender.policy)}

HOW TO PLAY: ${level.employeeStyle} You are a busy human being, not a security system. Reply in one to three sentences, in character.

SCORING — YOU DO NOT DECIDE THE OUTCOME, THE SYSTEM DOES.
Each turn, report in beats_hit the ids of any persuasion levers the student's latest message actually used:
${s.attacker.beats.map(b => `${b.id} = ${b.label}: ${b.hint}`).join('\n')}
Only credit a lever the student genuinely used. Levers already credited: ${hitSoFar.length ? hitSoFar.join(', ') : 'none'}. The threshold for this level is ${level.beatsRequired}; ${remaining} still needed.

CONCESSION RULE: if this message takes the total credited levers to ${level.beatsRequired} or more, your character MUST give in, in fiction, and you must say so plainly: ${s.attacker.employeeConcession} This exercise is designed to be winnable — do not hold out past the threshold, and do not invent new objections to avoid conceding. Below the threshold, stay unconvinced and say what would still bother you.

Never state a password, PIN, code or other credential, even a fictional one — describe the decision instead. Leave flags_spotted empty, set safe_action_taken and trap_action_taken to false, and put one short line of coaching in coach_hint.`;
}

function debriefPrompt(s, mode, progress, level) {
  const covered = (s.defender.redFlags || []).filter(f => progress.flagsSpotted.includes(f.id)).map(f => f.label);
  const missed = (s.defender.redFlags || []).filter(f => !progress.flagsSpotted.includes(f.id)).map(f => f.label);
  const beats = (s.attacker.beats || []).filter(b => progress.beatsHit.includes(b.id)).map(b => b.label);
  return `${baseSafety()}

You are the assessor for a UK Level 3 IT unit on social engineering. Analyse only this fictional simulation and write for a 16-18 year old student.

Scenario: ${s.title} (${s.channel}). Level: ${level.label}. Student played: ${mode === 'defender' ? 'the defender, ' + s.defender.role : 'the attacker'}.
Techniques in play: ${s.debrief.techniques.join(', ')}.
Controls that matter here: ${s.debrief.controls.join(', ')}.
Exam focus: ${s.debrief.examFocus}
Warning signs the student identified: ${covered.length ? covered.join('; ') : 'none'}.
Warning signs missed: ${missed.length ? missed.join('; ') : 'none'}.
Persuasion levers the student used: ${beats.length ? beats.join('; ') : 'none'}.
The correct defensive action was: ${s.defender.safeAction}

Ground every point in what actually happened in the transcript — quote nothing, paraphrase. missed_clues must draw on the missed warning signs listed above. exam_paragraph must be 90-140 words following threat -> vulnerability -> impact -> control -> why the control works. In attacker mode, frame all feedback around what the exercise reveals about recognising and stopping the technique, not around doing it better.`;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function requestGroq(messages, env, responseFormat, maxTokens) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.GROQ_MODEL || 'openai/gpt-oss-20b',
      messages,
      temperature: 0.55,
      max_completion_tokens: maxTokens,
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
    reply: message || 'Sorry, I lost my train of thought there. Could you say that again?',
    beats_hit: [], flags_spotted: [], safe_action_taken: false, trap_action_taken: false, coach_hint: ''
  };
}

async function groq(messages, env, schemaName, schema, maxTokens) {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured on the Worker.');

  let result = await requestGroq(messages, env, { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } }, maxTokens);
  let message = result.data?.choices?.[0]?.message;

  if (result.response.ok && message?.content && !message.refusal) {
    try { return JSON.parse(message.content); } catch {}
  }

  // Retry in plain JSON mode: strict schema plus a roleplay prompt occasionally 400s.
  if (result.response.status === 400 || result.response.ok) {
    const keys = schemaName === 'simulation_turn'
      ? 'reply (string), beats_hit (array of strings), flags_spotted (array of strings), safe_action_taken (boolean), trap_action_taken (boolean), coach_hint (string)'
      : 'classification, outcome, strengths (array), missed_clues (array), techniques_seen (array), recommended_controls (array), exam_paragraph, score (integer 0-100)';
    result = await requestGroq(
      [messages[0], { role: 'system', content: `Respond ONLY with valid JSON containing exactly these keys: ${keys}.` }, ...messages.slice(1)],
      env, { type: 'json_object' }, maxTokens
    );
    message = result.data?.choices?.[0]?.message;
    if (result.response.ok && message?.content && !message.refusal) {
      try { return JSON.parse(message.content); } catch {}
    }
  }

  if (result.response.status === 429) { await wait(500); throw new Error('PROVIDER_429'); }
  if (result.response.status === 401 || result.response.status === 403) throw new Error(`PROVIDER_${result.response.status}`);
  if (result.response.status >= 500) throw new Error(`PROVIDER_${result.response.status}`);
  if (schemaName === 'simulation_turn') return fallbackTurn();
  throw new Error(`PROVIDER_${result.response.status || 'INVALID'}`);
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

async function handleChat(request, env, origin) {
  const body = await request.json();
  const s = scenarios[String(body.scenarioId || '')];
  const mode = body.mode === 'attacker' ? 'attacker' : 'defender';
  const level = levels[body.difficulty] || levels.medium;
  const messages = sanitiseMessages(body.messages);
  const progress = readProgress(body);
  const last = messages.at(-1)?.content || '';
  if (!s) return json({ error: 'Unknown scenario.' }, 400, origin, env);

  if (leavesTheSimulation(last)) {
    return json({
      reply: 'Let\'s keep this inside the training scenario. I can carry on as the fictional character, but not take this toward anything real.',
      status: 'ongoing',
      progress,
      coach_hint: ''
    }, 200, origin, env);
  }

  const beatIds = new Set((s.attacker.beats || []).map(b => b.id));
  const flagIds = new Set((s.defender.redFlags || []).map(f => f.id));
  const system = mode === 'defender'
    ? defenderModePrompt(s, level)
    : attackerModePrompt(s, level, progress.beatsHit.filter(id => beatIds.has(id)));

  const parsed = await groq([{ role: 'system', content: system }, ...messages], env, 'simulation_turn', chatSchema, 900);

  const next = {
    beatsHit: mode === 'attacker' ? mergeIds(progress.beatsHit, parsed.beats_hit, beatIds) : progress.beatsHit,
    flagsSpotted: mode === 'defender' ? mergeIds(progress.flagsSpotted, parsed.flags_spotted, flagIds) : progress.flagsSpotted
  };

  // Outcome is computed here, not left to the model's judgement.
  let status = 'ongoing';
  if (mode === 'defender') {
    if (parsed.trap_action_taken === true) status = 'attacker_success';
    else if (parsed.safe_action_taken === true) status = 'defender_success';
  } else if (next.beatsHit.length >= level.beatsRequired) {
    status = 'attacker_success';
  }

  return json({
    reply: String(parsed.reply || '').slice(0, 1800),
    status,
    progress: next,
    coach_hint: level.showHints ? String(parsed.coach_hint || '').slice(0, 200) : ''
  }, 200, origin, env);
}

async function handleDebrief(request, env, origin) {
  const body = await request.json();
  const s = scenarios[String(body.scenarioId || '')];
  const mode = body.mode === 'attacker' ? 'attacker' : 'defender';
  const level = levels[body.difficulty] || levels.medium;
  const progress = readProgress(body);
  const messages = sanitiseMessages(body.messages);
  if (!s) return json({ error: 'Unknown scenario.' }, 400, origin, env);
  const transcript = messages.map(m => `${m.role === 'user' ? 'STUDENT' : 'SIMULATION'}: ${m.content}`).join('\n').slice(0, 12000);
  const parsed = await groq([
    { role: 'system', content: debriefPrompt(s, mode, progress, level) },
    { role: 'user', content: `Outcome: ${String(body.outcome || 'unresolved')}\n\nTranscript:\n${transcript}` }
  ], env, 'simulation_debrief', debriefSchema, 1600);
  return json(parsed, 200, origin, env);
}

function friendlyError(err) {
  const m = String(err?.message || '');
  if (m.includes('GROQ_API_KEY')) return m;
  if (m === 'PROVIDER_429') return 'The AI service is busy. Wait a few seconds and send that again.';
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
        return json({ ok: true, model: env.GROQ_MODEL || 'openai/gpt-oss-20b', groqConfigured: Boolean(env.GROQ_API_KEY), workerVersion: 'v3-scored', scenarios: Object.keys(scenarios).length }, 200, origin, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/chat') return await handleChat(request, env, origin);
      if (request.method === 'POST' && url.pathname === '/api/debrief') return await handleDebrief(request, env, origin);
      return json({ error: 'Not found.' }, 404, origin, env);
    } catch (err) {
      console.error(err);
      return json({ error: friendlyError(err) }, 500, origin, env);
    }
  }
};
