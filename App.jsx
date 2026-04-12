import React, { useMemo, useState, useEffect } from 'react'

const domains = [
  {
    key: 'problemFraming',
    title: 'Problem Framing',
    levels: {
      0: 'Not assessed',
      1: 'Incorrect or vague question',
      2: 'Symptom description only',
      3: 'Correct clinical question',
      4: 'Reframes independently when stuck',
    },
    clue: 'define the real clinical question before moving forward.',
  },
  {
    key: 'syndromeIdentification',
    title: 'Syndrome Identification',
    levels: {
      0: 'Not assessed',
      1: 'Jumps to diagnosis',
      2: 'Partial physiology',
      3: 'Correct syndrome identified',
      4: 'Integrates multi-system physiology',
    },
    clue: 'identify the syndrome or physiology before naming the disease.',
  },
  {
    key: 'differentialDiagnosis',
    title: 'Differential Diagnosis',
    levels: {
      0: 'Not assessed',
      1: 'Narrow or premature',
      2: 'Broad but unfocused',
      3: 'Structured and prioritized',
      4: 'Includes dangerous and subtle causes',
    },
    clue: 'structure the differential into common, dangerous, and treatable causes.',
  },
  {
    key: 'dataInterpretation',
    title: 'Data Interpretation',
    levels: {
      0: 'Not assessed',
      1: 'Reads numbers only',
      2: 'Basic interpretation',
      3: 'Uses trends appropriately',
      4: 'Tests hypotheses with data',
    },
    clue: 'use trends and context rather than isolated values.',
  },
  {
    key: 'anticipation',
    title: 'Anticipation',
    levels: {
      0: 'Not assessed',
      1: 'Reactive only',
      2: 'Limited prediction',
      3: 'Predicts next steps',
      4: 'Prevents complications proactively',
    },
    clue: 'predict what will happen next and what to prevent.',
  },
  {
    key: 'reassessment',
    title: 'Reassessment',
    levels: {
      0: 'Not assessed',
      1: 'Static thinking',
      2: 'Adjusts only when told',
      3: 'Self-corrects',
      4: 'Continuously updates model',
    },
    clue: 're-evaluate diagnosis and plan as new data appears.',
  },
]

const initialScores = {
  problemFraming: 0,
  syndromeIdentification: 0,
  differentialDiagnosis: 0,
  dataInterpretation: 0,
  anticipation: 0,
  reassessment: 0,
}

function getGlobalRating(total) {
  if (total === 0) return ''
  if (total <= 9) return 'Junior'
  if (total <= 15) return 'Intermediate'
  if (total <= 20) return 'Senior'
  return 'Near Consultant'
}

function getAutoStrengths(scores) {
  if (Object.values(scores).every((v) => v === 0)) return []

  const strengths = []

  Object.entries(scores).forEach(([key, val]) => {
    if (val >= 3) {
      const domain = domains.find((d) => d.key === key)
      strengths.push(`Good performance in ${domain.title}.`)
    }
  })

  return strengths
}

function getAutoRecommendations(scores) {
  if (Object.values(scores).every((v) => v === 0)) return []

  const recs = []

  Object.entries(scores).forEach(([key, val]) => {
    if (val <= 2 && val > 0) {
      const domain = domains.find((d) => d.key === key)
      recs.push(`Improve ${domain.title.toLowerCase()} by applying structured reasoning.`)
    }
  })

  return recs
}

function RadarChart({ scores }) {
  const size = 300
  const center = size / 2
  const radius = 100
  const keys = domains.map((d) => d.key)

  const points = keys
    .map((key, i) => {
      const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2
      const r = (radius * scores[key]) / 4
      return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`
    })
    .join(' ')

  return (
    <svg width={size} height={size}>
      <polygon points={points} fill="rgba(0,100,150,0.2)" stroke="#0369a1" />
    </svg>
  )
}

export default function App() {
  const [scores, setScores] = useState(initialScores)

  useEffect(() => {
    const saved = localStorage.getItem('rubricData')
    if (saved) setScores(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('rubricData', JSON.stringify(scores))
  }, [scores])

  const total = useMemo(
    () => Object.values(scores).reduce((a, b) => a + b, 0),
    [scores]
  )

  const globalRating = getGlobalRating(total)
  const strengths = getAutoStrengths(scores)
  const recs = getAutoRecommendations(scores)

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 16 }}>
      <h1>Resident Assessment Feedback Tool</h1>

      <button
        onClick={() => setScores(initialScores)}
        style={{ background: 'red', color: 'white', padding: 8 }}
      >
        Reset
      </button>

      <button onClick={() => window.print()} style={{ marginLeft: 10 }}>
        Print
      </button>

      <p>Total: {total}</p>
      <p>{globalRating}</p>

      <RadarChart scores={scores} />

      {domains.map((d) => (
        <div key={d.key} style={{ marginTop: 16 }}>
          <h3>{d.title}</h3>
          <select
            value={scores[d.key]}
            onChange={(e) =>
              setScores({ ...scores, [d.key]: Number(e.target.value) })
            }
          >
            {Object.entries(d.levels).map(([k, v]) => (
              <option key={k} value={k}>
                {k} - {v}
              </option>
            ))}
          </select>

          <div style={{ fontSize: 13, color: '#555' }}>
            <strong>Try to:</strong> {d.clue}
          </div>
        </div>
      ))}

      {strengths.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Strengths</h3>
          {strengths.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      )}

      {recs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Recommendations</h3>
          {recs.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'right', color: 'green', fontSize: 12 }}>
        Developed at KFSHRC-J
      </div>
    </div>
  )
}
