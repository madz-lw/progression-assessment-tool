// Mirrors the assessment template: Partially Met = 2, Met = 3, Exceeding = 4.
import { POINTS } from "./framework.js";
export const average = (items, ratings) => { const p = items.map(x=>POINTS[ratings[x.key]]).filter(Boolean); return p.length ? p.reduce((a,b)=>a+b,0)/p.length : null; };
export const label = v => v==null ? null : v<3 ? "Partially Met" : v<3.75 ? "Met" : "Exceeding";
export const overall = (skills, behaviours) => skills!=null && behaviours!=null ? Math.round((skills+behaviours)/2*100)/100 : null;
