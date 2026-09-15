import legacyWorker from './index-v3_2.js';
import { scenarios, difficulty as levels } from './scenarios-v3.js';

const MAX_HISTORY = 8;
const MAX_MESSAGE = 600;
const CHAT_MAX_TOKENS = 300;

const chatSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    speaker: { type: 'string', enum: ['simulated_attacker', 'simulated_employee'] },
    beats_hit: { type: 'array', items: { type: 'string' } },
    flags_spotted: { type: 'array', items: { type: 'string' } },
    safe_action_taken: { type: 'boolean' },
    trap_action_taken: { type: 'boolean' },
    coach_hint: { type: 'string' }
  },
  required: ['reply', 'speaker', 'beats_hit', 'flags_spotted', 'safe_action_taken', 'trap_action_taken', 'coach_hint'],
  additionalProperties: false
};

const STOP_WORDS = new Set([
  'the','and','that','this','with','from','have','your','youre','you','are','for','but','not','into','then','than','they','them','their','there','here','will','would','could','should','about','after','before','while','what','when','where','which','who','why','how','our','out','now','just','only','also','been','being','was','were','has','had','does','did','its','can','may','might','must','need','want','please','because','through','using','used','use','get','got','make','made','still','some','more','very','much','all','any','each','one','two','today'
]);

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

function readProgress(body) {
  const p = body?.progress || {};
  return {
    beatsHit: Array.isArray(p.beatsHit) ? p.beatsHit.map(String) : [],
    flagsSpotted: Array.isArray(p.flagsSpotted) ? p.flagsSpotted.map(String) : []
  };
}

function leavesTheSimulation(text) {
  const t = String(text || '').toLowerCase();
  return [
    /\b(real|actual)\s+(person|people|company|employer|school|college|colleague|classmate|teacher)\b/,
    /\bmy (real )?(boss|manager|teacher|tutor|school|college|workplace|employer|mum|dad|friend)'?s? (email|phone|number|account|password)\b/,
    /\bfor (real|an actual)\b.*\b(target|victim|attack)\b/,
    /\b(credential harvester|phishing kit|clone (the )?login|fake login page|malware|ransomware|payload|keylogger)\b/,
    /\bbypass (mfa|2fa|multi-?factor)\b/
  ].some(r => r.test(t));
}

function baseSafety() {
  return 'This is a closed UK Level 3 classroom simulation. Every person, organisation and account is fictional. Stay inside the scenario. Never request or expose real personal data, real credentials, malware, working attack links or attack tooling.';
}

const bullets = arr => (arr || []).map(x => `- ${x}`).join('\n');

function blueTeamPrompt(s, level) {
  const hintRule = level.showHints ? 'coach_hint may contain one short teaching hint, but it MUST NOT appear inside reply.' : 'coach_hint must be an empty string.';
  return `${baseSafety()}

ROLE LOCK — HIGHEST PRIORITY
- HUMAN STUDENT: BLUE TEAM. They are ${s.defender.role}, the target/defender.
- YOU: ONLY ${s.attacker.role}, the simulated social engineer/attacker.
- NEVER swap these roles. NEVER speak as ${s.defender.role}. NEVER answer the attack on the student's behalf.
- The reply field must contain ONLY the next words/actions of ${s.attacker.role} in the fictional conversation.
- In reply, NEVER mention Red Team, Blue Team, student, teacher, game, simulation, scenario, objective, score, progress, lever, warning sign, rubric, hint or coaching.
- Do not explain your tactics in reply. Do not tell the student what they should say or do.

YOUR CHARACTER
Persona: ${s.attacker.persona}
Context: ${s.setting.org}; ${s.setting.place}; ${s.setting.time}; ${s.setting.pressure}
You know only:
${bullets(s.attacker.knows)}
You do NOT know and must not invent:
${bullets(s.attacker.doesNotKnow)}
Your in-character aim: ${s.attacker.goal}
Style: ${level.attackerStyle} Keep reply to 1–3 natural sentences.

HIDDEN GRADING — NEVER PUT THIS IN reply
speaker must be exactly "simulated_attacker".
flags_spotted = only warning-sign ids the STUDENT explicitly identifies or clearly acts on in their latest message: ${s.defender.redFlags.map(f => `${f.id}=${f.label}`).join('; ')}
safe_action_taken = true only if the STUDENT commits to this safe action or an equivalent independent check: ${s.defender.safeAction}
Also acceptable: ${(s.defender.alsoAcceptable || []).join(' / ')}
trap_action_taken = true only if the STUDENT clearly commits to one of these unsafe actions: ${(s.defender.trapActions || []).join('; ')}
beats_hit must be [].
${hintRule}
If safe_action_taken is true, stop pushing and respond in character as an attacker whose attempt has failed.`;
}

function redTeamPrompt(s, level, hitSoFar) {
  const hintRule = level.showHints ? 'coach_hint may contain one short teaching hint, but it MUST NOT appear inside reply.' : 'coach_hint must be an empty string.';
  return `${baseSafety()}

ROLE LOCK — HIGHEST PRIORITY
- HUMAN STUDENT: RED TEAM. They are playing ${s.attacker.role}, the fictional social engineer.
- YOU: ONLY ${s.defender.role}, the target employee/defender.
- NEVER swap these roles. NEVER write an attacker message for the student. NEVER coach the attack inside reply.
- The reply field must contain ONLY the next words/actions of ${s.defender.role} responding to what the student just said.
- In reply, NEVER mention Red Team, Blue Team, student, teacher, game, simulation, scenario, objective, score, progress, lever, warning sign, rubric, hint or coaching.
- Do not narrate what the attacker should do next. Do not explain the grading.

YOUR CHARACTER
Persona/human pressure: ${s.defender.persona}
Context: ${s.setting.org}; ${s.setting.place}; ${s.setting.time}; ${s.setting.pressure}
You know:
${bullets(s.defender.knows)}
Normal policy:
${bullets(s.defender.policy)}

IMPORTANT REALISM RULE
The policy is what a well-trained employee SHOULD do; it is not an automatic refusal script. You are a normal busy person, not a perfect security robot. ${level.employeeStyle}
When the student uses a believable persuasion lever, react to it as a human: soften, hesitate, ask one natural question, or move closer to complying. Do not invent new verification rules, secret codes, ticket requirements or hurdles that are not listed above.

HIDDEN GRADING — NEVER PUT THIS IN reply
speaker must be exactly "simulated_employee".
Score ONLY persuasion levers actually used in the STUDENT'S latest message:
${s.attacker.beats.map(b => `${b.id}=${b.label}: ${b.hint}`).join('\n')}
Already credited: ${hitSoFar.length ? hitSoFar.join(', ') : 'none'}.
Required to win at this difficulty: ${level.beatsRequired} total levers.
If the new total reaches the threshold, concede naturally in character. Intended concession: ${s.attacker.employeeConcession}
flags_spotted must be []. safe_action_taken=false. trap_action_taken=false.
${hintRule}`;
}

async function requestGroq(messages, env, responseFormat) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.GROQ_MODEL || 'openai/gpt-oss-20b',
      messages,
      temperature: 0.25,
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

function roleFallback(mode) {
  return mode === 'defender'
    ? 'I understand, but this is time-sensitive. Can we deal with the request now?'
    : 'I understand what you are asking, but I am cautious about making an exception to the normal process. Why should I do that now?';
}

async function groqTurn(messages, env, mode) {
  if (!env?.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured on the Worker.');
  let result = await requestGroq(messages, env, { type: 'json_schema', json_schema: { name: 'role_locked_turn', strict: true, schema: chatSchema } });
  let message = result.data?.choices?.[0]?.message;
  if (result.response.ok && message?.content && !message.refusal) {
    try { return JSON.parse(message.content); } catch {}
  }

  if (result.response.status === 400 || result.response.ok) {
    const reminder = `Return ONLY JSON with exactly: reply string, speaker (${mode === 'defender' ? 'simulated_attacker' : 'simulated_employee'}), beats_hit array, flags_spotted array, safe_action_taken boolean, trap_action_taken boolean, coach_hint string. reply must stay in the assigned character.`;
    result = await requestGroq([messages[0], { role: 'system', content: reminder }, ...messages.slice(1)], env, { type: 'json_object' });
    message = result.data?.choices?.[0]?.message;
    if (result.response.ok && message?.content && !message.refusal) {
      try { return JSON.parse(message.content); } catch {}
    }
  }

  if (result.response.status === 429) throw new Error('PROVIDER_429');
  if (result.response.status === 401 || result.response.status === 403) throw new Error(`PROVIDER_${result.response.status}`);
  if (result.response.status >= 500) throw new Error(`PROVIDER_${result.response.status}`);
  return { reply: roleFallback(mode), speaker: mode === 'defender' ? 'simulated_attacker' : 'simulated_employee', beats_hit: [], flags_spotted: [], safe_action_taken: false, trap_action_taken: false, coach_hint: '' };
}

function stem(word) {
  let w = word.toLowerCase();
  if (w.length > 6 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 5 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 5 && w.endsWith('es')) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith('s')) w = w.slice(0, -1);
  return w;
}

function tokens(text) {
  return String(text || '').toLowerCase().replace(/[’']/g, '').match(/[a-z0-9][a-z0-9:-]*/g)?.map(stem).filter(w => w.length >= 3 && !STOP_WORDS.has(w)) || [];
}

function overlapCount(a, b) {
  const aa = new Set(tokens(a));
  const bb = new Set(tokens(b));
  let n = 0;
  aa.forEach(w => { if (bb.has(w)) n += 1; });
  return n;
}

function meaningfulRedMove(text, scenario) {
  if (tokens(text).length < 5) return false;
  const context = [...(scenario.attacker?.knows || []), scenario.attacker?.goal || '', scenario.setting?.pressure || '', ...(scenario.attacker?.beats || []).flatMap(b => [b.label, b.hint]), ...(scenario.attacker?.suggestedMoves || [])].join(' ');
  const contextual = overlapCount(text, context) >= 1;
  const influence = /\b(now|today|urgent|quick|deadline|before|closes?|cut-?off|important|problem|issue|alert|changed?|delivery|meeting|payroll|invoice|support|helpdesk|manager|project|contractor|visitor|benefit|reset|approve|update|continue|start|click|link|open|send|share|allow|enter|hold|process|sign[ -]?in|go ahead|just this once)\b/i.test(text);
  return contextual && influence;
}

function bestUncreditedBeat(text, scenario, credited) {
  const current = new Set(credited || []);
  const moves = scenario.attacker?.suggestedMoves || [];
  let best = null;
  let bestScore = -1;
  (scenario.attacker?.beats || []).forEach((beat, i) => {
    if (current.has(beat.id)) return;
    const score = overlapCount(text, `${beat.label} ${beat.hint} ${moves[i] || ''}`);
    if (score > bestScore) { best = beat; bestScore = score; }
  });
  return best;
}

function safeActionLikely(text, scenario) {
  if (tokens(text).length < 4) return false;
  const ref = [scenario.defender?.safeAction || '', ...(scenario.defender?.alsoAcceptable || []), ...(scenario.defender?.policy || [])].join(' ');
  const safeVerb = /\b(hang up|end (the )?(call|conversation)|call back|ring|verify|check|official|stored|known number|hold (the )?payment|refuse|report|secure door|keep the door closed|shield|step back|move back|visitor badge|sign in|identity verification|second approv|authoris|bookmark|official app|official site|portal|independent)\b/i.test(text);
  return overlapCount(text, ref) >= 2 && safeVerb;
}

function looksRoleConfused(reply) {
  return /\b(red team|blue team|student|teacher|simulation|scenario|your objective|progress|persuasion lever|warning sign|rubric|coach|hint|score|as the attacker|as the defender|to win|your next move|you should try)\b/i.test(String(reply || ''));
}

function mergeIds(existing, incoming, valid) {
  const set = new Set((existing || []).filter(id => valid.has(id)));
  (incoming || []).forEach(id => { if (valid.has(String(id))) set.add(String(id)); });
  return [...set];
}

async function handleChat(request, env, origin) {
  const body = await request.json();
  const s = scenarios[String(body.scenarioId || '')];
  if (!s) return json({ error: 'Unknown scenario.' }, 400, origin, env);

  const mode = body.mode === 'attacker' ? 'attacker' : 'defender';
  const level = levels[body.difficulty] || levels.medium;
  const messages = sanitiseMessages(body.messages);
  const progress = readProgress(body);
  const last = messages.at(-1)?.content || '';

  if (leavesTheSimulation(last)) {
    return json({ reply: 'Let’s keep this inside the fictional training exercise.', status: 'ongoing', progress, coach_hint: '' }, 200, origin, env);
  }

  const beatIds = new Set((s.attacker.beats || []).map(b => b.id));
  const flagIds = new Set((s.defender.redFlags || []).map(f => f.id));
  const beforeBeats = progress.beatsHit.filter(id => beatIds.has(id));
  const system = mode === 'defender' ? blueTeamPrompt(s, level) : redTeamPrompt(s, level, beforeBeats);
  const parsed = await groqTurn([{ role: 'system', content: system }, ...messages], env, mode);

  const expectedSpeaker = mode === 'defender' ? 'simulated_attacker' : 'simulated_employee';
  let reply = String(parsed.reply || '').slice(0, 900);
  if (parsed.speaker !== expectedSpeaker || looksRoleConfused(reply)) reply = roleFallback(mode);

  const next = {
    beatsHit: mode === 'attacker' ? mergeIds(beforeBeats, parsed.beats_hit, beatIds) : progress.beatsHit,
    flagsSpotted: mode === 'defender' ? mergeIds(progress.flagsSpotted, parsed.flags_spotted, flagIds) : progress.flagsSpotted
  };

  if (mode === 'attacker' && next.beatsHit.length === beforeBeats.length && meaningfulRedMove(last, s)) {
    const beat = bestUncreditedBeat(last, s, next.beatsHit);
    if (beat) next.beatsHit.push(beat.id);
  }

  let status = 'ongoing';
  if (mode === 'defender') {
    if (parsed.trap_action_taken === true) status = 'attacker_success';
    else if (parsed.safe_action_taken === true || safeActionLikely(last, s)) status = 'defender_success';
  } else if (next.beatsHit.length >= Number(level.beatsRequired || 3)) {
    status = 'attacker_success';
  }

  if (status === 'defender_success') reply = 'Understood. If you are going to verify this through the approved route, I cannot move the request forward.';
  if (status === 'attacker_success' && mode === 'defender') reply = 'Perfect, thanks — that gets this moving. I’ll take it from here.';
  if (status === 'attacker_success' && mode === 'attacker') reply = s.attacker.employeeConcession || 'All right — I’ll go ahead with it.';

  let coach = '';
  if (level.showHints && status === 'ongoing') coach = String(parsed.coach_hint || '').slice(0, 160);
  if (level.showHints && mode === 'attacker' && next.beatsHit.length > beforeBeats.length) {
    const newestId = next.beatsHit.find(id => !beforeBeats.includes(id));
    const newest = s.attacker.beats.find(b => b.id === newestId);
    if (newest) coach = `That counted as “${newest.label}”. Build on it with another lever.`;
  }

  return json({ reply, status, progress: next, coach_hint: coach }, 200, origin, env);
}

function friendlyError(err) {
  const m = String(err?.message || '');
  if (m.includes('GROQ_API_KEY')) return m;
  if (m === 'PROVIDER_429') return 'The AI classroom queue is busy. The app will retry automatically.';
  if (m === 'PROVIDER_401' || m === 'PROVIDER_403') return 'The AI service could not authenticate. Check the Groq API key in Cloudflare.';
  if (/^PROVIDER_5\d\d$/.test(m)) return 'The AI provider is temporarily unavailable. Try again in a moment.';
  return 'The simulation service hit an error. Try that message again.';
}

function responseWithJson(baseResponse, data) {
  const headers = new Headers(baseResponse.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status: baseResponse.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || 'https://southernadd-cmyk.github.io';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    if (origin && origin !== allowed && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return json({ error: 'Origin not allowed.' }, 403, origin, env);

    try {
      if (request.method === 'POST' && url.pathname === '/api/chat') return await handleChat(request, env, origin);

      const response = await legacyWorker.fetch(request, env);
      if (request.method === 'GET' && url.pathname === '/health' && response.ok) {
        const data = await response.clone().json().catch(() => null);
        if (data) {
          data.workerVersion = 'v3.1.3-role-locked';
          data.roleLock = true;
          data.roleConfusionGuard = true;
          data.temperature = 0.25;
          data.extraGroqCalls = 0;
          return responseWithJson(response, data);
        }
      }
      return response;
    } catch (err) {
      console.error(err);
      const m = String(err?.message || '');
      const status = m === 'PROVIDER_429' ? 429 : /^PROVIDER_5\d\d$/.test(m) ? 503 : 500;
      return json({ error: friendlyError(err) }, status, origin, env);
    }
  }
};
