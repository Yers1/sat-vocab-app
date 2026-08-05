'use strict';

let cloudClient = null;
let cloudUser = null;
let cloudSyncTimer = null;
let cloudApplying = false;
let latestProfileMetrics = null;

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
    if (cloudUser) await handleCloudSession();
    else {
      setCloudState('Cloud ready · sign in');
      await refreshLeaderboard();
    }
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
}

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
    appState = remote.state;
    activeDeckId = appState.activeDeckId || MAIN_DECK_ID;
    localStorage.setItem(APP_KEY, JSON.stringify(appState));
    document.getElementById('daily-new').value = appState.settings.dailyNew;
    document.getElementById('daily-reviews').value = appState.settings.dailyReviews;
    document.getElementById('daily-goal').value = dailyGoal();
    renderReminders();
    switchDeck(activeDeckId);
    renderProfile(true);
    cloudApplying = false;
    showToast('Newer progress restored from your cloud account.');
  } else await syncCloudNow();
  setCloudState(`Synced · ${cloudUser.email}`, true);
  await refreshLeaderboard();
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
  setCloudState(`Synced · ${cloudUser.email}`, true);
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
