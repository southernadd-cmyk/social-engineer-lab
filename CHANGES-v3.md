# v3 — making every level winnable

## Why the scenarios felt impossible

1. **The intel existed but nobody could see it.** `worker/src/scenarios-v2.js` already had
   `attackerKnows`, `defenderKnows` and `successRule` — but `chatSystem()` never put them in the
   prompt, and `public/scenarios.json` never had them at all. So neither the student nor the model
   had any shared facts. Both sides were improvising a world that did not exist.
2. **The model decided who won.** In attacker mode the only instruction was "if the student's
   persuasion would realistically cause this employee to make the unsafe decision, mark
   attacker_success". A safety-trained model playing a target almost never says *yes, I'd fall for
   it* — so attacker mode was unwinnable no matter what the student wrote. Defender mode had the
   opposite problem: any refusal won instantly.
3. **No definition of success for the defender.** Being suspicious counted as winning, so the
   scenario never taught the actual control (call back on a known number, etc.).
4. **`TRAINING FLAG: ${s.secret}`** printed `undefined` — v2 scenarios have no `secret` field.
5. **The safety filter fired on correct answers.** `/their (email|phone number|password|account)/`
   and `/send (this|it) to/` meant "I'll ring them back on their phone number" and "I'll send it to
   the helpdesk" both ejected the student from the scenario.
6. **Turn counter lied.** The UI counted student turns out of 16 but the cut-off checked
   `messages.length >= 16`, i.e. 8 student turns — the scenario ended at "8 / 16" and auto-awarded
   a defender win.

## What changed

**One source of truth.** `/scenarios.json` is now the only place scenarios are edited.
`node scripts/sync-scenarios.mjs` copies it to `public/` and generates `worker/src/scenarios-v3.js`.
The script refuses to build if a scenario has fewer persuasion levers than the hardest level needs —
so a level literally cannot ship unwinnable.

**Every scenario now carries a visible intel panel**: who you are, what you know, what your policy
says, and — on the attacker side — what your research turned up and what you *don't* know, so
students stop bluffing details the character couldn't have.

**Outcomes are computed by the Worker, not judged by the model.** Each turn the model only reports
observations (which warning signs the student named, which persuasion levers landed, whether they
committed to the safe action or a trap). `handleChat` scores those deterministically:

- Attacker mode: 2 levers win at Level 1, 3 at Level 2, 4 at Level 3, out of four available. The
  employee is explicitly told it must concede once the threshold is reached.
- Defender mode: you win by *doing the verification*, not by being vaguely suspicious. Committing
  to a listed trap action loses immediately.

**Progress is visible while you play** — the panel fills in as levers land or warning signs are
named, so a stuck student can see they are making progress. Level 1 also shows the warning-sign
checklist and clickable suggested moves, and passes back a one-line hint each turn.

**Debrief is grounded.** It receives the actual flags spotted and missed, so feedback names the
specific clues rather than generic advice, and the report screen shows the full checklist with the
correct safe action.

## Deploying

```
node scripts/sync-scenarios.mjs     # after any edit to /scenarios.json
cd worker && npm run deploy         # wrangler.toml now points at src/index-v3.js
```

The frontend is the `public/` folder as before; GitHub Pages redeploys on push. The old
`index.js` / `index-v2.js` are left in place as history and are no longer referenced.
