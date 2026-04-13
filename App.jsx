import React, { useEffect, useMemo, useState } from "react"
import { QRCodeSVG } from "qrcode.react"

import {
  signInResident,
  signInEvaluator,
  logOut,
  watchAuth,
  createEvaluation,
  subscribeEvaluations,
} from "./firebase"

const domains = [
  { key: "problem", title: "Problem Framing", clue: "define the clinical question first." },
  { key: "syndrome", title: "Syndrome Identification", clue: "identify the syndrome or physiology before naming the disease." },
  { key: "differential", title: "Differential Diagnosis", clue: "structure the differential into common, dangerous, and treatable causes." },
  { key: "data", title: "Data Interpretation", clue: "use trends and context, not isolated values." },
  { key: "anticipation", title: "Anticipation", clue: "predict what will happen next and what to prevent." },
  { key: "reassessment", title: "Reassessment", clue: "re-evaluate as new data emerges." },
]

const initialForm = {
  resident: "",
  evaluator: "",
  rotation: "",
  caseName: "",
  scores: {
    problem: 0,
    syndrome: 0,
    differential: 0,
    data: 0,
    anticipation: 0,
    reassessment: 0,
  },
}

export default function App() {
  const [user, setUser] = useState(null)
  const [isEvaluator, setIsEvaluator] = useState(false)
  const [evaluations, setEvaluations] = useState([])
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    const unsub = watchAuth((u) => {
      setUser(u)
      setIsEvaluator(Boolean(u?.email))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!isEvaluator) return
    const unsub = subscribeEvaluations(setEvaluations)
    return () => unsub()
  }, [isEvaluator])

  const totalScore = useMemo(
    () => Object.values(form.scores).reduce((a, b) => a + b, 0),
    [form.scores]
  )

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleScore = (field, value) => {
    setForm((prev) => ({
      ...prev,
      scores: { ...prev.scores, [field]: Number(value) },
    }))
  }

  const submit = async () => {
    await createEvaluation({
      ...form,
      totalScore,
      submittedBy: user?.email || "resident",
    })
    alert("Saved")
  }

  const reset = () => setForm(initialForm)

  // ================= LOGIN SCREEN =================
  if (!user) {
    return (
      <div className="container">
        <h1>CRFT</h1>
        <p>Clinical Reasoning Feedback Tool</p>

        <div className="card-grid">
          <div className="card">
            <h3>Resident Access</h3>
            <p>Anonymous entry for residents.</p>
            <button onClick={signInResident}>Enter as Resident</button>
          </div>

          <div className="card">
            <h3>Evaluator Access</h3>
            <p>Shared evaluator login.</p>
            <button onClick={async () => {
              const email = prompt("Email")
              const pass = prompt("Password")
              await signInEvaluator(email, pass)
            }}>
              Login as Evaluator
            </button>
          </div>

          <div className="card">
            <h3>Scan to Open CRFT</h3>
            <p>{window.location.href}</p>
            <QRCodeSVG value={window.location.href} size={120} />
          </div>
        </div>

        <footer>Developed for KFSHRC-J IM residents</footer>
      </div>
    )
  }

  // ================= MAIN APP =================
  return (
    <div className="container">
      <h1>CRFT</h1>
      <p>Clinical Reasoning Feedback Tool</p>

      <div className="toolbar">
        <button onClick={reset}>Reset</button>
        <button onClick={() => window.print()}>Print</button>
        <button onClick={submit}>Save Current Assessment</button>
        <button onClick={logOut}>Logout</button>
      </div>

      <div className="input-grid">
        <input placeholder="Resident" value={form.resident} onChange={(e) => handleField("resident", e.target.value)} />
        <input placeholder="Evaluator" value={form.evaluator} onChange={(e) => handleField("evaluator", e.target.value)} />
        <input placeholder="Rotation" value={form.rotation} onChange={(e) => handleField("rotation", e.target.value)} />
        <input placeholder="Case" value={form.caseName} onChange={(e) => handleField("caseName", e.target.value)} />
      </div>

      <div className="summary">
        <strong>Total Score: {totalScore} / 24</strong>
      </div>

      {domains.map((d) => (
        <div key={d.key} className="card">
          <h3>{d.title}</h3>
          <select value={form.scores[d.key]} onChange={(e) => handleScore(d.key, e.target.value)}>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <p><b>Try to:</b> {d.clue}</p>
        </div>
      ))}

      {isEvaluator && (
        <div className="card">
          <h2>Evaluator Dashboard</h2>
          {evaluations.map((e) => (
            <div key={e.id} className="list-item">
              {e.resident} — {e.caseName} — {e.totalScore}/24
            </div>
          ))}
        </div>
      )}

      <footer>Developed for KFSHRC-J IM residents</footer>
    </div>
  )
}
