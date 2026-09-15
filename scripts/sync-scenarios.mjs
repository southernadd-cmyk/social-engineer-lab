// Single source of truth: /scenarios.json
// Run `node scripts/sync-scenarios.mjs` after editing it.
// Copies the data to the GitHub Pages folder and generates the Worker module,
// so the frontend and the AI backend can never drift apart.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(join(root, 'scenarios.json'), 'utf8');
const data = JSON.parse(raw);

const ids = new Set();
for (const s of data.scenarios) {
  if (ids.has(s.id)) throw new Error(`Duplicate scenario id: ${s.id}`);
  ids.add(s.id);
  const need = ['title', 'channel', 'summary', 'setting', 'defender', 'attacker', 'debrief'];
  for (const key of need) if (!s[key]) throw new Error(`${s.id}: missing ${key}`);
  if (!s.defender.safeAction) throw new Error(`${s.id}: defender.safeAction is required`);
  if (!s.attacker.employeeConcession) throw new Error(`${s.id}: attacker.employeeConcession is required`);
  if ((s.attacker.beats || []).length < 4) throw new Error(`${s.id}: needs 4 attacker beats (hard mode requires 4)`);
  if ((s.defender.redFlags || []).length < 5) throw new Error(`${s.id}: needs at least 5 red flags`);
}

const maxRequired = Math.max(...Object.values(data.difficulty).map(d => d.beatsRequired));
for (const s of data.scenarios) {
  if (s.attacker.beats.length < maxRequired) {
    throw new Error(`${s.id}: ${s.attacker.beats.length} beats but hardest level needs ${maxRequired} — level would be unwinnable`);
  }
}

writeFileSync(join(root, 'public', 'scenarios.json'), JSON.stringify(data, null, 2) + '\n');

const module = `// GENERATED FILE — do not edit.
// Source: /scenarios.json  ·  Regenerate: node scripts/sync-scenarios.mjs
export const data = ${JSON.stringify(data, null, 2)};
export const difficulty = data.difficulty;
export const scenarios = Object.fromEntries(data.scenarios.map(s => [s.id, s]));
`;
writeFileSync(join(root, 'worker', 'src', 'scenarios-v3.js'), module);

console.log(`Synced ${data.scenarios.length} scenarios -> public/scenarios.json, worker/src/scenarios-v3.js`);
