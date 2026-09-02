'use strict';

let cloudClient = null;
let cloudUser = null;
let cloudSyncTimer = null;
let cloudApplying = false;
let latestProfileMetrics = null;

const CLOUD_CFG_KEY = 'sat_cloud_cfg';
const GROUP_CODE_KEY = 'sat_group_code';   // legacy single-group keys, migrated on load
const GROUP_NAME_KEY = 'sat_group_name';
const GROUPS_KEY = 'sat_groups';           // [{code, name}, ...]
const ACTIVE_GROUP_KEY = 'sat_active_group';
const AVATAR_SEED_KEY = 'sat_avatar_seed';
let groupList = [];       // every group this device is in
let activeGroupCode = ''; // which one's leaderboard is shown
let pendingGroupJoin = null;

function loadGroups() {
  try {
    const raw = JSON.parse(localStorage.getItem(GROUPS_KEY) || 'null');
    if (Array.isArray(raw)) groupList = raw.filter(g => g && g.code);
    // Migrate the old single-group keys.
    const legacyCode = localStorage.getItem(GROUP_CODE_KEY);
    if (legacyCode && !groupList.some(g => g.code === legacyCode)) {
      groupList.push({ code: legacyCode, name: localStorage.getItem(GROUP_NAME_KEY) || 'Study group' });
    }
    activeGroupCode = localStorage.getItem(ACTIVE_GROUP_KEY) || (groupList[0] && groupList[0].code) || '';
  } catch (e) { groupList = []; activeGroupCode = ''; }
}

function saveGroups() {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groupList));
    localStorage.setItem(ACTIVE_GROUP_KEY, activeGroupCode);
    localStorage.removeItem(GROUP_CODE_KEY);
    localStorage.removeItem(GROUP_NAME_KEY);
  } catch (e) { /* ignore */ }
}

function activeGroupName() {
  const g = groupList.find(x => x.code === activeGroupCode);
  return g ? g.name : 'Group';
}

// Stable per-device seed for the pixel avatar. Prefer the auth user id (unique),
// fall back to a random persisted string for anonymous-before-signin.
function avatarSeed() {
  if (cloudUser && cloudUser.id) return cloudUser.id;
  try {
    let s = localStorage.getItem(AVATAR_SEED_KEY);
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(AVATAR_SEED_KEY, s); }
    return s;
  } catch (e) { return 'seed'; }
}

// Config can arrive three ways: the committed cloud-config.js, a value the owner
// pasted into Settings (localStorage), or an invite link (#cfg=... in the URL).
// The publishable key is safe in a link — row-level security guards the data.
function bootstrapCloudConfig() {
  try {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const packed = hash.get('cfg');
    if (packed) {
      const cfg = JSON.parse(atob(packed.replace(/-/g, '+').replace(/_/g, '/')));
      if (cfg && cfg.u && cfg.k) localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify(cfg));
    }
    const join = hash.get('join') || new URLSearchParams(location.search).get('join');
    if (join) pendingGroupJoin = join.trim().toUpperCase().slice(0, 12);
  } catch (error) { /* malformed link, ignore */ }

  const file = window.SAT_CLOUD_CONFIG || {};
  if (file.url && file.publishableKey) return;
  try {
    const saved = JSON.parse(localStorage.getItem(CLOUD_CFG_KEY) || 'null');
    if (saved && saved.u && saved.k) window.SAT_CLOUD_CONFIG = { url: saved.u, publishableKey: saved.k };
  } catch (error) { /* ignore */ }
}

bootstrapCloudConfig();
loadGroups();

function saveCloudConfigValues(url, key) {
  url = String(url || '').trim().replace(/\/+$/, '');
  key = String(key || '').trim();
  if (!/^https:\/\/.+\.supabase\.co$/.test(url) || key.length < 20) {
    showToast('Enter the Project URL (https://xxxx.supabase.co) and the anon/publishable key.');
    return false;
  }
  localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify({ u: url, k: key }));
  window.SAT_CLOUD_CONFIG = { url, publishableKey: key };
  showToast('Cloud project saved on this device. Connecting…');
  cloudClient = null;
  initializeCloudSync().then(renderGroupPanel);
  return true;
}

function cloudConfigured() {
  const config = window.SAT_CLOUD_CONFIG || {};
  return Boolean(config.url && config.publishableKey);
}

function setCloudState(copy, online = false) {
  const status = document.getElementById('cloud-state');
  if (!status) return;
  status.textContent = copy;
  status.classList.toggle('online', online);
}

function renderCloudUnavailable() {
  setCloudState('Saved on this device');
  const list = document.getElementById('leaderboard-list');
  if (list) list.innerHTML = '<div class="leader-row"><span>—</span><strong>Cloud database not connected</strong><span>Local profile ready</span><span>— XP</span></div>';
}

function loadSupabaseSdk() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the cloud client.'));
    document.head.appendChild(script);
  });
}

async function initializeCloudSync() {
  if (!cloudConfigured()) {
    renderCloudUnavailable();
    renderGroupPanel();
    return;
  }
  try {
    setCloudState('Connecting…');
    await loadSupabaseSdk();
    const config = window.SAT_CLOUD_CONFIG;
    cloudClient = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await cloudClient.auth.getSession();
    cloudClient.auth.onAuthStateChange((event, session) => {
      cloudUser = session && session.user ? session.user : null;
      if (cloudUser && event !== 'INITIAL_SESSION') handleCloudSession();
      if (!cloudUser) {
        setCloudState('Cloud ready · sign in');
        renderCloudUnavailable();
      }
    });
    cloudUser = data.session && data.session.user ? data.session.user : null;
    // An invite link (or an existing membership) needs an account, but not an
    // email — sign the friend in anonymously so the link just works.
    if (!cloudUser && (pendingGroupJoin || groupList.length)) {
      const { data: anon, error: anonError } = await cloudClient.auth.signInAnonymously();
      if (anonError) showToast(`Enable "Anonymous sign-ins" in Supabase Auth settings. (${anonError.message})`);
      else cloudUser = anon.user;
    }
    if (cloudUser) await handleCloudSession();
    else {
      setCloudState('Cloud ready · sign in');
      await refreshLeaderboard();
    }
    renderGroupPanel();
  } catch (error) {
    setCloudState('Cloud connection failed');
    if (typeof showToast === 'function') showToast(error.message);
  }
}

async function sendLoginLink() {
  if (!cloudConfigured()) {
    showToast('Cloud needs a Supabase project first. The profile still saves on this device.');
    return;
  }
  if (!cloudClient) await initializeCloudSync();
  const email = document.getElementById('cloud-email').value.trim();
  if (!email) {
    showToast('Enter your email address first.');
    return;
  }
  const redirectTo = `${location.origin}${location.pathname}`;
  const { error } = await cloudClient.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) showToast(`Could not send login link: ${error.message}`);
  else showToast('Login link sent. Open it on this device to connect your account.');
}

async function signOutCloud() {
  if (!cloudClient || !cloudUser) {
    showToast('No cloud account is signed in on this device.');
    return;
  }
  await cloudClient.auth.signOut({ scope: 'local' });
  cloudUser = null;
  setCloudState('Cloud ready · sign in');
  showToast('Signed out on this device. Local data was kept.');
  renderGroupPanel();
}

// ---- Email + password accounts (backup + study across devices) ------------
function validEmailPassword(email, password) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim())) { showToast('Enter a valid email address.'); return false; }
  if (String(password || '').length < 6) { showToast('Password must be at least 6 characters.'); return false; }
  return true;
}

async function emailSignUp(email, password) {
  if (!validEmailPassword(email, password)) return;
  if (!cloudClient) await initializeCloudSync();
  if (!cloudClient) return showToast('Add your Supabase project first.');
  const { data, error } = await cloudClient.auth.signUp({ email: String(email).trim(), password });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return emailSignIn(email, password);
    if (/database error|saving new user/i.test(error.message)) {
      return showToast('Re-run the updated supabase-schema.sql in the Supabase SQL editor, then try again.');
    }
    return showToast(error.message);
  }
  if (data.user && !data.session) return showToast('Account made. Turn off "Confirm email" in Supabase (Auth → Providers → Email), or click the link in your inbox, then log in.');
  cloudUser = data.user;
  showToast('Account created — your words now back up to the cloud.');
  renderGroupPanel();
}

async function emailSignIn(email, password) {
  if (!validEmailPassword(email, password)) return;
  if (!cloudClient) await initializeCloudSync();
  if (!cloudClient) return showToast('Add your Supabase project first.');
  const { data, error } = await cloudClient.auth.signInWithPassword({ email: String(email).trim(), password });
  if (error) return showToast(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
  cloudUser = data.user;
  showToast('Signed in.');
  renderGroupPanel();
}

async function emailSignOut() {
  if (cloudClient) await cloudClient.auth.signOut({ scope: 'local' });
  cloudUser = null;
  groupList = [];
  activeGroupCode = '';
  saveGroups();
  showToast('Signed out. Your words stay on this device.');
  renderGroupPanel();
}

function acctEmail() { const el = document.getElementById('acct-email'); return el ? el.value : ''; }
function acctPassword() { const el = document.getElementById('acct-pw'); return el ? el.value : ''; }

async function handleCloudSession() {
  if (!cloudClient || !cloudUser) return;
  setCloudState('Checking cloud…', true);
  const { data: remote, error } = await cloudClient.from('vocab_states').select('state,updated_at').eq('user_id', cloudUser.id).maybeSingle();
  if (error) {
    setCloudState('Cloud schema needed');
    showToast('Cloud connected, but its database tables are not ready yet.');
    return;
  }
  const remoteTime = remote ? new Date(remote.updated_at).getTime() : 0;
  const localTime = new Date(appState.lastStudy || 0).getTime();
  if (remote && remote.state && remoteTime > localTime) {
    cloudApplying = true;
    if (typeof applyRemoteCloudState === 'function') applyRemoteCloudState(remote.state);
    cloudApplying = false;
    showToast('Newer progress restored from your cloud account.');
  } else await syncCloudNow();
  setCloudState(`Synced · ${cloudUser.email || 'guest'}`, true);
  if (pendingGroupJoin) {
    const code = pendingGroupJoin;
    pendingGroupJoin = null;
    await joinGroupByCode(code, true);
    if (activeGroupCode === code) showToast('Joined the group — open the Groups tab to see the leaderboard.');
  }
  await pushGroupStats();
  await refreshLeaderboard();
  renderGroupPanel();
}

// ---------------------------------------------------------------------------
// Friend groups
// ---------------------------------------------------------------------------
function groupDisplayName() {
  return ((typeof appState !== 'undefined' && appState.profile && appState.profile.name) || 'SAT learner').slice(0, 32);
}

// Pull the name from the Groups-view field into the profile before create/join,
// so nobody lands on the leaderboard as the default "SAT learner".
function ensureDisplayName() {
  const el = document.getElementById('group-display-name');
  const typed = (el && el.value || '').trim().slice(0, 32);
  if (typed) {
    if (typeof appState !== 'undefined') {
      appState.profile = appState.profile || {};
      appState.profile.name = typed;
      if (typeof saveAppState === 'function') saveAppState();
    }
    return true;
  }
  const current = (typeof appState !== 'undefined' && appState.profile && appState.profile.name) || '';
  return Boolean(current) && current !== 'SAT learner';
}

function nameNeededMsg() {
  return (typeof localText === 'function' && localText('groups.nameNeeded')) || 'Enter your name first — it shows on the leaderboard.';
}

// Editing the name field while already in a group updates the leaderboard live.
async function onGroupNameChange() {
  if (!ensureDisplayName() || !groupList.length) return;
  await pushGroupStats();
  await refreshGroupBoard();
}

function groupStatRow() {
  const metrics = latestProfileMetrics || (typeof profileMetrics === 'function' ? profileMetrics() : {});
  let learned = 0;
  const cards = (typeof appState !== 'undefined' && appState.progress) ? Object.values(appState.progress) : [];
  cards.forEach(deck => Object.values((deck && deck.cards) || {}).forEach(r => { if (Number(r.reviews || 0) > 0) learned += 1; }));
  const today = typeof localDateKey === 'function' ? localDateKey() : new Date().toISOString().slice(0, 10);
  const newToday = Number(((typeof appState !== 'undefined' && appState.newActivity) || {})[today] || 0);
  return {
    username: groupDisplayName(),
    avatar: avatarSeed(),
    xp: Number(metrics.xp || 0),
    streak: Number(metrics.streak || 0),
    mastered: Number(metrics.mastered || 0),
    words_learned: learned,
    new_today: newToday,
    updated_at: new Date().toISOString()
  };
}

function makeGroupCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

// ---- Pixel-sprite avatar (deterministic from a seed string) --------------
function pixelAvatarSvg(seed, px) {
  px = px || 40;
  let h = 2166136261;
  const str = String(seed || 'seed');
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const hue = Math.floor(rnd() * 360);
  const body = `hsl(${hue} 62% 55%)`;
  const dark = `hsl(${hue} 55% 34%)`;
  const eye = rnd() > 0.5 ? '#1b1b1b' : '#fffbe8';
  const grid = 7;
  let cells = '';
  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < Math.ceil(grid / 2); x += 1) {
      if (rnd() > 0.55) {
        const c = rnd() > 0.82 ? dark : body;
        cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
        if (x !== grid - 1 - x) cells += `<rect x="${grid - 1 - x}" y="${y}" width="1" height="1" fill="${c}"/>`;
      }
    }
  }
  const ey = 2 + Math.floor(rnd() * 2);
  cells += `<rect x="1" y="${ey}" width="1" height="1" fill="${eye}"/><rect x="5" y="${ey}" width="1" height="1" fill="${eye}"/>`;
  return `<svg class="pixel-av" width="${px}" height="${px}" viewBox="0 0 ${grid} ${grid}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="${grid}" height="${grid}" fill="hsl(${hue} 40% 90%)"/>${cells}</svg>`;
}

function groupInviteLink() {
  if (!activeGroupCode) return '';
  const config = window.SAT_CLOUD_CONFIG || {};
  const packed = btoa(JSON.stringify({ u: config.url, k: config.publishableKey }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base = `${location.origin}${location.pathname.replace(/profile\.html$/, 'index.html')}`;
  return `${base}?join=${activeGroupCode}#cfg=${packed}`;
}

async function ensureAccount() {
  if (!cloudClient) await initializeCloudSync();
  if (!cloudClient) { showToast('Add your Supabase project first.'); return false; }
  if (!cloudUser) {
    const { data: anon, error } = await cloudClient.auth.signInAnonymously();
    if (error) { showToast(`Enable Anonymous sign-ins in Supabase. (${error.message})`); return false; }
    cloudUser = anon.user;
  }
  return true;
}

async function createGroup(name) {
  if (!ensureDisplayName()) return showToast(nameNeededMsg());
  if (!(await ensureAccount())) return;
  const code = makeGroupCode();
  const label = (name || 'Study group').trim().slice(0, 40) || 'Study group';
  const { error } = await cloudClient.from('study_groups').insert({ code, name: label });
  if (error) return showToast(`Could not create the group: ${error.message}`);
  const input = document.getElementById('group-new-name');
  if (input) input.value = '';
  await joinGroupByCode(code, true);
  showToast(`Group "${label}" created — share the code ${code}.`);
}

async function joinGroupByCode(code, quiet) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return showToast('Enter a group code.');
  if (groupList.some(g => g.code === code)) { switchGroup(code); return; }
  if (!quiet && !ensureDisplayName()) return showToast(nameNeededMsg());
  if (!(await ensureAccount())) return;
  const { data: group, error: lookupError } = await cloudClient.from('study_groups').select('code,name').eq('code', code).maybeSingle();
  if (lookupError || !group) return showToast('That group code was not found.');
  const { error } = await cloudClient.from('group_members').upsert({ code, user_id: cloudUser.id, ...groupStatRow() });
  if (error) return showToast(`Could not join: ${error.message}`);
  groupList.push({ code, name: group.name || 'Study group' });
  activeGroupCode = code;
  saveGroups();
  const input = document.getElementById('group-join-code');
  if (input) input.value = '';
  if (!quiet) showToast(`Joined ${group.name}.`);
  renderGroupPanel();
}

function switchGroup(code) {
  if (!groupList.some(g => g.code === code)) return;
  activeGroupCode = code;
  saveGroups();
  renderGroupPanel();
}

async function leaveGroup(code) {
  code = code || activeGroupCode;
  if (!code) return;
  if (cloudClient && cloudUser) {
    await cloudClient.from('group_members').delete().eq('code', code).eq('user_id', cloudUser.id);
  }
  groupList = groupList.filter(g => g.code !== code);
  if (activeGroupCode === code) activeGroupCode = (groupList[0] && groupList[0].code) || '';
  saveGroups();
  showToast('Left the group.');
  renderGroupPanel();
}

async function pushGroupStats() {
  if (!cloudClient || !cloudUser || !groupList.length) return;
  const row = groupStatRow();
  await Promise.all(groupList.map(g =>
    cloudClient.from('group_members').upsert({ code: g.code, user_id: cloudUser.id, ...row })
  ));
}

let lastBoardRows = [];

function boardRowInner(entry, rank) {
  return `<span class="lr-rank">${rank}</span>`
    + `<span class="lr-av">${pixelAvatarSvg(entry.avatar || entry.username, 26)}</span>`
    + `<strong>${escapeHtml(entry.username)}</strong>`
    + `<span class="lr-sub">${entry.new_today} today · ${entry.streak}d · ${entry.mastered} mastered</span>`
    + `<span class="lr-xp">${Number(entry.xp).toLocaleString()} XP</span>`;
}

async function refreshGroupBoard() {
  const list = document.getElementById('leaderboard-list');
  const podium = document.getElementById('group-podium');
  if (!list || !cloudClient || !activeGroupCode) return;
  const { data, error } = await cloudClient.rpc('group_board', { p_code: activeGroupCode });
  if (podium) podium.innerHTML = '';
  if (error) { list.innerHTML = `<div class="leader-row"><span class="lr-rank">—</span><strong>Could not load the group</strong><span class="lr-sub">${escapeHtml(error.message)}</span><span></span></div>`; return; }
  if (!data || !data.length) { list.innerHTML = '<div class="leader-row"><span class="lr-rank">—</span><strong>No members yet</strong><span class="lr-sub">Share the invite code</span><span class="lr-xp">0 XP</span></div>'; return; }
  lastBoardRows = data;
  const mine = groupDisplayName();

  if (podium && data.length >= 2) {
    const order = [1, 0, 2]; // 2nd, 1st, 3rd — visual left-to-right
    podium.innerHTML = order.filter(i => data[i]).map(i => {
      const e = data[i];
      return `<button type="button" class="podium-slot p${i + 1}${e.username === mine ? ' is-me' : ''}" onclick="showMemberCard(${i})">`
        + `<span class="podium-medal">${['🥇', '🥈', '🥉'][i]}</span>`
        + `<span class="podium-av">${pixelAvatarSvg(e.avatar || e.username, 44)}</span>`
        + `<span class="podium-name">${escapeHtml(e.username)}</span>`
        + `<span class="podium-xp">${Number(e.xp).toLocaleString()} XP</span>`
        + `<span class="podium-block"></span></button>`;
    }).join('');
  }

  list.innerHTML = data.map((entry, index) =>
    `<button type="button" class="leader-row${entry.username === mine ? ' is-me' : ''}" onclick="showMemberCard(${index})">${boardRowInner(entry, index + 1)}</button>`
  ).join('');
}

function showMemberCard(index) {
  const e = lastBoardRows[index];
  const card = document.getElementById('member-card');
  const overlay = document.getElementById('member-overlay');
  if (!e || !card || !overlay) return;
  const joined = e.joined_at ? new Date(e.joined_at).toLocaleDateString() : '—';
  const tile = (label, value) => `<div class="mc-tile"><b>${value}</b><span>${label}</span></div>`;
  card.innerHTML = `<button type="button" class="mc-close" aria-label="Close" onclick="closeMemberCard()">×</button>`
    + `<div class="mc-head">${pixelAvatarSvg(e.avatar || e.username, 72)}<div><strong>${escapeHtml(e.username)}</strong><span>${escapeHtml(activeGroupName())} · joined ${joined}</span></div></div>`
    + `<div class="mc-grid">`
    + tile('XP', Number(e.xp).toLocaleString())
    + tile('Streak', `${e.streak}d`)
    + tile('Mastered', e.mastered)
    + tile('Words learned', e.words_learned)
    + tile('New today', e.new_today)
    + tile('Rank', `#${index + 1}`)
    + `</div>`;
  overlay.classList.remove('hidden');
}

function closeMemberCard() {
  const overlay = document.getElementById('member-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function renderGroupTabs() {
  const tabs = document.getElementById('group-tabs');
  if (!tabs) return;
  if (groupList.length < 2) { tabs.innerHTML = ''; return; }
  tabs.innerHTML = groupList.map(g =>
    `<button type="button" class="group-tab${g.code === activeGroupCode ? ' active' : ''}" onclick="switchGroup('${g.code}')">${escapeHtml(g.name)}</button>`
  ).join('');
}

function renderGroupPanel() {
  const view = document.getElementById('groups-view');
  if (!view) return;
  // Account block: email login is optional, adds cloud backup + cross-device.
  const signedIn = Boolean(cloudUser && cloudUser.email);
  const outEl = document.getElementById('account-signedout');
  const inEl = document.getElementById('account-signedin');
  if (outEl) outEl.classList.toggle('hidden', signedIn);
  if (inEl) inEl.classList.toggle('hidden', !signedIn);
  const who = document.getElementById('acct-who');
  if (who && signedIn) who.textContent = cloudUser.email;
  const acctCard = document.getElementById('account-card');
  if (acctCard) acctCard.classList.toggle('hidden', !cloudConfigured());

  const nameInput = document.getElementById('group-display-name');
  if (nameInput && !nameInput.value) {
    const current = (typeof appState !== 'undefined' && appState.profile && appState.profile.name) || '';
    if (current && current !== 'SAT learner') nameInput.value = current;
  }
  const inGroup = groupList.length > 0;
  const liveCard = document.getElementById('group-live-card');
  const note = document.getElementById('group-setup-note');
  if (liveCard) liveCard.classList.toggle('hidden', !inGroup);
  if (note) note.classList.toggle('hidden', cloudConfigured());
  if (inGroup) {
    if (!activeGroupCode) activeGroupCode = groupList[0].code;
    renderGroupTabs();
    const codeEl = document.getElementById('group-code-label');
    if (codeEl) codeEl.textContent = activeGroupCode;
    const nameEl = document.getElementById('group-name-label');
    if (nameEl) nameEl.textContent = activeGroupName();
    refreshGroupBoard();
  }
}

function copyGroupCode() {
  if (!activeGroupCode) return;
  navigator.clipboard.writeText(activeGroupCode).then(
    () => showToast(`Code ${activeGroupCode} copied — send it to friends.`),
    () => showToast(`Group code: ${activeGroupCode}`)
  );
}

function copyGroupInvite() {
  const link = groupInviteLink();
  if (!link) return;
  navigator.clipboard.writeText(link).then(
    () => showToast('Invite link copied.'),
    () => showToast(link)
  );
}

function queueCloudSync() {
  if (cloudApplying || !cloudClient || !cloudUser) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(syncCloudNow, 1200);
}

function updateCloudProfilePreview(metrics) {
  latestProfileMetrics = metrics;
}

async function syncCloudNow() {
  if (!cloudClient || !cloudUser || cloudApplying) return false;
  clearTimeout(cloudSyncTimer);
  const metrics = latestProfileMetrics || profileMetrics();
  const profile = appState.profile || {};
  const stateResult = await cloudClient.from('vocab_states').upsert({ user_id: cloudUser.id, state: appState, updated_at: new Date().toISOString() });
  const profileResult = await cloudClient.from('profiles').upsert({
    user_id: cloudUser.id,
    username: profile.name || 'SAT learner',
    bio: profile.bio || '',
    leaderboard_opt_in: Boolean(profile.leaderboardOptIn),
    xp: metrics.xp,
    total_reviews: metrics.reviews,
    mastered: metrics.mastered,
    streak: metrics.streak,
    updated_at: new Date().toISOString()
  });
  if (stateResult.error || profileResult.error) {
    setCloudState('Sync failed');
    return false;
  }
  await pushGroupStats();
  if (activeGroupCode) refreshGroupBoard();
  setCloudState(`Synced · ${cloudUser.email || 'guest'}`, true);
  return true;
}

async function refreshLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  if (!cloudClient) {
    renderCloudUnavailable();
    return;
  }
  const { data, error } = await cloudClient.from('profiles').select('user_id,username,xp,streak,mastered').eq('leaderboard_opt_in', true).order('xp', { ascending: false }).limit(25);
  if (error || !data || !data.length) {
    list.innerHTML = '<div class="leader-row"><span>—</span><strong>No ranked learners yet</strong><span>Opt in to be first</span><span>0 XP</span></div>';
    return;
  }
  list.innerHTML = data.map((entry, index) => `<div class="leader-row"><span>${index + 1}</span><strong>${escapeHtml(entry.username)}</strong><span>${entry.streak}d · ${entry.mastered} mastered</span><span>${Number(entry.xp).toLocaleString()} XP</span></div>`).join('');
}

renderCloudUnavailable();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderGroupPanel);
else renderGroupPanel();
