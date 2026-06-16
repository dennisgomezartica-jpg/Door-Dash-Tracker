import "./index.css"
import { useState, useEffect, useRef, useMemo } from "react";

const DEFAULT_TAX_RATE = 0.153;
const DEFAULT_MILEAGE_RATE = 0.70;
const TIME_WINDOWS = ["11AM–1PM","1PM–3PM","3PM–5PM","5PM–7PM","5PM–9PM","5PM–10PM","7PM–10PM","9AM–12PM","5PM–8:30PM","5PM–8PM","5PM–7:30PM","5PM–6PM","All Day"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const CITIES = ["Newnan GA","Peachtree City","Fayetteville","Senoia","Other"];
const HOLIDAYS = [
  "None",
  "New Year's Day", "Valentine's Day", "St. Patrick's Day",
  "Easter", "Mother's Day", "Memorial Day", "Father's Day",
  "July 4th", "Labor Day", "Halloween", "Veterans Day",
  "Thanksgiving", "Black Friday", "Christmas Eve", "Christmas Day",
  "New Year's Eve", "Super Bowl Sunday",
];

const SEED_DATA = [
  { id:1,  date:"2026-05-21", hours:4,   miles:75,     gross:79.24,  timeWindow:"5PM–9PM",    day:"Thursday", rained:false, gas:20.57, carMaint:0, notes:"", city:"Newnan GA" },
  { id:2,  date:"2026-05-22", hours:0.5, miles:15.54,  gross:17.20,  timeWindow:"11AM–1PM",   day:"Friday",   rained:false, gas:0,     carMaint:0, notes:"", city:"Newnan GA" },
  { id:3,  date:"2026-05-22", hours:4,   miles:121.44, gross:125.49, timeWindow:"5PM–10PM",   day:"Friday",   rained:false, gas:52.75, carMaint:0, notes:"", city:"Newnan GA" },
  { id:4,  date:"2026-05-23", hours:1,   miles:24.21,  gross:17.55,  timeWindow:"5PM–6PM",    day:"Saturday", rained:false, gas:0,     carMaint:0, notes:"", city:"Newnan GA" },
  { id:5,  date:"2026-05-24", hours:4,   miles:74.42,  gross:80.31,  timeWindow:"5PM–9PM",    day:"Sunday",   rained:false, gas:20.25, carMaint:0, notes:"", city:"Newnan GA" },
  { id:6,  date:"2026-05-26", hours:4,   miles:79.55,  gross:54.85,  timeWindow:"5PM–9PM",    day:"Tuesday",  rained:false, gas:0,     carMaint:0, notes:"", city:"Newnan GA" },
  { id:7,  date:"2026-05-28", hours:2.5, miles:47.33,  gross:25.15,  timeWindow:"5PM–7:30PM", day:"Thursday", rained:false, gas:0,     carMaint:0, notes:"", city:"Newnan GA" },
  { id:8,  date:"2026-05-30", hours:5,   miles:120.92, gross:139.70, timeWindow:"5PM–10PM",   day:"Saturday", rained:true,  gas:0,     carMaint:0, notes:"", city:"Newnan GA" },
  { id:9,  date:"2026-06-05", hours:3.5, miles:66.93,  gross:45.80,  timeWindow:"5PM–8:30PM", day:"Friday",   rained:false, gas:47.31, carMaint:0, notes:"", city:"Newnan GA" },
  { id:10, date:"2026-06-06", hours:3,   miles:67.24,  gross:49.20,  timeWindow:"5PM–8PM",    day:"Saturday", rained:false, gas:0,     carMaint:0, notes:"", city:"Newnan GA" },
];

const DEFAULT_SETTINGS = { taxRate:DEFAULT_TAX_RATE, mileageRate:DEFAULT_MILEAGE_RATE, weeklyGoal:500, monthlyGoal:2000 };
const STORAGE_KEY = "doordash_sessions_v3";
const SETTINGS_KEY = "doordash_settings_v1";

const API = "https://doordash-api-production.up.railway.app";

async function loadSessions() {
  try {
    const res = await fetch(`${API}/sessions`);
    const data = await res.json();
    return data.length > 0 ? data : null;
  } catch { return null; }
}
async function saveSession(s) {
  try { await fetch(`${API}/sessions`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(s) }); } catch {}
}
async function deleteSessionAPI(id) {
  try { await fetch(`${API}/sessions/${id}`, { method:"DELETE" }); } catch {}
}
async function loadSettings() { try { const r = localStorage.getItem(SETTINGS_KEY); if (r) return { ...DEFAULT_SETTINGS, ...JSON.parse(r) }; } catch {} return DEFAULT_SETTINGS; }
async function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {} }

const fmt$ = (n) => "$" + (Number(n)||0).toFixed(2);
const fmtN = (n, d=1) => (Number(n)||0).toFixed(d);

function computeTotals(sessions, taxRate=DEFAULT_TAX_RATE, mileageRate=DEFAULT_MILEAGE_RATE) {
  const totalHours = sessions.reduce((s,r) => s+(r.hours||0), 0);
  const totalMiles = sessions.reduce((s,r) => s+(r.miles||0), 0);
  const totalGross = sessions.reduce((s,r) => s+(r.gross||0), 0);
  const totalGas   = sessions.reduce((s,r) => s+(r.gas||0), 0);
  const mileDeduction = totalMiles * mileageRate;
  const taxableIncome = Math.max(0, totalGross - mileDeduction);
  const taxOwed   = taxableIncome * taxRate;
  const netProfit = totalGross - taxOwed;
  const avgActual   = totalHours > 0 ? totalGross / totalHours : 0;
  const avgAfterTax = totalHours > 0 ? netProfit / totalHours : 0;
  return { totalHours, totalMiles, totalGross, totalGas, mileDeduction, taxableIncome, taxOwed, netProfit, avgActual, avgAfterTax };
}

function exportCSV(sessions) {
  const headers = ["Date","Hours","Miles","Gross Earnings","Hour of the Day","Day of the Week","Rained or Not","Gas Expenses","Car Maintenance","Notes","City"];
  const rows = [...sessions].sort((a,b) => a.date.localeCompare(b.date))
    .map(s => [s.date,s.hours,s.miles,s.gross,s.timeWindow,s.day,s.rained?"Yes":"No",s.gas||0,s.carMaint||0,s.notes||"",s.city||"Newnan GA"].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const uri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const a = document.createElement("a"); a.href=uri; a.download="doordash_sessions.csv"; a.click();
}

function exportExcel(sessions, totals, settings) {
  const sorted = [...sessions].sort((a,b) => a.date.localeCompare(b.date));
  const rows = [
    ["DoorDash Earnings Tracker"],[""],["LOCATION","Newnan GA"],
    ["Date","Hours","Miles","Gross Earnings","Hour of the Day","Day of the Week","Rained or Not","Gas Expenses","Car Maint.","Notes"],
    ...sorted.map(s => [s.date,s.hours,s.miles,s.gross,s.timeWindow,s.day,s.rained?"Yes":"No",s.gas||0,s.carMaint||0,s.notes||""]),
    [""],["TOTALS:"],["Total Hours:",totals.totalHours],["Total Miles:",+totals.totalMiles.toFixed(2)],
    ["Total Gross:",+totals.totalGross.toFixed(2)],["Total Gas Spent:",+totals.totalGas.toFixed(2)],
    ["Mileage Deduction:",+totals.mileDeduction.toFixed(2)],["Tax Owed:",+totals.taxOwed.toFixed(2)],
    ["Net Profit:",+totals.netProfit.toFixed(2)],[""],
    ["Average $/Hour (Actual):",+totals.avgActual.toFixed(2)],["Average $/Hour (After Tax):",+totals.avgAfterTax.toFixed(2)],
    [""],["Tax Rate:",(settings.taxRate*100).toFixed(1)+"%"],["Mileage Rate:","$"+settings.mileageRate.toFixed(2)+"/mile"],
  ];
  const xmlRows = rows.map(row => "<Row>"+row.map(cell => {
    if (cell===""||cell===null||cell===undefined) return '<Cell><Data ss:Type="String"></Data></Cell>';
    if (typeof cell==="number") return `<Cell><Data ss:Type="Number">${cell}</Data></Cell>`;
    return `<Cell><Data ss:Type="String">${String(cell).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</Data></Cell>`;
  }).join("")+"</Row>").join("");
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Newnan GA Doordash Stats"><Table>${xmlRows}</Table></Worksheet></Workbook>`;
  const b64 = btoa(unescape(encodeURIComponent(xml)));
  const uri = "data:application/vnd.ms-excel;base64,"+b64;
  const a = document.createElement("a"); a.href=uri; a.download="doordash_tracker.xls"; a.click();
}

const C = {
  bg:"#0A0F1E", surface:"#111827", surface2:"#1C2537",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  text:"#F0F4FF", muted:"#8896B3", accent:"#FF3008", accentDim:"rgba(255,48,8,0.15)",
  green:"#00C896", greenDim:"rgba(0,200,150,0.12)", amber:"#F5A623", amberDim:"rgba(245,166,35,0.12)", purple:"#8B6FE8",
};

const API_URL = "https://doordash-api-production.up.railway.app";
const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');`;

function Label({ children, style }) {
  return <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted, ...style }}>{children}</div>;
}

function useCountUp(target, duration=800) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current; const diff = target - start;
    const startTime = performance.now();
    function step(now) {
      const p = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1-p, 3);
      setVal(start + diff * ease);
      if (p < 1) requestAnimationFrame(step);
      else prev.current = target;
    }
    requestAnimationFrame(step);
  }, [target]);
  return val;
}

function BigStat({ label, value, sub, accent }) {
  const animated = useCountUp(value);
  return (
    <div style={{ textAlign:"center", padding:"8px 0" }}>
      <Label style={{ marginBottom:6 }}>{label}</Label>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:48, color: accent ? C.accent : C.text, lineHeight:1, letterSpacing:"-0.02em" }}>
        ${animated.toFixed(2)}
      </div>
      {sub && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.muted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:16, padding:"16px", ...style }}>{children}</div>;
}

function MiniStat({ label, value, valueColor }) {
  return (
    <div style={{ background:C.surface2, borderRadius:12, padding:"12px 14px" }}>
      <Label style={{ marginBottom:5 }}>{label}</Label>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:600, color:valueColor||C.text }}>{value}</div>
    </div>
  );
}

function GoalBar({ label, current, goal }) {
  const pct = Math.min(100, goal > 0 ? (current/goal)*100 : 0);
  const over = current >= goal;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.muted }}>{label}</span>
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:500, color: over ? C.green : C.text }}>{fmt$(current)} / {fmt$(goal)}</span>
      </div>
      <div style={{ height:5, background:C.surface2, borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background: over ? C.green : C.accent, borderRadius:99, transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color: over ? C.green : C.muted, marginTop:3, textAlign:"right" }}>
        {over ? `🎯 Goal reached! +${fmt$(current-goal)}` : `${fmt$(goal-current)} to go`}
      </div>
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color, label }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ marginTop:8 }}>
      {data.map((d,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <div style={{ width:76, fontFamily:"'DM Sans',sans-serif", fontSize:10, color:C.muted, textAlign:"right", flexShrink:0 }}>{d[labelKey]}</div>
          <div style={{ flex:1, background:C.surface2, borderRadius:4, height:16, overflow:"hidden" }}>
            <div style={{ width:`${(d[valueKey]/max)*100}%`, height:"100%", background:color||C.accent, borderRadius:4, transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
          <div style={{ width:44, fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.text, fontWeight:500, textAlign:"right" }}>{fmt$(d[valueKey])}</div>
        </div>
      ))}
      {label && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, color:C.muted, textAlign:"right", marginTop:4, letterSpacing:"0.05em" }}>{label}</div>}
    </div>
  );
}

function BestCombos({ sessions }) {
  const combos = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      const key = `${s.day}·${s.timeWindow}·${s.city||"Newnan GA"}`;
      if (!map[key]) map[key] = { day:s.day, timeWindow:s.timeWindow, city:s.city||'Newnan GA', gross:0, hours:0, count:0 };
      map[key].gross += s.gross||0; map[key].hours += s.hours||0; map[key].count++;
    });
    return Object.values(map).map(v => ({ ...v, perHour:v.hours>0?v.gross/v.hours:0 })).sort((a,b) => b.perHour-a.perHour).slice(0,3);
  }, [sessions]);
  if (!combos.length) return null;
  const medals = ["🥇","🥈","🥉"];
  return (
    <div style={{ marginBottom:24 }}>
      <Label style={{ marginBottom:12 }}>Best Combos · Newnan GA</Label>
      {combos.map((c,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:C.surface2, borderRadius:12, marginBottom:8, border:`0.5px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>{medals[i]}</span>
            <div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, color:C.text }}>{c.day}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.muted }}>{c.timeWindow} · {c.city}</div>
              {c.hours < 1.5 && <span style={{ fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:6, background:C.amberDim, color:C.amber, letterSpacing:"0.06em", textTransform:"uppercase" }}>low data</span>}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.green }}>{fmt$(c.perHour)}/hr</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:C.muted }}>{c.count} session{c.count!==1?"s":""} · {fmtN(c.hours)}h</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <Label style={{ marginBottom:14, marginTop:4 }}>{children}</Label>;
}

function Btn({ children, onClick, full, primary, style }) {
  return (
    <button onClick={onClick} style={{
      fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, cursor:"pointer",
      width: full ? "100%" : undefined,
      padding:"11px 18px", borderRadius:10,
      background: primary ? C.accent : "transparent",
      color: primary ? "#fff" : C.text,
      border: primary ? "none" : `0.5px solid ${C.border2}`,
      ...style
    }}>{children}</button>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <Label style={{ marginBottom:6 }}>{label}</Label>
      {children}
    </div>
  );
}

const inputStyle = {
  width:"100%", boxSizing:"border-box",
  background:C.surface2, border:`0.5px solid ${C.border2}`,
  borderRadius:10, padding:"10px 12px",
  fontFamily:"'DM Sans',sans-serif", fontSize:14,
  color:C.text, outline:"none",
};

export default function App() {
  const [sessions, setSessions]     = useState(null);
  const [settings, setSettings]     = useState(DEFAULT_SETTINGS);
  const [settingsForm, setSettingsForm] = useState(null);
  const [view, setView]             = useState("dashboard");
  const [editId, setEditId]         = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [undoSession, setUndoSession] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("all");
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [dragging, setDragging]     = useState(false);
  const [weather, setWeather]       = useState([]);
  const [importMsg, setImportMsg]   = useState("");
  const [lastSaved, setLastSaved]   = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");
  const undoTimer = useRef(null);
  const fileRef   = useRef();
  const blankForm = { date:new Date().toISOString().slice(0,10), hours:"", miles:"", gross:"", timeWindow:"5PM–9PM", day:DAYS[new Date().getDay()===0?6:new Date().getDay()-1], rained:false, gas:"", carMaint:"", notes:"", city:"Newnan GA", event_impact:"", holiday:"None" };
  const [detectedEvents, setDetectedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [form, setForm] = useState(blankForm);

  useEffect(() => {
    Promise.all([loadSessions(), loadSettings()]).then(([data, s]) => {
      setSessions(data || SEED_DATA);
      setSettings(s); setSettingsForm(s);
    });
  }, []);

  useEffect(() => { if (sessions !== null) { setLastSaved(new Date()); } }, [sessions]);
  useEffect(() => { fetchWeather(); }, []);
  useEffect(() => { if (settingsForm) saveSettings(settingsForm); }, [settingsForm]);

  const totals      = useMemo(() => sessions ? computeTotals(sessions, settings.taxRate, settings.mileageRate) : null, [sessions, settings]);
  const weekSessions  = useMemo(() => { if (!sessions) return []; const ago = new Date(Date.now()-7*86400000); return sessions.filter(s => new Date(s.date) >= ago); }, [sessions]);
  const monthSessions = useMemo(() => { if (!sessions) return []; const n = new Date(); return sessions.filter(s => { const d=new Date(s.date); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }); }, [sessions]);
  const weekTotals  = useMemo(() => computeTotals(weekSessions,  settings.taxRate, settings.mileageRate), [weekSessions,  settings]);
  const monthTotals = useMemo(() => computeTotals(monthSessions, settings.taxRate, settings.mileageRate), [monthSessions, settings]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (analyticsRange==="month") return monthSessions;
    if (analyticsRange==="30d") { const ago=new Date(Date.now()-30*86400000); return sessions.filter(s=>new Date(s.date)>=ago); }
    return sessions;
  }, [sessions, analyticsRange, monthSessions]);

  const weeklyTrend = useMemo(() => {
    if (!sessions||!sessions.length) return [];
    const map = {};
    sessions.forEach(s => {
      const d=new Date(s.date), day=d.getDay(), mon=new Date(d);
      mon.setDate(d.getDate()-(day===0?6:day-1));
      const key=mon.toISOString().slice(0,10);
      if (!map[key]) map[key]={week:key,gross:0,hours:0};
      map[key].gross+=s.gross||0; map[key].hours+=s.hours||0;
    });
    return Object.values(map).sort((a,b)=>a.week.localeCompare(b.week)).map(v=>({...v,perHour:v.hours>0?v.gross/v.hours:0}));
  }, [sessions]);

  const bestWorst = useMemo(() => {
    if (!sessions||!sessions.length) return null;
    const w = sessions.filter(s=>s.hours>=1.5).map(s=>({...s,perHour:s.hours>0?s.gross/s.hours:0}));
    if (!w.length) return null;
    return { best:w.reduce((a,b)=>b.perHour>a.perHour?b:a), worst:w.reduce((a,b)=>b.perHour<a.perHour?b:a) };
  }, [sessions]);

  const projection = useMemo(() => {
    if (!sessions) return null;
    const ago=new Date(Date.now()-30*86400000), recent=sessions.filter(s=>new Date(s.date)>=ago);
    if (!recent.length) return null;
    const g30=recent.reduce((s,r)=>s+(r.gross||0),0), m30=recent.reduce((s,r)=>s+(r.miles||0),0);
    const annGross=g30*(365/30), annMiles=m30*(365/30);
    const tax=Math.max(0,annGross-annMiles*settings.mileageRate)*settings.taxRate;
    return { annualGross:annGross, annualNet:annGross-tax, basedOn:recent.length };
  }, [sessions, settings]);

  async function fetchWeather() {
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=33.3807&longitude=-84.7997&daily=temperature_2m_max,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=14");
      const data = await res.json();
      setWeather(data.daily.time.map((date, i) => ({
        date, high: Math.round(data.daily.temperature_2m_max[i]),
        rainChance: data.daily.precipitation_probability_max[i],
        code: data.daily.weathercode[i],
      })));
    } catch(err) { console.error("Weather fetch failed:", err); }
  }

  function weatherEmoji(code, rainChance) {
    if (rainChance >= 60) return "🌧";
    if (rainChance >= 30) return "🌦";
    if (code >= 95) return "⛈";
    if (code >= 80 || code >= 61) return "🌧";
    if (code >= 51) return "🌦";
    if (code >= 45) return "🌫";
    if (code >= 3)  return "☁️";
    if (code >= 1)  return "⛅";
    return "☀️";
  }

  async function migrateLocalSessions() {
    setMigrating(true); setMigrateMsg("");
    try {
      const raw = localStorage.getItem("doordash_sessions_v3");
      if (!raw) { setMigrateMsg("No local sessions found."); setMigrating(false); return; }
      const local = JSON.parse(raw);
      if (!local.length) { setMigrateMsg("No local sessions found."); setMigrating(false); return; }
      let saved = 0;
      for (const s of local) {
        await fetch("https://doordash-api-production.up.railway.app/sessions", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(s)
        });
        saved++;
      }
      // Reload sessions from DB
      const res = await fetch("https://doordash-api-production.up.railway.app/sessions");
      const data = await res.json();
      setSessions(data.length > 0 ? data : SEED_DATA);
      setMigrateMsg(`✅ ${saved} sessions migrated to database!`);
    } catch(err) {
      setMigrateMsg("Migration failed: " + err.message);
    }
    setMigrating(false);
  }

  async function fetchEvents() {
    setEventsLoading(true); setEventsError("");
    try {
      const res = await fetch("https://doordash-api-production.up.railway.app/events");
      const data = await res.json();
      setEvents(data.events || []);
      if (!data.events || data.events.length === 0) setEventsError("No upcoming events found.");
    } catch(err) {
      setEventsError("Could not connect to API. Make sure the backend is running.");
    }
    setEventsLoading(false);
  }

  async function handleFormChange(e) {
    const {name,value,type,checked}=e.target;
    if (name === "date" && value) {
      const d = new Date(value + "T12:00:00");
      const dow = DAYS[d.getDay()===0?6:d.getDay()-1];
      setForm(f=>({...f, date:value, day:dow, event_impact:"", holiday:"None"}));
      setDetectedEvents([]);
      setLoadingEvents(true);
      try {
        const res = await fetch(`https://doordash-api-production.up.railway.app/events/by-date?date=${value}`);
        const data = await res.json();
        setDetectedEvents(data.events || []);
      } catch {}
      setLoadingEvents(false);
    } else {
      setForm(f=>({...f,[name]:type==="checkbox"?checked:value}));
    }
  }

  function handleSubmit() {
    if (!form.date||!form.hours||!form.miles||!form.gross) return;
    const was = !!editId;
    const s = { id:editId||Date.now(), date:form.date, hours:parseFloat(form.hours), miles:parseFloat(form.miles), gross:parseFloat(form.gross), timeWindow:form.timeWindow, day:form.day, rained:form.rained, gas:parseFloat(form.gas)||0, carMaint:parseFloat(form.carMaint)||0, notes:form.notes||"", city:form.city||"Newnan GA" };
    if (was) { setSessions(arr => arr.map(r=>r.id===editId?s:r)); setEditId(null); } else { setSessions(arr=>[...arr,s]); }
    saveSession(s);
    setForm(blankForm); setView(was?"sessions":"dashboard");
  }

  function handleEdit(s) { setEditId(s.id); setForm({ date:s.date, hours:s.hours, miles:s.miles, gross:s.gross, timeWindow:s.timeWindow, day:s.day, rained:s.rained, gas:s.gas||"", carMaint:s.carMaint||"", notes:s.notes||"", city:s.city||"Newnan GA" }); setView("add"); }

  function handleDelete(id) {
    const deleted = sessions.find(s=>s.id===id);
    setSessions(s=>s.filter(r=>r.id!==id));
    deleteSessionAPI(id);
    setUndoSession(deleted); setConfirmDeleteId(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(()=>setUndoSession(null), 5000);
  }

  function handleUndo() { if (undoSession) { setSessions(s=>[...s,undoSession]); setUndoSession(null); if (undoTimer.current) clearTimeout(undoTimer.current); } }

  async function handleZip(file) {
    if (!file) return; setImportMsg("Importing...");
    try {
      const JSZip=(await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
      const zip=await JSZip.loadAsync(file); let csvText=null;
      for (const [name,f] of Object.entries(zip.files)) { if (name.toLowerCase().includes("delivery")&&name.endsWith(".csv")) { csvText=await f.async("text"); break; } }
      if (!csvText) for (const [name,f] of Object.entries(zip.files)) { if (name.endsWith(".csv")) { csvText=await f.async("text"); break; } }
      if (!csvText) { setImportMsg("No CSV found in archive."); return; }
      const lines=csvText.split("\n").filter(l=>l.trim());
      const headers=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/['"]/g,""));
      const find=(...keys)=>headers.findIndex(h=>keys.some(k=>h.includes(k)));
      const dateIdx=find("date","delivery_date","created"), hoursIdx=find("active_time","hours","duration"), milesIdx=find("miles","distance"), grossIdx=find("total_pay","earnings","payout","gross","pay"), timeIdx=find("time","timestamp","created_at");
      let imported=0, skipped=0; const newS=[];
      for (let i=1;i<lines.length;i++) {
        const cols=lines[i].split(",").map(c=>c.trim().replace(/^["']|["']$/g,""));
        if (cols.length<2) continue;
        const rawDate=dateIdx>=0?cols[dateIdx]:cols[timeIdx>=0?timeIdx:0]; if (!rawDate) continue;
        const d=new Date(rawDate); if (isNaN(d)) continue;
        const dateStr=d.toISOString().slice(0,10), hour=d.getHours();
        const tw=hour<12?"9AM–12PM":hour<13?"11AM–1PM":hour<15?"1PM–3PM":hour<17?"3PM–5PM":"5PM–9PM";
        const dow=DAYS[d.getDay()===0?6:d.getDay()-1];
        if (sessions.some(s=>s.date===dateStr&&s.timeWindow===tw)) { skipped++; continue; }
        newS.push({ id:Date.now()+i, date:dateStr, hours:hoursIdx>=0?(parseFloat(cols[hoursIdx])||0):0, miles:milesIdx>=0?(parseFloat(cols[milesIdx])||0):0, gross:grossIdx>=0?(parseFloat(cols[grossIdx])||0):0, timeWindow:tw, day:dow, rained:false, gas:0, carMaint:0, notes:"", city:"Newnan GA" });
        imported++;
      }
      setSessions(s=>[...s,...newS]);
      newS.forEach(s => saveSession(s));
      setImportMsg(`${imported} sessions imported, ${skipped} duplicates skipped.`);
    } catch(err) { setImportMsg("Failed: "+err.message); }
  }

  const sortedSessions = useMemo(() => sessions ? [...sessions].sort((a,b)=>b.date.localeCompare(a.date)) : [], [sessions]);

  if (!sessions||!totals||!settingsForm) return (
    <div style={{ background:C.bg, minHeight:400, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"'DM Sans',sans-serif", color:C.muted, fontSize:14 }}>Loading...</div>
    </div>
  );

  function PageHeader({ title, right, onBack }) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, paddingTop:4 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {onBack && <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:20, padding:0, lineHeight:1 }}>‹</button>}
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, fontWeight:600, color:C.text }}>{title}</div>
        </div>
        {right}
      </div>
    );
  }

  function calcByKey(arr, keyFn, allKeys) {
    const map = {};
    if (allKeys) allKeys.forEach(k => { map[k]={label:k,gross:0,hours:0,count:0}; });
    arr.forEach(s => { const k=keyFn(s); if (!map[k]) map[k]={label:k,gross:0,hours:0,count:0}; map[k].gross+=s.gross||0; map[k].hours+=s.hours||0; map[k].count++; });
    return Object.values(map).filter(v=>v.count>0).map(v=>({...v,perHour:v.hours>0?v.gross/v.hours:0})).sort((a,b)=>b.perHour-a.perHour);
  }

  return (
    <div style={{ background:C.bg, fontFamily:"'DM Sans',sans-serif", maxWidth:420, margin:"0 auto", minHeight:600, paddingBottom:72, position:"relative" }}>
      <style>{fonts}</style>
      <h2 style={{ position:"absolute", width:1, height:1, padding:0, margin:-1, overflow:"hidden", clip:"rect(0,0,0,0)", whiteSpace:"nowrap", border:0 }}>DoorDash Earnings Tracker — Newnan, GA</h2>

      {view==="dashboard" && (
        <div style={{ padding:"20px 16px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <div>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:C.text, letterSpacing:"-0.01em" }}>Dashboard</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>Newnan, GA</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {confirmDeleteId==="reset" ? (
                <div style={{ display:"flex", gap:6 }}>
                  <Btn onClick={() => { setSessions(SEED_DATA); setConfirmDeleteId(null); }} style={{ fontSize:11, padding:"6px 10px" }}>Confirm</Btn>
                  <Btn onClick={() => setConfirmDeleteId(null)} style={{ fontSize:11, padding:"6px 10px" }}>Cancel</Btn>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId("reset")} style={{ background:"none", border:`0.5px solid ${C.border2}`, borderRadius:8, padding:"7px 10px", color:C.muted, cursor:"pointer", fontSize:13 }} title="Reset data">↺</button>
              )}
              <Btn primary onClick={() => { setEditId(null); setView("add"); }}>+ Log</Btn>
            </div>
          </div>

          <Card style={{ marginBottom:16, textAlign:"center", background:`linear-gradient(135deg, #111827 0%, #1a1030 100%)`, border:`0.5px solid ${C.border}` }}>
            <BigStat label="Net Profit · All Time" value={totals.netProfit} sub={`${fmt$(totals.totalGross)} gross · ${sessions.length} sessions`} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
              <div style={{ background:C.surface2, borderRadius:10, padding:"10px 12px" }}>
                <Label style={{ marginBottom:4 }}>Avg $/hr actual</Label>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:600, color:C.text }}>{fmt$(totals.avgActual)}</div>
              </div>
              <div style={{ background:C.surface2, borderRadius:10, padding:"10px 12px" }}>
                <Label style={{ marginBottom:4 }}>Avg $/hr after tax</Label>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:600, color:C.green }}>{fmt$(totals.avgAfterTax)}</div>
              </div>
            </div>
          </Card>

          <Card style={{ marginBottom:16 }}>
            <SectionTitle>Goals</SectionTitle>
            <GoalBar label="This Week" current={weekTotals.totalGross} goal={settings.weeklyGoal} />
            <GoalBar label="This Month" current={monthTotals.totalGross} goal={settings.monthlyGoal} />
          </Card>

          {weather.length > 0 && (
            <Card style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <SectionTitle>14-Day Forecast · Newnan GA</SectionTitle>
                <span style={{ fontSize:10, color:C.muted }}>°F</span>
              </div>
              <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
                {weather.map((day, i) => {
                  const d = new Date(day.date+"T12:00:00");
                  const dow = d.toLocaleDateString("en-US",{weekday:"short"});
                  const mon = d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
                  const isRainy = day.rainChance >= 50;
                  const isToday = i === 0;
                  return (
                    <div key={day.date} style={{ flexShrink:0, textAlign:"center", background: isToday ? C.accentDim : isRainy ? "rgba(0,150,255,0.08)" : C.surface2, border:`0.5px solid ${isToday ? C.accent : isRainy ? "rgba(0,150,255,0.2)" : C.border}`, borderRadius:10, padding:"8px 6px", minWidth:48 }}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, color: isToday ? C.accent : C.muted, fontWeight: isToday ? 600 : 400, textTransform:"uppercase", letterSpacing:"0.05em" }}>{isToday ? "Today" : dow}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, color:C.muted, marginBottom:4 }}>{mon}</div>
                      <div style={{ fontSize:16, marginBottom:4 }}>{weatherEmoji(day.code, day.rainChance)}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.text }}>{day.high}°</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, color: isRainy ? "#4A9EFF" : C.muted, marginTop:2 }}>{day.rainChance}%</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:10, color:C.muted, marginTop:8 }}>🌧 = 50%+ rain chance — good for orders!</div>
            </Card>
          )}

          <SectionTitle>This Week</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:10, marginBottom:16 }}>
            <MiniStat label="Gross" value={fmt$(weekTotals.totalGross)} sub={`${weekSessions.length} sessions`} />
            <MiniStat label="Net Profit" value={fmt$(weekTotals.netProfit)} valueColor={C.green} />
            <MiniStat label="Hours" value={fmtN(weekTotals.totalHours)+"h"} />
            <MiniStat label="Miles" value={fmtN(weekTotals.totalMiles)+"mi"} />
          </div>

          <SectionTitle>All Time</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:10, marginBottom:16 }}>
            <MiniStat label="Total Gross"        value={fmt$(totals.totalGross)}      sub={`${sessions.length} sessions`} />
            <MiniStat label="Tax Owed"           value={fmt$(totals.taxOwed)}         valueColor={C.accent} />
            <MiniStat label="Mileage Deduction"  value={fmt$(totals.mileDeduction)}   valueColor={C.green} />
            <MiniStat label="Gas Tracked"        value={fmt$(totals.totalGas)}        />
            <MiniStat label="Total Hours"        value={fmtN(totals.totalHours)+"h"} />
            <MiniStat label="Total Miles"        value={fmtN(totals.totalMiles)+"mi"} />
          </div>

          <div
            onDragOver={e=>{e.preventDefault();setDragging(true);}}
            onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);handleZip(e.dataTransfer.files[0]);}}
            onClick={()=>fileRef.current.click()}
            style={{ border:`1.5px dashed ${dragging?C.accent:C.border2}`, borderRadius:14, padding:"20px 16px", textAlign:"center", cursor:"pointer", marginBottom:importMsg?8:16, background:dragging?C.accentDim:"transparent", transition:"all 0.15s" }}
          >
            <div style={{ fontSize:20, marginBottom:4 }}>📦</div>
            <div style={{ fontSize:12, color:C.muted }}>Drop DoorDash ZIP archive or tap to upload</div>
            <input ref={fileRef} type="file" accept=".zip" style={{ display:"none" }} onChange={e=>handleZip(e.target.files[0])} />
          </div>
          {importMsg && <div style={{ fontSize:12, color:C.muted, textAlign:"center", marginBottom:16, padding:"8px 12px", background:C.surface, borderRadius:10 }}>{importMsg}</div>}

          <SectionTitle>Recent Sessions</SectionTitle>
          {sortedSessions.slice(0,5).map(s => (
            <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"12px 0", borderBottom:`0.5px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{s.date} · {s.day}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.hours}h · {fmtN(s.miles)}mi · {s.timeWindow}{s.rained?" 🌧":""}{s.city ? " · "+s.city : ""}</div>
                {s.notes && <div style={{ fontSize:11, color:C.muted, fontStyle:"italic", marginTop:2 }}>{s.notes}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{fmt$(s.gross)}</div>
                <div style={{ fontSize:11, color:C.green }}>{fmt$(s.hours>0?s.gross/s.hours:0)}/hr</div>
              </div>
            </div>
          ))}
          {sessions.length>5 && <div style={{ fontSize:12, color:C.muted, textAlign:"center", padding:"12px 0", cursor:"pointer" }} onClick={()=>setView("sessions")}>View all {sessions.length} sessions →</div>}
          {lastSaved && <div style={{ fontSize:10, color:C.border2, textAlign:"center", padding:"8px 0 4px" }}>Saved {lastSaved.toLocaleTimeString()}</div>}
        </div>
      )}

      {view==="add" && (
        <div style={{ padding:"20px 16px 0" }}>
          <PageHeader title={editId?"Edit Session":"Log Session"} onBack={()=>{setEditId(null);setView(editId?"sessions":"dashboard");}} />
          {[
            {label:"Date",name:"date",type:"date"},
            {label:"Hours",name:"hours",type:"number",placeholder:"e.g. 4"},
            {label:"Miles",name:"miles",type:"number",placeholder:"e.g. 75"},
            {label:"Gross Earnings ($)",name:"gross",type:"number",placeholder:"e.g. 79.24"},
            {label:"Gas Expenses ($)",name:"gas",type:"number",placeholder:"optional"},
            {label:"Car Maintenance ($)",name:"carMaint",type:"number",placeholder:"optional"},
          ].map(({label,name,type,placeholder}) => (
            <FieldRow key={name} label={label}>
              <input name={name} type={type} value={form[name]} onChange={handleFormChange} placeholder={placeholder} step="any" style={inputStyle} />
            </FieldRow>
          ))}
          <FieldRow label="Time Window">
            <select name="timeWindow" value={form.timeWindow} onChange={handleFormChange} style={inputStyle}>
              {TIME_WINDOWS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Day of the Week">
            <select name="day" value={form.day} onChange={handleFormChange} style={inputStyle}>
              {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="City">
            <select name="city" value={form.city} onChange={handleFormChange} style={inputStyle}>
              {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Notes">
            <textarea name="notes" value={form.notes} onChange={handleFormChange} placeholder="e.g. Slow night, big event downtown..." rows={2} style={{ ...inputStyle, resize:"none" }} />
          </FieldRow>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
            <input type="checkbox" id="rained" name="rained" checked={form.rained} onChange={handleFormChange} style={{ width:18, height:18, accentColor:C.accent }} />
            <label htmlFor="rained" style={{ fontSize:14, color:C.text, cursor:"pointer" }}>It rained during this session</label>
          </div>
          {/* Event Detection */}
          {loadingEvents && (
            <div style={{ fontSize:12, color:C.muted, marginBottom:12, padding:"8px 12px", background:C.surface2, borderRadius:10 }}>
              🔍 Checking for events on this date...
            </div>
          )}
          {detectedEvents.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <Label style={{ marginBottom:8 }}>Events Detected — Did They Impact Your Earnings?</Label>
              {detectedEvents.map((ev, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:C.surface2, borderRadius:10, marginBottom:8, border:`0.5px solid ${C.border2}` }}>
                  <div style={{ fontSize:13, color:C.text }}>
                    <span style={{ marginRight:6 }}>{ev.emoji}</span>
                    <span style={{ fontWeight:500 }}>{ev.name}</span>
                    <span style={{ fontSize:11, color:C.muted }}> · {ev.sport}</span>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => setForm(f=>({...f, event_impact: ev.name}))} style={{ fontSize:11, padding:"4px 10px", borderRadius:8, border:"none", cursor:"pointer", background: form.event_impact===ev.name ? C.green : C.surface, color: form.event_impact===ev.name ? "#fff" : C.muted, fontWeight: form.event_impact===ev.name ? 600 : 400 }}>✓ Yes</button>
                    <button onClick={() => setForm(f=>({...f, event_impact: form.event_impact===ev.name ? "" : f.event_impact}))} style={{ fontSize:11, padding:"4px 10px", borderRadius:8, border:"none", cursor:"pointer", background: C.surface, color:C.muted }}>✗ No</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Holiday */}
          <div style={{ marginBottom:16 }}>
            <Label style={{ marginBottom:6 }}>Holiday</Label>
            <select name="holiday" value={form.holiday} onChange={handleFormChange} style={inputStyle}>
              {HOLIDAYS.map(h=><option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <Btn primary full onClick={handleSubmit}>{editId?"Save Changes":"Save Session"}</Btn>
        </div>
      )}

      {view==="sessions" && (
        <div style={{ padding:"20px 16px 0" }}>
          <PageHeader title={`Sessions (${sessions.length})`} onBack={()=>setView("dashboard")} />
          {sortedSessions.map(s => (
            <div key={s.id} style={{ padding:"12px 0", borderBottom:`0.5px solid ${C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{s.date} · {s.day}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.hours}h · {fmtN(s.miles)}mi · {s.timeWindow}{s.rained?" · 🌧 Rained":""}{s.city ? " · "+s.city : ""}</div>
                  {(s.gas||s.carMaint) ? <div style={{ fontSize:11, color:C.muted }}>Gas: {fmt$(s.gas+s.carMaint)}</div> : null}
                  {s.notes ? <div style={{ fontSize:11, color:C.muted, fontStyle:"italic", marginTop:2 }}>{s.notes}</div> : null}
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{fmt$(s.gross)}</div>
                  <div style={{ fontSize:11, color:C.green, marginBottom:8 }}>{fmt$(s.hours>0?s.gross/s.hours:0)}/hr</div>
                  <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                    {confirmDeleteId===s.id ? (
                      <>
                        <Btn onClick={()=>handleDelete(s.id)} style={{ fontSize:11, padding:"4px 10px" }}>Confirm</Btn>
                        <Btn onClick={()=>setConfirmDeleteId(null)} style={{ fontSize:11, padding:"4px 10px", color:C.muted }}>Cancel</Btn>
                      </>
                    ) : (
                      <>
                        <Btn onClick={()=>handleEdit(s)} style={{ fontSize:11, padding:"4px 10px" }}>Edit</Btn>
                        <Btn onClick={()=>setConfirmDeleteId(s.id)} style={{ fontSize:11, padding:"4px 10px", color:C.muted }}>Delete</Btn>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view==="analytics" && (
        <div style={{ padding:"20px 16px 0" }}>
          <PageHeader title="Analytics" right={
            <div style={{ display:"flex", gap:4 }}>
              {[["all","All"],["30d","30d"],["month","Mo"]].map(([val,lbl]) => (
                <button key={val} onClick={()=>setAnalyticsRange(val)} style={{ fontSize:11, padding:"4px 10px", borderRadius:8, border:`0.5px solid ${C.border2}`, background:analyticsRange===val?C.accent:"transparent", color:analyticsRange===val?"#fff":C.muted, cursor:"pointer", fontWeight:analyticsRange===val?500:400 }}>{lbl}</button>
              ))}
            </div>
          } />
          {projection && (
            <>
              <SectionTitle>Annual Projection · Last 30 Days</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:10, marginBottom:20 }}>
                <MiniStat label="Projected Gross" value={fmt$(projection.annualGross)} sub={`${projection.basedOn} sessions`} />
                <MiniStat label="Projected Net"   value={fmt$(projection.annualNet)}   valueColor={C.green} />
              </div>
            </>
          )}
          {bestWorst && (
            <>
              <SectionTitle>Best vs Worst Session</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:10, marginBottom:20 }}>
                {[{label:"Best",s:bestWorst.best,color:C.green},{label:"Worst",s:bestWorst.worst,color:C.accent}].map(({label,s,color}) => (
                  <div key={label} style={{ background:C.surface2, borderRadius:12, padding:"12px 14px", border:`0.5px solid ${C.border}` }}>
                    <Label style={{ marginBottom:6, color }}>{label}</Label>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:600, color }}>{fmt$(s.perHour)}/hr</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{s.date}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{s.day} · {s.timeWindow}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{fmt$(s.gross)} · {s.hours}h</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {weeklyTrend.length>1 && (
            <Card style={{ marginBottom:20 }}>
              <SectionTitle>Week-over-Week Gross</SectionTitle>
              <BarChart data={weeklyTrend.map(w=>({...w,label:w.week.slice(5)}))} labelKey="label" valueKey="gross" color={C.purple} label="Gross per week" />
            </Card>
          )}
          <Card style={{ marginBottom:16 }}>
            <SectionTitle>By Time Window</SectionTitle>
            <BarChart data={calcByKey(filteredSessions,s=>s.timeWindow||"Unknown")} labelKey="label" valueKey="perHour" color={C.accent} label="Avg $/hr" />
          </Card>
          <Card style={{ marginBottom:16 }}>
            <SectionTitle>By Day of Week</SectionTitle>
            <BarChart data={calcByKey(filteredSessions,s=>s.day||"Unknown",DAYS)} labelKey="label" valueKey="perHour" color={C.green} label="Avg $/hr" />
          </Card>
          <Card style={{ marginBottom:16 }}>
            <SectionTitle>Weather Comparison</SectionTitle>
            <BarChart data={[["Clear",false],["Rainy",true]].map(([lbl,r])=>{ const arr=filteredSessions.filter(s=>s.rained===r); const g=arr.reduce((s,x)=>s+(x.gross||0),0),h=arr.reduce((s,x)=>s+(x.hours||0),0); return {label:lbl,gross:g,hours:h,perHour:h>0?g/h:0,count:arr.length}; })} labelKey="label" valueKey="perHour" color={C.amber} label="Avg $/hr" />
            <div style={{ fontSize:11, color:C.muted, marginTop:8, textAlign:"center" }}>Clear: {filteredSessions.filter(s=>!s.rained).length} · Rainy: {filteredSessions.filter(s=>s.rained).length} sessions</div>
          </Card>
          <Card style={{ marginBottom:16 }}>
            <SectionTitle>By City</SectionTitle>
            <BarChart data={calcByKey(filteredSessions,s=>s.city||"Newnan GA",CITIES)} labelKey="label" valueKey="perHour" color={C.purple} label="Avg $/hr" />
          </Card>
          <BestCombos sessions={filteredSessions} />
        </div>
      )}

      {view==="settings" && settingsForm && (
        <div style={{ padding:"20px 16px 0" }}>
          <PageHeader title="Settings" />
          <SectionTitle>Tax & Mileage</SectionTitle>
          {[
            {label:"SE Tax Rate (%)",key:"taxRate",display:v=>(v*100).toFixed(1),parse:v=>parseFloat(v)/100,placeholder:"15.3"},
            {label:"IRS Mileage ($/mile)",key:"mileageRate",display:v=>v.toFixed(2),parse:v=>parseFloat(v),placeholder:"0.70"},
          ].map(({label,key,display,parse,placeholder}) => (
            <FieldRow key={key} label={label}>
              <input type="number" step="any" placeholder={placeholder} defaultValue={display(settingsForm[key])} onBlur={e=>{ const val=parse(e.target.value); if (!isNaN(val)&&val>0) { const u={...settingsForm,[key]:val}; setSettingsForm(u); setSettings(u); }}} style={inputStyle} />
            </FieldRow>
          ))}
          <SectionTitle>Earnings Goals</SectionTitle>
          {[
            {label:"Weekly Goal ($)",key:"weeklyGoal"},
            {label:"Monthly Goal ($)",key:"monthlyGoal"},
          ].map(({label,key}) => (
            <FieldRow key={key} label={label}>
              <input type="number" step="any" defaultValue={settingsForm[key]} onBlur={e=>{ const val=parseFloat(e.target.value); if (!isNaN(val)&&val>0) { const u={...settingsForm,[key]:val}; setSettingsForm(u); setSettings(u); }}} style={inputStyle} />
            </FieldRow>
          ))}
          <div style={{ fontSize:11, color:C.muted, marginBottom:24, padding:"10px 12px", background:C.surface2, borderRadius:10 }}>
            Changes apply immediately. IRS mileage rate for 2025 is $0.70/mile.
          </div>
          <SectionTitle>Export</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:10, marginBottom:8 }}>
            <Btn onClick={()=>exportCSV(sessions)} style={{ padding:"14px 10px", textAlign:"center", lineHeight:1.4 }}>
              <div style={{ fontSize:20, marginBottom:4 }}>📄</div>Download CSV
            </Btn>
            <Btn onClick={()=>exportExcel(sessions,totals,settings)} style={{ padding:"14px 10px", textAlign:"center", lineHeight:1.4 }}>
              <div style={{ fontSize:20, marginBottom:4 }}>📊</div>Download Excel
            </Btn>
          </div>
          <div style={{ fontSize:11, color:C.muted }}>{sessions.length} sessions · all-time data</div>

          <SectionTitle>Database Migration</SectionTitle>
          <div style={{ fontSize:11, color:C.muted, marginBottom:12, padding:"10px 12px", background:C.surface2, borderRadius:10 }}>
            If you have sessions saved locally from before the database was set up, click below to migrate them.
          </div>
          <Btn onClick={migrateLocalSessions} full style={{ marginBottom:8 }}>
            {migrating ? "Migrating..." : "Migrate Local Sessions to Database"}
          </Btn>
          {migrateMsg && <div style={{ fontSize:12, color: migrateMsg.includes("✅") ? C.green : C.accent, textAlign:"center", padding:"8px", marginTop:4 }}>{migrateMsg}</div>}
        </div>
      )}

      {view==="events" && (
        <div style={{ padding:"20px 16px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, fontWeight:600, color:C.text }}>Upcoming Events</div>
            <Btn onClick={fetchEvents} style={{ fontSize:11, padding:"6px 12px" }}>{eventsLoading ? "Loading..." : "Refresh"}</Btn>
          </div>
          <Card style={{ marginBottom:16 }}>
            <SectionTitle>Earnings Impact Guide</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[
                { icon:"🔥", label:"Massive",   desc:"World Cup — 75K fans + international tourists", color:"#FF3008" },
                { icon:"🔥", label:"Very High", desc:"Weekend home game — fans ordering all day",     color:"#F5A623" },
                { icon:"🔥", label:"High",      desc:"Weeknight home game — pre/post game rush",      color:"#F5A623" },
                { icon:"⚡", label:"Low",        desc:"Away game — minimal local impact",              color:C.muted  },
              ].map(({icon,label,desc,color}) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16, width:28 }}>{icon}</span>
                  <div>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color }}>{label}</span>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.muted }}> · {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {eventsError && <div style={{ fontSize:12, color:C.accent, textAlign:"center", padding:"12px", background:C.surface, borderRadius:10, marginBottom:16 }}>{eventsError}</div>}
          {!eventsLoading && !eventsError && events.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📅</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.muted, marginBottom:16 }}>Tap Refresh to load upcoming games for Atlanta & Georgia teams</div>
              <Btn primary onClick={fetchEvents}>Load Events</Btn>
            </div>
          )}
          {eventsLoading && (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.muted }}>Fetching schedules...</div>
            </div>
          )}
          {!eventsLoading && events.length > 0 && (
            <>
              <SectionTitle>Next 30 Days · {events.length} games</SectionTitle>
              {events.map((e,i) => {
                const d = new Date(e.date+"T12:00:00");
                const dow = d.toLocaleDateString("en-US",{weekday:"short"});
                const mon = d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
                return (
                  <div key={e.id||i} style={{ padding:"12px 14px", background: e.sport==="Holiday" ? "rgba(245,166,35,0.06)" : C.surface2, borderRadius:12, marginBottom:8, border:`0.5px solid ${e.sport==="Holiday" ? "rgba(245,166,35,0.2)" : C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <div style={{ textAlign:"center", background:C.surface, borderRadius:8, padding:"6px 10px", minWidth:44, flexShrink:0 }}>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{dow}</div>
                          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:C.text, lineHeight:1 }}>{mon.split(" ")[1]}</div>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, color:C.muted }}>{mon.split(" ")[0]}</div>
                        </div>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                            <span style={{ fontSize:14 }}>{e.emoji}</span>
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color: e.sport==="Holiday" ? C.amber : C.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{e.sport}</span>
                          </div>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, color:C.text }}>{e.home}</div>
                          {e.away && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.muted }}>vs {e.away}</div>}
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.muted, marginTop:2 }}>{d.toLocaleDateString("en-US",{weekday:"long"})}{e.time ? ` · ${e.time}` : ""}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:e.impactColor }}>{e.impact}</div>
                        {e.sport !== "Holiday" && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:C.muted, marginTop:2 }}>{e.isHome ? "Home" : "Away"}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {undoSession && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:388, background:C.surface2, border:`0.5px solid ${C.border2}`, borderRadius:14, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:200 }}>
          <span style={{ fontSize:13, color:C.text }}>Session deleted</span>
          <button onClick={handleUndo} style={{ fontSize:13, fontWeight:600, background:"none", border:"none", color:C.accent, cursor:"pointer", padding:0 }}>Undo</button>
        </div>
      )}

      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, display:"flex", background:C.surface, borderTop:`0.5px solid ${C.border}`, zIndex:100 }}>
        {[
          {v:"dashboard", icon:"⌂", label:"Home"},
          {v:"sessions",  icon:"☰", label:"Sessions"},
          {v:"analytics", icon:"◈", label:"Analytics"},
          {v:"events",    icon:"📅", label:"Events"},
          {v:"settings",  icon:"⚙", label:"Settings"},
        ].map(({v,icon,label}) => (
          <button key={v} onClick={()=>setView(v)} style={{ flex:1, padding:"10px 0", background:"none", border:"none", borderTop:`2px solid ${view===v?C.accent:"transparent"}`, color:view===v?C.text:C.muted, cursor:"pointer", fontSize:11, fontFamily:"'DM Sans',sans-serif", fontWeight:view===v?600:400 }}>
            <div style={{ fontSize:16, marginBottom:2 }}>{icon}</div>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
