'use strict';

let cloudClient = null;
let cloudUser = null;
let cloudSyncTimer = null;
let cloudApplying = false;
let latestProfileMetrics = null;

const CLOUD_CFG_KEY = 'sat_cloud_cfg';
const GROUP_CODE_KEY = 'sat_group_code';
const GROUP_NAME_KEY = 'sat_group_name';
let groupCode = null;
let groupName = '';
let pendingGroupJoin = null;

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
try {
  groupCode = localStorage.getItem(GROUP_CODE_KEY) || null;
  groupName = localStorage.getItem(GROUP_NAME_KEY) || '';
} catch (error) { groupCode = null; }

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
    if (!cloudUser && (pendingGroupJoin || groupCode)) {
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
  if (error) return showToast(error.message);
  if (data.user && !data.session) return showToast('Account made. Check your email to confirm it, then log in.');
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
  groupCode = null;
  try { localStorage.removeItem(GROUP_CODE_KEY); localStorage.removeItem(GROUP_NAME_KEY); } catch (e) { /* ignore */ }
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
    if (groupCode === code) showToast('Joined the group — open Profile to see the leaderboard.');
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
  if (!ensureDisplayName() || !groupCode) return;
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

function groupInviteLink() {
  if (!groupCode) return '';
  const config = window.SAT_CLOUD_CONFIG || {};
  const packed = btoa(JSON.stringify({ u: config.url, k: config.publishableKey }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base = `${location.origin}${location.pathname.replace(/profile\.html$/, 'index.html')}`;
  return `${base}?join=${groupCode}#cfg=${packed}`;
}

async function createGroup(name) {
  if (!ensureDisplayName()) return showToast(nameNeededMsg());
  if (!cloudClient) await initializeCloudSync();
  if (!cloudClient) return showToast('Add your Supabase project first.');
  if (!cloudUser) {
    const { data: anon, error } = await cloudClient.auth.signInAnonymously();
    if (error) return showToast(`Enable Anonymous sign-ins in Supabase. (${error.message})`);
    cloudUser = anon.user;
  }
  const code = makeGroupCode();
  const label = (name || 'Study group').trim().slice(0, 40) || 'Study group';
  const { error } = await cloudClient.from('study_groups').insert({ code, name: label });
  if (error) return showToast(`Could not create the group: ${error.message}`);
  groupName = label;
  try { localStorage.setItem(GROUP_NAME_KEY, label); } catch (e) { /* ignore */ }
  await joinGroupByCode(code, true);
  showToast(`Group "${label}" created — share the code ${code}.`);
}

async function joinGroupByCode(code, quiet) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return showToast('Enter a group code.');
  if (!quiet && !ensureDisplayName()) return showToast(nameNeededMsg());
  if (!cloudClient) await initializeCloudSync();
  if (!cloudClient) return showToast('Add your Supabase project first.');
  if (!cloudUser) {
    const { data: anon, error } = await cloudClient.auth.signInAnonymously();
    if (error) return showToast(`Enable Anonymous sign-ins in Supabase. (${error.message})`);
    cloudUser = anon.user;
  }
  const { data: group, error: lookupError } = await cloudClient.from('study_groups').select('code,name').eq('code', code).maybeSingle();
  if (lookupError || !group) return showToast('That group code was not found.');
  const row = { code, user_id: cloudUser.id, ...groupStatRow() };
  const { error } = await cloudClient.from('group_members').upsert(row);
  if (error) return showToast(`Could not join: ${error.message}`);
  groupCode = code;
  groupName = group.name || 'Study group';
  try {
    localStorage.setItem(GROUP_CODE_KEY, code);
    localStorage.setItem(GROUP_NAME_KEY, groupName);
  } catch (e) { /* ignore */ }
  if (!quiet) showToast(`Joined ${group.name}.`);
  await refreshGroupBoard();
  renderGroupPanel();
}

async function leaveGroup() {
  if (cloudClient && cloudUser && groupCode) {
    await cloudClient.from('group_members').delete().eq('code', groupCode).eq('user_id', cloudUser.id);
  }
  groupCode = null;
  groupName = '';
  try { localStorage.removeItem(GROUP_CODE_KEY); localStorage.removeItem(GROUP_NAME_KEY); } catch (e) { /* ignore */ }
  showToast('Left the group.');
  renderGroupPanel();
}

async function pushGroupStats() {
  if (!cloudClient || !cloudUser || !groupCode) return;
  await cloudClient.from('group_members').upsert({ code: groupCode, user_id: cloudUser.id, ...groupStatRow() });
}

async function refreshGroupBoard() {
  const list = document.getElementById('leaderboard-list');
  if (!list || !cloudClient || !groupCode) return;
  const { data, error } = await cloudClient.rpc('group_board', { p_code: groupCode });
  if (error) { list.innerHTML = `<div class="leader-row"><span>—</span><strong>Could not load the group</strong><span>${escapeHtml(error.message)}</span><span></span></div>`; return; }
  if (!data || !data.length) { list.innerHTML = '<div class="leader-row"><span>—</span><strong>No members yet</strong><span>Share the invite link</span><span>0 XP</span></div>'; return; }
  const mine = groupDisplayName();
  list.innerHTML = data.map((entry, index) => `<div class="leader-row${entry.username === mine ? ' is-me' : ''}"><span>${index + 1}</span><strong>${escapeHtml(entry.username)}</strong><span>${entry.new_today} today · ${entry.streak}d · ${entry.mastered} mastered</span><span>${Number(entry.xp).toLocaleString()} XP</span></div>`).join('');
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
  const inGroup = Boolean(groupCode);
  const joinCard = document.getElementById('group-join-card');
  const liveCard = document.getElementById('group-live-card');
  const note = document.getElementById('group-setup-note');
  if (joinCard) joinCard.classList.toggle('hidden', inGroup);
  if (liveCard) liveCard.classList.toggle('hidden', !inGroup);
  if (note) note.classList.toggle('hidden', cloudConfigured());
  if (inGroup) {
    const codeEl = document.getElementById('group-code-label');
    if (codeEl) codeEl.textContent = groupCode;
    const nameEl = document.getElementById('group-name-label');
    if (nameEl) nameEl.textContent = groupName || 'Group';
    refreshGroupBoard();
  }
}

function copyGroupCode() {
  if (!groupCode) return;
  navigator.clipboard.writeText(groupCode).then(
    () => showToast(`Code ${groupCode} copied — send it to friends.`),
    () => showToast(`Group code: ${groupCode}`)
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
  if (groupCode) refreshGroupBoard();
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
