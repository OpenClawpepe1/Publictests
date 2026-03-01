import { useState, useEffect, useRef, useCallback } from "react";
import {
  isFirebaseConfigured, subscribeCharacters, subscribeSessions, subscribeSettings,
  saveCharacter as fbSaveCharacter, deleteCharacter as fbDeleteCharacter,
  saveSession as fbSaveSession, deleteSession as fbDeleteSession,
  updateSettings, uploadAvatar, uploadCharacterSheet, deleteFile,
} from "./lib/firebase";

import mapImg from "./map.jpg";

// ═══════════════════════════════════════════════════════
// THEME & CONSTANTS
// ═══════════════════════════════════════════════════════

const T = {
  bg: "#0d0b08", surface: "#1a1611", surfaceLight: "#241f18",
  border: "#3d3425", borderGold: "#8b7441",
  gold: "#c9a84c", goldBright: "#e8c85a", goldDim: "#7a6530",
  text: "#d4c5a9", textDim: "#8c7e65", textBright: "#f0e6d0",
  red: "#9c3a3a", redBright: "#c45050",
  green: "#4a7c4a", greenBright: "#5fa05f",
  blue: "#3a5a8c", blueBright: "#5080b8",
};

const LOCATIONS = [
  { id: "neverwinter", name: "Neverwinter", type: "city", x: 13, y: 38, desc: "Città di partenza. Stabile ma piena di rifugiati e tensioni." },
  { id: "thundertree", name: "Thundertree", type: "ruins", x: 32, y: 30, desc: "Rovine avvolte nella vegetazione. Presenze draconiche segnalate." },
  { id: "mount_hotenow", name: "Mount Hotenow", type: "peak", x: 25, y: 19, desc: "Vulcano dormiente nelle Neverwinter Wood." },
  { id: "cragmaw_castle", name: "Cragmaw Castle", type: "ruins", x: 44, y: 41, desc: "Fortezza dei goblin Cragmaw. Luogo di prigionia." },
  { id: "cragmaw_hideout", name: "Cragmaw Hideout", type: "poi", x: 37, y: 53, desc: "Covo goblin lungo la strada per Phandalin." },
  { id: "phandalin", name: "Phandalin", type: "town", x: 35, y: 67, desc: "Piccola cittadina mineraria. Base operativa dell'avventura." },
  { id: "wave_echo", name: "Wave Echo Cave", type: "poi", x: 50, y: 63, desc: "Antica miniera dei nani. Fonte di potere magico." },
  { id: "leilon", name: "Leilon", type: "ruins", x: 32, y: 80, desc: "Cittadina in rovina lungo la High Road." },
  { id: "agatha_lair", name: "Agatha's Lair", type: "poi", x: 63, y: 32, desc: "Dimora dello spirito Agatha nella foresta." },
  { id: "conyberry", name: "Conyberry", type: "ruins", x: 74, y: 30, desc: "Villaggio abbandonato lungo il Triboar Trail." },
  { id: "old_owl_well", name: "Old Owl Well", type: "ruins", x: 77, y: 43, desc: "Antiche rovine. Attività necromantiche segnalate." },
  { id: "wyvern_tor", name: "Wyvern Tor", type: "poi", x: 85, y: 51, desc: "Formazione rocciosa. Tana di orchi." },
  { id: "icespire_peak", name: "Icespire Peak", type: "peak", x: 68, y: 56, desc: "Picco ghiacciato nelle Sword Mountains." },
  { id: "the_crags", name: "The Crags", type: "region", x: 48, y: 7, desc: "Terreno accidentato a nord delle Neverwinter Wood." },
  { id: "starmetal_hills", name: "Starmetal Hills", type: "region", x: 86, y: 10, desc: "Colline note per meteoriti e metalli rari." },
];

const CLASSES = ["Barbaro", "Bardo", "Chierico", "Druido", "Guerriero", "Ladro", "Mago", "Monaco", "Paladino", "Ranger", "Stregone", "Warlock"];
const SPECIES = ["Aasimar", "Dragonborn", "Elfo", "Gnomo", "Halfling", "Mezzelfo", "Mezzorco", "Nano", "Tiefling", "Umano"];
const CLASS_COLORS = {
  Paladino: "#e8c85a", Guerriero: "#c45050", Mago: "#5080b8", Ladro: "#8c7e65",
  Chierico: "#f0e6d0", Bardo: "#9a6abf", Barbaro: "#c45050", Druido: "#5fa05f",
  Monaco: "#d4a76a", Ranger: "#5fa05f", Stregone: "#9a6abf", Warlock: "#7a4a8c",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=MedievalSharp&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:${T.bg};font-family:'Crimson Text',serif;color:${T.text}}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:${T.bg}}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
::selection{background:${T.gold}44;color:${T.textBright}}
input:focus,textarea:focus,select:focus{border-color:${T.goldDim}!important;outline:none}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fi{animation:fadeIn .3s ease-out}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:.15}}
@media(max-width:900px){.g2{grid-template-columns:1fr!important}}
@media(max-width:600px){.tnav{overflow-x:auto;flex-wrap:nowrap}.tnav button{font-size:11px!important;padding:8px 10px!important;white-space:nowrap}}
`;

// ─── Shared Styles ───
const iS = {
  width: "100%", padding: "8px 12px", background: T.bg,
  border: `1px solid ${T.border}`, borderRadius: "6px",
  color: T.textBright, fontSize: "14px", fontFamily: "'Crimson Text',serif",
  outline: "none", boxSizing: "border-box",
};
const bP = {
  display: "inline-flex", alignItems: "center", gap: "6px",
  background: `linear-gradient(135deg,${T.goldDim},${T.gold})`,
  color: T.bg, border: "none", borderRadius: "6px",
  padding: "10px 20px", fontSize: "14px", fontWeight: 700,
  fontFamily: "'Cinzel',serif", cursor: "pointer", letterSpacing: "0.5px",
};
const bS = {
  background: "none", color: T.textDim, border: `1px solid ${T.border}`,
  borderRadius: "6px", padding: "10px 20px", fontSize: "14px",
  fontFamily: "'Cinzel',serif", cursor: "pointer",
};

// ═══════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════
const I = {
  Map: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Book: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Swords: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/><path d="M9.5 6.5L21 18v3h-3L6.5 9.5"/><path d="M11 5l-6 6"/><path d="M8 8L4 4"/><path d="M5 3L3 5"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Save: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Zap: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Shield: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Crown: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h20"/><path d="M4 20l1.5-12L9 12l3-8 3 8 3.5-4L20 20"/></svg>,
  Dice: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>,
  Pin: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>,
  Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  File: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Camera: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Sync: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

// ═══════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════

function FormField({ label, value, onChange, type = "text", multiline, placeholder }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
      {multiline ? (
        <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} style={{ ...iS, resize: "vertical" }} />
      ) : (
        <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={iS} />
      )}
    </div>
  );
}

function FormSelect({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
      <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...iS, cursor: "pointer" }}>
        <option value="">— Seleziona —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: `${color}15`, border: `1px solid ${color}33`, borderRadius: "12px", padding: "3px 10px", fontSize: "12px", color }}>
      <span style={{ fontSize: "10px", opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  );
}

function Spinner({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>;
}

function Toast({ message, type }) {
  if (!message) return null;
  const bg = type === "error" ? T.redBright : T.greenBright;
  return (
    <div className="fi" style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 2000,
      background: bg, color: "#fff", padding: "12px 20px", borderRadius: "8px",
      fontFamily: "'Cinzel',serif", fontSize: "13px", fontWeight: 600,
      boxShadow: "0 4px 20px rgba(0,0,0,.5)",
    }}>{message}</div>
  );
}

// ═══════════════════════════════════════════════════════
// AVATAR COMPONENT
// ═══════════════════════════════════════════════════════

function AvatarDisplay({ char, size = 48, editable, onUpload }) {
  const fileRef = useRef(null);
  const accent = CLASS_COLORS[char.class] || T.gold;
  const initials = (char.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    await onUpload(char.id, file);
  };

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {char.avatarUrl ? (
        <img src={char.avatarUrl} alt={char.name}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${accent}55` }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: "50%",
          background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
          border: `2px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: size * 0.35, color: accent,
        }}>{initials}</div>
      )}
      {editable && (
        <>
          <button onClick={() => fileRef.current?.click()} style={{
            position: "absolute", bottom: -2, right: -2,
            width: 22, height: 22, borderRadius: "50%",
            background: T.gold, border: `2px solid ${T.bg}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0,
          }}>
            <I.Camera />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHARACTER SHEET MANAGER
// ═══════════════════════════════════════════════════════

function SheetManager({ char, onUpdate }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const sheets = char.sheets || [];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) { alert("Formati accettati: PDF, PNG, JPG"); return; }
    if (file.size > 10 * 1024 * 1024) { alert("Max 10MB per file"); return; }

    setUploading(true);
    try {
      const sheet = await uploadCharacterSheet(char.id, file);
      const updated = [...sheets, sheet];
      await fbSaveCharacter({ ...char, sheets: updated });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      alert("Errore durante l'upload: " + err.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (idx) => {
    const sheet = sheets[idx];
    try {
      if (sheet.path) await deleteFile(sheet.path);
    } catch (e) { /* file might already be deleted */ }
    const updated = sheets.filter((_, i) => i !== idx);
    await fbSaveCharacter({ ...char, sheets: updated });
  };

  return (
    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "11px", color: T.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>Schede Personaggio</span>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: "4px", padding: "3px 8px", cursor: "pointer", color: T.gold, fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
          {uploading ? <Spinner size={12} /> : <I.Upload />} Upload
        </button>
        <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleUpload} style={{ display: "none" }} />
      </div>

      {sheets.length === 0 && (
        <div style={{ fontSize: "12px", color: T.textDim, fontStyle: "italic", padding: "6px 0" }}>Nessuna scheda caricata</div>
      )}

      {sheets.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 8px", background: T.bg, borderRadius: "4px",
          marginBottom: "4px", border: `1px solid ${T.border}`,
        }}>
          <I.File />
          <span style={{ flex: 1, fontSize: "12px", color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
          <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: T.blueBright, cursor: "pointer", padding: "2px" }}><I.Eye /></a>
          <a href={s.url} download style={{ color: T.greenBright, cursor: "pointer", padding: "2px" }}><I.Download /></a>
          <button onClick={() => handleDelete(i)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: "2px" }}><I.Trash /></button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHARACTER CARD
// ═══════════════════════════════════════════════════════

function CharacterCard({ char, onEdit, onDelete, onAvatarUpload, compact }) {
  const accent = CLASS_COLORS[char.class] || T.gold;

  if (compact) {
    return (
      <div style={{
        background: T.surfaceLight, border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${accent}`, borderRadius: "6px",
        padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px",
      }}>
        <AvatarDisplay char={char} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, color: T.textBright, fontSize: "13px" }}>{char.name}</div>
          <div style={{ fontSize: "11px", color: T.textDim }}>{char.species} {char.class} Lv.{char.level}</div>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
          <span style={{ color: T.redBright, fontSize: "12px", fontWeight: 600 }}>♥ {char.hp}/{char.maxHp}</span>
          <span style={{ color: T.blueBright, fontSize: "12px" }}>CA {char.ac}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fi" style={{
      background: `linear-gradient(135deg,${T.surfaceLight},${T.surface})`,
      border: `1px solid ${T.border}`, borderTop: `3px solid ${accent}`,
      borderRadius: "8px", padding: "20px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: `radial-gradient(circle at top right,${accent}10,transparent)` }} />

      {/* Header with avatar */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
        <AvatarDisplay char={char} size={56} editable onUpload={onAvatarUpload} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: "18px", color: T.textBright }}>{char.name}</div>
              <div style={{ fontSize: "13px", color: accent, fontFamily: "'Crimson Text',serif", fontStyle: "italic" }}>
                {char.species} — {char.class} Lv.{char.level}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => onEdit(char)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: "4px", padding: "4px 6px", cursor: "pointer", color: T.textDim }}><I.Edit /></button>
              <button onClick={() => onDelete(char.id)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: "4px", padding: "4px 6px", cursor: "pointer", color: T.red }}><I.Trash /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        {char.isDM ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: `${T.gold}20`, border: `1px solid ${T.goldDim}`, borderRadius: "12px", padding: "3px 10px", fontSize: "11px", color: T.gold, fontWeight: 600 }}>
            <I.Crown /> DUNGEON MASTER
          </span>
        ) : (
          <>
            <StatBadge label="HP" value={`${char.hp}/${char.maxHp}`} color={T.redBright} />
            <StatBadge label="CA" value={char.ac} color={T.blueBright} />
            <StatBadge label="Init" value={char.initiative || "+0"} color={T.gold} />
          </>
        )}
      </div>

      {char.player && <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "6px" }}>Giocatore: <span style={{ color: T.text }}>{char.player}</span></div>}

      {/* Stats grid */}
      {!char.isDM && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "4px", marginBottom: "12px" }}>
          {["FOR", "DES", "COS", "INT", "SAG", "CAR"].map((stat, i) => (
            <div key={stat} style={{ textAlign: "center", background: T.bg, borderRadius: "4px", padding: "6px 2px", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: "9px", color: T.textDim, fontWeight: 600, letterSpacing: "1px" }}>{stat}</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: T.textBright, fontFamily: "'Cinzel',serif" }}>{char.stats?.[i] ?? "—"}</div>
              <div style={{ fontSize: "10px", color: T.goldDim }}>{char.stats?.[i] ? (char.stats[i] >= 10 ? "+" : "") + Math.floor((char.stats[i] - 10) / 2) : ""}</div>
            </div>
          ))}
        </div>
      )}

      {char.deity && <div style={{ fontSize: "12px", color: T.text, marginBottom: "4px" }}>Divinità: <span style={{ color: accent, fontWeight: 600 }}>{char.deity}</span></div>}
      {char.background && <div style={{ fontSize: "12px", color: T.text, marginBottom: "4px" }}>Background: <span style={{ color: T.textDim }}>{char.background}</span></div>}
      {char.notes && <div style={{ fontSize: "12px", color: T.textDim, marginTop: "8px", fontStyle: "italic", borderTop: `1px solid ${T.border}`, paddingTop: "8px" }}>{char.notes}</div>}

      {/* Character sheets section */}
      {!char.isDM && <SheetManager char={char} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHARACTER FORM MODAL
// ═══════════════════════════════════════════════════════

function CharacterForm({ char, onSave, onCancel, saving }) {
  const [form, setForm] = useState(char || {
    name: "", player: "", species: "", class: "", level: 1,
    hp: 10, maxHp: 10, ac: 10, initiative: "+0",
    stats: [10, 10, 10, 10, 10, 10],
    deity: "", background: "", notes: "", isDM: false,
  });

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const uS = (i, v) => {
    const s = [...(form.stats || [10, 10, 10, 10, 10, 10])];
    s[i] = parseInt(v) || 10;
    setForm(p => ({ ...p, stats: s }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="fi" style={{
        background: T.surface, border: `1px solid ${T.borderGold}`,
        borderRadius: "12px", padding: "28px", maxWidth: "520px", width: "100%",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        <h3 style={{ fontFamily: "'Cinzel',serif", color: T.gold, margin: "0 0 20px", fontSize: "20px" }}>
          {char ? "Modifica Personaggio" : "Nuovo Personaggio"}
        </h3>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", cursor: "pointer" }}>
          <input type="checkbox" checked={form.isDM} onChange={e => u("isDM", e.target.checked)} style={{ accentColor: T.gold }} />
          <span style={{ color: T.gold, fontWeight: 600, fontSize: "13px" }}>Dungeon Master</span>
        </label>

        <FormField label="Nome personaggio" value={form.name} onChange={v => u("name", v)} placeholder="es. Zunami" />
        <FormField label="Nome giocatore" value={form.player} onChange={v => u("player", v)} placeholder="es. Ale" />

        {!form.isDM && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <FormSelect label="Specie" value={form.species} options={SPECIES} onChange={v => u("species", v)} />
              <FormSelect label="Classe" value={form.class} options={CLASSES} onChange={v => u("class", v)} />
            </div>
            <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
              <FormField label="Livello" value={form.level} type="number" onChange={v => u("level", parseInt(v) || 1)} />
              <FormField label="HP" value={form.hp} type="number" onChange={v => u("hp", parseInt(v) || 0)} />
              <FormField label="Max HP" value={form.maxHp} type="number" onChange={v => u("maxHp", parseInt(v) || 0)} />
              <FormField label="CA" value={form.ac} type="number" onChange={v => u("ac", parseInt(v) || 10)} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Statistiche</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "6px" }}>
                {["FOR", "DES", "COS", "INT", "SAG", "CAR"].map((stat, idx) => (
                  <div key={stat} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: T.goldDim, marginBottom: "2px" }}>{stat}</div>
                    <input type="number" value={form.stats?.[idx] ?? 10} onChange={e => uS(idx, e.target.value)}
                      style={{ ...iS, textAlign: "center", padding: "6px 4px", width: "100%" }} />
                  </div>
                ))}
              </div>
            </div>
            <FormField label="Mod. Iniziativa" value={form.initiative} onChange={v => u("initiative", v)} placeholder="+2" />
            <FormField label="Divinità" value={form.deity} onChange={v => u("deity", v)} placeholder="es. Zeus" />
            <FormField label="Background" value={form.background} onChange={v => u("background", v)} placeholder="es. Noble (esule)" />
          </>
        )}

        <FormField label="Note" value={form.notes} onChange={v => u("notes", v)} multiline placeholder="Note di backstory, tratti, difetti..." />

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button disabled={saving || !form.name} onClick={() => onSave({ ...form, id: form.id || `char-${Date.now()}` })} style={{ ...bP, opacity: saving || !form.name ? 0.5 : 1 }}>
            {saving ? <Spinner size={14} /> : <I.Save />} Salva
          </button>
          <button onClick={onCancel} style={bS}>Annulla</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAP MARKER
// ═══════════════════════════════════════════════════════

function MapMarker({ loc, isPartyHere, isSelected, onClick }) {
  const tc = { city: T.goldBright, town: T.gold, ruins: T.textDim, poi: T.blueBright, peak: "#aaa", region: T.goldDim };
  const c = tc[loc.type] || T.text;
  const s = loc.type === "city" ? 10 : loc.type === "region" ? 6 : 8;

  return (
    <g onClick={e => { e.stopPropagation(); onClick(loc); }} style={{ cursor: "pointer" }}>
      {isPartyHere && (
        <circle cx={`${loc.x}%`} cy={`${loc.y}%`} r={s + 8} fill="none" stroke={T.goldBright} strokeWidth="2" opacity="0.6">
          <animate attributeName="r" values={`${s + 6};${s + 12};${s + 6}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {isSelected && <circle cx={`${loc.x}%`} cy={`${loc.y}%`} r={s + 4} fill="none" stroke={T.gold} strokeWidth="1.5" strokeDasharray="3 3" />}
      <circle cx={`${loc.x}%`} cy={`${loc.y}%`} r={s} fill={c} opacity="0.95" stroke="#fff" strokeWidth="2" />
      <circle cx={`${loc.x}%`} cy={`${loc.y}%`} r={s + 3} fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
      {isPartyHere && <text x={`${loc.x}%`} y={`${loc.y + 0.4}%`} textAnchor="middle" dominantBaseline="central" fill={T.bg} fontSize="8" fontWeight="bold">⚑</text>}
      <text x={`${loc.x}%`} y={`${loc.y - 3}%`} textAnchor="middle" fill="#fff" fontSize="9" fontFamily="'Cinzel',serif" fontWeight="700"
        stroke={T.bg} strokeWidth="3" paintOrder="stroke">{loc.name}</text>
    </g>
  );
}

// ═══════════════════════════════════════════════════════
// INITIATIVE TRACKER
// ═══════════════════════════════════════════════════════

function InitiativeTracker({ characters }) {
  const [entries, setEntries] = useState([]);
  const [turn, setTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [nn, setNn] = useState("");
  const [ni, setNi] = useState("");

  const addPC = (c) => {
    const r = Math.floor(Math.random() * 20) + 1 + (parseInt(c.initiative) || 0);
    setEntries(p => [...p, { id: `i-${Date.now()}-${Math.random()}`, name: c.name, roll: r, hp: c.hp, maxHp: c.maxHp, pc: true }].sort((a, b) => b.roll - a.roll));
  };

  const addNPC = () => {
    if (!nn) return;
    setEntries(p => [...p, { id: `i-${Date.now()}`, name: nn, roll: parseInt(ni) || 0, pc: false }].sort((a, b) => b.roll - a.roll));
    setNn(""); setNi("");
  };

  const next = () => {
    if (!entries.length) return;
    const n = (turn + 1) % entries.length;
    if (n === 0) setRound(r => r + 1);
    setTurn(n);
  };

  const rm = (id) => setEntries(p => { const u = p.filter(e => e.id !== id); if (turn >= u.length) setTurn(Math.max(0, u.length - 1)); return u; });
  const reset = () => { setEntries([]); setTurn(0); setRound(1); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "14px", fontWeight: 600 }}>Round {round}</span>
          {entries.length > 0 && <button onClick={next} style={{ ...bP, padding: "6px 14px", fontSize: "12px" }}>Prossimo →</button>}
        </div>
        <button onClick={reset} style={{ background: "none", border: `1px solid ${T.red}44`, borderRadius: "4px", padding: "4px 10px", color: T.red, fontSize: "11px", cursor: "pointer" }}>Reset</button>
      </div>

      {entries.map((e, i) => (
        <div key={e.id} style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: i === turn ? `${T.gold}15` : T.bg,
          border: `1px solid ${i === turn ? T.goldDim : T.border}`,
          borderRadius: "6px", padding: "8px 12px", marginBottom: "4px",
        }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, color: T.gold, fontSize: "16px", minWidth: "30px" }}>{e.roll}</span>
          <span style={{ flex: 1, color: i === turn ? T.textBright : T.text, fontWeight: i === turn ? 700 : 400, fontSize: "14px" }}>
            {i === turn && "▸ "}{e.name}
          </span>
          {e.pc && <span style={{ color: T.redBright, fontSize: "11px" }}>♥{e.hp}/{e.maxHp}</span>}
          <button onClick={() => rm(e.id)} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer" }}><I.X /></button>
        </div>
      ))}

      <div style={{ marginTop: "16px", padding: "12px", background: T.bg, borderRadius: "8px", border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Aggiungi dal party</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {characters.filter(c => !c.isDM).map(c => (
            <button key={c.id} onClick={() => addPC(c)} style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: "4px", padding: "4px 10px", color: T.text, fontSize: "12px", cursor: "pointer" }}>{c.name}</button>
          ))}
          {!characters.filter(c => !c.isDM).length && <span style={{ fontSize: "12px", color: T.textDim, fontStyle: "italic" }}>Nessun PG</span>}
        </div>
        <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Aggiungi nemico / NPC</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input placeholder="Nome" value={nn} onChange={e => setNn(e.target.value)} style={{ ...iS, flex: 1 }} />
          <input placeholder="Init" type="number" value={ni} onChange={e => setNi(e.target.value)} style={{ ...iS, width: "60px" }} />
          <button onClick={addNPC} style={{ ...bP, padding: "6px 12px" }}><I.Plus /></button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DICE ROLLER
// ═══════════════════════════════════════════════════════

function DiceRoller() {
  const [results, setResults] = useState([]);
  const [mod, setMod] = useState(0);

  const roll = (s) => {
    const r = Math.floor(Math.random() * s) + 1;
    setResults(p => [{ id: Date.now(), sides: s, result: r, mod, total: r + mod, crit: s === 20 && r === 20, fail: s === 20 && r === 1, time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) }, ...p].slice(0, 20));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
        {[4, 6, 8, 10, 12, 20, 100].map(d => (
          <button key={d} onClick={() => roll(d)} style={{
            background: d === 20 ? `linear-gradient(135deg,${T.goldDim},${T.gold})` : T.surfaceLight,
            color: d === 20 ? T.bg : T.text, border: `1px solid ${d === 20 ? T.gold : T.border}`,
            borderRadius: "8px", padding: "10px 14px", cursor: "pointer",
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: "14px", minWidth: "52px",
          }}>d{d}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "12px", color: T.textDim }}>Modificatore:</span>
        <input type="number" value={mod} onChange={e => setMod(parseInt(e.target.value) || 0)} style={{ ...iS, width: "70px", textAlign: "center" }} />
      </div>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {results.map(r => (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", marginBottom: "4px", borderRadius: "6px",
            background: r.crit ? `${T.goldBright}15` : r.fail ? `${T.red}15` : T.bg,
            border: `1px solid ${r.crit ? T.gold : r.fail ? T.red : T.border}`,
          }}>
            <span style={{ fontSize: "12px", color: T.textDim, minWidth: "40px" }}>{r.time}</span>
            <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, color: T.text }}>d{r.sides}</span>
            <span style={{ color: T.textDim }}>→</span>
            <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: "18px", color: r.crit ? T.goldBright : r.fail ? T.redBright : T.textBright }}>{r.result}</span>
            {r.mod !== 0 && <span style={{ color: T.textDim, fontSize: "12px" }}>({r.mod > 0 ? "+" : ""}{r.mod} = <b style={{ color: T.text }}>{r.total}</b>)</span>}
            {r.crit && <span style={{ color: T.goldBright, fontSize: "12px", fontWeight: 700, fontFamily: "'Cinzel',serif" }}>CRITICO!</span>}
            {r.fail && <span style={{ color: T.redBright, fontSize: "12px", fontWeight: 700, fontFamily: "'Cinzel',serif" }}>FALLIMENTO!</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SESSION ENTRY
// ═══════════════════════════════════════════════════════

function SessionEntry({ session, onDelete }) {
  return (
    <div className="fi" style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "16px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div>
          <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, color: T.gold, fontSize: "15px" }}>Sessione #{session.number}</span>
          <span style={{ color: T.textDim, fontSize: "12px", marginLeft: "10px" }}>{session.date}</span>
        </div>
        <button onClick={() => onDelete(session.id)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer" }}><I.Trash /></button>
      </div>
      {session.title && <div style={{ fontFamily: "'Crimson Text',serif", fontSize: "16px", color: T.textBright, fontWeight: 600, marginBottom: "6px" }}>{session.title}</div>}
      {session.location && <div style={{ fontSize: "12px", color: T.blueBright, marginBottom: "6px" }}>📍 {session.location}</div>}
      <div style={{ fontSize: "14px", color: T.text, fontFamily: "'Crimson Text',serif", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{session.summary}</div>
      {session.loot && <div style={{ fontSize: "12px", color: T.goldBright, marginTop: "8px", borderTop: `1px solid ${T.border}`, paddingTop: "8px" }}>💰 {session.loot}</div>}
      {session.xp && <div style={{ fontSize: "12px", color: T.greenBright, marginTop: "4px" }}>⭐ XP: {session.xp}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// QUICK REFERENCE
// ═══════════════════════════════════════════════════════

function RefItem({ title, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: T.bg, borderRadius: "6px", border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px",
        color: T.text, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "'Cinzel',serif", fontSize: "13px", fontWeight: 600,
      }}>
        {title}
        <span style={{ color: T.textDim, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s", display: "inline-block" }}>▸</span>
      </button>
      {open && <div style={{ padding: "0 14px 10px" }}>
        {items.map((item, i) => <div key={i} style={{ fontSize: "12px", color: T.textDim, padding: "3px 0", borderTop: i > 0 ? `1px solid ${T.border}22` : "none" }}>{item}</div>)}
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FIREBASE SETUP GUIDE
// ═══════════════════════════════════════════════════════

function SetupGuide() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "600px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚡</div>
          <h1 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "28px", marginBottom: "8px" }}>Time of Troubles</h1>
          <p style={{ color: T.textDim, fontStyle: "italic" }}>Configurazione Firebase necessaria</p>
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.borderGold}`, borderRadius: "12px", padding: "28px" }}>
          <h2 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "18px", marginBottom: "16px" }}>Setup in 5 minuti</h2>
          <div style={{ fontSize: "14px", color: T.text, lineHeight: 1.8, fontFamily: "'Crimson Text',serif" }}>
            <p style={{ marginBottom: "12px" }}><strong style={{ color: T.goldBright }}>1.</strong> Vai su <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" style={{ color: T.blueBright }}>console.firebase.google.com</a></p>
            <p style={{ marginBottom: "12px" }}><strong style={{ color: T.goldBright }}>2.</strong> Crea un nuovo progetto (nome: "dnd-time-of-troubles")</p>
            <p style={{ marginBottom: "12px" }}><strong style={{ color: T.goldBright }}>3.</strong> Aggiungi un'app Web (icona {"</>"}) e copia la configurazione</p>
            <p style={{ marginBottom: "12px" }}><strong style={{ color: T.goldBright }}>4.</strong> Attiva <strong>Firestore Database</strong> (modalità test)</p>
            <p style={{ marginBottom: "12px" }}><strong style={{ color: T.goldBright }}>5.</strong> Attiva <strong>Storage</strong> (modalità test)</p>
            <p style={{ marginBottom: "16px" }}><strong style={{ color: T.goldBright }}>6.</strong> Crea un file <code style={{ background: T.bg, padding: "2px 6px", borderRadius: "3px", color: T.goldBright }}>.env</code> nella root del progetto:</p>
            <pre style={{
              background: T.bg, border: `1px solid ${T.border}`, borderRadius: "8px",
              padding: "16px", fontSize: "12px", color: T.greenBright, overflow: "auto",
              fontFamily: "monospace", lineHeight: 1.6,
            }}>
{`VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=tuo-progetto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tuo-progetto
VITE_FIREBASE_STORAGE_BUCKET=tuo-progetto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc`}
            </pre>
            <p style={{ marginTop: "16px", color: T.textDim, fontSize: "13px" }}>
              Per Vercel: aggiungi le stesse variabili in <strong>Settings → Environment Variables</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PASSWORD GATE
// ═══════════════════════════════════════════════════════

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "";

function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const saved = localStorage.getItem("dnd-auth");
    if (saved === APP_PASSWORD) onAuth();
  }, []);

  const handleSubmit = () => {
    if (pw === APP_PASSWORD) {
      localStorage.setItem("dnd-auth", pw);
      onAuth();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px", fontFamily: "'Crimson Text',serif",
    }}>
      <style>{CSS}</style>
      <div className="fi" style={{
        maxWidth: "400px", width: "100%", background: T.surface,
        border: `1px solid ${T.borderGold}`, borderRadius: "16px",
        padding: "40px 32px", textAlign: "center",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚡</div>
        <h1 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "24px", marginBottom: "6px" }}>Time of Troubles</h1>
        <p style={{ color: T.textDim, fontStyle: "italic", fontSize: "14px", marginBottom: "28px" }}>1358 DR — Costa della Spada</p>

        <div style={{ marginBottom: "16px" }}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Password della campagna"
            style={{
              ...iS, textAlign: "center", fontSize: "16px",
              padding: "12px 16px",
              borderColor: error ? T.redBright : T.border,
            }}
          />
        </div>

        {error && (
          <div className="fi" style={{ color: T.redBright, fontSize: "13px", marginBottom: "12px", fontWeight: 600 }}>
            Password errata
          </div>
        )}

        <button onClick={handleSubmit} style={{
          ...bP, width: "100%", justifyContent: "center",
          padding: "12px", fontSize: "16px",
        }}>
          Entra nella Campagna
        </button>

        <p style={{ color: T.textDim, fontSize: "11px", marginTop: "20px" }}>
          Accesso riservato al party
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════

export default function App() {
  const [authenticated, setAuthenticated] = useState(!APP_PASSWORD);
  const [tab, setTab] = useState("map");
  const [characters, setCharacters] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState({});
  const [selLoc, setSelLoc] = useState(null);
  const [editChar, setEditChar] = useState(null);
  const [showCharForm, setShowCharForm] = useState(false);
  const [showSessForm, setShowSessForm] = useState(false);
  const [sessForm, setSessForm] = useState({ number: 1, date: "", title: "", location: "", summary: "", loot: "", xp: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [connected, setConnected] = useState(false);
  const [viewingSheet, setViewingSheet] = useState(null);

  const configured = isFirebaseConfigured();

  const flash = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Firebase subscriptions ───
  useEffect(() => {
    if (!configured) return;
    const unsubs = [];
    try {
      unsubs.push(subscribeCharacters(c => { setCharacters(c); setConnected(true); }));
      unsubs.push(subscribeSessions(s => setSessions(s)));
      unsubs.push(subscribeSettings(s => setSettings(s)));
    } catch (e) {
      console.error("Firebase connection error:", e);
    }
    return () => unsubs.forEach(u => u());
  }, [configured]);

  // ─── CRUD handlers ───
  const handleSaveChar = async (char) => {
    setSaving(true);
    try {
      await fbSaveCharacter(char);
      flash("Personaggio salvato!");
    } catch (e) { flash("Errore: " + e.message, "error"); }
    setSaving(false);
    setShowCharForm(false);
    setEditChar(null);
  };

  const handleDeleteChar = async (id) => {
    if (!confirm("Eliminare questo personaggio?")) return;
    try {
      await fbDeleteCharacter(id);
      flash("Personaggio eliminato");
    } catch (e) { flash("Errore: " + e.message, "error"); }
  };

  const handleAvatarUpload = async (charId, file) => {
    try {
      await uploadAvatar(charId, file);
      flash("Avatar aggiornato!");
    } catch (e) { flash("Errore upload: " + e.message, "error"); }
  };

  const handleMoveParty = async (locId) => {
    try {
      await updateSettings({ partyLocation: locId });
      flash("Party spostato!");
    } catch (e) { flash("Errore: " + e.message, "error"); }
  };

  const handleSaveSession = async () => {
    setSaving(true);
    try {
      await fbSaveSession({ ...sessForm, id: `sess-${Date.now()}` });
      flash("Sessione registrata!");
      setShowSessForm(false);
      setSessForm({ number: sessions.length + 2, date: "", title: "", location: "", summary: "", loot: "", xp: "" });
    } catch (e) { flash("Errore: " + e.message, "error"); }
    setSaving(false);
  };

  const handleDeleteSession = async (id) => {
    if (!confirm("Eliminare questa sessione?")) return;
    try {
      await fbDeleteSession(id);
      flash("Sessione eliminata");
    } catch (e) { flash("Errore: " + e.message, "error"); }
  };

  // ─── Show password gate if not authenticated ───
  if (!authenticated) return <PasswordGate onAuth={() => setAuthenticated(true)} />;

  // ─── Show setup guide if not configured ───
  if (!configured) return <SetupGuide />;

  const partyLoc = LOCATIONS.find(l => l.id === (settings.partyLocation || "neverwinter"));
  const pcs = characters.filter(c => !c.isDM);
  const dms = characters.filter(c => c.isDM);

  const tabs = [
    { id: "map", label: "Mappa", icon: <I.Map /> },
    { id: "party", label: "Party", icon: <I.Users /> },
    { id: "sheets", label: "Schede", icon: <I.Shield /> },
    { id: "journal", label: "Diario", icon: <I.Book /> },
    { id: "combat", label: "Combattimento", icon: <I.Swords /> },
    { id: "tools", label: "Strumenti", icon: <I.Dice /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Crimson Text',serif" }}>
      <style>{CSS}</style>
      <Toast message={toast?.msg} type={toast?.type} />

      {/* ─── HEADER ─── */}
      <header style={{ background: `linear-gradient(180deg,${T.surface},${T.bg})`, borderBottom: `1px solid ${T.border}`, padding: "20px 24px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <I.Zap />
            <h1 style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: "22px", color: T.gold, letterSpacing: "2px", textTransform: "uppercase" }}>Time of Troubles</h1>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", color: connected ? T.greenBright : T.redBright, background: connected ? `${T.green}20` : `${T.red}20`, padding: "2px 8px", borderRadius: "10px", marginLeft: "auto" }}>
              <I.Sync /> {connected ? "LIVE" : "..."}
            </span>
          </div>
          <div style={{ fontSize: "13px", color: T.textDim, fontStyle: "italic", marginBottom: "16px", paddingLeft: "30px" }}>
            Anno delle Tempeste — Costa della Spada — 1358 DR
          </div>

          {/* Status bar */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", padding: "10px 14px", background: T.bg, borderRadius: "8px 8px 0 0", border: `1px solid ${T.border}`, borderBottom: "none", marginBottom: "-1px" }}>
            <span style={{ fontSize: "12px", color: T.textDim }}><I.Pin /> <span style={{ color: T.goldBright, fontWeight: 600 }}>{partyLoc?.name || "?"}</span></span>
            <span style={{ fontSize: "12px", color: T.textDim }}>Party: <span style={{ color: T.text }}>{pcs.length}/6</span></span>
            <span style={{ fontSize: "12px", color: T.textDim }}>Sessioni: <span style={{ color: T.text }}>{sessions.length}</span></span>
          </div>

          {/* Tabs */}
          <nav className="tnav" style={{ display: "flex", gap: "2px", borderBottom: `1px solid ${T.border}` }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 18px",
                background: tab === t.id ? T.surfaceLight : "transparent",
                border: tab === t.id ? `1px solid ${T.border}` : "1px solid transparent",
                borderBottom: tab === t.id ? `1px solid ${T.surfaceLight}` : "none",
                borderRadius: "6px 6px 0 0", color: tab === t.id ? T.gold : T.textDim,
                fontSize: "13px", fontFamily: "'Cinzel',serif", fontWeight: 600, cursor: "pointer",
                marginBottom: tab === t.id ? "-1px" : "0",
              }}>{t.icon} {t.label}</button>
            ))}
          </nav>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>

        {/* ═══ MAP TAB ═══ */}
        {tab === "map" && (
          <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
            <div>
              <div style={{
                position: "relative", width: "100%",
                borderRadius: "12px", border: `2px solid ${T.border}`, overflow: "hidden",
                boxShadow: "0 4px 30px rgba(0,0,0,.5)",
              }}>
                <img src={mapImg} alt="Sword Coast Map" style={{ width: "100%", display: "block", borderRadius: "10px" }} />
                <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                  {LOCATIONS.map(l => <MapMarker key={l.id} loc={l} isPartyHere={(settings.partyLocation || "neverwinter") === l.id} isSelected={selLoc?.id === l.id} onClick={setSelLoc} />)}
                </svg>
              </div>
            </div>
            <div>
              {selLoc ? (
                <div className="fi" style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "20px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{ fontFamily: "'Cinzel',serif", color: T.goldBright, fontSize: "18px", margin: "0 0 4px" }}>{selLoc.name}</h3>
                      <span style={{ fontSize: "11px", color: T.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>{selLoc.type}</span>
                    </div>
                    <button onClick={() => setSelLoc(null)} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer" }}><I.X /></button>
                  </div>
                  <p style={{ fontSize: "14px", color: T.text, lineHeight: 1.6, marginTop: "12px" }}>{selLoc.desc}</p>
                  {(settings.partyLocation || "neverwinter") !== selLoc.id ? (
                    <button onClick={() => handleMoveParty(selLoc.id)} style={{ ...bP, marginTop: "14px", width: "100%", justifyContent: "center", fontSize: "12px", padding: "8px" }}>Sposta il Party Qui</button>
                  ) : (
                    <div style={{ marginTop: "12px", padding: "8px", background: `${T.gold}10`, borderRadius: "6px", textAlign: "center", fontSize: "12px", color: T.gold, fontFamily: "'Cinzel',serif" }}>⚑ Il party è qui</div>
                  )}
                </div>
              ) : (
                <div style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "20px", marginBottom: "16px" }}>
                  <h3 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "16px", margin: "0 0 12px" }}>Costa della Spada</h3>
                  <p style={{ fontSize: "13px", color: T.textDim, lineHeight: 1.6 }}>Seleziona una località sulla mappa per vedere i dettagli e spostare il party.</p>
                </div>
              )}
              <div style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "16px" }}>
                <h4 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "14px", margin: "0 0 12px" }}>Party</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {!pcs.length && <div style={{ fontSize: "13px", color: T.textDim, fontStyle: "italic" }}>Nessun personaggio</div>}
                  {pcs.map(c => <CharacterCard key={c.id} char={c} compact onEdit={() => {}} onDelete={() => {}} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PARTY TAB ═══ */}
        {tab === "party" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h2 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "20px" }}>Personaggi della Campagna</h2>
              <button onClick={() => { setEditChar(null); setShowCharForm(true); }} style={bP}><I.Plus /> Aggiungi</button>
            </div>

            {dms.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", color: T.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px", fontFamily: "'Cinzel',serif" }}>Dungeon Master</div>
                <div style={{ display: "grid", gap: "12px" }}>
                  {dms.map(c => <CharacterCard key={c.id} char={c} onEdit={ch => { setEditChar(ch); setShowCharForm(true); }} onDelete={handleDeleteChar} onAvatarUpload={handleAvatarUpload} />)}
                </div>
              </div>
            )}

            <div style={{ fontSize: "11px", color: T.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px", fontFamily: "'Cinzel',serif" }}>Giocatori ({pcs.length}/6)</div>
            <div className="g2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: "16px" }}>
              {pcs.map(c => <CharacterCard key={c.id} char={c} onEdit={ch => { setEditChar(ch); setShowCharForm(true); }} onDelete={handleDeleteChar} onAvatarUpload={handleAvatarUpload} />)}
              {pcs.length < 6 && (
                <button onClick={() => { setEditChar(null); setShowCharForm(true); }} style={{
                  background: "none", border: `2px dashed ${T.border}`, borderRadius: "8px",
                  padding: "40px", cursor: "pointer", color: T.textDim, fontFamily: "'Cinzel',serif",
                  fontSize: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                }}><I.Plus /> Aggiungi Personaggio</button>
              )}
            </div>

            {showCharForm && <CharacterForm char={editChar} onSave={handleSaveChar} onCancel={() => { setShowCharForm(false); setEditChar(null); }} saving={saving} />}
          </div>
        )}

        {/* ═══ SHEETS TAB ═══ */}
        {tab === "sheets" && (
          <div>
            {/* PDF Viewer Modal */}
            {viewingSheet && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 1000, display: "flex", flexDirection: "column", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexShrink: 0 }}>
                  <div>
                    <span style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "18px", fontWeight: 700 }}>{viewingSheet.charName}</span>
                    <span style={{ color: T.textDim, fontSize: "13px", marginLeft: "12px" }}>{viewingSheet.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <a href={viewingSheet.url} download style={{ ...bS, padding: "6px 14px", fontSize: "12px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", color: T.text }}><I.Download /> Scarica</a>
                    <button onClick={() => setViewingSheet(null)} style={{ ...bS, padding: "6px 14px", fontSize: "12px" }}><I.X /> Chiudi</button>
                  </div>
                </div>
                <div style={{ flex: 1, borderRadius: "8px", overflow: "hidden", border: `1px solid ${T.border}` }}>
                  {viewingSheet.name?.toLowerCase().endsWith(".pdf") ? (
                    <iframe src={viewingSheet.url} style={{ width: "100%", height: "100%", border: "none", background: "#fff" }} title="Character Sheet" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", background: T.bg }}>
                      <img src={viewingSheet.url} alt={viewingSheet.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "20px", margin: 0 }}>Schede Personaggio</h2>
                <p style={{ fontSize: "13px", color: T.textDim, margin: "4px 0 0", fontStyle: "italic" }}>Carica le schede PDF e consultale al volo durante le sessioni</p>
              </div>
            </div>

            {/* Character sheets grid */}
            {characters.filter(c => !c.isDM).length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: T.textDim }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📜</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: "16px", marginBottom: "6px" }}>Nessun personaggio nel party</div>
                <div style={{ fontSize: "13px", fontStyle: "italic" }}>Aggiungi personaggi nel tab "Party" per caricare le loro schede</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {characters.filter(c => !c.isDM).map(char => {
                  const accent = CLASS_COLORS[char.class] || T.gold;
                  const sheets = char.sheets || [];
                  const sheetUploadRef = `sheet-upload-${char.id}`;

                  const handleSheetUpload = async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
                    if (!allowed.includes(file.type)) { alert("Formati accettati: PDF, PNG, JPG"); return; }
                    if (file.size > 10 * 1024 * 1024) { alert("Max 10MB per file"); return; }
                    try {
                      flash("Caricamento in corso...");
                      const sheet = await uploadCharacterSheet(char.id, file);
                      const updated = [...sheets, sheet];
                      await fbSaveCharacter({ ...char, sheets: updated });
                      flash("Scheda caricata!");
                    } catch (err) {
                      flash("Errore: " + err.message, "error");
                    }
                    e.target.value = "";
                  };

                  const handleSheetDelete = async (idx) => {
                    if (!confirm("Eliminare questa scheda?")) return;
                    const sheet = sheets[idx];
                    try { if (sheet.path) await deleteFile(sheet.path); } catch (e) {}
                    const updated = sheets.filter((_, i) => i !== idx);
                    await fbSaveCharacter({ ...char, sheets: updated });
                    flash("Scheda eliminata");
                  };

                  return (
                    <div key={char.id} className="fi" style={{
                      background: `linear-gradient(135deg,${T.surfaceLight},${T.surface})`,
                      border: `1px solid ${T.border}`, borderTop: `3px solid ${accent}`,
                      borderRadius: "10px", overflow: "hidden",
                    }}>
                      {/* Character header */}
                      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", borderBottom: `1px solid ${T.border}` }}>
                        <AvatarDisplay char={char} size={48} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: "18px", color: T.textBright }}>{char.name}</div>
                          <div style={{ fontSize: "13px", color: accent, fontStyle: "italic" }}>{char.species} — {char.class} Lv.{char.level}</div>
                          {char.player && <div style={{ fontSize: "11px", color: T.textDim, marginTop: "2px" }}>Giocatore: {char.player}</div>}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", color: T.textDim }}>{sheets.length} {sheets.length === 1 ? "scheda" : "schede"}</span>
                          <label style={{ ...bP, padding: "8px 14px", fontSize: "12px", cursor: "pointer", margin: 0 }}>
                            <I.Upload /> Carica
                            <input type="file" accept=".pdf,image/*" onChange={handleSheetUpload} style={{ display: "none" }} />
                          </label>
                        </div>
                      </div>

                      {/* Sheets list */}
                      <div style={{ padding: "12px 20px" }}>
                        {sheets.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "24px", color: T.textDim }}>
                            <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.5 }}>📄</div>
                            <div style={{ fontSize: "13px", fontStyle: "italic" }}>Nessuna scheda caricata</div>
                            <div style={{ fontSize: "11px", marginTop: "4px" }}>Clicca "Carica" per aggiungere un PDF o immagine</div>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                            {sheets.map((s, i) => {
                              const isPdf = s.name?.toLowerCase().endsWith(".pdf");
                              const isImg = /\.(png|jpg|jpeg|webp)$/i.test(s.name || "");

                              return (
                                <div key={i} style={{
                                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: "8px",
                                  overflow: "hidden", transition: "border-color .2s",
                                }}>
                                  {/* Preview area */}
                                  <div onClick={() => setViewingSheet({ ...s, charName: char.name })}
                                    style={{
                                      height: "160px", cursor: "pointer", position: "relative",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      background: isPdf ? "linear-gradient(135deg, #1a1a2e, #16213e)" : T.bg,
                                      overflow: "hidden",
                                    }}>
                                    {isImg ? (
                                      <img src={s.url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
                                    ) : isPdf ? (
                                      <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "40px", marginBottom: "8px" }}>📋</div>
                                        <div style={{ fontSize: "11px", color: T.goldDim, fontFamily: "'Cinzel',serif" }}>PDF — Clicca per aprire</div>
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: "36px" }}>📄</div>
                                    )}
                                    <div style={{
                                      position: "absolute", inset: 0,
                                      background: "linear-gradient(transparent 60%, rgba(0,0,0,.6))",
                                      opacity: 0, transition: "opacity .2s",
                                    }}
                                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                    >
                                      <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: "12px", fontFamily: "'Cinzel',serif", fontWeight: 600 }}>Clicca per visualizzare</div>
                                    </div>
                                  </div>

                                  {/* File info bar */}
                                  <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px", borderTop: `1px solid ${T.border}` }}>
                                    <span style={{ color: isPdf ? "#e74c3c" : T.blueBright, flexShrink: 0 }}>{isPdf ? "📕" : "🖼️"}</span>
                                    <span style={{ flex: 1, fontSize: "12px", color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{s.name}</span>
                                    <button onClick={() => setViewingSheet({ ...s, charName: char.name })} title="Visualizza"
                                      style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: "4px", padding: "4px 6px", cursor: "pointer", color: T.blueBright }}><I.Eye /></button>
                                    <a href={s.url} download title="Scarica"
                                      style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: "4px", padding: "4px 6px", cursor: "pointer", color: T.greenBright, display: "inline-flex" }}><I.Download /></a>
                                    <button onClick={() => handleSheetDelete(i)} title="Elimina"
                                      style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: "4px", padding: "4px 6px", cursor: "pointer", color: T.red }}><I.Trash /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ JOURNAL TAB ═══ */}
        {tab === "journal" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h2 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "20px" }}>Diario della Campagna</h2>
              <button onClick={() => {
                setSessForm({ number: sessions.length + 1, date: new Date().toLocaleDateString("it-IT"), title: "", location: "", summary: "", loot: "", xp: "" });
                setShowSessForm(true);
              }} style={bP}><I.Plus /> Nuova Sessione</button>
            </div>

            {showSessForm && (
              <div className="fi" style={{ background: T.surfaceLight, border: `1px solid ${T.borderGold}`, borderRadius: "10px", padding: "24px", marginBottom: "20px" }}>
                <h3 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "16px", marginBottom: "16px" }}>Registra Sessione</h3>
                <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <FormField label="Numero" value={sessForm.number} type="number" onChange={v => setSessForm(p => ({ ...p, number: parseInt(v) || 1 }))} />
                  <FormField label="Data" value={sessForm.date} onChange={v => setSessForm(p => ({ ...p, date: v }))} />
                  <FormField label="Luogo" value={sessForm.location} onChange={v => setSessForm(p => ({ ...p, location: v }))} />
                </div>
                <FormField label="Titolo" value={sessForm.title} onChange={v => setSessForm(p => ({ ...p, title: v }))} />
                <FormField label="Riassunto" value={sessForm.summary} onChange={v => setSessForm(p => ({ ...p, summary: v }))} multiline />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <FormField label="Bottino" value={sessForm.loot} onChange={v => setSessForm(p => ({ ...p, loot: v }))} />
                  <FormField label="XP" value={sessForm.xp} onChange={v => setSessForm(p => ({ ...p, xp: v }))} />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button disabled={saving} onClick={handleSaveSession} style={{ ...bP, opacity: saving ? .5 : 1 }}>{saving ? <Spinner size={14} /> : <I.Save />} Salva</button>
                  <button onClick={() => setShowSessForm(false)} style={bS}>Annulla</button>
                </div>
              </div>
            )}

            {!sessions.length && !showSessForm && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: T.textDim }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📜</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: "16px", marginBottom: "6px" }}>Nessuna sessione registrata</div>
                <div style={{ fontSize: "13px", fontStyle: "italic" }}>Inizia a documentare le avventure!</div>
              </div>
            )}
            {sessions.map(s => <SessionEntry key={s.id} session={s} onDelete={handleDeleteSession} />)}
          </div>
        )}

        {/* ═══ COMBAT TAB ═══ */}
        {tab === "combat" && (
          <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <h2 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><I.Swords /> Iniziativa</h2>
              <InitiativeTracker characters={characters} />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><I.Dice /> Dadi</h2>
              <DiceRoller />
            </div>
          </div>
        )}

        {/* ═══ TOOLS TAB ═══ */}
        {tab === "tools" && (
          <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "24px" }}>
              <h3 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "18px", marginBottom: "16px" }}>⚡ Campagna</h3>
              {[["Ambientazione", "Forgotten Realms — Sword Coast"], ["Anno", "1358 DR — Anno delle Tempeste"], ["Evento", "Time of Troubles (Avatar Crisis)"], ["Città base", "Neverwinter"], ["Regolamento", "D&D 2024 + Oath 2014"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}22` }}>
                  <span style={{ fontSize: "12px", color: T.textDim }}>{l}</span>
                  <span style={{ fontSize: "13px", color: T.textBright, fontWeight: 600, textAlign: "right" }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "12px", marginTop: "12px", fontSize: "13px", color: T.textDim, fontStyle: "italic", lineHeight: 1.7 }}>
                Ao ha bandito gli dei dal Piano Astrale. La magia è instabile, i culti oscuri prosperano, e il destino di Faerûn pende in bilico.
              </div>
            </div>
            <div style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "24px" }}>
              <h3 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "18px", marginBottom: "16px" }}>📖 Riferimenti</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <RefItem title="Condizioni" items={["Avvelenato", "Incapacitato", "Invisibile", "Paralizzato", "Pietrificato", "Prono", "Spaventato", "Stordito"]} />
                <RefItem title="Azioni in Combattimento" items={["Attacco", "Lanciare incantesimo", "Scatto", "Disimpegno", "Schivata", "Aiuto", "Nascondersi", "Usare oggetto"]} />
                <RefItem title="Riposo" items={["Breve: 1h — Dadi Vita per HP", "Lungo: 8h — Recupero completo"]} />
                <RefItem title="Copertura" items={["+2 CA (mezza)", "+5 CA (tre quarti)", "Immune (totale)"]} />
              </div>
            </div>
            <div style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "24px", gridColumn: "1/-1" }}>
              <h3 style={{ fontFamily: "'Cinzel',serif", color: T.gold, fontSize: "18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><I.Dice /> Dadi</h3>
              <DiceRoller />
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "20px", borderTop: `1px solid ${T.border}`, fontSize: "11px", color: T.textDim, fontFamily: "'Cinzel',serif", marginTop: "40px" }}>
        Time of Troubles — 1358 DR — Costa della Spada, Faerûn
      </footer>
    </div>
  );
}
