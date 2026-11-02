import { useRef, useState } from "react";

const categories = ["ROADS", "WATER", "GARBAGE", "STREETLIGHT", "DRAINAGE", "OTHER"];
const panel = { background: "#171525", border: "1px solid #302b45", borderRadius: 16, padding: 24, marginBottom: 18 };
const label = { display: "block", fontSize: 13, color: "#b8b3cb", marginBottom: 7 };
const field = { width: "100%", boxSizing: "border-box", background: "#100e1b", color: "#f5f3ff", border: "1px solid #39334f", borderRadius: 9, padding: "12px 13px", marginBottom: 16 };
const muted = { color: "#aaa4bf", fontSize: 13, lineHeight: 1.6 };
const button = { background: "#8b5cf6", color: "white", border: 0, borderRadius: 9, padding: "12px 17px", fontWeight: 700, cursor: "pointer" };

export default function CitizenReport() {
  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: "", description: "", location: "", reporter: "" });
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const change = (key, value) => {
    setForm(old => ({ ...old, [key]: value }));
    setAssessment(null);
  };

  const assessComplaint = async () => {
    setBusy(true); setError(""); setMessage(""); setAssessment(null);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `Title: ${form.title}\nDescription: ${form.description}`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "AI assessment failed.");
      setAssessment(data.suggestion);
      setCategory(data.suggestion.category);
      setPriority(data.suggestion.priority);
      setMessage("AI severity and department assessment complete. Review the recommendation.");
    } catch (e) {
      setError(e.message || "Could not assess complaint.");
    } finally {
      setBusy(false);
    }
  };

  const clearImage = () => {
    setImage(""); setImageName(""); setAnalysis(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImage = file => {
    setError(""); setMessage(""); setAnalysis(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      clearImage();
      return setError("Choose a JPG, PNG or WebP image.");
    }
    if (file.size > 5 * 1024 * 1024) {
      clearImage();
      return setError("Image must be 5 MB or smaller.");
    }
    setImage(""); setImageName("");
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result || "")); setImageName(file.name); };
    reader.onerror = () => { clearImage(); setError("Could not read this image."); };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/ai/analyze-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, description: form.description })
      });
      const data = await response.json();
      if (data.rejected) {
        clearImage();
        throw new Error(data.message || "This image is not relevant to a civic issue. Please upload another photo.");
      }
      if (!response.ok) throw new Error(data.message || "AI image analysis failed.");
      setAnalysis(data.suggestion);
      setAssessment(null);
      setCategory(data.suggestion.category || "OTHER");
      setPriority(data.suggestion.priority || "MEDIUM");
      setMessage("AI analysis complete. Review the suggested category and priority.");
    } catch (e) { setError(e.message || "Could not analyse image."); }
    finally { setBusy(false); }
  };

  const submit = async event => {
    event.preventDefault();
    if (image && (!analysis || analysis.is_civic_issue !== true)) {
      setError("Please analyse the uploaded photo first. CivicFix only accepts images verified as relevant civic issues.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      // Check for similar active complaints before saving this report.
      try {
        const duplicateResponse = await fetch("/api/ai/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            location: form.location,
            category
          })
        });
        if (duplicateResponse.ok) {
          const duplicateData = await duplicateResponse.json();
          if (duplicateData.matches?.length) {
            const summary = duplicateData.matches.slice(0, 3).map(match =>
              `CF-${match.issue_id} (${match.similarity} similarity): ${match.reason}`
            ).join("\\n");
            const proceed = window.confirm(
              `CivicFix AI found possible similar complaints:\\n\\n${summary}\\n\\nSubmit this complaint anyway?`
            );
            if (!proceed) {
              setMessage("Submission cancelled. Review the existing complaint IDs shown above.");
              return;
            }
          }
        }
      } catch (duplicateError) {
        // Duplicate detection is an assistive feature; it must not block reporting.
        console.warn("Duplicate check unavailable; continuing submission.", duplicateError);
      }

      const response = await fetch("/api/issues", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, description: form.description, location: form.location,
          reporter_name: form.reporter || undefined, category, priority
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Complaint submission failed.");
      setMessage(`Complaint submitted. Your complaint ID is CF-${data.issue.id}.`);
      setForm({ title: "", description: "", location: "", reporter: "" });
      setImage(""); setImageName(""); setAnalysis(null); setAssessment(null); setCategory("OTHER"); setPriority("MEDIUM");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) { setError(e.message || "Could not submit complaint."); }
    finally { setBusy(false); }
  };

  return (
    <section style={{ maxWidth: 860, margin: "0 auto", padding: "24px 0", color: "#e8e7f2" }}>
      <div style={{ marginBottom: 22 }}>
        <span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>CITIZEN PORTAL · AI ASSISTED</span>
        <h2 style={{ fontSize: 27, margin: "8px 0" }}>Report a civic issue</h2>
        <p style={muted}>Describe the problem and upload a photo. CivicFix AI can inspect the image and recommend a category and priority.</p>
      </div>
      <form onSubmit={submit}>
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Complaint details</h3>
          <label style={label}>Issue title *</label>
          <input style={field} required minLength={3} maxLength={150} value={form.title} onChange={e => change("title", e.target.value)} placeholder="Large pothole near bus stop" />
          <label style={label}>Describe the issue *</label>
          <textarea style={{ ...field, minHeight: 105, resize: "vertical" }} required minLength={5} value={form.description} onChange={e => change("description", e.target.value)} placeholder="Explain what happened and who is affected." />
          <label style={label}>Location *</label>
          <input style={field} required minLength={2} maxLength={255} value={form.location} onChange={e => change("location", e.target.value)} placeholder="Street, area, city" />
          <label style={label}>Your name (optional)</label>
          <input style={{ ...field, marginBottom: 0 }} maxLength={100} value={form.reporter} onChange={e => change("reporter", e.target.value)} placeholder="Your name" />
        </div>
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>AI visual inspection</h3>
          <p style={muted}>Upload a clear photo (JPG, PNG or WebP; maximum 5 MB).</p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleImage(e.target.files?.[0])} style={{ color: "#d7d2e8", display: "block", margin: "14px 0" }} />
          {image && <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <img src={image} alt="Selected civic issue" style={{ width: 180, maxHeight: 150, objectFit: "cover", borderRadius: 10 }} />
            <span style={muted}>{imageName}</span>
          </div>}
          <button type="button" style={button} disabled={!image || busy} onClick={analyzePhoto}>{busy ? "Please wait..." : "Analyse image with AI"}</button>
          {analysis && <div style={{ marginTop: 18, padding: 16, borderRadius: 11, background: "#211b35", border: "1px solid #51416e" }}>
            <strong style={{ color: "#c4b5fd" }}> <span aria-label="verified">✓</span> Civic issue image accepted</strong>
            <p style={muted}>Category: <b>{analysis.category}</b> · Priority: <b>{analysis.priority}</b> · Confidence: <b>{analysis.confidence}</b></p>
            <p style={muted}>{analysis.reason}</p>
            {analysis.detected_objects?.length > 0 && <p style={muted}>Detected: {analysis.detected_objects.join(", ")}</p>}
            <p style={muted}>Review AI suggestions before submitting. AI output may be incorrect.</p>
          </div>}
        </div>
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>AI severity & department assessment</h3>
          <p style={muted}>AI evaluates the complaint description, estimates urgency from 0–100, and recommends the municipal department.</p>
          <button type="button" style={button} disabled={busy || form.title.trim().length < 3 || form.description.trim().length < 5} onClick={assessComplaint}>
            {busy ? "Assessing..." : "Assess severity & department"}
          </button>
          {assessment && <div style={{ marginTop: 16, padding: 16, borderRadius: 11, background: "#211b35", border: "1px solid #51416e" }}>
            <strong style={{ color: "#c4b5fd" }}>AI assessment</strong>
            <p style={muted}>Severity score: <b>{assessment.severity_score}/100</b> · Priority: <b>{assessment.priority}</b></p>
            <p style={muted}>Recommended department: <b>{assessment.department.replaceAll("_", " ")}</b></p>
            <p style={muted}>{assessment.reason}</p>
            {assessment.risk_factors?.length > 0 && <p style={muted}>Risk factors: {assessment.risk_factors.join(", ")}</p>}
            <p style={muted}>This is an AI recommendation. Municipal staff should verify it.</p>
          </div>}
        </div>
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Review classification</h3>
          <label style={label}>Category</label>
          <select style={field} value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <label style={label}>Priority</label>
          <select style={{ ...field, marginBottom: 0 }} value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option>
          </select>
        </div>
        {error && <div role="alert" style={{ background: "#351b27", border: "1px solid #a34a69", color: "#ffc2d6", padding: 12, borderRadius: 9, marginBottom: 14 }}>{error}</div>}
        {message && <div role="status" style={{ background: "#173126", border: "1px solid #367b58", color: "#b7f7d2", padding: 12, borderRadius: 9, marginBottom: 14 }}>{message}</div>}
        <button type="submit" disabled={busy} style={{ ...button, opacity: busy ? 0.6 : 1 }}>{busy ? "Submitting..." : "Submit civic complaint"}</button>
      </form>
      <p style={{ ...muted, marginTop: 16 }}>Note: The current database schema stores complaint details, not the original image file. The photo is sent to AI for inspection only.</p>
    </section>
  );
}
