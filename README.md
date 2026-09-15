# Social Engineer Lab

A safe, fictional social-engineering simulator for **AAQ Alternative Qualification IT Unit 2**.

Students can play either:
- **Blue Team / Defender** — the LLM plays a fictional attacker.
- **Red Team / Attacker** — the LLM plays a fictional employee and the student explores why social engineering works.

Scenarios cover phishing, spear phishing, whaling, smishing, vishing, impersonation, tailgating, shoulder surfing and helpdesk pretexting. Every scenario uses fictional people, organisations, credentials and training flags.

## Hosting architecture

The frontend is designed for **GitHub Pages**. The Groq API key must never be placed in browser JavaScript, so AI calls go through a tiny **Cloudflare Worker**.

```text
GitHub Pages (public/) -> Cloudflare Worker (worker/) -> Groq API
```

This keeps the website static and avoids consuming Railway runtime while preserving the adaptive LLM conversations and debriefs.

## 1. GitHub Pages

A workflow is included at `.github/workflows/pages.yml` and publishes the `public/` folder.

If Pages is not already enabled for this repository:
1. Open **Settings -> Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Re-run the `Deploy GitHub Pages` workflow if necessary.

Expected project-site URL:
`https://southernadd-cmyk.github.io/social-engineer-lab/`

## 2. Cloudflare Worker

From the `worker/` directory:

```bash
npm install
npx wrangler login
npx wrangler secret put GROQ_API_KEY
npm run deploy
```

The Worker is configured to use `openai/gpt-oss-20b` by default and only accepts browser requests from `https://southernadd-cmyk.github.io` (plus localhost for development).

After deployment, copy the Worker URL, then edit `public/config.js`:

```js
window.SELAB_API_BASE = 'https://YOUR-WORKER.workers.dev';
```

Commit that one-line change. GitHub Pages will redeploy automatically.

## Safety design

- Fictional targets only.
- No real credentials or personal data.
- No external email/SMS/phone actions.
- No credential-harvesting pages, malware or payload generation.
- Server-side system prompts keep the model inside the classroom simulation.
- Real-world-targeting filter.
- Short turn limits.
- Debrief emphasises identification, impact and controls rather than optimisation of attack technique.

## Curriculum output

After each simulation students receive an after-action report containing:
- attack classification
- outcome
- strengths
- missed clues
- techniques observed
- recommended controls
- an exam-style paragraph
- score

The report can be copied into a Class Notebook evidence document.
