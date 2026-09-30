// 8-bit sound effects using the Web Audio API.
const SOUNDKEY = "levelup-sound";
export const audio = { on: true };
try{ audio.on = localStorage.getItem(SOUNDKEY) !== "off"; }catch(e){}
export function setSound(on){ audio.on = on; try{ localStorage.setItem(SOUNDKEY, on?"on":"off"); }catch(e){} }
let AC = null;
export function note(freq, start, dur, type="square", vol=.06){
  if(!audio.on) return;
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if(AC.state === "suspended") AC.resume();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(AC.destination);
    const t = AC.currentTime + start; o.start(t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t+dur); o.stop(t+dur+.02);
  }catch(e){}
}
export const SFX = {
  coin(){ note(988,0,.08); note(1319,.08,.25); },
  tick(){ note(660,0,.06); note(880,.06,.1); },
  untick(){ note(440,0,.08,"triangle"); },
  clear(){ [523,659,784,1047].forEach((f,i)=>note(f,i*.1,.18)); note(1047,.45,.4,"triangle",.08); },
  levelup(){ [392,523,659,784,1047,1319].forEach((f,i)=>note(f,i*.08,.14)); },
  ach(){ note(784,0,.08); note(1175,.09,.2); },
  bump(){ note(196,0,.07,"square",.05); }
};


// Unlock audio on the first tap or key press (needed on Safari/iOS)
export function unlockAudio(){
  try{ AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if(AC.state === "suspended") AC.resume(); }catch(e){}
}
