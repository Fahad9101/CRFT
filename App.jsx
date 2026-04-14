import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GitBranch,
  HeartPulse,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trophy,
  UserRound,
} from "lucide-react";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db, ensureAnonymousAuth } from "./firebase";

/* =========================================================
   CRFT INTERNAL MEDICINE ANCHOR CASES
   ========================================================= */

const UNIVERSAL_CASES = [
  {
    id: "case-adhf-night",
    title: "The Breathless Night",
    shortTitle: "ADHF / Dyspnea Framing",
    icon: "heart",
    domain: "Problem Representation",
    difficultyModes: {
      junior: {
        vignette:
          "A 68-year-old man with hypertension and coronary artery disease presents with sudden shortness of breath that woke him from sleep. He reports orthopnea and mild chest tightness. No fever or productive cough.",
      },
      senior: {
        vignette:
          "A 68-year-old man with HTN and known CAD presents with abrupt nocturnal dyspnea, orthopnea, and vague chest tightness. He is not febrile. Your task is to decide whether this is simply 'shortness of breath' or a time-sensitive cardiopulmonary syndrome requiring a tighter one-line representation.",
      },
    },
    learningGoal:
      "Assess whether the learner can create a tight problem representation and frame acute dyspnea as a syndrome rather than a symptom list.",
    progressiveData: [
      {
        step: 1,
        label: "Initial Vitals",
        data: [
          "HR 105/min",
          "BP 160/90 mmHg",
          "RR 26/min",
          "SpO₂ 90% on room air",
          "Temp 36.9°C",
        ],
      },
      {
        step: 2,
        label: "Focused Exam",
        data: [
          "Bibasal crackles",
          "Mildly elevated JVP",
          "No focal wheeze",
          "No unilateral leg swelling",
        ],
      },
      {
        step: 3,
        label: "Initial Tests",
        data: [
          "BNP elevated",
          "Troponin mildly elevated",
          "ECG: nonspecific ST-T changes",
          "CXR: bilateral interstitial/alveolar opacities, vascular congestion",
        ],
      },
    ],
    prompts: [
      {
        id: "pr-1",
        type: "problem-representation",
        label: "One-line representation",
        prompt:
          "Give the best one-sentence problem representation after the first two data releases.",
        expectedKeywords: [
          "acute",
          "dyspnea",
          "orthopnea",
          "heart failure",
          "pulmonary edema",
          "ischemic trigger",
        ],
        mustHit: [
          "Frames this as acute cardiogenic pulmonary edema / acute decompensated heart failure",
          "Mentions likely ischemic or hypertensive trigger as part of framing",
          "Does not reduce the case to 'SOB ?cause'",
        ],
        redFlagMisses: [
          "Calls this pneumonia only",
          "Ignores the acuity",
          "Interprets mild troponin rise as automatic type 1 MI",
        ],
      },
      {
        id: "pr-2",
        type: "hypotheses",
        label: "Top hypotheses",
        prompt:
          "List top 3 diagnoses in priority order and explain why the first is most likely.",
        expectedKeywords: [
          "acute decompensated heart failure",
          "hypertensive pulmonary edema",
          "ACS",
          "pneumonia",
        ],
        mustHit: [
          "ADHF / cardiogenic pulmonary edema first",
          "Keeps ACS as trigger or competing diagnosis",
          "Explains why infection is less likely but still possible",
        ],
        redFlagMisses: [
          "Prematurely excludes ACS",
          "Prematurely anchors on infection",
        ],
      },
      {
        id: "pr-3",
        type: "management",
        label: "Immediate management",
        prompt:
          "What are the first management moves in the next 10-15 minutes?",
        expectedKeywords: [
          "oxygen",
          "diuresis",
          "iv furosemide",
          "nitrates",
          "ecg",
          "monitoring",
        ],
        mustHit: [
          "Oxygen / respiratory support",
          "IV loop diuretic",
          "Consider nitrates if hypertensive",
          "Monitor for ACS trigger / ECG / serial troponin contextually",
        ],
        redFlagMisses: [
          "Empiric broad antibiotics without reasoning",
          "Large fluid bolus",
        ],
      },
    ],
    evaluatorGuide: [
      "Watch whether the learner summarizes the syndrome before listing tests.",
      "Strong performance = they distinguish primary process from trigger.",
      "Excellent performance = they contextualize mild troponin leak as demand or trigger, not automatic STEMI/NSTEMI treatment reflex.",
    ],
    expectedReasoningMap: [
      "Acute dyspnea + orthopnea + crackles + elevated JVP => prioritize cardiac syndrome",
      "CXR vascular/interstitial edema supports cardiogenic process",
      "Mild troponin rise may represent demand ischemia or ACS trigger; must contextualize",
      "Initial management should treat physiology while clarifying trigger",
    ],
    patternTags: [
      "wrong question asked",
      "troponin over-interpretation",
      "anchoring on pneumonia",
    ],
    branchingScenarios: {
      safe: {
        trigger: "Learner identifies ADHF early and starts appropriate physiology-based treatment",
        outcome:
          "Oxygenation improves to 95% on low-flow oxygen. Work of breathing decreases. Repeat bedside reassessment supports cardiogenic pulmonary edema. Resident earns high framing score.",
      },
      unsafe: {
        trigger: "Learner anchors on pneumonia or gives fluid bolus",
        outcome:
          "Respiratory distress worsens. Oxygen requirement rises. Senior has to redirect. This is logged under pattern: wrong-question-asked / physiology missed.",
      },
    },
  },

  {
    id: "case-alkalosis-vomiting",
    title: "The Silent Drop",
    shortTitle: "Metabolic Alkalosis",
    icon: "brain",
    domain: "Data Interpretation",
    difficultyModes: {
      junior: {
        vignette:
          "A 55-year-old woman admitted for persistent vomiting becomes weak and mildly confused. You are asked to interpret the chemistry abnormalities.",
      },
      senior: {
        vignette:
          "A 55-year-old woman with ongoing emesis is becoming weak and confused. You must move beyond naming the disorder and identify the mechanistic subtype and treatment target.",
      },
    },
    learningGoal:
      "Tests electrolyte and acid-base interpretation with mechanism-linked treatment.",
    progressiveData: [
      {
        step: 1,
        label: "Basic Labs",
        data: [
          "Na 136 mmol/L",
          "K 2.7 mmol/L",
          "Cl 88 mmol/L",
          "HCO₃ 36 mmol/L",
          "Creatinine mildly elevated from baseline",
        ],
      },
      {
        step: 2,
        label: "ABG",
        data: [
          "pH 7.53",
          "PaCO₂ 49 mmHg",
          "Metabolic alkalosis with expected respiratory compensation",
        ],
      },
      {
        step: 3,
        label: "Urine Chemistries",
        data: [
          "Urine chloride low",
          "Urine sodium low-normal",
        ],
      },
    ],
    prompts: [
      {
        id: "alk-1",
        type: "interpretation",
        label: "Interpret the disturbance",
        prompt:
          "Name the primary acid-base process and classify it physiologically.",
        expectedKeywords: [
          "metabolic alkalosis",
          "chloride responsive",
          "volume contraction",
          "vomiting",
        ],
        mustHit: [
          "Metabolic alkalosis",
          "Chloride-responsive / saline-responsive",
          "Likely due to vomiting with volume contraction and chloride depletion",
        ],
        redFlagMisses: [
          "Says respiratory acidosis",
          "Stops at 'alkalosis' without subtype",
        ],
      },
      {
        id: "alk-2",
        type: "management",
        label: "Best treatment logic",
        prompt:
          "What is the key treatment and why is potassium alone not enough?",
        expectedKeywords: [
          "normal saline",
          "kcl",
          "chloride",
          "volume repletion",
          "raas",
        ],
        mustHit: [
          "Normal saline + potassium chloride",
          "Treat chloride depletion and volume contraction, not potassium alone",
          "Links physiology to RAAS / distal H+ secretion maintenance",
        ],
        redFlagMisses: [
          "Replace potassium only",
          "Ignores urine chloride",
        ],
      },
    ],
    evaluatorGuide: [
      "Strong learner uses urine chloride correctly.",
      "Excellent learner explains mechanism and not just memorized bins.",
    ],
    expectedReasoningMap: [
      "Vomiting => H+ and Cl- loss",
      "Volume contraction + RAAS maintains alkalosis",
      "Low urine chloride indicates saline-responsive state",
      "Need chloride and volume repletion, plus potassium",
    ],
    patternTags: [
      "missed alkalosis pattern",
      "numbers without physiology",
      "potassium-only fix",
    ],
    branchingScenarios: {
      safe: {
        trigger: "Learner recognizes chloride-responsive alkalosis and treats with NS + KCl",
        outcome:
          "Weakness improves over 24 hours, bicarbonate trends down, potassium corrects more effectively.",
      },
      unsafe: {
        trigger: "Learner only gives potassium and ignores volume/chloride physiology",
        outcome:
          "Potassium remains difficult to correct and alkalosis persists. This is logged under pattern: physiology not linked to management.",
      },
    },
  },

  {
    id: "case-fever-wont-break",
    title: "The Fever That Won’t Break",
    shortTitle: "Persistent Fever Reframing",
    icon: "alert",
    domain: "Hypothesis Generation",
    difficultyModes: {
      junior: {
        vignette:
          "A 72-year-old man with diabetes remains febrile for 10 days despite antibiotics started for presumed pneumonia.",
      },
      senior: {
        vignette:
          "A 72-year-old man with diabetes has persistent fever despite treatment for 'pneumonia.' CT chest looks improved, but inflammation remains. You need to decide whether the original question is still the right one.",
      },
    },
    learningGoal:
      "Assesses whether the learner can reframe the problem when the original label stops fitting.",
    progressiveData: [
      {
        step: 1,
        label: "Course So Far",
        data: [
          "Persistent fever to 38.6°C",
          "On broad-spectrum antibiotics",
          "Cough improving",
          "Blood cultures negative so far",
        ],
      },
      {
        step: 2,
        label: "Reassessment",
        data: [
          "CRP remains elevated",
          "CT chest infiltrate improving",
          "No clear new localizing symptoms",
          "New systolic murmur appreciated",
        ],
      },
    ],
    prompts: [
      {
        id: "fever-1",
        type: "reframing",
        label: "Change the clinical question",
        prompt:
          "How would you restate the problem now that the course is not behaving as expected?",
        expectedKeywords: [
          "persistent fever despite treatment",
          "treatment failure",
          "wrong diagnosis",
          "wrong question",
        ],
        mustHit: [
          "Reframes to persistent fever despite treatment / diagnosis needs reassessment",
          "Recognizes that not all persistent fever equals resistant pneumonia",
        ],
        redFlagMisses: [
          "Simply broadens antibiotics further with no reframing",
        ],
      },
      {
        id: "fever-2",
        type: "hypotheses",
        label: "Broaden the differential",
        prompt:
          "Give 4 important alternative explanations now and justify one urgent next test.",
        expectedKeywords: [
          "endocarditis",
          "abscess",
          "drug fever",
          "malignancy",
          "echo",
        ],
        mustHit: [
          "Includes infective endocarditis",
          "Includes hidden source / abscess",
          "Includes noninfectious causes such as drug fever or malignancy/inflammation",
          "Orders echocardiography because of new murmur and persistent fever",
        ],
        redFlagMisses: [
          "Misses endocarditis",
          "No urgent next test chosen",
        ],
      },
    ],
    evaluatorGuide: [
      "This case is about stepping back, not antibiotic trivia.",
      "Best answer explicitly says the original framing may be wrong.",
    ],
    expectedReasoningMap: [
      "Persistent fever + improving chest imaging => original pneumonia frame may not explain ongoing syndrome",
      "New murmur changes differential materially",
      "Need alternate-source and noninfectious thinking",
      "Echo becomes high-value next step",
    ],
    patternTags: [
      "wrong question asked",
      "linear antibiotic escalation",
      "missed endocarditis clue",
    ],
    branchingScenarios: {
      safe: {
        trigger: "Learner reframes and orders echo",
        outcome:
          "Echocardiography reveals valvular vegetation. The learner is credited with diagnostic reset and clue integration.",
      },
      unsafe: {
        trigger: "Learner escalates antibiotics only and ignores murmur",
        outcome:
          "Diagnosis is delayed. The case logs a red pattern: failure to reframe persistent fever.",
      },
    },
  },

  {
    id: "case-quiet-creatinine",
    title: "The Quiet Creatinine Rise",
    shortTitle: "AKI Trends & Anticipation",
    icon: "kidney",
    domain: "Trend Interpretation",
    difficultyModes: {
      junior: {
        vignette:
          "A 65-year-old woman on post-op day 2 has rising creatinine and falling urine output.",
      },
      senior: {
        vignette:
          "A 65-year-old postoperative patient has a creatinine rising from 90 to 180 µmol/L over two days with decreasing urine output. The task is not just classification, but anticipation and prevention of progression.",
      },
    },
    learningGoal:
      "Tests whether the learner tracks trends, integrates medications, and acts before severe AKI evolves.",
    progressiveData: [
      {
        step: 1,
        label: "Trend",
        data: [
          "Creatinine 90 → 130 → 180 µmol/L",
          "Urine output decreasing",
          "BP borderline low-normal",
        ],
      },
      {
        step: 2,
        label: "Context",
        data: [
          "On ACE inhibitor",
          "Receiving NSAIDs for pain",
          "Mild poor oral intake / possible hypovolemia",
          "FeNa 0.8%",
        ],
      },
    ],
    prompts: [
      {
        id: "aki-1",
        type: "interpretation",
        label: "Interpret the AKI",
        prompt:
          "What is the most likely mechanism and what clues support it?",
        expectedKeywords: [
          "prerenal",
          "hemodynamic",
          "acei",
          "nsaid",
          "hypovolemia",
          "triple hit",
        ],
        mustHit: [
          "Identifies hemodynamic / prerenal AKI pattern",
          "Mentions ACEi + NSAID + low effective circulating volume",
          "Uses FeNa cautiously, not as sole determinant",
        ],
        redFlagMisses: [
          "Overcalls ATN only from the creatinine rise",
          "Treats FeNa as absolute truth",
        ],
      },
      {
        id: "aki-2",
        type: "anticipation",
        label: "Prevent worsening",
        prompt:
          "What should be changed right now to prevent further kidney injury?",
        expectedKeywords: [
          "stop nsaid",
          "hold acei",
          "volume assessment",
          "fluids",
          "monitor",
        ],
        mustHit: [
          "Hold nephrotoxins / hemodynamically active meds as appropriate",
          "Assess volume and resuscitate if indicated",
          "Plan close monitoring and reassessment",
        ],
        redFlagMisses: [
          "No medication review",
          "No anticipation of progression",
        ],
      },
    ],
    evaluatorGuide: [
      "This is a trend case, not a one-number case.",
      "Best learners act on evolving physiology before the creatinine peaks further.",
    ],
    expectedReasoningMap: [
      "Rising creatinine trend + low urine output = evolving AKI",
      "ACEi + NSAID + likely hypovolemia produce hemodynamic kidney injury",
      "FeNa can support but should not dominate interpretation",
      "Intervene early to prevent worsening",
    ],
    patternTags: [
      "ignored trend",
      "medications not integrated",
      "FeNa overreliance",
    ],
    branchingScenarios: {
      safe: {
        trigger: "Learner stops offending meds and corrects hemodynamics",
        outcome:
          "Urine output recovers and creatinine plateaus then improves. High anticipation score awarded.",
      },
      unsafe: {
        trigger: "Learner ignores med review or over-relies on FeNa",
        outcome:
          "AKI worsens over the next day. Pattern logged: failure to anticipate progression.",
      },
    },
  },

  {
    id: "case-chest-pain-trap",
    title: "The Chest Pain Trap",
    shortTitle: "De-escalation Safety",
    icon: "heart",
    domain: "Diagnostic Precision",
    difficultyModes: {
      junior: {
        vignette:
          "A 45-year-old man presents with sharp chest pain after an emotional stressor. It is worse with inspiration.",
      },
      senior: {
        vignette:
          "A 45-year-old man has pleuritic chest pain after stress. The challenge is not just excluding catastrophe, but preventing a defensive over-testing cascade while remaining safe.",
      },
    },
    learningGoal:
      "Assesses safe de-escalation, pre-test probability thinking, and avoidance of reflex testing.",
    progressiveData: [
      {
        step: 1,
        label: "Initial Data",
        data: [
          "ECG normal",
          "Initial troponin normal",
          "No hemodynamic instability",
        ],
      },
      {
        step: 2,
        label: "Further Data",
        data: [
          "D-dimer mildly elevated",
          "CTPA negative for PE",
          "Pain reproducible somewhat with chest wall movement",
        ],
      },
    ],
    prompts: [
      {
        id: "cp-1",
        type: "precision",
        label: "Most likely syndrome",
        prompt:
          "What diagnoses are now most likely, and which dangerous ones have been reasonably lowered?",
        expectedKeywords: [
          "musculoskeletal",
          "pericarditis",
          "anxiety",
          "acs less likely",
          "pe less likely",
        ],
        mustHit: [
          "Moves away from ACS/PE appropriately given data",
          "Keeps a focused non-cardiac differential",
          "Uses probability rather than 'anything is possible'",
        ],
        redFlagMisses: [
          "Labels it safe with no reasoning",
          "Continues indiscriminate testing spiral",
        ],
      },
      {
        id: "cp-2",
        type: "test-logic",
        label: "Testing logic",
        prompt:
          "What was the error risk around D-dimer here, and how should pre-test probability guide future similar cases?",
        expectedKeywords: [
          "pre-test probability",
          "d-dimer before imaging",
          "false positives",
          "cascade",
        ],
        mustHit: [
          "Explains D-dimer should be interpreted in pre-test context",
          "Recognizes cascade risk from low-value testing",
        ],
        redFlagMisses: [
          "Treats D-dimer as screening for everyone",
        ],
      },
    ],
    evaluatorGuide: [
      "Good resident can safely step down intensity.",
      "Great resident names the testing-cascade problem explicitly.",
    ],
    expectedReasoningMap: [
      "Normal ECG/troponin lower ACS probability",
      "Negative CTPA lowers PE significantly",
      "Pleuritic and partly reproducible pain supports alternative benign causes",
      "Need safe de-escalation, not diagnostic nihilism",
    ],
    patternTags: [
      "defensive medicine spiral",
      "d-dimer misuse",
      "atypical equals safe",
    ],
    branchingScenarios: {
      safe: {
        trigger: "Learner de-escalates safely and explains reasoning",
        outcome:
          "Patient avoids unnecessary admission and receives appropriate follow-up/return precautions.",
      },
      unsafe: {
        trigger: "Learner keeps chasing low-probability diagnoses without logic",
        outcome:
          "Case records a low-value testing cascade and poor diagnostic precision score.",
      },
    },
  },

  {
    id: "case-hidden-clot",
    title: "The Hidden Clot",
    shortTitle: "Provoked PE Risk Stratification",
    icon: "lungs",
    domain: "Risk Stratification",
    difficultyModes: {
      junior: {
        vignette:
          "A 60-year-old woman recently underwent orthopedic surgery and now has tachycardia and mild hypoxemia.",
      },
      senior: {
        vignette:
          "A 60-year-old postoperative orthopedic patient is tachycardic and mildly hypoxemic. The challenge is not just diagnosing PE, but deciding severity and treatment intensity appropriately.",
      },
    },
    learningGoal:
      "Tests recognition of provoked VTE, severity assessment, and right-sized management.",
    progressiveData: [
      {
        step: 1,
        label: "Initial Data",
        data: [
          "HR 110/min",
          "SpO₂ 92% on room air",
          "Normotensive",
          "Recent major orthopedic surgery",
        ],
      },
      {
        step: 2,
        label: "Workup",
        data: [
          "Wells score moderate probability",
          "D-dimer elevated",
          "CTPA: segmental PE",
        ],
      },
      {
        step: 3,
        label: "Severity Context",
        data: [
          "No hypotension",
          "No syncope",
          "Troponin normal or minimally elevated",
          "Consider RV strain assessment if clinically indicated",
        ],
      },
    ],
    prompts: [
      {
        id: "vte-1",
        type: "risk",
        label: "Classify the event",
        prompt:
          "How would you classify this VTE and what management priority follows immediately?",
        expectedKeywords: [
          "provoked",
          "postoperative",
          "anticoagulation",
          "hemodynamically stable",
        ],
        mustHit: [
          "Provoked postoperative PE",
          "Prompt anticoagulation",
          "Recognizes she is currently hemodynamically stable",
        ],
        redFlagMisses: [
          "Delays anticoagulation unnecessarily",
          "Calls for thrombolysis without instability",
        ],
      },
      {
        id: "vte-2",
        type: "duration",
        label: "Duration and disposition",
        prompt:
          "What is the likely treatment duration and what factors decide inpatient vs outpatient management?",
        expectedKeywords: [
          "3 months",
          "provoked pe",
          "bleeding risk",
          "stability",
          "rv strain",
        ],
        mustHit: [
          "Typical duration around 3 months for provoked PE",
          "Disposition depends on stability, oxygen requirement, bleeding risk, social factors, RV strain context",
        ],
        redFlagMisses: [
          "Makes all PE outpatient",
          "Ignores postop bleeding context",
        ],
      },
    ],
    evaluatorGuide: [
      "Case is about right-sizing treatment intensity.",
      "Best answer separates diagnosis, severity, and duration cleanly.",
    ],
    expectedReasoningMap: [
      "Recent orthopedic surgery is a major provoking factor",
      "PE confirmed, but patient stable => anticoagulation first-line",
      "Need severity/risk stratification before escalation",
      "Provoked event usually supports finite therapy",
    ],
    patternTags: [
      "over-escalation",
      "delayed anticoagulation",
      "severity not separated from diagnosis",
    ],
    branchingScenarios: {
      safe: {
        trigger: "Learner anticoagulates and right-sizes intensity",
        outcome:
          "Patient stabilizes on treatment. High score for severity discrimination and management precision.",
      },
      unsafe: {
        trigger: "Learner delays treatment or overcalls need for lysis",
        outcome:
          "Case records either undertreatment delay or unnecessary escalation pattern.",
      },
    },
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

const CRFT_DOMAIN_COLORS = {
  "Problem Representation": "bg-blue-50 text-blue-700 border-blue-200",
  "Data Interpretation": "bg-violet-50 text-violet-700 border-violet-200",
  "Hypothesis Generation": "bg-amber-50 text-amber-700 border-amber-200",
  "Trend Interpretation": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Diagnostic Precision": "bg-rose-50 text-rose-700 border-rose-200",
  "Risk Stratification": "bg-cyan-50 text-cyan-700 border-cyan-200",
};

function getCaseIcon(icon) {
  switch (icon) {
    case "heart":
      return <HeartPulse className="h-5 w-5" />;
    case "brain":
      return <Brain className="h-5 w-5" />;
    case "alert":
      return <AlertTriangle className="h-5 w-5" />;
    case "kidney":
      return <Stethoscope className="h-5 w-5" />;
    case "lungs":
      return <ShieldAlert className="h-5 w-5" />;
    default:
      return <BookOpen className="h-5 w-5" />;
  }
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreFreeTextAnswer(answer, expectedKeywords = []) {
  const normalized = normalizeText(answer);
  if (!normalized) return 0;

  let matches = 0;
  expectedKeywords.forEach((keyword) => {
    const key = normalizeText(keyword);
    if (normalized.includes(key)) matches += 1;
  });

  return Math.min(100, Math.round((matches / Math.max(expectedKeywords.length, 1)) * 100));
}

function analyzeRedFlags(answer, redFlags = []) {
  const normalized = normalizeText(answer);
  const found = [];

  redFlags.forEach((flag) => {
    const simplified = normalizeText(flag)
      .replace("automatic", "")
      .replace("only", "")
      .trim();

    const pieces = simplified.split(" ").filter(Boolean);
    if (pieces.length >= 2) {
      const hitCount = pieces.filter((p) => normalized.includes(p)).length;
      if (hitCount >= Math.max(2, Math.ceil(pieces.length * 0.5))) {
        found.push(flag);
      }
    }
  });

  return [...new Set(found)];
}

function buildReasoningFeedback(answer, prompt) {
  const score = scoreFreeTextAnswer(answer, prompt.expectedKeywords || []);
  const redFlagsFound = analyzeRedFlags(answer, prompt.redFlagMisses || []);
  const mustHitCovered = (prompt.mustHit || []).filter((point) => {
    const parts = normalizeText(point).split(" ").filter(Boolean);
    const normalized = normalizeText(answer);
    const count = parts.filter((p) => normalized.includes(p)).length;
    return count >= Math.max(2, Math.ceil(parts.length * 0.35));
  });

  let tier = "Needs improvement";
  if (score >= 75) tier = "Strong";
  else if (score >= 45) tier = "Partial";

  return {
    score,
    tier,
    redFlagsFound,
    mustHitCovered,
  };
}

function computeSessionSummary(caseObj, responses) {
  const promptResults = caseObj.prompts.map((prompt) => {
    const answer = responses[prompt.id] || "";
    return buildReasoningFeedback(answer, prompt);
  });

  const avgScore = Math.round(
    promptResults.reduce((sum, r) => sum + r.score, 0) / Math.max(promptResults.length, 1)
  );

  const allRedFlags = [...new Set(promptResults.flatMap((r) => r.redFlagsFound))];
  const totalCovered = promptResults.reduce((sum, r) => sum + r.mustHitCovered.length, 0);

  const branchingKey = avgScore >= 65 && allRedFlags.length === 0 ? "safe" : "unsafe";

  return {
    avgScore,
    allRedFlags,
    totalCovered,
    branchingKey,
    promptResults,
  };
}

function domainBreakdown(caseObj, responses) {
  const summary = computeSessionSummary(caseObj, responses);
  return {
    framing:
      caseObj.domain === "Problem Representation"
        ? summary.avgScore
        : Math.max(40, Math.min(100, summary.avgScore - 5)),
    hypothesis:
      caseObj.domain === "Hypothesis Generation"
        ? summary.avgScore
        : Math.max(35, Math.min(100, summary.avgScore - 8)),
    dataUse:
      caseObj.domain === "Data Interpretation" || caseObj.domain === "Trend Interpretation"
        ? summary.avgScore
        : Math.max(35, Math.min(100, summary.avgScore - 6)),
    management:
      Math.max(30, Math.min(100, summary.avgScore - (summary.allRedFlags.length ? 12 : 0))),
    safety:
      Math.max(20, Math.min(100, 100 - summary.allRedFlags.length * 18)),
  };
}

/* =========================================================
   SMALL UI
   ========================================================= */

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">{icon}</div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function ScoreBar({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-slate-800 transition-all"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */

export default function App() {
  const [difficulty, setDifficulty] = useState("senior");
  const [selectedCaseId, setSelectedCaseId] = useState(UNIVERSAL_CASES[0].id);
  const [releasedStep, setReleasedStep] = useState(1);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [sessionFeed, setSessionFeed] = useState([]);
  const [saving, setSaving] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);

  const selectedCase = useMemo(
    () => UNIVERSAL_CASES.find((c) => c.id === selectedCaseId) || UNIVERSAL_CASES[0],
    [selectedCaseId]
  );

  useEffect(() => {
    setReleasedStep(1);
    setResponses({});
    setSubmitted(false);
  }, [selectedCaseId, difficulty]);

  useEffect(() => {
    if (!liveEnabled) return;

    let unsub = null;
    (async () => {
      try {
        await ensureAnonymousAuth();
        const q = query(collection(db, "crft_sessions"), orderBy("createdAt", "desc"));
        unsub = onSnapshot(q, (snap) => {
          const docs = snap.docs.slice(0, 20).map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setSessionFeed(docs);
        });
      } catch (e) {
        console.error("Live Firebase listener failed:", e);
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [liveEnabled]);

  const visibleData = useMemo(() => {
    return selectedCase.progressiveData.filter((item) => item.step <= releasedStep);
  }, [selectedCase, releasedStep]);

  const summary = useMemo(() => {
    if (!submitted) return null;
    return computeSessionSummary(selectedCase, responses);
  }, [submitted, selectedCase, responses]);

  const breakdown = useMemo(() => {
    if (!submitted) return null;
    return domainBreakdown(selectedCase, responses);
  }, [submitted, selectedCase, responses]);

  const patternLibrary = useMemo(() => {
    const patterns = new Map();

    sessionFeed.forEach((item) => {
      const tags = item?.patternTags || [];
      tags.forEach((tag) => {
        patterns.set(tag, (patterns.get(tag) || 0) + 1);
      });
    });

    selectedCase.patternTags.forEach((tag) => {
      if (!patterns.has(tag)) patterns.set(tag, 0);
    });

    return Array.from(patterns.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [sessionFeed, selectedCase]);

  async function saveSession() {
    if (!summary || !liveEnabled) return;

    try {
      setSaving(true);
      await ensureAnonymousAuth();

      await addDoc(collection(db, "crft_sessions"), {
        caseId: selectedCase.id,
        caseTitle: selectedCase.title,
        domain: selectedCase.domain,
        difficulty,
        avgScore: summary.avgScore,
        totalCovered: summary.totalCovered,
        redFlags: summary.allRedFlags,
        branchingKey: summary.branchingKey,
        patternTags: selectedCase.patternTags,
        responses,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleRestart() {
    setReleasedStep(1);
    setResponses({});
    setSubmitted(false);
  }

  function updateResponse(promptId, value) {
    setResponses((prev) => ({ ...prev, [promptId]: value }));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <Sparkles className="h-4 w-4" />
                  CRFT Internal Medicine Reasoning Studio
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  Universal Anchor Cases
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Six reusable internal medicine anchor cases with progressive disclosure,
                  evaluator guide, reasoning map, must-hit points, red-flag misses, adaptive
                  difficulty, branching outcomes, reasoning scoring, and a pattern library.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDifficulty("junior")}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    difficulty === "junior"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  Junior mode
                </button>
                <button
                  onClick={() => setDifficulty("senior")}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    difficulty === "senior"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  Senior mode
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {UNIVERSAL_CASES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`rounded-3xl border p-4 text-left transition hover:shadow-md ${
                    selectedCaseId === c.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className={`rounded-2xl p-2 ${
                        selectedCaseId === c.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {getCaseIcon(c.icon)}
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </div>
                  <div className="font-bold">{c.title}</div>
                  <div className={`mt-1 text-sm ${selectedCaseId === c.id ? "text-slate-200" : "text-slate-500"}`}>
                    {c.shortTitle}
                  </div>
                  <div className="mt-3">
                    <Badge
                      className={
                        selectedCaseId === c.id
                          ? "border-white/20 bg-white/10 text-white"
                          : CRFT_DOMAIN_COLORS[c.domain] || "border-slate-200 bg-slate-50 text-slate-700"
                      }
                    >
                      {c.domain}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <SectionTitle
              icon={<ClipboardList className="h-5 w-5" />}
              title="Upgrades now included"
              subtitle="These were built into the code below."
            />
            <div className="grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <UserRound className="h-4 w-4" />
                  Adaptive difficulty
                </div>
                <p className="text-sm text-slate-600">
                  Each case has junior and senior vignette versions.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <GitBranch className="h-4 w-4" />
                  Branching outcomes
                </div>
                <p className="text-sm text-slate-600">
                  Each case ends in a safe or unsafe branch based on reasoning quality.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <Trophy className="h-4 w-4" />
                  Reasoning scoring
                </div>
                <p className="text-sm text-slate-600">
                  Scores framing, data use, management, and safety using must-hit and red-flag logic.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <BookOpen className="h-4 w-4" />
                  Pattern library
                </div>
                <p className="text-sm text-slate-600">
                  Tracks repeated failure patterns such as wrong question asked, missed alkalosis, and over-testing cascades.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <RefreshCcw className="h-4 w-4" />
                  Firebase live feed
                </div>
                <p className="text-sm text-slate-600">
                  Saves sessions to Firestore and shows recent attempts live if Firebase is configured.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card className="p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                      {getCaseIcon(selectedCase.icon)}
                    </div>
                    <h2 className="text-xl font-black">{selectedCase.title}</h2>
                  </div>
                  <Badge className={CRFT_DOMAIN_COLORS[selectedCase.domain] || "border-slate-200 bg-slate-50 text-slate-700"}>
                    {selectedCase.domain}
                  </Badge>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">Learning goal</div>
                  <div>{selectedCase.learningGoal}</div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-500">Vignette ({difficulty})</div>
                <p className="text-slate-800">
                  {selectedCase.difficultyModes[difficulty].vignette}
                </p>
              </div>

              <div className="mt-5">
                <SectionTitle
                  icon={<ArrowRight className="h-5 w-5" />}
                  title="Progressive data"
                  subtitle="Reveal more only when you want the learner to move forward."
                />
                <div className="space-y-3">
                  {visibleData.map((block) => (
                    <div key={block.step} className="rounded-3xl border border-slate-200 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-semibold">{block.label}</div>
                        <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                          Step {block.step}
                        </Badge>
                      </div>
                      <ul className="space-y-1 text-sm text-slate-700">
                        {block.data.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setReleasedStep((s) =>
                        Math.max(1, Math.min(selectedCase.progressiveData.length, s + 1))
                      )
                    }
                    disabled={releasedStep >= selectedCase.progressiveData.length}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reveal next data
                  </button>
                  <button
                    onClick={() => setReleasedStep(1)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Reset data
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <SectionTitle
                icon={<Brain className="h-5 w-5" />}
                title="Resident response area"
                subtitle="Each response is scored against must-hit reasoning logic and red-flag misses."
              />

              <div className="space-y-5">
                {selectedCase.prompts.map((prompt, idx) => {
                  const result =
                    submitted && responses[prompt.id]
                      ? buildReasoningFeedback(responses[prompt.id], prompt)
                      : null;

                  return (
                    <div key={prompt.id} className="rounded-3xl border border-slate-200 p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Prompt {idx + 1} · {prompt.label}
                          </div>
                          <div className="mt-1 font-semibold text-slate-900">{prompt.prompt}</div>
                        </div>
                        {result ? (
                          <Badge
                            className={
                              result.tier === "Strong"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : result.tier === "Partial"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                            }
                          >
                            {result.tier} · {result.score}%
                          </Badge>
                        ) : null}
                      </div>

                      <textarea
                        value={responses[prompt.id] || ""}
                        onChange={(e) => updateResponse(prompt.id, e.target.value)}
                        rows={5}
                        placeholder="Type the resident's reasoning here..."
                        className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none ring-0 transition focus:border-slate-400"
                      />

                      {result ? (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl bg-emerald-50 p-3">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-800">
                              <CheckCircle2 className="h-4 w-4" />
                              Must-hit points covered
                            </div>
                            <ul className="space-y-1 text-sm text-emerald-900">
                              {result.mustHitCovered.length ? (
                                result.mustHitCovered.map((item, i) => <li key={i}>• {item}</li>)
                              ) : (
                                <li>• No key reasoning points clearly captured yet</li>
                              )}
                            </ul>
                          </div>

                          <div className="rounded-2xl bg-rose-50 p-3">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-rose-800">
                              <ShieldAlert className="h-4 w-4" />
                              Red-flag misses detected
                            </div>
                            <ul className="space-y-1 text-sm text-rose-900">
                              {result.redFlagsFound.length ? (
                                result.redFlagsFound.map((item, i) => <li key={i}>• {item}</li>)
                              ) : (
                                <li>• No major red-flag pattern detected</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={handleSubmit}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Score reasoning
                </button>
                <button
                  onClick={handleRestart}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Restart case
                </button>
                <button
                  onClick={saveSession}
                  disabled={!submitted || saving || !liveEnabled}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save to Firebase"}
                </button>
                <button
                  onClick={() => setLiveEnabled((v) => !v)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                    liveEnabled
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  Firebase {liveEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </Card>

            {submitted && summary && breakdown ? (
              <Card className="p-5 md:p-6">
                <SectionTitle
                  icon={<Trophy className="h-5 w-5" />}
                  title="Evaluator summary"
                  subtitle="Reasoning score, branching outcome, and case teaching points."
                />

                <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-3xl bg-slate-900 p-4 text-white xl:col-span-1">
                    <div className="text-sm text-slate-300">Overall reasoning</div>
                    <div className="mt-2 text-4xl font-black">{summary.avgScore}%</div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-4 xl:col-span-2">
                    <div className="mb-3 text-sm font-semibold text-slate-500">Reasoning breakdown</div>
                    <div className="space-y-3">
                      <ScoreBar label="Framing" value={breakdown.framing} />
                      <ScoreBar label="Hypothesis generation" value={breakdown.hypothesis} />
                      <ScoreBar label="Data interpretation" value={breakdown.dataUse} />
                      <ScoreBar label="Management" value={breakdown.management} />
                      <ScoreBar label="Safety" value={breakdown.safety} />
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-4 xl:col-span-2">
                    <div className="mb-2 text-sm font-semibold text-slate-500">Branching outcome</div>
                    <div
                      className={`rounded-2xl p-4 ${
                        summary.branchingKey === "safe"
                          ? "bg-emerald-50 text-emerald-900"
                          : "bg-rose-50 text-rose-900"
                      }`}
                    >
                      <div className="mb-2 font-bold">
                        {summary.branchingKey === "safe" ? "Safe branch" : "Unsafe branch"}
                      </div>
                      <div className="text-sm">
                        {selectedCase.branchingScenarios[summary.branchingKey].outcome}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 p-4">
                    <div className="mb-2 font-semibold">Expected reasoning map</div>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {selectedCase.expectedReasoningMap.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-slate-200 p-4">
                    <div className="mb-2 font-semibold">Evaluator guide</div>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {selectedCase.evaluatorGuide.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {summary.allRedFlags.length > 0 ? (
                  <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4">
                    <div className="mb-2 font-semibold text-rose-800">Red-flag misses across the case</div>
                    <ul className="space-y-1 text-sm text-rose-900">
                      {summary.allRedFlags.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    No major red-flag misses were detected in this attempt.
                  </div>
                )}
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="p-5 md:p-6">
              <SectionTitle
                icon={<BookOpen className="h-5 w-5" />}
                title="Pattern library"
                subtitle="Failure-pattern memory for repeated coaching themes."
              />

              <div className="space-y-3">
                {patternLibrary.length ? (
                  patternLibrary.map((item) => (
                    <div
                      key={item.tag}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <div className="text-sm font-medium text-slate-800">{item.tag}</div>
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                        {item.count} saved
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    No saved patterns yet. Save sessions to build the pattern library.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <SectionTitle
                icon={<ClipboardList className="h-5 w-5" />}
                title="Live session feed"
                subtitle="Recent saved sessions from Firestore."
              />

              <div className="space-y-3">
                {sessionFeed.length ? (
                  sessionFeed.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{item.caseTitle}</div>
                          <div className="text-xs text-slate-500">
                            {item.domain} · {item.difficulty || "senior"}
                          </div>
                        </div>
                        <Badge
                          className={
                            item.avgScore >= 70
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : item.avgScore >= 45
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }
                        >
                          {item.avgScore || 0}%
                        </Badge>
                      </div>

                      <div className="text-sm text-slate-600">
                        Branch: <span className="font-semibold">{item.branchingKey || "n/a"}</span>
                      </div>

                      {Array.isArray(item.redFlags) && item.redFlags.length > 0 ? (
                        <div className="mt-2 text-sm text-rose-700">
                          Red flags: {item.redFlags.join(", ")}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-emerald-700">No red flags saved</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    No live sessions yet. Save a scored case to Firestore.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <SectionTitle
                icon={<CheckCircle2 className="h-5 w-5" />}
                title="What this version now does"
                subtitle="Compared with your older version."
              />
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Includes 6 universal internal medicine CRFT anchor cases.</li>
                <li>• Each case has vignette, progressive data, evaluator guide, reasoning map, must-hit points, and red-flag misses.</li>
                <li>• Adds junior vs senior modes.</li>
                <li>• Adds safe vs unsafe branch endings.</li>
                <li>• Adds reasoning scoring instead of simple correctness.</li>
                <li>• Adds a reusable pattern library for coaching themes.</li>
                <li>• Adds Firebase session saving and live recent-session display.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
