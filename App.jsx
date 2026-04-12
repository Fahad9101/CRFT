import React, { useEffect, useMemo, useState } from 'react';

const RUBRIC = [
  {
    key: 'problem_framing',
    title: 'Problem Framing',
    levels: {
      1: 'Incorrect or vague question',
      2: 'Symptom description only',
      3: 'Correct clinical question',
      4: 'Reframes independently when stuck',
    },
  },
  {
    key: 'syndrome_identification',
    title: 'Syndrome Identification',
    levels: {
      1: 'Jumps to diagnosis',
      2: 'Partial physiology',
      3: 'Correct syndrome identified',
      4: 'Integrates multi-system physiology',
    },
  },
  {
    key: 'differential_diagnosis',
    title: 'Differential Diagnosis',
    levels: {
      1: 'Narrow or premature',
      2: 'Broad but unfocused',
      3: 'Structured and prioritized',
      4: 'Includes dangerous and subtle causes',
    },
  },
  {
    key: 'data_interpretation',
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
];

const FEEDBACK_LIBRARY = [
  'You are answering the wrong question.',
  'Good. Now go one layer deeper.',
  'What does not fit your diagnosis?',
  'You gave me a label, not physiology.',
  'What are you worried about missing?',
  'Predict tomorrow.',
  'What changed in the last 24 hours?',
  'Why this patient, and why today?',
];

const defaultScores = Object.fromEntries(RUBRIC.map((item) => [item.key, '3']));

function classify(total) {
  if (total <= 9) return { label: 'Junior', desc: 'Reactive, fragmented' };
  if (total <= 15) return { label: 'Intermediate', desc: 'Structured but inconsistent' };
  if (total <= 20) return { label: 'Senior', desc: 'Organized, mostly predictive' };
  return { label: 'Near Consultant', desc: 'Integrated, anticipatory' };
}

function toCsv(rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(escape).join(',')).join('\n');
}

function Card({ title, subtitle, children, right }) {
  return (
    <section className="card">
      {(title || subtitle || right) && (
        <div className="card-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {right && <div>{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

function Badge({ children, tone = 'default' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function App() {
  const [evaluator, setEvaluator] = useState('');
  const [resident, setResident] = useState('');
  const [level, setLevel] = useState('');
  const [rotation, setRotation] = useState('');
  const [caseName, setCaseName] = useState('');
  const [scores, setScores] = useState(defaultScores);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [plan, setPlan] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('records');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('resident-rubric-records-v1');
      if (raw) setRecords(JSON.parse(raw));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('resident-rubric-records-v1', JSON.stringify(records));
    } catch (error) {
      console.error(error);
    }
  }, [records]);

  const total = useMemo(
    () => Object.values(scores).reduce((sum, value) => sum + Number(value), 0),
    [scores]
  );
  const max = RUBRIC.length * 4;
  const percent = Math.round((total / max) * 100);
  const performance = classify(total);

  const strengthsList = RUBRIC.filter((item) => Number(scores[item.key]) >= 3).map((item) => item.title);
  const needsList = RUBRIC.filter((item) => Number(scores[item.key]) <= 2).map((item) => item.title);

  function toggleFeedback(item) {
    setSelectedFeedback((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function resetForm() {
    setEvaluator('');
    setResident('');
    setLevel('');
    setRotation('');
    setCaseName('');
    setScores(defaultScores);
    setStrengths('');
    setImprovements('');
    setPlan('');
    setSelectedFeedback([]);
  }

  function buildRecord() {
    return {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      evaluator,
      resident,
      level,
      rotation,
      caseName,
      scores,
      total,
      percent,
      performance,
      strengths,
      improvements,
      plan,
      selectedFeedback,
    };
  }

  function saveRecord() {
    setRecords((prev) => [buildRecord(), ...prev]);
  }

  function exportCsv() {
    const rows = [
      [
        'Date', 'Evaluator', 'Resident', 'Level', 'Rotation', 'Case',
        ...RUBRIC.map((item) => item.title),
        'Total', 'Percent', 'Global Rating', 'Strengths', 'Improvements', 'Action Plan', 'Feedback Phrases'
      ],
      ...records.map((record) => [
        new Date(record.createdAt).toLocaleString(),
        record.evaluator,
        record.resident,
        record.level,
        record.rotation,
        record.caseName,
        ...RUBRIC.map((item) => record.scores[item.key]),
        record.total,
        record.percent,
        record.performance.label,
        record.strengths,
        record.improvements,
        record.plan,
        (record.selectedFeedback || []).join(' | '),
      ]),
    ];

    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resident_assessment_records.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareSummary() {
    const text = `Resident Assessment\nResident: ${resident || '-'}\nCase: ${caseName || '-'}\nScore: ${total}/${max} (${percent}%)\nGlobal: ${performance.label} — ${performance.desc}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Resident Assessment', text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert('Summary copied to clipboard.');
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="app-shell">
      <div className="container">
        <header className="hero">
          <div>
            <h1>Resident Assessment Rubric</h1>
            <p>Free clinical reasoning assessment tool for rounds, academic half day, and structured feedback.</p>
          </div>
          <div className="hero-actions">
            <button className="btn btn-secondary" onClick={resetForm}>Reset</button>
            <button className="btn btn-secondary" onClick={saveRecord}>Save</button>
            <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
            <button className="btn" onClick={shareSummary}>Share</button>
          </div>
        </header>

        <div className="grid-main">
          <div className="left-col">
            <Card title="Assessment Form" subtitle="Score each domain from 1 to 4, then capture focused feedback.">
              <div className="field-grid top-fields">
                <label>
                  <span>Evaluator</span>
                  <input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} placeholder="Consultant name" />
                </label>
                <label>
                  <span>Resident</span>
                  <input value={resident} onChange={(e) => setResident(e.target.value)} placeholder="Resident name" />
                </label>
                <label>
                  <span>Training Level</span>
                  <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="R1 / R2 / R3 / R4" />
                </label>
                <label>
                  <span>Rotation</span>
                  <input value={rotation} onChange={(e) => setRotation(e.target.value)} placeholder="CTU / Consult / Ward" />
                </label>
                <label>
                  <span>Case</span>
                  <input value={caseName} onChange={(e) => setCaseName(e.target.value)} placeholder="Hyponatremia, AKI..." />
                </label>
              </div>

              <div className="domain-grid">
                {RUBRIC.map((domain) => (
                  <div className="domain-card" key={domain.key}>
                    <h3>{domain.title}</h3>
                    <select
                      value={scores[domain.key]}
                      onChange={(e) => setScores((prev) => ({ ...prev, [domain.key]: e.target.value }))}
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option value={String(n)} key={n}>{n} — {domain.levels[n]}</option>
                      ))}
                    </select>
                    <div className="current-level">{domain.levels[scores[domain.key]]}</div>
                  </div>
                ))}
              </div>

              <div className="field-grid notes-grid">
                <label>
                  <span>Strengths</span>
                  <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="What the resident did well" rows="6" />
                </label>
                <label>
                  <span>Improvement Priorities</span>
                  <textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder="What needs to improve next" rows="6" />
                </label>
                <label>
                  <span>Action Plan</span>
                  <textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="One or two concrete next steps" rows="6" />
                </label>
              </div>
            </Card>
          </div>

          <div className="right-col">
            <Card title="Live Summary" subtitle="Quick global snapshot for feedback.">
              <div className="score-row">
                <span>Score</span>
                <strong>{total}/{max}</strong>
              </div>
              <div className="progress-wrap"><div className="progress-bar" style={{ width: `${percent}%` }} /></div>
              <div className="badge-row">
                <Badge>{percent}%</Badge>
                <Badge tone="dark">{performance.label}</Badge>
              </div>
              <div className="summary-box">{performance.desc}</div>
              <div className="stack">
                <div>
                  <div className="section-label">High-scoring domains</div>
                  <div className="badge-row wrap">{strengthsList.length ? strengthsList.map((item) => <Badge key={item}>{item}</Badge>) : <span className="muted">None yet</span>}</div>
                </div>
                <div>
                  <div className="section-label">Needs attention</div>
                  <div className="badge-row wrap">{needsList.length ? needsList.map((item) => <Badge key={item} tone="warn">{item}</Badge>) : <span className="muted">None yet</span>}</div>
                </div>
              </div>
            </Card>

            <Card title="Feedback Phrase Bank" subtitle="Tap to build a focused feedback set.">
              <div className="feedback-list">
                {FEEDBACK_LIBRARY.map((item) => (
                  <button
                    key={item}
                    className={`pill ${selectedFeedback.includes(item) ? 'pill-active' : ''}`}
                    onClick={() => toggleFeedback(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <textarea readOnly value={selectedFeedback.join('\n')} rows="6" />
            </Card>
          </div>
        </div>

        <Card
          title="Saved Records"
          subtitle="Stored locally in this browser."
          right={<button className="btn btn-secondary" onClick={exportCsv}>Export CSV</button>}
        >
          <div className="tabs">
            <button className={`tab ${activeTab === 'records' ? 'tab-active' : ''}`} onClick={() => setActiveTab('records')}>Records</button>
            <button className={`tab ${activeTab === 'guide' ? 'tab-active' : ''}`} onClick={() => setActiveTab('guide')}>Scoring Guide</button>
          </div>
          {activeTab === 'records' ? (
            records.length === 0 ? (
              <div className="empty">No records saved yet.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Resident</th>
                      <th>Case</th>
                      <th>Score</th>
                      <th>Global</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                        <td>{record.resident || '—'}</td>
                        <td>{record.caseName || '—'}</td>
                        <td>{record.total}/{max}</td>
                        <td>{record.performance.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="guide-grid">
              {RUBRIC.map((domain) => (
                <div className="guide-card" key={domain.key}>
                  <h3>{domain.title}</h3>
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className="guide-level"><strong>Level {level}</strong><span>{domain.levels[level]}</span></div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default App;
