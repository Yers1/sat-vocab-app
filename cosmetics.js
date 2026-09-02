'use strict';

// ---------------------------------------------------------------------------
// Cosmetics: procedural pixel heroes, CSS frames, CSS banners, crystals.
// No image assets. Every sprite is drawn from a small integer spec so the
// catalogue entries look distinct and render identically everywhere, offline.
// State lives in appState.cosmetics and rides the normal cloud sync.
// ---------------------------------------------------------------------------

const COSMETIC_FREE_CHARS = ['sprout', 'acorn', 'pebble', 'cloud'];

function defaultCosmetics() {
  return {
    crystals: 0,
    character: 'sprout',
    frame: 'none',
    banner: 'none',
    owned: { characters: COSMETIC_FREE_CHARS.slice(), frames: ['none'], banners: ['none'] },
    granted: false
  };
}

function cosmeticState() {
  if (typeof appState === 'undefined') return defaultCosmetics();
  const base = defaultCosmetics();
  const c = appState.cosmetics && typeof appState.cosmetics === 'object' ? appState.cosmetics : {};
  c.crystals = Math.max(0, Math.round(Number(c.crystals) || 0));
  c.character = c.character || base.character;
  c.frame = c.frame || base.frame;
  c.banner = c.banner || base.banner;
  c.owned = c.owned && typeof c.owned === 'object' ? c.owned : base.owned;
  ['characters', 'frames', 'banners'].forEach(k => {
    c.owned[k] = Array.isArray(c.owned[k]) ? c.owned[k] : base.owned[k].slice();
  });
  COSMETIC_FREE_CHARS.forEach(id => { if (!c.owned.characters.includes(id)) c.owned.characters.push(id); });
  if (!c.owned.frames.includes('none')) c.owned.frames.push('none');
  if (!c.owned.banners.includes('none')) c.owned.banners.push('none');
  appState.cosmetics = c;
  return c;
}

// One-time top-up so returning players who already have levels/mastery aren't broke.
function grantStartingCrystals() {
  const c = cosmeticState();
  if (c.granted) return;
  const m = typeof profileMetrics === 'function' ? profileMetrics() : { mastered: 0, level: 1, streak: 0 };
  c.crystals += Math.min(600, (m.mastered || 0) * 3 + (m.level || 1) * 15 + (m.streak || 0) * 4);
  c.granted = true;
  if (typeof saveAppState === 'function') saveAppState();
}

const CRYSTAL_REASONS = { test: 'from the test', session: 'from that session', round: 'from that round' };

function grantCrystals(n, reason) {
  n = Math.round(n);
  if (!n) return;
  const c = cosmeticState();
  c.crystals = Math.max(0, c.crystals + n);
  if (typeof saveAppState === 'function') saveAppState();
  renderCrystalCounts();
  if (reason && n > 0 && typeof showToast === 'function') {
    showToast(`◆ +${n} crystals ${CRYSTAL_REASONS[reason] || ''}`.trim());
  }
}

function renderCrystalCounts() {
  const n = cosmeticState().crystals;
  document.querySelectorAll('[data-crystal-count]').forEach(el => { el.textContent = n.toLocaleString(); });
}

// ---- Sprite generator --------------------------------------------------------
// spec: { hue, ears, hat, eyes, pattern }  — small ints, drives a 12x12 sprite.
function characterSprite(spec, px) {
  spec = spec || {};
  px = px || 40;
  const hue = ((spec.hue || 0) % 360 + 360) % 360;
  const body = `hsl(${hue} 58% 58%)`;
  const dark = `hsl(${hue} 52% 37%)`;
  const light = `hsl(${hue} 50% 84%)`;
  const hatC = `hsl(${(hue + 165) % 360} 55% 56%)`;
  const eye = spec.eyes ? '#fff8e8'.replace('ff8', 'ff8') : '#1b1b1b';
  const G = 12;
  const cells = [];
  const put = (x, y, c) => { if (x >= 0 && x < G && y >= 0 && y < G) cells.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`); };
  const sym = (x, y, c) => { put(x, y, c); put(G - 1 - x, y, c); };

  // head
  for (let y = 2; y <= 6; y += 1) for (let x = 3; x <= 5; x += 1) sym(x, y, body);
  sym(2, 3, body); sym(2, 4, body); sym(2, 5, body);
  // body
  for (let y = 7; y <= 10; y += 1) for (let x = 3; x <= 5; x += 1) sym(x, y, body);
  sym(3, 11, dark); // feet
  // outline shading
  sym(2, 6, dark); sym(3, 10, dark);

  // ears
  if (spec.ears === 1) { sym(2, 1, body); sym(2, 2, body); sym(3, 1, body); }          // cat
  else if (spec.ears === 2) { sym(2, 2, body); sym(1, 3, body); sym(1, 4, body); }     // round
  else if (spec.ears === 3) { put(5, 0, dark); put(6, 0, dark); put(5, 1, dark); put(6, 1, dark); put(5, 2, '#f2d9a4'); put(6, 2, '#f2d9a4'); } // antenna

  // hat
  if (spec.hat === 1) { for (let x = 2; x <= 5; x += 1) sym(x, 1, hatC); sym(1, 2, hatC); }        // cap
  else if (spec.hat === 2) { sym(3, 0, '#f0d98c'); sym(5, 0, '#f0d98c'); sym(4, 1, '#f0d98c'); sym(3, 1, '#e0b94b'); sym(5, 1, '#e0b94b'); } // crown
  else if (spec.hat === 3) { for (let x = 3; x <= 5; x += 1) sym(x, 0, '#ffe27a'); }               // halo

  // pattern
  if (spec.pattern === 1) { for (let y = 8; y <= 10; y += 1) { put(5, y, light); put(6, y, light); } } // belly
  else if (spec.pattern === 2) { sym(3, 8, dark); sym(5, 9, dark); put(4, 4, dark); }               // spots

  // eyes + cheek
  sym(4, 4, eye);
  sym(3, 5, `hsl(${hue} 60% 70%)`);

  return `<svg class="hero-sprite" width="${px}" height="${px}" viewBox="0 0 ${G} ${G}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="${G}" height="${G}" fill="none"/>${cells.join('')}</svg>`;
}

// ---- Catalogues ------------------------------------------------------------
const CHARACTERS = [
  { id: 'sprout', name: 'Sprout', spec: { hue: 130, ears: 0, hat: 0, eyes: 0, pattern: 1 }, unlock: { type: 'free' } },
  { id: 'acorn', name: 'Acorn', spec: { hue: 30, ears: 2, hat: 0, eyes: 0, pattern: 0 }, unlock: { type: 'free' } },
  { id: 'pebble', name: 'Pebble', spec: { hue: 210, ears: 0, hat: 0, eyes: 0, pattern: 2 }, unlock: { type: 'free' } },
  { id: 'cloud', name: 'Cloud', spec: { hue: 265, ears: 0, hat: 0, eyes: 1, pattern: 1 }, unlock: { type: 'free' } },
  { id: 'mocha', name: 'Mocha', spec: { hue: 20, ears: 1, hat: 0, eyes: 0, pattern: 1 }, unlock: { type: 'level', value: 2 } },
  { id: 'mint', name: 'Mint', spec: { hue: 160, ears: 1, hat: 0, eyes: 0, pattern: 0 }, unlock: { type: 'level', value: 4 } },
  { id: 'grape', name: 'Grape', spec: { hue: 285, ears: 2, hat: 0, eyes: 1, pattern: 2 }, unlock: { type: 'level', value: 6 } },
  { id: 'ember', name: 'Ember', spec: { hue: 8, ears: 1, hat: 0, eyes: 1, pattern: 2 }, unlock: { type: 'level', value: 9 } },
  { id: 'streaker', name: 'Comet', spec: { hue: 195, ears: 3, hat: 0, eyes: 1, pattern: 0 }, unlock: { type: 'streak', value: 7 } },
  { id: 'flame-keeper', name: 'Flarelet', spec: { hue: 45, ears: 0, hat: 2, eyes: 1, pattern: 1 }, unlock: { type: 'streak', value: 21 } },
  { id: 'scholar', name: 'Scholar', spec: { hue: 240, ears: 0, hat: 1, eyes: 0, pattern: 0 }, unlock: { type: 'mastered', value: 50 } },
  { id: 'sage', name: 'Sage', spec: { hue: 95, ears: 2, hat: 1, eyes: 1, pattern: 1 }, unlock: { type: 'mastered', value: 200 } },
  { id: 'angelet', name: 'Angelet', spec: { hue: 55, ears: 0, hat: 3, eyes: 1, pattern: 1 }, unlock: { type: 'achievement', value: 'week' } },
  { id: 'monarch', name: 'Monarch', spec: { hue: 340, ears: 1, hat: 2, eyes: 1, pattern: 2 }, unlock: { type: 'achievement', value: 'month' } },
  { id: 'buddy', name: 'Buddy', spec: { hue: 15, ears: 1, hat: 1, eyes: 0, pattern: 1 }, unlock: { type: 'referral', value: 1 } },
  { id: 'crew', name: 'Crew Chief', spec: { hue: 300, ears: 3, hat: 1, eyes: 1, pattern: 2 }, unlock: { type: 'referral', value: 3 } },
  { id: 'onyx', name: 'Onyx', spec: { hue: 260, ears: 1, hat: 2, eyes: 1, pattern: 2 }, unlock: { type: 'crystals', cost: 400 } },
  { id: 'aurora', name: 'Aurora', spec: { hue: 175, ears: 2, hat: 3, eyes: 1, pattern: 1 }, unlock: { type: 'crystals', cost: 750 } }
];

const FRAMES = [
  { id: 'none', name: 'None', unlock: { type: 'free' } },
  { id: 'bronze', name: 'Bronze ring', unlock: { type: 'level', value: 2 } },
  { id: 'silver', name: 'Silver ring', unlock: { type: 'level', value: 5 } },
  { id: 'gold', name: 'Gold ring', unlock: { type: 'level', value: 8 } },
  { id: 'glow', name: 'Focus glow', unlock: { type: 'streak', value: 14 } },
  { id: 'pixeldash', name: 'Pixel dash', unlock: { type: 'mastered', value: 100 } },
  { id: 'aurora', name: 'Aurora ring', unlock: { type: 'crystals', cost: 300 } }
];

const BANNERS = [
  { id: 'none', name: 'None', unlock: { type: 'free' } },
  { id: 'dawn', name: 'Dawn', unlock: { type: 'level', value: 3 } },
  { id: 'forest', name: 'Deep forest', unlock: { type: 'mastered', value: 25 } },
  { id: 'ember', name: 'Ember', unlock: { type: 'streak', value: 10 } },
  { id: 'void', name: 'Void', unlock: { type: 'achievement', value: 'clean-run' } },
  { id: 'crystalline', name: 'Crystalline', unlock: { type: 'crystals', cost: 500 } },
  { id: 'aurora', name: 'Aurora', unlock: { type: 'achievement', value: 'month' } }
];

// ---- Unlock logic -------------------------------------------------------------
function unlockContext() {
  const m = typeof profileMetrics === 'function' ? profileMetrics() : { level: 1, streak: 0, mastered: 0, cleanRun: 0, longestInterval: 0 };
  const ach = new Set();
  if (m.streak >= 7) ach.add('week');
  if (m.streak >= 30) ach.add('month');
  if ((m.cleanRun || 0) >= 20) ach.add('clean-run');
  return {
    level: m.level || 1,
    streak: m.streak || 0,
    mastered: m.mastered || 0,
    crystals: cosmeticState().crystals,
    referrals: Number((typeof appState !== 'undefined' && appState.cosmetics && appState.cosmetics.referrals) || 0),
    ach
  };
}

function isOwned(kind, id) {
  return cosmeticState().owned[kind].includes(id);
}

// Can the player claim this item right now (met the requirement, not yet owned)?
function meetsUnlock(item, ctx) {
  const u = item.unlock || { type: 'free' };
  if (u.type === 'free') return true;
  if (u.type === 'level') return ctx.level >= u.value;
  if (u.type === 'streak') return ctx.streak >= u.value;
  if (u.type === 'mastered') return ctx.mastered >= u.value;
  if (u.type === 'referral') return ctx.referrals >= u.value;
  if (u.type === 'achievement') return ctx.ach.has(u.value);
  if (u.type === 'crystals') return ctx.crystals >= u.cost;
  return false;
}

function unlockLabel(item) {
  const u = item.unlock || {};
  if (u.type === 'level') return `Level ${u.value}`;
  if (u.type === 'streak') return `${u.value}-day streak`;
  if (u.type === 'mastered') return `${u.value} words mastered`;
  if (u.type === 'referral') return u.value === 1 ? 'Bring 1 friend into a group' : `${u.value} friends in your groups`;
  if (u.type === 'achievement') return { week: 'Full-week streak', month: 'Month streak', 'clean-run': '20 clean recalls in a row' }[u.value] || 'Achievement';
  if (u.type === 'crystals') return `${u.cost} crystals`;
  return '';
}

// Auto-claim anything that is requirement-gated and now met (level/streak/mastered/
// referral/achievement). Crystal items still need an explicit buy.
function reconcileUnlocks() {
  const ctx = unlockContext();
  const c = cosmeticState();
  let changed = false;
  const sweep = (list, kind) => list.forEach(item => {
    if (item.unlock.type === 'crystals') return;
    if (!c.owned[kind].includes(item.id) && meetsUnlock(item, ctx)) { c.owned[kind].push(item.id); changed = true; }
  });
  sweep(CHARACTERS, 'characters');
  sweep(FRAMES, 'frames');
  sweep(BANNERS, 'banners');
  if (changed && typeof saveAppState === 'function') saveAppState();
  return changed;
}

function buyCosmetic(kind, id) {
  const list = { characters: CHARACTERS, frames: FRAMES, banners: BANNERS }[kind];
  const item = list.find(x => x.id === id);
  const c = cosmeticState();
  if (!item || c.owned[kind].includes(id)) return false;
  if (item.unlock.type !== 'crystals') return false;
  if (c.crystals < item.unlock.cost) { if (typeof showToast === 'function') showToast('Not enough crystals yet.'); return false; }
  c.crystals -= item.unlock.cost;
  c.owned[kind].push(id);
  if (typeof saveAppState === 'function') saveAppState();
  if (typeof showToast === 'function') showToast(`Unlocked ${item.name}.`);
  return true;
}

function equipCosmetic(kind, id) {
  const c = cosmeticState();
  if (!c.owned[kind].includes(id)) return false;
  c[{ characters: 'character', frames: 'frame', banners: 'banner' }[kind]] = id;
  if (typeof saveAppState === 'function') saveAppState();
  if (typeof queueCloudSync === 'function') queueCloudSync();
  return true;
}

// ---- Rendering helpers -----------------------------------------------------
function characterSpec(id) {
  const item = CHARACTERS.find(x => x.id === id);
  return item ? item.spec : CHARACTERS[0].spec;
}

function equippedCharacterSvg(px) {
  return characterSprite(characterSpec(cosmeticState().character), px);
}

// Compact token stored in group_members.avatar so peers render the same hero.
function avatarToken() {
  const c = cosmeticState();
  return `c:${c.character}|f:${c.frame}`;
}

function tokenSprite(token, px) {
  const m = /(?:^|\|)c:([a-z0-9-]+)/i.exec(String(token || ''));
  if (m && CHARACTERS.some(x => x.id === m[1])) return characterSprite(characterSpec(m[1]), px);
  // legacy plain-seed avatars: derive a stable spec from the string
  let h = 2166136261;
  const s = String(token || 'seed');
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h = h >>> 0;
  return characterSprite({ hue: h % 360, ears: h % 4, hat: (h >> 3) % 4, eyes: (h >> 6) % 2, pattern: (h >> 8) % 3 }, px);
}

function tokenFrameClass(token) {
  const m = /(?:^|\|)f:([a-z0-9-]+)/i.exec(String(token || ''));
  return m && FRAMES.some(x => x.id === m[1]) ? `frame-${m[1]}` : 'frame-none';
}

// Pixel medal for the podium (rank 1-3), gold/silver/bronze with a shine.
function pixelMedalSvg(rank, px) {
  px = px || 22;
  const metal = ['#e9c045', '#cfcfcf', '#cf9b62'][rank - 1] || '#cfcfcf';
  const rim = ['#a9822a', '#9a9a9a', '#8f6238'][rank - 1] || '#9a9a9a';
  const G = 11;
  const P = (x, y, c) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
  let s = '';
  s += P(4, 0, '#b13d31') + P(6, 0, '#b13d31') + P(4, 1, '#d05a4c') + P(6, 1, '#d05a4c'); // ribbon
  for (let y = 3; y <= 9; y += 1) for (let x = 2; x <= 8; x += 1) {
    const edge = x === 2 || x === 8 || y === 3 || y === 9;
    if ((x === 2 && y === 3) || (x === 8 && y === 3) || (x === 2 && y === 9) || (x === 8 && y === 9)) continue;
    s += P(x, y, edge ? rim : metal);
  }
  s += P(4, 5, '#fff6d8') + P(5, 4, '#fff6d8'); // highlight
  return `<svg class="pixel-medal r${rank}" width="${px}" height="${px}" viewBox="0 0 ${G} ${G}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}
