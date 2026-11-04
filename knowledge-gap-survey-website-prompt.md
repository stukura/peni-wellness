# The Knowledge Gap — Interactive Survey Website Prompt

A build prompt for an engaging, non-boring survey website that measures how businesses understand and use technology, what holds them back, and what they know about digital assets and regulation (incl. the CLARITY Act). Responses feed **The Knowledge Gap Report: Digital Assets, Consumer Protection & Business Readiness**.

---

## The Prompt

```
You are a senior product designer and front-end engineer. Build a single,
polished, interactive survey website for "The Knowledge Gap" initiative.
It must feel like a guided experience, not a form. People should finish it
feeling they learned something and got something back.

==================================================================
1. PURPOSE (show a short version of this on the welcome screen)
==================================================================
The Knowledge Gap measures current awareness and understanding of
technology, digital assets, emerging financial technologies, consumer
protection, and regulatory developments such as the CLARITY Act. Findings
identify educational needs and shape programmes that prepare businesses
and communities for the digital economy.

The data must let us measure:
- Awareness levels (self-reported)
- Actual knowledge (via a light knowledge check) -> the "gap" between the two
- Current technology usage and digital maturity
- Barriers and challenges to adoption
- Consumer / business concerns and trust
- Business readiness and adoption intent
- Education preferences and demand for future programmes

==================================================================
2. EXPERIENCE DESIGN — MAKE IT NOT BORING
==================================================================
Structure
- One question per screen, large type, smooth slide/fade transitions.
- Organised as a "journey" of 7 short chapters. Each chapter opens with a
  title card (icon, chapter name, one-line hook, "~1 min").
- Progress shown as a chapter path/map at the top (not a plain % bar).
  Show estimated time remaining. Total target: 8–10 minutes.
- Name and email are asked at the END, not the start (reduces drop-off).

Interaction patterns (use a variety, never the same widget 5 times in a row)
- Tappable cards with icons for single-choice questions
- Multi-select "chips" that light up when picked
- Emoji / slider scales for confidence and familiarity (1–5)
- Drag-to-rank for "biggest barriers" and "top concerns" (with a tap
  fallback on mobile: tap in order 1, 2, 3)
- This-or-that quick swipes for a few attitude questions
- A short True / False knowledge check with instant reveal + one-line
  explanation after each answer ("Did you know?" card)
- "Other" options open an inline text field automatically
- Keyboard support: number keys select options, Enter continues

Feedback & reward
- After each chapter, show a micro-insight card: a "Did you know?" fact
  relevant to the chapter (facts provided as editable placeholders in a
  config file — do NOT invent statistics; mark each as [VERIFY SOURCE]).
- Conditional logic: skip questions that don't apply (e.g. if someone has
  never heard of digital assets, skip "how do you use them" and route them
  to a gentler explainer card instead).
- At the end, generate a personalised "Digital Readiness Profile":
    * An archetype based on scoring (e.g. "Curious Explorer",
      "Cautious Adopter", "Practical Operator", "Digital Pioneer")
    * A simple radar/bar chart across 4 dimensions: Tech Usage,
      Digital Asset Knowledge, Regulatory Awareness, Readiness
    * Their knowledge-check score vs. their self-rating ("You rated yourself
      Intermediate and scored 4/6")
    * 3 tailored learning recommendations based on their answers
    * A shareable result card (image download + LinkedIn / WhatsApp / X
      share links) with no personal data on it
    * CTA: "Join the Knowledge Gap programme" / "Get the report when it's out"
- Small celebratory moment on completion (subtle confetti or animation —
  tasteful, not childish).

Visual direction
- Modern, confident, trustworthy: think fintech-meets-editorial.
- Deep navy or near-black base with one bright accent (electric teal or
  amber) and soft gradients; generous whitespace; rounded cards.
- Expressive display font for questions (e.g. "Space Grotesk" or "Sora"),
  clean sans for body (e.g. "Inter").
- Subtle abstract motif: connected nodes / bridging a gap — reinforces
  "The Knowledge Gap" name. Animated lightly on the welcome screen.
- Fully responsive, mobile-first (most respondents will be on phones).
- Respect prefers-reduced-motion. WCAG AA contrast. Screen-reader labels
  on every control. Tap targets >= 44px.

==================================================================
3. SCREENS
==================================================================
1. Welcome: headline ("How ready is your business for the digital
   economy?"), 2-line purpose, "8 minutes · anonymous insights · get your
   personal readiness profile", Start button, privacy note link.
2. Consent: short plain-language consent checkbox (data used in aggregate
   for research; contact details optional and stored separately).
3. Chapters 1–7 (questions below), each with intro card + insight card.
4. Stay in touch (name, email, opt-ins).
5. Results: Digital Readiness Profile.
6. Privacy page.
7. Admin view (password-protected): response count, completion rate,
   chapter drop-off, live charts per question, CSV export.

==================================================================
4. QUESTION BANK
==================================================================
Every question has an id, type, options, and whether it's required.
Keep all copy in a single JSON/config file so we can edit wording without
touching code. Tone: warm, plain English, no jargon without a tooltip.
Provide a one-line tooltip definition for every technical term
(blockchain, stablecoin, tokenization, smart contract, etc.).

--- CHAPTER 1: ABOUT YOU & YOUR BUSINESS ("Let's get to know you") ---
Q1  What best describes you? [single, cards]
    Student · Employee/professional · Entrepreneur/startup founder ·
    Business owner · Community leader · Technology professional ·
    Investor · Other
Q2  What industry are you involved in? [single, cards]
    Real estate · Entertainment/media · Retail · Manufacturing · Finance ·
    Technology · Healthcare · Education · Professional services ·
    Agriculture · Hospitality/food · Transport/logistics · Non-profit · Other
Q3  How many people work in your business/organisation? [single]
    Just me · 2–10 · 11–50 · 51–250 · 250+ · Not applicable
Q4  How long has the business been operating? [single]
    Not launched yet · <1 year · 1–3 years · 4–10 years · 10+ years
Q5  Where are you based? [country dropdown + city/state optional text]
Q6  Who mostly handles technology decisions in your business? [single]
    Me · A staff member · An external contractor/agency · No one really ·
    Not applicable

--- CHAPTER 2: YOUR TECH PULSE ("What's in your toolkit?") ---
Q7  How would you describe your current knowledge of emerging
    technologies? [slider with labels]
    Beginner · Basic · Intermediate · Advanced · Expert
Q8  Which of these does your business use today? [multi, chips]
    Digital/mobile payments · Online banking · Accounting software ·
    E-commerce store/website · Social media selling (WhatsApp, Instagram) ·
    CRM / customer database · Cloud storage/Google Workspace/Microsoft 365 ·
    AI tools (ChatGPT, Claude, Copilot, etc.) · Point-of-sale system ·
    Inventory software · Digital marketing/ads · None of these · Other
Q9  Roughly what share of your sales or payments happen digitally? [slider]
    0% · ~25% · ~50% · ~75% · ~100% · Don't know
Q10 How often do you or your team use AI tools for work? [single]
    Never · Tried once or twice · Monthly · Weekly · Daily
Q11 (if Q10 != Never) What do you use AI for? [multi]
    Writing/emails · Marketing content · Customer service · Research ·
    Data analysis · Coding · Bookkeeping · Design · Other
Q12 This or that: "Technology is mostly a cost for my business" vs
    "Technology is mostly an investment in growth" [swipe]

--- CHAPTER 3: CHALLENGES ("What's getting in the way?") ---
Q13 Rank your top 3 barriers to adopting new technology [drag-to-rank]
    Lack of knowledge · Cost · Lack of trusted information · Regulatory
    uncertainty · Security concerns · Lack of skilled staff · Poor internet
    or power reliability · Don't see the benefit · Not relevant to my
    business · Other
Q14 Has your business experienced any of these in the past 2 years? [multi]
    Phishing/scam attempt · Account hacked · Payment fraud · Data loss ·
    Fake vendor/customer · None · Prefer not to say
Q15 Do businesses currently have enough information to make informed
    decisions about emerging technologies? [single] Yes · No · Unsure
Q16 How confident are you that you could tell a legitimate tech/financial
    product from a scam? [1–5 emoji scale]

--- CHAPTER 4: DIGITAL ASSETS ("Into the world of digital assets") ---
Q17 Before today, had you heard of digital assets? [single]
    Yes · No · I've heard the term but don't understand it
    -> if "No": show a 2-sentence plain-English explainer card, then
       continue to Q19 (skip Q18)
Q18 How would you describe your understanding of digital assets? [single]
    I don't understand them · I understand the basic concept · I understand
    how they're used · I actively use or work with them
Q19 Which of these have you heard of? [multi, chips with tooltips]
    Cryptocurrency · Blockchain · NFTs · Stablecoins · Tokenization ·
    Smart contracts · Digital identity · Central bank digital currency
    (CBDC) · Decentralised finance (DeFi) · None of these
Q20 Have you or your business ever: [multi]
    Bought/held cryptocurrency · Received payment in crypto/stablecoins ·
    Sent cross-border payments with stablecoins · Used a crypto exchange
    or wallet · Explored tokenizing an asset · None of these
Q21 Would you consider accepting digital asset payments in the next
    12 months? [single] Yes · Maybe · No · Already do
Q22 This or that: "Digital assets are mostly speculation" vs "Digital
    assets have real business uses" [swipe]

--- CHAPTER 5: KNOWLEDGE CHECK ("Quick 6 — no pressure!") ---
Frame as a fun, low-stakes quiz. True / False / Not sure. After each
answer, reveal the correct answer + 1-line explanation. Score is used in
the results profile and to measure the self-rating vs actual knowledge gap.
K1 A blockchain is a shared record of transactions that is very hard to
   alter once written. (True)
K2 Stablecoins are designed to keep a steady value, usually tied to a
   currency like the US dollar. (True)
K3 If you lose the private key/recovery phrase to a self-custody crypto
   wallet, your bank can recover it for you. (False)
K4 A smart contract is a legal document signed digitally by a lawyer.
   (False — it's code that runs automatically when conditions are met)
K5 "Guaranteed high returns" is a common sign of an investment scam. (True)
K6 Tokenization means representing ownership of an asset (e.g. property)
   as a digital token. (True)
Mark the explanations as [REVIEW FOR ACCURACY] in the config.

--- CHAPTER 6: TRUST, PROTECTION & REGULATION ("Rules of the game") ---
Q23 Rank what concerns you most about digital assets (top 3) [drag-to-rank]
    Fraud/scams · Lack of education · Regulatory uncertainty ·
    Privacy/security · Losing money · Understanding the technology ·
    Business compliance · Tax treatment · Other
Q24 Before this survey, had you heard of the CLARITY Act? [single]
    Yes · No · I've heard the name but don't know what it is
    -> after answering, show a short neutral explainer card about the
       CLARITY Act (copy as editable placeholder, marked [VERIFY CURRENT
       STATUS] — do not state its legislative status as fact)
Q25 How familiar are you with the purpose of the CLARITY Act? [slider]
    Not familiar · Slightly · Somewhat · Very familiar
Q26 How confident are you in understanding how digital asset regulation
    could affect businesses? [1–5 scale]
Q27 If regulation of digital assets became clearer, how would it change
    your willingness to use them? [single]
    Much more likely · Somewhat more likely · No change · Less likely ·
    Not sure
Q28 Who would you trust most to teach you about digital assets? [multi,
    max 2] Government/regulators · Banks · Universities · Professional
    associations · Independent experts · Tech companies · Peers/other
    business owners · Media
Q29 Where do you currently get information about technology and financial
    regulation? [multi]
    Social media · News outlets · Online courses · Professional
    organisations · Financial advisors · Government websites ·
    Friends/family · Podcasts/YouTube · I don't actively seek it · Other

--- CHAPTER 7: READINESS & LEARNING ("Where do you want to go?") ---
Q30 Has your business explored using any emerging technologies? [single]
    Yes · No · Considering it
Q31 How ready is your business for the digital economy today? [1–10 slider
    with dynamic label, e.g. 1–3 "Just starting", 4–6 "Getting there",
    7–8 "Well on the way", 9–10 "Leading"]
Q32 Which areas would you like more education on? [multi]
    Blockchain · Digital assets · AI tools · Smart contracts · Digital
    payments · Cybersecurity · Consumer protection · Regulatory compliance ·
    Digital marketing · Data & analytics · None · Other
Q33 What learning format would be most valuable? [multi, max 3]
    Workshops (in person) · Live virtual sessions · Online self-paced
    courses · Executive briefings · Podcasts · Videos/documentaries ·
    Written guides/reports · One-on-one consulting · Peer learning circles
Q34 How much time could you commit to learning each month? [single]
    <1 hour · 1–3 hours · 4–8 hours · 8+ hours
Q35 Would you participate in an educational programme focused on digital
    assets, consumer protection, and business readiness? [single]
    Yes · Maybe · No
Q36 What questions do you have about digital assets, technology, or
    regulatory changes that you'd like answered? [long text, optional,
    with example prompts shown as placeholder]

--- STAY IN TOUCH ---
Q37 Name [short text, optional]
Q38 Email [email, optional, validated]
Q39 Would you like updates about The Knowledge Gap research findings and
    educational programmes? [toggle] Yes / No
Q40 Can we contact you for a 15-minute follow-up interview? [toggle]

==================================================================
5. SCORING (for the results profile)
==================================================================
Compute four 0–100 dimension scores in a single, clearly commented
scoring module so we can tune weights later:
- Tech Usage: Q8 count, Q9, Q10
- Digital Asset Knowledge: Q18, Q19 count, Q20, K1–K6 score
- Regulatory Awareness: Q24, Q25, Q26
- Readiness: Q30, Q31, Q35, inverse of barrier severity
Archetype = rule-based on the score pattern. Also store a "knowledge gap
index" = self-rated knowledge (Q7 normalised) minus knowledge-check score.

==================================================================
6. DATA & TECH
==================================================================
- Stack: static site (HTML/CSS/vanilla JS or a lightweight framework like
  Svelte/Alpine) deployable to Netlify. No heavy build if avoidable.
- Storage: send each completed response as JSON to a backend — default to
  Supabase (Postgres) with row-level security; offer a Google Sheets via
  Apps Script alternative. Keep the endpoint in one config value.
- Save partial progress in localStorage so a refresh doesn't lose answers;
  also record partial submissions (with a completed=false flag) to measure
  drop-off per chapter.
- Store contact details (Q37–Q40) in a separate table from survey answers,
  linked only by a random respondent ID.
- Capture metadata: timestamp, time per chapter, device type, referral
  source (?src= URL param for tracking distribution channels). No IP
  storage.
- Basic spam protection: honeypot field + rate limit.
- Admin dashboard: password-protected, charts per question, filters by
  role/industry/business size/country, CSV export with one column per
  question id (multi-selects as semicolon-separated values).
- Performance: < 200KB JS, Lighthouse 90+ on mobile.

==================================================================
7. DELIVERABLES
==================================================================
1. Full working code, organised into: index.html, styles, survey engine,
   questions.json (all copy + logic), scoring.js, results view, admin view.
2. Backend schema (SQL) and setup instructions.
3. README: how to edit questions, change branding, deploy to Netlify, and
   export data.
4. A list of every placeholder that needs human review ([VERIFY SOURCE],
   [VERIFY CURRENT STATUS], [REVIEW FOR ACCURACY]).

Before building, ask me:
- Organisation name/logo and brand colours (or use the default direction)
- Target country/region (affects currency, regulation framing, examples)
- Backend preference (Supabase vs Google Sheets)
- Whether the results profile should include benchmark comparisons
  ("62% of respondents in your industry…") once enough data exists
```

---

## What's new vs. the original 21 questions

- **Business profile depth** — size, age, location, who owns tech decisions (lets the report segment findings).
- **Actual tech usage** — tools in use, share of digital sales, AI usage frequency and purposes. The original only asked about knowledge.
- **Challenges with evidence** — ranked barriers, real fraud/cyber incidents, scam-detection confidence.
- **Knowledge check (K1–K6)** — measures *actual* knowledge next to self-rated knowledge. Comparing the two is the most useful number for a report called *The Knowledge Gap*.
- **Behaviour, not just awareness** — whether people have actually held or used digital assets, and whether they'd accept them as payment.
- **Regulation → adoption link** — whether clearer rules would change behaviour, and which messengers people trust.
- **Programme design data** — time commitment, format limits, and follow-up interview opt-in.
- **Name/email moved to the end**, and stored separately from answers.

## Before launch

- Check the CLARITY Act explainer copy against its current legislative status.
- Have someone review the knowledge-check explanations and any "Did you know?" facts for accuracy.
- Target length is ~40 screens in 8–10 minutes. If testing shows drop-off, cut Q12, Q22, Q34 and Q40 first.
