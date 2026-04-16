
import React, { useEffect, useMemo, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import {
  signInResident,
  signInEvaluator,
  logOut,
  watchAuth,
  createEvaluation,
  subscribeEvaluations,
  updateEvaluation,
  removeEvaluation,
} from "./firebase"

const appUrl = "https://fahad9101.github.io/CRFT/"
const appTitle = "CRFT Clinical Reasoning Platform"

const domains = [
  { key: "problemFraming", title: "Problem Framing" },
  { key: "syndromeIdentification", title: "Syndrome Identification" },
  { key: "differentialDiagnosis", title: "Differential Diagnosis" },
  { key: "dataInterpretation", title: "Data Interpretation" },
  { key: "anticipation", title: "Anticipation" },
  { key: "reassessment", title: "Reassessment" },
]

const sampleCases = [
  {
    key: "adhf",
    title: "The Breathless Night",
    setting: "Inpatient",
    category: "Cardio",
    vignette: "68M with CAD presents with dyspnea, orthopnea, crackles, and mild troponin rise.",
  },
  {
    key: "alkalosis",
    title: "The Silent Drop",
    setting: "Inpatient",
    category: "Renal",
    vignette: "55F with vomiting is weak, hypokalemic, and has metabolic alkalosis.",
  },
  {
    key: "delirium",
    title: "The Delirium on Night Shift",
    setting: "Inpatient",
    category: "Neuro",
    vignette: "79M becomes acutely agitated overnight with fluctuating attention and urinary retention.",
  },
  {
    key: "anemia",
    title: "The Tired Clinic Patient",
    setting: "Outpatient",
    category: "Heme",
    vignette: "34F with fatigue, heavy periods, low MCV, and low ferritin.",
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

const initialForm = {
  resident: "",
  evaluator: "",
  rotation: "",
  rotationType: "CTU",
  pgyLevel: "PGY1",
  caseName: "",
  caseCategory: "Cardio",
  caseSource: "Simulation",
  scores: initialScores,
  feedbackNotes: "",
  structuredReasoning: "",
}

function getTotal(scores) {
  return Object.values(scores || {}).reduce((sum, value) => sum + Number(value || 0), 0)
}

function getGlobalRating(total) {
  if (total === 0) return ""
  if (total <= 9) return "Junior"
  if (total <= 15) return "Intermediate"
  if (total <= 20) return "Senior"
  return "Near Consultant"
}

function formatFirebaseDate(ts) {
  if (!ts) return ""
  if (typeof ts?.seconds === "number") {
    return new Date(ts.seconds * 1000).toLocaleString()
  }
  return ""
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function safeLower(value) {
  return String(value || "").trim().toLowerCase()
}

function groupByResident(evaluations) {
  const map = {}
  evaluations.forEach((entry) => {
    const name = entry.resident || "Unknown"
    if (!map[name]) map[name] = []
    map[name].push(entry)
  })
  Object.values(map).forEach((arr) => arr.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)))
  return map
}

function getPriorityRecommendations(scores) {
  const candidates = [
    { key: "problemFraming", text: "Clarify the exact clinical question before naming causes." },
    { key: "syndromeIdentification", text: "Name the syndrome or physiology before jumping to disease labels." },
    { key: "differentialDiagnosis", text: "Prioritize the differential into common, dangerous, and treatable causes." },
    { key: "dataInterpretation", text: "Use trends and context, not isolated data points." },
    { key: "anticipation", text: "State what may happen next and what you must prevent." },
    { key: "reassessment", text: "Show what new data would make you revise your model." },
  ]
  return candidates
    .map((item) => ({ ...item, score: Number(scores?.[item.key] || 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
}

function buildStructuredReasoning(text = "") {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (!cleaned) return ""
  return [
    "1) Problem framing",
    cleaned,
    "",
    "2) Syndrome / physiology",
    "State the likely syndrome before naming the disease.",
    "",
    "3) Differential / priority diagnosis",
    "List the top 2–3 prioritized possibilities.",
    "",
    "4) Data interpretation",
    "Explain how the data supports or weakens each hypothesis.",
    "",
    "5) Anticipation / next steps",
    "State what may happen next and what you will monitor or prevent.",
  ].join("\n")
}

function cardStyle(bg = "#ffffff") {
  return {
    background: bg,
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  }
}

const pageWrap = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: "24px 16px 40px",
  fontFamily: "Arial, sans-serif",
  color: "#0f172a",
}

const container = {
  maxWidth: 1280,
  margin: "0 auto",
}

const hero = {
  background: "linear-gradient(135deg, #0c4a6e, #0f766e)",
  color: "white",
  borderRadius: 24,
  padding: 22,
  marginBottom: 18,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
}

const buttonBase = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 12,
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  marginTop: 6,
  background: "white",
}

function ScoreBadge({ total, rating }) {
  const bg = total >= 21 ? "#065f46" : total >= 16 ? "#0369a1" : total >= 10 ? "#b45309" : "#991b1b"
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: bg, color: "white", fontWeight: 700 }}>
      <span>{total}/24</span>
      <span style={{ opacity: 0.9 }}>·</span>
      <span>{rating || "Unrated"}</span>
    </div>
  )
}

function TopNav({ items, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          style={{
            ...buttonBase,
            background: active === item ? "#0c4a6e" : "#cbd5e1",
            color: active === item ? "white" : "#0f172a",
          }}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function KPIGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {items.map((item) => (
        <div key={item.label} style={cardStyle()}>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>{item.label}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{item.value}</div>
          {item.note ? <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>{item.note}</div> : null}
        </div>
      ))}
    </div>
  )
}

function DomainHeatmap({ avgByDomain }) {
  return (
    <div style={cardStyle()}>
      <h3 style={{ marginTop: 0 }}>Program Cognitive Heatmap</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {domains.map((domain) => {
          const value = Number(avgByDomain?.[domain.key] || 0)
          const bg = value >= 3.2 ? "#dcfce7" : value >= 2.5 ? "#fef3c7" : "#fee2e2"
          const accent = value >= 3.2 ? "#166534" : value >= 2.5 ? "#92400e" : "#991b1b"
          return (
            <div key={domain.key} style={{ background: bg, borderRadius: 14, padding: 12, border: `1px solid ${accent}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ color: accent }}>{domain.title}</strong>
                <strong style={{ color: accent }}>{value.toFixed(2)} / 4</strong>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SimpleTrendChart({ points, title }) {
  const width = 680
  const height = 220
  const padding = 32
  const maxValue = Math.max(24, ...points.map((p) => Number(p.value || 0)))
  const minValue = 0

  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : padding + (index * (width - padding * 2)) / (points.length - 1)
    const y = height - padding - ((Number(point.value || 0) - minValue) / (maxValue - minValue || 1)) * (height - padding * 2)
    return { ...point, x, y }
  })

  const path = coords.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")

  return (
    <div style={cardStyle()}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {points.length === 0 ? (
        <div style={{ color: "#64748b" }}>No data yet.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 240 }}>
            {[0, 6, 12, 18, 24].map((tick) => {
              const y = height - padding - (tick / maxValue) * (height - padding * 2)
              return (
                <g key={tick}>
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" />
                  <text x={8} y={y + 4} fontSize="11" fill="#64748b">{tick}</text>
                </g>
              )
            })}
            <path d={path} fill="none" stroke="#0c4a6e" strokeWidth="3" />
            {coords.map((p) => (
              <g key={p.label}>
                <circle cx={p.x} cy={p.y} r="4.5" fill="#0c4a6e" />
                <text x={p.x} y={height - 8} textAnchor="middle" fontSize="11" fill="#64748b">
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </>
      )}
    </div>
  )
}

function ResidentsAttentionTable({ rows, title = "Residents Needing Attention" }) {
  return (
    <div style={cardStyle()}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {rows.length === 0 ? (
        <div style={{ color: "#64748b" }}>No residents currently flagged.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px 8px" }}>Resident</th>
                <th style={{ padding: "10px 8px" }}>PGY</th>
                <th style={{ padding: "10px 8px" }}>Avg</th>
                <th style={{ padding: "10px 8px" }}>Trend</th>
                <th style={{ padding: "10px 8px" }}>Weakness</th>
                <th style={{ padding: "10px 8px" }}>Flag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 8px" }}>{row.name}</td>
                  <td style={{ padding: "10px 8px" }}>{row.pgyLevel || "—"}</td>
                  <td style={{ padding: "10px 8px" }}>{row.avg.toFixed(1)}</td>
                  <td style={{ padding: "10px 8px", color: row.trend >= 0 ? "#166534" : "#991b1b" }}>
                    {row.trend > 0 ? `+${row.trend.toFixed(1)}` : row.trend.toFixed(1)}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{row.weakestDomain || "—"}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <span style={{ padding: "4px 8px", borderRadius: 999, background: row.flag === "High" ? "#fee2e2" : "#fef3c7", color: row.flag === "High" ? "#991b1b" : "#92400e", fontWeight: 700 }}>
                      {row.flag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AccessCard({ title, subtitle, children, accent = "#0c4a6e" }) {
  return (
    <div style={{ ...cardStyle(), borderTop: `6px solid ${accent}` }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ color: "#475569", marginBottom: 12 }}>{subtitle}</div>
      {children}
    </div>
  )
}

function AssessmentForm({
  form,
  setForm,
  selectedCaseKey,
  setSelectedCaseKey,
  selectedCase,
  editingId,
  onSave,
  onReset,
  userRole,
}) {
  const total = getTotal(form.scores)
  const rating = getGlobalRating(total)
  const priorities = getPriorityRecommendations(form.scores)

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleScore = (field, value) => {
    setForm((prev) => ({
      ...prev,
      scores: { ...prev.scores, [field]: Number(value) },
    }))
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={cardStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>{userRole === "resident" ? "Resident Practice / Self-Review" : "New Assessment"}</h2>
            <div style={{ color: "#64748b", marginTop: 6 }}>
              Capture one case, score the six CRFT domains, and generate leadership-ready data.
            </div>
          </div>
          <ScoreBadge total={total} rating={rating} />
        </div>
      </div>

      <div style={{ ...cardStyle(), display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div>
          <label><strong>Resident</strong></label>
          <input value={form.resident} onChange={(e) => handleField("resident", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label><strong>Evaluator</strong></label>
          <input value={form.evaluator} onChange={(e) => handleField("evaluator", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label><strong>PGY Level</strong></label>
          <select value={form.pgyLevel} onChange={(e) => handleField("pgyLevel", e.target.value)} style={inputStyle}>
            <option>PGY1</option>
            <option>PGY2</option>
            <option>PGY3</option>
            <option>PGY4</option>
          </select>
        </div>
        <div>
          <label><strong>Rotation</strong></label>
          <input value={form.rotation} onChange={(e) => handleField("rotation", e.target.value)} style={inputStyle} placeholder="e.g. GIM block A" />
        </div>
        <div>
          <label><strong>Rotation Type</strong></label>
          <select value={form.rotationType} onChange={(e) => handleField("rotationType", e.target.value)} style={inputStyle}>
            <option>CTU</option>
            <option>ICU</option>
            <option>Consult</option>
            <option>Clinic</option>
            <option>Elective</option>
          </select>
        </div>
        <div>
          <label><strong>Case Source</strong></label>
          <select value={form.caseSource} onChange={(e) => handleField("caseSource", e.target.value)} style={inputStyle}>
            <option>Simulation</option>
            <option>Real</option>
          </select>
        </div>
        <div>
          <label><strong>Case Category</strong></label>
          <select value={form.caseCategory} onChange={(e) => handleField("caseCategory", e.target.value)} style={inputStyle}>
            <option>Cardio</option>
            <option>Renal</option>
            <option>ID</option>
            <option>Neuro</option>
            <option>Resp</option>
            <option>Heme</option>
            <option>Endo</option>
          </select>
        </div>
        <div>
          <label><strong>Universal Case</strong></label>
          <select
            value={selectedCaseKey}
            onChange={(e) => {
              const value = e.target.value
              setSelectedCaseKey(value)
              const found = sampleCases.find((c) => c.key === value)
              if (found) {
                setForm((prev) => ({ ...prev, caseName: found.title, caseCategory: found.category }))
              }
            }}
            style={inputStyle}
          >
            <option value="">None</option>
            {sampleCases.map((item) => (
              <option key={item.key} value={item.key}>{item.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={cardStyle("#f8fafc")}>
        <label><strong>Case Name</strong></label>
        <input value={form.caseName} onChange={(e) => handleField("caseName", e.target.value)} style={inputStyle} />
        {selectedCase ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "white", border: "1px solid #e2e8f0" }}>
            <strong>{selectedCase.title}</strong>
            <div style={{ color: "#64748b", marginTop: 6 }}>{selectedCase.setting} · {selectedCase.category}</div>
            <div style={{ marginTop: 8 }}>{selectedCase.vignette}</div>
          </div>
        ) : null}
      </div>

      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>CRFT Domain Scoring</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {domains.map((domain) => (
            <div key={domain.key} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{domain.title}</div>
              <select
                value={form.scores[domain.key]}
                onChange={(e) => handleScore(domain.key, e.target.value)}
                style={inputStyle}
              >
                <option value={0}>0 - Not assessed</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18 }}>
        <div style={cardStyle()}>
          <label><strong>Feedback Notes</strong></label>
          <textarea
            value={form.feedbackNotes}
            onChange={(e) => handleField("feedbackNotes", e.target.value)}
            style={{ ...inputStyle, minHeight: 130, resize: "vertical" }}
            placeholder="Key feedback, observed reasoning pattern, and what to improve next."
          />
          <div style={{ marginTop: 14 }}>
            <label><strong>Structured Reasoning</strong></label>
            <textarea
              value={form.structuredReasoning}
              onChange={(e) => handleField("structuredReasoning", e.target.value)}
              style={{ ...inputStyle, minHeight: 160, resize: "vertical" }}
              placeholder="Use the resident answer or your note to build a structured reflection."
            />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button
              onClick={() => handleField("structuredReasoning", buildStructuredReasoning(form.feedbackNotes))}
              style={{ ...buttonBase, background: "#0f766e" }}
            >
              Auto-build structured reasoning
            </button>
            <button onClick={onReset} style={{ ...buttonBase, background: "#475569" }}>
              Reset form
            </button>
            <button onClick={onSave} style={{ ...buttonBase, background: "#1d4ed8" }}>
              {editingId ? "Update Assessment" : "Save Assessment"}
            </button>
          </div>
        </div>

        <div style={cardStyle("#f8fafc")}>
          <h3 style={{ marginTop: 0 }}>Priority Coaching Targets</h3>
          {priorities.length === 0 ? (
            <div style={{ color: "#64748b" }}>Add scores to generate coaching priorities.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {priorities.map((item) => (
                <div key={item.key} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
                  <strong>{domains.find((d) => d.key === item.key)?.title}</strong>
                  <div style={{ color: "#475569", marginTop: 6 }}>{item.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResidentHome({ form, setForm, selectedCaseKey, setSelectedCaseKey, selectedCase, onSave, onReset, evaluations, currentUserEmail }) {
  const ownEvaluations = useMemo(
    () => evaluations.filter((e) => safeLower(e.submittedBy) === safeLower(currentUserEmail)),
    [evaluations, currentUserEmail]
  )

  const latestOwn = ownEvaluations[ownEvaluations.length - 1]
  const ownAvg = ownEvaluations.length ? average(ownEvaluations.map((e) => Number(e.total || 0))).toFixed(1) : "0.0"

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <KPIGrid
        items={[
          { label: "My Assessments", value: ownEvaluations.length },
          { label: "My Average Score", value: ownAvg },
          { label: "Latest Rating", value: latestOwn?.globalRating || "—" },
        ]}
      />
      <AssessmentForm
        form={form}
        setForm={setForm}
        selectedCaseKey={selectedCaseKey}
        setSelectedCaseKey={setSelectedCaseKey}
        selectedCase={selectedCase}
        editingId={null}
        onSave={onSave}
        onReset={onReset}
        userRole="resident"
      />
      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>My Recent Entries</h3>
        {ownEvaluations.length === 0 ? (
          <div style={{ color: "#64748b" }}>Your saved entries will appear here.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {[...ownEvaluations].reverse().slice(0, 5).map((entry) => (
              <div key={entry.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{entry.caseName || "Untitled case"}</strong>
                    <div style={{ color: "#64748b", marginTop: 4 }}>{formatFirebaseDate(entry.createdAt)}</div>
                  </div>
                  <ScoreBadge total={Number(entry.total || 0)} rating={entry.globalRating || ""} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EvaluatorHome({ evaluations, form, setForm, selectedCaseKey, setSelectedCaseKey, selectedCase, editingId, onSave, onReset, onLoad, onDelete }) {
  const [tab, setTab] = useState("New Assessment")
  const [residentSearch, setResidentSearch] = useState("")
  const grouped = useMemo(() => groupByResident(evaluations), [evaluations])
  const residentNames = useMemo(() => Object.keys(grouped).sort(), [grouped])
  const selectedResidentName = residentSearch && grouped[residentSearch] ? residentSearch : residentNames[0]
  const residentEntries = selectedResidentName ? grouped[selectedResidentName] || [] : []
  const latest = residentEntries.length ? residentEntries[residentEntries.length - 1] : null

  const profileDomainAverages = useMemo(() => {
    const result = {}
    domains.forEach((domain) => {
      result[domain.key] = average(residentEntries.map((e) => Number(e.scores?.[domain.key] || 0)))
    })
    return result
  }, [residentEntries])

  return (
    <div>
      <TopNav items={["New Assessment", "Resident Profiles", "Assessment Log"]} active={tab} onChange={setTab} />

      {tab === "New Assessment" && (
        <AssessmentForm
          form={form}
          setForm={setForm}
          selectedCaseKey={selectedCaseKey}
          setSelectedCaseKey={setSelectedCaseKey}
          selectedCase={selectedCase}
          editingId={editingId}
          onSave={onSave}
          onReset={onReset}
          userRole="evaluator"
        />
      )}

      {tab === "Resident Profiles" && (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Resident Coaching Dashboard</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <div>
                <label><strong>Select Resident</strong></label>
                <select value={selectedResidentName || ""} onChange={(e) => setResidentSearch(e.target.value)} style={inputStyle}>
                  {residentNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <div style={{ ...cardStyle("#f8fafc"), padding: 14 }}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>Assessments</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{residentEntries.length}</div>
                </div>
                <div style={{ ...cardStyle("#f8fafc"), padding: 14 }}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>Average Score</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{average(residentEntries.map((e) => Number(e.total || 0))).toFixed(1)}</div>
                </div>
                <div style={{ ...cardStyle("#f8fafc"), padding: 14 }}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>Latest Rating</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{latest?.globalRating || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <DomainHeatmap avgByDomain={profileDomainAverages} />
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Recent Resident Entries</h3>
              {residentEntries.length === 0 ? (
                <div style={{ color: "#64748b" }}>No entries for this resident yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {[...residentEntries].reverse().slice(0, 6).map((entry) => (
                    <div key={entry.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>{entry.caseName || "Untitled case"}</strong>
                          <div style={{ color: "#64748b", marginTop: 4 }}>{formatFirebaseDate(entry.createdAt)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => onLoad(entry)} style={{ ...buttonBase, background: "#0f766e" }}>Load</button>
                          <ScoreBadge total={Number(entry.total || 0)} rating={entry.globalRating || ""} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "Assessment Log" && (
        <div style={cardStyle()}>
          <h2 style={{ marginTop: 0 }}>Assessment Log</h2>
          {evaluations.length === 0 ? (
            <div style={{ color: "#64748b" }}>No assessments yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {[...evaluations].reverse().map((entry) => (
                <div key={entry.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>{entry.resident || "Unnamed resident"}</strong> · {entry.caseName || "Untitled case"}
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {entry.pgyLevel || "—"} · {entry.rotationType || "—"} · {formatFirebaseDate(entry.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => onLoad(entry)} style={{ ...buttonBase, background: "#0f766e" }}>Load</button>
                      <button onClick={() => onDelete(entry.id)} style={{ ...buttonBase, background: "#dc2626" }}>Delete</button>
                      <ScoreBadge total={Number(entry.total || 0)} rating={entry.globalRating || ""} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DirectorHome({ evaluations }) {
  const [tab, setTab] = useState("Leadership Dashboard")

  const grouped = useMemo(() => groupByResident(evaluations), [evaluations])

  const analytics = useMemo(() => {
    const avgByDomain = {}
    domains.forEach((domain) => {
      avgByDomain[domain.key] = average(evaluations.map((e) => Number(e.scores?.[domain.key] || 0)))
    })

    const byResidentRows = Object.entries(grouped).map(([name, entries]) => {
      const totals = entries.map((e) => Number(e.total || 0))
      const avg = average(totals)
      const trend = entries.length >= 2 ? totals[totals.length - 1] - totals[0] : 0
      const weakest = domains
        .map((domain) => ({
          key: domain.key,
          title: domain.title,
          avg: average(entries.map((e) => Number(e.scores?.[domain.key] || 0))),
        }))
        .sort((a, b) => a.avg - b.avg)[0]

      return {
        name,
        pgyLevel: entries[entries.length - 1]?.pgyLevel || "",
        avg,
        trend,
        weakestDomain: weakest?.title || "",
        flag: avg < 12 || trend < 0 ? "High" : avg < 14 ? "Watch" : "Stable",
      }
    })

    const ratingCounts = { Junior: 0, Intermediate: 0, Senior: 0, "Near Consultant": 0 }
    evaluations.forEach((entry) => {
      if (entry.globalRating && ratingCounts[entry.globalRating] !== undefined) {
        ratingCounts[entry.globalRating] += 1
      }
    })

    const monthsMap = {}
    evaluations.forEach((entry) => {
      const date = entry.createdAt?.seconds ? new Date(entry.createdAt.seconds * 1000) : new Date()
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!monthsMap[key]) monthsMap[key] = []
      monthsMap[key].push(Number(entry.total || 0))
    })

    const monthlyTrend = Object.entries(monthsMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, values]) => ({ label, value: Number(average(values).toFixed(1)) }))

    const pgyMap = {}
    evaluations.forEach((entry) => {
      const key = entry.pgyLevel || "Unknown"
      if (!pgyMap[key]) pgyMap[key] = []
      pgyMap[key].push(Number(entry.total || 0))
    })

    const pgyRows = Object.entries(pgyMap)
      .map(([label, values]) => ({ label, value: Number(average(values).toFixed(1)) }))
      .sort((a, b) => a.label.localeCompare(b.label))

    const rotationMap = {}
    evaluations.forEach((entry) => {
      const key = entry.rotationType || "Unknown"
      if (!rotationMap[key]) rotationMap[key] = []
      rotationMap[key].push(Number(entry.total || 0))
    })

    const rotationRows = Object.entries(rotationMap)
      .map(([label, values]) => ({ label, value: Number(average(values).toFixed(1)) }))
      .sort((a, b) => b.value - a.value)

    return {
      avgByDomain,
      totalEvaluations: evaluations.length,
      totalResidents: Object.keys(grouped).length,
      avgScore: Number(average(evaluations.map((e) => Number(e.total || 0))).toFixed(1)),
      weakestDomain: domains
        .map((domain) => ({ title: domain.title, avg: avgByDomain[domain.key] || 0 }))
        .sort((a, b) => a.avg - b.avg)[0]?.title || "—",
      highRiskRows: byResidentRows.filter((row) => row.flag !== "Stable").sort((a, b) => a.avg - b.avg),
      topPerformerRows: [...byResidentRows].sort((a, b) => b.avg - a.avg).slice(0, 5),
      ratingCounts,
      monthlyTrend,
      pgyRows,
      rotationRows,
    }
  }, [evaluations, grouped])

  return (
    <div>
      <TopNav items={["Leadership Dashboard", "Program Intelligence", "Reports / Exports"]} active={tab} onChange={setTab} />

      {tab === "Leadership Dashboard" && (
        <div style={{ display: "grid", gap: 18 }}>
          <KPIGrid
            items={[
              { label: "Total Residents", value: analytics.totalResidents },
              { label: "Total Assessments", value: analytics.totalEvaluations },
              { label: "Average CRFT Score", value: analytics.avgScore || 0, note: "Program-wide average" },
              { label: "Weakest Domain", value: analytics.weakestDomain },
              { label: "Residents at Risk", value: analytics.highRiskRows.length },
            ]}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
            <SimpleTrendChart points={analytics.monthlyTrend} title="Average Score Over Time" />
            <DomainHeatmap avgByDomain={analytics.avgByDomain} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18 }}>
            <ResidentsAttentionTable rows={analytics.highRiskRows} />
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Top Performers</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {analytics.topPerformerRows.map((row) => (
                  <div key={row.name} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <strong>{row.name}</strong>
                      <span>{row.avg.toFixed(1)}</span>
                    </div>
                    <div style={{ color: "#64748b", marginTop: 4 }}>{row.pgyLevel || "—"} · {row.weakestDomain || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Program Intelligence" && (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <SimpleTrendChart points={analytics.pgyRows} title="Average Score by PGY" />
            <SimpleTrendChart points={analytics.rotationRows} title="Average Score by Rotation Type" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 18 }}>
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Rating Distribution</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {Object.entries(analytics.ratingCounts).map(([label, value]) => (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                    <div style={{ height: 12, borderRadius: 999, background: "#e2e8f0" }}>
                      <div style={{ width: `${analytics.totalEvaluations ? (value / analytics.totalEvaluations) * 100 : 0}%`, height: "100%", borderRadius: 999, background: "#0c4a6e" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ResidentsAttentionTable rows={analytics.highRiskRows} title="Risk and Stagnation Monitor" />
          </div>
        </div>
      )}

      {tab === "Reports / Exports" && (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Program Report Summary</h2>
            <p style={{ color: "#475569" }}>
              This page is meant for program review, CCC preparation, and leadership reporting.
            </p>
            <ul style={{ lineHeight: 1.8 }}>
              <li>Total residents assessed: <strong>{analytics.totalResidents}</strong></li>
              <li>Total assessments captured: <strong>{analytics.totalEvaluations}</strong></li>
              <li>Current average score: <strong>{analytics.avgScore}</strong></li>
              <li>Weakest program domain: <strong>{analytics.weakestDomain}</strong></li>
              <li>Residents flagged for attention: <strong>{analytics.highRiskRows.length}</strong></li>
            </ul>
            <button onClick={() => window.print()} style={{ ...buttonBase, background: "#1d4ed8" }}>
              Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [requestedPortal, setRequestedPortal] = useState(localStorage.getItem("crft_portal") || "")
  const [residentEmail, setResidentEmail] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [evaluations, setEvaluations] = useState([])
  const [statusMessage, setStatusMessage] = useState("")
  const [selectedCaseKey, setSelectedCaseKey] = useState("")
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    ...initialForm,
    scores: { ...initialScores },
  })

  useEffect(() => {
    const unsubscribe = watchAuth((authUser) => {
      setUser(authUser)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeEvaluations((rows) => {
      setEvaluations(rows || [])
    })
    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!statusMessage) return
    const timeout = setTimeout(() => setStatusMessage(""), 2500)
    return () => clearTimeout(timeout)
  }, [statusMessage])

  const selectedCase = useMemo(() => sampleCases.find((c) => c.key === selectedCaseKey) || null, [selectedCaseKey])

  const effectiveRole = useMemo(() => {
    if (!user) return ""
    if (!user.email) return "resident"
    if (requestedPortal === "director") return "director"
    return "evaluator"
  }, [user, requestedPortal])

  const resetForm = () => {
    setForm({
      ...initialForm,
      scores: { ...initialScores },
    })
    setSelectedCaseKey("")
    setEditingId(null)
  }

  const saveAssessment = async () => {
    const total = getTotal(form.scores)
    const globalRating = getGlobalRating(total)

    if (!form.resident && !form.caseName && total === 0 && !form.feedbackNotes.trim()) {
      alert("Please enter at least a resident, case, score, or note.")
      return
    }

    const payload = {
      ...form,
      total,
      globalRating,
      selectedCaseKey: selectedCaseKey || null,
      selectedCaseTitle: selectedCase?.title || null,
      submittedBy: user?.email || residentEmail || "resident-anonymous",
      submittedByRole: effectiveRole || "resident",
    }

    try {
      if (editingId) {
        await updateEvaluation(editingId, payload)
        setStatusMessage("Assessment updated.")
      } else {
        await createEvaluation(payload)
        setStatusMessage("Assessment saved.")
      }
      resetForm()
    } catch (error) {
      console.error(error)
      alert("Save failed.")
    }
  }

  const loadEvaluation = (entry) => {
    setForm({
      resident: entry.resident || "",
      evaluator: entry.evaluator || "",
      rotation: entry.rotation || "",
      rotationType: entry.rotationType || "CTU",
      pgyLevel: entry.pgyLevel || "PGY1",
      caseName: entry.caseName || "",
      caseCategory: entry.caseCategory || "Cardio",
      caseSource: entry.caseSource || "Simulation",
      scores: { ...initialScores, ...(entry.scores || {}) },
      feedbackNotes: entry.feedbackNotes || "",
      structuredReasoning: entry.structuredReasoning || "",
    })
    setSelectedCaseKey(entry.selectedCaseKey || "")
    setEditingId(entry.id)
    setStatusMessage("Assessment loaded into form.")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const deleteEvaluationRecord = async (id) => {
    if (!window.confirm("Delete this assessment?")) return
    try {
      await removeEvaluation(id)
      if (editingId === id) resetForm()
      setStatusMessage("Assessment deleted.")
    } catch (error) {
      console.error(error)
      alert("Delete failed.")
    }
  }

  const loginAsResident = async () => {
    try {
      localStorage.setItem("crft_portal", "resident")
      setRequestedPortal("resident")
      await signInResident()
    } catch (error) {
      console.error(error)
      alert("Resident login failed.")
    }
  }

  const loginSharedRole = async (portal) => {
    try {
      localStorage.setItem("crft_portal", portal)
      setRequestedPortal(portal)
      await signInEvaluator(loginEmail, loginPassword)
    } catch (error) {
      console.error(error)
      alert(`${portal === "director" ? "Program Director" : "Evaluator"} login failed.`)
    }
  }

  const handleLogout = async () => {
    try {
      localStorage.removeItem("crft_portal")
      setRequestedPortal("")
      await logOut()
    } catch (error) {
      console.error(error)
    }
  }

  if (!user) {
    return (
      <div style={pageWrap}>
        <div style={container}>
          <div style={hero}>
            <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 44px)" }}>{appTitle}</h1>
            <div style={{ marginTop: 8, opacity: 0.95 }}>
              Three-role version with Resident, Evaluator, and Program Director access.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <AccessCard title="Resident Access" subtitle="Self-review, case practice, and personal progress only." accent="#0f766e">
              <input
                placeholder="Optional email for follow-up"
                value={residentEmail}
                onChange={(e) => setResidentEmail(e.target.value)}
                style={inputStyle}
              />
              <button onClick={loginAsResident} style={{ ...buttonBase, background: "#0f766e", marginTop: 12, width: "100%" }}>
                Enter as Resident
              </button>
            </AccessCard>

            <AccessCard title="Evaluator Access" subtitle="Assessment entry, resident coaching, and assessment log." accent="#1d4ed8">
              <input
                placeholder="Evaluator email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={inputStyle}
              />
              <button onClick={() => loginSharedRole("evaluator")} style={{ ...buttonBase, background: "#1d4ed8", marginTop: 12, width: "100%" }}>
                Login as Evaluator
              </button>
            </AccessCard>

            <AccessCard title="Program Director Access" subtitle="Leadership Dashboard, Program Intelligence, and reports." accent="#7c3aed">
              <input
                placeholder="Program Director email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={inputStyle}
              />
              <button onClick={() => loginSharedRole("director")} style={{ ...buttonBase, background: "#7c3aed", marginTop: 12, width: "100%" }}>
                Login as Program Director
              </button>
            </AccessCard>
          </div>

          <div style={{ ...cardStyle("#f8fafc"), marginTop: 18, display: "inline-block" }}>
            <div style={{ marginBottom: 10, color: "#475569" }}>Resident quick access</div>
            <QRCodeSVG value={appUrl} size={140} bgColor="#ffffff" fgColor="#0f172a" />
            <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", maxWidth: 160, wordBreak: "break-all" }}>{appUrl}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageWrap}>
      <div style={container}>
        <div style={hero}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 44px)" }}>{appTitle}</h1>
              <div style={{ marginTop: 8, opacity: 0.95 }}>
                {effectiveRole === "resident" && "Resident Portal"}
                {effectiveRole === "evaluator" && "Evaluator Portal"}
                {effectiveRole === "director" && "Program Director Portal"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={resetForm} style={{ ...buttonBase, background: "#475569" }}>Reset Form</button>
              <button onClick={() => window.print()} style={{ ...buttonBase, background: "#1d4ed8" }}>Print / Save PDF</button>
              <button onClick={handleLogout} style={{ ...buttonBase, background: "#dc2626" }}>Logout</button>
            </div>
          </div>
        </div>

        {statusMessage ? (
          <div style={{ ...cardStyle("#ecfeff"), marginBottom: 18, borderColor: "#a5f3fc" }}>{statusMessage}</div>
        ) : null}

        {effectiveRole === "resident" && (
          <ResidentHome
            form={form}
            setForm={setForm}
            selectedCaseKey={selectedCaseKey}
            setSelectedCaseKey={setSelectedCaseKey}
            selectedCase={selectedCase}
            onSave={saveAssessment}
            onReset={resetForm}
            evaluations={evaluations}
            currentUserEmail={user?.email || residentEmail || "resident-anonymous"}
          />
        )}

        {effectiveRole === "evaluator" && (
          <EvaluatorHome
            evaluations={evaluations}
            form={form}
            setForm={setForm}
            selectedCaseKey={selectedCaseKey}
            setSelectedCaseKey={setSelectedCaseKey}
            selectedCase={selectedCase}
            editingId={editingId}
            onSave={saveAssessment}
            onReset={resetForm}
            onLoad={loadEvaluation}
            onDelete={deleteEvaluationRecord}
          />
        )}

        {effectiveRole === "director" && <DirectorHome evaluations={evaluations} />}
      </div>
    </div>
  )
}
