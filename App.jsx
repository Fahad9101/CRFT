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

function getFeedbackPhrases(scores) {
  const phrases = []

  if (scores.problemFraming <= 2) {
    phrases.push('Refine the initial clinical question before moving to the differential.')
  }
  if (scores.syndromeIdentification <= 2) {
    phrases.push('Anchor the discussion in physiology first, then name the syndrome.')
  }
  if (scores.differentialDiagnosis <= 2) {
    phrases.push('Structure the differential by common, dangerous, and treatable causes.')
  }
  if (scores.dataInterpretation <= 2) {
    phrases.push('Use trends and context rather than isolated values.')
  }
  if (scores.anticipation <= 2) {
    phrases.push('Add a prediction step: what is likely to happen in the next 12–24 hours?')
  }
  if (scores.reassessment <= 2) {
    phrases.push('Reassess the working diagnosis actively as new data arrives.')
  }

  const strong = Object.entries(scores)
    .filter(([, value]) => value >= 4)
    .map(([key]) => domains.find((d) => d.key === key)?.title)
    .filter(Boolean)

  if (strong.length > 0) {
    phrases.push(`Particular strength shown in: ${strong.join(', ')}.`)
  }

  if (phrases.length === 0) {
    phrases.push('Good overall structure. Continue deepening anticipation, prioritization, and consultant-level synthesis.')
  }

  return phrases
}

function RadarChart({ scores }) {
  const size = 300
  const center = size / 2
  const radius = 105
  const levels = 4
  const keys = domains.map((d) => d.key)

  const pointsForLevel = (level) => {
    return keys
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2
        const r = (radius * level) / levels
        const x = center + Math.cos(angle) * r
        const y = center + Math.sin(angle) * r
        return `${x},${y}`
      })
      .join(' ')
  }

  const dataPoints = keys
    .map((key, i) => {
      const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2
      const r = (radius * scores[key]) / levels
      const x = center + Math.cos(angle) * r
      const y = center + Math.sin(angle) * r
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[1, 2, 3, 4].map((level) => (
          <polygon
            key={level}
            points={pointsForLevel(level)}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
        ))}

        {keys.map((key, i) => {
          const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2
          const x = center + Math.cos(angle) * radius
          const y = center + Math.sin(angle) * radius
          return (
            <line
              key={key}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#d1d5db"
              strokeWidth="1"
            />
          )
        })}

        <polygon
          points={dataPoints}
          fill="rgba(12, 74, 110, 0.18)"
          stroke="#0c4a6e"
          strokeWidth="2"
        />

        {keys.map((key, i) => {
          const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2
          const r = (radius * scores[key]) / levels
          const x = center + Math.cos(angle) * r
          const y = center + Math.sin(angle) * r
          return <circle key={key} cx={x} cy={y} r="4" fill="#0c4a6e" />
        })}

        {domains.map((domain, i) => {
          const angle = (Math.PI * 2 * i) / domains.length - Math.PI / 2
          const labelRadius = radius + 22
          const x = center + Math.cos(angle) * labelRadius
          const y = center + Math.sin(angle) * labelRadius

          return (
            <text
              key={domain.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="#334155"
            >
              {domain.title.replace(' ', '\n')}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export default function App() {
  const [resident, setResident] = useState('')
  const [evaluator, setEvaluator] = useState('')
  const [rotation, setRotation] = useState('')
  const [caseName, setCaseName] = useState('')
  const [scores, setScores] = useState(initialScores)
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')

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
  const feedbackPhrases = useMemo(() => getFeedbackPhrases(scores), [scores])

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: '0 auto',
        padding: 16,
        fontFamily: 'Arial, sans-serif',
        color: '#0f172a',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0c4a6e, #0f766e)',
          color: 'white',
          borderRadius: 18,
          padding: 18,
          marginBottom: 18,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: 14,
              letterSpacing: 0.4,
            }}
          >
            KFSHRC
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 44px)' }}>
              Resident Assessment Rubric
            </h1>
            <p style={{ margin: '6px 0 0 0', opacity: 0.92, fontSize: 16 }}>
              Consultant-style clinical reasoning tool · KFSHRC-style edition
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => {
            localStorage.removeItem('rubricData')
            window.location.reload()
          }}
          style={{
            padding: '10px 14px',
            background: '#e11d48',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>

        <button
          onClick={() => window.print()}
          style={{
            padding: '10px 14px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Print / Save PDF
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <label><strong>Resident</strong></label>
          <input
            value={resident}
            onChange={(e) => setResident(e.target.value)}
            style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label><strong>Evaluator</strong></label>
          <input
            value={evaluator}
            onChange={(e) => setEvaluator(e.target.value)}
            style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label><strong>Rotation</strong></label>
          <input
            value={rotation}
            onChange={(e) => setRotation(e.target.value)}
            style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label><strong>Case</strong></label>
          <input
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            border: '1px solid #dbe4ee',
            borderRadius: 16,
            padding: 18,
            background: '#f8fafc',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Summary</h2>
          <p style={{ margin: '8px 0' }}><strong>Total Score:</strong> {total} / 24</p>
          <p style={{ margin: '8px 0' }}><strong>Global Rating:</strong> {globalRating}</p>
          <p style={{ margin: '8px 0' }}>
            <strong>Interpretation:</strong>{' '}
            {globalRating === 'Junior' && 'Reactive and fragmented reasoning pattern.'}
            {globalRating === 'Intermediate' && 'Structured thinking is emerging but inconsistent.'}
            {globalRating === 'Senior' && 'Reasoning is organized and mostly predictive.'}
            {globalRating === 'Near Consultant' && 'Integrated, anticipatory, consultant-level reasoning.'}
          </p>
        </div>

        <div
          style={{
            border: '1px solid #dbe4ee',
            borderRadius: 16,
            padding: 18,
            background: '#ffffff',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Performance Radar</h2>
          <RadarChart scores={scores} />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
        {domains.map((domain) => (
          <div
            key={domain.key}
            style={{
              border: '1px solid #dbe4ee',
              borderRadius: 16,
              padding: 16,
              background: '#ffffff',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>{domain.title}</h3>

            <select
              value={scores[domain.key]}
              onChange={(e) =>
                setScores((prev) => ({
                  ...prev,
                  [domain.key]: Number(e.target.value),
                }))
              }
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 10,
                border: '1px solid #cbd5e1',
              }}
            >
              {[1, 2, 3, 4].map((level) => (
                <option key={level} value={level}>
                  {level} - {domain.levels[level]}
                </option>
              ))}
            </select>

            <p style={{ marginTop: 10, marginBottom: 0, color: '#475569' }}>
              Current level: {domain.levels[scores[domain.key]]}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          border: '1px solid #dbe4ee',
          borderRadius: 16,
          padding: 18,
          background: '#f8fafc',
          marginBottom: 18,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Auto-Generated Feedback Phrases</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {feedbackPhrases.map((phrase, index) => (
            <div
              key={index}
              style={{
                padding: 12,
                borderRadius: 10,
                background: 'white',
                border: '1px solid #e2e8f0',
              }}
            >
              {phrase}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <div>
          <label><strong>Strengths</strong></label>
          <textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              borderRadius: 10,
              border: '1px solid #cbd5e1',
            }}
          />
        </div>

        <div>
          <label><strong>Improvement Priorities</strong></label>
          <textarea
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              borderRadius: 10,
              border: '1px solid #cbd5e1',
            }}
          />
        </div>
      </div>
    </div>
  )
}
