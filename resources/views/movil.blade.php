<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Somahoz">
  <meta name="theme-color" content="#2d5a3d">
  <title>Somahoz — Gestión Cementerio</title>
  <link rel="manifest" href="/pwa/manifest.json">
  <link rel="apple-touch-icon" href="/pwa/icon-192.png">
  <!-- Vendor local (evita depender de CDNs / internet) -->
  <script src="/pwa/vendor/react.production.min.js"></script>
  <script src="/pwa/vendor/react-dom.production.min.js"></script>
  <script src="/pwa/vendor/babel.min.js"></script>
  <style>
    :root {
      --bg: #f5f2ec; --surface: #ffffff; --surface-2: #ede8df; --surface-3: #e3ddd1;
      --ink: #1a1815; --ink-1: #2a2520; --ink-2: #4a453d; --ink-3: #807a6f;
      --line: #d9d2c3; --line-strong: #b8b0a0;
      --accent: #2d5a3d; --accent-light: #4a8a60; --accent-soft: #e8f2eb; --accent-ink: #1a3824;
      --warn: #b85c00; --warn-soft: #fff3e6;
      --danger: #9b2020; --danger-soft: #fdf0f0;
      --info: #1a4a7a; --info-soft: #e8f0fa;
      --ok: #2d6e3a;
      --r: 14px; --r-sm: 8px; --r-lg: 20px;
    }
    [data-theme="dark"] {
      --bg: #161412; --surface: #1f1c18; --surface-2: #2a2621; --surface-3: #342f29;
      --ink: #f2ede3; --ink-1: #e0dbd0; --ink-2: #c4bdae; --ink-3: #8a8377;
      --line: #2f2b25; --line-strong: #433d34;
      --accent: #4a8a60; --accent-light: #6aaa80; --accent-soft: #1a2e20; --accent-ink: #a0d0b0;
      --warn: #e07020; --warn-soft: #2a1800;
      --danger: #d05050; --danger-soft: #2a1010;
      --info: #4a80c0; --info-soft: #101a2a;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { height: 100%; overflow: hidden; }
    body {
      height: 100%; overflow: hidden;
      font-family: -apple-system, 'Inter', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      background: var(--bg); color: var(--ink);
      /* safe areas iOS */
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }
    #root { height: 100%; display: flex; flex-direction: column; }
    .mono { font-family: 'SF Mono', 'Menlo', ui-monospace, monospace; }

    /* Layout */
    .screen { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .screen::-webkit-scrollbar { display: none; }
    .screen-inner { padding-bottom: 90px; }

    /* Nav */
    .bottom-nav {
      display: flex; background: var(--surface); border-top: 1px solid var(--line);
      padding: 6px 0; flex-shrink: 0;
      padding-bottom: calc(6px + env(safe-area-inset-bottom));
    }
    .bnav-item {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      gap: 3px; padding: 6px 4px; font-size: 10px; font-weight: 600;
      color: var(--ink-3); cursor: pointer; -webkit-tap-highlight-color: transparent;
      letter-spacing: 0.02em; text-transform: uppercase;
    }
    .bnav-item.active { color: var(--accent); }
    .bnav-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); margin-top: 2px; }

    /* Sticky header */
    .sticky-header {
      position: sticky; top: 0; z-index: 10;
      background: var(--bg); border-bottom: 1px solid var(--line);
      padding: 12px 16px; display: flex; align-items: center; gap: 10px;
    }

    /* Cards */
    .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); }
    .hline { border: none; border-top: 1px solid var(--line); }

    /* Chips */
    .chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600;
      background: var(--surface-2); color: var(--ink-2); border: 1px solid var(--line);
      white-space: nowrap; letter-spacing: 0.01em;
    }
    .chip-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      padding: 13px 18px; border-radius: var(--r); font-size: 15px; font-weight: 600;
      font-family: inherit; cursor: pointer; border: 1px solid var(--line);
      background: var(--surface); color: var(--ink);
      transition: transform 0.08s, opacity 0.15s;
      -webkit-tap-highlight-color: transparent; user-select: none;
    }
    .btn:active { transform: scale(0.96); opacity: 0.85; }
    .btn-primary { background: var(--accent); color: #fff; border-color: transparent; }
    [data-theme="dark"] .btn-primary { color: #0a1a10; }
    .btn-ghost { background: transparent; border-color: transparent; color: var(--ink-2); }
    .btn-block { width: 100%; }
    .btn-sm { padding: 8px 12px; font-size: 13px; border-radius: var(--r-sm); }
    .btn:disabled { opacity: 0.5; pointer-events: none; }

    /* Inputs */
    .input-wrap {
      display: flex; align-items: center; gap: 10px;
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-sm); padding: 12px 14px; color: var(--ink-3);
    }
    .input-wrap:focus-within { border-color: var(--accent); }
    .input-wrap input { flex: 1; border: 0; outline: 0; background: transparent; font-size: 15px; font-family: inherit; color: var(--ink); }
    .input-wrap input::placeholder { color: var(--ink-3); }
    .field-label { font-size: 11px; font-weight: 700; color: var(--ink-3); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
    input[type=text], input[type=password], input[type=date], input[type=email], input[type=tel], input[type=number], select, textarea {
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-sm);
      padding: 12px 14px; font-size: 15px; font-family: inherit; color: var(--ink); width: 100%;
    }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); }
    textarea { resize: none; }

    /* Stats */
    .stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 14px; }
    .stat-label { font-size: 10px; font-weight: 700; color: var(--ink-3); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 4px; }
    .stat-num { font-size: 30px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; }

    /* Section title */
    .sec-title { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); }

    /* Tabs */
    .tabs { display: flex; background: var(--surface-2); border-radius: 10px; padding: 3px; gap: 2px; }
    .tab { flex: 1; padding: 7px 8px; text-align: center; font-size: 12px; font-weight: 600; color: var(--ink-2); border-radius: 7px; cursor: pointer; transition: all 0.15s; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
    .tab.active { background: var(--surface); color: var(--ink); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

    /* Nicho grid cell */
    .niche {
      aspect-ratio: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center;
      font-size: 8px; font-family: ui-monospace, monospace; font-weight: 700;
      cursor: pointer; position: relative; transition: transform 0.08s;
      -webkit-tap-highlight-color: transparent; border: 1px solid transparent;
    }
    .niche:active { transform: scale(0.88); }
    .n-ocu { background: var(--surface-3); color: var(--ink-3); border-color: var(--line-strong); }
    .n-lib { background: var(--accent-soft); color: var(--accent-ink); border-color: var(--accent-light); }
    .n-res { background: var(--warn-soft); color: var(--warn); border-color: var(--warn); }
    .n-cla { background: var(--surface-2); color: var(--line-strong); }

    /* Sheet / modal */
    .sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 50; display: flex; align-items: flex-end; }
    .sheet {
      background: var(--bg); width: 100%; border-radius: 22px 22px 0 0;
      max-height: 90vh; display: flex; flex-direction: column;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .sheet-handle { width: 36px; height: 4px; background: var(--line-strong); border-radius: 2px; margin: 12px auto 4px; flex-shrink: 0; }
    .sheet-scroll { overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; padding: 0 16px 24px; }

    /* Toast */
    .toast-wrap { position: fixed; bottom: 100px; left: 12px; right: 12px; z-index: 80; pointer-events: none; }
    .toast-msg {
      background: var(--ink); color: var(--bg); padding: 13px 16px; border-radius: 14px;
      font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.35);
      animation: slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1);
    }
    .toast-msg.warn { background: var(--warn); color: #fff; }
    .toast-msg.danger { background: var(--danger); color: #fff; }

    /* Spinner */
    .spinner { border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.65s linear infinite; }

    /* Login hero */
    .login-hero {
      position: relative; height: 240px; overflow: hidden; flex-shrink: 0;
      background:
        linear-gradient(170deg, transparent 50%, var(--bg) 100%),
        radial-gradient(circle at 25% 35%, rgba(74,138,96,0.2) 0%, transparent 55%),
        repeating-linear-gradient(0deg, transparent 0 22px, var(--line) 22px 23px),
        repeating-linear-gradient(90deg, transparent 0 22px, var(--line) 22px 23px),
        var(--surface-2);
    }

    /* Animations */
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .slide-up { animation: slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1); }

    /* Misc */
    .row { display: flex; align-items: center; }
    .gap-4 { gap: 4px; } .gap-6 { gap: 6px; } .gap-8 { gap: 8px; } .gap-10 { gap: 10px; } .gap-12 { gap: 12px; }
    .kv { padding: 11px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .kv-k { font-size: 12px; color: var(--ink-3); flex-shrink: 0; }
    .kv-v { font-size: 13px; font-weight: 600; text-align: right; }
  </style>
</head>
<body>
<div id="root"></div>
@verbatim
<script type="text/babel">
const { useState, useEffect, useRef, useCallback } = React;

// ÔöÇÔöÇÔöÇ CONFIG ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
const BASE = window.location.origin; // misma origin ÔåÆ sin CORS
const API = BASE + '/api';

// ÔöÇÔöÇÔöÇ AUTH ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
let _tok = localStorage.getItem('smz_tok') || null;
const setTok = t => { _tok = t; t ? localStorage.setItem('smz_tok', t) : localStorage.removeItem('smz_tok'); };

async function http(path, opts = {}) {
  const headers = { 'Accept': 'application/json' };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (_tok) headers['Authorization'] = 'Bearer ' + _tok;
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers||{}) } });
  if (res.status === 401) { setTok(null); window.__logout?.(); throw new Error('No autorizado'); }
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}
const GET  = p      => http(p);
const POST = (p, b) => http(p, { method:'POST', body: b instanceof FormData ? b : JSON.stringify(b) });
const PUT  = (p, b) => http(p, { method:'PUT',  body: JSON.stringify(b) });
const DEL  = p      => http(p, { method:'DELETE' });
const arr  = d      => Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.sepulturas ?? []);

// ÔöÇÔöÇÔöÇ TOAST ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
let _toast = null;
function ToastHost() {
  const [t, setT] = useState(null);
  useEffect(() => { _toast = (msg, type='ok') => { setT({msg,type}); setTimeout(()=>setT(null), 2800); }; }, []);
  if (!t) return null;
  return <div className="toast-wrap"><div className={`toast-msg ${t.type!=='ok'?t.type:''}`}>{t.type==='ok'?<Ico d="M20 6L9 17l-5-5" s={16}/>:<Ico d="M12 9v4M12 17h.01" s={16}/>} {t.msg}</div></div>;
}
const toast = (m,type='ok') => _toast?.(m,type);

// ÔöÇÔöÇÔöÇ ICONS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
const Ico = ({d, s=20, stroke, fill="none", sw=1.9, style:st, ...p}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke||"currentColor"} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...st}} {...p}>
    {(Array.isArray(d)?d:[d]).map((dd,i)=><path key={i} d={dd}/>)}
  </svg>
);
// icon shortcuts
const icHome    = "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";
const icGrid    = ["M3 3h7v7H3z","M14 3h7v7h-7z","M3 14h7v7H3z","M14 14h7v7h-7z"];
const icMap     = ["M3 7l6-4 6 4 6-4v14l-6 4-6-4-6 4z","M9 3v14","M15 7v14"];
const icSearch  = "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z";
const icBack    = "M19 12H5M5 12l7-7M5 12l7 7";
const icRight   = "M5 12h14M13 5l7 7-7 7";
const icPlus    = "M12 5v14M5 12h14";
const icClose   = "M18 6L6 18M6 6l12 12";
const icCheck   = "M20 6L9 17l-5-5";
const icEdit    = "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z";
const icTrash   = ["M3 6h18","M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"];
const icFile    = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6";
const icUser    = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";
const icLock    = ["M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z","M7 11V7a5 5 0 0 1 10 0v4"];
const icBell    = "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0";
const icPin     = "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z";
const icRefresh = "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15";
const icLogout  = "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";
const icSun     = "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41";
const icMoon    = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";
const icArchive = ["M21 8v13H3V8","M1 3h22v5H1z","M10 12h4"];
const icSettings= ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"];

// ÔöÇÔöÇÔöÇ HELPERS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function Spinner({size=24}) {
  return <div className="spinner" style={{width:size,height:size}}/>;
}
function LoadView({msg='Cargando…'}) {
  return <div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,color:'var(--ink-3)'}}>
    <Spinner size={32}/><div style={{fontSize:13}}>{msg}</div>
  </div>;
}
function ErrBanner({msg, onRetry}) {
  return <div style={{margin:'12px 16px',padding:14,borderRadius:14,background:'var(--danger-soft)',border:'1px solid var(--danger)',display:'flex',gap:12,alignItems:'center'}}>
    <Ico d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" s={18} stroke="var(--danger)" style={{flexShrink:0}}/>
    <div style={{flex:1,fontSize:13,color:'var(--danger)',fontWeight:500}}>{msg}</div>
    {onRetry && <button className="btn btn-sm" onClick={onRetry} style={{background:'var(--danger)',color:'#fff',borderColor:'transparent',flexShrink:0}}>Reintentar</button>}
  </div>;
}
function StickyHeader({title, subtitle, onBack, right}) {
  return <div className="sticky-header">
    {onBack && <div onClick={onBack} style={{width:36,height:36,borderRadius:10,background:'var(--surface)',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}><Ico d={icBack} s={18}/></div>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:16,fontWeight:700,letterSpacing:'-0.02em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
      {subtitle && <div className="mono" style={{fontSize:10,color:'var(--ink-3)',marginTop:1}}>{subtitle}</div>}
    </div>
    {right}
  </div>;
}
function KV({k,v,mono}) {
  return <div className="kv"><div className="kv-k">{k}</div><div className={`kv-v${mono?' mono':''}`}>{v||'—'}</div></div>;
}

// ÔöÇÔöÇÔöÇ LOGIN ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function LoginScreen({onLogin}) {
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const go = async () => {
    if (!user || !pass) { setErr('Introduce usuario y contraseña'); return; }
    setLoading(true); setErr(null);
    try {
      // Prueba primero con 'username', luego con 'email' por si acaso
      let data;
      try { data = await POST('/login', { username: user, password: pass }); }
      catch(e) {
        if (e.message.toLowerCase().includes('email')) {
          data = await POST('/login', { email: user, password: pass });
        } else throw e;
      }
      const tok = data.token || data.access_token || data.data?.token;
      if (!tok) throw new Error('No se recibió token');
      setTok(tok);
      onLogin(data.user || data.data?.user || { name: user });
    } catch(e) { setErr(e.message); } finally { setLoading(false); }
  };

  return <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
    <div className="login-hero">
      <div style={{position:'absolute',top:20,left:16,right:16,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div className="mono" style={{fontSize:10,letterSpacing:'0.14em',color:'var(--ink-3)',textTransform:'uppercase'}}>Ayto. Los Corrales de Buelna</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Conecta2 — Módulo cementerio</div>
        </div>
        <div style={{width:10,height:10,borderRadius:'50%',background:'var(--accent)',marginTop:5}}/>
      </div>
      <div style={{position:'absolute',bottom:24,left:16,right:16}}>
        <div style={{fontSize:30,fontWeight:800,letterSpacing:'-0.04em',lineHeight:1.05}}>Cementerio<br/>de Somahoz</div>
        <div style={{fontSize:13,color:'var(--ink-2)',marginTop:8}}>Gestión de campo y expedientes</div>
      </div>
    </div>

    <div style={{padding:'20px 16px',flex:1,display:'flex',flexDirection:'column',gap:14,overflowY:'auto'}}>
      {err && <div style={{padding:'10px 14px',background:'var(--danger-soft)',borderRadius:10,fontSize:13,color:'var(--danger)',fontWeight:500,border:'1px solid var(--danger)'}}>{err}</div>}
      <div>
        <div className="field-label">Usuario</div>
        <div className="input-wrap"><Ico d={icUser} s={18}/><input value={user} onChange={e=>setUser(e.target.value)} placeholder="admin" autoComplete="username"/></div>
      </div>
      <div>
        <div className="field-label">Contraseña</div>
        <div className="input-wrap"><Ico d={icLock} s={18}/><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" onKeyDown={e=>e.key==='Enter'&&go()}/></div>
      </div>
      <div style={{flex:1}}/>
      <button className="btn btn-primary btn-block" onClick={go} disabled={loading} style={{height:52}}>
        {loading ? <Spinner size={20}/> : <>Acceder <Ico d={icRight} s={18}/></>}
      </button>
      <div style={{textAlign:'center',fontSize:11,color:'var(--ink-3)'}}>
        <span className="mono">{BASE}</span><br/>
        <span style={{marginTop:4,display:'block'}}>admin / admin2026</span>
      </div>
    </div>
  </div>;
}

// ÔöÇÔöÇÔöÇ HOME ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function HomeScreen({onNav, user, onLogout}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const load = useCallback(async()=>{ setLoading(true); setErr(null); try { setStats(await GET('/cementerio/stats')); } catch(e){ setErr(e.message); } finally{setLoading(false);}}, []);
  useEffect(()=>{load();},[]);

  const nombre = user?.name || 'Operario';
  const ini = nombre.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const h = new Date().getHours();
  const sal = h<13?'Buenos días':h<20?'Buenas tardes':'Buenas noches';

  return <div className="screen-inner">
    <div style={{padding:'16px 16px 8px'}}>
      <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div className="sec-title">Operario</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:'-0.03em',marginTop:2}}>{sal}</div>
        </div>
        <div className="row gap-8">
          <div style={{width:38,height:38,borderRadius:'50%',background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,cursor:'pointer'}} onClick={onLogout}>{ini}</div>
        </div>
      </div>

      <div style={{marginTop:12,padding:12,background:'var(--surface)',border:'1px solid var(--line)',borderRadius:14,display:'flex',alignItems:'center',gap:10}}>
        <Ico d={icPin} s={18} stroke="var(--accent)"/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600}}>Cementerio Municipal de Somahoz</div>
          <div className="mono" style={{fontSize:10,color:'var(--ink-3)'}}>43.2664° N — 4.0751° W</div>
        </div>
        <div className="chip" style={{color:'var(--accent)',background:'var(--accent-soft)',borderColor:'transparent'}}><span className="chip-dot"/>activo</div>
      </div>
    </div>

    <div style={{padding:'12px 16px 0'}}>
      <div className="row" style={{justifyContent:'space-between',marginBottom:10}}>
        <div className="sec-title">Estado del recinto</div>
        <button className="btn btn-ghost btn-sm" onClick={load} style={{padding:'4px 8px',fontSize:11,gap:5}}><Ico d={icRefresh} s={13}/>Actualizar</button>
      </div>
      {loading ? <LoadView msg="Cargando estadísticas…"/> :
       err ? <ErrBanner msg={err} onRetry={load}/> :
       stats && (()=>{
        const lib=Number(stats.libres??stats.sepulturas_libres??0);
        const ocu=Number(stats.ocupadas??stats.sepulturas_ocupadas??0);
        const res=Number(stats.reservadas??0);
        const cla=Number(stats.clausuradas??0);
        const man=Number(stats.mantenimiento??0);
        const sum=lib+ocu+res+cla+man;
        const tot=Number(stats.total??stats.sepulturas_total??0)||sum;
        return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="stat">
          <div className="stat-label">Ocupadas</div>
          <div className="row gap-6" style={{alignItems:'baseline'}}>
            <div className="stat-num">{ocu}</div>
            <div style={{fontSize:12,color:'var(--ink-3)'}} className="mono">/ {tot > 0 ? tot : '—'}</div>
          </div>
          {tot>0 && <div style={{height:3,background:'var(--surface-3)',borderRadius:2,marginTop:8,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${Math.min(100,Math.round((ocu/tot)*100))}%`,background:'var(--ink-2)'}}/>
          </div>}
        </div>
        <div className="stat">
          <div className="stat-label">Libres</div>
          <div className="stat-num" style={{color:'var(--accent)'}}>{lib}</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>{res} reservadas</div>
        </div>
        <div className="stat" style={{background:'var(--warn-soft)',borderColor:'transparent'}}>
          <div className="stat-label" style={{color:'var(--warn)'}}>Por caducar</div>
          <div className="stat-num" style={{color:'var(--warn)'}}>{stats.proximas_caducar??stats.concesiones_proximas_caducar??'—'}</div>
          <div style={{fontSize:11,color:'var(--warn)',marginTop:4}}>próximos 12 meses</div>
        </div>
        <div className="stat" style={{background:'var(--danger-soft)',borderColor:'transparent'}}>
          <div className="stat-label" style={{color:'var(--danger)'}}>Caducadas</div>
          <div className="stat-num" style={{color:'var(--danger)'}}>{stats.concesiones_caducadas??'—'}</div>
          <div style={{fontSize:11,color:'var(--danger)',marginTop:4}}>concesiones</div>
        </div>
      </div>;})()}
    </div>

    <div style={{padding:'20px 16px 0'}}>
      <div className="sec-title" style={{marginBottom:12}}>Accesos rápidos</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[{ic:icGrid,l:'Nichos',s:'Vista por bloque',n:'nichos'},
          {ic:icMap,l:'Mapa',s:'Recinto Somahoz',n:'mapa'},
          {ic:icArchive,l:'Gestión',s:'Expedientes · titulares',n:'gestion'},
          {ic:icSettings,l:'Administración',s:'CRUD · datos',n:'admin'},
        ].map(({ic,l,s,n})=>(
          <div key={n} className="card" style={{padding:14,cursor:'pointer'}} onClick={()=>onNav(n)}>
            <div style={{width:36,height:36,borderRadius:10,background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}><Ico d={ic} s={18}/></div>
            <div style={{fontSize:14,fontWeight:700}}>{l}</div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  </div>;
}

// ÔöÇÔöÇÔöÇ NICHOS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function NichosScreen({onBack, onOpenFicha, dataRev}) {
  const [cat, setCat] = useState(null);
  const [bloqId, setBloqId] = useState(null);
  const [seps, setSeps] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [loadCat, setLoadCat] = useState(true);
  const [loadSep, setLoadSep] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(()=>{ (async()=>{
    setLoadCat(true); setErr(null);
    try {
      const r = await GET('/cementerio/catalogo');
      const d = r?.data||r;
      setCat(d);
      // si el bloque actual ya no existe, cae al primero
      if(d?.bloques?.length && !d.bloques.some(b=>b.id===bloqId)) setBloqId(d.bloques[0].id);
      if(!bloqId && d?.bloques?.length) setBloqId(d.bloques[0].id);
    }
    catch(e){ setErr(e.message); }
    finally{ setLoadCat(false); }
  })(); },[dataRev]);

  useEffect(()=>{
    if(!bloqId) return;
    (async()=>{
      setLoadSep(true); setSeps([]);
      try { const r = await GET(`/cementerio/bloques/${bloqId}/sepulturas`); setSeps(arr(r)); }
      catch(e){ setErr(e.message); } finally{ setLoadSep(false); }
    })();
  },[bloqId]);

  if(loadCat) return <LoadView msg="Cargando catálogo…"/>;

  const bloque = cat?.bloques?.find(b=>b.id===bloqId);
  const zona   = cat?.zonas?.find(z=>z.id===bloque?.zona_id);

  const counts = { ocupada:0, libre:0, reservada:0, clausurada:0 };
  seps.forEach(s=>{ if(counts[s.estado]!==undefined) counts[s.estado]++; });

  const shown = filter==='todos' ? seps : seps.filter(s=>s.estado===filter);

  const cls = s => {
    if(s.estado==='libre') return 'niche n-lib';
    if(s.estado==='reservada') return 'niche n-res';
    if(s.estado==='clausurada') return 'niche n-cla';
    return 'niche n-ocu';
  };

  return <div className="screen-inner">
    <StickyHeader title="Nichos y sepulturas" onBack={onBack}/>

    {err && <ErrBanner msg={err} onRetry={()=>setErr(null)}/>}

    {/* selector bloque */}
    <div style={{padding:'12px 16px 0'}}>
      <div className="field-label">Bloque</div>
      <div style={{display:'flex',gap:8,overflowX:'auto',margin:'0 -16px',padding:'0 16px 4px'}}>
        {cat?.bloques?.map(b=>(
          <div key={b.id} onClick={()=>{setBloqId(b.id);setFilter('todos');}} style={{
            flexShrink:0,padding:'9px 14px',borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:600,
            background:bloqId===b.id?'var(--accent)':'var(--surface)',
            color:bloqId===b.id?'#fff':'var(--ink)',
            border:'1px solid '+(bloqId===b.id?'var(--accent)':'var(--line)'),
          }}>
            <div className="mono" style={{fontSize:9,opacity:0.75,marginBottom:1}}>{b.codigo}</div>
            {b.nombre}
          </div>
        ))}
      </div>
    </div>

    {bloque && <div style={{padding:'12px 16px 0'}}>
      <div className="card" style={{padding:14}}>
        <div className="row" style={{justifyContent:'space-between',marginBottom:10}}>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>{bloque.nombre}</div>
            <div className="mono" style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{zona?.codigo}—{bloque.codigo} — {bloque.filas}×{bloque.columnas}</div>
          </div>
          <div className="chip">{bloque.tipo||'nichos'}</div>
        </div>
        <div className="row gap-6" style={{flexWrap:'wrap'}}>
          {[['ocupada','Ocupadas','var(--ink-2)','var(--surface-3)'],
            ['libre','Libres','var(--accent)','var(--accent-soft)'],
            ['reservada','Reservadas','var(--warn)','var(--warn-soft)'],
            ['clausurada','Clausuradas','var(--ink-3)','var(--surface-2)'],
          ].map(([k,l,c,bg])=>(
            <div key={k} className="chip" onClick={()=>setFilter(filter===k?'todos':k)} style={{color:c,background:bg,borderColor:filter===k?c:'transparent',cursor:'pointer'}}>
              <span className="chip-dot"/>{l} <span className="mono" style={{opacity:0.7}}>{counts[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>}

    {loadSep ? <div style={{padding:24}}><LoadView msg="Cargando sepulturas…"/></div> : (
      bloque && seps.length > 0 && <>
        <div style={{padding:'16px 16px 0'}}>
          <div className="sec-title" style={{marginBottom:10}}>Disposición física — vista frontal</div>
          <div style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:14,padding:'10px 10px 10px 28px',overflowX:'auto'}}>
            <div style={{display:'flex',gap:3,marginBottom:3}}>
              {Array.from({length:bloque.columnas}).map((_,i)=>(
                <div key={i} className="mono" style={{flex:1,textAlign:'center',fontSize:8,color:'var(--ink-3)',minWidth:22}}>{i+1}</div>
              ))}
            </div>
            {Array.from({length:bloque.filas}).map((_,f)=>(
              <div key={f} style={{display:'flex',gap:3,marginBottom:3,alignItems:'center',position:'relative'}}>
                <div className="mono" style={{position:'absolute',left:-22,fontSize:8,color:'var(--ink-3)'}}>F{f+1}</div>
                {Array.from({length:bloque.columnas}).map((_,c)=>{
                  const s = seps.find(x=>+x.fila===(f+1)&&+x.columna===(c+1));
                  if(!s) return <div key={c} style={{flex:1,aspectRatio:1,minWidth:22}}/>;
                  const dim = filter!=='todos' && s.estado!==filter;
                  return <div key={c} className={cls(s)} onClick={()=>!dim&&onOpenFicha(s.id)} style={{flex:1,opacity:dim?0.15:1,minWidth:22}}>{s.numero||''}</div>;
                })}
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:'16px 16px 0'}}>
          <div className="sec-title" style={{marginBottom:10}}>Lista {filter!=='todos'?`— ${filter}`:''} ({shown.length})</div>
          <div className="card">
            {shown.slice(0,20).map((s,i)=>(
              <React.Fragment key={s.id}>
                {i>0&&<hr className="hline"/>}
                <div onClick={()=>onOpenFicha(s.id)} style={{padding:'12px 16px',display:'flex',gap:12,cursor:'pointer',alignItems:'center'}}>
                  <div style={{width:40,height:40,borderRadius:8,flexShrink:0,
                    background:s.estado==='libre'?'var(--accent-soft)':s.estado==='reservada'?'var(--warn-soft)':'var(--surface-2)',
                    color:s.estado==='libre'?'var(--accent)':s.estado==='reservada'?'var(--warn)':'var(--ink-2)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'ui-monospace,monospace',fontWeight:700,fontSize:12}}>
                    {s.numero||'?'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600}}>{s.codigo}</div>
                    <div className="mono" style={{fontSize:11,color:'var(--ink-3)'}}>F{s.fila} — C{s.columna}</div>
                  </div>
                  <div className="chip" style={{fontSize:10,textTransform:'capitalize'}}>{s.estado}</div>
                  <Ico d={icRight} s={16} stroke="var(--ink-3)"/>
                </div>
              </React.Fragment>
            ))}
            {shown.length>20&&<div style={{padding:14,textAlign:'center',fontSize:13,color:'var(--ink-3)'}}>+{shown.length-20} más…</div>}
          </div>
        </div>
      </>
    )}
  </div>;
}

// ÔöÇÔöÇÔöÇ FICHA ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function FichaScreen({id, onBack}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('datos');
  const [sheet, setSheet] = useState(null);
  const [sucesoOpen, setSucesoOpen] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(()=>{
    if(!id) return;
    (async()=>{
      setLoading(true); setErr(null);
      try {
        // Endpoint “estable” de detalle (incluye titular, concesión, documentos, sucesos, etc.)
        let d = await GET(`/cementerio/sepulturas/${id}`).catch(()=>null);
        // Compat: si en algún entorno antiguo solo existe el admin endpoint
        if(!d) d = await GET(`/cementerio/admin/sepulturas/${id}`).catch(()=>null);
        // Normaliza respuesta tipo { item: {...} }
        if(d && d.item && typeof d.item === 'object') d = d.item;
        if(!d) {
          // fallback: buscar en listado del bloque
          const bloqId = String(id).split('-')[0];
          const r = await GET(`/cementerio/bloques/${bloqId}/sepulturas`).catch(()=>([]));
          d = arr(r).find(s=>String(s.id)===String(id)) || {id};
        }

        // En el backend del compañero algunos detalles no vienen completos
        // (concesión/difuntos) aunque existan. Enriquecemos consultando el buscador de concesiones.
        const needsEnrich = !!d?.codigo
          && !(d?.concesion_activa || d?.concesion || d?.concesion_vigente)
          && arr(d?.difuntos).length === 0
          && !d?.difunto_titular;
        if (needsEnrich) {
          const code = String(d.codigo || '').trim();
          const m = code.match(/N(\d+)\s*$/i);
          const nNum = m ? m[1] : null; // "132" en "ZV-B8-N132"
          const candidates = [
            code,
            nNum ? `N${nNum}` : null,
            nNum,
            String(d.id || ''),
          ].filter(Boolean);

          let it = null;
          for (const q of candidates) {
            const rr = await GET(`/cementerio/concesiones?q=${encodeURIComponent(q)}`).catch(()=>null);
            const items = arr(rr?.items || rr);
            it = items.find(x => String(x?.sepultura_id ?? '') === String(d.id ?? '')) || items[0] || null;
            if (it) break;
          }

          if (it) {
            d = {
              ...d,
              concesion_vigente: {
                id: it.id,
                sepultura_id: it.sepultura_id,
                numero_expediente: it.numero_expediente,
                tipo: it.tipo,
                fecha_concesion: it.fecha_concesion,
                fecha_vencimiento: it.fecha_vencimiento,
                duracion_anos: it.duracion_anos,
                estado: it.estado,
                importe: it.importe,
                moneda: it.moneda || 'euros',
                terceros: it.concesionario ? [{
                  nombre_completo: it.concesionario,
                  dni: it.concesionario_dni,
                  pivot: { rol: 'concesionario', activo: 1 },
                }] : [],
              },
              difuntos: arr(it.difuntos),
            };
          }
        }

        setData(d);
      } catch(e){ setErr(e.message); } finally{ setLoading(false); }
    })();
  },[id, rev]);

  if(loading) return <LoadView msg="Cargando ficha…"/>;
  if(err) return <><StickyHeader title="Ficha" onBack={onBack}/><ErrBanner msg={err} onRetry={()=>setRev(r=>r+1)}/></>;
  if(!data) return null;

  const s = data;
  // Normalización entre backends (local vs servidor compañero)
  const conc = s.concesion_activa || s.concesion || s.concesion_vigente;
  const difs = (() => {
    const out = arr(s.difuntos);
    if(out.length===0 && s.difunto_titular) return [s.difunto_titular];
    return out;
  })();
  const sucs = arr(s.sucesos);
  const titular = (() => {
    if(!conc) return null;
    if(conc.titular) return conc.titular;
    const ts = arr(conc.terceros);
    const t = ts.find(x=>x?.pivot?.rol==='concesionario' && (x?.pivot?.activo===true || x?.pivot?.activo===1)) || ts[0];
    return t || null;
  })();

  return <div className="screen-inner">
    <StickyHeader
      title={`${s.tipo==='columbario'?'Columbario':'Nicho'} #${s.numero||s.id}`}
      subtitle={s.codigo || ''}
      onBack={onBack}
      right={<button className="btn btn-sm" onClick={()=>setSheet('edit')}><Ico d={icEdit} s={15}/>Editar</button>}
    />

    {/* Hero estado */}
    <div style={{padding:'12px 16px 0'}}>
      <div style={{padding:'14px 16px',background:'var(--surface)',border:'1px solid var(--line)',borderRadius:'var(--r)',display:'flex',gap:14,alignItems:'center'}}>
        <div style={{width:48,height:48,borderRadius:12,flexShrink:0,
          background:s.estado==='libre'?'var(--accent-soft)':s.estado==='reservada'?'var(--warn-soft)':'var(--surface-2)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'ui-monospace,monospace',fontWeight:800,fontSize:15,
          color:s.estado==='libre'?'var(--accent)':s.estado==='reservada'?'var(--warn)':'var(--ink-2)'}}>
          {s.numero||'?'}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:18,fontWeight:800,letterSpacing:'-0.02em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {titular ? (titular.nombre_completo || `${titular.apellido1||''} ${titular.apellido2||''}, ${titular.nombre||''}`.trim()) : 'Sin titular'}
          </div>
          <div className="mono" style={{fontSize:11,color:'var(--ink-3)',marginTop:3}}>{s.codigo} — F{s.fila} C{s.columna}</div>
          {conc?.numero_expediente && <div style={{fontSize:12,color:'var(--ink-2)',marginTop:2}}>{conc.numero_expediente}</div>}
        </div>
        <div className="chip" style={{
          fontSize:10,textTransform:'capitalize',flexShrink:0,
          color:s.estado==='libre'?'var(--accent)':s.estado==='reservada'?'var(--warn)':'var(--ink-2)',
          background:s.estado==='libre'?'var(--accent-soft)':s.estado==='reservada'?'var(--warn-soft)':'var(--surface-2)',
          borderColor:'transparent'
        }}><span className="chip-dot"/>{s.estado||'—'}</div>
      </div>
    </div>

    <div style={{padding:'14px 16px 0'}}>
      <div className="tabs">
        {[['datos','Datos'],['concesion','Concesión'],['restos','Restos'],['sucesos','Sucesos']].map(([k,l])=>(
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>
        ))}
      </div>
    </div>

    <div style={{padding:'14px 16px 0'}}>
      {tab==='datos' && <div className="card" style={{padding:0}}>
        <KV k="Código" v={s.codigo} mono/>
        <hr className="hline"/><KV k="Tipo" v={s.tipo}/>
        <hr className="hline"/><KV k="Fila" v={s.fila} mono/>
        <hr className="hline"/><KV k="Columna" v={s.columna} mono/>
        <hr className="hline"/><KV k="Estado" v={s.estado}/>
        <hr className="hline"/><KV k="Bloque" v={s.bloque_id} mono/>
        <hr className="hline"/><KV k="Zona" v={s.zona_id} mono/>
      </div>}

      {tab==='concesion' && (!conc
        ? <div className="card" style={{padding:24,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Sin concesión asociada.</div>
        : <div className="card" style={{padding:0}}>
          <KV k="Expediente" v={conc.numero_expediente} mono/>
          <hr className="hline"/><KV k="Tipo" v={conc.tipo}/>
          <hr className="hline"/><KV k="Fecha concesión" v={conc.fecha_concesion} mono/>
          <hr className="hline"/><KV k="Vencimiento" v={conc.fecha_vencimiento||'Perpetua'} mono/>
          <hr className="hline"/><KV k="Importe" v={conc.importe?`${conc.importe} Ôé¼`:null} mono/>
          <hr className="hline"/><KV k="Estado" v={conc.estado}/>
          {titular && <>
            <hr className="hline"/>
            <div style={{padding:'12px 16px'}}>
              <div className="field-label" style={{marginBottom:10}}>Titular</div>
              <div className="row gap-12">
                <div style={{width:38,height:38,borderRadius:'50%',background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0}}>
                  {(titular.nombre||'?')[0]}{(titular.apellido1||'?')[0]}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700}}>{titular.nombre_completo||`${titular.apellido1||''} ${titular.apellido2||''}, ${titular.nombre||''}`.trim()}</div>
                  <div className="mono" style={{fontSize:11,color:'var(--ink-3)'}}>{titular.dni||''}{titular.telefono?` — ${titular.telefono}`:''}</div>
                </div>
              </div>
            </div>
          </>}
        </div>
      )}

      {tab==='restos' && (difs.length===0
        ? <div className="card" style={{padding:24,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Sin restos registrados.</div>
        : <div className="card">{difs.map((d,i)=>(
          <React.Fragment key={d.id}>{i>0&&<hr className="hline"/>}
            <div style={{padding:'12px 16px'}}>
              <div className="row" style={{justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:700}}>{d.nombre_completo}</div>
                {d.es_titular&&<span className="chip" style={{fontSize:10}}>titular</span>}
              </div>
              <div className="mono" style={{fontSize:11,color:'var(--ink-3)'}}>✝ {d.fecha_fallecimiento} — {d.fecha_inhumacion}</div>
              {d.parentesco&&<div style={{fontSize:12,color:'var(--ink-2)',marginTop:3}}>{d.parentesco}</div>}
            </div>
          </React.Fragment>
        ))}</div>
      )}

      {tab==='sucesos' && (
        sucs.length===0
          ? <div className="card" style={{padding:24,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Sin sucesos registrados.</div>
          : <div className="card">{sucs.map((su,i)=>(
            <React.Fragment key={su.id}>{i>0&&<hr className="hline"/>}
              <div style={{padding:'12px 16px'}}>
                <div className="row" style={{justifyContent:'space-between',marginBottom:4}}>
                  <div style={{fontSize:14,fontWeight:700}}>{su.titulo}</div>
                  <div className="mono" style={{fontSize:10,color:'var(--ink-3)'}}>{su.fecha?.slice(0,10)}</div>
                </div>
                <div style={{fontSize:12,color:'var(--ink-2)'}}>{su.desc||su.descripcion}</div>
                {su.severidad && <div style={{marginTop:8}}>
                  <span className="chip" style={{fontSize:10,textTransform:'capitalize'}}>{su.severidad}</span>
                  {su.tipo && <span className="chip" style={{fontSize:10,marginLeft:8,textTransform:'capitalize'}}>{su.tipo}</span>}
                </div>}
              </div>
            </React.Fragment>
          ))}</div>
      )}
    </div>

    {/* Barra inferior como en la app */}
    <div style={{padding:'14px 16px 0'}}>
      <div className="row" style={{gap:12}}>
        <button className="btn" onClick={()=>setSheet('edit')} style={{flex:1,height:52}}>
          <Ico d={icEdit} s={18}/>Editar
        </button>
        <button className="btn btn-primary" onClick={()=>setSucesoOpen(true)} style={{flex:1,height:52}}>
          <Ico d={icPlus} s={18}/>Añadir suceso
        </button>
      </div>
    </div>

    {sheet==='edit' && <EditSepSheet s={s} onClose={()=>setSheet(null)} onSaved={()=>{setSheet(null);setRev(r=>r+1);}}/>}
    {sucesoOpen && <NuevoSucesoSheet sepultura={s} onClose={()=>setSucesoOpen(false)} onSaved={()=>{setSucesoOpen(false); setRev(r=>r+1);}}/>}
  </div>;
}

function NuevoSucesoSheet({sepultura, onClose, onSaved}) {
  const fixedSep = !!sepultura;
  const [picked, setPicked] = useState(sepultura||null);
  const [tipo, setTipo] = useState('anomalia');
  const [sev, setSev] = useState('media');
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [geo, setGeo] = useState({lat:null, lon:null, acc:null});
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(()=>{
    if(!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos=>setGeo({lat:pos.coords.latitude, lon:pos.coords.longitude, acc:Math.round(pos.coords.accuracy||0)}),
      ()=>{},
      {enableHighAccuracy:true, timeout:5000}
    );
  },[]);

  useEffect(()=>{
    if(fixedSep) return;
    const t = (q||'').trim();
    if(t.length<2) { setRes([]); return; }
    let alive = true;
    setLoadingSearch(true);
    GET(`/cementerio/sepulturas/search?q=${encodeURIComponent(t)}`)
      .then(r=>{ if(!alive) return; setRes(arr(r)); })
      .catch(()=>{ if(!alive) return; setRes([]); })
      .finally(()=>{ if(!alive) return; setLoadingSearch(false); });
    return ()=>{ alive=false; };
  },[q,fixedSep]);

  const save = async()=>{
    const target = picked;
    if(!target?.id) { toast('Selecciona una sepultura','warn'); return; }
    if(!titulo.trim()) { toast('Pon un título','warn'); return; }
    setSaving(true);
    try {
      await POST(`/cementerio/sepulturas/${target.id}/sucesos`, {
        tipo,
        severidad: sev,
        titulo: titulo.trim(),
        descripcion: (desc||'').trim() || null,
        lat: geo.lat,
        lon: geo.lon,
        accuracy_m: geo.acc,
      });
      if(file) {
        const fd = new FormData();
        fd.append('archivo', file);
        fd.append('tipo', 'fotografia');
        fd.append('descripcion', `Suceso: ${titulo.trim()}`);
        await POST(`/cementerio/sepulturas/${target.id}/documentos`, fd);
      }
      toast('Suceso guardado');
      onSaved();
    } catch(e){ toast(e.message,'warn'); } finally{ setSaving(false); }
  };

  const tipos = [
    ['anomalia','Anomalía',icBell,'var(--danger)'],
    ['mantenimiento','Mantenimiento',icSettings,'var(--warn)'],
    ['inhumacion','Inhumación',icPlus,'var(--accent)'],
    ['exhumacion','Exhumación',icArchive,'var(--ink-2)'],
    ['traslado','Traslado',icRight,'var(--info)'],
    ['otro','Otro','M12 2v20M2 12h20','var(--ink-3)'],
  ];

  return <div className="sheet-backdrop" onClick={onClose}>
    <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
      <div className="sheet-handle"/>
      <div className="sheet-scroll">
        <div className="row" style={{justifyContent:'space-between',marginBottom:14}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>Nuevo suceso</div>
            <div style={{fontSize:12,color:'var(--ink-3)',marginTop:3}}>Se registrará en tu ubicación actual</div>
          </div>
          <div onClick={onClose} style={{width:32,height:32,borderRadius:8,background:'var(--surface)',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ico d={icClose} s={16}/></div>
        </div>

        <div className="field-label">Tipo</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
          {tipos.map(([k,l,ic,c])=>(
            <div key={k} onClick={()=>setTipo(k)} style={{
              padding:'10px 10px',borderRadius:12,cursor:'pointer',
              background: tipo===k ? 'var(--surface-2)' : 'var(--surface)',
              border:`1px solid ${tipo===k?c:'var(--line)'}`,
              color: tipo===k ? c : 'var(--ink-2)',
              display:'flex',flexDirection:'column',alignItems:'center',gap:6
            }}>
              <Ico d={ic} s={18}/>
              <div style={{fontSize:12,fontWeight:800,textAlign:'center'}}>{l}</div>
            </div>
          ))}
        </div>

        <div className="field-label">Sepultura afectada</div>
        {picked ? (
          <div style={{padding:'12px 14px',borderRadius:12,background:'var(--surface)',border:'1px solid var(--line)',display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
            <Ico d={icPin} s={18} stroke="var(--ink-3)"/>
            <div style={{flex:1,minWidth:0}}>
              <div className="mono" style={{fontSize:12,fontWeight:800}}>{picked.codigo || `ID ${picked.id}`}</div>
              <div style={{fontSize:12,color:'var(--ink-3)'}}>{picked.bloque?.codigo ? `${picked.bloque.codigo} — `:''}{picked.zona?.nombre||''}</div>
            </div>
            {fixedSep && <span className="chip" style={{fontSize:10}}>auto-detectado</span>}
          </div>
        ) : (
          <div style={{padding:'12px 14px',borderRadius:12,background:'var(--surface)',border:'1px solid var(--line)',marginBottom:14}}>
            <div className="row" style={{gap:10}}>
              <Ico d={icSearch} s={18} stroke="var(--ink-3)"/>
              <input placeholder="Buscar por código o número…" value={q} onChange={e=>setQ(e.target.value)} />
              {loadingSearch && <Spinner size={18}/>}
            </div>
            {res.length>0 && <div style={{marginTop:10,borderTop:'1px solid var(--line)'}}>
              {res.slice(0,8).map((it,i)=>(
                <div key={it.id} onClick={()=>{ setPicked(it); setRes([]); }} style={{padding:'10px 0',cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:it.estado==='libre'?'var(--accent)':it.estado==='reservada'?'var(--warn)':'var(--danger)'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="mono" style={{fontSize:12,fontWeight:800}}>{it.codigo||`ID ${it.id}`}</div>
                    <div style={{fontSize:12,color:'var(--ink-3)'}}>{it.bloque?.codigo ? `${it.bloque.codigo} — `:''}{it.zona?.nombre||''}</div>
                  </div>
                  <Ico d={icRight} s={16} stroke="var(--ink-3)"/>
                </div>
              ))}
            </div>}
          </div>
        )}

        <div className="field-label">Título</div>
        <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej: Grieta en lápida frontal" />

        <div style={{height:12}}/>
        <div className="field-label">Descripción</div>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Detalle del suceso…" rows={3}/>

        <div style={{height:12}}/>
        <div className="field-label">Severidad</div>
        <div className="tabs" style={{marginBottom:14}}>
          {[['baja','Baja'],['media','Media'],['alta','Alta']].map(([k,l])=>(
            <div key={k} className={`tab ${sev===k?'active':''}`} onClick={()=>setSev(k)}>{l}</div>
          ))}
        </div>

        <div className="field-label">Adjuntos</div>
        <div style={{padding:'12px 14px',borderRadius:12,background:'var(--surface)',border:'1px solid var(--line)',marginBottom:16}}>
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
          {file && <div className="mono" style={{fontSize:11,color:'var(--ink-3)',marginTop:8}}>{file.name}</div>}
        </div>

        <button className="btn btn-primary btn-block" onClick={save} disabled={saving} style={{height:52}}>
          {saving?<Spinner size={20}/>:<><Ico d={icCheck} s={18}/>Guardar suceso</>}
        </button>
      </div>
    </div>
  </div>;
}

function EditSepSheet({s, onClose, onSaved}) {
  const [estado, setEstado] = useState(s.estado||'libre');
  const [saving, setSaving] = useState(false);
  const save = async()=>{
    setSaving(true);
    try { await PUT(`/cementerio/admin/sepulturas/${s.id}`,{...s,estado}); toast(`${s.codigo} actualizada`); onSaved(); }
    catch(e){ toast(e.message,'warn'); } finally{ setSaving(false); }
  };
  return <div className="sheet-backdrop" onClick={onClose}>
    <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
      <div className="sheet-handle"/>
      <div className="sheet-scroll">
        <div className="row" style={{justifyContent:'space-between',marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:800}}>Editar sepultura</div>
          <div onClick={onClose} style={{width:32,height:32,borderRadius:8,background:'var(--surface)',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ico d={icClose} s={16}/></div>
        </div>
        <div className="field-label">Estado</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
          {[['libre','Libre','var(--accent)'],['ocupada','Ocupada','var(--danger)'],['reservada','Reservada','var(--warn)'],['clausurada','Clausurada','var(--ink-3)']].map(([k,l,c])=>(
            <div key={k} onClick={()=>setEstado(k)} style={{padding:'12px 14px',borderRadius:10,cursor:'pointer',background:estado===k?'var(--surface-2)':'transparent',border:`1px solid ${estado===k?c:'var(--line)'}`,display:'flex',alignItems:'center',gap:10}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:c}}/>
              <span style={{fontSize:14,fontWeight:estado===k?700:400}}>{l}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving} style={{height:52}}>
          {saving?<Spinner size={20}/>:<><Ico d={icCheck} s={18}/>Guardar cambios</>}
        </button>
      </div>
    </div>
  </div>;
}

// ─── MAPA ────────────────────────────────────────────────────────────────
function MapaScreen({onBack, onNav}) {
  const [sel, setSel] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Real Somahoz cemetery — 10 official blocks, north→south layout
  const BLOQUES = [
    {codigo:'B2001',label:'Muro Norte',   unidades:52,  filas:4,cols:13,x:60, y:50, w:880,h:75 },
    {codigo:'BA',   label:'Ampliación A', unidades:40,  filas:4,cols:10,x:60, y:215,w:218,h:155},
    {codigo:'B8',   label:'Muro Sur',     unidades:128, filas:4,cols:32,x:320,y:215,w:620,h:155},
    {codigo:'B7',   label:'Bloque 7',     unidades:56,  filas:4,cols:14,x:60, y:440,w:296,h:118},
    {codigo:'B6',   label:'Bloque 6',     unidades:40,  filas:4,cols:10,x:406,y:440,w:196,h:108},
    {codigo:'BD',   label:'Amp. D',       unidades:52,  filas:4,cols:13,x:652,y:440,w:288,h:128},
    {codigo:'B2007',label:'Exento 2007',  unidades:40,  filas:4,cols:10,x:60, y:640,w:218,h:130},
    {codigo:'B2017',label:'Amp. 2017',    unidades:40,  filas:4,cols:10,x:328,y:640,w:218,h:120},
    {codigo:'B2020',label:'Amp. 2020',    unidades:24,  filas:4,cols:6, x:596,y:640,w:128,h:100},
    {codigo:'B2025',label:'Amp. 2025',    unidades:48,  filas:4,cols:12,x:60, y:855,w:880,h:75 },
  ];

  const zUp = () => setZoom(z => Math.min(3, +(z + 0.5).toFixed(1)));
  const zDn = () => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)));
  const zRs = () => setZoom(1);

  return (
    <div className="screen-inner">
      <StickyHeader title="Plano del recinto" subtitle="Vista satélite · Somahoz" onBack={onBack}/>

      <div style={{position:'relative',overflow:'hidden',background:'#D4E8CC'}}>
        {/* Zoom controls */}
        <div style={{position:'absolute',right:12,top:12,zIndex:10,display:'flex',flexDirection:'column',gap:8}}>
          {[{l:'+',a:zUp},{l:'−',a:zDn},{l:'⊙',a:zRs}].map(({l,a})=>(
            <button key={l} onClick={a} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.95)',border:'1px solid rgba(15,23,42,0.10)',fontSize:l==='+'||l==='−'?20:15,fontWeight:700,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.12)',display:'flex',alignItems:'center',justifyContent:'center',color:'#0F172A'}}>{l}</button>
          ))}
        </div>

        <div style={{transform:`scale(${zoom})`,transformOrigin:'center top',transition:'transform 0.2s ease'}}>
          <svg viewBox="0 0 1000 1000" style={{width:'100%',display:'block'}} preserveAspectRatio="xMidYMin meet">

            {/* Background */}
            <rect x="0" y="0" width="1000" height="1000" fill="#D4E8CC"/>

            {/* Dot grid */}
            {(()=>{const d=[];for(let r=0;r<25;r++)for(let c=0;c<25;c++)d.push(<circle key={`d${r}-${c}`} cx={38+c*38} cy={16+r*38} r={2.3} fill="#8CB890" opacity={0.42}/>);return d;})()}

            {/* Trees */}
            {[[80,38,30],[920,38,30],[34,508,22],[966,508,22],[34,750,18],[966,755,18]].map(([cx,cy,r],i)=>(
              <circle key={`t${i}`} cx={cx} cy={cy} r={r} fill="#5A9060" opacity={0.88}/>
            ))}

            {/* Pathways */}
            <line x1="60"  y1="168" x2="940" y2="168" stroke="rgba(255,255,255,0.70)" strokeWidth="28" strokeLinecap="round"/>
            <line x1="300" y1="215" x2="300" y2="370" stroke="rgba(255,255,255,0.58)" strokeWidth="20" strokeLinecap="round"/>
            <line x1="60"  y1="405" x2="940" y2="405" stroke="rgba(255,255,255,0.64)" strokeWidth="24" strokeLinecap="round"/>
            <line x1="60"  y1="600" x2="940" y2="600" stroke="rgba(255,255,255,0.62)" strokeWidth="22" strokeLinecap="round"/>
            <line x1="60"  y1="808" x2="940" y2="808" stroke="rgba(255,255,255,0.58)" strokeWidth="20" strokeLinecap="round"/>

            {/* Chapel */}
            <path d="M456,165 L490,132 L524,165" fill="#C4B298" stroke="#7A6540" strokeWidth="2.5"/>
            <rect x="456" y="165" width="68" height="40" rx="5" fill="#D0C0A4" stroke="#7A6540" strokeWidth="2.5"/>
            <line x1="490" y1="139" x2="490" y2="185" stroke="#6A5530" strokeWidth="4" strokeLinecap="round"/>
            <line x1="476" y1="151" x2="504" y2="151" stroke="#6A5530" strokeWidth="4" strokeLinecap="round"/>

            {/* Blocks */}
            {BLOQUES.map(b=>{
              const active = sel?.codigo===b.codigo;
              const fill   = active?'#B09468':'#C8B68E';
              const stroke = active?'#2F1F06':'rgba(80,55,20,0.65)';
              const sw     = active?5:2.5;
              const inside = b.h<100;
              const cols   = Math.max(3,Math.min(12,b.cols));
              const lfs    = b.w>400?22:b.w>200?18:15;
              const ufs    = lfs-5;
              const vcLines=[]; for(let i=0;i<cols-1;i++) vcLines.push(i);
              return (
                <g key={b.codigo} onClick={()=>setSel(sel?.codigo===b.codigo?null:b)} style={{cursor:'pointer'}}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="14" fill={fill} stroke={stroke} strokeWidth={sw}/>
                  <g opacity="0.28">
                    {vcLines.map(i=><line key={`vc${i}`} x1={b.x+(i+1)*b.w/cols} y1={b.y+4} x2={b.x+(i+1)*b.w/cols} y2={b.y+b.h-4} stroke="rgba(50,30,5,0.55)" strokeWidth="1.5"/>)}
                    {[0,1,2].map(i=><line key={`hr${i}`} x1={b.x+4} y1={b.y+(i+1)*b.h/4} x2={b.x+b.w-4} y2={b.y+(i+1)*b.h/4} stroke="rgba(50,30,5,0.55)" strokeWidth="1.5"/>)}
                  </g>
                  {active&&<circle cx={b.x+b.w*0.12} cy={b.y+b.h*0.5} r="13" fill="#FFF" stroke="#1A0F00" strokeWidth="3.5"/>}
                  {inside?(
                    <>
                      <text x={b.x+b.w/2} y={b.y+b.h*0.40} textAnchor="middle" dominantBaseline="middle" fontSize={lfs} fontWeight="800" fill="rgba(15,8,0,0.80)">{b.label}</text>
                      <text x={b.x+b.w/2} y={b.y+b.h*0.78} textAnchor="middle" dominantBaseline="middle" fontSize={ufs} fontWeight="700" fill="rgba(15,8,0,0.55)">{b.unidades} nichos</text>
                    </>
                  ):(
                    <>
                      <text x={b.x+b.w/2} y={b.y+b.h+26} textAnchor="middle" fontSize={lfs} fontWeight="800" fill="rgba(15,8,0,0.80)">{b.label}</text>
                      <text x={b.x+b.w/2} y={b.y+b.h+26+lfs-2} textAnchor="middle" fontSize={ufs} fontWeight="700" fill="rgba(15,8,0,0.50)">{b.unidades} nichos</text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div style={{padding:'12px 16px'}}>
        {sel?(
          <div className="card" style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div>
                <div style={{fontSize:16,fontWeight:800}}>{sel.label}</div>
                <div className="mono" style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{sel.codigo} · {sel.filas}×{sel.cols} · {sel.unidades} nichos</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={()=>onNav('nichos')}>Ver nichos</button>
            </div>
            <div style={{fontSize:13,color:'var(--ink-2)'}}>Toca "Ver nichos" para explorar la cuadrícula de este bloque.</div>
          </div>
        ):(
          <div style={{textAlign:'center',color:'var(--ink-3)',fontSize:13,padding:'12px 0'}}>Toca un bloque del plano para ver sus detalles</div>
        )}
      </div>
    </div>
  );
}

// ———————————————————— GESTIÓN ————————————————————
function GestionScreen({onBack, onOpenFicha, onDataChanged}) {
  const [seg, setSeg] = useState('expedientes');
  const [q, setQ] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async()=>{
    setLoading(true); setErr(null);
    try {
      const ep = seg==='titulares' ? `/cementerio/terceros?q=${encodeURIComponent(q)}` : `/cementerio/concesiones?q=${encodeURIComponent(q)}`;
      setData(arr(await GET(ep)));
    } catch(e){ setErr(e.message); setData([]); } finally{ setLoading(false); }
  },[seg,q]);

  useEffect(()=>{ clearTimeout(timer.current); timer.current = setTimeout(load, q?450:0); return()=>clearTimeout(timer.current); },[seg,q]);

  return <div className="screen-inner">
    <StickyHeader title="Gestión" onBack={onBack}/>
    <div style={{padding:'12px 16px'}}>
      <div className="input-wrap">
        <Ico d={icSearch} s={18} stroke="var(--ink-3)"/>
        <input placeholder="Buscar expedientes, titulares…" value={q} onChange={e=>setQ(e.target.value)}/>
        {q&&<div onClick={()=>setQ('')} style={{cursor:'pointer',color:'var(--ink-3)'}}><Ico d={icClose} s={16}/></div>}
      </div>
    </div>
    <div style={{padding:'0 16px 14px'}}>
      <div className="tabs">
        {[['expedientes','Expedientes'],['titulares','Titulares']].map(([k,l])=>(
          <div key={k} className={`tab ${seg===k?'active':''}`} onClick={()=>{setSeg(k);setQ('');}}>{l}</div>
        ))}
      </div>
    </div>

    <div style={{padding:'0 16px 14px'}}>
      <div className="card" style={{padding:14,cursor:'pointer',background:'var(--accent-soft)',borderColor:'transparent'}} onClick={()=>setCreateOpen(true)}>
        <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
          <div className="row" style={{gap:12,alignItems:'center'}}>
            <div style={{width:44,height:44,borderRadius:12,background:'rgba(45,90,61,0.18)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Ico d={icGrid} s={18} stroke="var(--accent)"/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:900,color:'var(--accent-ink)'}}>Crear bloque nuevo</div>
              <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>Previsualiza filas×columnas y sentido</div>
            </div>
          </div>
          <Ico d={icRight} s={18} stroke="var(--accent)"/>
        </div>
      </div>
    </div>

    {loading && <div style={{padding:24}}><LoadView msg="Buscando…"/></div>}
    {err && <ErrBanner msg={err} onRetry={load}/>}
    {!loading && !err && <div style={{padding:'0 16px'}}>
      <div className="sec-title" style={{marginBottom:10}}>{data.length} resultado{data.length!==1?'s':''}</div>
      {data.length===0
        ? <div className="card" style={{padding:24,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>{q?`Sin resultados para "${q}"`:'Sin datos'}</div>
        : <div className="card">{data.map((item,i)=>(
          <React.Fragment key={item.id}>
            {i>0&&<hr className="hline"/>}
            {seg==='expedientes'
              ? <div style={{padding:'12px 16px',display:'flex',gap:12,cursor:'pointer'}} onClick={()=>item.sepultura_id&&onOpenFicha(item.sepultura_id)}>
                  <div style={{width:42,height:42,borderRadius:8,background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ico d={icFile} s={18}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="mono" style={{fontSize:12,fontWeight:700}}>{item.numero_expediente||item.label||'—'}</div>
                    <div style={{fontSize:12,color:'var(--ink-2)',marginTop:2}}>{[item.zona_nombre,item.bloque_nombre].filter(Boolean).join(' — ')}</div>
                    <div style={{marginTop:6}}>
                      <span className="chip" style={{fontSize:10,color:item.estado==='vigente'?'var(--accent)':item.estado==='caducada'?'var(--danger)':'var(--ink-3)',background:item.estado==='vigente'?'var(--accent-soft)':item.estado==='caducada'?'var(--danger-soft)':'var(--surface-2)',borderColor:'transparent'}}>
                        <span className="chip-dot"/>{item.estado||'—'}
                      </span>
                    </div>
                  </div>
                  {item.sepultura_id&&<Ico d={icRight} s={16} stroke="var(--ink-3)"/>}
                </div>
              : <div style={{padding:'12px 16px',display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0}}>
                    {(item.nombre||'?')[0]}{(item.apellido1||'?')[0]}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {item.nombre_completo||`${item.apellido1||''} ${item.apellido2||''}, ${item.nombre||''}`.trim()}
                    </div>
                    <div className="mono" style={{fontSize:11,color:'var(--ink-3)'}}>{[item.dni,item.telefono].filter(Boolean).join(' — ')}</div>
                  </div>
                </div>
            }
          </React.Fragment>
        ))}</div>
      }
    </div>}
    {createOpen && <CrearBloqueSheet onClose={()=>setCreateOpen(false)} onSaved={()=>{ setCreateOpen(false); toast('Bloque creado'); onDataChanged?.(); }} />}
  </div>;
}

function CrearBloqueSheet({onClose, onSaved}) {
  const [zonas, setZonas] = useState([]);
  const [zonaId, setZonaId] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [filas, setFilas] = useState(4);
  const [cols, setCols] = useState(6);
  const [sent, setSent] = useState('horiz_r'); // horiz_r | horiz_l | vert_d | vert_u
  const [inicio, setInicio] = useState(501);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ (async()=>{
    try {
      const r = await GET('/cementerio/catalogo');
      const d = r?.data||r;
      const zs = d?.zonas||[];
      setZonas(zs);
      if(!zonaId && zs.length) setZonaId(zs[0].id);
    } catch {}
  })(); },[]);

  const coords = ()=>{
    const f = Math.max(1, Math.min(200, +filas||1));
    const c = Math.max(1, Math.min(200, +cols||1));
    const out = [];
    if(sent==='horiz_l') {
      for(let i=1;i<=f;i++) for(let j=c;j>=1;j--) out.push([i,j]);
      return out;
    }
    if(sent==='vert_d') {
      for(let j=1;j<=c;j++) for(let i=1;i<=f;i++) out.push([i,j]);
      return out;
    }
    if(sent==='vert_u') {
      for(let j=1;j<=c;j++) for(let i=f;i>=1;i--) out.push([i,j]);
      return out;
    }
    for(let i=1;i<=f;i++) for(let j=1;j<=c;j++) out.push([i,j]);
    return out;
  };

  const grid = ()=>{
    const f = Math.max(1, Math.min(12, +filas||1));
    const c = Math.max(1, Math.min(12, +cols||1));
    const map = new Map();
    let n = +inicio||1;
    coords().forEach(([fi,co])=>{
      if(fi<=f && co<=c) map.set(`${fi}-${co}`, n);
      n++;
    });
    return {f,c,map};
  };

  const save = async()=>{
    if(!zonaId) { toast('Selecciona zona','warn'); return; }
    if(!codigo.trim()) { toast('Pon un código','warn'); return; }
    setSaving(true);
    try {
      await POST('/cementerio/admin/bloques', {
        zona_id: zonaId,
        codigo: codigo.trim(),
        nombre: `Bloque ${codigo.trim()}`,
        tipo: 'nichos',
        filas: +filas||1,
        columnas: +cols||1,
        sentido_numeracion: sent,
        numero_inicio: +inicio||1,
      });
      onSaved();
    } catch(e){ toast(e.message,'warn'); } finally{ setSaving(false); }
  };

  const g = grid();
  return <div className="sheet-backdrop" onClick={onClose}>
    <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
      <div className="sheet-handle"/>
      <div className="sheet-scroll">
        <div className="row" style={{justifyContent:'space-between',marginBottom:14}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>Crear bloque</div>
            <div style={{fontSize:12,color:'var(--ink-3)',marginTop:3}}>Define la disposición y previsualízala antes de guardar</div>
          </div>
          <div onClick={onClose} style={{width:32,height:32,borderRadius:8,background:'var(--surface)',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ico d={icClose} s={16}/></div>
        </div>

        <div className="row gap-10" style={{marginBottom:14}}>
          <div style={{flex:1}}>
            <div className="field-label">Zona</div>
            <div className="tabs">
              {zonas.map(z=>(
                <div key={z.id} className={`tab ${zonaId===z.id?'active':''}`} onClick={()=>setZonaId(z.id)} style={{fontSize:12}}>
                  {z.codigo||z.nombre?.slice(0,2)||`Z${z.id}`}
                </div>
              ))}
            </div>
          </div>
          <div style={{flex:1}}>
            <div className="field-label">Código</div>
            <input value={codigo} onChange={e=>setCodigo(e.target.value)} placeholder="B-C" />
          </div>
        </div>

        <div className="field-label">Dimensiones</div>
        <div className="row gap-10" style={{marginBottom:14}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:'var(--ink-3)',fontWeight:700,marginBottom:6}}>Filas</div>
            <div className="row" style={{gap:8}}>
              <button className="btn btn-sm" onClick={()=>setFilas(f=>Math.max(1,(+f||1)-1))} style={{width:40}}>-</button>
              <div className="card" style={{flex:1,padding:'10px 12px',textAlign:'center',fontWeight:800}}>{filas}</div>
              <button className="btn btn-sm btn-primary" onClick={()=>setFilas(f=>(+f||1)+1)} style={{width:40}}>+</button>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:'var(--ink-3)',fontWeight:700,marginBottom:6}}>Columnas</div>
            <div className="row" style={{gap:8}}>
              <button className="btn btn-sm" onClick={()=>setCols(c=>Math.max(1,(+c||1)-1))} style={{width:40}}>-</button>
              <div className="card" style={{flex:1,padding:'10px 12px',textAlign:'center',fontWeight:800}}>{cols}</div>
              <button className="btn btn-sm btn-primary" onClick={()=>setCols(c=>(+c||1)+1)} style={{width:40}}>+</button>
            </div>
          </div>
        </div>

        <div className="field-label">Sentido de numeración</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[['horiz_r','Horizontal →'],['horiz_l','Horizontal ←'],['vert_d','Vertical ↓'],['vert_u','Vertical ↑']].map(([k,l])=>(
            <div key={k} onClick={()=>setSent(k)} style={{padding:'12px 14px',borderRadius:12,cursor:'pointer',background:sent===k?'var(--ink)':'var(--surface)',color:sent===k?'#fff':'var(--ink)',border:'1px solid '+(sent===k?'var(--ink)':'var(--line)'),textAlign:'center',fontWeight:900}}>
              {l}
            </div>
          ))}
        </div>

        <div className="row gap-10" style={{marginBottom:14}}>
          <div style={{flex:1}}>
            <div className="field-label">Número inicial</div>
            <input type="number" value={inicio} onChange={e=>setInicio(+e.target.value)} />
          </div>
          <div style={{flex:1}} />
        </div>

        <div className="sec-title" style={{marginBottom:10}}>Previsualización — {Math.max(1,(+filas||1)) * Math.max(1,(+cols||1))} sepulturas</div>
        <div className="card" style={{padding:12,overflowX:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${g.c}, 54px)`,gap:8}}>
            {Array.from({length:g.f}).flatMap((_,fi)=>(
              Array.from({length:g.c}).map((_,ci)=>{
                const n = g.map.get(`${fi+1}-${ci+1}`);
                return <div key={`${fi}-${ci}`} style={{height:56,borderRadius:12,border:'1px solid var(--line)',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>{n||''}</div>;
              })
            ))}
          </div>
          <div style={{marginTop:10,fontSize:11,color:'var(--ink-3)'}}>Nota: la previsualización se limita a 12×12 por pantalla; al guardar se crearán todas.</div>
        </div>

        <div style={{height:14}}/>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving} style={{height:52}}>
          {saving?<Spinner size={20}/>:<><Ico d={icCheck} s={18}/>Guardar bloque</>}
        </button>
      </div>
    </div>
  </div>;
}

// ÔöÇÔöÇÔöÇ ADMIN CRUD ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function AdminScreen({onBack, onDataChanged}) {
  const [seg, setSeg] = useState('cementerios');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [rev, setRev] = useState(0);

  const cfgs = {
    cementerios:{ep:'/cementerio/admin/cementerios',l:'Cementerios',fields:[{k:'nombre',l:'Nombre'},{k:'municipio',l:'Municipio'}]},
    zonas:{ep:'/cementerio/admin/zonas',l:'Zonas',fields:[{k:'nombre',l:'Nombre'},{k:'codigo',l:'Código'}]},
    bloques:{ep:'/cementerio/admin/bloques',l:'Bloques',fields:[{k:'nombre',l:'Nombre'},{k:'codigo',l:'Código'},{k:'filas',l:'Filas',t:'number'},{k:'columnas',l:'Columnas',t:'number'}]},
    sepulturas:{ep:'/cementerio/admin/sepulturas',l:'Sepulturas',fields:[{k:'codigo',l:'Código'},{k:'estado',l:'Estado'}]},
  };
  const cfg = cfgs[seg];

  useEffect(()=>{
    (async()=>{ setLoading(true); setErr(null); setData([]);
      try{ setData(arr(await GET(cfg.ep))); } catch(e){ setErr(e.message); } finally{ setLoading(false); }
    })();
  },[seg,rev]);

  const del = async item=>{
    if(!window.confirm(`¿Eliminar "${item.nombre||item.codigo||item.id}"?`)) return;
    try { await DEL(`${cfg.ep}/${item.id}`); toast('Eliminado'); setRev(r=>r+1); }
    catch(e){ toast(e.message,'warn'); }
  };

  return <div className="screen-inner">
    <StickyHeader title="Administración" onBack={onBack}
      right={<button className="btn btn-primary btn-sm" onClick={()=>setSheet({mode:'create',item:{}})}><Ico d={icPlus} s={16}/>Nuevo</button>}
    />
    <div style={{padding:'12px 16px 0'}}>
      <div className="tabs">
        {Object.entries(cfgs).map(([k,v])=>(
          <div key={k} className={`tab ${seg===k?'active':''}`} onClick={()=>setSeg(k)} style={{fontSize:11}}>{v.l}</div>
        ))}
      </div>
    </div>
    <div style={{padding:'14px 16px'}}>
      {loading&&<LoadView msg={`Cargando ${cfg.l}…`}/>}
      {err&&<ErrBanner msg={err} onRetry={()=>setRev(r=>r+1)}/>}
      {!loading&&!err&&<>
        <div className="sec-title" style={{marginBottom:10}}>{data.length} {cfg.l.toLowerCase()}</div>
        {data.length===0
          ? <div className="card" style={{padding:24,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Sin registros</div>
          : <div className="card">{data.map((item,i)=>(
            <React.Fragment key={item.id}>
              {i>0&&<hr className="hline"/>}
              <div style={{padding:'12px 16px',display:'flex',gap:10,alignItems:'center'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.nombre||item.codigo||`#${item.id}`}</div>
                  <div className="mono" style={{fontSize:10,color:'var(--ink-3)',marginTop:2}}>ID:{item.id}{item.municipio?` — ${item.municipio}`:''}{item.filas?` — ${item.filas}×${item.columnas}`:''}{item.estado?` — ${item.estado}`:''}</div>
                </div>
                <div className="row gap-6">
                  <button className="btn btn-sm" onClick={()=>setSheet({mode:'edit',item})} style={{padding:'7px 10px'}}><Ico d={icEdit} s={14}/></button>
                  <button className="btn btn-sm" onClick={()=>del(item)} style={{padding:'7px 10px',color:'var(--danger)',borderColor:'var(--danger-soft)'}}><Ico d={icTrash} s={14}/></button>
                </div>
              </div>
            </React.Fragment>
          ))}</div>
        }
      </>}
    </div>
    {sheet&&<CrudSheet cfg={cfg} sheet={sheet} onClose={()=>setSheet(null)} onSaved={()=>{setSheet(null);setRev(r=>r+1); onDataChanged?.();}}/>}
  </div>;
}

function CrudSheet({cfg, sheet, onClose, onSaved}) {
  const [form, setForm] = useState(sheet.mode==='edit'?{...sheet.item}:{});
  const [saving, setSaving] = useState(false);
  const save = async()=>{
    setSaving(true);
    try {
      if(sheet.mode==='create') await POST(cfg.ep, form); else await PUT(`${cfg.ep}/${sheet.item.id}`,form);
      toast(sheet.mode==='create'?'Creado correctamente':'Actualizado');
      onSaved();
    } catch(e){ toast(e.message,'warn'); } finally{ setSaving(false); }
  };
  return <div className="sheet-backdrop" onClick={onClose}>
    <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
      <div className="sheet-handle"/>
      <div className="sheet-scroll">
        <div className="row" style={{justifyContent:'space-between',marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:800}}>{sheet.mode==='create'?'Nuevo':'Editar'} {cfg.l.slice(0,-1)}</div>
          <div onClick={onClose} style={{width:32,height:32,borderRadius:8,background:'var(--surface)',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Ico d={icClose} s={16}/></div>
        </div>
        {cfg.fields.map(f=>(
          <div key={f.k} style={{marginBottom:14}}>
            <div className="field-label">{f.l}</div>
            <input type={f.t||'text'} value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.l}/>
          </div>
        ))}
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving} style={{height:52,marginTop:6}}>
          {saving?<Spinner size={20}/>:<><Ico d={icCheck} s={18}/>Guardar</>}
        </button>
      </div>
    </div>
  </div>;
}

// ÔöÇÔöÇÔöÇ BOTTOM NAV ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function BottomNav({active, onNav}) {
  const items = [
    {id:'home',l:'Inicio',ic:icHome},
    {id:'nichos',l:'Nichos',ic:icGrid},
    {id:'mapa',l:'Mapa',ic:icMap},
    {id:'gestion',l:'Gestión',ic:icArchive},
  ];
  return <nav className="bottom-nav">
    {items.map(({id,l,ic})=>(
      <div key={id} className={`bnav-item ${active===id?'active':''}`} onClick={()=>onNav(id)}>
        <Ico d={ic} s={22}/>
        {l}
        {active===id && <div className="bnav-dot"/>}
      </div>
    ))}
  </nav>;
}

// ÔöÇÔöÇÔöÇ THEME ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function ThemeBtn() {
  const [dark, setDark] = useState(()=>localStorage.getItem('smz_theme')==='dark');
  useEffect(()=>{ document.documentElement.dataset.theme = dark?'dark':''; },[dark]);
  const tog = ()=>{ const n=!dark; setDark(n); localStorage.setItem('smz_theme',n?'dark':'light'); };
  return <button onClick={tog} style={{position:'fixed',top:12,right:12,zIndex:100,background:'var(--surface)',border:'1px solid var(--line)',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--ink-3)'}} aria-label="Cambiar tema">
    <Ico d={dark?icSun:icMoon} s={17}/>
  </button>;
}

// ÔöÇÔöÇÔöÇ APP ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function App() {
  const [screen, setScreen] = useState(()=>_tok ? (localStorage.getItem('smz_scr')||'home') : 'login');
  const [user, setUser] = useState(()=>{ try{return JSON.parse(localStorage.getItem('smz_usr'));}catch{return null;} });
  const [fichaId, setFichaId] = useState(null);
  const [dataRev, setDataRev] = useState(0); // refrescar catálogos al cambiar datos

  window.__logout = ()=>{ setTok(null); setUser(null); setScreen('login'); };

  const login = u=>{ setUser(u); localStorage.setItem('smz_usr',JSON.stringify(u)); setScreen('home'); };
  const logout = ()=>{ POST('/logout',{}).catch(()=>{}); setTok(null); setUser(null); localStorage.removeItem('smz_usr'); setScreen('login'); };
  const nav = s=>{ setScreen(s); if(s!=='ficha') localStorage.setItem('smz_scr',s); };
  const openFicha = id=>{ setFichaId(id); nav('ficha'); };
  const dataChanged = ()=>setDataRev(r=>r+1);

  const withNav = !['login','ficha','admin'].includes(screen);

  return <>
    <ThemeBtn/>
    {screen==='login' && <div className="screen"><LoginScreen onLogin={login}/></div>}
    {screen!=='login' && <>
      <div className="screen">
        {screen==='home'    && <HomeScreen onNav={nav} user={user} onLogout={logout}/>}
        {screen==='nichos'  && <NichosScreen onBack={()=>nav('home')} onOpenFicha={openFicha} dataRev={dataRev}/>}
        {screen==='ficha'   && <FichaScreen id={fichaId} onBack={()=>nav('nichos')}/>}
        {screen==='mapa'    && <MapaScreen onBack={()=>nav('home')} onNav={nav}/>}
        {screen==='gestion' && <GestionScreen onBack={()=>nav('home')} onOpenFicha={openFicha} onDataChanged={dataChanged}/>}
        {screen==='admin'   && <AdminScreen onBack={()=>nav('home')} onDataChanged={dataChanged}/>}
      </div>
      {withNav && <BottomNav active={screen} onNav={nav}/>}
    </>}
    <ToastHost/>
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

// ÔöÇÔöÇÔöÇ SERVICE WORKER ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/pwa/sw.js').catch(()=>{});
}

// Reset “de una” (borra SW + caches) para evitar 419/recursos viejos.
// Usar: /movil?reset=1
(async function(){
  try {
    const sp = new URLSearchParams(window.location.search);
    if (!sp.has('reset')) return;
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    ['smz_tok','smz_usr','smz_scr'].forEach(k => localStorage.removeItem(k));
    window.location.replace('/movil');
  } catch(e) {
    // si algo falla, forzamos igualmente recarga limpia
    window.location.replace('/movil');
  }
})();
</script>
@endverbatim
</body>
</html>
