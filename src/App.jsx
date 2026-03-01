import { useState, useEffect, useRef, useCallback } from "react";
import {
  isFirebaseConfigured, subscribeCharacters, subscribeSessions, subscribeSettings,
  saveCharacter as fbSaveCharacter, deleteCharacter as fbDeleteCharacter,
  saveSession as fbSaveSession, deleteSession as fbDeleteSession,
  updateSettings, uploadAvatar, uploadCharacterSheet, deleteFile,
} from "./lib/firebase";

import mapImg from "./map.jpg";

// ═══════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════

const T = {
  bg: "#0a0908", surface: "#151210", surfaceAlt: "#1c1814",
  card: "#1a1611", cardHover: "#221d16",
  border: "#2e2619", borderLight: "#3d3425", borderGold: "#8b7441",
  gold: "#c9a84c", goldBright: "#e8c85a", goldDim: "#7a6530", goldMuted: "#564320",
  text: "#d4c5a9", textDim: "#8c7e65", textBright: "#f0e6d0", textMuted: "#5a5040",
  red: "#9c3a3a", redBright: "#c45050",
  green: "#4a7c4a", greenBright: "#5fa05f",
  blue: "#3a5a8c", blueBright: "#5080b8",
  glass: "rgba(15,12,8,.85)", glassBorder: "rgba(201,168,76,.15)",
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

const CLASSES = ["Barbaro","Bardo","Chierico","Druido","Guerriero","Ladro","Mago","Monaco","Paladino","Ranger","Stregone","Warlock"];
const SPECIES = ["Aasimar","Dragonborn","Elfo","Gnomo","Halfling","Mezzelfo","Mezzorco","Nano","Tiefling","Umano"];
const CLASS_COLORS = {
  Paladino:"#e8c85a",Guerriero:"#c45050",Mago:"#5080b8",Ladro:"#8c7e65",
  Chierico:"#f0e6d0",Bardo:"#9a6abf",Barbaro:"#c45050",Druido:"#5fa05f",
  Monaco:"#d4a76a",Ranger:"#5fa05f",Stregone:"#9a6abf",Warlock:"#7a4a8c",
};

// ═══════════════════════════════════════════════════════
// GLOBAL CSS
// ═══════════════════════════════════════════════════════

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=MedievalSharp&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}
body{background:${T.bg};font-family:'Crimson Text',Georgia,serif;color:${T.text};-webkit-font-smoothing:antialiased;overflow-x:hidden}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${T.borderLight};border-radius:4px}
::selection{background:${T.gold}33;color:${T.goldBright}}
input,textarea,select,button{font-family:inherit;-webkit-appearance:none}
input:focus,textarea:focus,select:focus{outline:none;border-color:${T.goldDim}!important;box-shadow:0 0 0 2px ${T.gold}15}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeScale{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:.5}50%{opacity:.15}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.fi{animation:fadeIn .35s ease-out both}
.fs{animation:fadeScale .3s ease-out both}
.su{animation:slideUp .35s cubic-bezier(.22,1,.36,1) both}
@media(hover:hover){.hov:hover{background:${T.cardHover}!important;border-color:${T.borderLight}!important}}
@supports(padding:max(0px)){.safe-b{padding-bottom:max(16px,env(safe-area-inset-bottom))}}
`;

// ═══════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════

const iS = {
  width:"100%",padding:"12px 14px",background:T.bg,
  border:`1px solid ${T.border}`,borderRadius:"10px",
  color:T.textBright,fontSize:"16px",fontFamily:"'Crimson Text',serif",
  outline:"none",boxSizing:"border-box",transition:"border-color .2s, box-shadow .2s",
};
const bP = {
  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"8px",
  background:`linear-gradient(135deg,${T.goldDim},${T.gold})`,
  color:T.bg,border:"none",borderRadius:"12px",
  padding:"12px 24px",fontSize:"15px",fontWeight:700,
  fontFamily:"'Cinzel',serif",cursor:"pointer",
  WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
  transition:"transform .15s, opacity .15s",minHeight:"48px",
};
const bS = {
  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"6px",
  background:"transparent",color:T.textDim,border:`1px solid ${T.borderLight}`,
  borderRadius:"12px",padding:"12px 24px",fontSize:"15px",
  fontFamily:"'Cinzel',serif",cursor:"pointer",minHeight:"48px",
  WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
};

// ═══════════════════════════════════════════════════════
// SVG ICONS (touch-optimized sizes)
// ═══════════════════════════════════════════════════════

const I = {
  Map:({s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>,
  Users:({s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Shield:({s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Book:({s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Swords:({s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>,
  Dice:({s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>,
  Plus:({s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X:({s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Save:({s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Trash:({s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Edit:({s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Upload:({s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Download:({s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Eye:({s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  File:({s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Camera:({s=14})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Crown:({s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h20"/><path d="M4 20l1.5-12L9 12l3-8 3 8 3.5-4L20 20"/></svg>,
  Zap:({s=20})=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  DM:({s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><path d="M12 5v-2"/><path d="M12 21v-2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/></svg>,
  Skull:({s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="8"/><path d="M8 22v-4"/><path d="M16 22v-4"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/><path d="M9 14h6"/></svg>,
};

// ═══════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════

function FormField({label,value,onChange,type="text",multiline,placeholder}) {
  return (
    <div style={{marginBottom:"14px"}}>
      <div style={{fontSize:"12px",color:T.textDim,marginBottom:"6px",fontWeight:600,letterSpacing:".5px"}}>{label}</div>
      {multiline ?
        <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={3} placeholder={placeholder} style={{...iS,resize:"vertical",minHeight:"80px"}} />
      : <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={iS} />}
    </div>
  );
}

function FormSelect({label,value,options,onChange}) {
  return (
    <div style={{marginBottom:"14px"}}>
      <div style={{fontSize:"12px",color:T.textDim,marginBottom:"6px",fontWeight:600,letterSpacing:".5px"}}>{label}</div>
      <select value={value||""} onChange={e=>onChange(e.target.value)} style={{...iS,cursor:"pointer"}}>
        <option value="">— Seleziona —</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Spinner({size=18}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2.5" style={{animation:"spin .8s linear infinite"}}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>;
}

function Toast({message,type}) {
  if(!message) return null;
  return (
    <div className="su" style={{
      position:"fixed",bottom:"calc(80px + env(safe-area-inset-bottom, 0px))",left:"50%",transform:"translateX(-50%)",
      zIndex:2000,background:type==="error"?T.redBright:T.greenBright,color:"#fff",
      padding:"10px 24px",borderRadius:"100px",fontFamily:"'Cinzel',serif",fontSize:"13px",fontWeight:600,
      boxShadow:"0 8px 32px rgba(0,0,0,.5)",whiteSpace:"nowrap",
    }}>{message}</div>
  );
}

function Card({children,style={},className=""}) {
  return <div className={`fi ${className}`} style={{
    background:T.card,border:`1px solid ${T.border}`,borderRadius:"14px",
    overflow:"hidden",...style
  }}>{children}</div>;
}

function SectionTitle({children,right}) {
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",paddingBottom:"12px",borderBottom:`1px solid ${T.border}`}}>
    <h2 style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"clamp(18px,4vw,22px)",fontWeight:700,margin:0}}>{children}</h2>
    {right}
  </div>;
}

function EmptyState({icon,title,sub}) {
  return <div style={{textAlign:"center",padding:"48px 20px",color:T.textDim}}>
    <div style={{fontSize:"48px",marginBottom:"12px",opacity:.6}}>{icon}</div>
    <div style={{fontFamily:"'Cinzel',serif",fontSize:"16px",color:T.text,marginBottom:"6px"}}>{title}</div>
    <div style={{fontSize:"13px",fontStyle:"italic"}}>{sub}</div>
  </div>;
}

function IconBtn({icon,onClick,color=T.textDim,danger,title}) {
  return <button onClick={onClick} title={title} style={{
    background:"none",border:`1px solid ${danger?T.red+"44":T.border}`,borderRadius:"10px",
    padding:"8px",cursor:"pointer",color:danger?T.red:color,display:"flex",alignItems:"center",justifyContent:"center",
    minWidth:"36px",minHeight:"36px",WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
    transition:"background .15s",
  }}>{icon}</button>;
}

// ═══════════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════════

function AvatarDisplay({char,size=48,editable,onUpload}) {
  const fileRef=useRef(null);
  const accent=CLASS_COLORS[char.class]||T.gold;
  const initials=(char.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const handleFile=async(e)=>{
    const file=e.target.files?.[0];
    if(!file||!onUpload) return;
    if(!file.type.startsWith("image/")) return;
    if(file.size>5*1024*1024){alert("Max 5MB");return;}
    await onUpload(char.id,file);
  };
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      {char.avatarUrl ?
        <img src={char.avatarUrl} alt={char.name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`2px solid ${accent}44`}} />
      : <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${accent}25,${accent}08)`,border:`2px solid ${accent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:size*.32,color:accent}}>{initials}</div>
      }
      {editable && <>
        <button onClick={()=>fileRef.current?.click()} style={{position:"absolute",bottom:-2,right:-2,width:24,height:24,borderRadius:"50%",background:T.gold,border:`2px solid ${T.bg}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0,touchAction:"manipulation"}}><I.Camera /></button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}} />
      </>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHARACTER CARD
// ═══════════════════════════════════════════════════════

function CharacterCard({char,onEdit,onDelete,onAvatarUpload,compact}) {
  const accent=CLASS_COLORS[char.class]||T.gold;
  if(compact) {
    return (
      <div className="hov" style={{background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${accent}`,borderRadius:"12px",padding:"12px 16px",display:"flex",alignItems:"center",gap:"12px",transition:"background .15s"}}>
        <AvatarDisplay char={char} size={36} />
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.textBright,fontSize:"14px"}}>{char.name}</div>
          <div style={{fontSize:"12px",color:T.textDim}}>{char.species} {char.class} Lv.{char.level}</div>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center",flexShrink:0}}>
          <span style={{color:T.redBright,fontSize:"13px",fontWeight:600}}>♥ {char.hp}/{char.maxHp}</span>
          <span style={{background:`${T.blueBright}18`,border:`1px solid ${T.blueBright}33`,borderRadius:"8px",padding:"2px 8px",color:T.blueBright,fontSize:"12px",fontWeight:600}}>CA {char.ac}</span>
        </div>
      </div>
    );
  }

  return (
    <Card style={{borderTop:`3px solid ${accent}`}}>
      <div style={{padding:"20px"}}>
        <div style={{display:"flex",gap:"14px",marginBottom:"16px"}}>
          <AvatarDisplay char={char} size={60} editable onUpload={onAvatarUpload} />
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:"clamp(16px,3.5vw,20px)",color:T.textBright,lineHeight:1.2}}>{char.name}</div>
                <div style={{fontSize:"14px",color:accent,fontStyle:"italic",marginTop:"2px"}}>{char.species} — {char.class} Lv.{char.level}</div>
              </div>
              <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                <IconBtn icon={<I.Edit />} onClick={()=>onEdit(char)} />
                <IconBtn icon={<I.Trash />} onClick={()=>onDelete(char.id)} danger />
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div style={{display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap"}}>
          {char.isDM ? (
            <span style={{display:"inline-flex",alignItems:"center",gap:"6px",background:`${T.gold}15`,border:`1px solid ${T.goldDim}`,borderRadius:"100px",padding:"6px 14px",fontSize:"12px",color:T.gold,fontWeight:600}}><I.Crown s={14}/> DUNGEON MASTER</span>
          ) : <>
            <span style={{background:`${T.redBright}12`,border:`1px solid ${T.redBright}25`,borderRadius:"10px",padding:"6px 12px",fontSize:"13px",color:T.redBright,fontWeight:600}}>♥ {char.hp}/{char.maxHp}</span>
            <span style={{background:`${T.blueBright}12`,border:`1px solid ${T.blueBright}25`,borderRadius:"10px",padding:"6px 12px",fontSize:"13px",color:T.blueBright,fontWeight:600}}>CA {char.ac}</span>
            <span style={{background:`${T.gold}12`,border:`1px solid ${T.gold}25`,borderRadius:"10px",padding:"6px 12px",fontSize:"13px",color:T.gold,fontWeight:600}}>Init {char.initiative||"+0"}</span>
          </>}
        </div>

        {char.player && <div style={{fontSize:"13px",color:T.textDim,marginBottom:"4px"}}>Giocatore: <span style={{color:T.text}}>{char.player}</span></div>}

        {/* Stats */}
        {!char.isDM && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"6px",marginBottom:"14px"}}>
            {["FOR","DES","COS","INT","SAG","CAR"].map((stat,i)=>(
              <div key={stat} style={{textAlign:"center",background:T.bg,borderRadius:"10px",padding:"8px 4px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:"10px",color:T.textDim,fontWeight:700,letterSpacing:"1px"}}>{stat}</div>
                <div style={{fontSize:"18px",fontWeight:700,color:T.textBright,fontFamily:"'Cinzel',serif",lineHeight:1.3}}>{char.stats?.[i]??"—"}</div>
                <div style={{fontSize:"11px",color:T.goldDim,fontWeight:600}}>{char.stats?.[i]?(char.stats[i]>=10?"+":"")+Math.floor((char.stats[i]-10)/2):""}</div>
              </div>
            ))}
          </div>
        )}

        {char.deity && <div style={{fontSize:"13px",color:T.text,marginBottom:"4px"}}>Divinità: <span style={{color:accent,fontWeight:600}}>{char.deity}</span></div>}
        {char.background && <div style={{fontSize:"13px",color:T.text,marginBottom:"4px"}}>Background: <span style={{color:T.textDim}}>{char.background}</span></div>}
        {char.notes && <div style={{fontSize:"13px",color:T.textDim,marginTop:"10px",fontStyle:"italic",borderTop:`1px solid ${T.border}`,paddingTop:"10px"}}>{char.notes}</div>}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// CHARACTER FORM (Sheet-style modal)
// ═══════════════════════════════════════════════════════

function CharacterForm({char,onSave,onCancel,saving}) {
  const [form,setForm]=useState(char||{name:"",player:"",species:"",class:"",level:1,hp:10,maxHp:10,ac:10,initiative:"+0",stats:[10,10,10,10,10,10],deity:"",background:"",notes:"",isDM:false});
  const u=(k,v)=>setForm(p=>({...p,[k]:v}));
  const uS=(i,v)=>{const s=[...(form.stats||[10,10,10,10,10,10])];s[i]=parseInt(v)||10;setForm(p=>({...p,stats:s}));};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}} onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} className="su" style={{
        background:T.surface,borderTop:`2px solid ${T.goldDim}`,
        borderRadius:"20px 20px 0 0",padding:"24px 20px",width:"100%",maxWidth:"540px",
        maxHeight:"90vh",overflowY:"auto",WebkitOverflowScrolling:"touch",
      }}>
        <div style={{width:"40px",height:"4px",background:T.borderLight,borderRadius:"2px",margin:"0 auto 20px"}} />
        <h3 style={{fontFamily:"'Cinzel',serif",color:T.gold,margin:"0 0 20px",fontSize:"20px",textAlign:"center"}}>{char?"Modifica Personaggio":"Nuovo Personaggio"}</h3>

        <label style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"18px",cursor:"pointer",padding:"10px 14px",background:T.bg,borderRadius:"12px",border:`1px solid ${T.border}`}}>
          <input type="checkbox" checked={form.isDM} onChange={e=>u("isDM",e.target.checked)} style={{accentColor:T.gold,width:"20px",height:"20px"}} />
          <span style={{color:T.gold,fontWeight:600,fontSize:"14px"}}>Dungeon Master</span>
        </label>

        <FormField label="Nome personaggio" value={form.name} onChange={v=>u("name",v)} placeholder="es. Zunami" />
        <FormField label="Nome giocatore" value={form.player} onChange={v=>u("player",v)} placeholder="es. Ale" />

        {!form.isDM && <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            <FormSelect label="Specie" value={form.species} options={SPECIES} onChange={v=>u("species",v)} />
            <FormSelect label="Classe" value={form.class} options={CLASSES} onChange={v=>u("class",v)} />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"10px"}}>
            <FormField label="Livello" value={form.level} type="number" onChange={v=>u("level",parseInt(v)||1)} />
            <FormField label="HP" value={form.hp} type="number" onChange={v=>u("hp",parseInt(v)||0)} />
            <FormField label="Max HP" value={form.maxHp} type="number" onChange={v=>u("maxHp",parseInt(v)||0)} />
            <FormField label="CA" value={form.ac} type="number" onChange={v=>u("ac",parseInt(v)||10)} />
          </div>
          <div style={{marginBottom:"14px"}}>
            <div style={{fontSize:"12px",color:T.textDim,marginBottom:"8px",fontWeight:600}}>Statistiche</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"8px"}}>
              {["FOR","DES","COS","INT","SAG","CAR"].map((stat,idx)=>(
                <div key={stat} style={{textAlign:"center"}}>
                  <div style={{fontSize:"11px",color:T.goldDim,marginBottom:"4px",fontWeight:600}}>{stat}</div>
                  <input type="number" value={form.stats?.[idx]??10} onChange={e=>uS(idx,e.target.value)} style={{...iS,textAlign:"center",padding:"10px 4px"}} />
                </div>
              ))}
            </div>
          </div>
          <FormField label="Mod. Iniziativa" value={form.initiative} onChange={v=>u("initiative",v)} placeholder="+2" />
          <FormField label="Divinità" value={form.deity} onChange={v=>u("deity",v)} placeholder="es. Zeus" />
          <FormField label="Background" value={form.background} onChange={v=>u("background",v)} placeholder="es. Noble (esule)" />
        </>}

        <FormField label="Note" value={form.notes} onChange={v=>u("notes",v)} multiline placeholder="Note di backstory, tratti, difetti..." />

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"20px",paddingBottom:"env(safe-area-inset-bottom, 0px)"}}>
          <button onClick={onCancel} style={bS}>Annulla</button>
          <button disabled={saving||!form.name} onClick={()=>onSave({...form,id:form.id||`char-${Date.now()}`})} style={{...bP,opacity:saving||!form.name?.5:1}}>{saving?<Spinner />:<I.Save />} Salva</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAP MARKER
// ═══════════════════════════════════════════════════════

function MapMarker({loc,isPartyHere,isSelected,onClick}) {
  const tc={city:T.goldBright,town:T.gold,ruins:T.textDim,poi:T.blueBright,peak:"#bbb",region:T.goldDim};
  const c=tc[loc.type]||T.text;
  const s=loc.type==="city"?10:loc.type==="region"?6:8;
  const cx=`${loc.x}%`,cy=`${loc.y}%`;
  return (
    <g onClick={e=>{e.stopPropagation();onClick(loc);}} style={{cursor:"pointer"}}>
      {/* Touch target */}
      <circle cx={cx} cy={cy} r="20" fill="transparent" />

      {/* Party beacon — multiple bright rings */}
      {isPartyHere && <>
        <circle cx={cx} cy={cy} r="28" fill="none" stroke="#ff4444" strokeWidth="2" opacity="0.6">
          <animate attributeName="r" values="18;34;18" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx={cx} cy={cy} r="22" fill="none" stroke="#ffcc00" strokeWidth="2.5" opacity="0.5">
          <animate attributeName="r" values="14;28;14" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx={cx} cy={cy} r="18" fill="#ff2200" opacity="0.12"/>
        <circle cx={cx} cy={cy} r="15" fill="none" stroke="#ff4444" strokeWidth="2" opacity="0.7" strokeDasharray="4 3">
          <animateTransform attributeName="transform" type="rotate" values={`0 ${loc.x} ${loc.y};360 ${loc.x} ${loc.y}`} dur="8s" repeatCount="indefinite"/>
        </circle>
      </>}

      {/* Selected ring */}
      {isSelected && <circle cx={cx} cy={cy} r={s+6} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 3"/>}

      {/* Main dot */}
      {isPartyHere ? <>
        <circle cx={cx} cy={cy} r="13" fill="#dd2200" stroke="#fff" strokeWidth="3"/>
        <circle cx={cx} cy={cy} r="6" fill="#ffcc00" stroke="none"/>
        <circle cx={cx} cy={cy} r="2.5" fill="#fff"/>
      </> : <>
        <circle cx={cx} cy={cy} r={s} fill={c} opacity="0.9" stroke="#fff" strokeWidth="1.5"/>
      </>}

      {/* Label */}
      <text x={cx} y={`${loc.y-(isPartyHere?4.5:3)}%`} textAnchor="middle" fill={isPartyHere?"#fff":T.textBright} fontSize={isPartyHere?"11":"9"} fontFamily="'Cinzel',serif" fontWeight="700" stroke={T.bg} strokeWidth={isPartyHere?"4":"3"} paintOrder="stroke">{loc.name}</text>
      {isPartyHere && <text x={cx} y={`${loc.y+5}%`} textAnchor="middle" fill="#ffcc00" fontSize="9" fontFamily="'Cinzel',serif" fontWeight="700" stroke={T.bg} strokeWidth="3" paintOrder="stroke">⚑ PARTY</text>}
    </g>
  );
}

// ═══════════════════════════════════════════════════════
// INITIATIVE TRACKER
// ═══════════════════════════════════════════════════════

function InitiativeTracker({characters}) {
  const [entries,setEntries]=useState([]);const [turn,setTurn]=useState(0);const [round,setRound]=useState(1);const [nn,setNn]=useState("");const [ni,setNi]=useState("");
  const addPC=(c)=>{const r=Math.floor(Math.random()*20)+1+(parseInt(c.initiative)||0);setEntries(p=>[...p,{id:`i-${Date.now()}-${Math.random()}`,name:c.name,roll:r,hp:c.hp,maxHp:c.maxHp,pc:true}].sort((a,b)=>b.roll-a.roll));};
  const addNPC=()=>{if(!nn)return;setEntries(p=>[...p,{id:`i-${Date.now()}`,name:nn,roll:parseInt(ni)||0,pc:false}].sort((a,b)=>b.roll-a.roll));setNn("");setNi("");};
  const next=()=>{if(!entries.length)return;const n=(turn+1)%entries.length;if(n===0)setRound(r=>r+1);setTurn(n);};
  const rm=(id)=>setEntries(p=>{const u=p.filter(e=>e.id!==id);if(turn>=u.length)setTurn(Math.max(0,u.length-1));return u;});
  const reset=()=>{setEntries([]);setTurn(0);setRound(1);};

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",gap:"10px",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"16px",fontWeight:700}}>Round {round}</span>
          {entries.length>0 && <button onClick={next} style={{...bP,padding:"10px 18px",fontSize:"13px"}}>Prossimo →</button>}
        </div>
        <button onClick={reset} style={{...bS,padding:"8px 14px",fontSize:"12px",color:T.red,borderColor:T.red+"44"}}>Reset</button>
      </div>
      {entries.map((e,i)=>(
        <div key={e.id} style={{display:"flex",alignItems:"center",gap:"12px",background:i===turn?`${T.gold}12`:T.bg,border:`1px solid ${i===turn?T.goldDim:T.border}`,borderRadius:"12px",padding:"12px 16px",marginBottom:"6px",transition:"background .2s"}}>
          <span style={{fontFamily:"'Cinzel',serif",fontWeight:900,color:T.gold,fontSize:"18px",minWidth:"32px"}}>{e.roll}</span>
          <span style={{flex:1,color:i===turn?T.textBright:T.text,fontWeight:i===turn?700:400,fontSize:"15px"}}>{i===turn&&"▸ "}{e.name}</span>
          {e.pc&&<span style={{color:T.redBright,fontSize:"12px",fontWeight:600}}>♥{e.hp}/{e.maxHp}</span>}
          <IconBtn icon={<I.X s={14}/>} onClick={()=>rm(e.id)} />
        </div>
      ))}
      <Card style={{marginTop:"16px",padding:"16px"}}>
        <div style={{fontSize:"12px",color:T.textDim,marginBottom:"10px",fontWeight:600}}>Aggiungi dal party</div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"14px"}}>
          {characters.filter(c=>!c.isDM).map(c=>(<button key={c.id} onClick={()=>addPC(c)} className="hov" style={{background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:"10px",padding:"8px 14px",color:T.text,fontSize:"13px",cursor:"pointer",touchAction:"manipulation",minHeight:"40px"}}>{c.name}</button>))}
          {!characters.filter(c=>!c.isDM).length&&<span style={{fontSize:"13px",color:T.textDim,fontStyle:"italic"}}>Nessun PG nel party</span>}
        </div>
        <div style={{fontSize:"12px",color:T.textDim,marginBottom:"10px",fontWeight:600}}>Aggiungi nemico / NPC</div>
        <div style={{display:"flex",gap:"8px"}}>
          <input placeholder="Nome" value={nn} onChange={e=>setNn(e.target.value)} style={{...iS,flex:1}} />
          <input placeholder="Init" type="number" value={ni} onChange={e=>setNi(e.target.value)} style={{...iS,width:"70px",textAlign:"center"}} />
          <button onClick={addNPC} style={{...bP,padding:"10px 16px"}}><I.Plus /></button>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DICE ROLLER
// ═══════════════════════════════════════════════════════

function DiceRoller() {
  const [results,setResults]=useState([]);const [mod,setMod]=useState(0);
  const roll=(s)=>{const r=Math.floor(Math.random()*s)+1;setResults(p=>[{id:Date.now(),sides:s,result:r,mod,total:r+mod,crit:s===20&&r===20,fail:s===20&&r===1,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})},...p].slice(0,20));};

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"14px"}}>
        {[4,6,8,10,12,20,100].map(d=>(
          <button key={d} onClick={()=>roll(d)} style={{
            background:d===20?`linear-gradient(135deg,${T.goldDim},${T.gold})`:T.card,
            color:d===20?T.bg:T.text,border:`1px solid ${d===20?T.gold:T.border}`,
            borderRadius:"12px",padding:"14px 8px",cursor:"pointer",
            fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"16px",
            touchAction:"manipulation",minHeight:"52px",transition:"transform .1s",
          }}>d{d}</button>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:"4px",padding:"0 8px"}}>
          <span style={{fontSize:"13px",color:T.textDim,whiteSpace:"nowrap"}}>Mod</span>
          <input type="number" value={mod} onChange={e=>setMod(parseInt(e.target.value)||0)} style={{...iS,textAlign:"center",padding:"10px 4px"}} />
        </div>
      </div>
      <div style={{maxHeight:"280px",overflowY:"auto"}}>
        {results.map(r=>(
          <div key={r.id} className="fi" style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",marginBottom:"4px",borderRadius:"10px",background:r.crit?`${T.goldBright}12`:r.fail?`${T.red}12`:T.bg,border:`1px solid ${r.crit?T.gold+"55":r.fail?T.red+"55":T.border}`}}>
            <span style={{fontSize:"12px",color:T.textDim,minWidth:"40px"}}>{r.time}</span>
            <span style={{fontFamily:"'Cinzel',serif",fontWeight:600,color:T.textDim,fontSize:"13px"}}>d{r.sides}</span>
            <span style={{fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:"20px",color:r.crit?T.goldBright:r.fail?T.redBright:T.textBright}}>{r.result}</span>
            {r.mod!==0&&<span style={{color:T.textDim,fontSize:"12px"}}>({r.mod>0?"+":""}{r.mod} = <b style={{color:T.text}}>{r.total}</b>)</span>}
            {r.crit&&<span style={{color:T.goldBright,fontSize:"11px",fontWeight:700,fontFamily:"'Cinzel',serif",background:`${T.gold}15`,padding:"2px 8px",borderRadius:"6px"}}>CRITICO!</span>}
            {r.fail&&<span style={{color:T.redBright,fontSize:"11px",fontWeight:700,fontFamily:"'Cinzel',serif",background:`${T.red}15`,padding:"2px 8px",borderRadius:"6px"}}>FAIL!</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HP TRACKER (live combat HP management)
// ═══════════════════════════════════════════════════════

function HPTracker({characters,onSaveChar}) {
  const pcs=characters.filter(c=>!c.isDM);
  const [tempHp,setTempHp]=useState({});
  const [deathSaves,setDeathSaves]=useState({});

  const adjustHp=(char,delta)=>{
    let newHp=Math.max(0,Math.min((char.hp||0)+delta,char.maxHp||1));
    onSaveChar({...char,hp:newHp});
  };
  const setHpDirect=(char,val)=>{
    const v=Math.max(0,Math.min(parseInt(val)||0,char.maxHp||1));
    onSaveChar({...char,hp:v});
  };
  const toggleDeathSave=(charId,type,idx)=>{
    setDeathSaves(p=>{const k=charId;const cur=p[k]||{succ:[false,false,false],fail:[false,false,false]};const arr=[...cur[type]];arr[idx]=!arr[idx];return{...p,[k]:{...cur,[type]:arr}};});
  };
  const resetDs=(charId)=>setDeathSaves(p=>({...p,[charId]:{succ:[false,false,false],fail:[false,false,false]}}));

  if(!pcs.length) return <EmptyState icon="♥" title="Nessun PG" sub='Aggiungi personaggi in "Party"'/>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
      {pcs.map(char=>{
        const accent=CLASS_COLORS[char.class]||T.gold;
        const hp=char.hp||0;const maxHp=char.maxHp||1;
        const pct=Math.round((hp/maxHp)*100);
        const barColor=pct>50?T.greenBright:pct>25?"#e8a33a":T.redBright;
        const isDying=hp===0;
        const ds=deathSaves[char.id]||{succ:[false,false,false],fail:[false,false,false]};
        const th=tempHp[char.id]||0;

        return (
          <Card key={char.id} style={{borderLeft:`3px solid ${accent}`}}>
            <div style={{padding:"14px 16px"}}>
              {/* Name + HP display */}
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"10px"}}>
                <AvatarDisplay char={char} size={40}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"15px",color:isDying?T.redBright:T.textBright}}>{char.name}</div>
                  <div style={{fontSize:"12px",color:T.textDim}}>{char.class} Lv.{char.level}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:"22px",color:isDying?T.redBright:T.textBright,lineHeight:1}}>{hp}<span style={{fontSize:"14px",color:T.textDim}}>/{maxHp}</span></div>
                  {th>0&&<div style={{fontSize:"11px",color:T.blueBright,fontWeight:600}}>+{th} temp</div>}
                </div>
              </div>

              {/* HP Bar */}
              <div style={{height:"10px",background:T.bg,borderRadius:"5px",overflow:"hidden",marginBottom:"10px",border:`1px solid ${T.border}`}}>
                <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${barColor},${barColor}cc)`,borderRadius:"4px",transition:"width .4s ease, background .4s"}}/>
              </div>

              {/* +/- Controls */}
              <div style={{display:"flex",gap:"6px",alignItems:"center",justifyContent:"center",marginBottom:isDying?"10px":"0"}}>
                {[-10,-5,-1].map(d=>(
                  <button key={d} onClick={()=>adjustHp(char,d)} style={{background:`${T.redBright}15`,border:`1px solid ${T.redBright}33`,borderRadius:"10px",padding:"8px 12px",color:T.redBright,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"14px",cursor:"pointer",minWidth:"44px",minHeight:"44px",touchAction:"manipulation"}}>{d}</button>
                ))}
                <input value={hp} onChange={e=>setHpDirect(char,e.target.value)} style={{...iS,width:"60px",textAlign:"center",padding:"8px",fontSize:"16px",fontWeight:700,fontFamily:"'Cinzel',serif"}}/>
                {[1,5,10].map(d=>(
                  <button key={d} onClick={()=>adjustHp(char,d)} style={{background:`${T.greenBright}15`,border:`1px solid ${T.greenBright}33`,borderRadius:"10px",padding:"8px 12px",color:T.greenBright,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"14px",cursor:"pointer",minWidth:"44px",minHeight:"44px",touchAction:"manipulation"}}>+{d}</button>
                ))}
              </div>

              {/* Temp HP */}
              <div style={{display:"flex",alignItems:"center",gap:"8px",justifyContent:"center",marginTop:"8px"}}>
                <span style={{fontSize:"12px",color:T.textDim}}>HP Temp:</span>
                <button onClick={()=>setTempHp(p=>({...p,[char.id]:Math.max(0,(p[char.id]||0)-1)}))} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"4px 10px",color:T.textDim,cursor:"pointer",minHeight:"32px",touchAction:"manipulation"}}>−</button>
                <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.blueBright,fontSize:"16px",minWidth:"24px",textAlign:"center"}}>{th}</span>
                <button onClick={()=>setTempHp(p=>({...p,[char.id]:(p[char.id]||0)+1}))} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"4px 10px",color:T.blueBright,cursor:"pointer",minHeight:"32px",touchAction:"manipulation"}}>+</button>
              </div>

              {/* Death Saves (when HP = 0) */}
              {isDying&&(
                <div className="fi" style={{marginTop:"10px",padding:"12px",background:`${T.red}08`,borderRadius:"10px",border:`1px solid ${T.red}22`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                    <span style={{fontFamily:"'Cinzel',serif",color:T.redBright,fontSize:"13px",fontWeight:700}}>💀 Tiri Salvezza Morte</span>
                    <button onClick={()=>resetDs(char.id)} style={{fontSize:"11px",color:T.textDim,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",touchAction:"manipulation"}}>Reset</button>
                  </div>
                  <div style={{display:"flex",gap:"16px",justifyContent:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"12px",color:T.greenBright,fontWeight:600}}>✓</span>
                      {ds.succ.map((v,i)=><button key={i} onClick={()=>toggleDeathSave(char.id,"succ",i)} style={{width:"28px",height:"28px",borderRadius:"50%",border:`2px solid ${v?T.greenBright:T.border}`,background:v?T.greenBright:"transparent",cursor:"pointer",touchAction:"manipulation"}}/>)}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"12px",color:T.redBright,fontWeight:600}}>✗</span>
                      {ds.fail.map((v,i)=><button key={i} onClick={()=>toggleDeathSave(char.id,"fail",i)} style={{width:"28px",height:"28px",borderRadius:"50%",border:`2px solid ${v?T.redBright:T.border}`,background:v?T.redBright:"transparent",cursor:"pointer",touchAction:"manipulation"}}/>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SPELL SLOT TRACKER
// ═══════════════════════════════════════════════════════

const SPELL_SLOTS_BY_LEVEL = {
  1:[2,0,0,0,0],2:[3,0,0,0,0],3:[4,2,0,0,0],4:[4,3,0,0,0],5:[4,3,2,0,0],
  6:[4,3,3,0,0],7:[4,3,3,1,0],8:[4,3,3,2,0],9:[4,3,3,3,1],10:[4,3,3,3,2],
  11:[4,3,3,3,2],12:[4,3,3,3,2],13:[4,3,3,3,2],14:[4,3,3,3,2],15:[4,3,3,3,2],
  16:[4,3,3,3,3],17:[4,3,3,3,3],18:[4,3,3,3,3],19:[4,3,3,3,3],20:[4,3,3,3,3],
};

function SpellSlotTracker({characters,onSaveChar}) {
  const casters=characters.filter(c=>!c.isDM&&["Paladino","Chierico","Mago","Bardo","Druido","Stregone","Warlock","Ranger"].includes(c.class));

  if(!casters.length) return <EmptyState icon="✨" title="Nessun caster" sub="Aggiungi un personaggio con incantesimi"/>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
      {casters.map(char=>{
        const accent=CLASS_COLORS[char.class]||T.gold;
        const lvl=char.level||1;
        // Half-casters (Paladin, Ranger) get slots at level 2, use half-caster table
        const isHalf=["Paladino","Ranger"].includes(char.class);
        const effLvl=isHalf?Math.max(1,Math.ceil(lvl/2)):lvl;
        const maxSlots=SPELL_SLOTS_BY_LEVEL[Math.min(effLvl,20)]||[0,0,0,0,0];
        const usedSlots=char.usedSlots||[0,0,0,0,0];

        const toggleSlot=(slotLvl,idx)=>{
          const used=[...(char.usedSlots||[0,0,0,0,0])];
          // If clicking on a used slot, un-use it; otherwise use next available
          if(idx<used[slotLvl]){used[slotLvl]=idx;}
          else{used[slotLvl]=idx+1;}
          onSaveChar({...char,usedSlots:used});
        };
        const resetAll=()=>onSaveChar({...char,usedSlots:[0,0,0,0,0]});

        return (
          <Card key={char.id} style={{borderLeft:`3px solid ${accent}`}}>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <AvatarDisplay char={char} size={36}/>
                  <div>
                    <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"15px",color:T.textBright}}>{char.name}</div>
                    <div style={{fontSize:"12px",color:accent}}>{char.class} Lv.{lvl}{isHalf?" (half-caster)":""}</div>
                  </div>
                </div>
                <button onClick={resetAll} style={{...bS,padding:"6px 12px",fontSize:"11px",color:T.blueBright,borderColor:`${T.blueBright}44`}}>🌙 Riposo</button>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {maxSlots.map((max,slotLvl)=>{
                  if(max===0) return null;
                  const used=usedSlots[slotLvl]||0;
                  return (
                    <div key={slotLvl} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"13px",color:T.goldDim,minWidth:"56px"}}>Lv. {slotLvl+1}</span>
                      <div style={{display:"flex",gap:"6px",flex:1}}>
                        {Array.from({length:max}).map((_,i)=>{
                          const isUsed=i<used;
                          return (
                            <button key={i} onClick={()=>toggleSlot(slotLvl,i)} style={{
                              width:"36px",height:"36px",borderRadius:"10px",
                              background:isUsed?`${T.textDim}22`:`linear-gradient(135deg,${accent}44,${accent}22)`,
                              border:`2px solid ${isUsed?T.border:accent}`,
                              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                              touchAction:"manipulation",transition:"all .15s",
                            }}>
                              {isUsed?<span style={{color:T.textDim,fontSize:"16px"}}>✗</span>:<span style={{color:accent,fontSize:"16px"}}>◆</span>}
                            </button>
                          );
                        })}
                      </div>
                      <span style={{fontSize:"12px",color:T.textDim,minWidth:"32px",textAlign:"right"}}>{max-used}/{max}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CONDITION CALCULATOR (2024 rules)
// ═══════════════════════════════════════════════════════

const CONDITIONS_DATA = [
  {id:"blinded",name:"Accecato",icon:"🔲",effects:["Fallisce automaticamente prove basate sulla vista","Tiri per colpire hanno svantaggio","Tiri per colpire contro hanno vantaggio"]},
  {id:"charmed",name:"Affascinato",icon:"💖",effects:["Non può attaccare chi l'ha affascinato","Chi l'ha affascinato ha vantaggio nelle prove sociali"]},
  {id:"deafened",name:"Assordato",icon:"🔇",effects:["Fallisce automaticamente prove basate sull'udito"]},
  {id:"frightened",name:"Spaventato",icon:"😱",effects:["Svantaggio a tiri abilità e attacco finché vede la fonte della paura","Non può avvicinarsi volontariamente alla fonte"]},
  {id:"grappled",name:"Afferrato",icon:"🤝",effects:["Velocità diventa 0","Termina se chi afferra è incapacitato","Termina se un effetto rimuove la creatura dalla portata"]},
  {id:"incapacitated",name:"Incapacitato",icon:"💫",effects:["Non può compiere azioni o reazioni"]},
  {id:"invisible",name:"Invisibile",icon:"👻",effects:["Impossibile da vedere senza magia/sensi speciali","Vantaggio ai tiri per colpire","Tiri per colpire contro hanno svantaggio"]},
  {id:"paralyzed",name:"Paralizzato",icon:"⚡",effects:["È incapacitato, non può muoversi o parlare","Fallisce automaticamente TS su FOR e DES","Tiri per colpire contro hanno vantaggio","Colpi entro 1.5m sono critici automatici"]},
  {id:"petrified",name:"Pietrificato",icon:"🗿",effects:["Trasformato in sostanza solida inanimata","Peso × 10, non invecchia","È incapacitato, non può muoversi o parlare","Tiri per colpire contro hanno vantaggio","Fallisce automaticamente TS su FOR e DES","Resistenza a tutti i danni","Immune a veleno e malattia"]},
  {id:"poisoned",name:"Avvelenato",icon:"☠️",effects:["Svantaggio ai tiri per colpire e prove di abilità"]},
  {id:"prone",name:"Prono",icon:"🔻",effects:["Può solo strisciare (costo doppio)","Svantaggio ai tiri per colpire","Attacchi entro 1.5m hanno vantaggio","Attacchi oltre 1.5m hanno svantaggio","Alzarsi costa metà del movimento"]},
  {id:"restrained",name:"Trattenuto",icon:"⛓️",effects:["Velocità diventa 0","Tiri per colpire hanno svantaggio","Tiri per colpire contro hanno vantaggio","Svantaggio ai TS su DES"]},
  {id:"stunned",name:"Stordito",icon:"💥",effects:["È incapacitato, non può muoversi, parla a fatica","Fallisce automaticamente TS su FOR e DES","Tiri per colpire contro hanno vantaggio"]},
  {id:"unconscious",name:"Privo di sensi",icon:"💤",effects:["È incapacitato, non può muoversi o parlare, ignaro","Cade prono","Fallisce automaticamente TS su FOR e DES","Tiri per colpire contro hanno vantaggio","Colpi entro 1.5m sono critici automatici"]},
  {id:"exhaustion",name:"Sfinimento",icon:"🔥",effects:["Lv.1: Svantaggio alle prove di abilità","Lv.2: Velocità dimezzata","Lv.3: Svantaggio a tiri attacco e TS","Lv.4: HP massimi dimezzati","Lv.5: Velocità diventa 0","Lv.6: Morte"]},
];

function ConditionCalc() {
  const [active,setActive]=useState([]);
  const toggle=(id)=>setActive(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const allEffects=active.flatMap(id=>{const c=CONDITIONS_DATA.find(x=>x.id===id);return c?c.effects.map(e=>({cond:c.name,icon:c.icon,text:e})):[];});
  // Deduplicate similar effects
  const seen=new Set();const unique=allEffects.filter(e=>{const k=e.text;if(seen.has(k))return false;seen.add(k);return true;});

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"6px",marginBottom:"16px"}}>
        {CONDITIONS_DATA.map(c=>{
          const isActive=active.includes(c.id);
          return (
            <button key={c.id} onClick={()=>toggle(c.id)} style={{
              background:isActive?`${T.redBright}15`:T.bg,
              border:`1px solid ${isActive?T.redBright:T.border}`,borderRadius:"10px",
              padding:"10px 8px",cursor:"pointer",textAlign:"center",
              touchAction:"manipulation",minHeight:"44px",transition:"all .15s",
            }}>
              <div style={{fontSize:"18px",marginBottom:"2px"}}>{c.icon}</div>
              <div style={{fontSize:"11px",color:isActive?T.redBright:T.textDim,fontWeight:isActive?700:400}}>{c.name}</div>
            </button>
          );
        })}
      </div>
      {active.length>0?(
        <Card style={{padding:"16px"}}>
          <div style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"14px",fontWeight:700,marginBottom:"12px"}}>Effetti combinati ({active.length} condizion{active.length===1?"e":"i"})</div>
          {unique.map((e,i)=>(
            <div key={i} style={{display:"flex",gap:"10px",alignItems:"flex-start",padding:"6px 0",borderBottom:i<unique.length-1?`1px solid ${T.border}15`:"none"}}>
              <span style={{fontSize:"14px",flexShrink:0}}>{e.icon}</span>
              <span style={{fontSize:"14px",color:T.text,lineHeight:1.5}}>{e.text}</span>
            </div>
          ))}
        </Card>
      ):(
        <div style={{textAlign:"center",padding:"20px",color:T.textDim,fontSize:"13px",fontStyle:"italic"}}>Seleziona le condizioni attive per vedere gli effetti</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PARTY INVENTORY
// ═══════════════════════════════════════════════════════

function Inventory({settings,characters,onUpdateSettings}) {
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",qty:1,type:"misc",assignedTo:"",notes:""});
  const inventory=settings.inventory||[];
  const gold=settings.gold||{pp:0,gp:0,ep:0,sp:0,cp:0};

  const updateGold=(k,v)=>{const g={...gold,[k]:parseInt(v)||0};onUpdateSettings({gold:g});};
  const addItem=()=>{
    if(!form.name)return;
    const items=[...inventory,{...form,id:`inv-${Date.now()}`}];
    onUpdateSettings({inventory:items});setForm({name:"",qty:1,type:"misc",assignedTo:"",notes:""});setShowAdd(false);
  };
  const removeItem=(id)=>{
    if(!confirm("Rimuovere?"))return;
    onUpdateSettings({inventory:inventory.filter(x=>x.id!==id)});
  };
  const adjustQty=(id,delta)=>{
    const items=inventory.map(x=>x.id===id?{...x,qty:Math.max(0,x.qty+delta)}:x).filter(x=>x.qty>0);
    onUpdateSettings({inventory:items});
  };

  const typeIcons={weapon:"⚔️",armor:"🛡️",potion:"🧪",scroll:"📜",magic:"✨",food:"🍖",tool:"🔧",gem:"💎",misc:"📦"};
  const types=Object.keys(typeIcons);
  const pcs=characters.filter(c=>!c.isDM);

  // Group by type
  const grouped={};inventory.forEach(item=>{const t=item.type||"misc";if(!grouped[t])grouped[t]=[];grouped[t].push(item);});

  // Total gold value in GP
  const totalGp=(gold.pp||0)*10+(gold.gp||0)+(gold.ep||0)*0.5+(gold.sp||0)*0.1+(gold.cp||0)*0.01;

  return (
    <div>
      {/* Gold tracker */}
      <Card style={{padding:"16px",marginBottom:"16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
          <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.gold,fontSize:"16px"}}>💰 Tesoro del Party</span>
          <span style={{fontSize:"13px",color:T.goldDim,fontWeight:600}}>≈ {totalGp.toFixed(1)} GP</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px"}}>
          {[["PP","pp","#c0c0c0"],["GP","gp","#e8c85a"],["EP","ep","#a8c0d0"],["SP","sp","#b0b0b0"],["CP","cp","#c08040"]].map(([label,key,color])=>(
            <div key={key} style={{textAlign:"center"}}>
              <div style={{fontSize:"11px",color,fontWeight:700,marginBottom:"4px"}}>{label}</div>
              <input type="number" value={gold[key]||0} onChange={e=>updateGold(key,e.target.value)} style={{...iS,textAlign:"center",padding:"8px 4px",fontSize:"15px",fontWeight:700,fontFamily:"'Cinzel',serif"}}/>
            </div>
          ))}
        </div>
      </Card>

      {/* Items */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
        <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.text,fontSize:"15px"}}>Oggetti ({inventory.length})</span>
        <button onClick={()=>setShowAdd(!showAdd)} style={{...bP,padding:"8px 16px",fontSize:"13px"}}><I.Plus /> Aggiungi</button>
      </div>

      {/* Add item form */}
      {showAdd&&(
        <Card className="fs" style={{padding:"16px",marginBottom:"14px"}}>
          <FormField label="Nome oggetto" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="es. Pozione di cura"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:"10px"}}>
            <div>
              <div style={{fontSize:"12px",color:T.textDim,marginBottom:"6px",fontWeight:600}}>Tipo</div>
              <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                {types.map(t=>(
                  <button key={t} onClick={()=>setForm(p=>({...p,type:t}))} style={{
                    background:form.type===t?`${T.gold}15`:T.bg,border:`1px solid ${form.type===t?T.goldDim:T.border}`,
                    borderRadius:"8px",padding:"6px 8px",cursor:"pointer",fontSize:"14px",touchAction:"manipulation",minHeight:"36px",
                  }}>{typeIcons[t]}</button>
                ))}
              </div>
            </div>
            <FormField label="Qtà" value={form.qty} type="number" onChange={v=>setForm(p=>({...p,qty:parseInt(v)||1}))}/>
          </div>
          <div style={{marginBottom:"14px"}}>
            <div style={{fontSize:"12px",color:T.textDim,marginBottom:"6px",fontWeight:600}}>Assegna a</div>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              <button onClick={()=>setForm(p=>({...p,assignedTo:""}))} style={{background:!form.assignedTo?`${T.gold}15`:T.bg,border:`1px solid ${!form.assignedTo?T.goldDim:T.border}`,borderRadius:"8px",padding:"6px 12px",fontSize:"12px",color:T.text,cursor:"pointer",touchAction:"manipulation",minHeight:"36px"}}>Party</button>
              {pcs.map(c=><button key={c.id} onClick={()=>setForm(p=>({...p,assignedTo:c.name}))} style={{background:form.assignedTo===c.name?`${T.gold}15`:T.bg,border:`1px solid ${form.assignedTo===c.name?T.goldDim:T.border}`,borderRadius:"8px",padding:"6px 12px",fontSize:"12px",color:T.text,cursor:"pointer",touchAction:"manipulation",minHeight:"36px"}}>{c.name}</button>)}
            </div>
          </div>
          <FormField label="Note" value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="opzionale"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"6px"}}>
            <button onClick={()=>setShowAdd(false)} style={bS}>Annulla</button>
            <button onClick={addItem} disabled={!form.name} style={{...bP,opacity:!form.name?.5:1}}><I.Plus /> Aggiungi</button>
          </div>
        </Card>
      )}

      {/* Item list */}
      {inventory.length===0&&!showAdd&&<div style={{textAlign:"center",padding:"20px",color:T.textDim,fontSize:"13px",fontStyle:"italic"}}>Inventario vuoto</div>}
      {Object.entries(grouped).map(([type,items])=>(
        <div key={type} style={{marginBottom:"12px"}}>
          <div style={{fontSize:"12px",color:T.textDim,fontWeight:600,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"1px"}}>{typeIcons[type]} {type}</div>
          {items.map(item=>(
            <div key={item.id} className="hov" style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"10px",marginBottom:"4px",transition:"background .15s"}}>
              <span style={{fontSize:"18px"}}>{typeIcons[item.type||"misc"]}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"14px",color:T.textBright,fontWeight:600}}>{item.name}{item.qty>1&&<span style={{color:T.goldDim,fontWeight:400}}> ×{item.qty}</span>}</div>
                {item.assignedTo&&<div style={{fontSize:"11px",color:T.blueBright}}>→ {item.assignedTo}</div>}
                {item.notes&&<div style={{fontSize:"11px",color:T.textDim,fontStyle:"italic"}}>{item.notes}</div>}
              </div>
              <div style={{display:"flex",gap:"4px",flexShrink:0}}>
                <button onClick={()=>adjustQty(item.id,-1)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"4px 8px",color:T.textDim,cursor:"pointer",minHeight:"32px",touchAction:"manipulation"}}>−</button>
                <button onClick={()=>adjustQty(item.id,1)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"4px 8px",color:T.textDim,cursor:"pointer",minHeight:"32px",touchAction:"manipulation"}}>+</button>
                <IconBtn icon={<I.Trash s={14}/>} onClick={()=>removeItem(item.id)} danger/>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SessionEntry({session,onDelete}) {
  return (
    <Card style={{marginBottom:"12px"}}>
      <div style={{padding:"18px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:"10px",flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.gold,fontSize:"16px"}}>Sessione #{session.number}</span>
            <span style={{color:T.textDim,fontSize:"13px"}}>{session.date}</span>
          </div>
          <IconBtn icon={<I.Trash />} onClick={()=>onDelete(session.id)} danger />
        </div>
        {session.title&&<div style={{fontSize:"17px",color:T.textBright,fontWeight:600,marginBottom:"8px"}}>{session.title}</div>}
        {session.location&&<div style={{fontSize:"13px",color:T.blueBright,marginBottom:"8px",display:"flex",alignItems:"center",gap:"4px"}}>📍 {session.location}</div>}
        <div style={{fontSize:"15px",color:T.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{session.summary}</div>
        {(session.loot||session.xp)&&<div style={{borderTop:`1px solid ${T.border}`,marginTop:"12px",paddingTop:"10px",display:"flex",gap:"16px",flexWrap:"wrap"}}>
          {session.loot&&<span style={{fontSize:"13px",color:T.goldBright}}>💰 {session.loot}</span>}
          {session.xp&&<span style={{fontSize:"13px",color:T.greenBright}}>⭐ XP: {session.xp}</span>}
        </div>}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// REF ITEM
// ═══════════════════════════════════════════════════════

function RefItem({title,items}) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{background:T.bg,borderRadius:"12px",border:`1px solid ${T.border}`,overflow:"hidden"}}>
      <button onClick={()=>setOpen(!open)} style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:"14px 16px",color:T.text,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'Cinzel',serif",fontSize:"14px",fontWeight:600,minHeight:"48px",touchAction:"manipulation"}}>
        {title}
        <span style={{color:T.textDim,transform:open?"rotate(90deg)":"none",transition:"transform .2s",display:"inline-block"}}>▸</span>
      </button>
      {open&&<div style={{padding:"0 16px 14px"}}>{items.map((item,i)=><div key={i} style={{fontSize:"13px",color:T.textDim,padding:"5px 0",borderTop:i>0?`1px solid ${T.border}22`:"none"}}>{item}</div>)}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SETUP GUIDE
// ═══════════════════════════════════════════════════════

function SetupGuide() {
  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <style>{CSS}</style>
      <div style={{maxWidth:"500px",width:"100%",textAlign:"center"}}>
        <div style={{fontSize:"56px",marginBottom:"12px"}}>⚡</div>
        <h1 style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"28px",marginBottom:"8px"}}>Time of Troubles</h1>
        <p style={{color:T.textDim,fontStyle:"italic",marginBottom:"32px"}}>Configurazione Firebase necessaria</p>
        <Card style={{padding:"28px",textAlign:"left"}}>
          <p style={{fontSize:"15px",color:T.text,lineHeight:1.8}}>
            Segui le istruzioni nel <span style={{color:T.gold,fontWeight:600}}>README.md</span> del progetto per configurare Firebase e le variabili d'ambiente.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DM SCREEN — Vista panoramica party + reference
// ═══════════════════════════════════════════════════════

const DC_TABLE = [
  {dc:5,diff:"Molto facile",desc:"Chiunque ci riesce"},
  {dc:10,diff:"Facile",desc:"Lieve sfida"},
  {dc:15,diff:"Media",desc:"Richiede competenza"},
  {dc:20,diff:"Difficile",desc:"Richiede talento"},
  {dc:25,diff:"Molto difficile",desc:"Solo i migliori"},
  {dc:30,diff:"Quasi impossibile",desc:"Impresa leggendaria"},
];

const COVER_TABLE = [{type:"Mezza",ac:"+2 CA, +2 TS DES"},{type:"Tre quarti",ac:"+5 CA, +5 TS DES"},{type:"Totale",ac:"Non bersagliabile"}];

const LIGHT_TABLE = [
  {type:"Luce intensa",eff:"Visione normale"},
  {type:"Luce fioca",eff:"Percezione con svantaggio (vista)"},
  {type:"Oscurità",eff:"Accecato di fatto"},
];

function DMScreen({characters,settings,onUpdateSettings}) {
  const pcs=characters.filter(c=>!c.isDM);
  const [notes,setNotes]=useState(settings.dmNotes||"");
  const [notesDirty,setNotesDirty]=useState(false);
  const saveTimer=useRef(null);

  const handleNotesChange=(v)=>{
    setNotes(v);setNotesDirty(true);
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>{onUpdateSettings({dmNotes:v});setNotesDirty(false);},1500);
  };

  // Passives calc
  const getPassive=(char,statIdx)=>{
    const stat=char.stats?.[statIdx]??10;
    const mod=Math.floor((stat-10)/2);
    const prof=Math.ceil((char.level||1)/4)+1; // approx proficiency
    return 10+mod+prof; // assumes proficiency (DM can adjust mentally)
  };

  return (
    <div>
      {/* ─── Party Overview Grid ─── */}
      <Card style={{marginBottom:"14px",overflow:"visible"}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`}}>
          <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"15px",color:T.gold}}>👁️ Party a Colpo d'Occhio</span>
        </div>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:"520px"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${T.border}`}}>
                {["PG","HP","CA","Perc.P","Inv.P","Intu.P","CD Inc.","Vel."].map(h=>(
                  <th key={h} style={{padding:"10px 8px",fontSize:"11px",color:T.textDim,fontWeight:700,textAlign:"center",letterSpacing:".5px",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pcs.map(char=>{
                const accent=CLASS_COLORS[char.class]||T.gold;
                const hp=char.hp||0;const maxHp=char.maxHp||1;
                const pct=Math.round((hp/maxHp)*100);
                const hpCol=pct>50?T.greenBright:pct>25?"#e8a33a":T.redBright;
                const ppPerc=getPassive(char,4); // SAG
                const ppInv=getPassive(char,3);   // INT
                const ppIntu=getPassive(char,4);  // SAG (Intuizione)
                const cha=char.stats?.[5]??10;
                const spellDC=8+Math.ceil((char.level||1)/4)+1+Math.floor((cha-10)/2);
                return (
                  <tr key={char.id} style={{borderBottom:`1px solid ${T.border}15`}}>
                    <td style={{padding:"10px 8px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <div style={{width:"6px",height:"24px",borderRadius:"3px",background:accent,flexShrink:0}}/>
                        <div>
                          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"13px",color:T.textBright,whiteSpace:"nowrap"}}>{char.name}</div>
                          <div style={{fontSize:"11px",color:T.textDim}}>{char.class} {char.level}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{textAlign:"center",padding:"8px"}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:"4px"}}>
                        <div style={{width:"36px",height:"6px",borderRadius:"3px",background:T.bg,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:hpCol,borderRadius:"3px"}}/>
                        </div>
                        <span style={{fontWeight:700,fontSize:"13px",color:hpCol,fontFamily:"'Cinzel',serif"}}>{hp}<span style={{color:T.textDim,fontWeight:400}}>/{maxHp}</span></span>
                      </div>
                    </td>
                    <td style={{textAlign:"center",fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:"16px",color:T.blueBright}}>{char.ac}</td>
                    <td style={{textAlign:"center",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"14px",color:T.text}}>{ppPerc}</td>
                    <td style={{textAlign:"center",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"14px",color:T.text}}>{ppInv}</td>
                    <td style={{textAlign:"center",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"14px",color:T.text}}>{ppIntu}</td>
                    <td style={{textAlign:"center",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"14px",color:T.gold}}>{["Paladino","Chierico","Mago","Bardo","Druido","Stregone","Warlock","Ranger"].includes(char.class)?spellDC:"—"}</td>
                    <td style={{textAlign:"center",fontSize:"13px",color:T.text}}>9m</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!pcs.length&&<div style={{padding:"20px",textAlign:"center",color:T.textDim,fontSize:"13px",fontStyle:"italic"}}>Nessun PG nel party</div>}
      </Card>

      {/* ─── Quick Ref Tables (2-col on desktop) ─── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:"12px",marginBottom:"14px"}}>
        {/* CD Prove */}
        <Card style={{padding:"14px"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.gold,fontSize:"13px",marginBottom:"10px"}}>🎯 Difficoltà Prove (CD)</div>
          {DC_TABLE.map(d=>(
            <div key={d.dc} style={{display:"flex",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border}10`}}>
              <span style={{fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:"16px",color:T.goldBright,minWidth:"32px"}}>{d.dc}</span>
              <span style={{fontSize:"13px",color:T.textBright,fontWeight:600,minWidth:"100px"}}>{d.diff}</span>
              <span style={{fontSize:"12px",color:T.textDim,fontStyle:"italic"}}>{d.desc}</span>
            </div>
          ))}
        </Card>

        {/* Copertura + Luce */}
        <Card style={{padding:"14px"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.gold,fontSize:"13px",marginBottom:"10px"}}>🛡️ Copertura</div>
          {COVER_TABLE.map(c=>(
            <div key={c.type} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}10`}}>
              <span style={{fontSize:"13px",color:T.textBright,fontWeight:600}}>{c.type}</span>
              <span style={{fontSize:"13px",color:T.text}}>{c.ac}</span>
            </div>
          ))}
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.gold,fontSize:"13px",marginTop:"14px",marginBottom:"10px"}}>💡 Illuminazione</div>
          {LIGHT_TABLE.map(l=>(
            <div key={l.type} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}10`}}>
              <span style={{fontSize:"13px",color:T.textBright,fontWeight:600}}>{l.type}</span>
              <span style={{fontSize:"12px",color:T.textDim}}>{l.eff}</span>
            </div>
          ))}
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.gold,fontSize:"13px",marginTop:"14px",marginBottom:"10px"}}>💨 Caduta</div>
          <div style={{fontSize:"13px",color:T.text}}>1d6 danni per 3m (max 20d6)</div>
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.gold,fontSize:"13px",marginTop:"14px",marginBottom:"10px"}}>🫁 Soffocamento</div>
          <div style={{fontSize:"13px",color:T.text}}>1 + mod COS minuti trattenere, poi COS round, poi 0 HP</div>
        </Card>
      </div>

      {/* ─── DM Scratchpad ─── */}
      <Card style={{padding:"14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.gold,fontSize:"13px"}}>📝 Appunti di Sessione</span>
          <span style={{fontSize:"11px",color:notesDirty?T.goldDim:T.greenBright}}>{notesDirty?"Salvando...":"✓ Salvato"}</span>
        </div>
        <textarea
          value={notes}
          onChange={e=>handleNotesChange(e.target.value)}
          placeholder="Note rapide, HP dei nemici, CD improvvisate, cose da ricordare..."
          style={{...iS,minHeight:"120px",resize:"vertical",fontSize:"14px",lineHeight:1.6,fontFamily:"'Crimson Text',serif"}}
        />
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// QUICK STAT BLOCK — Monster/NPC stat creator
// ═══════════════════════════════════════════════════════

const CR_PRESETS = [
  {cr:"1/4",prof:2,hp:20,ac:12,atk:3,dmg:"1d6+1",dc:11},
  {cr:"1/2",prof:2,hp:32,ac:13,atk:4,dmg:"1d8+2",dc:12},
  {cr:"1",prof:2,hp:45,ac:13,atk:5,dmg:"1d10+3",dc:13},
  {cr:"2",prof:2,hp:60,ac:14,atk:5,dmg:"2d6+3",dc:13},
  {cr:"3",prof:2,hp:75,ac:15,atk:6,dmg:"2d8+3",dc:14},
  {cr:"4",prof:2,hp:90,ac:15,atk:6,dmg:"2d8+4",dc:14},
  {cr:"5",prof:3,hp:110,ac:16,atk:7,dmg:"2d10+4",dc:15},
  {cr:"8",prof:3,hp:150,ac:17,atk:8,dmg:"3d8+5",dc:16},
  {cr:"10",prof:4,hp:180,ac:18,atk:9,dmg:"3d10+5",dc:17},
  {cr:"15",prof:5,hp:230,ac:19,atk:11,dmg:"4d8+6",dc:18},
  {cr:"20",prof:6,hp:300,ac:20,atk:13,dmg:"4d10+7",dc:20},
];

function QuickStatBlock({settings,onUpdateSettings}) {
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({name:"",cr:"1",hp:45,maxHp:45,ac:13,atk:"+5",dmg:"1d10+3",speed:"9m",dc:13,traits:"",actions:"",notes:""});
  const monsters=settings.monsters||[];

  const applyCR=(crStr)=>{
    const preset=CR_PRESETS.find(p=>p.cr===crStr);
    if(preset){
      setForm(p=>({...p,cr:crStr,hp:preset.hp,maxHp:preset.hp,ac:preset.ac,atk:`+${preset.atk}`,dmg:preset.dmg,dc:preset.dc}));
    }
  };

  const addMonster=()=>{
    if(!form.name)return;
    const m=[...monsters,{...form,id:`mon-${Date.now()}`,currentHp:form.hp}];
    onUpdateSettings({monsters:m});
    setForm({name:"",cr:"1",hp:45,maxHp:45,ac:13,atk:"+5",dmg:"1d10+3",speed:"9m",dc:13,traits:"",actions:"",notes:""});
    setShowForm(false);
  };

  const removeMonster=(id)=>{onUpdateSettings({monsters:monsters.filter(m=>m.id!==id)});};

  const adjustMonsterHp=(id,delta)=>{
    const m=monsters.map(mon=>mon.id===id?{...mon,currentHp:Math.max(0,Math.min((mon.currentHp??mon.hp)+delta,mon.hp))}:mon);
    onUpdateSettings({monsters:m});
  };

  const setMonsterHp=(id,val)=>{
    const v=parseInt(val)||0;
    const m=monsters.map(mon=>mon.id===id?{...mon,currentHp:Math.max(0,Math.min(v,mon.hp))}:mon);
    onUpdateSettings({monsters:m});
  };

  const dupMonster=(mon)=>{
    const copy={...mon,id:`mon-${Date.now()}`,name:`${mon.name} #${monsters.filter(m=>m.name.startsWith(mon.name.split(" #")[0])).length+1}`,currentHp:mon.hp};
    onUpdateSettings({monsters:[...monsters,copy]});
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:T.text,fontSize:"15px"}}>Mostri attivi ({monsters.length})</span>
        <button onClick={()=>setShowForm(!showForm)} style={{...bP,padding:"8px 16px",fontSize:"13px"}}><I.Plus /> Crea Mostro</button>
      </div>

      {/* ─── Creation Form ─── */}
      {showForm&&(
        <Card className="fs" style={{padding:"16px",marginBottom:"14px",borderTop:`2px solid ${T.redBright}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
            <h3 style={{fontFamily:"'Cinzel',serif",color:T.redBright,fontSize:"16px",margin:0}}>💀 Nuovo Mostro</h3>
          </div>

          <FormField label="Nome" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="es. Goblin Capitano"/>

          {/* CR Presets */}
          <div style={{marginBottom:"14px"}}>
            <div style={{fontSize:"12px",color:T.textDim,marginBottom:"6px",fontWeight:600}}>Grado Sfida (pre-fill stats)</div>
            <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
              {CR_PRESETS.map(p=>(
                <button key={p.cr} onClick={()=>applyCR(p.cr)} style={{
                  background:form.cr===p.cr?`${T.redBright}20`:T.bg,
                  border:`1px solid ${form.cr===p.cr?T.redBright:T.border}`,borderRadius:"8px",
                  padding:"6px 10px",fontSize:"12px",color:form.cr===p.cr?T.redBright:T.textDim,
                  fontFamily:"'Cinzel',serif",fontWeight:700,cursor:"pointer",touchAction:"manipulation",minHeight:"34px",
                }}>GS {p.cr}</button>
              ))}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"10px"}}>
            <FormField label="HP" value={form.hp} type="number" onChange={v=>{const n=parseInt(v)||1;setForm(p=>({...p,hp:n,maxHp:n}));}}/>
            <FormField label="CA" value={form.ac} type="number" onChange={v=>setForm(p=>({...p,ac:parseInt(v)||10}))}/>
            <FormField label="Attacco" value={form.atk} onChange={v=>setForm(p=>({...p,atk:v}))} placeholder="+5"/>
            <FormField label="Danno" value={form.dmg} onChange={v=>setForm(p=>({...p,dmg:v}))} placeholder="2d6+3"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <FormField label="Velocità" value={form.speed} onChange={v=>setForm(p=>({...p,speed:v}))} placeholder="9m"/>
            <FormField label="CD Abilità" value={form.dc} type="number" onChange={v=>setForm(p=>({...p,dc:parseInt(v)||10}))}/>
          </div>
          <FormField label="Tratti / Abilità speciali" value={form.traits} onChange={v=>setForm(p=>({...p,traits:v}))} multiline placeholder="es. Scurovisione 18m, Agguato (vantaggio se nascosto)"/>
          <FormField label="Azioni" value={form.actions} onChange={v=>setForm(p=>({...p,actions:v}))} multiline placeholder="es. Multiattacco (2 fendenti). Fendente: +5, 1d8+3 taglienti"/>
          <FormField label="Note DM" value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="Tattiche, comportamento, tesoro..."/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"6px"}}>
            <button onClick={()=>setShowForm(false)} style={bS}>Annulla</button>
            <button onClick={addMonster} disabled={!form.name} style={{...bP,opacity:!form.name?.5:1,background:`linear-gradient(135deg,${T.red},${T.redBright})`}}><I.Skull /> Crea</button>
          </div>
        </Card>
      )}

      {/* ─── Active Monsters ─── */}
      {monsters.length===0&&!showForm&&<div style={{textAlign:"center",padding:"24px",color:T.textDim,fontSize:"13px",fontStyle:"italic"}}>Nessun mostro — crea il primo per iniziare il combattimento</div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,320px),1fr))",gap:"10px"}}>
        {monsters.map(mon=>{
          const hp=mon.currentHp??mon.hp;
          const pct=Math.round((hp/mon.hp)*100);
          const hpCol=pct>50?T.greenBright:pct>25?"#e8a33a":T.redBright;
          const isDead=hp<=0;
          return (
            <Card key={mon.id} style={{borderTop:`3px solid ${isDead?T.textDim:T.redBright}`,opacity:isDead?.5:1,transition:"opacity .3s"}}>
              <div style={{padding:"14px 16px"}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
                  <div>
                    <div style={{fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:"16px",color:isDead?T.textDim:T.textBright,textDecoration:isDead?"line-through":"none"}}>{mon.name}</div>
                    <div style={{fontSize:"12px",color:T.textDim}}>GS {mon.cr}</div>
                  </div>
                  <div style={{display:"flex",gap:"4px"}}>
                    <button onClick={()=>dupMonster(mon)} title="Duplica" style={{background:"none",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"6px 8px",cursor:"pointer",color:T.textDim,fontSize:"12px",touchAction:"manipulation",minHeight:"32px"}}>📋</button>
                    <IconBtn icon={<I.Trash s={14}/>} onClick={()=>removeMonster(mon.id)} danger/>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{display:"flex",gap:"8px",marginBottom:"10px",flexWrap:"wrap"}}>
                  <span style={{background:`${T.blueBright}12`,border:`1px solid ${T.blueBright}25`,borderRadius:"8px",padding:"4px 10px",fontSize:"12px",color:T.blueBright,fontWeight:700}}>CA {mon.ac}</span>
                  <span style={{background:`${T.redBright}12`,border:`1px solid ${T.redBright}25`,borderRadius:"8px",padding:"4px 10px",fontSize:"12px",color:T.redBright,fontWeight:700}}>Atk {mon.atk}</span>
                  <span style={{background:`${T.gold}12`,border:`1px solid ${T.gold}25`,borderRadius:"8px",padding:"4px 10px",fontSize:"12px",color:T.gold,fontWeight:700}}>Dmg {mon.dmg}</span>
                  {mon.dc&&<span style={{background:`${T.gold}08`,border:`1px solid ${T.border}`,borderRadius:"8px",padding:"4px 10px",fontSize:"12px",color:T.text}}>CD {mon.dc}</span>}
                  {mon.speed&&<span style={{background:`${T.gold}08`,border:`1px solid ${T.border}`,borderRadius:"8px",padding:"4px 10px",fontSize:"12px",color:T.text}}>{mon.speed}</span>}
                </div>

                {/* HP Bar + controls */}
                <div style={{marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                    <span style={{fontSize:"11px",color:T.textDim,fontWeight:600}}>HP</span>
                    <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:"14px",color:hpCol}}>{hp}<span style={{color:T.textDim}}>/{mon.hp}</span></span>
                  </div>
                  <div style={{height:"8px",background:T.bg,borderRadius:"4px",overflow:"hidden",border:`1px solid ${T.border}`}}>
                    <div style={{height:"100%",width:`${pct}%`,background:hpCol,borderRadius:"3px",transition:"width .3s, background .3s"}}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:"4px",justifyContent:"center",alignItems:"center"}}>
                  {[-10,-5,-1].map(d=><button key={d} onClick={()=>adjustMonsterHp(mon.id,d)} style={{background:`${T.redBright}10`,border:`1px solid ${T.redBright}22`,borderRadius:"8px",padding:"6px 10px",color:T.redBright,fontSize:"12px",fontWeight:700,cursor:"pointer",minHeight:"36px",touchAction:"manipulation"}}>{d}</button>)}
                  <input value={hp} onChange={e=>setMonsterHp(mon.id,e.target.value)} style={{...iS,width:"50px",textAlign:"center",padding:"6px",fontSize:"14px",fontWeight:700,fontFamily:"'Cinzel',serif"}}/>
                  {[1,5,10].map(d=><button key={d} onClick={()=>adjustMonsterHp(mon.id,d)} style={{background:`${T.greenBright}10`,border:`1px solid ${T.greenBright}22`,borderRadius:"8px",padding:"6px 10px",color:T.greenBright,fontSize:"12px",fontWeight:700,cursor:"pointer",minHeight:"36px",touchAction:"manipulation"}}>+{d}</button>)}
                </div>

                {/* Traits / Actions */}
                {mon.traits&&<div style={{marginTop:"10px",padding:"8px 10px",background:T.bg,borderRadius:"8px",fontSize:"13px",color:T.text,lineHeight:1.5,whiteSpace:"pre-wrap",borderLeft:`3px solid ${T.gold}44`}}>{mon.traits}</div>}
                {mon.actions&&<div style={{marginTop:"6px",padding:"8px 10px",background:T.bg,borderRadius:"8px",fontSize:"13px",color:T.text,lineHeight:1.5,whiteSpace:"pre-wrap",borderLeft:`3px solid ${T.redBright}44`}}>{mon.actions}</div>}
                {mon.notes&&<div style={{marginTop:"6px",fontSize:"12px",color:T.textDim,fontStyle:"italic"}}>{mon.notes}</div>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COMBAT TAB (with sub-navigation)
// ═══════════════════════════════════════════════════════

function CombatTab({characters,onSaveChar}) {
  const [sub,setSub]=useState("hp");
  const subs=[
    {id:"hp",label:"HP",icon:"♥"},
    {id:"init",label:"Iniziativa",icon:"⚡"},
    {id:"spells",label:"Slot",icon:"✨"},
    {id:"cond",label:"Condizioni",icon:"💀"},
    {id:"dice",label:"Dadi",icon:"🎲"},
  ];
  return (
    <div>
      {/* Sub-tab navigation */}
      <div style={{display:"flex",gap:"4px",marginBottom:"20px",overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:"4px"}}>
        {subs.map(s=>(
          <button key={s.id} onClick={()=>setSub(s.id)} style={{
            display:"flex",alignItems:"center",gap:"6px",padding:"10px 16px",
            background:sub===s.id?`${T.gold}15`:"transparent",
            border:`1px solid ${sub===s.id?T.goldDim:T.border}`,borderRadius:"100px",
            color:sub===s.id?T.gold:T.textDim,fontSize:"13px",fontFamily:"'Cinzel',serif",fontWeight:sub===s.id?700:500,
            cursor:"pointer",whiteSpace:"nowrap",touchAction:"manipulation",minHeight:"42px",
            transition:"all .15s",
          }}>{s.icon} {s.label}</button>
        ))}
      </div>
      {sub==="hp"&&<HPTracker characters={characters} onSaveChar={onSaveChar}/>}
      {sub==="init"&&<InitiativeTracker characters={characters}/>}
      {sub==="spells"&&<SpellSlotTracker characters={characters} onSaveChar={onSaveChar}/>}
      {sub==="cond"&&<ConditionCalc/>}
      {sub==="dice"&&<DiceRoller/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// AMBIENT SOUNDBOARD — Procedural audio engine
// ═══════════════════════════════════════════════════════

class AmbientEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.nodes = [];
    this.volume = 0.5;
    this.active = null;
    this.fading = false;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  stop() {
    this.nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} });
    this.nodes = [];
    this.active = null;
  }

  // Noise buffer generator
  makeNoise(seconds = 2) {
    const len = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Looping noise source
  noiseLoop(filterType, freq, q = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.makeNoise(2);
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.master);
    src.start();
    this.nodes.push(src, filt, gain);
    return { src, filt, gain };
  }

  // LFO for modulation
  lfo(freq, min, max, param) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    g.gain.value = (max - min) / 2;
    osc.connect(g);
    g.connect(param);
    param.value = (max + min) / 2;
    osc.start();
    this.nodes.push(osc, g);
    return osc;
  }

  // Periodic random event (thunder, drip, creak)
  randomEvent(fn, minMs, maxMs) {
    const schedule = () => {
      if (!this.active) return;
      fn();
      const next = minMs + Math.random() * (maxMs - minMs);
      const timer = setTimeout(schedule, next);
      this.nodes.push({ stop: () => clearTimeout(timer), disconnect: () => {} });
    };
    const init = setTimeout(schedule, minMs / 2);
    this.nodes.push({ stop: () => clearTimeout(init), disconnect: () => {} });
  }

  // ─── MOOD GENERATORS ───

  rain() {
    // Steady rain: bandpass filtered noise
    const r = this.noiseLoop("bandpass", 3000, 0.8);
    r.gain.gain.value = 0.4;
    // High shimmer
    const h = this.noiseLoop("highpass", 6000, 0.5);
    h.gain.gain.value = 0.08;
    // Low body
    const lo = this.noiseLoop("lowpass", 800, 0.3);
    lo.gain.gain.value = 0.12;
    // Subtle variation
    this.lfo(0.15, 2500, 3500, r.filt.frequency);
  }

  wind() {
    const w = this.noiseLoop("lowpass", 400, 2);
    w.gain.gain.value = 0.3;
    this.lfo(0.08, 200, 800, w.filt.frequency);
    // Gusts
    const g = this.noiseLoop("bandpass", 1200, 3);
    g.gain.gain.value = 0.05;
    this.lfo(0.04, 0.01, 0.15, g.gain.gain);
  }

  thunder() {
    const burst = () => {
      const dur = 1.5 + Math.random() * 2;
      const buf = this.makeNoise(dur);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 100 + Math.random() * 200;
      const g = this.ctx.createGain();
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.4, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      src.start();
      src.stop(now + dur);
    };
    this.randomEvent(burst, 8000, 25000);
  }

  fire() {
    // Crackling: filtered noise with random amplitude
    const f = this.noiseLoop("bandpass", 2000, 2);
    f.gain.gain.value = 0.15;
    this.lfo(8, 0.05, 0.25, f.gain.gain);
    // Low roar
    const lo = this.noiseLoop("lowpass", 300, 1);
    lo.gain.gain.value = 0.1;
    this.lfo(0.3, 0.05, 0.15, lo.gain.gain);
    // Pops
    const pop = () => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.value = 800 + Math.random() * 2000;
      osc.type = "sine";
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(g);
      g.connect(this.master);
      osc.start();
      osc.stop(now + 0.06);
    };
    this.randomEvent(pop, 200, 1200);
  }

  dripping() {
    const drip = () => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const freq = 1500 + Math.random() * 2000;
      osc.frequency.value = freq;
      osc.type = "sine";
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.3);
      osc.connect(g);
      g.connect(this.master);
      osc.start();
      osc.stop(now + 0.35);
    };
    this.randomEvent(drip, 1500, 5000);
  }

  drone(baseFreq = 55) {
    // Deep ominous drone
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc1.frequency.value = baseFreq;
    osc2.frequency.value = baseFreq * 1.005; // slight detune for beating
    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    g.gain.value = 0.06;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 200;
    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    osc1.start();
    osc2.start();
    this.lfo(0.05, 0.03, 0.08, g.gain);
    this.nodes.push(osc1, osc2, lp, g);
  }

  heartbeat(bpm = 70) {
    const interval = (60 / bpm) * 1000;
    const beat = () => {
      [0, 0.12].forEach(delay => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.frequency.value = delay === 0 ? 50 : 40;
        osc.type = "sine";
        const now = this.ctx.currentTime + delay;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(delay === 0 ? 0.15 : 0.1, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.25);
      });
    };
    this.randomEvent(beat, interval, interval);
  }

  crickets() {
    const chirp = () => {
      const f = 4000 + Math.random() * 3000;
      const count = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.frequency.value = f + Math.random() * 200;
        osc.type = "sine";
        const now = this.ctx.currentTime + i * 0.06;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.015, now + 0.01);
        g.gain.linearRampToValueAtTime(0, now + 0.04);
        osc.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    };
    this.randomEvent(chirp, 800, 3000);
  }

  waves() {
    const w = this.noiseLoop("lowpass", 500, 1.5);
    w.gain.gain.value = 0.2;
    this.lfo(0.07, 0.05, 0.35, w.gain.gain);
    this.lfo(0.07, 200, 800, w.filt.frequency);
    // Foam/hiss on high
    const h = this.noiseLoop("highpass", 4000, 0.5);
    h.gain.gain.value = 0.02;
    this.lfo(0.07, 0.0, 0.06, h.gain.gain);
  }

  // ─── MOOD PRESETS ───
  play(moodId) {
    this.init();
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.stop();
    this.active = moodId;
    const moods = {
      storm:    () => { this.rain(); this.wind(); this.thunder(); },
      rain:     () => { this.rain(); this.wind(); },
      tavern:   () => { this.fire(); this.drone(110); },
      forest:   () => { this.wind(); this.crickets(); },
      dungeon:  () => { this.dripping(); this.drone(45); },
      combat:   () => { this.drone(55); this.heartbeat(90); },
      tension:  () => { this.drone(40); this.heartbeat(60); },
      ocean:    () => { this.waves(); this.wind(); },
      night:    () => { this.crickets(); this.wind(); },
      campfire: () => { this.fire(); this.wind(); this.crickets(); },
      cave:     () => { this.dripping(); this.drone(35); this.wind(); },
      ritual:   () => { this.drone(50); this.drone(75); this.heartbeat(40); },
    };
    moods[moodId]?.();
  }
}

const MOODS = [
  { id: "storm",    name: "Tempesta",    icon: "⛈️",  desc: "Pioggia, vento e tuoni", color: "#5080b8" },
  { id: "rain",     name: "Pioggia",     icon: "🌧️",  desc: "Pioggia costante e vento leggero", color: "#6090a0" },
  { id: "tavern",   name: "Taverna",     icon: "🍺",  desc: "Fuoco crepitante e calore", color: "#c49a3c" },
  { id: "forest",   name: "Foresta",     icon: "🌲",  desc: "Brezza e suoni della natura", color: "#5fa05f" },
  { id: "campfire", name: "Bivacco",     icon: "🔥",  desc: "Fuoco sotto le stelle", color: "#e88a30" },
  { id: "dungeon",  name: "Dungeon",     icon: "🏚️",  desc: "Gocce e oscurità opprimente", color: "#7a6a8c" },
  { id: "cave",     name: "Caverna",     icon: "🦇",  desc: "Eco, acqua, vento sotterraneo", color: "#6a6a7a" },
  { id: "combat",   name: "Combattimento", icon: "⚔️", desc: "Tensione e battito accelerato", color: "#c45050" },
  { id: "tension",  name: "Tensione",    icon: "😰",  desc: "Suspense e inquietudine", color: "#9c3a3a" },
  { id: "ocean",    name: "Oceano",      icon: "🌊",  desc: "Onde e vento marino", color: "#4080a0" },
  { id: "night",    name: "Notte",       icon: "🌙",  desc: "Grilli e brezza notturna", color: "#3a4a6c" },
  { id: "ritual",   name: "Rituale",     icon: "🕯️",  desc: "Droni profondi e pulsazioni oscure", color: "#6a3a6a" },
];

function Soundboard() {
  const engineRef = useRef(null);
  const [playing, setPlaying] = useState(null);
  const [vol, setVol] = useState(50);

  if (!engineRef.current) engineRef.current = new AmbientEngine();
  const engine = engineRef.current;

  const handlePlay = (moodId) => {
    if (playing === moodId) {
      engine.stop();
      setPlaying(null);
    } else {
      engine.play(moodId);
      setPlaying(moodId);
    }
  };

  const handleVol = (v) => {
    setVol(v);
    engine.setVolume(v / 100);
  };

  const handleStop = () => {
    engine.stop();
    setPlaying(null);
  };

  // Cleanup on unmount
  useEffect(() => () => { engineRef.current?.stop(); }, []);

  const activeMood = MOODS.find(m => m.id === playing);

  return (
    <div>
      {/* Now playing bar */}
      {activeMood && (
        <Card className="fi" style={{ padding: "14px 18px", marginBottom: "16px", borderLeft: `3px solid ${activeMood.color}`, background: `${activeMood.color}08` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px",
                background: `${activeMood.color}22`, border: `1px solid ${activeMood.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px",
              }}>
                <span style={{ animation: "pulse 2s ease-in-out infinite" }}>{activeMood.icon}</span>
              </div>
              <div>
                <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: "15px", color: activeMood.color }}>
                  {activeMood.name}
                </div>
                <div style={{ fontSize: "12px", color: T.textDim }}>In riproduzione</div>
              </div>
            </div>
            <button onClick={handleStop} style={{
              ...bS, padding: "8px 16px", fontSize: "12px", color: T.redBright, borderColor: `${T.redBright}44`,
            }}>■ Stop</button>
          </div>
        </Card>
      )}

      {/* Volume */}
      <Card style={{ padding: "14px 18px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "14px" }}>🔈</span>
          <input
            type="range" min="0" max="100" value={vol}
            onChange={e => handleVol(parseInt(e.target.value))}
            style={{
              flex: 1, height: "6px", WebkitAppearance: "none", background: `linear-gradient(to right, ${T.gold} 0%, ${T.gold} ${vol}%, ${T.border} ${vol}%, ${T.border} 100%)`,
              borderRadius: "3px", outline: "none", cursor: "pointer",
            }}
          />
          <span style={{ fontSize: "14px" }}>🔊</span>
          <span style={{ fontSize: "12px", color: T.textDim, minWidth: "32px", textAlign: "right", fontFamily: "'Cinzel',serif" }}>{vol}%</span>
        </div>
      </Card>

      {/* Mood grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(48%,160px),1fr))", gap: "10px" }}>
        {MOODS.map(mood => {
          const isActive = playing === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => handlePlay(mood.id)}
              className={isActive ? "" : "hov"}
              style={{
                background: isActive ? `${mood.color}15` : T.card,
                border: `1px solid ${isActive ? mood.color : T.border}`,
                borderRadius: "14px", padding: "16px 14px", cursor: "pointer",
                textAlign: "left", position: "relative", overflow: "hidden",
                touchAction: "manipulation", minHeight: "80px",
                transition: "all .2s", outline: isActive ? `2px solid ${mood.color}44` : "none",
              }}
            >
              {isActive && (
                <div style={{
                  position: "absolute", top: "8px", right: "10px",
                  width: "8px", height: "8px", borderRadius: "50%", background: mood.color,
                  boxShadow: `0 0 8px ${mood.color}`,
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              )}
              <div style={{ fontSize: "28px", marginBottom: "6px" }}>{mood.icon}</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: "13px", color: isActive ? mood.color : T.text, marginBottom: "2px" }}>
                {mood.name}
              </div>
              <div style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.3 }}>{mood.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: "16px", fontSize: "12px", color: T.textDim, fontStyle: "italic" }}>
        Audio generato in tempo reale — collega il dispositivo alle casse per la sessione
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DM TAB (with sub-navigation)
// ═══════════════════════════════════════════════════════

function DMTab({characters,settings,onUpdateSettings}) {
  const [sub,setSub]=useState("screen");
  const subs=[
    {id:"screen",label:"DM Screen",icon:"👁️"},
    {id:"monsters",label:"Mostri",icon:"💀"},
    {id:"sound",label:"Atmosfera",icon:"🎵"},
  ];
  return (
    <div>
      <div style={{display:"flex",gap:"4px",marginBottom:"20px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {subs.map(s=>(
          <button key={s.id} onClick={()=>setSub(s.id)} style={{
            display:"flex",alignItems:"center",gap:"6px",padding:"10px 16px",
            background:sub===s.id?`${T.gold}15`:"transparent",
            border:`1px solid ${sub===s.id?T.goldDim:T.border}`,borderRadius:"100px",
            color:sub===s.id?T.gold:T.textDim,fontSize:"13px",fontFamily:"'Cinzel',serif",fontWeight:sub===s.id?700:500,
            cursor:"pointer",whiteSpace:"nowrap",touchAction:"manipulation",minHeight:"42px",
            transition:"all .15s",
          }}>{s.icon} {s.label}</button>
        ))}
      </div>
      {sub==="screen"&&<DMScreen characters={characters} settings={settings} onUpdateSettings={onUpdateSettings}/>}
      {sub==="monsters"&&<QuickStatBlock settings={settings} onUpdateSettings={onUpdateSettings}/>}
      {sub==="sound"&&<Soundboard/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PASSWORD GATE
// ═══════════════════════════════════════════════════════

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "";

function PasswordGate({onAuth}) {
  const [pw,setPw]=useState("");const [error,setError]=useState(false);
  useEffect(()=>{const saved=localStorage.getItem("dnd-auth");if(saved===APP_PASSWORD)onAuth();},[]);
  const handleSubmit=()=>{if(pw===APP_PASSWORD){localStorage.setItem("dnd-auth",pw);onAuth();}else{setError(true);setTimeout(()=>setError(false),2000);}};
  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"'Crimson Text',serif"}}>
      <style>{CSS}</style>
      <div className="fi" style={{maxWidth:"380px",width:"100%",background:T.surface,border:`1px solid ${T.borderGold}`,borderRadius:"20px",padding:"44px 28px",textAlign:"center"}}>
        <div style={{width:"56px",height:"56px",borderRadius:"16px",background:`linear-gradient(135deg,${T.goldDim},${T.gold})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><I.Zap s={28}/></div>
        <h1 style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"22px",marginBottom:"4px"}}>Time of Troubles</h1>
        <p style={{color:T.textDim,fontStyle:"italic",fontSize:"14px",marginBottom:"32px"}}>1358 DR — Costa della Spada</p>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="Password della campagna" style={{...iS,textAlign:"center",fontSize:"16px",padding:"14px 16px",borderColor:error?T.redBright:T.border,marginBottom:"16px"}} />
        {error&&<div className="fi" style={{color:T.redBright,fontSize:"13px",marginBottom:"12px",fontWeight:600}}>Password errata</div>}
        <button onClick={handleSubmit} style={{...bP,width:"100%",padding:"14px",fontSize:"16px"}}>Entra nella Campagna</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════

export default function App() {
  const [authenticated,setAuthenticated]=useState(!APP_PASSWORD);
  const [tab,setTab]=useState("map");
  const [characters,setCharacters]=useState([]);
  const [sessions,setSessions]=useState([]);
  const [settings,setSettings]=useState({});
  const [selLoc,setSelLoc]=useState(null);
  const [editChar,setEditChar]=useState(null);
  const [showCharForm,setShowCharForm]=useState(false);
  const [showSessForm,setShowSessForm]=useState(false);
  const [sessForm,setSessForm]=useState({number:1,date:"",title:"",location:"",summary:"",loot:"",xp:""});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [connected,setConnected]=useState(false);
  const [viewingSheet,setViewingSheet]=useState(null);

  const configured=isFirebaseConfigured();
  const flash=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  useEffect(()=>{
    if(!configured)return;
    const unsubs=[];
    try{
      unsubs.push(subscribeCharacters(c=>{setCharacters(c);setConnected(true);}));
      unsubs.push(subscribeSessions(s=>setSessions(s)));
      unsubs.push(subscribeSettings(s=>setSettings(s)));
    }catch(e){console.error("Firebase error:",e);}
    return ()=>unsubs.forEach(u=>u());
  },[configured]);

  const handleSaveChar=async(char)=>{setSaving(true);try{await fbSaveCharacter(char);flash("Personaggio salvato!");}catch(e){flash("Errore: "+e.message,"error");}setSaving(false);setShowCharForm(false);setEditChar(null);};
  const handleQuickSave=async(char)=>{try{await fbSaveCharacter(char);}catch(e){console.error(e);}};
  const handleDeleteChar=async(id)=>{if(!confirm("Eliminare questo personaggio?"))return;try{await fbDeleteCharacter(id);flash("Eliminato");}catch(e){flash("Errore","error");}};
  const handleAvatarUpload=async(charId,file)=>{try{await uploadAvatar(charId,file);flash("Avatar aggiornato!");}catch(e){flash("Errore upload","error");}};
  const handleMoveParty=async(locId)=>{try{await updateSettings({partyLocation:locId});flash("Party spostato!");}catch(e){flash("Errore","error");}};
  const handleSaveSession=async()=>{setSaving(true);try{await fbSaveSession({...sessForm,id:`sess-${Date.now()}`});flash("Sessione registrata!");setShowSessForm(false);setSessForm({number:sessions.length+2,date:"",title:"",location:"",summary:"",loot:"",xp:""});}catch(e){flash("Errore","error");}setSaving(false);};
  const handleDeleteSession=async(id)=>{if(!confirm("Eliminare?"))return;try{await fbDeleteSession(id);flash("Eliminata");}catch(e){flash("Errore","error");}};

  if(!authenticated)return <PasswordGate onAuth={()=>setAuthenticated(true)} />;
  if(!configured)return <SetupGuide />;

  const partyLoc=LOCATIONS.find(l=>l.id===(settings.partyLocation||"neverwinter"));
  const pcs=characters.filter(c=>!c.isDM);
  const dms=characters.filter(c=>c.isDM);

  const tabs=[
    {id:"map",label:"Mappa",icon:<I.Map />},
    {id:"party",label:"Party",icon:<I.Users />},
    {id:"sheets",label:"Schede",icon:<I.Shield />},
    {id:"journal",label:"Diario",icon:<I.Book />},
    {id:"combat",label:"Combat",icon:<I.Swords />},
    {id:"dm",label:"DM",icon:<I.DM />},
    {id:"tools",label:"Tools",icon:<I.Dice />},
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Crimson Text',serif",paddingBottom:"76px"}}>
      <style>{CSS}</style>
      <Toast message={toast?.msg} type={toast?.type} />

      {/* ─── HEADER (desktop: full, mobile: compact) ─── */}
      <header style={{position:"sticky",top:0,zIndex:100,background:T.glass,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${T.glassBorder}`}}>
        <div style={{maxWidth:"1200px",margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"10px",background:`linear-gradient(135deg,${T.goldDim},${T.gold})`,display:"flex",alignItems:"center",justifyContent:"center"}}><I.Zap s={18}/></div>
            <div>
              <h1 style={{fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:"clamp(14px,3.5vw,18px)",color:T.gold,letterSpacing:"1px",lineHeight:1.2}}>TIME OF TROUBLES</h1>
              <div style={{fontSize:"11px",color:T.textDim,fontStyle:"italic",lineHeight:1}}>1358 DR — Costa della Spada</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{fontSize:"11px",color:T.textDim,textAlign:"right",lineHeight:1.3}}>
              <div style={{color:T.goldBright,fontWeight:600}}>📍 {partyLoc?.name||"?"}</div>
              <div>{pcs.length} PG · {sessions.length} sess.</div>
            </div>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:connected?T.greenBright:T.redBright,boxShadow:connected?`0 0 8px ${T.greenBright}`:""}} />
          </div>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main style={{maxWidth:"1200px",margin:"0 auto",padding:"20px 16px"}}>

        {/* ═══ MAP ═══ */}
        {tab==="map"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:"16px"}}>
            <div style={{position:"relative",borderRadius:"16px",overflow:"hidden",border:`1px solid ${T.border}`,boxShadow:"0 4px 24px rgba(0,0,0,.4)"}}>
              <img src={mapImg} alt="Sword Coast" style={{width:"100%",display:"block"}} />
              <svg width="100%" height="100%" style={{position:"absolute",inset:0}}>
                {LOCATIONS.map(l=><MapMarker key={l.id} loc={l} isPartyHere={(settings.partyLocation||"neverwinter")===l.id} isSelected={selLoc?.id===l.id} onClick={setSelLoc}/>)}
              </svg>
            </div>
            {selLoc&&(
              <Card className="fs" style={{padding:"20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <h3 style={{fontFamily:"'Cinzel',serif",color:T.goldBright,fontSize:"20px",margin:0}}>{selLoc.name}</h3>
                    <span style={{fontSize:"12px",color:T.textMuted,textTransform:"uppercase",letterSpacing:"1px"}}>{selLoc.type}</span>
                  </div>
                  <IconBtn icon={<I.X />} onClick={()=>setSelLoc(null)} />
                </div>
                <p style={{fontSize:"15px",color:T.text,lineHeight:1.7,margin:"12px 0 0"}}>{selLoc.desc}</p>
                {(settings.partyLocation||"neverwinter")!==selLoc.id?
                  <button onClick={()=>handleMoveParty(selLoc.id)} style={{...bP,marginTop:"16px",width:"100%"}}>Sposta il Party Qui</button>
                : <div style={{marginTop:"14px",padding:"10px",background:`${T.gold}08`,borderRadius:"12px",textAlign:"center",fontSize:"13px",color:T.gold,fontFamily:"'Cinzel',serif"}}>⚑ Il party è qui</div>
                }
              </Card>
            )}
          </div>
        )}

        {/* ═══ PARTY ═══ */}
        {tab==="party"&&(
          <div>
            <SectionTitle right={<button onClick={()=>{setEditChar(null);setShowCharForm(true);}} style={{...bP,padding:"10px 18px",fontSize:"13px"}}><I.Plus /> Aggiungi</button>}>Personaggi</SectionTitle>
            {dms.length>0&&<div style={{marginBottom:"20px"}}>{dms.map(c=><CharacterCard key={c.id} char={c} onEdit={ch=>{setEditChar(ch);setShowCharForm(true);}} onDelete={handleDeleteChar} onAvatarUpload={handleAvatarUpload}/>)}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,340px),1fr))",gap:"14px"}}>
              {pcs.map(c=><CharacterCard key={c.id} char={c} onEdit={ch=>{setEditChar(ch);setShowCharForm(true);}} onDelete={handleDeleteChar} onAvatarUpload={handleAvatarUpload}/>)}
              {pcs.length<6&&<button onClick={()=>{setEditChar(null);setShowCharForm(true);}} style={{background:"none",border:`2px dashed ${T.border}`,borderRadius:"14px",padding:"40px",cursor:"pointer",color:T.textDim,fontFamily:"'Cinzel',serif",fontSize:"14px",display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",minHeight:"140px",justifyContent:"center",touchAction:"manipulation"}}><I.Plus s={24}/> Aggiungi</button>}
            </div>
            {showCharForm&&<CharacterForm char={editChar} onSave={handleSaveChar} onCancel={()=>{setShowCharForm(false);setEditChar(null);}} saving={saving}/>}
          </div>
        )}

        {/* ═══ SHEETS ═══ */}
        {tab==="sheets"&&(
          <div>
            {viewingSheet&&(
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:1000,display:"flex",flexDirection:"column",padding:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",gap:"10px",flexWrap:"wrap"}}>
                  <div style={{minWidth:0}}><span style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"16px",fontWeight:700}}>{viewingSheet.charName}</span><span style={{color:T.textDim,fontSize:"13px",marginLeft:"10px"}}>{viewingSheet.name}</span></div>
                  <div style={{display:"flex",gap:"8px"}}><a href={viewingSheet.url} download style={{...bS,padding:"8px 14px",fontSize:"12px",textDecoration:"none",color:T.text}}><I.Download /> Scarica</a><button onClick={()=>setViewingSheet(null)} style={{...bS,padding:"8px 14px",fontSize:"12px"}}><I.X /> Chiudi</button></div>
                </div>
                <div style={{flex:1,borderRadius:"12px",overflow:"hidden",border:`1px solid ${T.border}`}}>
                  {viewingSheet.name?.toLowerCase().endsWith(".pdf")?<iframe src={viewingSheet.url} style={{width:"100%",height:"100%",border:"none",background:"#fff"}} title="Sheet"/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto",background:T.bg}}><img src={viewingSheet.url} alt={viewingSheet.name} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/></div>}
                </div>
              </div>
            )}
            <SectionTitle>Schede Personaggio</SectionTitle>
            {pcs.length===0?<EmptyState icon="📜" title="Nessun personaggio" sub='Aggiungi personaggi nel tab "Party"' />:
              <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
                {pcs.map(char=>{
                  const accent=CLASS_COLORS[char.class]||T.gold;const sheets=char.sheets||[];
                  const handleUp=async(e)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>10*1024*1024){alert("Max 10MB");return;}try{flash("Caricamento...");const sheet=await uploadCharacterSheet(char.id,file);await fbSaveCharacter({...char,sheets:[...sheets,sheet]});flash("Scheda caricata!");}catch(err){flash("Errore","error");}e.target.value="";};
                  const handleDel=async(idx)=>{if(!confirm("Eliminare?"))return;const s=sheets[idx];try{if(s.path)await deleteFile(s.path);}catch(e){}await fbSaveCharacter({...char,sheets:sheets.filter((_,i)=>i!==idx)});flash("Eliminata");};
                  return (
                    <Card key={char.id} style={{borderTop:`3px solid ${accent}`}}>
                      <div style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:"14px",borderBottom:`1px solid ${T.border}`}}>
                        <AvatarDisplay char={char} size={48}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Cinzel',serif",fontWeight:800,fontSize:"17px",color:T.textBright}}>{char.name}</div>
                          <div style={{fontSize:"13px",color:accent,fontStyle:"italic"}}>{char.species} — {char.class} Lv.{char.level}</div>
                        </div>
                        <label style={{...bP,padding:"10px 16px",fontSize:"13px",cursor:"pointer",margin:0}}><I.Upload /> Carica<input type="file" accept=".pdf,image/*" onChange={handleUp} style={{display:"none"}}/></label>
                      </div>
                      <div style={{padding:"14px 20px"}}>
                        {sheets.length===0?<div style={{textAlign:"center",padding:"20px",color:T.textDim,fontSize:"13px",fontStyle:"italic"}}>Nessuna scheda — clicca "Carica"</div>:
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))",gap:"10px"}}>
                            {sheets.map((s,i)=>{const isPdf=s.name?.toLowerCase().endsWith(".pdf");const isImg=/\.(png|jpg|jpeg|webp)$/i.test(s.name||"");return(
                              <div key={i} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:"12px",overflow:"hidden"}}>
                                <div onClick={()=>setViewingSheet({...s,charName:char.name})} style={{height:"140px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",background:isPdf?"linear-gradient(135deg,#1a1a2e,#16213e)":T.bg,overflow:"hidden"}}>
                                  {isImg?<img src={s.url} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.9}}/>:<div style={{textAlign:"center"}}><div style={{fontSize:"36px",marginBottom:"6px"}}>📋</div><div style={{fontSize:"11px",color:T.goldDim,fontFamily:"'Cinzel',serif"}}>Clicca per aprire</div></div>}
                                </div>
                                <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:"8px",borderTop:`1px solid ${T.border}`}}>
                                  <span style={{flex:1,fontSize:"12px",color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>{s.name}</span>
                                  <IconBtn icon={<I.Eye />} onClick={()=>setViewingSheet({...s,charName:char.name})} color={T.blueBright}/>
                                  <a href={s.url} download style={{background:"none",border:`1px solid ${T.border}`,borderRadius:"10px",padding:"8px",display:"flex",color:T.greenBright}}><I.Download /></a>
                                  <IconBtn icon={<I.Trash />} onClick={()=>handleDel(i)} danger/>
                                </div>
                              </div>
                            );})}
                          </div>
                        }
                      </div>
                    </Card>
                  );
                })}
              </div>
            }
          </div>
        )}

        {/* ═══ JOURNAL ═══ */}
        {tab==="journal"&&(
          <div>
            <SectionTitle right={<button onClick={()=>{setSessForm({number:sessions.length+1,date:new Date().toLocaleDateString("it-IT"),title:"",location:"",summary:"",loot:"",xp:""});setShowSessForm(true);}} style={{...bP,padding:"10px 18px",fontSize:"13px"}}><I.Plus /> Nuova</button>}>Diario</SectionTitle>
            {showSessForm&&(
              <Card className="fs" style={{padding:"20px",marginBottom:"16px"}}>
                <h3 style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"17px",marginBottom:"16px"}}>Nuova Sessione</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"}}>
                  <FormField label="Numero" value={sessForm.number} type="number" onChange={v=>setSessForm(p=>({...p,number:parseInt(v)||1}))}/>
                  <FormField label="Data" value={sessForm.date} onChange={v=>setSessForm(p=>({...p,date:v}))}/>
                  <FormField label="Luogo" value={sessForm.location} onChange={v=>setSessForm(p=>({...p,location:v}))}/>
                </div>
                <FormField label="Titolo" value={sessForm.title} onChange={v=>setSessForm(p=>({...p,title:v}))}/>
                <FormField label="Riassunto" value={sessForm.summary} onChange={v=>setSessForm(p=>({...p,summary:v}))} multiline/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  <FormField label="Bottino" value={sessForm.loot} onChange={v=>setSessForm(p=>({...p,loot:v}))}/>
                  <FormField label="XP" value={sessForm.xp} onChange={v=>setSessForm(p=>({...p,xp:v}))}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"8px"}}>
                  <button onClick={()=>setShowSessForm(false)} style={bS}>Annulla</button>
                  <button disabled={saving} onClick={handleSaveSession} style={{...bP,opacity:saving?.5:1}}>{saving?<Spinner/>:<I.Save />} Salva</button>
                </div>
              </Card>
            )}
            {!sessions.length&&!showSessForm&&<EmptyState icon="📜" title="Nessuna sessione" sub="Documenta le avventure!"/>}
            {sessions.map(s=><SessionEntry key={s.id} session={s} onDelete={handleDeleteSession}/>)}
          </div>
        )}

        {/* ═══ COMBAT ═══ */}
        {tab==="combat"&&(
          <CombatTab characters={characters} onSaveChar={handleQuickSave}/>
        )}

        {/* ═══ DM ═══ */}
        {tab==="dm"&&(
          <DMTab characters={characters} settings={settings} onUpdateSettings={async(data)=>{try{await updateSettings(data);}catch(e){flash("Errore","error");}}}/>
        )}

        {/* ═══ TOOLS ═══ */}
        {tab==="tools"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:"16px"}}>
            <Card style={{padding:"24px",gridColumn:"1/-1"}}>
              <h3 style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"18px",marginBottom:"16px"}}>🎒 Inventario del Party</h3>
              <Inventory settings={settings} characters={characters} onUpdateSettings={async(data)=>{try{await updateSettings(data);flash("Inventario aggiornato");}catch(e){flash("Errore","error");}}}/>
            </Card>
            <Card style={{padding:"24px"}}>
              <h3 style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"18px",marginBottom:"16px"}}>⚡ Campagna</h3>
              {[["Ambientazione","Forgotten Realms — Sword Coast"],["Anno","1358 DR — Anno delle Tempeste"],["Evento","Time of Troubles"],["Città base","Neverwinter"],["Regolamento","D&D 2024 + Oath 2014"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}15`}}>
                  <span style={{fontSize:"13px",color:T.textDim}}>{l}</span>
                  <span style={{fontSize:"14px",color:T.textBright,fontWeight:600,textAlign:"right"}}>{v}</span>
                </div>
              ))}
            </Card>
            <Card style={{padding:"24px"}}>
              <h3 style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"18px",marginBottom:"16px"}}>📖 Riferimenti</h3>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                <RefItem title="Condizioni" items={["Avvelenato","Incapacitato","Invisibile","Paralizzato","Pietrificato","Prono","Spaventato","Stordito"]}/>
                <RefItem title="Azioni in Combattimento" items={["Attacco","Lanciare incantesimo","Scatto","Disimpegno","Schivata","Aiuto","Nascondersi","Usare oggetto"]}/>
                <RefItem title="Riposo" items={["Breve: 1h — Dadi Vita per HP","Lungo: 8h — Recupero completo"]}/>
                <RefItem title="Copertura" items={["+2 CA (mezza)","+5 CA (tre quarti)","Immune (totale)"]}/>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* ─── BOTTOM NAV (iOS-style) ─── */}
      <nav className="safe-b" style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:200,
        background:T.glass,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
        borderTop:`1px solid ${T.glassBorder}`,
        display:"flex",justifyContent:"space-around",alignItems:"center",
        paddingTop:"5px",paddingBottom:"5px",
      }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:"1px",
            background:"none",border:"none",
            color:tab===t.id?T.gold:T.textMuted,
            padding:"4px 2px",cursor:"pointer",flex:1,
            WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
            transition:"color .15s",
          }}>
            {t.icon}
            <span style={{fontSize:"9px",fontFamily:"'Cinzel',serif",fontWeight:tab===t.id?700:500,letterSpacing:".2px"}}>{t.label}</span>
            {tab===t.id&&<div style={{width:"4px",height:"4px",borderRadius:"50%",background:T.gold}}/>}
          </button>
        ))}
      </nav>
    </div>
  );
}
