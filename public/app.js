const state = {
  mode: 'defender',
  scenario: null,
  scenarios: [],
  difficulties: {},
  difficulty: 'medium',
  messages: [],
  progress: { beatsHit: [], flagsSpotted: [] },
  status: 'ongoing',
  outcome: 'unresolved',
  busy: false
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const API_BASE = String(window.SELAB_API_BASE || '').replace(/\/$/, '');
const API_READY = /^https:\/\//.test(API_BASE) && !API_BASE.includes('REPLACE-WITH-YOUR-WORKER');

const level = () => state.difficulties[state.difficulty] || {};
const CLASSROOM_TURN_LIMITS = { easy: 4, medium: 5, hard: 6 };
const turnLimit = () => CLASSROOM_TURN_LIMITS[state.difficulty] || 5;
const userTurns = () => state.messages.filter(m => m.role === 'user' && !m.seed).length;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(path, options = {}) {
  if (!API_READY) throw new Error('The AI backend is not connected yet. Add the Cloudflare Worker URL to public/config.js.');
  const hint = $('#simHint');
  const previousHint = hint?.textContent || '';

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await res.json().catch(() => ({}));

    if (res.status === 429 && attempt < 3) {
      if (hint) text(hint, `AI classroom queue busy — retrying automatically (${attempt + 1}/3)…`);
      const delay = 1600 * (attempt + 1) + Math.floor(Math.random() * 2200);
      await wait(delay);
      continue;
    }

    if (hint && previousHint) text(hint, previousHint);
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  throw new Error('The AI classroom queue is still busy. Wait a few seconds and send again.');
}

const esc = s => String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const text = (el, v) => { if (el) el.textContent = v ?? ''; };
const li = items => (items || []).map(x => `<li>${esc(x)}</li>`).join('');

/* ---------- setup ---------- */

function renderDifficulties() {
  const select = $('#difficulty');
  select.innerHTML = Object.values(state.difficulties)
    .map(d => `<option value="${esc(d.id)}"${d.id === state.difficulty ? ' selected' : ''}>${esc(d.label)}</option>`).join('');
  text($('#difficultyBlurb'), `${level().blurb} Classroom limit: ${turnLimit()} replies.`);
}

function renderScenarios() {
  const grid = $('#scenarioGrid');
  grid.innerHTML = '';
  state.scenarios.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scenario-card';
    b.dataset.id = s.id;
    b.innerHTML = `<span>${esc(s.channel)}</span><strong>${esc(s.title)}</strong><p>${esc(s.summary)}</p>`;
    b.addEventListener('click', () => {
      state.scenario = s;
      $$('.scenario-card').forEach(x => x.classList.toggle('selected', x.dataset.id === s.id));
      $('#startBtn').disabled = false;
    });
    grid.appendChild(b);
  });
}

/* ---------- intel panel ---------- */

function block(title, body, extraClass = '') {
  return `<section class="intel-block ${extraClass}"><h3>${esc(title)}</h3>${body}</section>`;
}

function renderIntel() {
  const s = state.scenario;
  const lv = level();
  const parts = [];

  if (state.mode === 'defender') {
    const d = s.defender;
    parts.push(block('You are', `<p class="intel-role">${esc(d.role)}</p><p>${esc(d.persona)}</p>`));
    parts.push(block('What you know', `<ul>${li(d.knows)}</ul>`));
    parts.push(block('Your policy', `<ul class="policy">${li(d.policy)}</ul>`));

    const spotted = state.progress.flagsSpotted;
    const total = d.redFlags.length;
    if (lv.showRedFlags) {
      const rows = d.redFlags.map(f => `<li class="${spotted.includes(f.id) ? 'found' : ''}"><strong>${esc(f.label)}</strong><span>${esc(f.detail)}</span></li>`).join('');
      parts.push(block(`Warning signs (${spotted.length}/${total} spotted)`, `<ul class="flags">${rows}</ul>`, 'flags-block'));
    } else {
      parts.push(block('Warning signs', `<p class="tally"><strong>${spotted.length}</strong> of ${total} identified so far</p><p class="muted">Name what looks wrong as you go — it counts towards your score.</p>`, 'flags-block'));
    }
  } else {
    const a = s.attacker;
    parts.push(block('You are', `<p class="intel-role">${esc(a.role)}</p><p>${esc(a.persona)}</p>`));
    parts.push(block('Your research', `<ul>${li(a.knows)}</ul>`));
    parts.push(block('What you do not know', `<ul class="unknown">${li(a.doesNotKnow)}</ul>`));

    const hit = state.progress.beatsHit;
    const need = lv.beatsRequired;
    if (lv.showBeats) {
      const rows = a.beats.map(b => `<li class="${hit.includes(b.id) ? 'found' : ''}"><strong>${esc(b.label)}</strong><span>${esc(b.hint)}</span></li>`).join('');
      parts.push(block(`Levers used (${hit.length}/${need} needed)`, `<ul class="flags">${rows}</ul>`, 'flags-block'));
    } else {
      parts.push(block('Progress', `<p class="tally"><strong>${hit.length}</strong> of ${need} levers landed</p><p class="muted">Work out for yourself what this person responds to.</p>`, 'flags-block'));
    }
  }

  $('#intel').innerHTML = parts.join('');
}

function renderMoves() {
  const wrap = $('#moveChips');
  const moves = state.mode === 'defender' ? state.scenario.defender.suggestedMoves : state.scenario.attacker.suggestedMoves;
  if (!level().showHints || state.status !== 'ongoing') { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<span class="chips-label">Ideas:</span>` + (moves || [])
    .map(m => `<button type="button" class="chip action" data-move="${esc(m)}">${esc(m)}</button>`).join('');
  wrap.querySelectorAll('.chip.action').forEach(chip => {
    chip.addEventListener('click', () => {
      const box = $('#message');
      box.value = box.value ? `${box.value.trim()} ${chip.dataset.move}` : chip.dataset.move;
      box.focus();
    });
  });
}

/* ---------- chat ---------- */

function bubble(kind, content, who = '') {
  const div = document.createElement('div');
  div.className = `bubble ${kind}`;
  if (who) {
    const w = document.createElement('span');
    w.className = 'who';
    w.textContent = who;
    div.appendChild(w);
  }
  const t = document.createElement('span');
  t.textContent = content;
  div.appendChild(t);
  $('#chat').appendChild(div);
  $('#chat').scrollTop = $('#chat').scrollHeight;
  return div;
}

const aiLabel = () => (state.mode === 'defender' ? 'SIMULATED ATTACKER' : state.scenario.defender.role.toUpperCase());

function setBusy(v) {
  state.busy = v;
  $('#sendBtn').disabled = v || state.status !== 'ongoing';
  $('#message').disabled = v || state.status !== 'ongoing';
  $('#finishBtn').disabled = v;
}

function updateTurns() {
  text($('#turnCount'), `${Math.min(userTurns(), turnLimit())} / ${turnLimit()} turns`);
}

function objective() {
  const s = state.scenario;
  return state.mode === 'defender'
    ? 'Work out what is really going on, say what looks wrong, and take the action your policy requires.'
    : `${s.attacker.goal} You need ${level().beatsRequired} of the four levers to land.`;
}

function show(id) {
  ['setup', 'simulation', 'debrief'].forEach(x => $('#' + x).classList.toggle('hidden', x !== id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function lockInput(message) {
  bubble('system', message);
  $('#message').disabled = true;
  $('#sendBtn').disabled = true;
  renderMoves();
}

function payload() {
  return JSON.stringify({
    mode: state.mode,
    scenarioId: state.scenario.id,
    difficulty: state.difficulty,
    progress: state.progress,
    messages: state.messages.map(({ role, content }) => ({ role, content }))
  });
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
    defender: 'SwiftParcel: We could not complete your laptop-stand delivery in the 12:00–2:00 window. A redelivery slot is available today if you arrange it now.',
    attacker: 'I am expecting that laptop stand today. What do I need to do to rearrange it?'
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

function openingLine() {
  const entry = STATIC_OPENERS[state.scenario.id];
  if (entry) return entry[state.mode];
  return state.mode === 'defender'
    ? `Hello — I am contacting you about ${state.scenario.title.toLowerCase()}.`
    : `Hello. How can I help?`;
}

function applyTurn(data) {
  if (data.progress) state.progress = data.progress;
  state.status = data.status || 'ongoing';
  renderIntel();
  if (data.coach_hint && state.status === 'ongoing') bubble('coach', data.coach_hint, 'HINT');
  if (state.status === 'defender_success') {
    state.outcome = 'defender_success';
    lockInput('You took the safe action and the attack failed. End the scenario for your debrief.');
  } else if (state.status === 'attacker_success') {
    state.outcome = 'attacker_success';
    lockInput(state.mode === 'defender'
      ? 'The attack succeeded. End the scenario to see which warning signs were there.'
      : 'Objective reached — the fictional employee complied. End the scenario for your debrief.');
  }
}

async function startSimulation() {
  if (!state.scenario) return;
  const s = state.scenario;
  state.messages = [];
  state.progress = { beatsHit: [], flagsSpotted: [] };
  state.status = 'ongoing';
  state.outcome = 'unresolved';
  $('#chat').innerHTML = '';

  text($('#channel'), s.channel);
  text($('#scenarioTitle'), s.title);
  text($('#briefText'), s.summary);
  text($('#settingText'), `${s.setting.place} · ${s.setting.time} · ${s.setting.pressure}`);
  text($('#objectiveText'), objective());
  const pill = $('#modePill');
  pill.className = 'pill' + (state.mode === 'attacker' ? ' red' : '');
  pill.textContent = state.mode === 'defender' ? 'BLUE TEAM · DEFENDER' : 'RED TEAM · ATTACKER';

  renderIntel();
  renderMoves();
  updateTurns();
  show('simulation');
  bubble('system', 'Fictional scenario only. The opening is preloaded to save classroom API capacity.');

  const opener = openingLine();
  state.messages.push({ role: 'assistant', content: opener, seed: true });
  bubble('ai', opener, aiLabel());
  updateTurns();
  $('#message').focus();
}

async function sendMessage(e) {
  e.preventDefault();
  if (state.busy || state.status !== 'ongoing') return;
  const input = $('#message');
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  bubble('user', content, 'YOU');
  state.messages.push({ role: 'user', content });
  updateTurns();

  setBusy(true);
  const typing = bubble('ai', 'Thinking…', aiLabel());
  typing.classList.add('typing');
  try {
    const data = await api('/api/chat', { method: 'POST', body: payload() });
    typing.remove();
    state.messages.push({ role: 'assistant', content: data.reply });
    bubble('ai', data.reply, aiLabel());
    applyTurn(data);
  } catch (err) {
    typing.remove();
    bubble('system', err.message);
  } finally {
    setBusy(false);
    updateTurns();
    if (state.status === 'ongoing' && userTurns() >= turnLimit()) {
      state.status = 'turn_limit';
      state.outcome = state.mode === 'defender' ? 'defender_held_out' : 'attacker_ran_out';
      lockInput(state.mode === 'defender'
        ? 'Out of turns. You never took the unsafe action, but you did not complete the verification either. End the scenario to see what was missing.'
        : 'Out of turns. The fictional employee did not comply. End the scenario to see which levers you missed.');
    }
  }
}

/* ---------- local debrief: zero API calls ---------- */

function renderFlagReview() {
  const s = state.scenario;
  const wrap = $('#flagReview');
  if (state.mode === 'defender') {
    const rows = s.defender.redFlags.map(f => {
      const got = state.progress.flagsSpotted.includes(f.id);
      return `<li class="${got ? 'found' : 'missed'}"><strong>${got ? '✓' : '×'} ${esc(f.label)}</strong><span>${esc(f.detail)}</span></li>`;
    }).join('');
    wrap.innerHTML = `<h3>Warning signs in this scenario — you identified ${state.progress.flagsSpotted.length} of ${s.defender.redFlags.length}</h3>
      <ul class="flags review">${rows}</ul>
      <p class="safe-action"><strong>The safe action was:</strong> ${esc(s.defender.safeAction)}</p>`;
  } else {
    const rows = s.attacker.beats.map(b => {
      const got = state.progress.beatsHit.includes(b.id);
      return `<li class="${got ? 'found' : 'missed'}"><strong>${got ? '✓' : '×'} ${esc(b.label)}</strong><span>${esc(b.hint)}</span></li>`;
    }).join('');
    wrap.innerHTML = `<h3>Persuasion levers — you landed ${state.progress.beatsHit.length} of ${s.attacker.beats.length}</h3>
      <ul class="flags review">${rows}</ul>
      <p class="safe-action"><strong>What would have stopped you:</strong> ${esc(s.defender.safeAction)}</p>`;
  }
}

function outcomeText() {
  if (state.outcome === 'defender_success') return 'The defender used the safe process and the social-engineering attempt failed.';
  if (state.outcome === 'attacker_success') return state.mode === 'attacker'
    ? 'The fictional employee complied after enough persuasion levers were used.'
    : 'The defender committed to the unsafe action and the simulated attack succeeded.';
  if (state.outcome === 'defender_held_out') return 'The defender avoided the unsafe action but did not complete the required independent verification before the turn limit.';
  if (state.outcome === 'attacker_ran_out') return 'The Red Team did not land enough persuasion levers before the turn limit.';
  return 'The scenario was ended before a clear success condition was reached.';
}

function localScore() {
  const s = state.scenario;
  if (state.mode === 'defender') {
    const ratio = state.progress.flagsSpotted.length / Math.max(1, s.defender.redFlags.length);
    if (state.outcome === 'defender_success') return Math.min(100, Math.round(82 + ratio * 18));
    if (state.outcome === 'attacker_success') return Math.round(30 + ratio * 35);
    return Math.round(50 + ratio * 35);
  }
  const ratio = state.progress.beatsHit.length / Math.max(1, s.attacker.beats.length);
  if (state.outcome === 'attacker_success') return Math.min(100, Math.round(78 + ratio * 22));
  return Math.round(35 + ratio * 45);
}

function examParagraph(s) {
  const humanFactor = state.mode === 'defender'
    ? (s.defender.persona || 'time pressure and trust in familiar-looking requests')
    : (s.defender.persona || 'a normal human tendency to trust plausible context');
  return `${s.channel} is a social-engineering threat because the attacker tries to influence a person rather than defeat a technical control directly. In this scenario, the vulnerability is the human context: ${humanFactor} The likely impact is unauthorised access, disclosure, payment or another unsafe business action, depending on the request. The strongest control is to follow the approved process: ${s.defender.safeAction} This works because it creates an independent source of verification instead of trusting evidence supplied by the person making the request. Staff awareness supports the control by helping users recognise urgency, authority, familiarity and reassurance as possible manipulation techniques rather than proof that a request is genuine.`;
}

function buildLocalDebrief() {
  const s = state.scenario;
  let strengths = [];
  let missed = [];

  if (state.mode === 'defender') {
    const got = s.defender.redFlags.filter(f => state.progress.flagsSpotted.includes(f.id));
    const notGot = s.defender.redFlags.filter(f => !state.progress.flagsSpotted.includes(f.id));
    strengths = got.slice(0, 4).map(f => `Recognised: ${f.label}.`);
    if (state.outcome === 'defender_success') strengths.unshift('Committed to the correct independent verification / safe action.');
    if (!strengths.length) strengths.push('Stayed engaged with the scenario and avoided entering any real information.');
    missed = notGot.slice(0, 4).map(f => `${f.label}: ${f.detail}`);
  } else {
    const got = s.attacker.beats.filter(b => state.progress.beatsHit.includes(b.id));
    const notGot = s.attacker.beats.filter(b => !state.progress.beatsHit.includes(b.id));
    strengths = got.map(b => `Demonstrated how ${b.label.toLowerCase()} can influence a target in a fictional scenario.`);
    if (!strengths.length) strengths.push('Kept the exercise inside the fictional scenario.');
    missed = notGot.map(b => `The simulation did not show the lever: ${b.label}.`);
  }

  if (!missed.length) missed = ['All key scenario indicators / levers were covered.'];

  return {
    classification: s.channel,
    outcome: outcomeText(),
    strengths,
    missed_clues: missed,
    techniques_seen: s.debrief?.techniques || [],
    recommended_controls: s.debrief?.controls || [s.defender.safeAction],
    exam_paragraph: examParagraph(s),
    score: localScore()
  };
}

function renderDebrief(d) {
  const score = Math.max(0, Math.min(100, Number(d.score) || 0));
  text($('#score'), score);
  $('#scoreRing').style.background = `conic-gradient(var(--green) 0 ${score}%,#20344f ${score}% 100%)`;
  text($('#classification'), d.classification || state.scenario.channel);
  text($('#outcome'), d.outcome || 'Simulation complete.');
  $('#strengths').innerHTML = li(d.strengths);
  $('#missed').innerHTML = li(d.missed_clues);
  $('#controls').innerHTML = li(d.recommended_controls);
  text($('#examParagraph'), d.exam_paragraph || '');
  $('#techniques').innerHTML = (d.techniques_seen || []).map(x => `<span class="chip">${esc(x)}</span>`).join('');
  text($('#copyStatus'), '');
  renderFlagReview();
}

function finishDebrief() {
  if (state.busy || !state.scenario) return;
  const d = buildLocalDebrief();
  renderDebrief(d);
  show('debrief');
}

async function copyReport() {
  const s = state.scenario;
  const progressLine = state.mode === 'defender'
    ? `Warning signs identified: ${state.progress.flagsSpotted.length}/${s.defender.redFlags.length}`
    : `Persuasion levers landed: ${state.progress.beatsHit.length}/${s.attacker.beats.length}`;
  const lines = [
    'SOCIAL ENGINEER LAB — EVIDENCE',
    `Scenario: ${s.title} (${s.channel})`,
    `Mode: ${state.mode === 'defender' ? 'Defender' : 'Attacker'} · ${level().label}`,
    `Classification: ${$('#classification').textContent}`,
    `Outcome: ${$('#outcome').textContent}`,
    progressLine,
    `Score: ${$('#score').textContent}/100`,
    '', 'Strengths:', ...$$('#strengths li').map(x => '- ' + x.textContent),
    '', 'Clues / opportunities missed:', ...$$('#missed li').map(x => '- ' + x.textContent),
    '', 'Recommended controls:', ...$$('#controls li').map(x => '- ' + x.textContent),
    '', 'Exam-style paragraph:', $('#examParagraph').textContent
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    text($('#copyStatus'), 'Copied. Paste this into your Class Notebook evidence document.');
  } catch {
    text($('#copyStatus'), 'Copy was blocked by the browser. Select the report text manually.');
  }
}

/* ---------- wiring ---------- */

$$('.mode-card').forEach(btn => btn.addEventListener('click', () => {
  state.mode = btn.dataset.mode;
  $$('.mode-card').forEach(x => x.classList.toggle('selected', x === btn));
}));
$('#difficulty').addEventListener('change', e => {
  state.difficulty = e.target.value;
  text($('#difficultyBlurb'), `${level().blurb} Classroom limit: ${turnLimit()} replies.`);
});
$('#startBtn').addEventListener('click', startSimulation);
$('#backBtn').addEventListener('click', () => show('setup'));
$('#newScenario').addEventListener('click', () => { state.scenario = null; $('#startBtn').disabled = true; $$('.scenario-card').forEach(x => x.classList.remove('selected')); show('setup'); });
$('#finishBtn').addEventListener('click', finishDebrief);
$('#chatForm').addEventListener('submit', sendMessage);
$('#copyReport').addEventListener('click', copyReport);
$('#message').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chatForm').requestSubmit(); }
});

(async function init() {
  try {
    const res = await fetch('./scenarios.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load scenarios (${res.status}).`);
    const data = await res.json();
    state.scenarios = data.scenarios || [];
    state.difficulties = data.difficulty || {};
    if (!state.difficulties[state.difficulty]) state.difficulty = Object.keys(state.difficulties)[0];
    renderDifficulties();
    renderScenarios();
    if (!API_READY) {
      const warning = $('#backendWarning');
      warning.classList.remove('hidden');
      warning.innerHTML = '<strong>Frontend deployed.</strong> The simulation starts working once the Cloudflare Worker URL is in <code>public/config.js</code>.';
    }
  } catch (e) {
    $('#scenarioGrid').innerHTML = `<p class="bubble system">${esc(e.message)}</p>`;
  }
})();