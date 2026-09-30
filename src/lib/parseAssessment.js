// Reads a completed Progression Assessment 2026 (.xlsx) in the browser.
// Cell positions match the template's "Your self assessment" tab.
import * as XLSX from "xlsx";
import { RATINGS, findRole } from "./framework.js";

export async function parseAssessment(file){
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), {type:"array"});
  const ws = wb.Sheets["Your self assessment"];
  if(!ws) throw new Error("This file has no 'Your self assessment' tab. Use the Progression Assessment 2026 template.");
  const v = a => { const c = ws[a]; return c ? String(c.w ?? c.v ?? "").trim() : ""; };
  const role = findRole(v("G6"));
  if(!role) throw new Error(`The job role in cell G6 ("${v("G6")||"blank"}") isn't in the 2026 framework.`);
  let name = v("G3"); if(/enter your name|^your name$/i.test(name)) name = "";
  const a = {name, role:role.role, practice:role.practice, level:v("G7"), ratings:{}, evidence:{}, done:{}, notes:{}, sample:false};
  const norm = r => RATINGS.find(x => x.toLowerCase() === r.toLowerCase());
  let n = 0;
  // Skills: rows 31-39, behaviours: rows 47-51. Column B = name, G = evidence, J = rating.
  [[31,39,"s:"],[47,51,"b:"]].forEach(([from,to,p]) => { for(let r=from;r<=to;r++){ const nm=v("B"+r); if(!nm) continue; const rt=norm(v("J"+r)); if(rt){a.ratings[p+nm]=rt; n++;} if(v("G"+r)) a.evidence[p+nm]=v("G"+r); } });
  if(!n) throw new Error("This assessment has no ratings yet. Fill in 'Your working level' for each skill and behaviour, then load it again.");
  return a;
}
