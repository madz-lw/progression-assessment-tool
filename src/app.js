// LEVEL UP: turns a progression assessment into a game.
import "./style.css";
import { short, findRole, getItems } from "./lib/framework.js";
import { average, label, overall } from "./lib/scoring.js";
import { SFX, audio, setSound, note, unlockAudio } from "./lib/sound.js";
import { pixelSvg, HERO, CASTLE, PAL } from "./lib/sprites.js";
import { parseAssessment } from "./lib/parseAssessment.js";
import { julia } from "./data/sampleJulia.js";
import EXAMPLES from "./data/examples.json";

const KEY = "levelup-v3";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $ = s => document.querySelector(s);
const cssId = k => k.replace(/[^a-z0-9]/gi,"_");
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let A = null, AI = {}, SAMPLE = null, EXI = {};
const items = () => getItems(A);

// ---------- Content for each item ----------
function contentFor(it){
  const hand = (EXAMPLES[A.role+"|"+A.level] || {})[it.key];
  return hand || AI[it.key] || null;
}
function fallbackActions(it){
  const stretch = A.ratings[it.key]==="Met";
  const src = stretch && it.nextText.length ? it.nextText : (it.now.length ? it.now : it.nextText);
  return src.slice(0,2).map(t => "On your current engagement, look for a chance to " + t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/,"") + ".");
}
const questsFor = it => (A.ratings[it.key]==="Met" && it.nextText.length) ? it.nextText : it.now;
const noteOf = id => ((A.notes||{})[id]||"").trim();
const bosses = () => items().filter(i=>A.ratings[i.key]==="Partially Met");
const bonuses = () => items().filter(i=>A.ratings[i.key]==="Met");


// ---------- Game state ----------
const RANKS = [[0,"Rookie"],[100,"Apprentice"],[300,"Adventurer"],[550,"Hero"]];
const ACH = [
  {id:"ready", ico:"1P", name:"Player one ready", test:g=>g.done>=1},
  {id:"clear", ico:"★", name:"Level clear", test:g=>g.cleared>=1},
  {id:"block", ico:"?", name:"Lucky block", test:()=> (A.blocks||0)>=1},
  {id:"notes", ico:"✎", name:"Record keeper", test:g=>g.notes>=3},
  {id:"check", ico:"½", name:"Checkpoint", test:g=>g.total && g.done*2>=g.total},
  {id:"bonus", ico:"+", name:"Bonus stage", test:g=>g.bonusCleared>=1},
  {id:"final", ico:"♛", name:"Final boss beaten", test:g=>g.total && g.done===g.total}
];
function game(){
  const bs = bosses(); let total=0, done=0, cleared=0;
  const per = bs.map(it => { const q = questsFor(it); const d = q.filter((_,i)=>A.done[it.key+"#"+i]).length; total+=q.length; done+=d; if(q.length && d===q.length) cleared++; return {it,d,n:q.length}; });
  let bdone=0, btotal=0, bonusCleared=0;
  const bper = bonuses().map(it => { const q = questsFor(it); const d = q.filter((_,i)=>A.done[it.key+"#"+i]).length; btotal+=q.length; bdone+=d; if(q.length && d===q.length) bonusCleared++; return {it,d,n:q.length}; });
  const notes = Object.keys(A.notes||{}).filter(k=>noteOf(k)).length;
  const xp = (done+bdone)*50 + (cleared+bonusCleared)*100 + notes*25, max = (total+btotal)*75 + (bs.length+bper.length)*100;
  let lv = 1, rank = RANKS[0][1], base = 0, next = RANKS[1][0];
  RANKS.forEach(([at,name],i) => { if(xp>=at){ lv=i+1; rank=name; base=at; next = RANKS[i+1] ? Math.min(RANKS[i+1][0], max) : max; } });
  const legend = total && done===total;
  if(legend){ lv = RANKS.length+1; rank = "Legend"; base = max; next = max; }
  return {bs, per, bper, total, done, cleared, bonusCleared, notes, xp, max, lv, rank, base, next, legend};
}

// ---------- Start ----------
function vStart(){
  $("#barRight").innerHTML = soundBtn();
  wireSound();
  $("#main").innerHTML = `
    <h1 class="title">LEVEL UP</h1>
    <p class="tag">Turn your progression assessment into a game. Your gaps become boss levels. Beat them by showing each framework objective on real work, and build your evidence for next time as you go.</p>
    <div class="frame cart" id="drop">
      <h2>Insert your assessment</h2>
      <p class="muted small">Progression Assessment 2026, downloaded from Google Sheets as .xlsx. It stays in your browser.</p>
      <label class="pbtn" style="display:inline-block">Choose file<input type="file" id="file" accept=".xlsx,.xls" hidden></label>
      <div class="status" id="status" role="status"></div>
    </div>
    <div class="press"><span class="blink" aria-hidden="true">PRESS START</span><button class="pbtn alt" id="sample">Play as Julia</button></div>`;
  const drop = $("#drop");
  $("#file").onchange = e => e.target.files[0] && readFile(e.target.files[0]);
  ["dragenter","dragover"].forEach(ev => drop.addEventListener(ev, e => {e.preventDefault(); drop.classList.add("hover");}));
  ["dragleave","drop"].forEach(ev => drop.addEventListener(ev, e => {e.preventDefault(); drop.classList.remove("hover");}));
  drop.addEventListener("drop", e => e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0]));
  $("#sample").onclick = () => { SFX.coin(); loadSample(); };
}
function soundBtn(){ return `<button class="pbtn alt small" id="snd" aria-pressed="${audio.on}" aria-label="Sound effects">${audio.on?"Sound on":"Sound off"}</button>`; }
function wireSound(){ const b = $("#snd"); if(b) b.onclick = () => { setSound(!audio.on); b.textContent = audio.on?"Sound on":"Sound off"; b.setAttribute("aria-pressed", audio.on); if(audio.on) SFX.tick(); }; }

async function readFile(f){
  const st = $("#status"); st.className = "status"; st.textContent = "Loading " + f.name + "…";
  try{ A = await parseAssessment(f); save(); SFX.coin(); vGame(); }
  catch(err){ st.className = "status err"; st.textContent = err.message; }
}
function loadSample(){
  A = julia();
  save(); vGame();
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(A)); }catch(e){} }

// ---------- Game screen ----------
function pips(r){ const c = r==="Met"?"met":r==="Exceeding"?"ex":""; return `<span class="pip ${c}" aria-hidden="true"><i></i><i></i><i></i></span>`; }
function tipBlock(it){
  const c = contentFor(it);
  if(!c){
    if(SAMPLE && AI[it.key]===undefined) return `<h4>Walkthrough</h4><p class="loading">Loading tips for your role…</p>`;
    return "";
  }
  const idx = (EXI[it.key]||0) % c.examples.length;
  return `<h4>Walkthrough: what good can look like</h4>
    <div class="tip" id="tip-${cssId(it.key)}">${esc(c.examples[idx])}</div>
    <div class="tipbar"><button class="pbtn alt small" data-tip="${esc(it.key)}">Another example</button></div>`;
}
function bossCard(it, n){
  const q = questsFor(it), c = contentFor(it), ev = A.evidence[it.key];
  const d = q.filter((_,i)=>A.done[it.key+"#"+i]).length, cleared = q.length && d===q.length;
  return `<article class="frame card ${cleared?"cleared":""}" data-cardkey="${esc(it.key)}">
    <div class="clear-stamp" aria-hidden="true">LEVEL CLEAR!</div>
    <div class="card-top">
      <div><div class="lvtag">LEVEL ${n}</div><h3>${esc(it.name)}</h3><div class="kind">${it.kind}, rated partially met</div></div>
      <div class="hp"><div class="px"><span>BOSS HP</span><span class="hpnum">${q.length-d}/${q.length}</span></div>
        <div class="hpbar" aria-label="${q.length-d} of ${q.length} hit points left">${q.map((_,i)=>`<i class="${i<d?"gone":""}"></i>`).join("")}</div></div>
    </div>
    <h4>Objectives: what's expected at ${esc(short(A.level))}${it.kind==="Skill"?` (${esc(it.required)})`:""}</h4>
    <p class="muted small" style="margin:-4px 0 12px">Tick one when you've shown it on real work. Add a note on how.</p>
    ${questList(it)}
    ${tipBlock(it)}
    ${c && c.resource ? `<p class="loot"><span class="px">LOOT</span>${c.resource.url?`<a href="${esc(c.resource.url)}" target="_blank" rel="noopener"><b>${esc(c.resource.title)}</b></a>`:`<b>${esc(c.resource.title)}</b>`}, ${esc(c.resource.by)}</p>` : ""}
    ${ev?`<details class="you-wrote"><summary>What you wrote in your assessment</summary><p>${esc(ev)}</p></details>`:""}
  </article>`;
}
function questList(it){
  return `<ul class="quests">${questsFor(it).map((a,i)=>{ const id = it.key+"#"+i, on = !!A.done[id], note = noteOf(id);
    return `<li class="obj">
      <label class="quest ${on?"done":""}"><input type="checkbox" data-q="${esc(id)}" data-card="${esc(it.key)}" ${on?"checked":""}><span class="q">${esc(a)}</span><span class="xpv">+50 XP</span></label>
      <details class="note" ${note?"":""}><summary>${note?"Evidence noted":"Add evidence"} <span class="xpv">+25 XP</span></summary>
        <textarea data-note="${esc(id)}" data-card="${esc(it.key)}" rows="3" placeholder="When did you do this, and what difference did it make?" aria-label="Evidence for: ${esc(a)}">${esc(note)}</textarea></details>
    </li>`; }).join("")}</ul>
    <div class="evbar"><button class="pbtn alt small" data-copy="${esc(it.key)}">Copy my evidence</button><span class="muted small" data-evcount="${esc(it.key)}">${evCount(it)}</span></div>`;
}
function evCount(it){ const n = questsFor(it).filter((_,i)=>noteOf(it.key+"#"+i)).length; return n ? `${n} ${n===1?"note":"notes"} ready for your assessment` : "Notes you add here become your assessment evidence"; }
function evidenceText(it){
  const lines = questsFor(it).map((a,i)=>({a, n:noteOf(it.key+"#"+i), d:!!A.done[it.key+"#"+i]})).filter(x=>x.n || x.d);
  return `${it.name} (${it.kind})\n` + (lines.length ? lines.map(x=>`- ${x.a}${x.n?`: ${x.n}`:""}`).join("\n") : "- No evidence noted yet");
}
async function copyEvidence(text, btn){
  try{ await navigator.clipboard.writeText(text); toast("COPIED","Paste it into the evidence column of your assessment"); SFX.coin(); }
  catch(e){
    const box = document.createElement("textarea"); box.value = text; box.rows = 8; box.className = "copybox"; box.setAttribute("aria-label","Your evidence, select and copy");
    btn.closest(".evbar, .foot").after(box); box.focus(); box.select();
  }
}
function stars(it){
  const q = questsFor(it), d = q.filter((_,i)=>A.done[it.key+"#"+i]).length;
  return `<span class="stars" aria-label="${d} of ${q.length} bonus quests done">${q.map((_,i)=>`<i class="${i<d?"on":""}"></i>`).join("")}</span>`;
}
function checkpointRow(it){
  const c = contentFor(it), q = questsFor(it), d = q.filter((_,i)=>A.done[it.key+"#"+i]).length;
  const target = it.nextText.length ? it.nextText : it.now;
  return `<details class="row bonus ${q.length&&d===q.length?"cleared":""}" data-cardkey="${esc(it.key)}"><summary><span>${esc(it.name)} <span class="muted small" style="font-weight:400">${it.kind}</span></span><span class="bonus-status"><span class="px bclear">CLEAR!</span>${stars(it)}</span></summary>
    <div class="row-body">
      <h4>Bonus objectives: ${esc(short(it.nextJob))}-level work${it.kind==="Skill"&&it.next?` (${esc(it.next)})`:""}</h4>
      <p class="muted small" style="margin:-4px 0 12px">Showing these at your level is what earns an exceeding.</p>
      ${questList(it)}
      ${c ? `<h4>Walkthrough: what good can look like</h4><div class="tip">${esc(c.examples[0])}</div>` : (SAMPLE && AI[it.key]===undefined ? `<p class="loading" style="margin-top:10px">Loading examples for your role…</p>` : "")}
      ${c && c.resource ? `<p class="loot"><span class="px">LOOT</span>${c.resource.url?`<a href="${esc(c.resource.url)}" target="_blank" rel="noopener"><b>${esc(c.resource.title)}</b></a>`:`<b>${esc(c.resource.title)}</b>`}, ${esc(c.resource.by)}</p>` : ""}
    </div></details>`;
}
function powerRow(it){
  return `<details class="row"><summary><span class="rname"><span class="power" aria-hidden="true">★</span><span>${esc(it.name)} <span class="muted small" style="font-weight:400">${it.kind}</span></span></span>${pips("Exceeding")}</summary>
    <div class="row-body"><p style="margin-top:6px">Use it: offer to mentor someone who's building this, or run a 20-minute show and tell on how you do it.</p>
    ${it.nextText.length?`<h4>At ${esc(short(it.nextJob))}</h4><ul class="expect">${it.nextText.slice(0,3).map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}</div></details>`;
}
function worldHtml(bs){
  return `<section class="frame world" aria-label="World map">
    <h2>World map: ${esc(short(A.level))} to ${esc(short(bs[0].nextJob||""))}</h2>
    <div class="world-inner">
      <div class="ground" aria-hidden="true"></div>
      <div class="sprite" id="sprite" style="left:0%">${pixelSvg(HERO)}</div>
      <div class="nodes">
        <div class="node"><div class="flagpole" aria-hidden="true"></div><div class="nlab">Start: ${esc(short(A.level))}</div></div>
        ${bs.map((it,i)=>`<button class="node" data-goto="${esc(it.key)}" aria-label="Level ${i+1}: ${esc(it.name)}"><div><div class="tile" style="margin-top:0">${i+1}</div></div><div class="nlab">${esc(it.name.length>26?it.name.slice(0,24)+"…":it.name)}</div></button>`).join("")}
        <div class="node"><div class="castle" aria-hidden="true">${pixelSvg(CASTLE)}</div><div class="nlab">${esc(short(bs[0].nextJob||"Next level"))}</div></div>
      </div>
    </div>
    <div class="achievements" id="ach"></div>
  </section>`;
}

let animatedIn = false;
function vGame(keepScroll){
  A.done = A.done || {};
  const all = items(), sk = all.filter(i=>i.kind==="Skill"), bh = all.filter(i=>i.kind==="Behaviour");
  const s1 = average(sk, A.ratings), s2 = average(bh, A.ratings), ov = overall(s1, s2);
  const bs = bosses(), met = all.filter(i=>A.ratings[i.key]==="Met"), ex = all.filter(i=>A.ratings[i.key]==="Exceeding");
  const unrated = all.filter(i=>!A.ratings[i.key]);
  $("#barRight").innerHTML = soundBtn() + `<button class="pbtn alt small" id="toDash">Deadline Dash</button><button class="pbtn alt small" id="loadAnother">Load another</button>`;
  $("#toDash").onclick = vDash;
  wireSound();
  $("#loadAnother").onclick = () => { stopDash(); A=null; AI={}; EXI={}; lastLv=null; lastAch=null; try{localStorage.removeItem(KEY);}catch(e){} vStart(); };
  const summary = bs.length ? `${bs.length} ${bs.length===1?"boss":"bosses"} to beat, ${met.length} bonus ${met.length===1?"stage":"stages"} to push from met to exceeding, and ${ex.length} ${ex.length===1?"power-up":"power-ups"} to use.` : `No bosses: nothing is partially met. Explore the next world in your checkpoints.`;
  $("#main").innerHTML = `
    <section class="frame player">
      <div class="avatar">${pixelSvg(HERO)}</div>
      <div>
        <div class="p1">PLAYER 1${A.sample?'<span class="samplebadge">DEMO</span>':""}</div>
        <h1 class="pname">${esc(A.name || "You")}</h1>
        <div class="pclass">${esc(short(A.level))} ${esc(A.role)}</div>
        <div class="lv"><span class="rank" id="rank"></span><div class="xpbar" id="xpbar" aria-hidden="true"></div></div>
        <div class="xptext" id="xptext"></div>
      </div>
      ${bs.length||met.length?`<div class="qwrap"><button class="qblock" id="qblock" aria-label="Hit the mystery block for a random objective">?</button><div class="px">Random objective</div></div>`:""}
    </section>
    <div class="quest-pop" id="pop" aria-live="polite"></div>
    <div class="stats" aria-label="Assessment scores">
      <span class="stat">SKILLS <b>${esc(label(s1)||"-")}</b> ${s1!=null?s1.toFixed(2):""}</span>
      <span class="stat">BEHAVIOURS <b>${esc(label(s2)||"-")}</b> ${s2!=null?s2.toFixed(2):""}</span>
      <span class="stat">OVERALL <b>${esc(label(ov)||"-")}</b> ${ov!=null?ov.toFixed(2):""}</span>
    </div>
    <p class="summary">${summary}</p>
    ${bs.length ? worldHtml(bs) : ""}
    ${bs.length?`<section class="group"><h2>Boss levels</h2><p>Your partially met areas. Each objective you show on real work knocks off boss HP.</p>${bs.map((it,i)=>bossCard(it,i+1)).join("")}</section>`:""}
    ${met.length?`<section class="group"><h2>Bonus stages</h2><p>Rated met. Optional objectives that push these to exceeding, using what's expected at ${esc(short(met[0].nextJob||"the next level"))}.</p><div class="frame rows">${met.map(checkpointRow).join("")}</div></section>`:""}
    ${ex.length?`<section class="group"><h2>Power-ups</h2><p>Rated exceeding. Use them to help your team.</p><div class="frame rows">${ex.map(powerRow).join("")}</div></section>`:""}
    ${unrated.length?`<p class="muted small" style="margin-top:28px">Not rated in your assessment: ${unrated.map(i=>esc(i.name)).join(", ")}.</p>`:""}
    <div class="foot"><span class="muted small">Based on the TPXimpact Progression Framework 2026.</span><span style="display:flex;gap:16px"><button class="linkbtn small" id="copyall">Copy all my evidence</button><button class="linkbtn small" id="printbtn">Print or save as PDF</button></span></div>`;
  if(!keepScroll) window.scrollTo(0,0);
  wire(); updateHUD(true);
  const pb = $("#printbtn"); if(pb) pb.onclick = () => window.print();
  fetchAI(bs);
}

let lastLv = null, lastAch = null;
function updateHUD(initial){
  const g = game();
  const r = $("#rank"); if(!r) return;
  r.textContent = `LV ${g.lv} ${g.rank}`;
  const span = Math.max(1, g.next - g.base), frac = g.legend ? 1 : Math.min(1,(g.xp-g.base)/span);
  const segs = 12, on = Math.round(frac*segs);
  $("#xpbar").innerHTML = Array.from({length:segs},(_,i)=>`<i class="${i<on?"on":""}"></i>`).join("");
  const nr = RANKS.find(([at])=>at>g.xp);
  $("#xptext").textContent = g.legend ? `${g.xp} XP. Every boss beaten.` : nr && nr[0] <= g.max ? `${g.xp} XP, ${nr[0]-g.xp} to ${nr[1]}` : `${g.xp} XP, ${g.max-g.xp} to Legend`;
  // world
  const sp = $("#sprite");
  if(sp){
    const n = g.bs.length; let pos = 0;
    g.per.forEach(p => { if(p.n && p.d===p.n) pos++; });
    let partial = 0; const cur = g.per.find(p => !(p.n && p.d===p.n)); if(cur && cur.n) partial = cur.d/cur.n * .5;
    const frac2 = g.legend ? 1 : (pos + partial)/(n+1);
    sp.style.left = `calc(${frac2*100}% * (1 - 90/560) + 45px * 1)`;
    sp.style.left = `calc(45px + (100% - 90px) * ${frac2})`;
    g.per.forEach(p => { const nd = document.querySelector(`.node[data-goto="${CSS.escape(p.it.key)}"]`); if(nd) nd.classList.toggle("clear", p.n && p.d===p.n); });
  }
  const got = ACH.filter(a=>a.test(g)).map(a=>a.id);
  const ach = $("#ach");
  if(ach) ach.innerHTML = `<span class="px" style="font-size:.55rem;width:100%;color:var(--ink-2)">ACHIEVEMENTS ${got.length}/${ACH.length}</span>` + ACH.map(a=>`<span class="ach ${got.includes(a.id)?"on":""}"><span class="ico" aria-hidden="true">${a.ico}</span>${esc(a.name)}</span>`).join("");
  if(!initial){
    const fresh = got.filter(id => !(lastAch||[]).includes(id));
    if(lastLv!=null && g.lv > lastLv) levelUp(g.rank, g.lv, g.legend);
    else if(fresh.length){ toast("ACHIEVEMENT UNLOCKED", ACH.find(a=>a.id===fresh[0]).name); SFX.ach(); }
  }
  lastLv = g.lv; lastAch = got;
}
function levelUp(rank, lv, legend){
  SFX.levelup();
  if(reduced()){ toast(legend?"YOU WIN":"LEVEL UP", `LV ${lv} ${rank}`); return; }
  const el = document.createElement("div"); el.className="levelup"; el.setAttribute("role","status");
  el.innerHTML = `<div>${legend?"YOU WIN!":"LEVEL UP!"}<small>LV ${lv} ${esc(rank)}</small></div>`;
  document.body.appendChild(el); setTimeout(()=>el.remove(), 2100);
}
function toast(head, msg){
  let t = $("#toast"); if(!t){ t=document.createElement("div"); t.id="toast"; t.className="toast"; t.setAttribute("role","status"); document.body.appendChild(t); }
  t.innerHTML = `<span class="px">${esc(head)}</span>${esc(msg)}`; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"), 2600);
}
function burst(el){
  if(reduced()) return;
  const b = document.createElement("span"); b.className="burst";
  const cols = ["#FFEC27","#FF004D","#29ADFF","#00E436"];
  for(let i=0;i<12;i++){ const s=document.createElement("i"); const a=i/12*Math.PI*2, d=26+(i%3)*12;
    s.style.setProperty("--x",Math.round(Math.cos(a)*d/4)*4+"px"); s.style.setProperty("--y",Math.round(Math.sin(a)*d/4)*4+"px"); s.style.background=cols[i%4]; b.appendChild(s); }
  el.appendChild(b); setTimeout(()=>b.remove(), 700);
}
function flash(el){ el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"), 1400); }
function goTo(key){ const c = document.querySelector(`[data-cardkey="${CSS.escape(key)}"]`); if(c){ if(c.tagName==="DETAILS") c.open = true; c.scrollIntoView({behavior: reduced()?"auto":"smooth", block:"start"}); flash(c); } }

function wire(){
  document.querySelectorAll("[data-q]").forEach(cb => cb.onchange = () => {
    if(cb.checked) A.done[cb.dataset.q] = true; else delete A.done[cb.dataset.q];
    save();
    const lab = cb.closest(".quest"); lab.classList.toggle("done", cb.checked);
    const card = cb.closest("[data-cardkey]"), it = items().find(i=>i.key===cb.dataset.card), q = questsFor(it);
    const d = q.filter((_,i)=>A.done[it.key+"#"+i]).length, cleared = d===q.length;
    card.querySelectorAll(".hpbar i").forEach((seg,i)=>seg.classList.toggle("gone", i<d));
    const hn = card.querySelector(".hpnum"); if(hn) hn.textContent = `${q.length-d}/${q.length}`;
    card.querySelectorAll(".stars i").forEach((s,i)=>s.classList.toggle("on", i<d));
    const was = card.classList.contains("cleared");
    card.classList.toggle("cleared", cleared);
    if(cb.checked){ burst(lab); if(cleared && !was) SFX.clear(); else SFX.tick(); } else SFX.untick();
    updateHUD(false);
  });
  document.querySelectorAll("[data-tip]").forEach(b => b.onclick = () => anotherTip(b.dataset.tip, b));
  document.querySelectorAll("[data-note]").forEach(ta => {
    ta.oninput = () => { A.notes = A.notes || {}; A.notes[ta.dataset.note] = ta.value; clearTimeout(ta._t); ta._t = setTimeout(save, 400); };
    ta.onchange = () => {
      save();
      const had = ta.dataset.had === "1", has = !!ta.value.trim();
      ta.closest(".note").querySelector("summary").firstChild.textContent = has ? "Evidence noted " : "Add evidence ";
      const it = items().find(i=>i.key===ta.dataset.card); const c = document.querySelector(`[data-evcount="${CSS.escape(it.key)}"]`); if(c) c.textContent = evCount(it);
      if(has && !had) SFX.tick(); ta.dataset.had = has ? "1" : "0";
      updateHUD(false);
    };
    ta.dataset.had = ta.value.trim() ? "1" : "0";
  });
  document.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyEvidence(evidenceText(items().find(i=>i.key===b.dataset.copy)), b));
  const ca = $("#copyall"); if(ca) ca.onclick = () => copyEvidence(bosses().concat(bonuses()).map(evidenceText).join("\n\n"), ca);
  document.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => goTo(b.dataset.goto));
  const qb = $("#qblock"); if(qb) qb.onclick = hitBlock;
}
async function anotherTip(key, btn){
  const it = items().find(i=>i.key===key), c = contentFor(it); if(!c) return;
  const el = document.getElementById("tip-"+cssId(key));
  const next = (EXI[key]||0) + 1;
  if(next >= c.examples.length && SAMPLE){
    btn.disabled = true; btn.textContent = "Loading…";
    try{
      const r = await SAMPLE(`Write ONE new, concrete, realistic example (under 40 words, second person, present tense, British English) of a ${short(A.level)} ${A.role} at TPXimpact, a UK digital transformation consultancy, showing this on a real client engagement: ${it.now.join(" / ")}. Make it different from these: ${c.examples.join(" | ")}. Reply with the example only.`, {modelTier:"quick", cache:false});
      const txt = (r.text||"").trim().replace(/^"|"$/g,""); if(txt) c.examples.push(txt);
    }catch(e){}
    btn.disabled = false; btn.textContent = "Another example";
  }
  EXI[key] = next % c.examples.length;
  el.textContent = c.examples[EXI[key]];
  A.tips = (A.tips||0) + 1; save(); SFX.bump(); updateHUD(false);
}
function hitBlock(){
  const qb = $("#qblock"), pop = $("#pop");
  qb.classList.remove("bump"); void qb.offsetWidth; qb.classList.add("bump");
  if(!reduced()){ const c = document.createElement("span"); c.className="coin"; qb.appendChild(c); setTimeout(()=>c.remove(), 650); }
  SFX.coin();
  const open = [];
  bosses().forEach(it => questsFor(it).forEach((a,i) => { if(!A.done[it.key+"#"+i]) open.push({it,a}); }));
  if(!open.length) bonuses().forEach(it => questsFor(it).forEach((a,i) => { if(!A.done[it.key+"#"+i]) open.push({it,a,bonus:true}); }));
  if(!open.length){ pop.innerHTML = `<div class="px">EMPTY BLOCK</div><p>Every objective is done. Take this to your next one-to-one.</p>`; pop.classList.add("show"); return; }
  const pick = open[Math.floor(Math.random()*open.length)];
  A.blocks = (A.blocks||0) + 1; save();
  pop.innerHTML = `<div class="px">TODAY'S OBJECTIVE: +50 XP</div><p>${esc(pick.a)}</p><div class="from" style="margin-bottom:4px">Look for a chance to show this on your work this week.</div><div class="from">From ${pick.bonus?"bonus stage":"level"}: ${esc(pick.it.name)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pbtn small" id="goq" style="background:#FFEC27;color:#1D2B53;box-shadow:0 0 0 4px #FFEC27">Go to level</button><button class="pbtn alt small" id="againq">Hit again</button></div>`;
  pop.classList.add("show");
  $("#goq").onclick = () => goTo(pick.it.key);
  $("#againq").onclick = () => { window.scrollTo({top: qb.getBoundingClientRect().top + window.scrollY - 120, behavior: reduced()?"auto":"smooth"}); hitBlock(); };
  updateHUD(false);
}

// ---------- Deadline Dash: bonus endless runner ----------
const DASHKEY = "levelup-dash-best";
let dashRAF = null;
function stopDash(){ if(dashRAF){ cancelAnimationFrame(dashRAF); dashRAF = null; } window.removeEventListener("keydown", dashKey); }
let dashKey = () => {};
function vDash(){
  stopDash();
  let best = 0; try{ best = +localStorage.getItem(DASHKEY) || 0; }catch(e){}
  $("#barRight").innerHTML = soundBtn() + `<button class="pbtn alt small" id="backLv">Back to levels</button>`;
  wireSound();
  $("#backLv").onclick = () => { stopDash(); vGame(); };
  $("#main").innerHTML = `
    <div class="dash-top"><div><div class="p1">BONUS ROUND</div><h1>Deadline Dash</h1></div>
      <div class="stat">BEST <b id="dbest">${best}</b></div></div>
    <div class="frame dash-wrap"><canvas id="dash" width="800" height="260" role="img" aria-label="Deadline Dash game. Press space or tap to jump."></canvas></div>
    <p class="dash-help">Press <b>Space</b> or <b>Up</b>, or tap the game, to jump. Dodge the workday blockers and grab coins. Just for fun: this doesn't change your assessment XP.</p>`;
  window.scrollTo(0,0);
  const cv = $("#dash"), g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  const Wd = 800, Hd = 260, GROUND = 210, PX = 4;
  const dark = () => matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
  const OBS = [
    {label:"Scope creep", w:34, h:40, c:"#FF004D"},
    {label:"Merge conflict", w:26, h:52, c:"#7E2553"},
    {label:"Surprise meeting", w:44, h:30, c:"#29ADFF"},
    {label:"Flaky test", w:22, h:34, c:"#FFA300"},
    {label:"Unclear story", w:30, h:46, c:"#008751"},
    {label:"Friday deploy", w:40, h:36, c:"#AB5236"}
  ];
  const runA = HERO.slice(0,11).concat(["...PP..PP...","..PP....PP..","..KK....KK.."]);
  const runB = HERO.slice(0,11).concat(["....PPPP....","....PP.PP...","...KK..KK..."]);
  let st;
  function reset(){ st = {y:0, vy:0, t:0, speed:6, obs:[], coins:[], score:0, coinN:0, next:60, nextCoin:120, over:false, started:false, frame:0}; }
  reset();
  function jump(){
    if(st.over){ reset(); st.started = true; SFX.coin(); return; }
    if(!st.started){ st.started = true; }
    if(st.y === 0){ st.vy = 13.5; note(523,0,.06); note(784,.05,.08); }
  }
  dashKey = e => { if(e.code==="Space" || e.code==="ArrowUp"){ e.preventDefault(); jump(); } };
  window.addEventListener("keydown", dashKey);
  cv.addEventListener("pointerdown", e => { e.preventDefault(); jump(); });

  function sprite(rows, x, y, scale){ rows.forEach((row,ry) => [...row].forEach((ch,rx) => { if(PAL[ch]){ g.fillStyle = PAL[ch]; g.fillRect(Math.round(x+rx*scale), Math.round(y+ry*scale), scale, scale); } })); }
  function text(s, x, y, size, color, align="left"){ g.font = `${size}px "Press Start 2P", monospace`; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); }
  function step(){
    const ink = dark() ? "#FFF1E8" : "#1D2B53", bg = dark() ? "#1D2B53" : "#FFF1E8";
    cv.style.background = bg;
    g.fillStyle = bg; g.fillRect(0,0,Wd,Hd);
    // skyline clouds
    g.fillStyle = dark() ? "#26366A" : "#F3E3D6";
    for(let i=0;i<4;i++){ const cx = ((i*230 - st.t*0.6) % 920 + 920) % 920 - 60; g.fillRect(cx, 40+i%2*30, 64, 12); g.fillRect(cx+12, 28+i%2*30, 36, 12); }
    // ground
    g.fillStyle = "#008751"; g.fillRect(0, GROUND, Wd, 8);
    g.fillStyle = "#005f39"; for(let x = -((st.t*st.speed)%24); x < Wd; x += 24) g.fillRect(x, GROUND, 12, 8);
    g.fillStyle = dark() ? "#3B4A7A" : "#E8D5C4"; for(let x = -((st.t*st.speed*.5)%40); x < Wd; x += 40) g.fillRect(x, GROUND+22, 8, 4);

    if(st.started && !st.over){
      st.t++; st.frame++;
      st.speed = Math.min(14, 6 + st.t/600);
      st.score = Math.floor(st.t/6) + st.coinN*10;
      // physics
      st.vy -= 0.75; st.y = Math.max(0, st.y + st.vy); if(st.y===0) st.vy = 0;
      // spawn
      if(--st.next <= 0){ const o = OBS[Math.floor(Math.random()*OBS.length)]; st.obs.push({...o, x:Wd+10}); st.next = 55 + Math.floor(Math.random()*60) - Math.min(25, st.t/200); }
      if(--st.nextCoin <= 0){ st.coins.push({x:Wd+10, y: 60 + Math.random()*60}); st.nextCoin = 90 + Math.floor(Math.random()*120); }
      st.obs.forEach(o => o.x -= st.speed); st.coins.forEach(c => c.x -= st.speed);
      st.obs = st.obs.filter(o => o.x > -80); st.coins = st.coins.filter(c => c.x > -30 && !c.got);
      // collisions (hitbox slightly smaller than sprite)
      const px = 80+8, pw = 12*PX-16, py = GROUND - 14*PX - st.y + 6, ph = 14*PX-6;
      for(const o of st.obs){ if(px < o.x+o.w && px+pw > o.x && py+ph > GROUND-o.h){ st.over = true; note(220,0,.15,"sawtooth",.07); note(130,.12,.3,"sawtooth",.07);
        let best = 0; try{ best = +localStorage.getItem(DASHKEY)||0; if(st.score > best){ localStorage.setItem(DASHKEY, st.score); $("#dbest").textContent = st.score; } }catch(e){} } }
      for(const c of st.coins){ if(px < c.x+16 && px+pw > c.x && py < c.y+20 && py+ph > c.y){ c.got = true; st.coinN++; SFX.coin(); } }
    }
    // obstacles
    st.obs.forEach(o => {
      g.fillStyle = o.c; g.fillRect(Math.round(o.x), GROUND-o.h, o.w, o.h);
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(Math.round(o.x)+o.w-4, GROUND-o.h, 4, o.h); g.fillRect(Math.round(o.x), GROUND-4, o.w, 4);
      g.fillStyle = "#FFF1E8"; g.fillRect(Math.round(o.x)+6, GROUND-o.h+8, 4, 4); g.fillRect(Math.round(o.x)+o.w-14, GROUND-o.h+8, 4, 4);
      text(o.label, o.x + o.w/2, GROUND-o.h-10, 8, ink, "center");
    });
    // coins
    st.coins.forEach(c => { g.fillStyle = "#1D2B53"; g.fillRect(c.x-2, c.y-2, 20, 24); g.fillStyle = "#FFEC27"; g.fillRect(c.x, c.y, 16, 20); g.fillStyle = "#FFA300"; g.fillRect(c.x+12, c.y, 4, 20); g.fillRect(c.x+6, c.y+4, 4, 12); });
    // player
    const rows = st.y > 0 || !st.started ? HERO : (Math.floor(st.frame/6)%2 ? runA : runB);
    sprite(rows, 80, GROUND - 14*PX - st.y, PX);
    // HUD
    text(`SCORE ${String(st.score).padStart(5,"0")}`, Wd-20, 30, 12, ink, "right");
    text(`COINS ${st.coinN}`, 20, 30, 12, ink);
    if(!st.started) text("PRESS SPACE OR TAP TO START", Wd/2, 110, 12, ink, "center");
    if(st.over){ text("GAME OVER", Wd/2, 100, 22, "#FF004D", "center"); text("Blockers happen. Press space to go again.", Wd/2, 132, 10, ink, "center"); }
    dashRAF = requestAnimationFrame(step);
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { dashRAF = requestAnimationFrame(step); });
}
// ---------- AI tips for roles without hand-written content ----------
let aiBusy = false;
async function fetchAI(list){
  if(!SAMPLE || aiBusy) return;
  const need = list.concat(bonuses()).filter(it => !contentFor(it) && AI[it.key]===undefined);
  if(!need.length) return;
  aiBusy = true;
  const brief = need.map(it => { const stretch = A.ratings[it.key]==="Met"; return `KEY: ${it.key}\nNAME: ${it.name} (${it.kind})\nRATING: ${A.ratings[it.key]}\nTARGET: ${(stretch && it.nextText.length ? it.nextText : it.now).join(" / ")}`; }).join("\n\n");
  try{
    const res = await SAMPLE.json(`You write development guidance for TPXimpact, a UK digital transformation consultancy working mostly with public-sector and purpose-led clients. The person is a ${short(A.level)} ${A.role} (${A.practice}). For each item below, write guidance to reach the TARGET. For items rated "Partially Met" the target is what's expected at their level; for items rated "Met" the target is the next level up, to move them to "Exceeding". Write:
- "examples": 2 concrete, realistic examples (each under 40 words, second person, present tense) of someone doing the TARGET on a real client engagement.
- "actions": 2 specific things to try in the next month (each under 25 words, starting with a verb).
- "resource": one real, well-known book, course, framework or certification with "title" and "by". Only suggest things you're confident exist.
Use British English. Return ONLY JSON: {"items":[{"key":"...","examples":[],"actions":[],"resource":{"title":"","by":""}}]}

${brief}`, {modelTier:"quick"});
    (res.items||[]).forEach(x => { if(x && x.key && Array.isArray(x.examples)) AI[x.key] = {examples:x.examples.slice(0,2), actions:(x.actions||[]).slice(0,2), resource:x.resource && x.resource.title ? x.resource : null}; });
  }catch(e){ console.warn("tips failed", e); }
  need.forEach(it => { if(AI[it.key]===undefined) AI[it.key] = null; });
  aiBusy = false;
  if(A) vGame(true);
}
async function connectSample(){
  try{ if(window.claude && window.claude.use){ SAMPLE = await window.claude.use("sample"); if(SAMPLE && A) vGame(true); } }catch(e){}
}

// Unlock audio on the first tap or key press (needed on Safari/iOS)
["pointerdown","keydown"].forEach(ev => window.addEventListener(ev, unlockAudio, {once:true}));

// ---------- Boot ----------
try{ A = JSON.parse(localStorage.getItem(KEY)||"null"); }catch(e){ A = null; }
if(A && findRole(A.role)) vGame(); else { A = null; vStart(); }
connectSample();
