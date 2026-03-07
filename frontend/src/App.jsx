// v3 — UI polish + logo + alphabet nav
import { useState, useEffect, useCallback, useRef } from "react";
import InsightsTab from "./InsightsTab.jsx";
import WishlistTab from "./WishlistTab.jsx";
import AdminTab from "./AdminTab.jsx";
import ExploreTab from "./ExploreTab.jsx";
import WardrobeTab from "./WardrobeTab.jsx";
import { EnrichPanel } from "./EnrichPanel.jsx";
import ShelvesTab from "./ShelvesTab.jsx";
import UsedToHaveTab from "./UsedToHaveTab.jsx";
import NotesTab from "./NotesTab.jsx";

const API = "https://olfactori-production.up.railway.app/api";

// ── DESIGN TOKENS ─────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --bg:        #0c0c0f;
    --bg2:       #111116;
    --bg3:       #17171e;
    --border:    #2a2a35;
    --border2:   #3a3a48;
    --gold:      #c9a84c;
    --gold2:     #e8c96a;
    --gold-dim:  rgba(201,168,76,0.15);
    --text:      #e8e0d5;
    --text2:     #9990a8;
    --text3:     #5a546a;
    --red:       #e05555;
    --green:     #4cae7a;
    --blue:      #5b8dee;
    --radius:    10px;
    --shadow:    0 8px 32px rgba(0,0,0,0.5);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg2); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  .app { display: flex; flex-direction: column; min-height: 100vh; }

  /* NAV */
  .nav {
    background: rgba(12,12,15,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 100;
    padding: 0 24px;
    display: flex; align-items: center; gap: 0;
    height: 56px;
  }
  .nav-logo {
    display: flex; align-items: center; gap: 6px;
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px; font-weight: 300;
    color: var(--gold); text-transform: uppercase;
    margin-right: 32px; flex-shrink: 0;
  }
  .nav-logo span { font-style: italic; }
  .nav-logo-icon { width: 28px; height: 28px; flex-shrink: 0; }
  .nav-tabs { display: flex; gap: 2px; flex: 1; position: relative; }
  .nav-tab {
    background: none; border: none; color: var(--text2);
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    padding: 8px 14px; border-radius: 6px; cursor: pointer;
    transition: color 0.15s; white-space: nowrap;
    letter-spacing: 0.03em; position: relative;
  }
  .nav-tab:hover { color: var(--text); }
  .nav-tab.active { color: var(--gold); }
  .nav-tab.active::after {
    content: ''; position: absolute; bottom: -9px; left: 14px; right: 14px;
    height: 2px; background: var(--gold); border-radius: 1px;
    animation: slideUnderline 0.2s ease;
  }
  @keyframes slideUnderline { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .nav-right { display: flex; gap: 8px; align-items: center; margin-left: auto; }
  .suggest-btn {
    background: var(--gold); color: #0c0c0f;
    border: none; border-radius: 8px;
    padding: 8px 16px; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; gap: 6px;
  }
  .suggest-btn:hover { background: var(--gold2); transform: translateY(-1px); }
  .icon-btn {
    background: var(--bg3); border: 1px solid var(--border);
    color: var(--text3); border-radius: 8px;
    width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; font-size: 16px;
  }
  .icon-btn:hover { color: var(--text2); border-color: var(--border2); }
  .badge {
    background: var(--red); color: white; border-radius: 10px;
    font-size: 10px; padding: 2px 5px; margin-left: -6px; margin-top: -10px;
    font-weight: 600;
  }

  /* MAIN */
  .main { flex: 1; padding: 24px; max-width: 1600px; margin: 0 auto; width: 100%; }

  /* SEARCH + FILTER BAR */
  .toolbar {
    display: flex; gap: 12px; align-items: center;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .search-wrap {
    position: relative; flex: 1; min-width: 200px;
  }
  .search-wrap svg {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: var(--text3); pointer-events: none;
  }
  .search-input {
    width: 100%; background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    padding: 9px 12px 9px 38px; font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s;
    outline: none;
  }
  .search-input:focus { border-color: var(--gold); }
  .search-input::placeholder { color: var(--text3); }
  .filter-select {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text2);
    padding: 9px 12px; font-size: 13px;
    font-family: 'DM Sans', sans-serif; cursor: pointer;
    outline: none; transition: border-color 0.15s;
  }
  .filter-select:focus { border-color: var(--border2); }
  .filter-panel {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px;
    margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 12px;
    align-items: flex-end;
  }
  .filter-group { display: flex; flex-direction: column; gap: 5px; min-width: 130px; }
  .filter-group label { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; }
  .filter-badge {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--gold); color: #0c0c0f; border-radius: 50%;
    width: 16px; height: 16px; font-size: 10px; font-weight: 700;
    margin-left: 4px; flex-shrink: 0;
  }
  .filter-clear { font-size: 11px; color: var(--text3); background: none; border: none;
    cursor: pointer; padding: 0; font-family: "DM Sans",sans-serif; text-decoration: underline; }
  .filter-clear:hover { color: var(--text); }
  .decade-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .decade-pill {
    font-size: 11px; padding: 4px 10px; border-radius: 10px;
    background: var(--bg3); border: 1px solid var(--border);
    color: var(--text3); cursor: pointer; transition: all 0.15s;
    font-family: "DM Sans",sans-serif;
  }
  .decade-pill.active { background: var(--gold-dim); border-color: rgba(201,168,76,0.4); color: var(--gold); }
  .rating-stars { display: flex; gap: 4px; }
  .rating-star { font-size: 16px; cursor: pointer; transition: transform 0.1s; opacity: 0.3; }
  .rating-star.active { opacity: 1; }
  .rating-star:hover { transform: scale(1.15); }
  .view-toggle {
    display: flex; gap: 2px; background: var(--bg2);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 3px;
  }
  .view-btn {
    background: none; border: none; color: var(--text3);
    padding: 5px 9px; border-radius: 7px; cursor: pointer;
    transition: all 0.15s; font-size: 15px;
  }
  .view-btn.active { background: var(--bg3); color: var(--text2); }
  .count-badge {
    color: var(--text3); font-size: 13px; white-space: nowrap;
  }

  /* ALPHABET NAV */
  .alpha-nav {
    display: flex; gap: 2px; flex-wrap: wrap;
    margin-bottom: 16px; padding: 8px 12px;
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .alpha-btn {
    background: none; border: none; color: var(--text3);
    font-size: 12px; font-family: 'DM Sans', sans-serif;
    width: 24px; height: 24px; border-radius: 4px;
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center;
    font-weight: 500;
  }
  .alpha-btn:hover { color: var(--text2); background: var(--bg3); }
  .alpha-btn.active { color: var(--gold); background: var(--gold-dim); }
  .alpha-btn.disabled { color: var(--border2); cursor: default; }
  .alpha-btn.disabled:hover { background: none; color: var(--border2); }

  /* GRID */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  .card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    position: relative;
  }
  .card:hover {
    border-color: var(--border2); transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  }
  .card-img {
    width: 100%; aspect-ratio: 1;
    background: var(--bg3);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; position: relative;
  }
  .card-img-inner {
    width: 75%; height: 75%;
    background: #ffffff;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px; overflow: hidden; flex-shrink: 0;
  }
  .card-img-inner img {
    width: 100%; height: 100%; object-fit: contain;
    transition: transform 0.3s, opacity 0.4s;
    opacity: 0;
  }
  .card-img-inner img.loaded { opacity: 1; }
  .card:hover .card-img-inner img { transform: scale(1.05); }
  .card-img-placeholder {
    font-size: 36px; opacity: 0.2;
  }

  /* SKELETON LOADER */
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%);
    background-size: 800px 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }
  .skeleton-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
  }
  .skeleton-img { width: 100%; aspect-ratio: 1; }
  .skeleton-body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .skeleton-line { height: 10px; }
  .skeleton-line.short { width: 60%; }
  .skeleton-line.long { width: 90%; }
  .skeleton-line.med { width: 75%; }

  .card-body { padding: 10px 12px; height: 120px; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; }
  .card-brand {
    font-size: 10px; font-weight: 700; color: var(--gold);
    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 3px; flex-shrink: 0;
    opacity: 0.85;
  }
  .card-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 16px; font-weight: 400; color: var(--text);
    line-height: 1.25; flex: 1; min-height: 0;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;
  }
  .card-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
  .pill {
    font-size: 10px; padding: 2px 7px; border-radius: 12px;
    background: var(--bg3); border: 1px solid var(--border);
    color: var(--text3); white-space: nowrap;
    transition: transform 0.15s;
  }
  .pill:hover { transform: scale(1.05); }
  .pill.accord {
    border-color: rgba(201,168,76,0.3); color: var(--gold);
    background: var(--gold-dim);
  }
  .note-tag {
    font-size: 12px; padding: 3px 9px; border-radius: 12px;
    background: var(--bg3); border: 1px solid var(--border);
    color: var(--text2); transition: transform 0.15s;
  }
  .note-tag:hover { transform: scale(1.05); }
  .accord-tag {
    font-size: 12px; padding: 4px 10px; border-radius: 12px;
    background: var(--gold-dim); border: 1px solid rgba(201,168,76,0.3);
    color: var(--gold); transition: transform 0.15s;
  }
  .accord-tag:hover { transform: scale(1.05); }
  .card-meta { display: flex; flex-wrap: nowrap; gap: 4px; align-items: center; overflow: hidden; flex-shrink: 0; padding-top: 5px; height: 20px; }
  .flag {
    font-size: 9px; padding: 2px 6px; border-radius: 4px;
    font-weight: 500; letter-spacing: 0.04em;
  }
  .flag.tester    { background: rgba(91,141,238,0.15); color: var(--blue); border: 1px solid rgba(91,141,238,0.3); }
  .flag.disc      { background: rgba(224,85,85,0.15);  color: var(--red);  border: 1px solid rgba(224,85,85,0.3); }
  .flag.limited   { background: rgba(201,168,76,0.15); color: var(--gold); border: 1px solid rgba(201,168,76,0.3); }
  .flag.exclusive { background: rgba(76,174,122,0.15); color: var(--green);border: 1px solid rgba(76,174,122,0.3); }
  .card-check {
    position: absolute; top: 8px; left: 8px;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--gold); display: flex; align-items: center; justify-content: center;
    font-size: 12px; z-index: 2;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .card-corner-icons {
    position: absolute; bottom: 6px; right: 6px;
    display: flex; flex-direction: column; gap: 3px; z-index: 2; align-items: flex-end;
  }
  .card-corner-icon {
    font-size: 13px; line-height: 1;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));
  }
  .card-frag-link {
    position: absolute; bottom: 6px; left: 6px; z-index: 3;
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-style: italic; font-weight: 700;
    font-family: 'Cormorant Garamond', serif;
    cursor: pointer; transition: all 0.15s; color: rgba(255,255,255,0.6);
    text-decoration: none; line-height: 1;
  }
  .card-frag-link:hover { background: rgba(201,168,76,0.5); border-color: var(--gold); color: var(--gold); }
  .card-frag-link.has-link { color: rgba(201,168,76,0.8); border-color: rgba(201,168,76,0.3); }
  .card-frag-link-tip {
    position: absolute; bottom: 32px; left: 6px; z-index: 10;
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: 6px; padding: 6px 10px; font-size: 11px;
    color: var(--text2); white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    pointer-events: none;
  }
  .card-select-overlay {
    position: absolute; inset: 0;
    border: 2px solid var(--gold); border-radius: var(--radius);
    pointer-events: none;
    background: rgba(201,168,76,0.05);
  }

  /* TABLE */
  .table-wrap { overflow-x: auto; }
  table {
    width: 100%; border-collapse: collapse;
    font-size: 13px;
  }
  thead tr { border-bottom: 1px solid var(--border2); }
  th {
    text-align: left; padding: 10px 12px;
    color: var(--text3); font-weight: 400;
    font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
    white-space: nowrap; cursor: pointer;
    user-select: none;
  }
  th:hover { color: var(--text2); }
  tbody tr {
    border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background 0.1s;
  }
  tbody tr:hover { background: var(--bg2); }
  td { padding: 10px 12px; color: var(--text2); vertical-align: middle; }
  td.td-name { color: var(--text); font-weight: 400; }
  td.td-brand { color: var(--text3); font-size: 12px; }
  td input[type=checkbox] { accent-color: var(--gold); width: 15px; height: 15px; cursor: pointer; }

  /* DRAWER */
  .drawer-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    z-index: 200; backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }
  .drawer {
    position: fixed; right: 0; top: 0; bottom: 0;
    width: min(520px, 100vw);
    background: var(--bg2); border-left: 1px solid var(--border);
    z-index: 201; overflow-y: auto;
    animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1);
    display: flex; flex-direction: column;
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  .drawer-hero {
    position: relative; height: 240px;
    background: var(--bg3);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .drawer-hero img {
    height: 85%; width: auto; max-width: 80%;
    object-fit: contain; opacity: 0; transition: opacity 0.4s;
  }
  .drawer-hero img.loaded { opacity: 1; }
  .drawer-hero-placeholder { font-size: 72px; opacity: 0.1; }
  .drawer-hero-overlay {
    position: absolute; bottom: 0; left: 0; right: 0; height: 80px;
    background: linear-gradient(transparent, var(--bg2));
  }
  .drawer-close {
    position: absolute; top: 12px; right: 12px;
    background: rgba(0,0,0,0.5); border: none; border-radius: 50%;
    width: 32px; height: 32px; color: var(--text2); font-size: 18px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: color 0.15s;
  }
  .drawer-close:hover { color: var(--text); }
  .drawer-body { padding: 20px 24px; flex: 1; }
  .drawer-brand {
    font-size: 11px; color: var(--text3); letter-spacing: 0.1em;
    text-transform: uppercase; margin-bottom: 4px;
  }
  .drawer-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px; font-weight: 300; color: var(--text);
    line-height: 1.2; margin-bottom: 12px;
  }
  .drawer-flags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .drawer-meta {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 10px; margin-bottom: 20px;
  }
  .meta-item {
    background: var(--bg3); border-radius: 8px; padding: 10px 14px;
    border: 1px solid var(--border);
  }
  .meta-label { font-size: 10px; color: var(--text3); letter-spacing: 0.08em;
                text-transform: uppercase; margin-bottom: 3px; }
  .meta-value { font-size: 14px; color: var(--text); }
  .section-title {
    font-size: 11px; color: var(--text3); letter-spacing: 0.1em;
    text-transform: uppercase; margin-bottom: 10px; margin-top: 20px;
  }
  .notes-pyramid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
  .notes-row { display: flex; align-items: flex-start; gap: 12px; }
  .notes-label {
    font-size: 10px; color: var(--text3); width: 48px;
    text-transform: uppercase; letter-spacing: 0.07em;
    padding-top: 3px; flex-shrink: 0;
  }
  .notes-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .accord-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .rating-bars { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
  .rating-row { display: flex; align-items: center; gap: 10px; }
  .rating-label { font-size: 12px; color: var(--text3); width: 80px; flex-shrink: 0; }
  .rating-bar-bg {
    flex: 1; height: 4px; background: var(--bg3); border-radius: 2px; overflow: hidden;
  }
  .rating-bar-fill {
    height: 100%; background: var(--gold); border-radius: 2px;
    transition: width 0.5s ease;
  }
  .rating-val { font-size: 12px; color: var(--text2); width: 30px; text-align: right; }
  .drawer-actions {
    display: flex; gap: 8px; padding: 16px 24px;
    border-top: 1px solid var(--border);
    background: var(--bg2); position: sticky; bottom: 0;
  }
  .btn {
    border-radius: 8px; font-size: 13px; font-weight: 500;
    padding: 9px 16px; cursor: pointer; border: none;
    transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .btn-primary { background: var(--gold); color: #0c0c0f; }
  .btn-primary:hover { background: var(--gold2); }
  .btn-secondary {
    background: var(--bg3); color: var(--text3);
    border: 1px solid var(--border);
  }
  .btn-secondary:hover { color: var(--text2); border-color: var(--border2); }
  .btn-danger { background: rgba(224,85,85,0.15); color: var(--red); border: 1px solid rgba(224,85,85,0.3); }
  .btn-danger:hover { background: rgba(224,85,85,0.25); }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  /* EDIT FORM */
  .edit-form { display: flex; flex-direction: column; gap: 14px; }
  .form-group { display: flex; flex-direction: column; gap: 5px; }
  .form-label { font-size: 11px; color: var(--text3); letter-spacing: 0.07em; text-transform: uppercase; }
  .form-input, .form-select, .form-textarea {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); padding: 9px 12px;
    font-size: 14px; font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.15s; width: 100%;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--gold); }
  .form-textarea { resize: vertical; min-height: 80px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .form-check input { accent-color: var(--gold); width: 15px; height: 15px; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    z-index: 300; display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(6px); animation: fadeIn 0.2s ease;
    padding: 20px;
  }
  .modal {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 16px; width: 100%; max-width: 480px;
    box-shadow: var(--shadow);
    animation: modalEnter 0.25s cubic-bezier(0.16,1,0.3,1);
    overflow: hidden;
  }
  @keyframes modalEnter {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .modal-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px; font-weight: 300; color: var(--text);
  }
  .modal-body { padding: 20px 24px; }
  .modal-footer {
    padding: 16px 24px; border-top: 1px solid var(--border);
    display: flex; gap: 8px; justify-content: flex-end;
  }

  /* SUGGEST MODAL */
  .suggest-card {
    background: var(--bg3); border: 1px solid var(--border2);
    border-radius: 12px; padding: 16px; display: flex; gap: 16px;
    align-items: center; margin-bottom: 12px; cursor: pointer;
    transition: all 0.15s;
  }
  .suggest-card:hover { border-color: var(--gold); background: var(--gold-dim); }
  .suggest-card-img {
    width: 64px; height: 64px; background: var(--bg2);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
  }
  .suggest-card-img img { width: 90%; height: 90%; object-fit: contain; }
  .suggest-info { flex: 1; min-width: 0; }
  .suggest-brand { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; }
  .suggest-name { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: var(--text); }
  .suggest-accords { font-size: 12px; color: var(--text2); margin-top: 4px; }
  .weather-chip {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 20px; padding: 6px 14px; font-size: 12px;
    color: var(--text2); display: inline-flex; align-items: center; gap: 6px;
    margin-bottom: 16px;
  }
  .occasion-grid {
    display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 16px;
  }
  .occasion-btn {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px; text-align: center;
    cursor: pointer; transition: all 0.15s; color: var(--text2);
    font-size: 12px; font-family: 'DM Sans', sans-serif;
  }
  .occasion-btn:hover, .occasion-btn.active {
    border-color: var(--gold); color: var(--gold); background: var(--gold-dim);
  }
  .occasion-icon { font-size: 20px; display: block; margin-bottom: 4px; }

  /* SAMPLE CART */
  .cart-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--bg2); border-top: 1px solid var(--border);
    padding: 12px 24px; display: flex; align-items: center; gap: 12px;
    z-index: 150; animation: slideUp 0.2s ease;
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .cart-count {
    background: var(--gold); color: #0c0c0f;
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 600; font-size: 13px; flex-shrink: 0;
  }
  .cart-label { flex: 1; color: var(--text2); font-size: 13px; }
  .cart-clear { background: none; border: none; color: var(--text3); font-size: 12px; cursor: pointer; }
  .cart-clear:hover { color: var(--text2); }

  /* EMPTY STATE */
  .empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 80px 24px; color: var(--text3);
    text-align: center; gap: 12px;
  }
  .empty-icon { font-size: 48px; opacity: 0.3; }
  .empty-text { font-family: 'Cormorant Garamond', serif; font-size: 20px; color: var(--text2); }
  .empty-sub { font-size: 13px; max-width: 300px; line-height: 1.5; }

  /* LOADING */
  .loading {
    display: flex; align-items: center; justify-content: center;
    padding: 60px; color: var(--text3); gap: 10px;
  }
  .spinner {
    width: 20px; height: 20px; border: 2px solid var(--border);
    border-top-color: var(--gold); border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* TOAST */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: var(--bg3); border: 1px solid var(--border2);
    border-radius: 10px; padding: 10px 18px; font-size: 13px;
    color: var(--text); z-index: 500; box-shadow: var(--shadow);
    animation: toastSlide 0.25s cubic-bezier(0.16,1,0.3,1); pointer-events: none;
  }
  @keyframes toastSlide {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* STAR RATING */
  .stars { display: flex; gap: 2px; }
  .star { font-size: 16px; cursor: pointer; transition: transform 0.1s; color: var(--text3); }
  .star.filled { color: var(--gold); }
  .star:hover { transform: scale(1.2); }

  /* WEAR LOG */
  .wear-list { display: flex; flex-direction: column; gap: 6px; }
  .wear-item {
    display: flex; align-items: center; gap: 10px;
    background: var(--bg3); border-radius: 8px; padding: 8px 12px;
  }
  .wear-date { font-size: 13px; color: var(--text2); flex: 1; }
  .wear-del { background: none; border: none; color: var(--text3); cursor: pointer; font-size: 16px; }
  .wear-del:hover { color: var(--red); }

  /* TABS WITHIN DRAWER */
  .drawer-tabs { display: flex; gap: 2px; margin-bottom: 16px; }
  .drawer-tab {
    background: none; border: none; color: var(--text3);
    padding: 6px 12px; border-radius: 6px; cursor: pointer;
    font-size: 12px; font-family: 'DM Sans', sans-serif;
    transition: all 0.15s; letter-spacing: 0.03em;
  }
  .drawer-tab:hover { color: var(--text2); background: var(--bg3); }
  .drawer-tab.active { color: var(--gold); background: var(--gold-dim); }

  /* RESPONSIVE */
  @media (max-width: 640px) {
    .nav-tabs { display: none; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .main { padding: 16px; }
    .drawer { width: 100vw; }
  }
`;

// ── HELPERS ───────────────────────────────────────────────────
const parseArr = (v) => {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || "[]"); } catch { return []; }
};

const imgSrc = (f) => f?.custom_image_url || f?.fragella_image_url || null;

const formatDate = (d) => {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ── LOGO SVG ──────────────────────────────────────────────────
function LogoIcon() {
  return (
    <svg className="nav-logo-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="21" y="3" width="6" height="3" rx="1" fill="#c9a84c"/>
      <rect x="19" y="6" width="10" height="5" rx="1.5" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
      <rect x="16" y="11" width="16" height="3" rx="1" fill="#c9a84c"/>
      <rect x="11" y="14" width="26" height="28" rx="3" fill="none" stroke="#c9a84c" strokeWidth="1.8"/>
      <rect x="14" y="17" width="20" height="22" rx="2" fill="none" stroke="rgba(201,168,76,0.25)" strokeWidth="1"/>
      <line x1="14" y1="30" x2="34" y2="30" stroke="rgba(201,168,76,0.3)" strokeWidth="0.8"/>
    </svg>
  );
}

// ── SKELETON CARD ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-img" />
      <div className="skeleton-body">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line long" />
        <div className="skeleton skeleton-line med" />
      </div>
    </div>
  );
}

// ── ALPHABET NAV ──────────────────────────────────────────────
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

function AlphaNav({ frags, onJump }) {
  const available = new Set(
    frags.map(f => {
      const c = (f.brand || "").charAt(0).toUpperCase();
      return /[A-Z]/.test(c) ? c : "#";
    })
  );

  return (
    <div className="alpha-nav">
      {LETTERS.map(l => (
        <button
          key={l}
          className={`alpha-btn ${available.has(l) ? "" : "disabled"}`}
          onClick={() => available.has(l) && onJump(l)}
          title={available.has(l) ? `Jump to ${l}` : ""}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ── STAR RATING ───────────────────────────────────────────────
function Stars({ value, onChange }) {
  const [hover, setHover] = useState(null);
  return (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <span
          key={i}
          className={`star ${(hover||value)>=i?"filled":""}`}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(null)}
          onClick={() => onChange && onChange(i)}
        >★</span>
      ))}
    </div>
  );
}

// ── FRAGRANCE CARD ────────────────────────────────────────────
function FragCard({ frag, selected, selectMode, onSelect, onClick }) {
  const img = imgSrc(frag);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showLinkTip, setShowLinkTip] = useState(false);

  return (
    <div
      className="card"
      onClick={() => selectMode ? onSelect(frag.id) : onClick(frag)}
    >
      {selected && <div className="card-select-overlay" />}
      {selected && <div className="card-check">✓</div>}
      {selectMode && !selected && (
        <div style={{
          position:"absolute",top:8,left:8,width:22,height:22,
          border:"2px solid var(--border2)",borderRadius:"50%",
          background:"var(--bg2)",zIndex:2
        }}/>
      )}
      <div className="card-img">
        <div className="card-img-inner">
          {img ? (
            <img
              src={img} alt={frag.name}
              className={imgLoaded ? "loaded" : ""}
              onLoad={() => setImgLoaded(true)}
              onError={e => e.target.style.display="none"}
            />
          ) : (
            <span className="card-img-placeholder">🧴</span>
          )}
        </div>
        {(frag.want_to_trade === 1 || frag.want_to_sell === 1 || frag.want_to_give_away === 1) && (
          <div className="card-corner-icons">
            {frag.want_to_trade    === 1 && <span className="card-corner-icon" title="Want to Trade">🤝</span>}
            {frag.want_to_sell     === 1 && <span className="card-corner-icon" title="Want to Sell">💰</span>}
            {frag.want_to_give_away=== 1 && <span className="card-corner-icon" title="Want to Give Away">🎁</span>}
          </div>
        )}
        {frag.fragrantica_url ? (
          <a className="card-frag-link has-link"
            href={frag.fragrantica_url} target="_blank" rel="noreferrer"
            title="View on Fragrantica"
            onClick={e => e.stopPropagation()}>
            F
          </a>
        ) : (
          <>
            <span className="card-frag-link"
              title="No Fragrantica link"
              onClick={e => { e.stopPropagation(); setShowLinkTip(v => !v); }}>
              F
            </span>
            {showLinkTip && (
              <div className="card-frag-link-tip">No Fragrantica link — add one in Edit ✏️</div>
            )}
          </>
        )}
      </div>
      <div className="card-body">
        <div className="card-brand">{frag.brand}</div>
        <div className="card-name">{frag.name}</div>
        <div className="card-meta">
          {frag.is_tester          === 1 && <span className="flag tester">Tester</span>}
          {frag.is_discontinued    === 1 && <span className="flag disc">Disc.</span>}
          {frag.is_limited_edition === 1 && <span className="flag limited">LE</span>}
          {frag.is_exclusive       === 1 && <span className="flag exclusive">Excl.</span>}
          {frag.concentration && <span className="flag" style={{background:"var(--bg3)",color:"var(--text3)",border:"1px solid var(--border)"}}>{frag.concentration}</span>}
          {frag.size_ml && <span className="flag" style={{background:"var(--bg3)",color:"var(--text3)",border:"1px solid var(--border)"}}>{frag.size_ml}ml</span>}
        </div>
      </div>
    </div>
  );
}

// ── TABLE VIEW ────────────────────────────────────────────────
function TableView({ frags, selected, selectMode, onSelect, onClick }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {selectMode && <th style={{width:40}}></th>}
            <th>Brand</th>
            <th>Name</th>
            <th>Conc.</th>
            <th>Size</th>
            <th>Accords</th>
            <th>Flags</th>
            <th>Last Worn</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          {frags.map(f => (
            <tr key={f.id} onClick={() => selectMode ? onSelect(f.id) : onClick(f)}>
              {selectMode && (
                <td><input type="checkbox" checked={selected.has(f.id)} onChange={() => onSelect(f.id)} onClick={e => e.stopPropagation()} /></td>
              )}
              <td className="td-brand">{f.brand}</td>
              <td className="td-name">{f.name}</td>
              <td>{f.concentration || "—"}</td>
              <td>{f.size_ml ? `${f.size_ml}ml` : "—"}</td>
              <td>{parseArr(f.main_accords).slice(0,3).join(", ") || "—"}</td>
              <td>
                <div style={{display:"flex",gap:3}}>
                  {f.is_tester          === 1 && <span className="flag tester">T</span>}
                  {f.is_discontinued    === 1 && <span className="flag disc">D</span>}
                  {f.is_limited_edition === 1 && <span className="flag limited">LE</span>}
                </div>
              </td>
              <td>{formatDate(f.last_worn_date)}</td>
              <td>{f.personal_rating ? <Stars value={f.personal_rating} /> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── DETAIL DRAWER ─────────────────────────────────────────────
function Drawer({ frag, onClose, onUpdate, onDelete, onWear, toast }) {
  const [tab, setTab] = useState("info");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const localToday = () => { const d = new Date(); const off = d.getTimezoneOffset() * 60000; const local = new Date(d.getTime() - off); return local.toISOString().split('T')[0]; };
  const [wearDate, setWearDate] = useState(localToday);
  const [wearLog, setWearLog] = useState([]);
  const [saving, setSaving] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    setHeroLoaded(false);
    setForm({
      brand: frag.brand, name: frag.name,
      concentration: frag.concentration || "",
      size_ml: frag.size_ml || "",
      year_released: frag.year_released || "",
      perfumer: frag.perfumer || "",
      gender_class: frag.gender_class || "",
      personal_rating: frag.personal_rating || "",
      fragrantica_url: frag.fragrantica_url || "",
      custom_image_url: frag.custom_image_url || "",
      personal_notes: frag.personal_notes || "",
      is_discontinued: !!frag.is_discontinued,
      is_tester: !!frag.is_tester,
      is_limited_edition: !!frag.is_limited_edition,
      enrichment_locked: !!frag.enrichment_locked,
      want_to_trade: !!frag.want_to_trade,
      want_to_sell: !!frag.want_to_sell,
      want_to_give_away: !!frag.want_to_give_away,
      top_notes: parseArr(frag.top_notes).join(", "),
      middle_notes: parseArr(frag.middle_notes).join(", "),
      base_notes: parseArr(frag.base_notes).join(", "),
      main_accords: parseArr(frag.main_accords).join(", "),
    });
    fetch(`${API}/fragrances/${frag.id}`).then(r=>r.json()).then(d => {
      setWearLog(d.wear_log || []);
    });
  }, [frag]);

  const save = async () => {
    setSaving(true);
    const payload = { ...form };
    ["top_notes","middle_notes","base_notes","main_accords"].forEach(k => {
      payload[k] = form[k].split(",").map(s=>s.trim()).filter(Boolean);
    });
    ["size_ml","year_released","personal_rating"].forEach(k => {
      payload[k] = payload[k] !== "" && payload[k] !== null && payload[k] !== undefined
        ? parseFloat(payload[k]) || null : null;
    });
    const res = await fetch(`${API}/fragrances/${frag.id}`, {
      method: "PATCH",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setEditing(false);
      toast("Saved ✓");
    }
    setSaving(false);
  };

  const logWear = async () => {
    const res = await fetch(`${API}/wear`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ fragrance_id: frag.id, worn_date: wearDate })
    });
    if (res.ok) {
      const entry = await res.json();
      setWearLog(prev => [entry, ...prev]);
      onWear(frag.id, wearDate);
      toast("Logged ✓");
    } else {
      toast("Error logging wear — check console");
    }
  };

  const delWear = async (id) => {
    await fetch(`${API}/wear/${id}`, { method: "DELETE" });
    setWearLog(prev => prev.filter(w => w.id !== id));
  };

  const confirmDelete = async () => {
    if (!window.confirm(`Remove "${frag.brand} — ${frag.name}" from your collection?`)) return;
    await fetch(`${API}/fragrances/${frag.id}`, { method: "DELETE" });
    onDelete(frag.id);
    onClose();
    toast("Removed");
  };

  const img = imgSrc(frag);
  const top    = parseArr(frag.top_notes);
  const middle = parseArr(frag.middle_notes);
  const base   = parseArr(frag.base_notes);
  const accords= parseArr(frag.main_accords);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-hero">
          {img
            ? <img src={img} alt={frag.name}
                className={heroLoaded ? "loaded" : ""}
                onLoad={() => setHeroLoaded(true)}
                onError={e => e.target.style.display="none"} />
            : <span className="drawer-hero-placeholder">🧴</span>
          }
          <div className="drawer-hero-overlay" />
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          <div className="drawer-brand">{frag.brand}</div>
          <div className="drawer-name">{frag.name}</div>

          <div className="drawer-flags">
            {frag.is_tester          === 1 && <span className="flag tester">Tester</span>}
            {frag.is_discontinued    === 1 && <span className="flag disc">Discontinued</span>}
            {frag.is_limited_edition === 1 && <span className="flag limited">Limited Edition</span>}
            {frag.is_exclusive       === 1 && <span className="flag exclusive">Exclusive</span>}
            {frag.enrichment_locked  === 1 && <span className="flag" style={{background:"rgba(201,168,76,0.15)",color:"var(--gold)",border:"1px solid rgba(201,168,76,0.3)"}}>🔒 Locked</span>}
          </div>

          <div className="drawer-tabs">
            {["info","notes","wear","edit","enrich"].map(t => (
              <button key={t} className={`drawer-tab ${tab===t?"active":""}`}
                onClick={() => { setTab(t); setEditing(t==="edit"); }}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <>
              <div className="drawer-meta">
                {[
                  ["Concentration", frag.concentration],
                  ["Size",          frag.size_ml ? `${frag.size_ml}ml` : null],
                  ["Year",          frag.year_released],
                  ["Gender",        frag.gender_class],
                  ["Perfumer",      frag.perfumer],
                  ["Last Worn",     formatDate(frag.last_worn_date)],
                ].filter(([,v]) => v).map(([label, val]) => (
                  <div key={label} className="meta-item">
                    <div className="meta-label">{label}</div>
                    <div className="meta-value">{val}</div>
                  </div>
                ))}
              </div>

              {frag.personal_rating > 0 && (
                <>
                  <div className="section-title">My Rating</div>
                  <Stars value={frag.personal_rating} />
                </>
              )}

              {(frag.fragrantica_rating || frag.longevity_rating || frag.sillage_rating) && (
                <>
                  <div className="section-title">Community Ratings</div>
                  <div className="rating-bars">
                    {frag.fragrantica_rating > 0 && (
                      <div className="rating-row">
                        <span className="rating-label">Overall</span>
                        <div className="rating-bar-bg">
                          <div className="rating-bar-fill" style={{width:`${(frag.fragrantica_rating/5)*100}%`}} />
                        </div>
                        <span className="rating-val">{frag.fragrantica_rating?.toFixed(1)}</span>
                      </div>
                    )}
                    {frag.longevity_rating > 0 && (
                      <div className="rating-row">
                        <span className="rating-label">Longevity</span>
                        <div className="rating-bar-bg">
                          <div className="rating-bar-fill" style={{width:`${(frag.longevity_rating/5)*100}%`}} />
                        </div>
                        <span className="rating-val">{frag.longevity_rating?.toFixed(1)}</span>
                      </div>
                    )}
                    {frag.sillage_rating > 0 && (
                      <div className="rating-row">
                        <span className="rating-label">Sillage</span>
                        <div className="rating-bar-bg">
                          <div className="rating-bar-fill" style={{width:`${(frag.sillage_rating/5)*100}%`}} />
                        </div>
                        <span className="rating-val">{frag.sillage_rating?.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {frag.personal_notes && (
                <>
                  <div className="section-title">My Notes</div>
                  <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.6}}>{frag.personal_notes}</p>
                </>
              )}

              {accords.length > 0 && (
                <>
                  <div className="section-title">Accords</div>
                  <div className="accord-row">
                    {accords.map(a => <span key={a} className="accord-tag">{a}</span>)}
                  </div>
                </>
              )}
            </>
          )}

          {tab === "notes" && (
            <div className="notes-pyramid">
              {[
                ["Top",    top],
                ["Heart",  middle],
                ["Base",   base],
              ].map(([label, notes]) => notes.length > 0 && (
                <div key={label} className="notes-row">
                  <span className="notes-label">{label}</span>
                  <div className="notes-tags">
                    {notes.map(n => <span key={n} className="note-tag">{n}</span>)}
                  </div>
                </div>
              ))}
              {top.length === 0 && middle.length === 0 && base.length === 0 && (
                <div className="empty">
                  <span className="empty-icon">🌿</span>
                  <span className="empty-text">No notes data</span>
                  <span className="empty-sub">Use the Edit tab to add notes manually or re-enrich.</span>
                </div>
              )}
            </div>
          )}

          {tab === "wear" && (
            <>
              <div className="section-title">Log a Wear</div>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                <input
                  type="date" value={wearDate}
                  onChange={e => setWearDate(e.target.value)}
                  className="form-input" style={{flex:1}}
                />
                <button className="btn btn-primary" onClick={logWear}>Log</button>
              </div>
              <div className="section-title">History ({wearLog.length})</div>
              <div className="wear-list">
                {wearLog.length === 0
                  ? <div style={{color:"var(--text3)",fontSize:13}}>No wears logged yet.</div>
                  : wearLog.map(w => (
                    <div key={w.id} className="wear-item">
                      <span style={{fontSize:14}}>📅</span>
                      <span className="wear-date">{w.worn_date}</span>
                      <button className="wear-del" onClick={() => delWear(w.id)}>×</button>
                    </div>
                  ))
                }
              </div>
            </>
          )}

          {tab === "edit" && (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input className="form-input" value={form.brand||""} onChange={e=>setForm({...form,brand:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Concentration</label>
                  <select className="form-select" value={form.concentration||""} onChange={e=>setForm({...form,concentration:e.target.value})}>
                    <option value="">—</option>
                    {["EdP","EdT","EdC","Extrait","Parfum","Eau Fraîche"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Size (ml)</label>
                  <input className="form-input" type="number" value={form.size_ml||""} onChange={e=>setForm({...form,size_ml:e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Year Released</label>
                  <input className="form-input" type="number" value={form.year_released||""} onChange={e=>setForm({...form,year_released:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={form.gender_class||""} onChange={e=>setForm({...form,gender_class:e.target.value})}>
                    <option value="">—</option>
                    {["Male","Female","Unisex"].map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Perfumer</label>
                <input className="form-input" value={form.perfumer||""} onChange={e=>setForm({...form,perfumer:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Top Notes (comma separated)</label>
                <input className="form-input" value={form.top_notes||""} onChange={e=>setForm({...form,top_notes:e.target.value})} placeholder="Bergamot, Lemon, Pink Pepper" />
              </div>
              <div className="form-group">
                <label className="form-label">Heart Notes</label>
                <input className="form-input" value={form.middle_notes||""} onChange={e=>setForm({...form,middle_notes:e.target.value})} placeholder="Rose, Jasmine, Iris" />
              </div>
              <div className="form-group">
                <label className="form-label">Base Notes</label>
                <input className="form-input" value={form.base_notes||""} onChange={e=>setForm({...form,base_notes:e.target.value})} placeholder="Amber, Musk, Vetiver" />
              </div>
              <div className="form-group">
                <label className="form-label">Accords</label>
                <input className="form-input" value={form.main_accords||""} onChange={e=>setForm({...form,main_accords:e.target.value})} placeholder="woody, amber, citrus" />
              </div>
              <div className="form-group">
                <label className="form-label">Fragrantica URL</label>
                <input className="form-input" value={form.fragrantica_url||""} onChange={e=>setForm({...form,fragrantica_url:e.target.value})} placeholder="https://www.fragrantica.com/..." />
              </div>
              <div className="form-group">
                <label className="form-label">Custom Image URL</label>
                <input className="form-input" value={form.custom_image_url||""} onChange={e=>setForm({...form,custom_image_url:e.target.value})} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">My Rating</label>
                <Stars value={parseInt(form.personal_rating)||0} onChange={v=>setForm({...form,personal_rating:v})} />
              </div>
              <div className="form-group">
                <label className="form-label">Personal Notes</label>
                <textarea className="form-textarea" value={form.personal_notes||""} onChange={e=>setForm({...form,personal_notes:e.target.value})} />
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
                {[
                  ["is_discontinued","Discontinued"],
                  ["is_tester","Tester"],
                  ["is_limited_edition","Limited Edition"],
                  ["enrichment_locked","Lock Enrichment 🔒"],
                  ["want_to_trade","🤝 Want to Trade"],
                  ["want_to_sell","💰 Want to Sell"],
                  ["want_to_give_away","🎁 Want to Give Away"],
                ].map(([k,label])=>(
                  <label key={k} className="form-check">
                    <input type="checkbox" checked={!!form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})} />
                    <span style={{fontSize:13,color:"var(--text2)"}}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === "enrich" && (
            <EnrichPanel
              frag={frag}
              API={API}
              toast={toast}
              onUpdate={onUpdate}
            />
          )}
        </div>

        <div className="drawer-actions">
          {tab === "edit"
            ? <>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button className="btn btn-secondary" onClick={() => { setTab("info"); setEditing(false); }}>Cancel</button>
                <button className="btn btn-danger btn-sm" style={{marginLeft:"auto"}} onClick={confirmDelete}>Remove</button>
              </>
            : <>
                <button className="btn btn-secondary" onClick={() => { setTab("edit"); setEditing(true); }}>Edit</button>
                <button className="btn btn-secondary" onClick={() => setTab("wear")}>Log Wear</button>
                <button className="btn btn-secondary btn-sm" style={{marginLeft:"auto"}} onClick={onClose}>Close</button>
              </>
          }
        </div>
      </div>
    </>
  );
}

// ── SUGGEST MODAL ─────────────────────────────────────────────
function SuggestModal({ onClose, toast }) {
  const [occasion, setOccasion] = useState(null);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [loc, setLoc]           = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    });
  }, []);

  const suggest = async (occ) => {
    setOccasion(occ);
    setLoading(true);
    const params = new URLSearchParams({ occasion: occ });
    if (loc) { params.set("lat", loc.lat); params.set("lon", loc.lon); }
    const res = await fetch(`${API}/suggest?${params}`);
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const occasions = [
    { id:"casual",  label:"Casual",    icon:"👕" },
    { id:"work",    label:"Work",      icon:"💼" },
    { id:"evening", label:"Evening",   icon:"🌙" },
    { id:"date",    label:"Date",      icon:"❤️" },
    { id:"gym",     label:"Gym",       icon:"💪" },
    { id:"special", label:"Special",   icon:"✨" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">What should I wear?</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!result ? (
            <>
              {loc && <div className="weather-chip">📍 Location detected — checking weather...</div>}
              <div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>What are you doing today?</div>
              <div className="occasion-grid">
                {occasions.map(o => (
                  <button key={o.id} className={`occasion-btn ${occasion===o.id?"active":""}`}
                    onClick={() => suggest(o.id)} disabled={loading}>
                    <span className="occasion-icon">{o.icon}</span>
                    {o.label}
                  </button>
                ))}
              </div>
              {loading && <div className="loading"><div className="spinner" /> Finding your perfect match...</div>}
            </>
          ) : (
            <>
              {result.weather?.temp_f && (
                <div className="weather-chip">🌡️ {Math.round(result.weather.temp_f)}°F · {result.season || ""}</div>
              )}
              {result.suggestion && (
                <>
                  <div style={{fontSize:11,color:"var(--text3)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Suggested</div>
                  <div className="suggest-card" onClick={onClose}>
                    <div className="suggest-card-img">
                      {imgSrc(result.suggestion)
                        ? <img src={imgSrc(result.suggestion)} alt="" />
                        : <span style={{fontSize:28}}>🧴</span>}
                    </div>
                    <div className="suggest-info">
                      <div className="suggest-brand">{result.suggestion.brand}</div>
                      <div className="suggest-name">{result.suggestion.name}</div>
                      <div className="suggest-accords">{parseArr(result.suggestion.main_accords).slice(0,3).join(" · ")}</div>
                    </div>
                  </div>
                </>
              )}
              {result.alternates?.length > 0 && (
                <>
                  <div style={{fontSize:11,color:"var(--text3)",letterSpacing:"0.08em",textTransform:"uppercase",margin:"16px 0 8px"}}>Alternates</div>
                  {result.alternates.map(f => (
                    <div key={f.id} className="suggest-card" style={{opacity:0.7}}>
                      <div className="suggest-card-img">
                        {imgSrc(f) ? <img src={imgSrc(f)} alt="" /> : <span style={{fontSize:20}}>🧴</span>}
                      </div>
                      <div className="suggest-info">
                        <div className="suggest-brand">{f.brand}</div>
                        <div className="suggest-name">{f.name}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <button className="btn btn-secondary" style={{width:"100%",marginTop:12}}
                onClick={() => { setResult(null); setOccasion(null); }}>Try Again</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ADD FRAGRANCE MODAL ───────────────────────────────────────
function AddModal({ onClose, onAdd, toast }) {
  const [form, setForm] = useState({ brand:"", name:"", size_ml:"", concentration:"", personal_notes:"" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.brand || !form.name) return;
    setSaving(true);
    const res = await fetch(`${API}/fragrances`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ ...form, size_ml: form.size_ml ? parseFloat(form.size_ml) : null })
    });
    if (res.ok) {
      const frag = await res.json();
      onAdd(frag);
      toast("Added to collection ✓");
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add Fragrance</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="edit-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Brand *</label>
                <input className="form-input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Concentration</label>
                <select className="form-select" value={form.concentration} onChange={e=>setForm({...form,concentration:e.target.value})}>
                  <option value="">—</option>
                  {["EdP","EdT","EdC","Extrait","Parfum","Eau Fraîche"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Size (ml)</label>
                <input className="form-input" type="number" value={form.size_ml} onChange={e=>setForm({...form,size_ml:e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.personal_notes} onChange={e=>setForm({...form,personal_notes:e.target.value})} placeholder="Optional personal notes..." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !form.brand || !form.name}>
            {saving ? "Adding…" : "Add to Collection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function Olfactori() {
  const [tab, setTab]         = useState("collection");
  const [frags, setFrags]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView]       = useState("grid");
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [shelfSelectMode, setShelfSelectMode] = useState(false);
  const [shelfSelected, setShelfSelected] = useState(new Set());
  const [shelfSelectCallback, setShelfSelectCallback] = useState(null);
  const [activeFrag, setActiveFrag] = useState(null);
  const [showAdd, setShowAdd]  = useState(false);
  const [toast, setToastMsg]   = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const searchTimer = useRef(null);
  const cardRefs = useRef({});

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const loadFragrances = useCallback(async (q = search, f = filters) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 500 });
    if (q) params.set("search", q);
    if (f.gender) params.set("gender", f.gender);
    if (f.concentration) params.set("concentration", f.concentration);
    if (f.accord) params.set("accord", f.accord);
    if (f.discontinued) params.set("discontinued", "true");
    if (f.tester) params.set("tester", "true");
    if (f.decade != null) params.set("decade", f.decade);
    if (f.perfumer) params.set("perfumer", f.perfumer);
    if (f.min_rating != null) params.set("min_rating", f.min_rating);
    if (f.size_bucket) params.set("size_bucket", f.size_bucket);
    if (f.want_to_trade)     params.set("want_to_trade", "true");
    if (f.want_to_sell)      params.set("want_to_sell", "true");
    if (f.want_to_give_away) params.set("want_to_give_away", "true");
    const res = await fetch(`${API}/fragrances?${params}`);
    const data = await res.json();
    setFrags(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, filters]);

  useEffect(() => { loadFragrances(); }, []);

  useEffect(() => {
    fetch(`${API}/friends/requests/pending_count`)
      .then(r => r.json())
      .then(d => setPendingRequests(d.pending || 0))
      .catch(() => {});
  }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadFragrances(val, filters), 300);
  };

  const handleFilter = (key, val) => {
    const newFilters = { ...filters, [key]: val || undefined };
    setFilters(newFilters);
    loadFragrances(search, newFilters);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const updateFrag = (updated) => {
    setFrags(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (activeFrag?.id === updated.id) setActiveFrag(updated);
  };

  const deleteFrag = (id) => {
    setFrags(prev => prev.filter(f => f.id !== id));
    setTotal(t => t - 1);
  };

  const addFrag = (frag) => {
    setFrags(prev => [frag, ...prev]);
    setTotal(t => t + 1);
  };

  const updateLastWorn = (fragId, date) => {
    setFrags(prev => prev.map(f =>
      f.id === fragId ? { ...f, last_worn_date: date } : f
    ));
  };

  const handleNoteFilter = (note) => {
    setSearch(note);
    setFilters({});
    setTab("collection");
    loadFragrances(note, {});
  };

  const handleOpenFrag = (frag) => {
    setActiveFrag(frag);
    // don't switch tab — drawer renders on top of current tab
  };

  // Alphabet jump
  const jumpToLetter = (letter) => {
    const target = frags.find(f => {
      const c = (f.brand || "").charAt(0).toUpperCase();
      return letter === "#" ? !/[A-Z]/.test(c) : c === letter;
    });
    if (target && cardRefs.current[target.id]) {
      cardRefs.current[target.id].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const tabs = [
    { id:"collection",  label:"Collection"  },
    { id:"insights",    label:"Insights"    },
    { id:"explore",     label:"Explore"     },
    { id:"wishlist",    label:"Wishlist"    },
    { id:"wardrobe",    label:"Wardrobe"    },
    { id:"shelves",     label:"Shelves"     },
    { id:"notes",       label:"Notes"       },
    { id:"usedtohave",  label:"Used to Have"},
    { id:"admin",       label:"Admin"       },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <LogoIcon /><span style={{letterSpacing:"0.04em"}}>Olf<i>actori</i></span>
          </div>
          <div className="nav-tabs">
            {tabs.map(t => (
              <button key={t.id} className={`nav-tab ${tab===t.id?"active":""}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="nav-right">
            <button className="icon-btn" title="Add fragrance" onClick={() => setShowAdd(true)}>＋</button>
            <button className="icon-btn" title="Sample requests" style={{position:"relative"}} onClick={() => setTab("admin")}>
              📬
              {pendingRequests > 0 && <span className="badge">{pendingRequests}</span>}
            </button>
            <button className="icon-btn" title="Print catalog"
              onClick={() => window.open(`${API}/export/catalog`, "_blank")}>
              🖨️
            </button>
          </div>
        </nav>

        {/* MAIN */}
        <main className="main">
          {tab === "collection" && (
            <>
              {/* TOOLBAR */}
              <div className="toolbar">
                <div className="search-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    className="search-input"
                    placeholder="Search brand or name..."
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                  />
                </div>

                <select className="filter-select" onChange={e => handleFilter("accord", e.target.value)}>
                  <option value="">All Accords</option>
                  {["woody","citrus","floral","oriental","fresh","gourmand","spicy","amber","oud","leather","aquatic","green"].map(a=><option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
                </select>

                <select className="filter-select" onChange={e => handleFilter("discontinued", e.target.value)}>
                  <option value="">All Status</option>
                  <option value="true">Discontinued</option>
                </select>

                {/* Filters toggle button */}
                {(() => {
                  const advancedCount = [
                    filters.gender, filters.concentration, filters.decade != null ? "x" : null,
                    filters.perfumer, filters.min_rating != null ? "x" : null, filters.size_bucket
                  ].filter(Boolean).length;
                  return (
                    <button
                      className="filter-select"
                      style={{cursor:"pointer", display:"flex", alignItems:"center", gap:4,
                        borderColor: showFilters || advancedCount > 0 ? "rgba(201,168,76,0.4)" : undefined,
                        color: showFilters || advancedCount > 0 ? "var(--gold)" : undefined }}
                      onClick={() => setShowFilters(v => !v)}
                    >
                      Filters {showFilters ? "▲" : "▼"}
                      {advancedCount > 0 && <span className="filter-badge">{advancedCount}</span>}
                    </button>
                  );
                })()}

                <div className="view-toggle">
                  <button className={`view-btn ${view==="grid"?"active":""}`} onClick={() => setView("grid")}>⊞</button>
                  <button className={`view-btn ${view==="table"?"active":""}`} onClick={() => setView("table")}>≡</button>
                </div>

                <button
                  className={`icon-btn ${selectMode?"active":""}`}
                  title="Sample select mode"
                  onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); setShelfSelectMode(false); setShelfSelected(new Set()); }}
                  style={selectMode ? {borderColor:"var(--gold)",color:"var(--gold)"} : {}}
                >☑</button>

                <button
                  className={`icon-btn ${shelfSelectMode?"active":""}`}
                  title="Add to shelf"
                  onClick={() => { setShelfSelectMode(!shelfSelectMode); setShelfSelected(new Set()); setSelectMode(false); setSelected(new Set()); }}
                  style={shelfSelectMode ? {borderColor:"var(--gold)",color:"var(--gold)",background:"var(--gold-dim)"} : {}}
                >🗄</button>

                <span className="count-badge">{frags.length} / {total}</span>
              </div>

              {/* FILTER PANEL */}
              {showFilters && (
                <div className="filter-panel">
                  {/* Gender */}
                  <div className="filter-group">
                    <label>Gender</label>
                    <select className="filter-select" value={filters.gender||""} onChange={e => handleFilter("gender", e.target.value)}>
                      <option value="">All</option>
                      {["Male","Female","Unisex"].map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>

                  {/* Concentration */}
                  <div className="filter-group">
                    <label>Type</label>
                    <select className="filter-select" value={filters.concentration||""} onChange={e => handleFilter("concentration", e.target.value)}>
                      <option value="">All</option>
                      {["EdP","EdT","EdC","Extrait","Parfum"].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Size */}
                  <div className="filter-group">
                    <label>Size</label>
                    <select className="filter-select" value={filters.size_bucket||""} onChange={e => handleFilter("size_bucket", e.target.value)}>
                      <option value="">All</option>
                      <option value="travel">Travel (≤30ml)</option>
                      <option value="small">Small (31–75ml)</option>
                      <option value="medium">Medium (76–100ml)</option>
                      <option value="large">Large (100ml+)</option>
                    </select>
                  </div>

                  {/* Decade */}
                  <div className="filter-group">
                    <label>Decade</label>
                    <div className="decade-pills">
                      {[1960,1970,1980,1990,2000,2010,2020].map(d => (
                        <button key={d}
                          className={`decade-pill ${filters.decade===d?"active":""}`}
                          onClick={() => handleFilter("decade", filters.decade===d ? null : d)}>
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Perfumer */}
                  <div className="filter-group">
                    <label>Perfumer</label>
                    <input className="filter-select" style={{minWidth:140}}
                      placeholder="e.g. Roja Dove"
                      value={filters.perfumer||""}
                      onChange={e => {
                        clearTimeout(window._perfumerTimer);
                        const val = e.target.value;
                        setFilters(f => ({...f, perfumer: val||undefined}));
                        window._perfumerTimer = setTimeout(() => {
                          const nf = {...filters, perfumer: val||undefined};
                          loadFragrances(search, nf);
                        }, 400);
                      }}
                    />
                  </div>

                  {/* Personal Rating */}
                  <div className="filter-group">
                    <label>Min Rating</label>
                    <div className="rating-stars">
                      {[1,2,3,4,5].map(s => (
                        <span key={s}
                          className={`rating-star ${filters.min_rating >= s ? "active" : ""}`}
                          onClick={() => handleFilter("min_rating", filters.min_rating===s ? null : s)}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="filter-group">
                    <label>Availability</label>
                    <div style={{display:"flex",flexDirection:"column",gap:5}}>
                      {[
                        ["want_to_trade",     "🤝 Want to Trade"],
                        ["want_to_sell",      "💰 Want to Sell"],
                        ["want_to_give_away", "🎁 Want to Give Away"],
                      ].map(([key, label]) => (
                        <label key={key} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text2)",cursor:"pointer"}}>
                          <input type="checkbox"
                            checked={!!filters[key]}
                            onChange={e => handleFilter(key, e.target.checked ? "true" : "")}
                            style={{accentColor:"var(--gold)"}}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Clear all */}
                  <div className="filter-group" style={{justifyContent:"flex-end"}}>
                    <button className="filter-clear" onClick={() => {
                      setFilters({});
                      loadFragrances(search, {});
                    }}>Clear all filters</button>
                  </div>
                </div>
              )}

              {/* SHELF SELECT ACTION BAR */}
              {shelfSelectMode && (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",marginBottom:4,borderBottom:"1px solid var(--border)",flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:"var(--gold)"}}>🗄 Shelf mode — {shelfSelected.size} selected</span>
                  <button
                    style={{background:"none",border:"1px solid var(--border)",borderRadius:8,color:"var(--text3)",padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}}
                    onClick={() => {
                      const allIds = frags.map(f => f.id);
                      const allSelected = allIds.every(id => shelfSelected.has(id));
                      if (allSelected) {
                        setShelfSelected(new Set());
                      } else {
                        setShelfSelected(new Set(allIds));
                      }
                    }}
                  >{frags.every(f => shelfSelected.has(f.id)) && frags.length > 0 ? "Deselect All" : "Select All"}</button>
                  <button
                    style={{marginLeft:"auto",background:"var(--gold)",border:"none",borderRadius:8,color:"#0c0c0f",padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
                    disabled={shelfSelected.size === 0}
                    onClick={() => {
                      if (shelfSelectCallback) shelfSelectCallback([...shelfSelected]);
                      else { setTab("shelves"); }
                      setShelfSelectMode(false); setShelfSelected(new Set());
                    }}
                  >Add to Shelf →</button>
                  <button
                    style={{background:"none",border:"1px solid var(--border)",borderRadius:8,color:"var(--text3)",padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
                    onClick={() => { setShelfSelectMode(false); setShelfSelected(new Set()); }}
                  >Cancel</button>
                </div>
              )}

              {/* ALPHABET NAV — only in grid view, not while loading */}
              {!loading && view === "grid" && frags.length > 0 && (
                <AlphaNav frags={frags} onJump={jumpToLetter} />
              )}

              {/* CONTENT */}
              {loading ? (
                <div className="grid">
                  {Array.from({length: 12}).map((_,i) => <SkeletonCard key={i} />)}
                </div>
              ) : frags.length === 0 ? (
                <div className="empty">
                  <span className="empty-icon">🧴</span>
                  <span className="empty-text">No fragrances found</span>
                  <span className="empty-sub">Try adjusting your search or filters.</span>
                </div>
              ) : view === "grid" ? (
                <div className="grid">
                  {frags.map(f => (
                    <div key={f.id} ref={el => cardRefs.current[f.id] = el}>
                      <FragCard
                        frag={f}
                        selected={selectMode ? selected.has(f.id) : shelfSelectMode ? shelfSelected.has(f.id) : false}
                        selectMode={selectMode || shelfSelectMode}
                        onSelect={selectMode ? toggleSelect : (id) => {
                          setShelfSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
                        }}
                        onClick={setActiveFrag}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <TableView
                  frags={frags}
                  selected={selectMode ? selected : shelfSelectMode ? shelfSelected : new Set()}
                  selectMode={selectMode || shelfSelectMode}
                  onSelect={selectMode ? toggleSelect : (id) => {
                    setShelfSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
                  }}
                  onClick={setActiveFrag}
                />
              )}
            </>
          )}

          {tab === "insights" && <InsightsTab />}
          {tab === "explore"  && <ExploreTab onNoteFilter={handleNoteFilter} onOpenFrag={handleOpenFrag} />}
          {tab === "wishlist" && <WishlistTab toast={showToast} />}

          {tab === "wardrobe" && <WardrobeTab onOpenFrag={handleOpenFrag} />}

          {tab === "shelves" && (
            <ShelvesTab
              toast={showToast}
              onPickFragrances={(cb) => {
                setShelfSelectCallback(() => cb);
                setShelfSelectMode(true);
                setShelfSelected(new Set());
                setTab("collection");
              }}
            />
          )}

          {tab === "notes" && (
            <NotesTab onOpenFrag={handleOpenFrag} />
          )}
          {tab === "usedtohave" && <UsedToHaveTab toast={showToast} />}

          {tab === "admin" && <AdminTab toast={showToast} />}
        </main>

        {/* DETAIL DRAWER */}
        {activeFrag && (
          <Drawer
            frag={activeFrag}
            onClose={() => setActiveFrag(null)}
            onUpdate={updateFrag}
            onDelete={deleteFrag}
            onMarkGone={markAsGone}
            onWear={updateLastWorn}
            toast={showToast}
          />
        )}

        {/* ADD MODAL */}
        {showAdd && (
          <AddModal onClose={() => setShowAdd(false)} onAdd={addFrag} toast={showToast} />
        )}

        {/* SAMPLE CART BAR */}
        {selectMode && selected.size > 0 && (
          <div className="cart-bar">
            <div className="cart-count">{selected.size}</div>
            <div className="cart-label">
              {selected.size} fragrance{selected.size>1?"s":""} selected for sample request
            </div>
            <button className="btn btn-primary btn-sm">Request Samples</button>
            <button className="cart-clear" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {/* TOAST */}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}
