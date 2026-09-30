// Pixel-art sprites drawn as SVG rects.
export const PAL = {H:"#7E2553",S:"#FFCCAA",K:"#1D2B53",B:"#29ADFF",P:"#1D2B53",R:"#FF004D",Y:"#FFEC27",W:"#FFF1E8",G:"#5F574F",L:"#C2C3C7"};
export function pixelSvg(rows, cls=""){
  const h = rows.length, w = rows[0].length; let r = "";
  rows.forEach((row,y) => [...row].forEach((c,x) => { if(PAL[c]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[c]}"/>`; }));
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
export const HERO = ["....HHHH....","...HHHHHH...","..HHSSSSHH..","..HSKSSKSH..","..HSSSSSSH..","...SSRRSS...","....SSSS....","..BBBBBBBB..",".SBBBYYBBBS.",".SBBBBBBBBS.","...PPPPPP...","...PP..PP...","...PP..PP...","..KKK..KKK.."];
export const CASTLE = ["L.L.L....L.L.L","LLLLL....LLLLL",".LLL......LLL.",".LLLL.LL.LLLL.",".LLLLLLLLLLLL.",".LLLLLLLLLLLL.",".LLLLGGGGLLLL.",".LLLGGGGGGLLL.",".LLLGGGGGGLLL.",".LLLGGGGGGLLL."];

