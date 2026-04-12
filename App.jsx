import React, { useMemo, useState, useEffect } from 'react'

const domains = [
  {
    key: 'problemFraming',
    title: 'Problem Framing',
    levels: {
      1: 'Incorrect or vague question',
      2: 'Symptom description only',
      3: 'Correct clinical question',
      4: 'Reframes independently when stuck',
    },
  },
  {
    key: 'syndromeIdentification',
    title: 'Syndrome Identification',
    levels: {
      1: 'Jumps to diagnosis',
      2: 'Partial physiology',
      3: 'Correct syndrome identified',
      4: 'Integrates multi-system physiology',
    },
  },
  {
    key: 'differentialDiagnosis',
    title: 'Differential Diagnosis',
    levels: {
      1: 'Narrow or premature',
      2: 'Broad but unfocused',
      3: 'Structured and prioritized',
      4: 'Includes dangerous and subtle causes',
    },
  },
  {
    key: 'dataInterpretation',
    title: 'Data Interpretation',
    levels: {
      1: 'Reads numbers only',
      2: 'Basic interpretation',
      3: 'Uses trends appropriately',
      4: 'Tests hypotheses with data',
    },
  },
  {
    key: 'anticipation',
    title: 'Anticipation',
    levels: {
      1: 'Reactive only',
      2: 'Limited prediction',
      3: 'Predicts next steps',
      4: 'Prevents complications proactively',
    },
  },
  {
    key: 'reassessment',
    title: 'Reassessment',
    levels: {
      1: 'Static thinking',
      2: 'Adjusts only when told',
      3: 'Self-corrects',
      4: 'Continuously updates model',
    },
  },
]

const initialScores = {
  problemFraming: 3,
  syndromeIdentification: 3,
  differentialDiagnosis: 3,
  dataInterpretation: 3,
  anticipation: 3,
  reassessment: 3,
}

function getGlobalRating(total) {
  if (total <= 9) return 'Junior'
  if (total <= 15) return 'Intermediate'
  if (total <= 20) return 'Senior'
  return 'Near Consultant'
}

export default function App() {
  const [resident, setResident] = useState('')
  const [evaluator, setEvaluator] = useState('')
  const [rotation, setRotation] = useState('')
  const [caseName, setCaseName] = useState('')
  const [scores, setScores] = useState(initialScores)
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')

  // 🔵 LOAD FROM LOCAL STORAGE
  useEffect(() => {
    const saved = localStorage.getItem('rubricData')
    if (saved) {
      const data = JSON.parse(saved)
      setResident(data.resident || '')
      setEvaluator(data.evaluator || '')
      setRotation(data.rotation || '')
      setCaseName(data.caseName || '')
      setScores(data.scores || initialScores)
      setStrengths(data.strengths || '')
      setImprovements(data.improvements || '')
    }
  }, [])

  // 🔵 SAVE TO LOCAL STORAGE
  useEffect(() => {
    const data = {
      resident,
      evaluator,
      rotation,
      caseName,
      scores,
      strengths,
      improvements,
    }
    localStorage.setItem('rubricData', JSON.stringify(data))
  }, [resident, evaluator, rotation, caseName, scores, strengths, improvements])

  const total = useMemo(() => {
    return Object.values(scores).reduce((sum, value) => sum + Number(value), 0)
  }, [scores])

  const globalRating = getGlobalRating(total)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Resident Assessment Rubric</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        Consultant-style clinical reasoning assessment tool
      </p>

      {/* 🔵 BUTTONS */}
      <div style={{ marginTop: 10 }}>
        <button
          onClick={() => {
            localStorage.removeItem('rubricData')
            window.location.reload()
          }}
          style={{
            padding: '8px 12px',
            background: '#e11d48',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            marginRight: 10,
          }}
        >
          Reset
        </button>

        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 12px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 6,
          }}
        >
          Print / Save PDF
        </button>
      </div>

      {/* 🔵 INPUTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 24 }}>
        <div>
          <label><strong>Resident</strong></label>
          <input value={resident} onChange={(e) => setResident(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </div>

        <div>
          <label><strong>Evaluator</strong></label>
          <input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </div>

        <div>
          <label><strong>Rotation</strong></label>
          <input value={rotation} onChange={(e) => setRotation(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </div>

        <div>
          <label><strong>Case</strong></label>
          <input value={caseName} onChange={(e) => setCaseName(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </div>
      </div>

      {/* 🔵 SCORE SUMMARY */}
      <div style={{ marginTop: 24, padding: 16, border: '1px solid #ddd', borderRadius: 10, background: '#fafafa' }}>
        <strong>Total Score:</strong> {total} / 24
        <div style={{ marginTop: 8 }}>
          <strong>Global Rating:</strong> {globalRating}
        </div>
      </div>

      {/* 🔵 DOMAINS */}
      <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
        {domains.map((domain) => (
          <div key={domain.key} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{domain.title}</h3>

            <select
              value={scores[domain.key]}
              onChange={(e) =>
                setScores((prev) => ({
                  ...prev,
                  [domain.key]: Number(e.target.value),
                }))
              }
              style={{ width: '100%', padding: 10, marginTop: 8 }}
            >
              {[1, 2, 3, 4].map((level) => (
                <option key={level} value={level}>
                  {level} - {domain.levels[level]}
                </option>
              ))}
            </select>

            <p style={{ marginBottom: 0, marginTop: 10, color: '#444' }}>
              Current level: {domain.levels[scores[domain.key]]}
            </p>
          </div>
        ))}
      </div>

      {/* 🔵 TEXT AREAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
        <div>
          <label><strong>Strengths</strong></label>
          <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={6} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </div>

        <div>
          <label><strong>Improvement Priorities</strong></label>
          <textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={6} style={{ width: '100%', padding: 10, marginTop: 6 }} />
        </div>
      </div>
    </div>
  )
}
