import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  LayoutDashboard, MapPin, ClipboardList, BarChart3, Users, Settings,
  Search, ShieldCheck, Activity, CheckCircle2, Clock3,
  AlertTriangle, RefreshCw, Sparkles, MessageCircle, X, ArrowUpRight
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CATEGORY_LABELS = {
  ROADS: "Roads", WATER: "Water", GARBAGE: "Garbage",
  STREETLIGHT: "Streetlight", DRAINAGE: "Drainage", OTHER: "Other"
};
const DEPARTMENTS = {
  ROADS: "Roads & Infrastructure", WATER: "Water Supply",
  GARBAGE: "Sanitation", STREETLIGHT: "Electrical",
  DRAINAGE: "Stormwater & Drainage", OTHER: "General Civic Services"
};
const COLORS = ["#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#94a3b8"];
const NAV = [
  ["Overview", LayoutDashboard], ["Map & Hotspots", MapPin],
  ["Incidents", ClipboardList], ["AI Insights", Sparkles],
  ["Departments", Users]
];
const parseCoordinates = location => {
  const match = String(location || "").match(/\[GPS:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\]/i);
  return match ? { lat: Number(match[1]), lng: Number(match[2]) } : {};
};
const normalizeIssue = issue => {
  const coords = parseCoordinates(issue.location);
  return {
    id: `CF-${issue.id}`, apiId: issue.id, title: issue.title || "Untitled issue",
    description: issue.description || "", location: String(issue.location || "").replace(/\s*\[GPS:.*?\]/i, ""),
    lat: coords.lat, lng: coords.lng,
    category: issue.category || "OTHER",
    type: CATEGORY_LABELS[issue.category] || "Other",
    priority: issue.priority === "HIGH" ? "High" : issue.priority === "LOW" ? "Low" : "Medium",
    rawStatus: issue.status || "OPEN",
    status: issue.status === "IN_PROGRESS" ? "In Progress" : issue.status === "RESOLVED" ? "Resolved" : "Submitted",
    reportedBy: issue.reporter_name || "Citizen",
    createdAt: issue.created_at || null,
    department: DEPARTMENTS[issue.category] || DEPARTMENTS.OTHER
  };
};
const dateOf = value => value ? new Date(value) : null;
const isValidDate = value => value instanceof Date && !Number.isNaN(value.getTime());
const urgencyScore = issue => {
  let score = issue.priority === "High" ? 78 : issue.priority === "Medium" ? 52 : 26;
  const text = `${issue.title} ${issue.description}`.toLowerCase();
  if (/accident|injur|hospital|school|fire|electric shock|collapse|flood|open manhole|life.?threat/.test(text)) score += 18;
  if (/traffic|blocked|overflow|contaminat|dark road|water supply/.test(text)) score += 8;
  return Math.min(100, score);
};
const groupHotspots = issues => {
  const groups = new Map();
  issues.filter(i => i.status !== "Resolved").forEach(issue => {
    const key = issue.location.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    if (!key) return;
    const item = groups.get(key) || { location: issue.location, count: 0, high: 0, categories: new Set(), ids: [] };
    item.count++; if (issue.priority === "High") item.high++;
    item.categories.add(issue.type); item.ids.push(issue.id); groups.set(key, item);
  });
  return [...groups.values()].filter(x => x.count >= 2)
    .sort((a, b) => b.count - a.count).map(x => ({ ...x, categories: [...x.categories] }));
};
function Panel({ title, action, children }) {
  return <section className="panel"><div className="panel-heading"><h3>{title}</h3>{action}</div>{children}</section>;
}
function Metric({ title, value, Icon, tone, hint }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={21}/></div><div><small>{title}</small><strong>{value}</strong><span>{hint}</span></div></div>;
}
function App() {
  const [active, setActive] = useState("Overview");
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [statusBusy, setStatusBusy] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/issues");
      if (!response.ok) throw new Error("The backend could not return complaints.");
      const data = await response.json();
      setIssues((data.issues || []).map(normalizeIssue));
      setApiError("");
      setLastUpdated(new Date());
    } catch (error) {
      setApiError(error.message || "Could not load complaints.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const stats = useMemo(() => ({
    total: issues.length,
    resolved: issues.filter(i => i.status === "Resolved").length,
    progress: issues.filter(i => i.status === "In Progress").length,
    pending: issues.filter(i => i.status === "Submitted").length,
    high: issues.filter(i => i.priority === "High" && i.status !== "Resolved").length
  }), [issues]);
  const categories = useMemo(() => Object.entries(CATEGORY_LABELS).map(([key, name], index) => ({
    name, value: issues.filter(i => i.category === key).length, color: COLORS[index]
  })).filter(x => x.value > 0), [issues]);
  const hotspots = useMemo(() => groupHotspots(issues), [issues]);
  const departments = useMemo(() => Object.entries(DEPARTMENTS).map(([key, name]) => ({
    name, category: key, total: issues.filter(i => i.category === key).length,
    open: issues.filter(i => i.category === key && i.status !== "Resolved").length,
    resolved: issues.filter(i => i.category === key && i.status === "Resolved").length
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total), [issues]);
  const weekly = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - index)); date.setHours(0,0,0,0);
      return { date, day: date.toLocaleDateString("en-IN", { weekday: "short" }), reports: 0 };
    });
    issues.forEach(issue => {
      const date = dateOf(issue.createdAt);
      if (!isValidDate(date)) return;
      const day = days.find(d => d.date.toDateString() === date.toDateString());
      if (day) day.reports++;
    });
    return days;
  }, [issues]);
  const filtered = useMemo(() => issues.filter(issue => {
    const query = search.toLowerCase();
    return `${issue.id} ${issue.title} ${issue.location} ${issue.type}`.toLowerCase().includes(query)
      && (filter === "All" || issue.status === filter);
  }), [issues, search, filter]);

  const updateStatus = async (issue, status) => {
    setStatusBusy(issue.id); setApiError("");
    const apiStatus = status === "In Progress" ? "IN_PROGRESS" : status === "Resolved" ? "RESOLVED" : "OPEN";
    try {
      const response = await fetch(`/api/issues/${issue.apiId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: apiStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Status update failed.");
      setIssues(old => old.map(item => item.id === issue.id ? normalizeIssue(data.issue) : item));
      setSelected(old => old?.id === issue.id ? normalizeIssue(data.issue) : old);
    } catch (error) { setApiError(error.message || "Could not update status."); }
    finally { setStatusBusy(""); }
  };

  const answerAssistant = () => {
    const q = assistantQuestion.toLowerCase();
    if (!q.trim()) return;
    let answer = "";
    if (/most|highest|top|many|area|location/.test(q) && /location|area|hotspot/.test(q)) {
      answer = hotspots.length ? `Most repeated unresolved location: ${hotspots[0].location} (${hotspots[0].count} reports; ${hotspots[0].high} high priority). Other repeated locations: ${hotspots.slice(1,4).map(h => `${h.location} (${h.count})`).join(", ") || "none"}.` : "No repeated unresolved locations are present in the currently loaded complaint records.";
    } else if (/garbage|road|water|streetlight|drainage/.test(q)) {
      const key = /garbage/.test(q) ? "GARBAGE" : /road|pothole/.test(q) ? "ROADS" : /water/.test(q) ? "WATER" : /streetlight|light/.test(q) ? "STREETLIGHT" : "DRAINAGE";
      const rows = issues.filter(i => i.category === key);
      answer = `${CATEGORY_LABELS[key]}: ${rows.length} total reports, ${rows.filter(i => i.status !== "Resolved").length} unresolved, ${rows.filter(i => i.priority === "High").length} high priority.`;
    } else if (/unresolved|pending|open|not resolved/.test(q)) {
      answer = `There are ${stats.pending + stats.progress} unresolved complaints: ${stats.pending} submitted and ${stats.progress} in progress. ${stats.high} unresolved complaints are marked high priority.`;
    } else if (/resolved|complete/.test(q)) {
      answer = `${stats.resolved} of ${stats.total} complaints are marked resolved (${stats.total ? Math.round(stats.resolved / stats.total * 100) : 0}% of loaded records).`;
    } else if (/department/.test(q)) {
      answer = departments.length ? `Workload by department: ${departments.map(d => `${d.name}: ${d.total} total, ${d.open} unresolved`).join("; ")}.` : "No complaint records are currently loaded.";
    } else if (/urgent|critical|risk|high priority/.test(q)) {
      const urgent = issues.filter(i => i.priority === "High" && i.status !== "Resolved");
      answer = urgent.length ? `There are ${urgent.length} unresolved high-priority complaints: ${urgent.slice(0,5).map(i => `${i.id} ${i.title} — ${i.location}`).join("; ")}.` : "No unresolved high-priority complaints are in the current dataset.";
    } else {
      answer = `Current snapshot: ${stats.total} complaints, ${stats.pending + stats.progress} unresolved, ${stats.resolved} resolved and ${stats.high} unresolved high priority. Ask about unresolved issues, high-priority cases, a category, a department or repeated locations.`;
    }
    setAssistantAnswer(answer);
  };

  const title = active === "Overview" ? "Bengaluru City Operations" : active;
  const map = (
    <MapContainer center={[12.9716, 77.5946]} zoom={12} scrollWheelZoom className="leaflet-map">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      {issues.filter(i => Number.isFinite(i.lat) && Number.isFinite(i.lng) && i.lat >= -90 && i.lat <= 90 && i.lng >= -180 && i.lng <= 180).map(i =>
        <CircleMarker key={i.id} center={[i.lat, i.lng]} radius={8} pathOptions={{
          color: "#fff", weight: 2, fillOpacity: .9,
          fillColor: i.priority === "High" ? "#f43f91" : i.status === "Resolved" ? "#34d399" : "#a78bfa"
        }}><Popup><strong>{i.id} · {i.title}</strong><br/>{i.location}<br/>{i.status} · {i.priority}</Popup></CircleMarker>
      )}
    </MapContainer>
  );

  return (
    <div className="civic-app">
      <nav className="topbar">
        <div className="brand"><div className="brand-icon"><ShieldCheck size={24}/></div><div><strong>CivicFix</strong><small>AI City Command</small></div></div>
        <div className="nav-links">{NAV.map(([name, Icon]) => <button key={name} onClick={() => setActive(name)} className={active === name ? "nav-active" : ""}><Icon size={16}/>{name}</button>)}</div>
        <div className="top-actions"><span className="live-pill"><i/> API LINKED</span><button className="notification" title="Refresh data" onClick={loadIssues}><RefreshCw size={18}/></button><div className="user-avatar">A</div></div>
      </nav>

      <main className="workspace">
        <section className="city-banner"><div className="city-copy"><span className="eyebrow">CIVICFIX / {active.toUpperCase()}</span><h1>{title}</h1><h2>{active === "Overview" ? "AI-assisted civic response platform" : "Live complaints · operational intelligence"}</h2><p>Better reporting. Smarter prioritisation. Accountable resolution.</p></div></section>
        {apiError && <div role="alert" className="civic-alert">{apiError} <button onClick={loadIssues}>Retry</button></div>}
        <div className="civic-toolbar"><span>{loading ? "Loading complaints…" : `${issues.length} records loaded from the backend`}</span><button onClick={loadIssues} disabled={loading}><RefreshCw size={14}/> Refresh</button><small>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for API"}</small></div>

        {active === "Overview" && <>
          <section className="metric-grid">
            <Metric title="Total complaints" value={stats.total} Icon={Activity} tone="violet" hint="Loaded from API"/>
            <Metric title="Resolved" value={stats.resolved} Icon={CheckCircle2} tone="green" hint={stats.total ? `${Math.round(stats.resolved / stats.total * 100)}% of records` : "No records yet"}/>
            <Metric title="In progress" value={stats.progress} Icon={Clock3} tone="blue" hint="Active work"/>
            <Metric title="Needs attention" value={stats.pending + stats.high} Icon={AlertTriangle} tone="orange" hint={`${stats.high} high priority`}/>
          </section>
          <section className="dashboard-grid">
            <Panel title="Complaint location map"><div className="map-wrap">{map}<div className="map-legend"><span><i className="pink-dot"/>High</span><span><i className="violet-dot"/>Active</span><span><i className="green-dot"/>Resolved</span></div></div><p className="civic-note">Map pins appear when a citizen submits GPS coordinates. Text-only locations remain visible in the incident list.</p></Panel>
            <Panel title="Complaint categories"><div className="distribution"><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius={42} outerRadius={66}>{categories.map(c => <Cell key={c.name} fill={c.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{stats.total}</strong><small>Reports</small></div></div><div className="category-list">{categories.map(c => <div key={c.name}><i style={{background:c.color}}/><span>{c.name}</span><b>{c.value}</b></div>)}</div></div></Panel>
            <Panel title="Reports over the last 7 days"><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weekly}><CartesianGrid stroke="#302b4b" strokeDasharray="3 3"/><XAxis dataKey="day" stroke="#aaa0c6"/><YAxis allowDecimals={false} stroke="#aaa0c6"/><Tooltip/><Area dataKey="reports" type="monotone" stroke="#a78bfa" fill="#a78bfa" fillOpacity={.2}/></AreaChart></ResponsiveContainer></div><p className="civic-note">Based only on records with a valid created_at timestamp.</p></Panel>
            <Panel title="AI priority assessment"><div className="priority-summary"><div><strong>{stats.high}</strong><span>High priority unresolved</span></div><div><strong>{issues.filter(i => i.priority === "Medium" && i.status !== "Resolved").length}</strong><span>Medium unresolved</span></div><div><strong>{issues.filter(i => i.priority === "Low" && i.status !== "Resolved").length}</strong><span>Low unresolved</span></div></div><p className="civic-note">Priority is taken from the saved complaint classification. Staff must verify safety-critical cases.</p></Panel>
            <Panel title="Repeated complaint hotspots"><div className="civic-list">{hotspots.slice(0,5).map(h => <div key={h.location}><span><b>{h.location}</b><small>{h.categories.join(", ")}</small></span><strong>{h.count} reports</strong></div>)}{!hotspots.length && <p className="civic-note">No repeated unresolved location names found in current records.</p>}</div></Panel>
            <Panel title="Recent complaints"><div className="civic-list">{issues.slice(0,5).map(i => <button key={i.id} onClick={() => setSelected(i)}><span><b>{i.title}</b><small>{i.id} · {i.location}</small></span><strong>{i.priority}</strong></button>)}{!issues.length && <p className="civic-note">No complaints returned by the API.</p>}</div></Panel>
          </section>
        </>}

        {active === "Map & Hotspots" && <section className="dashboard-grid">
          <Panel title="Live complaint map"><div className="full-map">{map}</div><p className="civic-note">Only complaints with GPS coordinates embedded in their saved location can be plotted. No coordinates are fabricated.</p></Panel>
          <Panel title="Location hotspots (derived from current records)"><div className="civic-list">{hotspots.map(h => <div key={h.location}><span><b>{h.location}</b><small>{h.categories.join(", ")} · {h.ids.join(", ")}</small></span><strong>{h.count} reports · {h.high} high</strong></div>)}{!hotspots.length && <p className="civic-note">No repeated unresolved location text found yet.</p>}</div></Panel>
        </section>}

        {active === "Incidents" && <Panel title="Complaint management"><div className="table-tools"><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, title, location or category…"/></div><select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Submitted</option><option>In Progress</option><option>Resolved</option></select></div><div className="table-scroll"><table><thead><tr><th>Complaint</th><th>Location</th><th>Department</th><th>Priority</th><th>Status</th><th>Details</th></tr></thead><tbody>{filtered.map(i => <tr key={i.id}><td><strong>{i.title}</strong><small>{i.id}</small></td><td>{i.location}</td><td>{i.department}</td><td><span className={`priority ${i.priority.toLowerCase()}`}>{i.priority}</span></td><td><select disabled={statusBusy === i.id} value={i.status} onChange={e => updateStatus(i,e.target.value)}><option>Submitted</option><option>In Progress</option><option>Resolved</option></select></td><td><button className="view-button" onClick={() => setSelected(i)}>View</button></td></tr>)}</tbody></table>{!filtered.length && <p className="empty">{loading ? "Loading…" : "No matching complaints."}</p>}</div></Panel>}

        {active === "AI Insights" && <section className="dashboard-grid">
          <Panel title="CivicFix data assistant"><div className="assistant-box"><p className="civic-note">Ask questions about the complaints currently loaded from your backend. Answers are computed from these records; this is not a generative AI chat endpoint.</p><div className="assistant-prompts">{["Which locations have repeated complaints?","How many unresolved complaints are high priority?","Which department has the most open work?","Summarise garbage complaints"].map(q => <button key={q} onClick={() => setAssistantQuestion(q)}>{q}</button>)}</div><div className="assistant-input"><input value={assistantQuestion} onChange={e => setAssistantQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && answerAssistant()} placeholder="Ask about current civic complaints…"/><button onClick={answerAssistant}><MessageCircle size={16}/> Ask</button></div>{assistantAnswer && <div className="assistant-answer"><Sparkles size={18}/><p>{assistantAnswer}</p></div>}</div></Panel>
          <Panel title="Severity and urgency estimates"><div className="civic-list">{issues.filter(i => i.status !== "Resolved").sort((a,b) => urgencyScore(b)-urgencyScore(a)).slice(0,8).map(i => <div key={i.id}><span><b>{i.title}</b><small>{i.id} · {i.location}</small></span><strong>{urgencyScore(i)}/100</strong></div>)}{!stats.pending && !stats.progress && <p className="civic-note">No unresolved complaints.</p>}</div><p className="civic-note">Score is a transparent frontend heuristic based on saved priority and risk keywords—not an AI prediction.</p></Panel>
          <Panel title="Duplicate and hotspot signals"><div className="civic-list">{hotspots.map(h => <div key={h.location}><span><b>{h.location}</b><small>Possible repeat reports: {h.ids.join(", ")}</small></span><strong>{h.count} open</strong></div>)}{!hotspots.length && <p className="civic-note">No same-location repeats detected from current location strings.</p>}</div><p className="civic-note">This is location-string grouping. Semantic/image duplicate detection requires a backend AI endpoint.</p></Panel>
          <Panel title="Estimated resolution windows"><div className="civic-list">{issues.filter(i => i.status !== "Resolved").slice(0,8).map(i => { const days = i.priority === "High" ? 1 : i.category === "ROADS" || i.category === "DRAINAGE" ? 5 : i.priority === "Low" ? 7 : 3; return <div key={i.id}><span><b>{i.id} · {i.title}</b><small>{i.department}</small></span><strong>{days === 1 ? "1 day" : `1–${days} days`}</strong></div>; })}{!stats.pending && !stats.progress && <p className="civic-note">No active complaints.</p>}</div><p className="civic-note">Planning estimates only, based on category and priority; not learned from historical resolution data.</p></Panel>
        </section>}

        {active === "Departments" && <Panel title="Department workload (derived from complaint category)"><div className="table-scroll"><table><thead><tr><th>Department</th><th>Category</th><th>Total assigned</th><th>Unresolved</th><th>Resolved</th><th>Resolution rate</th></tr></thead><tbody>{departments.map(d => <tr key={d.category}><td><strong>{d.name}</strong></td><td>{CATEGORY_LABELS[d.category]}</td><td>{d.total}</td><td>{d.open}</td><td>{d.resolved}</td><td>{Math.round(d.resolved / d.total * 100)}%</td></tr>)}</tbody></table>{!departments.length && <p className="empty">No department workload yet.</p>}</div></Panel>}

        <footer className="footer"><span>© 2026 CIVICFIX · CITY OPERATIONS PLATFORM</span><span>LIVE DATA · {issues.length} COMPLAINTS</span></footer>
      </main>

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><small>COMPLAINT DETAILS · {selected.id}</small><h2>{selected.title}</h2></div><button onClick={() => setSelected(null)}><X/></button></div><div className="modal-data"><div><small>LOCATION</small><strong>{selected.location}</strong></div><div><small>REPORTED BY</small><strong>{selected.reportedBy}</strong></div><div><small>CATEGORY</small><strong>{selected.type}</strong></div><div><small>DEPARTMENT</small><strong>{selected.department}</strong></div><div><small>PRIORITY</small><strong>{selected.priority} · heuristic score {urgencyScore(selected)}/100</strong></div><div className="description"><small>DESCRIPTION</small><p>{selected.description}</p></div><label>UPDATE STATUS<select value={selected.status} disabled={statusBusy === selected.id} onChange={e => updateStatus(selected,e.target.value)}><option>Submitted</option><option>In Progress</option><option>Resolved</option></select></label></div><button className="done-button" onClick={() => setSelected(null)}>Close details</button></div></div>}
    </div>
  );
}
export default App;
