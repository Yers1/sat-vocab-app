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
    profile: { name: 'SAT learner', bio: 'Building a stronger SAT vocabulary, one honest review at a time.', leaderboardOptIn: false, mascotSkin: 'classic', avatarChoice: 'initials', avatarData: '' },
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

function achievementDefinitions(metrics) {
  const collectionCount = Number(metrics.collectionCount || Object.keys(appState.personalDecks || {}).length);
  const todayCount = Number(metrics.todayCount || (appState.activity || {})[localDateKey()] || 0);
  const overclockTarget = dailyGoal() * 2;
  return [
    { image: 'review-sigil.png', rarity: 'common', name: 'First Mark', copy: 'Break the seal with one honest review.', current: metrics.reviews, target: 1, reward: 25 },
    { image: 'review-sigil.png', rarity: 'common', name: 'Ten Honest Answers', copy: 'Record ten real recall decisions.', current: metrics.reviews, target: 10, reward: 50 },
    { image: 'review-sigil.png', rarity: 'rare', name: 'Fifty Deep', copy: 'Push through fifty focused reviews.', current: metrics.reviews, target: 50, reward: 125 },
    { image: 'review-sigil.png', rarity: 'epic', name: 'Century of Proof', copy: 'Leave one hundred marks in the archive.', current: metrics.reviews, target: 100, reward: 300 },
    { image: 'mastery-sigil.png', rarity: 'rare', name: 'Memory Set', copy: 'Move ten words into long-term memory.', current: metrics.mastered, target: 10, reward: 200 },
    { image: 'mastery-sigil.png', rarity: 'legendary', name: 'Lexicon Keeper', copy: 'Master fifty words without shortcuts.', current: metrics.mastered, target: 50, reward: 800 },
    { image: 'streak-sigil.png', rarity: 'rare', name: 'Three-Day Signal', copy: 'Keep the recall signal alive for 3 days.', current: metrics.streak, target: 3, reward: 150 },
    { image: 'streak-sigil.png', rarity: 'epic', name: 'Full Week', copy: 'Protect a complete seven-day streak.', current: metrics.streak, target: 7, reward: 400 },
    { image: 'streak-sigil.png', rarity: 'mythic', name: 'Month of Proof', copy: 'Show up for thirty days. No lucky run.', current: metrics.streak, target: 30, reward: 2000 },
    { image: 'archive-sigil.png', rarity: 'rare', name: 'Curator', copy: 'Build a second personal word collection.', current: collectionCount, target: 2, reward: 200 },
    { image: 'streak-sigil.png', rarity: 'epic', name: 'Overclocked', copy: 'Complete twice today’s review target.', current: todayCount, target: overclockTarget, reward: 300 },
    { image: 'mastery-sigil.png', rarity: 'mythic', name: 'Perfect Archive', copy: 'Master one hundred words for the final relic.', current: metrics.mastered, target: 100, reward: 1500 }
  ].map(item => ({ ...item, unlocked: item.current >= item.target }));
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
  const raw = {
    reviews,
    mastered,
    streak,
    collectionCount: Object.keys(appState.personalDecks || {}).length,
    todayCount: Number((appState.activity || {})[localDateKey()] || 0)
  };
  const achievementXp = achievementDefinitions(raw).filter(item => item.unlocked).reduce((sum, item) => sum + item.reward, 0);
  const xp = reviews * 5 + mastered * 30 + streak * 50 + achievementXp;
  return { ...raw, achievementXp, xp, level: Math.floor(xp / 500) + 1 };
}

function animateMetric(id, target, suffix = '') {
  const element = document.getElementById(id);
  if (!element) return;
  const start = element.dataset.value === undefined ? (id === 'profile-level' ? 1 : 0) : Number(element.dataset.value);
  const end = Number(target || 0);
  element.dataset.value = String(end);
  const render = value => { element.textContent = `${Math.round(value).toLocaleString()}${suffix}`; };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || start === end) return render(end);
  const started = performance.now();
  const duration = Math.min(1100, 420 + Math.abs(end - start) * 5);
  const tick = now => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    render(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderProfile(populateForm = false) {
  const profile = appState.profile || {};
  const metrics = profileMetrics();
  const name = profile.name || 'SAT learner';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'SL';
  renderProfileAvatar(profile, initials);
  document.getElementById('profile-title').textContent = name;
  document.getElementById('profile-subtitle').textContent = profile.bio || 'Your vocabulary collections, consistency, and memory progress in one place.';
  animateMetric('profile-level', metrics.level);
  animateMetric('profile-xp', metrics.xp);
  animateMetric('profile-reviews', metrics.reviews);
  animateMetric('profile-mastered', metrics.mastered);
  animateMetric('profile-streak', metrics.streak, 'd');
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
  renderGamification(metrics);
  if (typeof updateCloudProfilePreview === 'function') updateCloudProfilePreview(metrics);
}

function renderProfileAvatar(profile, initials) {
  const choice = profile.avatarChoice || 'initials';
  const sources = { logo: 'icon.svg', glyph: 'assets/mascot/glyph-focus.png', custom: profile.avatarData || '' };
  const image = document.getElementById('profile-avatar-image');
  const text = document.getElementById('profile-avatar-text');
  const source = sources[choice];
  if (source) {
    image.src = source;
    image.classList.remove('hidden');
    text.classList.add('hidden');
  } else {
    text.textContent = initials;
    text.classList.remove('hidden');
    image.classList.add('hidden');
  }
  document.querySelectorAll('#avatar-options [data-avatar]').forEach(button => button.classList.toggle('active', button.dataset.avatar === choice));
  document.getElementById('avatar-upload-label').classList.toggle('active', choice === 'custom');
}

function selectProfileAvatar(choice) {
  if (!['initials', 'logo', 'glyph'].includes(choice)) return;
  appState.profile = { ...appState.profile, avatarChoice: choice };
  appState.lastStudy = new Date().toISOString();
  localStorage.setItem(APP_KEY, JSON.stringify(appState));
  renderProfile();
  if (typeof syncCloudNow === 'function') syncCloudNow();
}

function uploadProfileAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/') || file.size > 6 * 1024 * 1024) {
    showToast('Choose a PNG, JPEG, or WebP image smaller than 6 MB.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const sourceImage = new Image();
    sourceImage.onload = () => {
      const size = Math.min(sourceImage.naturalWidth, sourceImage.naturalHeight);
      const sourceX = (sourceImage.naturalWidth - size) / 2;
      const sourceY = (sourceImage.naturalHeight - size) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d');
      context.drawImage(sourceImage, sourceX, sourceY, size, size, 0, 0, 256, 256);
      appState.profile = { ...appState.profile, avatarChoice: 'custom', avatarData: canvas.toDataURL('image/jpeg', .84) };
      appState.lastStudy = new Date().toISOString();
      localStorage.setItem(APP_KEY, JSON.stringify(appState));
      renderProfile();
      if (typeof syncCloudNow === 'function') syncCloudNow();
      showToast('Profile photo saved.');
      event.target.value = '';
    };
    sourceImage.onerror = () => showToast('This image could not be read.');
    sourceImage.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

const TIERS = [
  { min: 1, name: 'Bronze frame', className: 'tier-bronze' },
  { min: 3, name: 'Silver frame', className: 'tier-silver' },
  { min: 6, name: 'Gold frame', className: 'tier-gold' },
  { min: 10, name: 'Emerald frame', className: 'tier-emerald' },
  { min: 15, name: 'Obsidian frame', className: 'tier-obsidian' }
];

const MASCOT_SKINS = [
  { id: 'classic', name: 'Archive', level: 1, color: '#e7c46d' },
  { id: 'ember', name: 'Ember', level: 3, color: '#ef8068' },
  { id: 'jade', name: 'Jade', level: 5, color: '#72cf91' },
  { id: 'frost', name: 'Frost', level: 8, color: '#9fcad7' }
];

function renderGamification(metrics) {
  const tier = [...TIERS].reverse().find(item => metrics.level >= item.min) || TIERS[0];
  const profileCard = document.getElementById('profile-card');
  profileCard.classList.remove(...TIERS.map(item => item.className));
  profileCard.classList.add(tier.className);
  document.getElementById('tier-name').textContent = tier.name;
  const levelStart = (metrics.level - 1) * 500;
  const levelXp = metrics.xp - levelStart;
  document.getElementById('xp-next').textContent = `${levelXp.toLocaleString()} / 500 XP to level ${metrics.level + 1}`;
  document.getElementById('xp-fill').style.width = `${Math.max(0, Math.min(100, levelXp / 5))}%`;
  renderMascot(metrics);
  renderAchievements(metrics);
  renderProfileHeatmap();
  renderRoadmap(metrics.level);
}

function renderMascot(metrics) {
  const todayCount = Number((appState.activity || {})[localDateKey()] || 0);
  const goal = dailyGoal();
  const mood = todayCount === 0 ? 'sad' : todayCount >= goal ? 'win' : 'focus';
  const stateCopy = {
    sad: ['Glyph is dormant', 'No reviews yet today. One honest answer is enough to wake the archive.'],
    focus: ['Glyph is focusing', `${todayCount} of ${goal} reviews today. The page core grows brighter with every answer.`],
    win: ['Glyph is radiant', `Daily goal complete with ${todayCount} reviews. Keep going only while your focus feels sharp.`]
  };
  const image = document.getElementById('mascot-image');
  image.src = `assets/mascot/glyph-${mood}.png`;
  const stage = document.getElementById('mascot-stage');
  stage.classList.remove('mood-sad', 'mood-focus', 'mood-win', ...MASCOT_SKINS.map(skin => `skin-${skin.id}`));
  const selected = MASCOT_SKINS.some(skin => skin.id === (appState.profile || {}).mascotSkin) ? appState.profile.mascotSkin : 'classic';
  stage.classList.add(`mood-${mood}`, `skin-${selected}`);
  document.getElementById('mascot-title').textContent = stateCopy[mood][0];
  document.getElementById('mascot-message').textContent = stateCopy[mood][1];
  document.getElementById('mascot-collection').innerHTML = MASCOT_SKINS.map(skin => {
    const locked = metrics.level < skin.level;
    return `<button class="mascot-choice ${selected === skin.id ? 'selected' : ''}" style="--skin-color:${skin.color}" ${locked ? 'disabled' : ''} onclick="selectMascotSkin('${skin.id}')"><strong>${skin.name}</strong>${locked ? `Unlock at L${skin.level}` : 'Select style'}</button>`;
  }).join('');
}

function selectMascotSkin(skinId) {
  const metrics = profileMetrics();
  const skin = MASCOT_SKINS.find(item => item.id === skinId);
  if (!skin || metrics.level < skin.level) return;
  appState.profile = { ...appState.profile, mascotSkin: skinId };
  appState.lastStudy = new Date().toISOString();
  localStorage.setItem(APP_KEY, JSON.stringify(appState));
  renderMascot(metrics);
  if (typeof syncCloudNow === 'function') syncCloudNow();
  showToast(`${skin.name} Glyph selected.`);
}

function renderAchievements(metrics) {
  const achievements = achievementDefinitions(metrics);
  const unlocked = achievements.filter(item => item.unlocked).length;
  document.getElementById('achievement-total').textContent = `${unlocked} / ${achievements.length} unlocked`;
  document.getElementById('achievement-grid').innerHTML = achievements.map(item => {
    const progress = Math.min(100, Math.round(item.current / item.target * 100));
    return `<article class="achievement ${item.unlocked ? 'unlocked' : 'locked'}" data-rarity="${item.rarity}"><img class="achievement-art" src="assets/achievements/${item.image}" alt=""><div class="achievement-top"><span class="rarity">${item.rarity}</span><span class="reward">+${item.reward} XP</span></div><strong>${item.name}</strong><span class="achievement-copy">${item.copy}</span><div class="achievement-progress"><div><span>${item.unlocked ? 'Relic secured' : 'Progress'}</span><span>${Math.min(item.current, item.target).toLocaleString()} / ${item.target.toLocaleString()}</span></div><div class="achievement-progress-track"><div class="achievement-progress-fill" style="width:${progress}%"></div></div></div></article>`;
  }).join('');
}

function renderProfileHeatmap() {
  const cells = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - 370);
  start.setDate(start.getDate() - start.getDay());
  for (let offset = 0; offset < 371; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = localDateKey(date);
    const count = Number((appState.activity || {})[key] || 0);
    const level = count >= 30 ? 4 : count >= 20 ? 3 : count >= 10 ? 2 : count > 0 ? 1 : 0;
    cells.push(`<span class="heat-day ${level ? `l${level}` : ''}" title="${key}: ${count} reviews"></span>`);
  }
  document.getElementById('profile-heatmap').innerHTML = cells.join('');
  document.getElementById('activity-year').textContent = new Date().getFullYear();
}

function renderRoadmap(level) {
  const steps = [
    { level: 1, title: 'Wake Glyph', copy: 'Complete your first review' },
    { level: 3, title: 'Silver signal', copy: 'Unlock silver frame and Ember skin' },
    { level: 5, title: 'Jade archive', copy: 'Unlock the Jade Glyph style' },
    { level: 8, title: 'Gold scholar', copy: 'Unlock gold frame and Frost skin' },
    { level: 10, title: 'Emerald memory', copy: 'Reach the animated emerald frame' },
    { level: 15, title: 'Obsidian lexicon', copy: 'Reach the final reactive frame' }
  ];
  const next = steps.find(step => step.level > level);
  document.getElementById('roadmap-copy').textContent = next ? `Next: level ${next.level}` : 'Roadmap complete';
  document.getElementById('roadmap').innerHTML = steps.map(step => `<article class="road-step ${level >= step.level ? 'done' : ''} ${next && next.level === step.level ? 'current' : ''}"><small>LEVEL ${step.level}</small><strong>${step.title}</strong><span>${step.copy}</span></article>`).join('');
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
