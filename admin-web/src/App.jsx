
import { useState } from "react";
import "./App.css";

import {
  LayoutDashboard, MapPin, ClipboardList, BarChart3,
  Users, Settings, Bell, Search, X, Activity,
  CheckCircle2, Clock3, AlertTriangle, ShieldCheck
} from "lucide-react";

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell
} from "recharts";

import {
  MapContainer, TileLayer, CircleMarker, Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const initialComplaints = [
  { id:"CF-1001", title:"Pothole on MG Road", type:"Pothole", location:"MG Road, Bengaluru", status:"In Progress", priority:"High", department:"Roads", reportedBy:"Ravi Kumar", description:"A large pothole is affecting two-wheeler traffic.", lat:12.9758, lng:77.6052 },
  { id:"CF-1002", title:"Garbage near Bus Stop", type:"Garbage", location:"Shivaji Nagar, Bengaluru", status:"Submitted", priority:"Medium", department:"Sanitation", reportedBy:"Ananya S", description:"Garbage is accumulating beside the bus stop.", lat:12.9868, lng:77.6051 },
  { id:"CF-1003", title:"Streetlight not working", type:"Streetlight", location:"Indiranagar, Bengaluru", status:"Resolved", priority:"Low", department:"Electrical", reportedBy:"Meera N", description:"Streetlight is not working in the residential lane.", lat:12.9784, lng:77.6408 },
  { id:"CF-1004", title:"Water leakage", type:"Water Leakage", location:"Jayanagar, Bengaluru", status:"Submitted", priority:"High", department:"Water Supply", reportedBy:"Suresh B", description:"Water is leaking from a roadside pipe.", lat:12.9250, lng:77.5838 },
  { id:"CF-1005", title:"Blocked drainage", type:"Drainage", location:"Koramangala, Bengaluru", status:"In Progress", priority:"Medium", department:"Drainage", reportedBy:"Arjun P", description:"The roadside drain is blocked.", lat:12.9352, lng:77.6245 }
];

const weekly = [
  { day:"Mon", reports:24 },
  { day:"Tue", reports:38 },
  { day:"Wed", reports:31 },
  { day:"Thu", reports:46 },
  { day:"Fri", reports:39 },
  { day:"Sat", reports:57 },
  { day:"Sun", reports:48 }
];

const categories = [
  { name:"Roads", value:32, color:"#a78bfa" },
  { name:"Sanitation", value:25, color:"#38bdf8" },
  { name:"Water", value:20, color:"#34d399" },
  { name:"Electrical", value:13, color:"#fbbf24" },
  { name:"Drainage", value:10, color:"#d946ef" }
];

const nav = [
  ["Overview", LayoutDashboard],
  ["Map", MapPin],
  ["Incidents", ClipboardList],
  ["Analytics", BarChart3],
  ["Departments", Users],
  ["Settings", Settings]
];

function Panel({ title, children, action }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CitySkyline() {
  return (
    <div className="vidhana-hero">
      <img
        src="https://live.staticflickr.com/4146/4954932324_06b82f23c9_o.jpg"
        alt="Vidhana Soudha illuminated at night in Bengaluru"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <div className="vidhana-overlay" />
      <a
        className="photo-credit"
        href="https://commons.wikimedia.org/wiki/File:Vidhana_Soudha_at_Night.jpg"
        target="_blank"
        rel="noreferrer"
      >
        Photo: Omshivaprakash H L
      </a>
    </div>
  );
}

function App() {
  const [active, setActive] = useState("Overview");
  const [complaints, setComplaints] = useState(initialComplaints);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const updateStatus = (id, status) => {
    setComplaints(old =>
      old.map(c => c.id === id ? { ...c, status } : c)
    );

    setSelected(old =>
      old?.id === id ? { ...old, status } : old
    );
  };

  const filtered = complaints.filter(c => {
    const q = search.toLowerCase();

    return `${c.id} ${c.title} ${c.location}`
      .toLowerCase()
      .includes(q) &&
      (filter === "All" || c.status === filter);
  });

  const titles = {
    Overview: "Bengaluru",
    Map: "Incident Map",
    Incidents: "Incident Management",
    Analytics: "Analytics & Insights",
    Departments: "Department Management",
    Settings: "System Settings"
  };

  const map = (
    <MapContainer
      center={[12.9716, 77.6100]}
      zoom={12}
      scrollWheelZoom={true}
      className="leaflet-map"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {complaints.map(c => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor:
              c.priority === "High"
                ? "#f43f91"
                : c.status === "Resolved"
                ? "#34d399"
                : "#a78bfa",
            fillOpacity: 1
          }}
        >
          <Popup>
            <strong>{c.title}</strong><br />
            {c.location}<br />
            {c.status}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );

  return (
    <div className="civic-app">

      {/* TOP NAVIGATION */}
      <nav className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <strong>CivicFix</strong>
            <small>City Command</small>
          </div>
        </div>

        <div className="nav-links">
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => setActive(name)}
              className={active === name ? "nav-active" : ""}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </div>

        <div className="top-actions">
          <span className="live-pill"><i /> LIVE</span>
          <button className="notification">
            <Bell size={19} />
            <b>3</b>
          </button>
          <div className="user-avatar">A</div>
        </div>
      </nav>

      <main className="workspace">

        {/* CITY BANNER */}
        <section className="city-banner">
          <div className="city-copy">
            <span className="eyebrow">
              CIVICFIX / {active.toUpperCase()}
            </span>

            <h1>{titles[active]}</h1>

            {active === "Overview" && (
              <h2>City Operations Dashboard</h2>
            )}

            {active === "Overview" ? (
              <div className="city-tagline">
                <span className="tagline-line"></span>
                <p>
                  <strong>Better Tomorrow,</strong> A Cleaner &amp; Safer Bengaluru
                </p>
              </div>
            ) : (
              <p>Real-time incident monitoring, analysis and response</p>
            )}
          </div>

          {active === "Overview" && <CitySkyline />}
        </section>

        {/* OVERVIEW */}
        {active === "Overview" && (
          <>
            <section className="metric-grid">
              {[
                ["Total Incidents", "1,320", Activity, "violet"],
                ["Resolved", "1,123", CheckCircle2, "green"],
                ["In Progress", "560", Clock3, "blue"],
                ["Pending", "480", AlertTriangle, "orange"]
              ].map(([label, value, Icon, color]) => (
                <div className="metric-card" key={label}>
                  <div className={`metric-icon ${color}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <small>{label}</small>
                    <strong>{value}</strong>
                    <span>↑ 12% this week</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="dashboard-grid">

              <Panel
                title="Incident Map"
                action={<span className="live-map-tag">LIVE MAP</span>}
              >
                <div className="map-wrap">
                  {map}
                  <div className="map-legend">
                    <span><i className="pink-dot" /> Critical</span>
                    <span><i className="yellow-dot" /> Major</span>
                    <span><i className="blue-dot" /> Minor</span>
                    <span><i className="orange-dot" /> Warning</span>
                  </div>
                </div>
              </Panel>

              <Panel title="Key Metrics">
                <div className="mini-metrics">
                  <div><Activity /><strong>1,320</strong><small>Total</small></div>
                  <div><CheckCircle2 /><strong>1,123</strong><small>Resolved</small></div>
                  <div><Clock3 /><strong>560</strong><small>In Progress</small></div>
                  <div><AlertTriangle /><strong>480</strong><small>Pending</small></div>
                </div>

                <div className="distribution">
                  <div className="donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categories}
                          dataKey="value"
                          innerRadius={48}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {categories.map(c => (
                            <Cell key={c.name} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="donut-center">
                      <strong>1,320</strong>
                      <small>Reports</small>
                    </div>
                  </div>

                  <div className="category-list">
                    {categories.map(c => (
                      <div key={c.name}>
                        <i style={{ background: c.color }} />
                        <span>{c.name}</span>
                        <b>{c.value}%</b>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Severity Trend">
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weekly}>
                      <defs>
                        <linearGradient
                          id="areaPurple"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#a78bfa"
                            stopOpacity={0.55}
                          />
                          <stop
                            offset="100%"
                            stopColor="#a78bfa"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="#302b4b"
                        strokeDasharray="3 3"
                      />
                      <XAxis dataKey="day" stroke="#aaa0c6" />
                      <YAxis stroke="#aaa0c6" />
                      <Tooltip
                        contentStyle={{
                          background: "#17132b",
                          border: "1px solid #6745a4"
                        }}
                      />
                      <Area
                        dataKey="reports"
                        type="monotone"
                        stroke="#a78bfa"
                        fill="url(#areaPurple)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Ward Response Rate">
                <div className="ward-list">
                  {[
                    ["Central", 85],
                    ["East", 68],
                    ["South", 73],
                    ["West", 57],
                    ["North", 91]
                  ].map(([name, value]) => (
                    <div className="ward-row" key={name}>
                      <span>{name}</span>
                      <div><i style={{ width: `${value}%` }} /></div>
                      <b>{value}%</b>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="System Status">
                <div className="system-ok">
                  <CheckCircle2 /> All Systems Operational
                </div>

                {[
                  ["Network", 92],
                  ["Database", 95],
                  ["Services", 88]
                ].map(([name, value]) => (
                  <div className="system-row" key={name}>
                    <span>{name}</span>
                    <b>{value}%</b>
                  </div>
                ))}
              </Panel>

              <Panel
                title="Recent Incidents"
                action={
                  <button
                    className="view-all"
                    onClick={() => setActive("Incidents")}
                  >
                    View all →
                  </button>
                }
              >
                <div className="recent-list">
                  {complaints.slice(0, 4).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                    >
                      <i
                        className={
                          c.priority === "High"
                            ? "pink-dot"
                            : "violet-dot"
                        }
                      />
                      <span>
                        <strong>{c.title}</strong>
                        <small>{c.location}</small>
                      </span>
                      <b>{c.priority}</b>
                    </button>
                  ))}
                </div>
              </Panel>

            </section>
          </>
        )}

        {/* MAP PAGE */}
        {active === "Map" && (
          <Panel title="Bengaluru Live Incident Map">
            <div className="full-map">{map}</div>
          </Panel>
        )}

        {/* INCIDENTS PAGE */}
        {active === "Incidents" && (
          <Panel title="All Civic Incidents">
            <div className="table-tools">
              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by ID, issue or location..."
                />
              </div>

              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option>All</option>
                <option>Submitted</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.title}</strong>
                        <small>{c.id}</small>
                      </td>
                      <td>{c.location}</td>
                      <td>
                        <span className={`priority ${c.priority.toLowerCase()}`}>
                          {c.priority}
                        </span>
                      </td>
                      <td>
                        <select
                          value={c.status}
                          onChange={e => updateStatus(c.id, e.target.value)}
                        >
                          <option>Submitted</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="view-button"
                          onClick={() => setSelected(c)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="empty">No matching incidents found.</p>
              )}
            </div>
          </Panel>
        )}

        {/* ANALYTICS */}
        {active === "Analytics" && (
          <div className="analytics-grid">
            <Panel title="Weekly Incident Reports">
              <div className="large-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly}>
                    <CartesianGrid
                      stroke="#302b4b"
                      strokeDasharray="3 3"
                    />
                    <XAxis dataKey="day" stroke="#aaa0c6" />
                    <YAxis stroke="#aaa0c6" />
                    <Tooltip />
                    <Bar
                      dataKey="reports"
                      fill="#a78bfa"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Issue Distribution">
              <div className="large-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={110}
                      label
                    >
                      {categories.map(c => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        )}

        {/* OTHER PAGES */}
        {["Departments", "Settings"].includes(active) && (
          <Panel title={titles[active]}>
            <div className="placeholder">
              <Settings size={36} />
              <h2>{titles[active]}</h2>
              <p>This section will be developed in the next stage.</p>
            </div>
          </Panel>
        )}

        <footer className="footer">
          <span>© 2026 CIVICFIX · CITY OPERATIONS PLATFORM</span>
          <span>PROTOTYPE ENVIRONMENT</span>
        </footer>
      </main>

      {/* INCIDENT DETAILS */}
      {selected && (
        <div
          className="modal-backdrop"
          onClick={() => setSelected(null)}
        >
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>INCIDENT DETAILS · {selected.id}</small>
                <h2>{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>

            <div className="modal-data">
              <div>
                <small>LOCATION</small>
                <strong>{selected.location}</strong>
              </div>
              <div>
                <small>REPORTED BY</small>
                <strong>{selected.reportedBy}</strong>
              </div>
              <div>
                <small>CATEGORY</small>
                <strong>{selected.type}</strong>
              </div>
              <div>
                <small>DEPARTMENT</small>
                <strong>{selected.department}</strong>
              </div>
              <div className="description">
                <small>DESCRIPTION</small>
                <p>{selected.description}</p>
              </div>
              <label>
                UPDATE STATUS
                <select
                  value={selected.status}
                  onChange={e => updateStatus(selected.id, e.target.value)}
                >
                  <option>Submitted</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
              </label>
            </div>

            <button
              className="done-button"
              onClick={() => setSelected(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;