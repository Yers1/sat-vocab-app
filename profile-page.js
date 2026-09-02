'use strict';

const APP_KEY = 'sat-vocab-trainer-v4';
const MAIN_DECK_ID = 'personal-main';
const DEFAULT_DAILY_GOAL = 20;
let appState = loadProfileState();
let activeDeckId = appState.activeDeckId || MAIN_DECK_ID;

const PROFILE_COPY = {
  en: {'brand.profile':'learner profile','nav.study':'Study','nav.library':'Library','nav.progress':'Progress','nav.profile':'Profile','profile.eyebrow':'Learner profile','device.saved':'Saved on this device','action.edit':'Edit profile','collections.title':'Word collections','leader.title':'Friends leaderboard','leader.local':'Local preview until cloud accounts are connected.','achievements.eyebrow':'Milestones','achievements.title':'Achievements','achievements.copy':'Permanent marks of discipline. Every unlocked relic adds bonus XP to your profile.','history.eyebrow':'Study history','history.title':'Reviews in the last year','road.eyebrow':'Vocabulary journey','road.title':'Roadmap','settings.private':'Private controls · only your public choices appear above'},
  ru: {'brand.profile':'профиль ученика','nav.study':'Учиться','nav.library':'Слова','nav.progress':'Прогресс','nav.profile':'Профиль','profile.eyebrow':'Профиль ученика','device.saved':'Сохранено на этом устройстве','action.edit':'Настройки','collections.title':'Коллекции слов','leader.title':'Таблица друзей','leader.local':'Локальный просмотр до подключения облачных аккаунтов.','achievements.eyebrow':'Вехи','achievements.title':'Достижения','achievements.copy':'Постоянные знаки дисциплины. Каждая открытая реликвия добавляет XP.','history.eyebrow':'История занятий','history.title':'Повторения за последний год','road.eyebrow':'Путь словарного запаса','road.title':'Карта пути','settings.private':'Личные настройки · наверху видна только публичная информация'},
  kk: {'brand.profile':'оқушы профилі','nav.study':'Оқу','nav.library':'Сөздер','nav.progress':'Прогресс','nav.profile':'Профиль','profile.eyebrow':'Оқушы профилі','device.saved':'Осы құрылғыда сақталды','action.edit':'Баптаулар','collections.title':'Сөз жинақтары','leader.title':'Достар тақтасы','leader.local':'Бұлттық аккаунттар қосылғанша жергілікті көрініс.','achievements.eyebrow':'Белестер','achievements.title':'Жетістіктер','achievements.copy':'Тәртіптің тұрақты белгілері. Әр ашылған жәдігер қосымша XP береді.','history.eyebrow':'Оқу тарихы','history.title':'Соңғы жылдағы қайталаулар','road.eyebrow':'Сөздік қор жолы','road.title':'Жол картасы','settings.private':'Жеке баптаулар · жоғарыда тек ашық ақпарат көрінеді'}
};

function localizeProfilePage() {
  const locale = (appState.settings || {}).locale || 'en';
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-profile-i18n]').forEach(element => {
    const key = element.dataset.profileI18n;
    element.textContent = (PROFILE_COPY[locale] && PROFILE_COPY[locale][key]) || PROFILE_COPY.en[key] || key;
  });
}

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
    settings: { dailyGoal: DEFAULT_DAILY_GOAL, locale: 'en', satDate: '' },
    profile: { name: 'SAT learner', bio: 'Building a stronger SAT vocabulary, one honest review at a time.', leaderboardOptIn: false, mascotSkin: 'classic', avatarChoice: 'initials', avatarData: '', translationLanguage: 'Russian' },
    lastStudy: new Date().toISOString()
  };
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dailyGoal() {
  return Math.max(1, Number((appState.settings || {}).dailyGoal || DEFAULT_DAILY_GOAL));
}

function newDailyTarget() {
  return Math.max(1, Number((appState.settings || {}).dailyNew || 75));
}

// Mirror of the Study page rule: a day counts once you learn the day's new-word
// target, or (deck exhausted) once you clear your review quota.
function dayComplete(dateKey) {
  const newDone = (appState.newActivity || {})[dateKey] || 0;
  const reviewsDone = (appState.activity || {})[dateKey] || 0;
  return newDone >= newDailyTarget() || reviewsDone >= dailyGoal();
}

function calculateStreak() {
  let streak = 0;
  let recoveryUsed = 0;
  const recoveryDays = Number((appState.settings || {}).recoveryDays || 1);
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!dayComplete(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  for (let day = 0; day < 365; day += 1) {
    if (dayComplete(localDateKey(cursor))) streak += 1;
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
  return [
    { image: 'review-sigil.png', rarity: 'common', name: 'First Mark', copy: 'Break the seal with one honest review.', current: metrics.reviews, target: 1, reward: 25 },
    { image: 'ten-answers.png', rarity: 'common', name: 'Ten Honest Answers', copy: 'Record ten real recall decisions.', current: metrics.reviews, target: 10, reward: 50 },
    { image: 'fifty-deep.png', rarity: 'rare', name: 'Precision Signal', copy: 'Hold at least 85% recall accuracy through fifty reviews.', current: metrics.reviews >= 50 ? metrics.retention : 0, target: 85, reward: 250 },
    { image: 'century-proof.png', rarity: 'epic', name: 'Century of Proof', copy: 'Leave one hundred marks in the archive.', current: metrics.reviews, target: 100, reward: 300 },
    { image: 'mastery-sigil.png', rarity: 'rare', name: 'Memory Set', copy: 'Move ten words into long-term memory.', current: metrics.mastered, target: 10, reward: 200 },
    { image: 'lexicon-keeper.png', rarity: 'legendary', name: 'Lexicon Keeper', copy: 'Master fifty words without shortcuts.', current: metrics.mastered, target: 50, reward: 800 },
    { image: 'streak-sigil.png', rarity: 'rare', name: 'Three-Day Signal', copy: 'Keep the recall signal alive for 3 days.', current: metrics.streak, target: 3, reward: 150 },
    { image: 'full-week.png', rarity: 'epic', name: 'Full Week', copy: 'Protect a complete seven-day streak.', current: metrics.streak, target: 7, reward: 400 },
    { image: 'month-proof.png', rarity: 'mythic', name: 'Month of Proof', copy: 'Show up for thirty days. No lucky run.', current: metrics.streak, target: 30, reward: 2000 },
    { image: 'archive-sigil.png', rarity: 'rare', name: 'Curator', copy: 'Build a second personal word collection.', current: collectionCount, target: 2, reward: 200 },
    { image: 'overclocked.png', rarity: 'epic', name: 'Clean Run', copy: 'Recall twenty cards correctly in a row without guessing.', current: metrics.cleanRun, target: 20, reward: 500 },
    { image: 'perfect-archive.png', rarity: 'mythic', name: 'Long Memory', copy: 'Grow a word to a thirty-day review interval.', current: metrics.longestInterval, target: 30, reward: 1200 }
  ].map(item => ({ ...item, unlocked: item.current >= item.target }));
}

function profileMetrics() {
  let reviews = 0;
  let mastered = 0;
  let correct = 0;
  let longestInterval = 0;
  const history = [];
  Object.values(appState.progress || {}).forEach(progress => {
    Object.values((progress && progress.cards) || {}).forEach(record => {
      reviews += Number(record.reviews || 0);
      correct += Number(record.correct || 0);
      longestInterval = Math.max(longestInterval, Number(record.interval || 0));
      history.push(...(record.history || []));
      if (isMasteredCard(record)) mastered += 1;
    });
  });
  let cleanRun = 0;
  for (const entry of history.sort((a, b) => String(b.at).localeCompare(String(a.at)))) {
    if (!['know', 'easy'].includes(entry.rating)) break;
    cleanRun += 1;
  }
  const retention = reviews ? Math.round(correct / reviews * 100) : 0;
  const { streak } = calculateStreak();
  const raw = {
    reviews,
    mastered,
    streak,
    collectionCount: Object.keys(appState.personalDecks || {}).length,
    todayCount: Number((appState.activity || {})[localDateKey()] || 0),
    retention,
    cleanRun,
    longestInterval
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
    document.getElementById('translation-language').value = profile.translationLanguage || 'Russian';
    document.getElementById('interface-language').value = (appState.settings || {}).locale || 'en';
    document.getElementById('profile-sat-date').value = (appState.settings || {}).satDate || '';
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
  if (typeof renderHero === 'function') renderHero();
  if (typeof renderCollection === 'function') renderCollection();
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
    const learned = Number((appState.newActivity || {})[key] || 0);
    const reviews = Number((appState.activity || {})[key] || 0);
    const target = newDailyTarget();
    const share = learned / target;
    let level = share >= 1 ? 4 : share >= 0.66 ? 3 : share >= 0.33 ? 2 : learned > 0 ? 1 : 0;
    if (!level && reviews >= dailyGoal()) level = 2;
    cells.push(`<span class="heat-day ${level ? `l${level}` : ''}" title="${key}: ${learned}/${target} new words · ${reviews} reviews"></span>`);
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
  appState.profile = { ...appState.profile, name, bio: document.getElementById('profile-bio').value.trim(), leaderboardOptIn: document.getElementById('leaderboard-opt-in').checked, translationLanguage: document.getElementById('translation-language').value };
  appState.settings = { ...appState.settings, locale: document.getElementById('interface-language').value, satDate: document.getElementById('profile-sat-date').value };
  appState.lastStudy = new Date().toISOString();
  localStorage.setItem(APP_KEY, JSON.stringify(appState));
  localizeProfilePage();
  renderProfile(true);
  if (typeof syncCloudNow === 'function') syncCloudNow();
  closeProfileSettings();
  showToast('Profile saved.');
}

function openProfileSettings() {
  renderProfile(true);
  const dialog = document.getElementById('profile-settings');
  if (!dialog.open) dialog.showModal();
}

function closeProfileSettings() {
  const dialog = document.getElementById('profile-settings');
  if (dialog && dialog.open) dialog.close();
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

// ---- Cosmetics: hero on the profile head + the Collection shop -------------
let collectTab = 'characters';

function renderHero() {
  if (typeof cosmeticState !== 'function') return;
  const c = cosmeticState();
  const av = document.getElementById('profile-avatar');
  if (av) {
    av.querySelectorAll('#profile-avatar-text, #profile-avatar-image').forEach(el => el.classList.add('hidden'));
    let mount = av.querySelector('.hero-mount');
    if (!mount) { mount = document.createElement('span'); av.appendChild(mount); }
    mount.className = `hero-mount frame-${c.frame}`;
    mount.innerHTML = characterSprite(characterSpec(c.character), 56);
  }
  const banner = document.getElementById('profile-banner');
  if (banner) banner.className = `hero-banner banner-${c.banner}`;
  if (typeof renderCrystalCounts === 'function') renderCrystalCounts();
}

function switchCollectTab(kind) {
  collectTab = kind;
  document.querySelectorAll('#collect-tabs .collect-tab').forEach(b => b.classList.toggle('active', b.dataset.collect === kind));
  renderCollection();
}

function collectPreview(kind, item) {
  if (kind === 'characters') return characterSprite(item.spec, 46);
  if (kind === 'frames') return `<span class="hero-mount frame-${item.id} collect-frame-preview">${characterSprite(CHARACTERS[0].spec, 34)}</span>`;
  return `<span class="ci-swatch hero-banner banner-${item.id}" style="height:34px;width:58px;display:block"></span>`;
}

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  if (!grid || typeof CHARACTERS === 'undefined') return;
  const kind = collectTab;
  const list = { characters: CHARACTERS, frames: FRAMES, banners: BANNERS }[kind];
  const c = cosmeticState();
  const equipped = { characters: c.character, frames: c.frame, banners: c.banner }[kind];
  const ctx = unlockContext();
  grid.innerHTML = list.map(item => {
    const owned = c.owned[kind].includes(item.id);
    const isEq = item.id === equipped;
    const canBuy = !owned && item.unlock.type === 'crystals' && ctx.crystals >= item.unlock.cost;
    let state, btn;
    if (isEq) { state = 'Equipped'; btn = ''; }
    else if (owned) { state = 'Owned'; btn = `<button type="button" onclick="equipCosmeticAndRender('${kind}','${item.id}')">Equip</button>`; }
    else if (item.unlock.type === 'crystals') { state = `${item.unlock.cost} crystals`; btn = `<button type="button" ${canBuy ? '' : 'disabled'} onclick="buyCosmeticAndRender('${kind}','${item.id}')">Buy</button>`; }
    else { state = `Locked · ${unlockLabel(item)}`; btn = ''; }
    return `<div class="collect-item${isEq ? ' equipped' : ''}${owned || isEq ? '' : ' locked'}">`
      + collectPreview(kind, item)
      + `<span class="ci-name">${escapeHtml(item.name)}</span>`
      + `<span class="ci-state">${escapeHtml(state)}</span>`
      + btn + `</div>`;
  }).join('');
}

function equipCosmeticAndRender(kind, id) {
  if (equipCosmetic(kind, id)) { renderHero(); renderCollection(); }
}
function buyCosmeticAndRender(kind, id) {
  if (buyCosmetic(kind, id)) { renderCollection(); if (typeof renderCrystalCounts === 'function') renderCrystalCounts(); }
}

function initializeProfilePage() {
  localizeProfilePage();
  if (typeof grantStartingCrystals === 'function') { grantStartingCrystals(); reconcileUnlocks(); }
  renderProfile(true);
  renderHero();
  renderCollection();
  document.getElementById('profile-settings').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeProfileSettings();
  });
  if (typeof initializeCloudSync === 'function') initializeCloudSync();
}
