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
// SESSION ENTRY
// ═══════════════════════════════════════════════════════

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
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,400px),1fr))",gap:"20px"}}>
            <div><SectionTitle>Iniziativa</SectionTitle><InitiativeTracker characters={characters}/></div>
            <div><SectionTitle>Dadi</SectionTitle><DiceRoller/></div>
          </div>
        )}

        {/* ═══ TOOLS ═══ */}
        {tab==="tools"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:"16px"}}>
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
            <Card style={{padding:"24px",gridColumn:"1/-1"}}>
              <h3 style={{fontFamily:"'Cinzel',serif",color:T.gold,fontSize:"18px",marginBottom:"16px"}}>🎲 Dadi</h3>
              <DiceRoller/>
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
        paddingTop:"6px",paddingBottom:"6px",
      }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",
            background:"none",border:"none",
            color:tab===t.id?T.gold:T.textMuted,
            padding:"6px 8px",cursor:"pointer",
            WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
            transition:"color .15s",minWidth:"52px",
          }}>
            {t.icon}
            <span style={{fontSize:"10px",fontFamily:"'Cinzel',serif",fontWeight:tab===t.id?700:500,letterSpacing:".3px"}}>{t.label}</span>
            {tab===t.id&&<div style={{width:"4px",height:"4px",borderRadius:"50%",background:T.gold,marginTop:"1px"}}/>}
          </button>
        ))}
      </nav>
    </div>
  );
}
