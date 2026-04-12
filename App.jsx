export default function App() {
  return (
    <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Resident Assessment Rubric</h1>
      <p>The app is live.</p>

      <h2>Problem Framing</h2>
      <select>
        <option>1 - Incorrect or vague question</option>
        <option>2 - Symptom description only</option>
        <option>3 - Correct clinical question</option>
        <option>4 - Reframes independently when stuck</option>
      </select>

      <h2 style={{ marginTop: '20px' }}>Syndrome Identification</h2>
      <select>
        <option>1 - Jumps to diagnosis</option>
        <option>2 - Partial physiology</option>
        <option>3 - Correct syndrome identified</option>
        <option>4 - Integrates multi-system physiology</option>
      </select>
    </div>
  )
}
