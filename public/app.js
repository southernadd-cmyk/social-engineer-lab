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
const turnLimit = () => level().turnLimit || 14;
const userTurns = () => state.messages.filter(m => m.role === 'user' && !m.seed).length;

async function api(path, options = {}) {
  if (!API_READY) throw new Error('The AI backend is not connected yet. Add the Cloudflare Worker URL to public/config.js.');
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const esc = s => String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const text = (el, v) => { el.textContent = v ?? ''; };
const li = items => (items || []).map(x => `<li>${esc(x)}</li>`).join('');

/* ---------- setup ---------- */

function renderDifficulties() {
  const select = $('#difficulty');
  select.innerHTML = Object.values(state.difficulties)
    .map(d => `<option value="${esc(d.id)}"${d.id === state.difficulty ? ' selected' : ''}>${esc(d.label)}</option>`).join('');
  text($('#difficultyBlurb'), level().blurb);
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
  $('#sendBtn').disabled = v;
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
  bubble('system', 'Fictional scenario only. You can end it at any time.');

  setBusy(true);
  try {
    state.messages.push({ role: 'user', content: state.mode === 'defender' ? 'Begin the scenario.' : 'Begin. Wait for my opening message.', seed: true });
    const data = await api('/api/chat', { method: 'POST', body: payload() });
    state.messages.push({ role: 'assistant', content: data.reply });
    bubble('ai', data.reply, aiLabel());
    applyTurn(data);
  } catch (e) {
    bubble('system', e.message);
  } finally {
    setBusy(false);
    updateTurns();
    $('#message').focus();
  }
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
      state.outcome = state.mode === 'defender' ? 'defender_held_out' : 'attacker_ran_out';
      lockInput(state.mode === 'defender'
        ? 'Out of turns. You never took the unsafe action, but you never completed the verification either. End the scenario to see what was missing.'
        : 'Out of turns. The fictional employee did not comply. End the scenario to see which levers you missed.');
    }
  }
}

/* ---------- debrief ---------- */

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

async function finishDebrief() {
  if (state.busy || !state.scenario) return;
  setBusy(true);
  $('#finishBtn').textContent = 'Building debrief…';
  try {
    const d = await api('/api/debrief', {
      method: 'POST',
      body: JSON.stringify({
        mode: state.mode,
        scenarioId: state.scenario.id,
        difficulty: state.difficulty,
        progress: state.progress,
        outcome: state.outcome,
        messages: state.messages.map(({ role, content }) => ({ role, content }))
      })
    });
    renderDebrief(d);
    show('debrief');
  } catch (e) {
    bubble('system', e.message);
  } finally {
    setBusy(false);
    $('#finishBtn').textContent = 'End scenario & debrief';
  }
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
$('#difficulty').addEventListener('change', e => { state.difficulty = e.target.value; text($('#difficultyBlurb'), level().blurb); });
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
