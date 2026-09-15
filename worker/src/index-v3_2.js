import baseWorker from './index-v3.js';
import { scenarios, difficulty as levels } from './scenarios-v3.js';

const STOP_WORDS = new Set([
  'the','and','that','this','with','from','have','your','youre','you','are','for','but','not','into','then','than','they','them','their','there','here','will','would','could','should','about','after','before','while','what','when','where','which','who','why','how','our','out','now','just','only','also','been','being','was','were','has','had','does','did','its','can','may','might','must','need','want','please','because','through','using','used','use','get','got','make','made','still','some','more','very','much','all','any','each','one','two','today'
]);

function stem(word) {
  let w = word.toLowerCase();
  if (w.length > 6 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 5 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 5 && w.endsWith('es')) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith('s')) w = w.slice(0, -1);
  return w;
}

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .match(/[a-z0-9][a-z0-9:-]*/g)?.map(stem)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w)) || [];
}

function overlapCount(a, b) {
  const aa = new Set(tokens(a));
  const bb = new Set(tokens(b));
  let n = 0;
  aa.forEach(w => { if (bb.has(w)) n += 1; });
  return n;
}

function latestUserMessage(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return String(messages[i]?.content || '');
  }
  return '';
}

function meaningfulRedMove(text, scenario) {
  const words = tokens(text);
  if (words.length < 5) return false;
  const context = [
    ...(scenario.attacker?.knows || []),
    scenario.attacker?.goal || '',
    scenario.setting?.pressure || '',
    ...(scenario.attacker?.beats || []).flatMap(b => [b.label, b.hint]),
    ...(scenario.attacker?.suggestedMoves || [])
  ].join(' ');
  const contextual = overlapCount(text, context) >= 1;
  const influence = /\b(now|today|urgent|quick|quickly|deadline|before|closes?|cut-?off|important|problem|issue|alert|changed?|delivery|meeting|payroll|invoice|support|helpdesk|manager|project|contractor|visitor|benefit|reset|approve|update|continue|start|click|link|open|send|share|allow|enter|hold|process|sign[ -]?in|go ahead|just this once)\b/i.test(text);
  return contextual && influence;
}

function bestUncreditedBeat(text, scenario, credited) {
  const current = new Set(credited || []);
  const moves = scenario.attacker?.suggestedMoves || [];
  let best = null;
  let bestScore = -1;
  (scenario.attacker?.beats || []).forEach((beat, i) => {
    if (current.has(beat.id)) return;
    const reference = `${beat.label} ${beat.hint} ${moves[i] || ''}`;
    const score = overlapCount(text, reference);
    if (score > bestScore) { best = beat; bestScore = score; }
  });
  return best;
}

function safeActionLikely(text, scenario) {
  if (tokens(text).length < 4) return false;
  const safeReference = [
    scenario.defender?.safeAction || '',
    ...(scenario.defender?.alsoAcceptable || []),
    ...(scenario.defender?.policy || [])
  ].join(' ');
  const overlap = overlapCount(text, safeReference);
  const safeVerb = /\b(hang up|end (the )?(call|conversation)|call back|ring|verify|check|official|stored|known number|hold (the )?payment|refuse|report|secure door|keep the door closed|shield|step back|move back|visitor badge|sign in|identity verification|second approv|authoris|bookmark|official app|official site|portal|independent)\b/i.test(text);
  return overlap >= 2 && safeVerb;
}

function responseWithJson(baseResponse, data) {
  const headers = new Headers(baseResponse.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status: baseResponse.status, headers });
}

async function patchChatResponse(request, env) {
  const body = await request.clone().json().catch(() => ({}));
  const baseResponse = await baseWorker.fetch(request, env);
  if (!baseResponse.ok) return baseResponse;

  const data = await baseResponse.clone().json().catch(() => null);
  const scenario = scenarios[String(body?.scenarioId || '')];
  if (!data || !scenario) return baseResponse;

  const mode = body?.mode === 'attacker' ? 'attacker' : 'defender';
  const level = levels[body?.difficulty] || levels.medium;
  const last = latestUserMessage(body);

  if (mode === 'attacker') {
    const validIds = new Set((scenario.attacker?.beats || []).map(b => b.id));
    const before = Array.isArray(body?.progress?.beatsHit) ? body.progress.beatsHit.filter(id => validIds.has(id)) : [];
    const after = Array.isArray(data?.progress?.beatsHit) ? data.progress.beatsHit.filter(id => validIds.has(id)) : [...before];
    const merged = [...new Set([...before, ...after])];

    // The model remains the main semantic scorer. This fallback guarantees that a
    // clearly relevant persuasion move cannot be ignored entirely by the classifier.
    if (merged.length === before.length && meaningfulRedMove(last, scenario)) {
      const beat = bestUncreditedBeat(last, scenario, merged);
      if (beat) merged.push(beat.id);
    }

    data.progress = { ...(data.progress || {}), beatsHit: [...new Set(merged)] };

    if (data.progress.beatsHit.length >= Number(level?.beatsRequired || 3)) {
      data.status = 'attacker_success';
      data.reply = scenario.attacker?.employeeConcession || 'The fictional employee agrees to the unsafe request.';
      data.coach_hint = '';
    } else if (level?.showHints && data.progress.beatsHit.length > before.length) {
      const newestId = data.progress.beatsHit.find(id => !before.includes(id));
      const newest = scenario.attacker?.beats?.find(b => b.id === newestId);
      if (newest) data.coach_hint = `That counted as “${newest.label}”. Build on it with another lever.`;
    }
  } else if (data.status === 'ongoing' && safeActionLikely(last, scenario)) {
    data.status = 'defender_success';
    data.reply = 'Understood. If you are going to verify this through the approved process, I cannot move the request forward.';
    data.coach_hint = '';
  }

  return responseWithJson(baseResponse, data);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      return patchChatResponse(request, env);
    }

    const response = await baseWorker.fetch(request, env);
    if (request.method === 'GET' && url.pathname === '/health' && response.ok) {
      const data = await response.clone().json().catch(() => null);
      if (data) {
        data.workerVersion = 'v3.1.2-winnable-hotfix';
        data.winScoring = 'model-plus-local-fallback';
        data.extraGroqCalls = 0;
        return responseWithJson(response, data);
      }
    }
    return response;
  }
};