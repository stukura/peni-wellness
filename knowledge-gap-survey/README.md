# The Knowledge Gap: Digital Readiness Survey

An interactive survey website that measures how businesses understand and use technology, what holds them back, and what they know about digital assets and regulation (including the CLARITY Act). Responses feed *The Knowledge Gap Report: Digital Assets, Consumer Protection & Business Readiness*.

Built from `../knowledge-gap-survey-website-prompt.md`.

## What's inside

```
public/
  index.html            survey shell
  data/questions.json   ALL copy, options, logic and placeholder facts (edit this)
  js/app.js             survey engine (rendering, branching, saving, keyboard)
  js/scoring.js         Readiness Profile scoring weights, archetypes, recommendations
  js/results.js         results screen, radar chart, share card
  js/fx.js              background motif + confetti
  js/admin.js           admin dashboard
  admin.html            password-protected dashboard (/admin)
  privacy.html          privacy note
netlify/functions/
  submit.mjs            POST /api/submit: stores responses in Netlify Blobs
  responses.mjs         GET /api/responses: admin-only data feed
```

No build step. Netlify serves `public/` and bundles the two functions.

## Editing questions

Everything is in `public/data/questions.json`:

- **Chapters** have `title`, `hook`, `icon`, `minutes` and an `insight` card shown at the end.
- **Items** have `id`, `type`, `prompt`, `help`, `required` and `options` (`v` = stored value, `l` = label, `i` = icon, `tip` = tooltip, `other: true` = opens a text box).
- **Types:** `single`, `multi` (`max`, `exclusive`), `scale`, `slider` (`bands`), `rank` (`max`), `thisthat`, `quiz` (`answer`, `explain`), `country`, `text`, `email`, `longtext`, `toggle`.
- **Branching:** `"showIf": {"q": "Q10", "notIn": ["never"]}`.
- **Explainers:** `"explainer": {"when": {"in": [...]}, "title", "body"}` shows a card after the answer.

Avoid changing an option's `v` after launch, because it breaks comparisons across responses. Change the `l` label instead.

## Placeholders to review before launch

Run `npm run placeholders`, or open the site with `?flags=1` to see them highlighted in orange:

- `VERIFY SOURCE`: the "Did you know?" facts after chapters 1, 2 and 4.
- `REVIEW FOR ACCURACY`: the Quick 6 explanations, the scam tip and the regulation insight.
- `VERIFY CURRENT STATUS`: the CLARITY Act explainer (shown after Q24).
- `privacy.html`: the contact email (currently info@ayahq.com) and the organisation name and address.

## Data

- Progress is saved in the visitor's browser (localStorage) and sent to `/api/submit` at every chapter boundary (`completed: false`), then once more on completion.
- Answers go to the Blobs store `responses`. Name, email and opt-ins go to a **separate** store, `contacts`, keyed by the same random respondent id.
- No IP addresses are stored. Bots that fill the hidden honeypot field are silently dropped.
- Add `?src=whatsapp-group-1` (or any value) to shared links to track distribution channels. Sources appear in the dashboard and the CSV.

## Admin dashboard

Go to `/admin` and sign in with the `ADMIN_PASSWORD` environment variable (Netlify → Project configuration → Environment variables). It shows:

- Starts, completion rate, average quiz score and knowledge-gap index
- Chapter reach (drop-off), dimension averages, archetypes and traffic sources
- A chart per question, plus open-text answers
- Filters by role, industry, size and country
- **CSV export:** one column per question id, multi-selects separated by `;`, and contacts exported separately

## Scoring

`public/js/scoring.js` holds the scoring. There are four 0–100 dimensions (Tech Usage, Digital Asset Knowledge, Regulatory Awareness, Readiness) with commented weights. The **knowledge gap index** is self-rated knowledge (Q7) minus the Quick 6 score, both on a 0–100 scale. A positive number means the respondent rates themselves higher than they scored.

## Running locally

```
npm install
ADMIN_PASSWORD=localtest npx netlify dev --offline
```

## Deploying

**Auto-deploys are on.** Any push to the `knowledge-gap-survey` branch of stukura/peni-wellness builds and deploys to https://knowledge-gap-survey.netlify.app. Netlify builds from the `knowledge-gap-survey/` base folder. Pushes to other branches are ignored.

This works through a manual Git link. Netlify clones the public repo over HTTPS (no deploy key), and a GitHub push webhook on the repo calls `api.netlify.com/hooks/...`. If you relink the repo in Netlify, the hook URL changes, so update the webhook (repo Settings → Webhooks) to the new `deploy_hook` URL.

To deploy by hand, run this from **this folder**, never from the parent `peniworks` folder (the parent is linked to a different Netlify project):

```
npx netlify deploy --prod
```
