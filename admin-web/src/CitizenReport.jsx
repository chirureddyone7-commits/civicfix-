import { useEffect, useMemo, useRef, useState } from "react";

const CATEGORIES = ["ROADS", "WATER", "GARBAGE", "STREETLIGHT", "DRAINAGE", "OTHER"];
const DEPARTMENTS = {
  ROADS: "Roads & Infrastructure", WATER: "Water Supply", GARBAGE: "Sanitation",
  STREETLIGHT: "Electrical", DRAINAGE: "Stormwater & Drainage", OTHER: "General Civic Services"
};
const panel = { background: "#171525", border: "1px solid #302b45", borderRadius: 16, padding: 22, marginBottom: 16 };
const label = { display: "block", fontSize: 13, color: "#b8b3cb", marginBottom: 7 };
const field = { width: "100%", boxSizing: "border-box", background: "#100e1b", color: "#f5f3ff", border: "1px solid #39334f", borderRadius: 9, padding: "12px 13px", marginBottom: 15 };
const muted = { color: "#aaa4bf", fontSize: 13, lineHeight: 1.6 };
const button = { background: "#8b5cf6", color: "white", border: 0, borderRadius: 9, padding: "11px 16px", fontWeight: 700, cursor: "pointer" };

const words = value => String(value || "").toLowerCase().match(/[a-z0-9]+/g) || [];
const similarity = (a, b) => {
  const left = new Set(words(a)), right = new Set(words(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  left.forEach(word => { if (right.has(word)) overlap++; });
  return overlap / new Set([...left, ...right]).size;
};

export default function CitizenReport() {
  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: "", description: "", location: "", reporter: "" });
  const [coords, setCoords] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("MEDIUM");
  const [ai, setAi] = useState(null);
  const [existing, setExisting] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");

  useEffect(() => {
    fetch("/api/issues").then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setExisting(data.issues || [])).catch(() => setExisting([]));
  }, []);

  const duplicates = useMemo(() => existing.map(issue => {
    const textScore = similarity(`${form.title} ${form.description}`, `${issue.title} ${issue.description}`);
    const sameLocation = form.location.trim() && issue.location &&
      (issue.location.toLowerCase().includes(form.location.toLowerCase()) ||
       form.location.toLowerCase().includes(issue.location.toLowerCase()));
    return { issue, score: textScore + (sameLocation ? 0.2 : 0) };
  }).filter(x => x.score >= 0.34 && x.issue.status !== "RESOLVED")
    .sort((a, b) => b.score - a.score).slice(0, 3),
  [existing, form]);

  const update = (key, value) => {
    setForm(old => ({ ...old, [key]: value }));
    setAi(null);
  };

  const getLocation = () => {
    setError(""); setLocationMessage("Requesting GPS permission...");
    if (!navigator.geolocation) return setError("GPS is not supported by this browser.");
    navigator.geolocation.getCurrentPosition(position => {
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: Math.round(position.coords.accuracy) });
      setLocationMessage("GPS location captured.");
    }, e => {
      setLocationMessage("");
      setError(e.code === 1 ? "Location permission was denied. Enter the address manually." : "Could not get GPS. Enter the address manually.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return setVoiceMessage("Voice input is not supported in this browser. Use Chrome or type your description.");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setVoiceMessage("Listening… speak clearly.");
    recognition.onerror = () => setVoiceMessage("Voice capture failed. Please type your complaint.");
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      setForm(old => ({ ...old, description: old.description ? old.description + " " + transcript : transcript }));
      setAi(null);
      setVoiceMessage("Voice converted to text. Please review it.");
    };
    recognition.onend = () => {};
    recognition.start();
  };

  const choosePhoto = file => {
    setError(""); setPhoto(""); setPhotoName("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Choose a JPG, PNG or WebP photo.");
    if (file.size > 5 * 1024 * 1024) return setError("Photo must be 5 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () => { setPhoto(String(reader.result)); setPhotoName(file.name); };
    reader.onerror = () => setError("Could not read the selected photo.");
    reader.readAsDataURL(file);
  };

  const classify = async () => {
    setBusy(true); setError(""); setMessage(""); setAi(null);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: `Title: ${form.title}\nDescription: ${form.description}` })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "AI classification failed.");
      const result = data.suggestion;
      setAi(result); setCategory(result.category); setPriority(result.priority);
      setMessage("AI classification received. Review the suggestion before submitting.");
    } catch (e) {
      setError(e.message || "AI service is unavailable. You can still select category and priority manually.");
    } finally { setBusy(false); }
  };

  const submit = async event => {
    event.preventDefault(); setError(""); setMessage("");
    if (duplicates.length) {
      const list = duplicates.map(x => `CF-${x.issue.id}: ${x.issue.title} — ${x.issue.location}`).join("\n");
      if (!window.confirm(`Possible duplicate reports were found:\n\n${list}\n\nSubmit this complaint anyway?`)) return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/issues", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
          reporter_name: form.reporter.trim() || undefined,
          category,
          priority,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Complaint submission failed.");
      setMessage(`Complaint submitted successfully. Your tracking ID is CF-${data.issue.id}.`);
      setExisting(old => [data.issue, ...old]);
      setForm({ title: "", description: "", location: "", reporter: "" });
      setCoords(null); setLocationMessage(""); setPhoto(""); setPhotoName(""); setAi(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) { setError(e.message || "Could not submit complaint."); }
    finally { setBusy(false); }
  };

  return (
    <section style={{ maxWidth: 900, margin: "0 auto", padding: "24px 0", color: "#e8e7f2" }}>
      <header style={{ marginBottom: 22 }}>
        <span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>CITIZEN PORTAL · AI ASSISTED</span>
        <h2 style={{ fontSize: 28, margin: "8px 0" }}>Report a civic issue</h2>
        <p style={muted}>Report a problem, add its location and let CivicFix AI recommend its category and urgency.</p>
      </header>
      <form onSubmit={submit}>
        <div style={panel}>
          <h3>1. Complaint details</h3>
          <label style={label}>Issue title *</label>
          <input required minLength={3} maxLength={150} style={field} value={form.title} onChange={e => update("title", e.target.value)} placeholder="Example: Large pothole near the bus stop" />
          <label style={label}>Describe what happened *</label>
          <textarea required minLength={5} style={{ ...field, minHeight: 110, resize: "vertical" }} value={form.description} onChange={e => update("description", e.target.value)} placeholder="Explain the problem, its exact impact and whether anyone is at risk." />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: -5, marginBottom: 15 }}>
            <button type="button" style={button} disabled={busy} onClick={startVoice}>🎙 Describe by voice</button>
            <button type="button" style={{ ...button, background: "#34304a" }} disabled={busy} onClick={getLocation}>⌖ Use current GPS</button>
          </div>
          {voiceMessage && <p style={muted}>{voiceMessage}</p>}
          {coords && <p style={{ ...muted, color: "#86efac" }}>GPS captured: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)} · accuracy ±{coords.accuracy} m. Coordinates will be included in the saved location.</p>}
          {locationMessage && !coords && <p style={muted}>{locationMessage}</p>}
          <label style={label}>Street / area / landmark *</label>
          <input required minLength={2} maxLength={255} style={field} value={form.location} onChange={e => update("location", e.target.value)} placeholder="Street, area, city" />
          <label style={label}>Your name (optional)</label>
          <input maxLength={100} style={{ ...field, marginBottom: 0 }} value={form.reporter} onChange={e => update("reporter", e.target.value)} placeholder="Your name" />
        </div>

        <div style={panel}>
          <h3>2. Add photo evidence</h3>
          <p style={muted}>Upload a clear JPG, PNG or WebP image (maximum 5 MB). The current backend does not store image files or expose a vision endpoint, so this is a local preview only—not an AI-verified or saved attachment.</p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => choosePhoto(e.target.files?.[0])} style={{ color: "#ddd", margin: "10px 0" }} />
          {photo && <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <img src={photo} alt="Selected evidence preview" style={{ width: 180, height: 130, objectFit: "cover", borderRadius: 10 }} />
            <div style={muted}>{photoName}<br />Preview only. Photo upload requires a backend storage endpoint.</div>
            <button type="button" style={{ ...button, background: "#493047" }} onClick={() => { setPhoto(""); setPhotoName(""); if (fileRef.current) fileRef.current.value = ""; }}>Remove photo</button>
          </div>}
        </div>

        <div style={panel}>
          <h3>3. AI classification and urgency</h3>
          <p style={muted}>CivicFix AI reads the complaint text and recommends a category, priority and explanation. This uses the existing /api/ai/analyze endpoint.</p>
          <button type="button" style={button} disabled={busy || form.title.trim().length < 3 || form.description.trim().length < 5} onClick={classify}>{busy ? "Analysing…" : "✦ Analyse complaint with AI"}</button>
          {ai && <div style={{ marginTop: 16, padding: 15, borderRadius: 10, background: "#211b35", border: "1px solid #51416e" }}>
            <strong style={{ color: "#c4b5fd" }}>AI recommendation</strong>
            <p style={muted}>Category: <b>{ai.category}</b> · Priority: <b>{ai.priority}</b></p>
            <p style={muted}>{ai.reason}</p>
            <p style={muted}>Department suggestion: <b>{DEPARTMENTS[ai.category] || DEPARTMENTS.OTHER}</b> (mapped from category)</p>
            <small style={{ color: "#a99fc1" }}>Review before submission. AI recommendations can be incorrect.</small>
          </div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 16 }}>
            <div><label style={label}>Category</label><select style={{ ...field, marginBottom: 0 }} value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={label}>Priority</label><select style={{ ...field, marginBottom: 0 }} value={priority} onChange={e => setPriority(e.target.value)}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></div>
          </div>
        </div>

        {duplicates.length > 0 && <div style={{ ...panel, borderColor: "#a97737" }}>
          <strong style={{ color: "#f6c779" }}>Possible duplicate reports detected on this device session</strong>
          {duplicates.map(x => <p key={x.issue.id} style={muted}>CF-{x.issue.id} · {x.issue.title} · {x.issue.location}</p>)}
          <small style={muted}>This is a local text/location similarity check against currently loaded complaints, not a server-side AI duplicate model.</small>
        </div>}
        {error && <div role="alert" style={{ background: "#351b27", border: "1px solid #a34a69", color: "#ffc2d6", padding: 12, borderRadius: 9, marginBottom: 14 }}>{error}</div>}
        {message && <div role="status" style={{ background: "#173126", border: "1px solid #367b58", color: "#b7f7d2", padding: 12, borderRadius: 9, marginBottom: 14 }}>{message}</div>}
        <button type="submit" disabled={busy} style={{ ...button, padding: "14px 20px", opacity: busy ? .6 : 1 }}>{busy ? "Submitting…" : "Submit civic complaint"}</button>
      </form>
    </section>
  );
}
