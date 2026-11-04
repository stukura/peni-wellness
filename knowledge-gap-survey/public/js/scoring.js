// Scoring for the Digital Readiness Profile.
// Every weight lives here so it can be tuned without touching the survey engine.
// Each dimension is 0–100. Weights within a dimension sum to 100.

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const count = (arr, exclude = []) => (Array.isArray(arr) ? arr.filter((v) => !exclude.includes(v)).length : 0);
const map = (value, table, fallback = 0) => (value in table ? table[value] : fallback);

export const QUIZ_IDS = ["K1", "K2", "K3", "K4", "K5", "K6"];

export function quizScore(quiz) {
  return QUIZ_IDS.filter((id) => quiz[id] && quiz[id].correct).length;
}

export function score(answers, quiz) {
  const a = answers;

  // Tech Usage: tools in use (40), share of digital sales (30), AI frequency (30)
  const tools = Math.min(count(a.Q8, ["none"]), 8) / 8;
  const digitalShare = a.Q9 === "dk" ? 0.25 : (Number(a.Q9) || 0) / 100;
  const ai = map(a.Q10, { never: 0, tried: 0.25, monthly: 0.5, weekly: 0.8, daily: 1 });
  const tech = tools * 40 + digitalShare * 30 + ai * 30;

  // Digital Asset Knowledge: self-described understanding (25), terms heard of (20),
  // hands-on experience (15), knowledge-check score (40)
  const understanding = map(a.Q18, { none: 0, concept: 0.33, usage: 0.67, active: 1 });
  const terms = count(a.Q19, ["none"]) / 9;
  const experience = Math.min(count(a.Q20, ["none"]), 3) / 3;
  const qs = quizScore(quiz) / QUIZ_IDS.length;
  const assets = understanding * 25 + terms * 20 + experience * 15 + qs * 40;

  // Regulatory Awareness: heard of CLARITY Act (30), familiarity (35), confidence (35)
  const heard = map(a.Q24, { yes: 1, nameonly: 0.4, no: 0 });
  const familiar = a.Q25 ? (Number(a.Q25) - 1) / 3 : 0;
  const confident = a.Q26 ? (Number(a.Q26) - 1) / 4 : 0;
  const regulation = heard * 30 + familiar * 35 + confident * 35;

  // Readiness: explored emerging tech (25), self-rated readiness (35),
  // programme intent (20), mindset + adoption intent (20).
  // The build prompt suggested "inverse of barrier severity"; every respondent ranks
  // exactly 3 barriers, so that carries little signal. Mindset (Q12) and digital asset
  // payment intent (Q21) are used instead.
  const explored = map(a.Q30, { yes: 1, considering: 0.5, no: 0 });
  const selfReady = a.Q31 ? (Number(a.Q31) - 1) / 9 : 0;
  const intent = map(a.Q35, { yes: 1, maybe: 0.5, no: 0 });
  const mindset = map(a.Q12, { investment: 1, cost: 0 }) * 0.5 + map(a.Q21, { already: 1, yes: 0.75, maybe: 0.4, no: 0 }) * 0.5;
  const readiness = explored * 25 + selfReady * 35 + intent * 20 + mindset * 20;

  const dims = {
    tech: clamp(tech),
    assets: clamp(assets),
    regulation: clamp(regulation),
    readiness: clamp(readiness),
  };

  // Knowledge gap index: self-rated knowledge minus measured knowledge, both 0–100.
  // Positive = rates themselves higher than they scored. Negative = knows more than they think.
  const selfRated = a.Q7 ? ((Number(a.Q7) - 1) / 4) * 100 : 0;
  const measured = qs * 100;
  const gapIndex = Math.round(selfRated - measured);

  return { dims, quiz: quizScore(quiz), selfRated: Math.round(selfRated), measured: Math.round(measured), gapIndex, archetype: archetype(dims) };
}

export const ARCHETYPES = {
  pioneer: { name: "Digital Pioneer", icon: "🚀", blurb: "You're already working in the digital economy and understand the rules shaping it. You're well placed to lead others through it." },
  operator: { name: "Practical Operator", icon: "🛠️", blurb: "Your business runs on digital tools. Digital assets and the rules around them are the next frontier, and you have a strong base to build on." },
  explorer: { name: "Curious Explorer", icon: "🧭", blurb: "You're motivated and open to what's next. A bit of structured, trusted learning would turn that curiosity into confident decisions." },
  cautious: { name: "Cautious Adopter", icon: "🛡️", blurb: "You move carefully, and in a space full of hype that's a strength. Clear information on risks and protections will help you choose what's worth adopting." },
  starter: { name: "Fresh Starter", icon: "🌱", blurb: "You're at the start of the journey, which is the best place to build good habits. Small, practical steps will move you forward quickly." },
};

export function archetype(d) {
  const avg = (d.tech + d.assets + d.regulation + d.readiness) / 4;
  if (avg >= 70) return "pioneer";
  if (avg < 25) return "starter";
  if (d.tech >= 55 && d.assets < 45) return "operator";
  if (d.readiness >= 55) return "explorer";
  return "cautious";
}

const REC_LIBRARY = {
  scams: { icon: "🎣", title: "Spotting scams before they cost you", body: "A short guide to the red flags (urgency, guaranteed returns, fake support) and a 2-minute verification routine." },
  cyber: { icon: "🔐", title: "Cybersecurity basics for small teams", body: "Two-factor authentication, password managers and phishing drills: the 20% of effort that blocks 80% of attacks." },
  assets101: { icon: "🪙", title: "Digital assets 101", body: "What crypto, stablecoins and tokenization actually are, in plain language, with real business examples." },
  stablecoins: { icon: "💱", title: "Accepting stablecoin payments safely", body: "How businesses receive and convert stablecoins, the custody options, and the compliance questions to ask first." },
  regulation: { icon: "⚖️", title: "What the CLARITY Act could mean for you", body: "A briefing on how digital asset regulation is evolving and what it changes for businesses and consumers." },
  ai: { icon: "🤖", title: "AI tools that pay for themselves", body: "Hands-on ways to use AI for writing, customer service and admin this week, with guidance on what not to share." },
  payments: { icon: "📱", title: "Going digital with payments", body: "Choosing payment tools, cutting cash-handling risk and getting real-time visibility of your cash flow." },
  data: { icon: "📊", title: "Using your data to make decisions", body: "Simple dashboards and habits that turn your sales and customer data into better choices." },
  smartcontracts: { icon: "🧾", title: "Smart contracts without the jargon", body: "What they can automate, where they're used today and the risks to understand before relying on one." },
  compliance: { icon: "📑", title: "Compliance readiness checklist", body: "The questions to answer before your business touches digital assets: tax, records, KYC and consumer protection." },
  marketing: { icon: "📣", title: "Digital marketing that converts", body: "Getting more from social selling, ads and your customer list without a big budget." },
};

const INTEREST_TO_REC = {
  blockchain: "assets101", digitalassets: "assets101", ai: "ai", smartcontracts: "smartcontracts",
  payments: "payments", cyber: "cyber", consumer: "scams", compliance: "compliance",
  marketing: "marketing", data: "data",
};

export function recommendations(answers, quiz, result) {
  const a = answers;
  const picks = [];
  const add = (key) => { if (key && !picks.includes(key)) picks.push(key); };

  const incidents = count(a.Q14, ["none", "pnts"]) > 0;
  if (Number(a.Q16) <= 2 || (quiz.K5 && !quiz.K5.correct)) add("scams");
  if (incidents) add("cyber");
  if (result.dims.assets < 40) add("assets101");
  if (["yes", "maybe", "already"].includes(a.Q21)) add("stablecoins");
  if (result.dims.regulation < 40) add("regulation");
  if (["never", "tried"].includes(a.Q10)) add("ai");
  if (a.Q9 !== "dk" && Number(a.Q9) <= 25) add("payments");
  (a.Q32 || []).forEach((v) => add(INTEREST_TO_REC[v]));
  ["assets101", "regulation", "cyber"].forEach(add);

  return picks.slice(0, 3).map((k) => REC_LIBRARY[k]);
}

export const DIM_LABELS = {
  tech: "Tech Usage",
  assets: "Digital Asset Knowledge",
  regulation: "Regulatory Awareness",
  readiness: "Readiness",
};
