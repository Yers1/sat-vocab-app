'use strict';

const APP_KEY = 'sat-vocab-trainer-v4';
const MAIN_DECK_ID = 'personal-main';
const DEFAULT_DAILY_GOAL = 20;
let appState = loadProfileState();
let activeDeckId = appState.activeDeckId || MAIN_DECK_ID;

function loadProfileState() {
  try {
    const saved = JSON.parse(localStorage.getItem(APP_KEY) || 'null');
    if (saved && saved.personalDecks && saved.progress) return saved;
  } catch { /* use a clean local profile */ }
  return {
    version: 4,
    activeDeckId: MAIN_DECK_ID,
    personalDecks: { [MAIN_DECK_ID]: { id: MAIN_DECK_ID, name: 'My words', words: [] } },
    progress: { pdf: { cards: {} }, [MAIN_DECK_ID]: { cards: {} } },
    activity: {},
    settings: { dailyGoal: DEFAULT_DAILY_GOAL },
    profile: { name: 'SAT learner', bio: 'Building a stronger SAT vocabulary, one honest review at a time.', leaderboardOptIn: false },
    lastStudy: new Date().toISOString()
  };
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dailyGoal() {
  return Math.max(1, Number((appState.settings || {}).dailyGoal || DEFAULT_DAILY_GOAL));
}

function calculateStreak() {
  let streak = 0;
  let recoveryUsed = 0;
  const recoveryDays = Number((appState.settings || {}).recoveryDays || 1);
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if ((appState.activity[localDateKey(cursor)] || 0) < dailyGoal()) cursor.setDate(cursor.getDate() - 1);
  for (let day = 0; day < 365; day += 1) {
    const count = appState.activity[localDateKey(cursor)] || 0;
    if (count >= dailyGoal()) streak += 1;
    else if (recoveryUsed < recoveryDays && streak > 0) recoveryUsed += 1;
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, recoveryUsed };
}

function isMasteredCard(record) {
  return Boolean(record && record.interval >= 7 && record.lastRating !== 'again');
}

function profileMetrics() {
  let reviews = 0;
  let mastered = 0;
  Object.values(appState.progress || {}).forEach(progress => {
    Object.values((progress && progress.cards) || {}).forEach(record => {
      reviews += Number(record.reviews || 0);
      if (isMasteredCard(record)) mastered += 1;
    });
  });
  const { streak } = calculateStreak();
  const xp = reviews * 5 + mastered * 30 + streak * 50;
  return { reviews, mastered, streak, xp, level: Math.floor(xp / 500) + 1 };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderProfile(populateForm = false) {
  const profile = appState.profile || {};
  const metrics = profileMetrics();
  const name = profile.name || 'SAT learner';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'SL';
  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-title').textContent = name;
  document.getElementById('profile-subtitle').textContent = profile.bio || 'Your vocabulary collections, consistency, and memory progress in one place.';
  document.getElementById('profile-level').textContent = metrics.level;
  document.getElementById('profile-xp').textContent = metrics.xp.toLocaleString();
  document.getElementById('profile-reviews').textContent = metrics.reviews.toLocaleString();
  document.getElementById('profile-mastered').textContent = metrics.mastered.toLocaleString();
  document.getElementById('profile-streak').textContent = `${metrics.streak}d`;
  if (populateForm) {
    document.getElementById('profile-name').value = name;
    document.getElementById('profile-bio').value = profile.bio || '';
    document.getElementById('leaderboard-opt-in').checked = Boolean(profile.leaderboardOptIn);
  }
  const decks = [
    { id: 'pdf', name: 'PDF vocabulary', words: 990 },
    ...Object.values(appState.personalDecks || {}).map(deck => ({ id: deck.id, name: deck.name, words: deck.words.length }))
  ];
  document.getElementById('profile-collections').innerHTML = decks.map(deck => {
    const cards = (((appState.progress || {})[deck.id] || {}).cards) || {};
    const learned = Object.values(cards).filter(isMasteredCard).length;
    return `<article class="collection"><strong>${escapeHtml(deck.name)}</strong><span>${deck.words} words · ${learned} mastered</span></article>`;
  }).join('');
  if (typeof updateCloudProfilePreview === 'function') updateCloudProfilePreview(metrics);
}

function saveProfile(event) {
  event.preventDefault();
  const name = document.getElementById('profile-name').value.trim();
  if (name.length < 2) return showToast('Use at least 2 characters for your display name.');
  appState.profile = { ...appState.profile, name, bio: document.getElementById('profile-bio').value.trim(), leaderboardOptIn: document.getElementById('leaderboard-opt-in').checked };
  appState.lastStudy = new Date().toISOString();
  localStorage.setItem(APP_KEY, JSON.stringify(appState));
  renderProfile(true);
  if (typeof syncCloudNow === 'function') syncCloudNow();
  showToast('Profile saved.');
}

function applyRemoteCloudState(state) {
  appState = state;
  activeDeckId = appState.activeDeckId || MAIN_DECK_ID;
  localStorage.setItem(APP_KEY, JSON.stringify(appState));
  renderProfile(true);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 4200);
}

function initializeProfilePage() {
  renderProfile(true);
  if (typeof initializeCloudSync === 'function') initializeCloudSync();
}
