'use strict';

const APP_KEY = 'sat-vocab-trainer-v4';
const LEGACY_STATE_KEY = 'sat-vocab-trainer-v3';
const LEGACY_WORDS_KEY = 'sat-vocab-custom-words-v3';
const MAIN_DECK_ID = 'personal-main';
const DEFAULT_DAILY_GOAL = 20;

const STARTER_WORDS = [
  ['heritable','adj.','capable of being passed genetically from parent to offspring','Some traits are heritable, while others are shaped mainly by the environment.','наследуемый'],
  ['tenuous','adj.','very weak, slight, or uncertain','The article drew a tenuous connection between the two events.','слабый; шаткий; неубедительный'],
  ['intelligible','adj.','clear enough to be understood','Her explanation made the complex theory intelligible to beginners.','понятный; вразумительный'],
  ['hindered','v.','slowed down or made more difficult','Limited evidence hindered the researchers\' attempt to reach a firm conclusion.','препятствовал; затруднил'],
  ['inconceivable','adj.','impossible or extremely difficult to imagine','A century ago, instant global communication seemed inconceivable.','невообразимый; немыслимый'],
  ['conducive','adj.','making a particular result likely or possible','A quiet room is conducive to focused study.','способствующий; благоприятный'],
  ['disseminating','v.','spreading information widely','The organization is responsible for disseminating the study\'s findings.','распространяющий информацию'],
  ['rearing','v./n.','raising and caring for children or young animals','The paper examines how different methods of child rearing affect development.','воспитание; выращивание'],
  ['contends','v.','argues or maintains that something is true','The historian contends that trade, not war, drove the expansion.','утверждает; настаивает'],
  ['facilitate','v.','to make an action or process easier','The new archive will facilitate access to primary sources.','облегчать; содействовать'],
  ['ossified','adj./v.','made rigid and resistant to change','Once innovative, the institution had become ossified by tradition.','окостеневший; закостенелый'],
  ['interlocutors','n.','people taking part in a conversation or dialogue','Both interlocutors paused before answering the difficult question.','собеседники'],
  ['affinity','n.','a natural liking for or connection with something','The composer felt a strong affinity for traditional folk melodies.','склонность; близость; сродство'],
  ['disputed','adj./v.','questioned, challenged, or argued about','The origin of the ancient manuscript remains disputed.','оспариваемый; спорный'],
  ['counterpart','n.','a person or thing with the same role in another place or system','The senator met with her foreign counterpart to discuss the treaty.','аналог; коллега с той же ролью'],
  ['woe','n.','great sorrow, distress, or trouble','The poem transforms private woe into a universal lament.','горе; беда'],
  ['commiserating','v.','expressing sympathy with someone who is unhappy','The two candidates spent the evening commiserating over their poor results.','сочувствуя; соболезнуя'],
  ['divulge','v.','to reveal private or secret information','The witness refused to divulge the source\'s identity.','разглашать; раскрывать'],
  ['archbishop','n.','a bishop of the highest rank who oversees other bishops','The archbishop addressed the assembled clergy.','архиепископ'],
  ['conjecture','n./v.','a conclusion based on incomplete evidence; to form such a conclusion','Without additional records, the claim remains conjecture.','догадка; предположение'],
  ['predate','v.','to exist or happen earlier than something else','The settlement may predate the kingdom by several centuries.','предшествовать по времени'],
  ['imploring','adj./v.','begging urgently or desperately','She gave the committee an imploring look as it prepared to vote.','умоляющий'],
  ['virtue','n.','a good moral quality or a useful advantage','The method\'s chief virtue is its simplicity.','добродетель; достоинство'],
  ['circa','prep./adv.','approximately; used especially with dates','The sculpture was created circa 1450.','примерно; около (о дате)'],
  ['abundance','n.','a very large quantity; more than enough','An abundance of rainfall transformed the dry landscape.','изобилие; обилие'],
  ['impervious','adj.','not affected, influenced, or penetrated by something','The material is impervious to water and most chemicals.','невосприимчивый; непроницаемый'],
  ['coarse','adj.','rough in texture or lacking refinement','The filter traps coarse particles but allows finer ones through.','грубый; шероховатый'],
  ['counterintuitive','adj.','contrary to what common sense would lead one to expect','The experiment produced the counterintuitive result that less effort led to better performance.','противоречащий интуиции'],
  ['engulfed','v.','completely surrounded, covered, or overwhelmed','Within minutes, smoke engulfed the building.','охватил; поглотил'],
  ['ablation','n.','the removal or destruction of material, tissue, or a surface layer','Doctors used laser ablation to remove the damaged tissue.','абляция; удаление слоя или ткани']
];

const emptyState = () => ({
  version: 4,
  activeDeckId: MAIN_DECK_ID,
  personalDecks: {
    [MAIN_DECK_ID]: { id: MAIN_DECK_ID, name: 'My words', words: STARTER_WORDS.map(word => [...word]) }
  },
  progress: { pdf: { cards: {} }, [MAIN_DECK_ID]: { cards: {} } },
  dictionaryCache: {},
  activity: {},
  newActivity: {},
  settings: { reminders: [], dailyNew: 75, dailyReviews: 30, dailyGoal: DEFAULT_DAILY_GOAL, recoveryDays: 1, goalsConfigured: true, onboardingComplete: false, locale: 'en', satDate: '' },
  profile: { name: 'SAT learner', bio: 'Building a stronger SAT vocabulary, one honest review at a time.', leaderboardOptIn: false, translationLanguage: 'Russian' },
  lastStudy: new Date().toISOString()
});

let appState = loadAppState();
let pdfWords = [];
let activeDeckId = appState.activeDeckId;
let queue = [];
let flipped = false;
let mode = 'flash';
let sessionKind = 'daily';
let quizItems = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let missedIndices = [];
let typeItems = [];
let typeIndex = 0;
let typeAnswered = false;
let typeAttempts = 0;
let contextItems = [];
let contextIndex = 0;
let contextAnswered = false;
let deferredInstallPrompt = null;
let armedAction = '';
let armedActionTimer = null;
let onboardingStep = 1;
let onboardingLocale = 'en';
let diagnosticItems = [];
let diagnosticIndex = 0;
let diagnosticResults = [];
let selectedLibraryWords = new Set();
let editingWordIndex = -1;
let pendingImportWords = [];
let dictionaryResults = [];
let dictionarySearchBusy = false;
let quickLookupTimer = null;
let quickLookupRequest = 0;
let quickLookupResult = null;
let quickAutofilledWord = '';

const UI_COPY = {
  en: {
    'nav.study':'Study','nav.library':'Library','nav.progress':'Progress','nav.profile':'Profile','brand.tagline':'focused recall trainer',
    'hero.title':'Learn the hard ones <em>today.</em>','hero.copy':'Flip each card, then rate your recall honestly. Missed words return automatically. Your progress stays on this device.',
    'mode.learn':'Learn','mode.type':'Type','mode.context':'Context','mode.test':'Test','mode.stats':'Stats','mode.reset':'Reset progress',
    'plan.start':'Start plan','plan.more':'+20 more','plan.all':'Study all','road.title':'Road to Obsidian','road.full':'Full roadmap →',
    'study.progress':'Session progress','card.word':'English word','card.reveal':'click card or press Space to reveal','card.meaning':'Meaning',
    'rating.again':'1 · Again','rating.hard':'2 · Hard','rating.know':'3 · Know it','rating.easy':'4 · Easy',
    'analytics.eyebrow':'Learning analytics','analytics.title':'What your memory is doing','analytics.retention':'Retention','analytics.due':'Due today','analytics.mastered':'Mastered','analytics.tomorrow':'Tomorrow','analytics.stability':'Memory stability','analytics.readiness':'SAT readiness','analytics.hardest':'Hardest words','analytics.forecast':'Next seven days','analytics.recent':'Recent ratings',
    'side.live':'Live progress','side.new':'New','side.learning':'Learning','side.mastered':'Mastered','side.focus':'Focused sessions','side.load':'Daily load','side.streak':'Study streak','side.nudge':'Daily nudge',
    'library.eyebrow':'Personal decks','library.title':'Organize your own words','backup.title':'Backup and transfer',
    'onboarding.language':'Language','onboarding.plan':'Your plan','onboarding.diagnostic':'Diagnostic','onboarding.choose':'Choose your language','onboarding.build':'Build your SAT plan','onboarding.quick':'Quick diagnostic','action.back':'Back','action.continue':'Continue'
  },
  ru: {
    'nav.study':'Учиться','nav.library':'Слова','nav.progress':'Прогресс','nav.profile':'Профиль','brand.tagline':'тренажёр активного запоминания',
    'hero.title':'Выучи сложные слова <em>сегодня.</em>','hero.copy':'Открой карточку и честно оцени ответ. Ошибки вернутся автоматически. Прогресс хранится на этом устройстве.',
    'mode.learn':'Карточки','mode.type':'Ввод','mode.context':'Контекст','mode.test':'Тест','mode.stats':'Статистика','mode.reset':'Сбросить прогресс',
    'plan.start':'Начать план','plan.more':'+20 ещё','plan.all':'Учить всё','road.title':'Путь к Obsidian','road.full':'Вся карта →',
    'study.progress':'Прогресс занятия','card.word':'Английское слово','card.reveal':'нажми на карточку или Space','card.meaning':'Значение',
    'rating.again':'1 · Снова','rating.hard':'2 · Трудно','rating.know':'3 · Знаю','rating.easy':'4 · Легко',
    'analytics.eyebrow':'Аналитика обучения','analytics.title':'Как работает твоя память','analytics.retention':'Запоминание','analytics.due':'На сегодня','analytics.mastered':'Выучено','analytics.tomorrow':'На завтра','analytics.stability':'Устойчивость памяти','analytics.readiness':'Готовность к SAT','analytics.hardest':'Самые сложные слова','analytics.forecast':'Следующие семь дней','analytics.recent':'Последние оценки',
    'side.live':'Прогресс сейчас','side.new':'Новые','side.learning':'В процессе','side.mastered':'Выучено','side.focus':'Фокус-сессии','side.load':'Нагрузка на день','side.streak':'Серия занятий','side.nudge':'Напоминания',
    'library.eyebrow':'Личные наборы','library.title':'Организуй свои слова','backup.title':'Резервная копия и перенос',
    'onboarding.language':'Язык','onboarding.plan':'Твой план','onboarding.diagnostic':'Диагностика','onboarding.choose':'Выбери язык','onboarding.build':'Составь план SAT','onboarding.quick':'Быстрая диагностика','action.back':'Назад','action.continue':'Продолжить'
  },
  kk: {
    'nav.study':'Оқу','nav.library':'Сөздер','nav.progress':'Прогресс','nav.profile':'Профиль','brand.tagline':'белсенді есте сақтау жаттықтырғышы',
    'hero.title':'Қиын сөздерді <em>бүгін</em> үйрен.','hero.copy':'Карточканы ашып, жауабыңды адал бағала. Қателер автоматты түрде қайта келеді. Прогресс осы құрылғыда сақталады.',
    'mode.learn':'Карточкалар','mode.type':'Жазу','mode.context':'Контекст','mode.test':'Тест','mode.stats':'Статистика','mode.reset':'Прогресті тазалау',
    'plan.start':'Жоспарды бастау','plan.more':'+20 тағы','plan.all':'Бәрін оқу','road.title':'Obsidian жолы','road.full':'Толық жол картасы →',
    'study.progress':'Сабақ прогресі','card.word':'Ағылшын сөзі','card.reveal':'карточканы немесе Space пернесін бас','card.meaning':'Мағынасы',
    'rating.again':'1 · Қайта','rating.hard':'2 · Қиын','rating.know':'3 · Білемін','rating.easy':'4 · Оңай',
    'analytics.eyebrow':'Оқу аналитикасы','analytics.title':'Жад қалай жұмыс істейді','analytics.retention':'Есте сақтау','analytics.due':'Бүгінге','analytics.mastered':'Меңгерілді','analytics.tomorrow':'Ертеңге','analytics.stability':'Жад тұрақтылығы','analytics.readiness':'SAT дайындығы','analytics.hardest':'Ең қиын сөздер','analytics.forecast':'Келесі жеті күн','analytics.recent':'Соңғы бағалар',
    'side.live':'Қазіргі прогресс','side.new':'Жаңа','side.learning':'Үйренуде','side.mastered':'Меңгерілді','side.focus':'Фокус сессиялар','side.load':'Күндік жүктеме','side.streak':'Оқу сериясы','side.nudge':'Еске салғыштар',
    'library.eyebrow':'Жеке жинақтар','library.title':'Өз сөздеріңді ретте','backup.title':'Сақтық көшірме және тасымалдау',
    'onboarding.language':'Тіл','onboarding.plan':'Жоспарың','onboarding.diagnostic':'Диагностика','onboarding.choose':'Тілді таңда','onboarding.build':'SAT жоспарын құр','onboarding.quick':'Жылдам диагностика','action.back':'Артқа','action.continue':'Жалғастыру'
  }
};

function t(key) {
  const locale = (appState.settings || {}).locale || 'en';
  return (UI_COPY[locale] && UI_COPY[locale][key]) || UI_COPY.en[key] || key;
}

function applyLocale(temporaryLocale = '') {
  const locale = temporaryLocale || (appState.settings || {}).locale || 'en';
  document.documentElement.lang = locale;
  const localText = key => (UI_COPY[locale] && UI_COPY[locale][key]) || UI_COPY.en[key] || key;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = localText(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(element => { element.innerHTML = localText(element.dataset.i18nHtml); });
}

function applyWorkspaceView() {
  const requested = new URLSearchParams(location.search).get('view');
  const view = ['study','library','progress'].includes(requested) ? requested : 'study';
  document.body.dataset.view = view;
  document.querySelectorAll('[data-view-link]').forEach(link => link.classList.toggle('active', link.dataset.viewLink === view));
  if (view === 'library' && activeDeckId === 'pdf') openPersonalDeck();
  if (view === 'progress') setMode('analytics');
  else if (view === 'study' && mode === 'analytics') setMode('flash');
  if (view === 'library') renderLibraryWords();
}

function navigateWorkspace(event, view) {
  if (event) event.preventDefault();
  const nextUrl = new URL(location.href);
  nextUrl.pathname = nextUrl.pathname.endsWith('index.html') ? nextUrl.pathname : `${nextUrl.pathname.replace(/\/$/, '')}/index.html`;
  nextUrl.search = `?view=${view}`;
  if (location.href !== nextUrl.href) history.pushState({ view }, '', nextUrl);
  applyWorkspaceView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('popstate', applyWorkspaceView);

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysKey(key, days) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function normalizeWord(value) {
  return String(value || '').trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

// Underline the headword (and short inflections like -s/-ed/-ing) inside an example
// sentence so the word is always read in context. Input is escaped first.
function highlightWord(sentence, headword) {
  const safe = escapeHtml(sentence);
  const stem = escapeHtml(headword).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!stem) return safe;
  try {
    return safe.replace(new RegExp(`\\b(${stem}\\w{0,3})\\b`, 'gi'), '<span class="ex-key">$1</span>');
  } catch {
    return safe;
  }
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function migrateLegacyState(base) {
  try {
    const legacyWords = JSON.parse(localStorage.getItem(LEGACY_WORDS_KEY) || 'null');
    if (Array.isArray(legacyWords) && legacyWords.length) base.personalDecks[MAIN_DECK_ID].words = legacyWords;
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STATE_KEY) || 'null');
    if (!legacy) return base;
    base.activity = legacy.activity || {};
    if (legacy.reminder && legacy.reminder.enabled) base.settings.reminders = [{ time: legacy.reminder.time || '19:00', lastSent: legacy.reminder.lastSent || '' }];
    const today = localDateKey();
    [['pdf', 'pdf'], ['custom', MAIN_DECK_ID]].forEach(([oldId, newId]) => {
      const oldDeck = legacy.decks && legacy.decks[oldId];
      if (!oldDeck) return;
      Object.keys(oldDeck.levels || {}).forEach(index => {
        const level = Number(oldDeck.levels[index] || 0);
        const attempts = Number((oldDeck.attempts || {})[index] || 0);
        base.progress[newId].cards[index] = {
          interval: level === 2 ? 7 : level === 1 ? 1 : 0,
          due: level === 2 ? addDaysKey(today, 7) : today,
          reviews: attempts,
          correct: level === 2 ? Math.max(1, attempts) : 0,
          lapses: level === 1 ? 1 : 0,
          lastRating: level === 2 ? 'know' : level === 1 ? 'hard' : 'new',
          lastReview: legacy.lastStudy || '',
          history: []
        };
      });
    });
  } catch {
    return base;
  }
  return base;
}

function loadAppState() {
  const base = emptyState();
  try {
    const saved = JSON.parse(localStorage.getItem(APP_KEY) || 'null');
    if (!saved || saved.version !== 4) return migrateLegacyState(base);
    const savedSettings = saved.settings || {};
    const legacyReminder = savedSettings.reminder;
    const reminders = Array.isArray(savedSettings.reminders)
      ? savedSettings.reminders
      : legacyReminder && legacyReminder.enabled ? [{ time: legacyReminder.time || '19:00', lastSent: legacyReminder.lastSent || '' }] : [];
    const hasNewGoalSettings = Boolean(savedSettings.goalsConfigured);
    return {
      ...base,
      ...saved,
      newActivity: saved.newActivity || {},
      personalDecks: { ...base.personalDecks, ...(saved.personalDecks || {}) },
      progress: { ...base.progress, ...(saved.progress || {}) },
      settings: {
        ...base.settings,
        ...savedSettings,
        dailyNew: hasNewGoalSettings ? Number(savedSettings.dailyNew || 75) : 75,
        dailyReviews: hasNewGoalSettings ? Number(savedSettings.dailyReviews || 30) : 30,
        dailyGoal: hasNewGoalSettings ? Number(savedSettings.dailyGoal || DEFAULT_DAILY_GOAL) : DEFAULT_DAILY_GOAL,
        reminders,
        goalsConfigured: true,
        onboardingComplete: savedSettings.onboardingComplete === undefined ? true : Boolean(savedSettings.onboardingComplete),
        locale: ['en','ru','kk'].includes(savedSettings.locale) ? savedSettings.locale : 'en',
        satDate: savedSettings.satDate || ''
      },
      profile: { ...base.profile, ...(saved.profile || {}) }
    };
  } catch {
    return migrateLegacyState(base);
  }
}

function saveAppState() {
  appState.activeDeckId = activeDeckId;
  appState.lastStudy = new Date().toISOString();
  localStorage.setItem(APP_KEY, JSON.stringify(appState));
  if (typeof queueCloudSync === 'function') queueCloudSync();
}

function dailyGoal() {
  return Math.max(1, Number(appState.settings.dailyGoal || DEFAULT_DAILY_GOAL));
}

// New words the day's mark is measured against (defaults to 75 for the SAT sprint).
function newDailyTarget() {
  return Math.max(1, Number(appState.settings.dailyNew || 75));
}

function newWordsToday() {
  return (appState.newActivity || {})[localDateKey()] || 0;
}

function currentWords() {
  if (activeDeckId === 'pdf') return pdfWords;
  return (appState.personalDecks[activeDeckId] || appState.personalDecks[MAIN_DECK_ID]).words;
}

function currentDeckName() {
  return activeDeckId === 'pdf' ? 'PDF vocabulary' : appState.personalDecks[activeDeckId].name;
}

function deckProgress(deckId = activeDeckId) {
  if (!appState.progress[deckId]) appState.progress[deckId] = { cards: {} };
  if (!appState.progress[deckId].cards) appState.progress[deckId].cards = {};
  return appState.progress[deckId];
}

function defaultCardRecord() {
  return { interval: 0, due: localDateKey(), reviews: 0, correct: 0, lapses: 0, lastRating: 'new', lastReview: '', history: [], stability: .2, difficulty: 5 };
}

function cardRecord(index, create = false) {
  const cards = deckProgress().cards;
  if (!cards[index] && create) cards[index] = defaultCardRecord();
  return cards[index] || null;
}

function isNewCard(record) {
  return !record || !record.reviews;
}

function isDueCard(record, dateKey = localDateKey()) {
  return Boolean(record && record.reviews > 0 && record.due <= dateKey);
}

function isMasteredCard(record) {
  return Boolean(record && record.interval >= 7 && record.lastRating !== 'again');
}

function updateSrs(index, rating, source = 'learn', metadata = {}) {
  const record = cardRecord(index, true);
  const today = localDateKey();
  record.reviews += 1;
  record.lastReview = new Date().toISOString();
  record.lastRating = rating;
  const previousStability = Math.max(.1, Number(record.stability || record.interval || .2));
  const previousDifficulty = Math.min(10, Math.max(1, Number(record.difficulty || 5)));
  if (rating === 'again') {
    record.difficulty = Math.min(10, previousDifficulty + .8);
    record.stability = Math.max(.1, previousStability * .25);
    record.interval = 0;
    record.due = today;
    record.lapses += 1;
  } else if (rating === 'hard') {
    record.difficulty = Math.min(10, previousDifficulty + .15);
    record.stability = record.reviews === 1 ? 1 : Math.max(1, previousStability * (1.15 + (10 - record.difficulty) * .02));
    record.interval = Math.max(1, Math.round(record.stability));
    record.due = addDaysKey(today, record.interval);
  } else if (rating === 'easy') {
    record.correct += 1;
    record.difficulty = Math.max(1, previousDifficulty - .45);
    record.stability = record.reviews === 1 ? 7 : Math.min(365, previousStability * (2.35 + (10 - record.difficulty) * .04));
    record.interval = Math.max(7, Math.round(record.stability));
    record.due = addDaysKey(today, record.interval);
  } else {
    record.correct += 1;
    record.difficulty = Math.max(1, previousDifficulty - .2);
    record.stability = record.reviews === 1 ? 3 : Math.min(365, previousStability * (1.75 + (10 - record.difficulty) * .035));
    record.interval = Math.max(3, Math.round(record.stability));
    record.due = addDaysKey(today, record.interval);
  }
  record.history = Array.isArray(record.history) ? record.history : [];
  record.history.push({ at: record.lastReview, rating, source, ...metadata });
  record.history = record.history.slice(-24);
  if (record.reviews === 1) {
    if (!appState.newActivity) appState.newActivity = {};
    appState.newActivity[today] = (appState.newActivity[today] || 0) + 1;
  }
  recordActivity();
  saveAppState();
  return record;
}

function dailyPlanIndices() {
  const words = currentWords();
  const today = localDateKey();
  const due = [];
  const fresh = [];
  words.forEach((word, index) => {
    const record = cardRecord(index);
    if (isDueCard(record, today)) due.push(index);
    else if (isNewCard(record)) fresh.push(index);
  });
  const selectedDue = shuffled(due).slice(0, appState.settings.dailyReviews);
  const selectedNew = shuffled(fresh).slice(0, appState.settings.dailyNew);
  return { due, fresh, plan: [...selectedDue, ...selectedNew] };
}

function startDailyPlan() {
  const plan = dailyPlanIndices();
  // Reviews first, then new words (each group already shuffled inside dailyPlanIndices).
  queue = plan.plan.slice();
  sessionKind = 'daily';
  if (!queue.length) {
    const weak = weakIndices().slice(0, 10);
    queue = weak.length ? weak : shuffled(currentWords().map((word, index) => index)).slice(0, 10);
    sessionKind = 'refresh';
  }
  setMode('flash');
  renderCard();
  showToast(`${queue.length} cards ready in your ${sessionKind} session.`);
}

function startExtraSession(amount = 20) {
  const { due, fresh } = dailyPlanIndices();
  const prioritized = [...new Set([...due, ...fresh, ...weakIndices(), ...currentWords().map((word, index) => index)])];
  const limit = amount === 'all' ? prioritized.length : Math.max(1, Number(amount || 20));
  queue = shuffled(prioritized).slice(0, limit);
  sessionKind = amount === 'all' ? 'full deck' : 'extra';
  setMode('flash');
  renderCard();
  showToast(`${queue.length} cards added. You can keep studying as long as your focus is good.`);
}

function weakIndices() {
  return currentWords().map((word, index) => ({ index, record: cardRecord(index) }))
    .filter(item => item.record && (item.record.lapses > 0 || item.record.lastRating === 'hard'))
    .sort((a, b) => (b.record.lapses * 3 + b.record.reviews - b.record.correct) - (a.record.lapses * 3 + a.record.reviews - a.record.correct))
    .map(item => item.index);
}

function mistakeIndices() {
  return currentWords().map((word, index) => ({ index, record: cardRecord(index) }))
    .filter(item => item.record && item.record.lastRating === 'again')
    .sort((a, b) => String(b.record.lastReview).localeCompare(String(a.record.lastReview)))
    .map(item => item.index);
}

function startMistakeSession(kind) {
  const selected = kind === 'mistakes' ? mistakeIndices() : weakIndices();
  if (!selected.length) {
    showToast(kind === 'mistakes' ? 'No recent mistakes in this deck.' : 'No weak words yet. Complete a few reviews first.');
    return;
  }
  queue = shuffled(selected).slice(0, 20);
  sessionKind = kind;
  setMode('flash');
  renderCard();
}

function switchDeck(deckId) {
  if (deckId !== 'pdf' && !appState.personalDecks[deckId]) deckId = MAIN_DECK_ID;
  activeDeckId = deckId;
  selectedLibraryWords.clear();
  cancelWordEdit(false);
  cancelImportPreview(false);
  saveAppState();
  document.getElementById('deck-pdf').classList.toggle('active', deckId === 'pdf');
  document.getElementById('deck-custom').classList.toggle('active', deckId !== 'pdf');
  document.getElementById('add-panel').classList.toggle('hidden', deckId === 'pdf');
  document.getElementById('personal-tab-name').textContent = deckId === 'pdf' ? appState.personalDecks[MAIN_DECK_ID].name : currentDeckName();
  document.getElementById('deck-eyebrow').textContent = `${currentDeckName()} · ${currentWords().length} words`;
  document.getElementById('side-deck-title').textContent = currentDeckName();
  queue = shuffled(dailyPlanIndices().plan);
  updateDeckLabels();
  renderPersonalDeckSelect();
  renderAll();
  setMode('flash');
}

function openPersonalDeck() {
  const preferred = activeDeckId === 'pdf' ? (appState.settings.lastPersonalDeck || MAIN_DECK_ID) : activeDeckId;
  switchDeck(appState.personalDecks[preferred] ? preferred : MAIN_DECK_ID);
}

function selectPersonalDeck(deckId) {
  appState.settings.lastPersonalDeck = deckId;
  switchDeck(deckId);
}

function setMode(nextMode) {
  mode = nextMode;
  ['flash', 'type', 'context', 'quiz', 'analytics'].forEach(name => {
    document.getElementById(`${name}-mode`).classList.toggle('hidden', name !== mode);
    const button = document.getElementById(`btn-${name}`);
    if (button) button.classList.toggle('active', name === mode);
  });
  document.getElementById('results-mode').classList.add('hidden');
  if (mode === 'flash') {
    if (!queue.length) queue = shuffled(dailyPlanIndices().plan);
    renderCard();
  } else if (mode === 'type') startTypeSession();
  else if (mode === 'context') startContextSession();
  else if (mode === 'quiz') startQuiz();
  else if (mode === 'analytics') renderAnalytics();
}

function flipCard() {
  if (!queue.length) return;
  flipped = !flipped;
  document.getElementById('flashcard').classList.toggle('flipped', flipped);
  document.querySelectorAll('#rating-actions button').forEach(button => button.disabled = !flipped);
}

function handleCardKey(event) {
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    flipCard();
  }
}

function speakWord(event) {
  event.stopPropagation();
  if (!queue.length || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentWords()[queue[0]][0]);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  speechSynthesis.speak(utterance);
}

function rateCard(rating) {
  if (!flipped || !queue.length) return;
  const index = queue.shift();
  const record = updateSrs(index, rating, 'learn');
  renderRatingReceipt(index, rating, record);
  if (rating === 'again') queue.splice(Math.min(3, queue.length), 0, index);
  else if (rating === 'hard' && queue.length < 18) queue.push(index);
  renderAll();
  renderCard();
}

function renderRatingReceipt(index, rating, record) {
  const receipt = document.getElementById('rating-receipt');
  if (!receipt) return;
  const labels = { again: 'Again', hard: 'Hard', know: 'Know it', easy: 'Easy' };
  const dueCopy = record.due === localDateKey() ? 'returns today' : `next ${record.due}`;
  receipt.className = `rating-receipt ${rating}`;
  receipt.innerHTML = `<span><strong>${labels[rating]}</strong> · ${escapeHtml(currentWords()[index][0])}</span><span>${record.interval || '<1'} day interval · ${dueCopy}</span>`;
}

function renderCard() {
  if (!queue.length) return showLearningComplete();
  const index = queue[0];
  const word = currentWords()[index];
  const record = cardRecord(index);
  document.getElementById('flash-word').textContent = word[0];
  document.getElementById('flash-pos').textContent = `${word[1] || '—'}${record && record.reviews ? ` · next interval ${record.interval || '<1'}d` : ' · new'}`;
  document.getElementById('flash-def').textContent = word[2];
  document.getElementById('flash-ru').textContent = word[4] || 'No translation saved';
  const exEl = document.getElementById('flash-ex');
  if (word[3]) exEl.innerHTML = highlightWord(word[3], word[0]);
  else exEl.textContent = `Write a sentence using “${word[0]}”.`;
  flipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  document.querySelectorAll('#rating-actions button').forEach(button => button.disabled = true);
}

function showLearningComplete() {
  document.getElementById('flash-word').textContent = 'Done';
  document.getElementById('flash-pos').textContent = `${sessionKind} session complete`;
  document.getElementById('flash-def').textContent = 'The current set is complete — your study is not limited.';
  document.getElementById('flash-ru').textContent = 'This set is complete. Continue with 20 more cards or study the full deck.';
  document.getElementById('flash-ex').textContent = 'Use “+20 more”, “Study all”, Type, or Context to continue.';
  document.querySelectorAll('#rating-actions button').forEach(button => button.disabled = true);
}

function practicePool(limit = 10) {
  const due = dailyPlanIndices().due;
  const weak = weakIndices();
  const candidates = [...new Set([...due, ...weak, ...currentWords().map((word, index) => index)])];
  return shuffled(candidates).slice(0, Math.min(limit, candidates.length));
}

function startTypeSession() {
  typeItems = practicePool(10);
  typeIndex = 0;
  typeAnswered = false;
  renderTypeQuestion();
}

function renderTypeQuestion() {
  if (typeIndex >= typeItems.length) return showModeResults('Typing complete', typeItems.length, 'You produced the words without multiple-choice cues.');
  const word = currentWords()[typeItems[typeIndex]];
  document.getElementById('type-progress').textContent = `${typeIndex + 1} / ${typeItems.length}`;
  document.getElementById('type-clue').textContent = word[2];
  document.getElementById('type-hint').textContent = '';
  const feedback = document.getElementById('type-feedback');
  feedback.textContent = '';
  feedback.className = 'recall-feedback';
  const input = document.getElementById('type-answer');
  input.value = '';
  input.disabled = false;
  typeAnswered = false;
  typeAttempts = 0;
  document.getElementById('type-show-answer').classList.add('hidden');
  setTimeout(() => input.focus(), 0);
}

function showTypeHint(kind) {
  if (typeAnswered || typeIndex >= typeItems.length) return;
  const word = currentWords()[typeItems[typeIndex]];
  const output = document.getElementById('type-hint');
  if (kind === 'letter') output.textContent = `Starts with “${word[0][0].toUpperCase()}”`;
  else if (kind === 'length') output.textContent = `${word[0].length} letters`;
  else output.textContent = word[4] || 'No translation saved for this word';
}

function checkTypedAnswer(event) {
  event.preventDefault();
  if (typeAnswered || typeIndex >= typeItems.length) return;
  const index = typeItems[typeIndex];
  const word = currentWords()[index];
  const answer = document.getElementById('type-answer').value;
  if (!answer.trim()) return;
  const correct = normalizeWord(answer) === normalizeWord(word[0]);
  const feedback = document.getElementById('type-feedback');
  typeAttempts += 1;
  if (!correct) {
    feedback.className = 'recall-feedback bad';
    feedback.textContent = `Not yet · attempt ${typeAttempts}. Try again, use a hint, or reveal the answer.`;
    document.getElementById('type-show-answer').classList.remove('hidden');
    document.getElementById('type-answer').select();
    return;
  }
  typeAnswered = true;
  feedback.className = 'recall-feedback good';
  feedback.textContent = `Correct in ${typeAttempts} attempt${typeAttempts === 1 ? '' : 's'} · ${word[4] || word[2]}`;
  document.getElementById('type-answer').disabled = true;
  document.getElementById('type-show-answer').classList.add('hidden');
  updateSrs(index, typeAttempts === 1 ? 'know' : 'hard', 'type', { attempts: typeAttempts, revealed: false });
  renderAll();
  setTimeout(() => { typeIndex += 1; renderTypeQuestion(); }, 1500);
}

function revealTypedAnswer() {
  if (typeAnswered || typeIndex >= typeItems.length || typeAttempts < 1) return;
  const index = typeItems[typeIndex];
  const word = currentWords()[index];
  typeAnswered = true;
  const input = document.getElementById('type-answer');
  input.value = word[0];
  input.disabled = true;
  document.getElementById('type-show-answer').classList.add('hidden');
  const feedback = document.getElementById('type-feedback');
  feedback.className = 'recall-feedback bad';
  feedback.textContent = `${word[0]} · ${word[4] || word[2]}. This word will return for another review.`;
  updateSrs(index, 'again', 'type', { attempts: typeAttempts, revealed: true });
  renderAll();
  setTimeout(() => { typeIndex += 1; renderTypeQuestion(); }, 2400);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contextSentence(word) {
  const source = word[3] || `The passage uses ${word[0]} to express this idea: ${word[2]}.`;
  const pattern = new RegExp(`\\b${escapeRegExp(word[0])}\\b`, 'i');
  if (pattern.test(source)) return source.replace(pattern, '<span class="context-blank">_____</span>');
  return `${source} <span class="context-blank">_____</span>`;
}

function startContextSession() {
  contextItems = practicePool(10);
  contextIndex = 0;
  contextAnswered = false;
  renderContextQuestion();
}

function renderContextQuestion() {
  if (contextIndex >= contextItems.length) return showModeResults('Context complete', contextItems.length, 'You practiced choosing words from sentence meaning.');
  contextAnswered = false;
  const index = contextItems[contextIndex];
  const word = currentWords()[index];
  document.getElementById('context-progress').textContent = `${contextIndex + 1} / ${contextItems.length}`;
  document.getElementById('context-sentence').innerHTML = contextSentence(word);
  document.getElementById('context-feedback').textContent = '';
  const distractors = shuffled(currentWords().map((item, itemIndex) => ({ item, itemIndex })).filter(candidate => candidate.itemIndex !== index)).slice(0, 3);
  const options = shuffled([{ item: word, itemIndex: index }, ...distractors]);
  const container = document.getElementById('context-options');
  container.innerHTML = '';
  options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'opt-btn';
    button.textContent = option.item[0];
    button.onclick = () => checkContextAnswer(button, option.itemIndex, index);
    container.appendChild(button);
  });
}

function checkContextAnswer(button, chosenIndex, correctIndex) {
  if (contextAnswered) return;
  contextAnswered = true;
  const correct = chosenIndex === correctIndex;
  const word = currentWords()[correctIndex];
  document.querySelectorAll('#context-options .opt-btn').forEach(option => {
    option.disabled = true;
    if (option.textContent === word[0]) option.classList.add('correct');
  });
  if (!correct) button.classList.add('wrong');
  document.getElementById('context-feedback').textContent = `${correct ? 'Correct' : 'Review'} · ${word[0]} — ${word[2]}`;
  updateSrs(correctIndex, correct ? 'know' : 'again', 'context');
  renderAll();
  setTimeout(() => { contextIndex += 1; renderContextQuestion(); }, 1250);
}

function startQuiz() {
  quizItems = practicePool(30);
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;
  missedIndices = [];
  document.getElementById('q-total').textContent = quizItems.length;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (quizIndex >= quizItems.length) return showQuizResults();
  quizAnswered = false;
  const index = quizItems[quizIndex];
  const word = currentWords()[index];
  document.getElementById('quiz-word').textContent = word[0];
  document.getElementById('q-num').textContent = quizIndex + 1;
  document.getElementById('q-score').textContent = quizScore;
  document.getElementById('quiz-progress-bar').style.width = `${quizItems.length ? (quizIndex / quizItems.length) * 100 : 0}%`;
  document.getElementById('quiz-feedback').textContent = '';
  const distractors = shuffled(currentWords().map((item, itemIndex) => ({ item, itemIndex })).filter(candidate => candidate.itemIndex !== index)).slice(0, 3);
  const options = shuffled([{ item: word, itemIndex: index }, ...distractors]);
  const container = document.getElementById('quiz-options');
  container.innerHTML = '';
  options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'opt-btn';
    button.textContent = option.item[2];
    button.onclick = () => checkQuizAnswer(button, option.itemIndex, index);
    container.appendChild(button);
  });
}

function checkQuizAnswer(button, chosenIndex, correctIndex) {
  if (quizAnswered) return;
  quizAnswered = true;
  const correct = chosenIndex === correctIndex;
  const word = currentWords()[correctIndex];
  document.querySelectorAll('#quiz-options .opt-btn').forEach(option => {
    option.disabled = true;
    if (option.textContent === word[2]) option.classList.add('correct');
  });
  if (correct) quizScore += 1;
  else {
    button.classList.add('wrong');
    missedIndices.push(correctIndex);
  }
  document.getElementById('quiz-feedback').textContent = `${correct ? 'Correct' : 'Review'} · ${word[0]} — ${word[4] || word[2]}`;
  document.getElementById('q-score').textContent = quizScore;
  updateSrs(correctIndex, correct ? 'know' : 'again', 'quiz');
  renderAll();
  setTimeout(() => { quizIndex += 1; renderQuizQuestion(); }, 1250);
}

function showQuizResults() {
  document.getElementById('quiz-mode').classList.add('hidden');
  document.getElementById('results-mode').classList.remove('hidden');
  const percent = quizItems.length ? Math.round((quizScore / quizItems.length) * 100) : 0;
  document.getElementById('results-score').textContent = `${quizScore}/${quizItems.length}`;
  document.getElementById('results-title').textContent = percent >= 90 ? 'Strong retrieval.' : 'One focused pass remains.';
  document.getElementById('results-msg').textContent = missedIndices.length ? `${missedIndices.length} missed words are due again today.` : 'Every answer was correct.';
  queue = shuffled([...new Set(missedIndices)]);
}

function showModeResults(title, score, message) {
  ['type-mode', 'context-mode'].forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById('results-mode').classList.remove('hidden');
  document.getElementById('results-title').textContent = title;
  document.getElementById('results-score').textContent = String(score);
  document.getElementById('results-msg').textContent = message;
}

function restartQuiz() {
  setMode('quiz');
}

function renderDailyPlan() {
  const { due, fresh, plan } = dailyPlanIndices();
  const minutes = Math.max(1, Math.ceil(plan.length * 0.45));
  const target = newDailyTarget();
  const newLeft = Math.max(0, target - newWordsToday());

  document.getElementById('plan-title').textContent = plan.length
    ? `${plan.length} cards · about ${minutes} min`
    : (due.length ? `${due.length} reviews waiting` : 'All scheduled work done');

  const reviewPart = due.length
    ? `${due.length} review${due.length === 1 ? '' : 's'} due`
    : 'Reviews cleared';
  const newPart = fresh.length === 0
    ? 'whole deck introduced'
    : (newLeft > 0
      ? `${Math.min(newLeft, fresh.length)} of today's ${target} new words left`
      : `today's ${target} new words done`);
  document.getElementById('plan-copy').textContent = plan.length || due.length
    ? `${reviewPart} · ${newPart}. Reviews come first, then new words.`
    : `${newPart}. Keep going with +20 more, Study all, Type, or Context.`;
}

function renderProgress() {
  const words = currentWords();
  let fresh = 0;
  let learning = 0;
  let mastered = 0;
  words.forEach((word, index) => {
    const record = cardRecord(index);
    if (isNewCard(record)) fresh += 1;
    else if (isMasteredCard(record)) mastered += 1;
    else learning += 1;
  });
  document.getElementById('new-count').textContent = fresh;
  document.getElementById('learning-count').textContent = learning;
  document.getElementById('mastered-count').textContent = mastered;
  document.getElementById('progress-copy').textContent = `${mastered} / ${words.length} mastered`;
  document.getElementById('progress-bar').style.width = `${words.length ? (mastered / words.length) * 100 : 0}%`;
  document.getElementById('word-list').innerHTML = words.slice(0, 300).map((word, index) => {
    const record = cardRecord(index);
    const status = isMasteredCard(record) ? 'mastered' : !isNewCard(record) ? 'learning' : '';
    const due = record && record.reviews ? `<span class="due-label">${record.due <= localDateKey() ? 'due' : record.due.slice(5)}</span>` : '';
    return `<div class="word-row"><span class="num">${String(index + 1).padStart(2, '0')}</span><span>${word[0]} ${due}</span><span class="mastery-dot ${status}" title="${status || 'new'}"></span></div>`;
  }).join('');
}

function recordActivity() {
  const today = localDateKey();
  appState.activity[today] = (appState.activity[today] || 0) + 1;
  renderActivity();
}

// A day is "done" once you introduce the day's new-word target, or (once the deck
// is exhausted) once you clear your review quota. Either keeps the streak alive.
function dayComplete(dateKey) {
  const newDone = (appState.newActivity || {})[dateKey] || 0;
  const reviewsDone = appState.activity[dateKey] || 0;
  return newDone >= newDailyTarget() || reviewsDone >= dailyGoal();
}

function calculateStreak() {
  let streak = 0;
  let recoveryUsed = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!dayComplete(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  for (let days = 0; days < 365; days += 1) {
    if (dayComplete(localDateKey(cursor))) streak += 1;
    else if (recoveryUsed < appState.settings.recoveryDays && streak > 0) recoveryUsed += 1;
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, recoveryUsed };
}

function renderActivity() {
  const target = newDailyTarget();
  const cells = [];
  for (let offset = 90; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date);
    const learned = (appState.newActivity || {})[key] || 0;
    const reviews = appState.activity[key] || 0;
    const share = learned / target;
    let level = share >= 1 ? 4 : share >= 0.66 ? 3 : share >= 0.33 ? 2 : learned > 0 ? 1 : 0;
    if (!level && reviews >= dailyGoal()) level = 2;
    cells.push(`<span class="heat-cell ${level ? `l${level}` : ''}" title="${key}: ${learned}/${target} new words · ${reviews} reviews"></span>`);
  }
  document.getElementById('heatmap').innerHTML = cells.join('');
  const { streak, recoveryUsed } = calculateStreak();
  document.getElementById('streak-count').textContent = `${streak} day${streak === 1 ? '' : 's'}`;

  const learnedToday = newWordsToday();
  const fill = document.getElementById('new-today-fill');
  const label = document.getElementById('new-today-label');
  const wrap = document.getElementById('new-today');
  if (fill && label && wrap) {
    const done = Math.min(learnedToday, target);
    fill.style.transform = `scaleX(${target ? done / target : 0})`;
    label.textContent = `${learnedToday} / ${target} new words today`;
    wrap.classList.toggle('met', learnedToday >= target);
  }

  document.getElementById('streak-rule').textContent = `A day counts once you learn ${target} new word${target === 1 ? '' : 's'} (or clear ${dailyGoal()} reviews). Adjustable in Daily load.`;
  const left = target - learnedToday;
  document.getElementById('commitment-copy').textContent = left <= 0
    ? `Today's ${target} new words are done. Reviews and extra study still count — stop while your focus is good.`
    : `${left} new word${left === 1 ? '' : 's'} left today.${recoveryUsed ? ' Your recovery day is currently protecting the streak.' : ''}`;
}

function saveStudySettings() {
  appState.settings.dailyNew = Math.min(200, Math.max(1, Number(document.getElementById('daily-new').value || 75)));
  appState.settings.dailyReviews = Math.min(300, Math.max(1, Number(document.getElementById('daily-reviews').value || 30)));
  appState.settings.dailyGoal = Math.min(100, Math.max(1, Number(document.getElementById('daily-goal').value || DEFAULT_DAILY_GOAL)));
  appState.settings.goalsConfigured = true;
  queue = dailyPlanIndices().plan;
  saveAppState();
  renderAll();
  showToast(`Daily plan updated: ${appState.settings.dailyNew} new + ${appState.settings.dailyReviews} reviews.`);
}

function renderFocusedCounts() {
  document.getElementById('mistake-count').textContent = mistakeIndices().length;
  document.getElementById('weak-count').textContent = weakIndices().length;
}

function renderAnalytics() {
  const records = currentWords().map((word, index) => ({ word, index, record: cardRecord(index) })).filter(item => item.record && item.record.reviews);
  const totalReviews = records.reduce((sum, item) => sum + item.record.reviews, 0);
  const totalCorrect = records.reduce((sum, item) => sum + item.record.correct, 0);
  const retention = totalReviews ? Math.round((totalCorrect / totalReviews) * 100) : 0;
  const averageStability = records.length ? records.reduce((sum,item) => sum + Number(item.record.stability || item.record.interval || 0),0) / records.length : 0;
  const today = localDateKey();
  const due = records.filter(item => item.record.due <= today).length;
  const mastered = records.filter(item => isMasteredCard(item.record)).length;
  const tomorrow = records.filter(item => item.record.due === addDaysKey(today, 1)).length;
  document.getElementById('metric-retention').textContent = `${retention}%`;
  document.getElementById('metric-due').textContent = due;
  document.getElementById('metric-mastered').textContent = mastered;
  document.getElementById('metric-tomorrow').textContent = tomorrow;
  document.getElementById('metric-stability').textContent = `${averageStability.toFixed(1)}d`;
  const coverage = currentWords().length ? records.length / currentWords().length : 0;
  const masteryRatio = currentWords().length ? mastered / currentWords().length : 0;
  const readiness = Math.round(Math.min(100, retention * .55 + coverage * 25 + masteryRatio * 20));
  document.getElementById('metric-readiness').textContent = `${readiness}%`;
  const countdown = document.getElementById('sat-countdown');
  if (appState.settings.satDate) {
    const remaining = Math.max(0, Math.ceil((new Date(`${appState.settings.satDate}T12:00:00`) - new Date()) / 86400000));
    countdown.textContent = `${remaining} days until SAT · ${readiness}% readiness from current recall data.`;
  } else countdown.textContent = 'Set your SAT date during onboarding or in your profile settings.';

  const hardest = [...records].sort((a, b) => (b.record.lapses * 3 + b.record.reviews - b.record.correct) - (a.record.lapses * 3 + a.record.reviews - a.record.correct)).slice(0, 8);
  const maxDifficulty = Math.max(1, ...hardest.map(item => item.record.lapses * 3 + item.record.reviews - item.record.correct));
  document.getElementById('hardest-words').innerHTML = hardest.length ? hardest.map(item => {
    const difficulty = item.record.lapses * 3 + item.record.reviews - item.record.correct;
    return `<div class="bar-row"><span>${item.word[0]}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8, difficulty / maxDifficulty * 100)}%"></div></div><span>${item.record.lapses} misses</span></div>`;
  }).join('') : '<p class="side-copy">Complete reviews to reveal difficult words.</p>';

  const forecast = [];
  for (let day = 0; day < 7; day += 1) {
    const key = addDaysKey(today, day);
    forecast.push({ key, count: records.filter(item => item.record.due === key).length });
  }
  const maxForecast = Math.max(1, ...forecast.map(item => item.count));
  document.getElementById('forecast-bars').innerHTML = forecast.map(item => `<div class="bar-row"><span>${item.key === today ? 'Today' : item.key.slice(5)}</span><div class="bar-track"><div class="bar-fill" style="width:${item.count / maxForecast * 100}%"></div></div><span>${item.count}</span></div>`).join('');

  const recentRatings = currentWords().flatMap((word, index) => {
    const record = cardRecord(index);
    return ((record && record.history) || []).map(entry => ({ ...entry, word: word[0], interval: record.interval }));
  }).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 12);
  document.getElementById('recent-ratings').innerHTML = recentRatings.length ? recentRatings.map(entry => {
    const label = entry.rating === 'know' ? 'Know it' : entry.rating[0].toUpperCase() + entry.rating.slice(1);
    const time = new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<div class="rating-log-row"><strong>${escapeHtml(entry.word)}</strong><span class="rating-badge">${label} · ${escapeHtml(entry.source)}</span><span>${time}</span></div>`;
  }).join('') : '<p class="side-copy">Your Again, Hard, and Know ratings will appear here.</p>';
  renderSatPlan(mastered);
}

function saveSatPlanDate(value) {
  appState.settings.satDate = value || '';
  saveAppState();
  renderAnalytics();
  showToast(value ? 'SAT plan updated.' : 'SAT date cleared.');
}

function renderSatPlan(masteredCount) {
  const dateInput = document.getElementById('sat-plan-date');
  if (!dateInput) return;
  dateInput.min = localDateKey();
  dateInput.value = appState.settings.satDate || '';
  const total = currentWords().length;
  const mastered = Number.isFinite(masteredCount) ? masteredCount : currentWords().filter((word, index) => isMasteredCard(cardRecord(index))).length;
  const remaining = Math.max(0, total - mastered);
  const completion = total ? Math.round(mastered / total * 100) : 0;
  document.getElementById('sat-words-left').textContent = remaining.toLocaleString();
  document.getElementById('sat-plan-percent').textContent = `${completion}%`;
  document.getElementById('sat-pace-fill').style.transform = `scaleX(${completion / 100})`;
  if (!appState.settings.satDate) {
    document.getElementById('sat-days-left').textContent = '—';
    document.getElementById('sat-daily-words').textContent = '—';
    document.getElementById('sat-weekly-words').textContent = '—';
    document.getElementById('sat-pace-label').textContent = 'Set an exam date to calculate your pace.';
    document.getElementById('sat-plan-status').textContent = 'Your current deck progress is shown above. Add a date for a daily and weekly finish line.';
    return;
  }
  const daysLeft = Math.max(1, Math.ceil((new Date(`${appState.settings.satDate}T12:00:00`) - new Date()) / 86400000));
  const dailyWords = remaining ? Math.ceil(remaining / daysLeft) : 0;
  const weeklyWords = Math.min(remaining, dailyWords * 7);
  const configured = Number(appState.settings.dailyNew || 75);
  document.getElementById('sat-days-left').textContent = daysLeft.toLocaleString();
  document.getElementById('sat-daily-words').textContent = dailyWords.toLocaleString();
  document.getElementById('sat-weekly-words').textContent = weeklyWords.toLocaleString();
  document.getElementById('sat-pace-label').textContent = `${mastered.toLocaleString()} of ${total.toLocaleString()} words secured`;
  document.getElementById('sat-plan-status').textContent = remaining === 0
    ? 'This deck is fully covered. Keep reviewing due cards to protect retention.'
    : configured >= dailyWords
      ? `Your current ${configured}-new-word daily setting is enough to finish this deck before the exam.`
      : `Raise Daily load from ${configured} to ${dailyWords} new words, or choose a smaller priority deck.`;
}

function renderAll() {
  renderDailyPlan();
  renderMainRoadmap();
  renderTranslationPreference();
  renderProgress();
  renderActivity();
  renderFocusedCounts();
  renderLibraryWords();
  renderProfile();
  if (mode === 'analytics') renderAnalytics();
}

function renderTranslationPreference() {
  const input = document.getElementById('new-translation');
  if (!input) return;
  const language = (appState.profile || {}).translationLanguage || 'Russian';
  input.placeholder = language === 'Other' ? 'Translation in your language' : `${language} translation`;
  input.setAttribute('aria-label', input.placeholder);
  const copy = document.getElementById('translation-format-copy');
  if (copy) copy.textContent = `Format: word | definition | ${language === 'Other' ? 'your language' : language} translation | example`;
}

function resetProgress() {
  if (!armDestructiveAction('reset-progress', 'Click Reset progress again within 5 seconds to confirm.')) return;
  appState.progress[activeDeckId] = { cards: {} };
  queue = [];
  saveAppState();
  renderAll();
  startDailyPlan();
}

function renderPersonalDeckSelect() {
  const select = document.getElementById('personal-deck-select');
  select.innerHTML = Object.values(appState.personalDecks).map(deck => `<option value="${deck.id}" ${deck.id === activeDeckId ? 'selected' : ''}>${deck.name} · ${deck.words.length} words</option>`).join('');
  renderDictionaryDeckSelect();
}

function renderDictionaryDeckSelect() {
  const select = document.getElementById('dictionary-target-deck');
  if (!select) return;
  const previous = select.value;
  const fallback = activeDeckId !== 'pdf' && appState.personalDecks[activeDeckId] ? activeDeckId : appState.settings.lastPersonalDeck || MAIN_DECK_ID;
  select.innerHTML = Object.values(appState.personalDecks).map(deck => `<option value="${deck.id}">${escapeHtml(deck.name)} · ${deck.words.length} words</option>`).join('');
  select.value = appState.personalDecks[previous] ? previous : appState.personalDecks[fallback] ? fallback : MAIN_DECK_ID;
}

function dictionaryTargetDeckId() {
  const selected = document.getElementById('dictionary-target-deck')?.value;
  return appState.personalDecks[selected] ? selected : MAIN_DECK_ID;
}

function parseDictionaryQuery(value) {
  const matches = String(value || '').toLowerCase().match(/[a-z]+(?:['-][a-z]+)*/g) || [];
  return [...new Set(matches.map(normalizeWord).filter(Boolean))].slice(0, 30);
}

function satDictionaryEntry(query) {
  const match = STARTER_WORDS.find(word => normalizeWord(word[0]) === query) || pdfWords.find(word => normalizeWord(word[0]) === query);
  if (!match) return null;
  return {
    query,
    word: match[0],
    phonetic: '',
    source: 'sat',
    cached: false,
    meanings: [{ part: match[1] || '—', definition: match[2], example: match[3] || '' }],
    selectedMeaning: 0,
    selected: true,
    status: 'ready'
  };
}

function cachedDictionaryEntry(query) {
  const cache = appState.dictionaryCache || {};
  const entry = cache[query];
  if (!entry || !Array.isArray(entry.meanings) || !entry.meanings.length) return null;
  return { query, word: entry.word || query, phonetic: entry.phonetic || '', source: 'dictionary', cached: true, meanings: entry.meanings, selectedMeaning: 0, selected: true, status: 'ready' };
}

function cacheDictionaryEntry(query, entry) {
  appState.dictionaryCache = appState.dictionaryCache || {};
  delete appState.dictionaryCache[query];
  appState.dictionaryCache[query] = { word: entry.word, phonetic: entry.phonetic, meanings: entry.meanings, savedAt: new Date().toISOString() };
  const keys = Object.keys(appState.dictionaryCache);
  keys.slice(0, Math.max(0, keys.length - 500)).forEach(key => { delete appState.dictionaryCache[key]; });
}

async function fetchDictionaryEntry(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`, { signal: controller.signal });
    if (response.status === 404) return { query, word: query, phonetic: '', source: 'dictionary', cached: false, meanings: [], selectedMeaning: 0, selected: false, status: 'not-found' };
    if (!response.ok) throw new Error(`Dictionary returned ${response.status}`);
    const entries = await response.json();
    const phonetic = entries.find(entry => entry.phonetic)?.phonetic || entries.flatMap(entry => entry.phonetics || []).find(item => item.text)?.text || '';
    const meanings = entries.flatMap(entry => entry.meanings || []).flatMap(meaning => (meaning.definitions || []).map(definition => ({
      part: meaning.partOfSpeech || '—',
      definition: definition.definition || '',
      example: definition.example || ''
    }))).filter(item => item.definition).slice(0, 8);
    if (!meanings.length) return { query, word: query, phonetic, source: 'dictionary', cached: false, meanings: [], selectedMeaning: 0, selected: false, status: 'not-found' };
    const result = { query, word: entries[0]?.word || query, phonetic, source: 'dictionary', cached: false, meanings, selectedMeaning: 0, selected: true, status: 'ready' };
    cacheDictionaryEntry(query, result);
    return result;
  } catch {
    const status = navigator.onLine ? 'network-error' : 'offline';
    return { query, word: query, phonetic: '', source: 'dictionary', cached: false, meanings: [], selectedMeaning: 0, selected: false, status };
  } finally {
    clearTimeout(timer);
  }
}

function quickLocalMatches(query) {
  if (!query) return [];
  const seen = new Set();
  return [...STARTER_WORDS, ...pdfWords].filter(entry => {
    const key = normalizeWord(entry[0]);
    if (!key.startsWith(query) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function setQuickLookupStatus(copy, state = '') {
  const status = document.getElementById('word-lookup-status');
  if (!status) return;
  status.textContent = copy;
  status.className = `word-lookup-status${state ? ` ${state}` : ''}`;
}

function setQuickLookupBusy(busy) {
  const autofill = document.getElementById('word-autofill-button');
  const submit = document.getElementById('word-submit-button');
  if (autofill) {
    autofill.disabled = busy;
    autofill.textContent = busy ? 'Finding…' : 'Auto-fill';
  }
  if (submit && editingWordIndex < 0) {
    submit.disabled = busy;
    submit.textContent = busy ? 'Finding…' : 'Add word';
  }
}

function clearQuickAutofilledFields() {
  ['new-pos', 'new-definition', 'new-example'].forEach(id => {
    const field = document.getElementById(id);
    if (field?.dataset.autofilled === 'true') field.value = '';
    if (field) delete field.dataset.autofilled;
  });
  quickAutofilledWord = '';
}

function hideQuickSuggestions() {
  const panel = document.getElementById('word-suggestions');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.innerHTML = '';
}

function renderQuickSuggestions(matches, result = null) {
  const panel = document.getElementById('word-suggestions');
  if (!panel) return;
  const suggestions = matches.map(entry => `<button class="word-suggestion" type="button" onmousedown="event.preventDefault()" onclick="selectQuickLocalSuggestion(decodeURIComponent('${encodeURIComponent(entry[0])}'))"><strong>${escapeHtml(entry[0])}</strong><span>${escapeHtml(entry[1] || '—')} · ${escapeHtml(entry[2] || '')}</span></button>`).join('');
  let meanings = '';
  if (result?.meanings?.length > 1) {
    meanings = `<div class="word-meaning-picker"><label for="quick-meaning-select">Choose the meaning for this card</label><select id="quick-meaning-select" onchange="chooseQuickMeaning(this.value)">${result.meanings.map((meaning, index) => `<option value="${index}" ${index === result.selectedMeaning ? 'selected' : ''}>${escapeHtml(meaning.part || '—')} · ${escapeHtml(meaning.definition)}</option>`).join('')}</select></div>`;
  }
  panel.innerHTML = suggestions + meanings;
  panel.classList.toggle('hidden', !panel.innerHTML);
}

function applyQuickLookupEntry(result, meaningIndex = 0) {
  if (!result?.meanings?.length) return false;
  result.selectedMeaning = Math.max(0, Math.min(result.meanings.length - 1, Number(meaningIndex || 0)));
  const meaning = result.meanings[result.selectedMeaning];
  const wordInput = document.getElementById('new-word');
  if (wordInput) wordInput.value = result.word || result.query;
  const values = { 'new-pos': meaning.part || '—', 'new-definition': meaning.definition || '', 'new-example': meaning.example || `Write a sentence using “${result.word || result.query}”.` };
  Object.entries(values).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (!field) return;
    if (!field.value.trim() || field.dataset.autofilled === 'true') {
      field.value = value;
      field.dataset.autofilled = 'true';
    }
  });
  quickLookupResult = result;
  quickAutofilledWord = normalizeWord(result.word || result.query);
  const source = result.source === 'sat' ? 'SAT Library · works offline' : result.cached ? 'Dictionary · saved offline' : 'Free Dictionary';
  setQuickLookupStatus(`Ready · ${source}${result.meanings.length > 1 ? ' · choose another meaning below if needed' : ''}.`, 'ready');
  renderQuickSuggestions([], result);
  return true;
}

function selectQuickLocalSuggestion(word) {
  const input = document.getElementById('new-word');
  if (input) input.value = word;
  const result = satDictionaryEntry(normalizeWord(word));
  if (result) applyQuickLookupEntry(result);
}

function chooseQuickMeaning(value) {
  if (quickLookupResult) applyQuickLookupEntry(quickLookupResult, Number(value));
}

function handleQuickWordKeydown(event) {
  if (event.key === 'Escape') hideQuickSuggestions();
  if (event.key === 'ArrowDown') {
    const first = document.querySelector('#word-suggestions .word-suggestion');
    if (first) {
      event.preventDefault();
      first.focus();
    }
  }
}

function handleQuickWordInput() {
  if (editingWordIndex >= 0) return;
  clearTimeout(quickLookupTimer);
  quickLookupRequest += 1;
  const query = normalizeWord(document.getElementById('new-word')?.value || '');
  if (quickAutofilledWord && query !== quickAutofilledWord) clearQuickAutofilledFields();
  quickLookupResult = null;
  if (!query) {
    hideQuickSuggestions();
    setQuickLookupStatus('Type one English word. The definition and example will fill automatically.');
    return;
  }
  const local = quickLocalMatches(query);
  const exact = local.find(entry => normalizeWord(entry[0]) === query);
  if (exact) {
    applyQuickLookupEntry(satDictionaryEntry(query));
    return;
  }
  renderQuickSuggestions(local);
  setQuickLookupStatus(local.length ? 'Choose a SAT Library suggestion, or keep typing.' : 'Waiting to check the free dictionary…');
  if (query.length >= 3 && /^[a-z]+(?:['-][a-z]+)*$/.test(query)) {
    quickLookupTimer = setTimeout(() => autofillNewWord(false), 700);
  }
}

async function autofillNewWord(showErrors = true) {
  if (editingWordIndex >= 0) return null;
  const input = document.getElementById('new-word');
  const query = normalizeWord(input?.value || '');
  if (!query) {
    if (showErrors) {
      input?.focus();
      setQuickLookupStatus('Type an English word first.', 'error');
    }
    return null;
  }
  if (!/^[a-z]+(?:['-][a-z]+)*$/.test(query)) {
    setQuickLookupStatus('Enter one English word only.', 'error');
    return null;
  }
  const local = satDictionaryEntry(query);
  if (local) {
    applyQuickLookupEntry(local);
    return local;
  }
  const cached = cachedDictionaryEntry(query);
  if (cached) {
    applyQuickLookupEntry(cached);
    return cached;
  }
  const request = ++quickLookupRequest;
  clearTimeout(quickLookupTimer);
  setQuickLookupBusy(true);
  setQuickLookupStatus('Searching the free English dictionary…');
  const result = await fetchDictionaryEntry(query);
  if (request !== quickLookupRequest || normalizeWord(input?.value || '') !== query) {
    setQuickLookupBusy(false);
    return null;
  }
  setQuickLookupBusy(false);
  if (result.status === 'ready') {
    applyQuickLookupEntry(result);
    saveAppState();
    return result;
  }
  hideQuickSuggestions();
  const unavailable = ['offline', 'network-error'].includes(result.status);
  setQuickLookupStatus(unavailable ? 'Dictionary unavailable. Check your connection, or fill the definition manually.' : 'No dictionary match. Fill the definition manually.', 'error');
  if (showErrors) showToast(unavailable ? 'The online dictionary could not be reached.' : 'Word not found. You can still enter its definition manually.');
  return null;
}

function resetQuickLookupUI() {
  clearTimeout(quickLookupTimer);
  quickLookupRequest += 1;
  quickLookupResult = null;
  quickAutofilledWord = '';
  hideQuickSuggestions();
  ['new-pos', 'new-definition', 'new-example'].forEach(id => {
    const field = document.getElementById(id);
    if (field) delete field.dataset.autofilled;
  });
  setQuickLookupBusy(false);
  setQuickLookupStatus('Type one English word. The definition and example will fill automatically.');
}

async function findDictionaryWords() {
  if (dictionarySearchBusy) return;
  const input = document.getElementById('dictionary-query');
  const allMatches = String(input.value || '').toLowerCase().match(/[a-z]+(?:['-][a-z]+)*/g) || [];
  const words = parseDictionaryQuery(input.value);
  if (!words.length) {
    input.focus();
    showToast('Enter at least one English word.');
    return;
  }
  if (new Set(allMatches.map(normalizeWord)).size > 30) showToast('Searching the first 30 unique words.');
  dictionarySearchBusy = true;
  dictionaryResults = words.map(query => satDictionaryEntry(query) || cachedDictionaryEntry(query) || { query, word: query, phonetic: '', source: 'dictionary', cached: false, meanings: [], selectedMeaning: 0, selected: false, status: 'loading' });
  setDictionarySearchBusy(true);
  refreshDictionaryStatuses(false);
  renderDictionaryResults();
  const unresolved = dictionaryResults.map((result, index) => ({ result, index })).filter(item => item.result.status === 'loading');
  let cursor = 0;
  let completed = words.length - unresolved.length;
  updateDictionaryProgress(completed, words.length);
  async function worker() {
    while (cursor < unresolved.length) {
      const item = unresolved[cursor];
      cursor += 1;
      dictionaryResults[item.index] = await fetchDictionaryEntry(item.result.query);
      completed += 1;
      refreshDictionaryStatuses(false);
      updateDictionaryProgress(completed, words.length);
      renderDictionaryResults();
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, unresolved.length) }, () => worker()));
  dictionarySearchBusy = false;
  setDictionarySearchBusy(false);
  refreshDictionaryStatuses(false);
  saveAppState();
  renderDictionaryResults();
}

function setDictionarySearchBusy(busy) {
  const button = document.getElementById('dictionary-find-button');
  button.disabled = busy;
  button.textContent = busy ? 'Searching…' : 'Find words';
  document.getElementById('dictionary-progress').classList.toggle('hidden', !busy);
}

function updateDictionaryProgress(completed, total) {
  const progress = total ? completed / total : 0;
  document.getElementById('dictionary-progress-fill').style.transform = `scaleX(${progress})`;
  document.getElementById('dictionary-summary-copy').textContent = dictionarySearchBusy ? `Checking ${completed} of ${total} words…` : `${total} words checked.`;
}

function refreshDictionaryStatuses(render = true) {
  const target = appState.personalDecks[dictionaryTargetDeckId()];
  const existing = new Set((target?.words || []).map(word => normalizeWord(word[0])));
  dictionaryResults.forEach(result => {
    if (['loading', 'not-found', 'offline', 'network-error'].includes(result.status)) return;
    result.status = existing.has(normalizeWord(result.word)) ? 'duplicate' : 'ready';
    if (result.status === 'duplicate') result.selected = false;
  });
  if (render) renderDictionaryResults();
}

function dictionaryStatusLabel(status) {
  return ({ ready: 'Ready to add', duplicate: 'Already in deck', 'not-found': 'Not found', offline: 'Internet required', 'network-error': 'Dictionary unavailable', loading: 'Searching' })[status] || status;
}

function renderDictionaryResults() {
  const container = document.getElementById('dictionary-results');
  const actions = document.getElementById('dictionary-actions');
  if (!container || !actions) return;
  const hasResults = dictionaryResults.length > 0;
  container.classList.toggle('hidden', !hasResults);
  actions.classList.toggle('hidden', !hasResults);
  if (!hasResults) return;
  container.innerHTML = dictionaryResults.map((result, index) => {
    const ready = result.status === 'ready';
    const selectedMeaning = result.meanings[result.selectedMeaning] || null;
    const source = result.source === 'sat' ? 'SAT Library' : result.cached ? 'Dictionary · cached' : 'Dictionary';
    const statusClass = ready ? 'ready' : result.status === 'duplicate' ? 'duplicate' : ['not-found', 'offline', 'network-error'].includes(result.status) ? 'error' : '';
    const meaningOptions = result.meanings.map((meaning, meaningIndex) => `<option value="${meaningIndex}" ${meaningIndex === result.selectedMeaning ? 'selected' : ''}>${escapeHtml(`${meaning.part} — ${meaning.definition.slice(0, 96)}`)}</option>`).join('');
    const meaning = selectedMeaning
      ? `<div class="dictionary-meaning">${result.meanings.length > 1 ? `<select aria-label="Meaning for ${escapeHtml(result.word)}" onchange="chooseDictionaryMeaning(${index},this.value)">${meaningOptions}</select>` : ''}<p class="dictionary-definition">${escapeHtml(selectedMeaning.definition)}</p><p class="dictionary-example">${escapeHtml(selectedMeaning.example || `Write a sentence using “${result.word}”.`)}</p></div>`
      : `<div class="dictionary-meaning"><p class="dictionary-definition">${result.status === 'loading' ? 'Looking up definitions…' : ['offline', 'network-error'].includes(result.status) ? 'The dictionary is unavailable. Check your connection and search again.' : 'No English definition was found.'}</p></div>`;
    return `<article class="dictionary-result"><input type="checkbox" aria-label="Select ${escapeHtml(result.word)}" ${ready && result.selected ? 'checked' : ''} ${ready ? '' : 'disabled'} onchange="toggleDictionaryResult(${index},this.checked)"><div class="dictionary-word"><strong>${escapeHtml(result.word)}</strong><span>${escapeHtml(result.phonetic || 'pronunciation unavailable')}</span><div class="dictionary-badges"><i class="dictionary-badge ${result.source === 'sat' ? 'sat' : ''}">${source}</i><i class="dictionary-badge ${statusClass}">${dictionaryStatusLabel(result.status)}</i></div></div>${meaning}<button class="dictionary-add" type="button" ${ready ? '' : 'disabled'} onclick="addDictionaryResult(${index})">Add</button></article>`;
  }).join('');
  const readyCount = dictionaryResults.filter(result => result.status === 'ready').length;
  const duplicateCount = dictionaryResults.filter(result => result.status === 'duplicate').length;
  const missingCount = dictionaryResults.filter(result => ['not-found', 'offline', 'network-error'].includes(result.status)).length;
  document.getElementById('dictionary-summary-copy').textContent = dictionarySearchBusy ? document.getElementById('dictionary-summary-copy').textContent : `${readyCount} ready · ${duplicateCount} already saved · ${missingCount} need attention`;
  document.getElementById('dictionary-add-selected').disabled = !dictionaryResults.some(result => result.status === 'ready' && result.selected);
}

function chooseDictionaryMeaning(index, value) {
  if (!dictionaryResults[index]) return;
  dictionaryResults[index].selectedMeaning = Math.max(0, Math.min(dictionaryResults[index].meanings.length - 1, Number(value || 0)));
  renderDictionaryResults();
}

function toggleDictionaryResult(index, checked) {
  if (!dictionaryResults[index] || dictionaryResults[index].status !== 'ready') return;
  dictionaryResults[index].selected = Boolean(checked);
  document.getElementById('dictionary-add-selected').disabled = !dictionaryResults.some(result => result.status === 'ready' && result.selected);
}

function selectAllDictionaryResults() {
  const ready = dictionaryResults.filter(result => result.status === 'ready');
  const shouldSelect = ready.some(result => !result.selected);
  ready.forEach(result => { result.selected = shouldSelect; });
  renderDictionaryResults();
}

function dictionaryResultWord(result) {
  const meaning = result.meanings[result.selectedMeaning] || result.meanings[0];
  return [result.word, meaning.part || '—', meaning.definition, meaning.example || `Write a sentence using “${result.word}”.`, ''];
}

function addDictionaryEntries(results) {
  const targetId = dictionaryTargetDeckId();
  const deck = appState.personalDecks[targetId];
  if (!deck) return 0;
  const existing = new Set(deck.words.map(word => normalizeWord(word[0])));
  let added = 0;
  results.forEach(result => {
    const key = normalizeWord(result.word);
    if (result.status !== 'ready' || existing.has(key) || !result.meanings.length) return;
    deck.words.push(dictionaryResultWord(result));
    existing.add(key);
    result.selected = false;
    added += 1;
  });
  if (!added) return 0;
  if (!appState.progress[targetId]) appState.progress[targetId] = { cards: {} };
  saveAppState();
  updateDeckLabels();
  renderPersonalDeckSelect();
  if (targetId === activeDeckId) {
    queue = shuffled(dailyPlanIndices().plan);
    renderAll();
  }
  refreshDictionaryStatuses(false);
  renderDictionaryResults();
  return added;
}

function addDictionaryResult(index) {
  const result = dictionaryResults[index];
  if (!result) return;
  const added = addDictionaryEntries([result]);
  showToast(added ? `${result.word} added to the selected deck.` : `${result.word} is already in the selected deck.`);
}

function addSelectedDictionaryResults() {
  const selected = dictionaryResults.filter(result => result.status === 'ready' && result.selected);
  if (!selected.length) return showToast('Select at least one ready word.');
  const added = addDictionaryEntries(selected);
  showToast(`${added} words added to the selected deck.`);
}

function libraryVisibleIndices() {
  if (activeDeckId === 'pdf') return [];
  const query = normalizeWord(document.getElementById('library-search')?.value || '');
  const filter = document.getElementById('library-filter')?.value || 'all';
  return currentWords().map((word, index) => ({ word, index, record: cardRecord(index) })).filter(item => {
    const haystack = normalizeWord(`${item.word[0]} ${item.word[2]} ${item.word[4] || ''}`);
    const status = isMasteredCard(item.record) ? 'mastered' : isNewCard(item.record) ? 'new' : 'learning';
    return (!query || haystack.includes(query)) && (filter === 'all' || filter === status);
  }).map(item => item.index);
}

function renderLibraryWords() {
  const list = document.getElementById('library-word-list');
  if (!list) return;
  if (activeDeckId === 'pdf') {
    list.innerHTML = '<div class="library-empty">Open a personal deck to edit its words.</div>';
    return;
  }
  const visible = libraryVisibleIndices();
  const words = currentWords();
  list.innerHTML = visible.length ? visible.map(index => {
    const word = words[index];
    const record = cardRecord(index);
    const status = isMasteredCard(record) ? 'mastered' : isNewCard(record) ? 'new' : 'learning';
    return `<div class="library-row"><input type="checkbox" aria-label="Select ${escapeHtml(word[0])}" ${selectedLibraryWords.has(index) ? 'checked' : ''} onchange="toggleLibraryWord(${index},this.checked)"><strong>${escapeHtml(word[0])}</strong><span class="library-definition">${escapeHtml(word[2])}</span><span class="library-status ${status}">${status}</span><button type="button" onclick="editLibraryWord(${index})">Edit</button></div>`;
  }).join('') : '<div class="library-empty">No words match this search and filter.</div>';
  document.getElementById('library-selection-copy').textContent = `${selectedLibraryWords.size} selected · ${visible.length} visible`;
}

function toggleLibraryWord(index, checked) {
  if (checked) selectedLibraryWords.add(index);
  else selectedLibraryWords.delete(index);
  document.getElementById('library-selection-copy').textContent = `${selectedLibraryWords.size} selected · ${libraryVisibleIndices().length} visible`;
}

function toggleVisibleLibraryWords() {
  const visible = libraryVisibleIndices();
  const allSelected = visible.length && visible.every(index => selectedLibraryWords.has(index));
  visible.forEach(index => allSelected ? selectedLibraryWords.delete(index) : selectedLibraryWords.add(index));
  renderLibraryWords();
}

function resetSelectedWordProgress() {
  if (!selectedLibraryWords.size || activeDeckId === 'pdf') return showToast('Select at least one word first.');
  const cards = ensureProgress(activeDeckId).cards;
  selectedLibraryWords.forEach(index => { delete cards[index]; });
  saveAppState();
  renderAll();
  showToast(`Reset the schedule for ${selectedLibraryWords.size} selected words.`);
}

function deleteSelectedWords() {
  if (!selectedLibraryWords.size || activeDeckId === 'pdf') return showToast('Select at least one word first.');
  const count = selectedLibraryWords.size;
  if (!armDestructiveAction('bulk-delete-words', `Click Delete selected again within 5 seconds to remove ${count} words.`, 'bulk-delete-words', 'Confirm deletion')) return;
  const deck = appState.personalDecks[activeDeckId];
  const oldCards = ensureProgress(activeDeckId).cards;
  const kept = [];
  const remappedCards = {};
  deck.words.forEach((word, oldIndex) => {
    if (selectedLibraryWords.has(oldIndex)) return;
    const nextIndex = kept.length;
    kept.push(word);
    if (oldCards[oldIndex]) remappedCards[nextIndex] = oldCards[oldIndex];
  });
  deck.words = kept;
  appState.progress[activeDeckId].cards = remappedCards;
  selectedLibraryWords.clear();
  queue = shuffled(dailyPlanIndices().plan);
  saveAppState();
  renderAll();
  updateDeckLabels();
  renderPersonalDeckSelect();
  showToast(`${count} words removed.`);
}

function editLibraryWord(index) {
  if (activeDeckId === 'pdf' || !currentWords()[index]) return;
  const word = currentWords()[index];
  editingWordIndex = index;
  resetQuickLookupUI();
  document.getElementById('new-word').value = word[0];
  document.getElementById('new-pos').value = word[1] || '';
  document.getElementById('new-definition').value = word[2] || '';
  document.getElementById('new-translation').value = word[4] || '';
  document.getElementById('new-example').value = word[3] || '';
  document.getElementById('editing-word-label').textContent = word[0];
  document.getElementById('word-edit-banner').classList.remove('hidden');
  document.getElementById('word-submit-button').textContent = 'Save changes';
  document.getElementById('new-word').focus();
}

function cancelWordEdit(clearFields = true) {
  editingWordIndex = -1;
  const banner = document.getElementById('word-edit-banner');
  if (banner) banner.classList.add('hidden');
  const button = document.getElementById('word-submit-button');
  if (button) button.textContent = 'Add word';
  if (clearFields) document.querySelector('.add-form')?.reset();
  resetQuickLookupUI();
}

function makeDeckId() {
  return `personal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function createPersonalDeck() {
  const input = document.getElementById('deck-name-input');
  const name = input.value.trim();
  if (!name) {
    input.focus();
    showToast('Enter a deck name first.');
    return;
  }
  const id = makeDeckId();
  appState.personalDecks[id] = { id, name: name.trim(), words: [] };
  appState.progress[id] = { cards: {} };
  appState.settings.lastPersonalDeck = id;
  input.value = '';
  saveAppState();
  switchDeck(id);
  showToast(`Created “${name.trim()}”.`);
}

function renamePersonalDeck() {
  if (activeDeckId === 'pdf') return;
  const deck = appState.personalDecks[activeDeckId];
  const input = document.getElementById('deck-name-input');
  const name = input.value.trim();
  if (!name) {
    input.value = deck.name;
    input.focus();
    input.select();
    showToast('Edit the name, then press Rename again.');
    return;
  }
  deck.name = name.trim();
  input.value = '';
  saveAppState();
  switchDeck(activeDeckId);
}

function deletePersonalDeck() {
  if (activeDeckId === 'pdf') return;
  const ids = Object.keys(appState.personalDecks);
  if (ids.length === 1) {
    showToast('Keep at least one personal deck.');
    return;
  }
  const deck = appState.personalDecks[activeDeckId];
  if (!armDestructiveAction(`delete-${activeDeckId}`, `Click Delete again within 5 seconds to remove “${deck.name}”.`, 'delete-deck-btn', 'Confirm delete')) return;
  delete appState.personalDecks[activeDeckId];
  delete appState.progress[activeDeckId];
  const nextId = Object.keys(appState.personalDecks)[0];
  saveAppState();
  switchDeck(nextId);
}

async function addCustomWord(event) {
  event.preventDefault();
  if (activeDeckId === 'pdf') return;
  const deck = appState.personalDecks[activeDeckId];
  let word = document.getElementById('new-word').value.trim();
  let definition = document.getElementById('new-definition').value.trim();
  if (!definition && editingWordIndex < 0) {
    const found = await autofillNewWord(true);
    if (!found) {
      document.getElementById('new-definition').focus();
      return;
    }
    word = document.getElementById('new-word').value.trim();
    definition = document.getElementById('new-definition').value.trim();
  }
  if (!definition) {
    setQuickLookupStatus('Add an English definition before saving.', 'error');
    document.getElementById('new-definition').focus();
    return;
  }
  const part = document.getElementById('new-pos').value.trim() || '—';
  const translation = document.getElementById('new-translation').value.trim();
  const example = document.getElementById('new-example').value.trim() || `Write a sentence using “${word}”.`;
  if (deck.words.some((item, index) => index !== editingWordIndex && normalizeWord(item[0]) === normalizeWord(word))) {
    showToast('This word is already in the selected deck.');
    return;
  }
  const entry = [word, part, definition, example, translation];
  const edited = editingWordIndex >= 0;
  if (edited) deck.words[editingWordIndex] = entry;
  else deck.words.push(entry);
  saveAppState();
  event.target.reset();
  cancelWordEdit(false);
  renderAll();
  updateDeckLabels();
  renderPersonalDeckSelect();
  showToast(edited ? `${word} updated.` : `${word} added to “${deck.name}”.`);
}

function parseImportedWords(text, extension) {
  if (extension === 'json') {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('JSON must contain an array of words.');
    return data.map(item => Array.isArray(item)
      ? [item[0], item[1] || '—', item[2] || '', item[3] || '', item[4] || '']
      : [item.word, item.partOfSpeech || item.pos || '—', item.definition, item.example || '', item.translation || '']);
  }
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const delimiter = line.includes('\t') ? '\t' : line.includes('|') ? '|' : line.includes(';') ? ';' : ',';
    const parts = line.split(delimiter).map(part => part.trim().replace(/^"|"$/g, ''));
    return [parts[0], '—', parts[1] || '', parts[3] || '', parts[2] || ''];
  });
}

function importWordFile(event) {
  const file = event.target.files[0];
  if (!file || activeDeckId === 'pdf') return;
  const extension = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = parseImportedWords(String(reader.result), extension).filter(item => item[0] && item[2]);
      const seen = new Set();
      pendingImportWords = imported.filter(item => {
        const key = normalizeWord(item[0]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      renderImportPreview();
    } catch (error) {
      showToast(`Could not import file: ${error.message}`);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function renderImportPreview() {
  const preview = document.getElementById('import-preview');
  if (!preview) return;
  const existing = new Set(currentWords().map(item => normalizeWord(item[0])));
  const unique = pendingImportWords.filter(item => !existing.has(normalizeWord(item[0])));
  const duplicates = pendingImportWords.length - unique.length;
  preview.classList.remove('hidden');
  document.getElementById('import-preview-copy').textContent = `${unique.length} new words ready · ${duplicates} duplicates will be skipped`;
  document.getElementById('import-preview-list').innerHTML = unique.slice(0, 8).map(item => `<div class="import-preview-row"><strong>${escapeHtml(item[0])}</strong><span>${escapeHtml(item[2])}</span></div>`).join('') || '<div class="library-empty">This file contains no new words for this deck.</div>';
}

function confirmImportWords() {
  if (!pendingImportWords.length || activeDeckId === 'pdf') return cancelImportPreview();
  const deck = appState.personalDecks[activeDeckId];
  const existing = new Set(deck.words.map(item => normalizeWord(item[0])));
  const unique = pendingImportWords.filter(item => !existing.has(normalizeWord(item[0])));
  deck.words.push(...unique);
  const skipped = pendingImportWords.length - unique.length;
  saveAppState();
  cancelImportPreview(false);
  renderAll();
  updateDeckLabels();
  renderPersonalDeckSelect();
  showToast(`${unique.length} words imported. ${skipped} duplicates skipped.`);
}

function cancelImportPreview(clearFile = true) {
  pendingImportWords = [];
  const preview = document.getElementById('import-preview');
  if (preview) preview.classList.add('hidden');
  if (clearFile) {
    const input = document.getElementById('word-file');
    if (input) input.value = '';
  }
}

function backupPayload() {
  return { format: 'sat-vocab-backup', version: 4, exportedAt: new Date().toISOString(), state: appState };
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  downloadJson(backupPayload(), `sat-vocab-backup-${localDateKey()}.json`);
  showToast('Backup exported with decks, schedules, and activity.');
}

function validateBackup(payload) {
  return payload && payload.format === 'sat-vocab-backup' && payload.version === 4 && payload.state && payload.state.personalDecks && payload.state.progress;
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result));
      if (!validateBackup(payload)) throw new Error('This is not a valid SAT Vocab v4 backup.');
      appState = payload.state;
      activeDeckId = appState.activeDeckId || MAIN_DECK_ID;
      saveAppState();
      switchDeck(activeDeckId);
      showToast('Backup restored.');
    } catch (error) {
      showToast(`Could not restore backup: ${error.message}`);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function armDestructiveAction(action, message, buttonId = '', armedLabel = '') {
  const button = buttonId ? document.getElementById(buttonId) : null;
  if (button && !button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
  if (armedAction === action) {
    armedAction = '';
    clearTimeout(armedActionTimer);
    if (button) button.textContent = button.dataset.defaultLabel;
    return true;
  }
  armedAction = action;
  showToast(message);
  if (button && armedLabel) button.textContent = armedLabel;
  clearTimeout(armedActionTimer);
  armedActionTimer = setTimeout(() => {
    armedAction = '';
    if (button) button.textContent = button.dataset.defaultLabel;
  }, 5000);
  return false;
}

async function shareBackup() {
  const data = JSON.stringify(backupPayload(), null, 2);
  const file = new File([data], `sat-vocab-backup-${localDateKey()}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title: 'SAT Vocab backup', text: 'Transfer my SAT vocabulary decks and progress', files: [file] });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  exportBackup();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 4200);
}

async function showSystemNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, { body, icon: 'icon.svg', badge: 'icon.svg', tag: 'sat-vocab-reminder' });
  } else new Notification(title, { body });
  return true;
}

function renderReminders() {
  const reminders = Array.isArray(appState.settings.reminders) ? appState.settings.reminders : [];
  document.getElementById('reminder-list').innerHTML = reminders.length
    ? reminders.map((reminder, index) => `<span class="reminder-chip">${reminder.time}<button type="button" onclick="removeReminder(${index})" aria-label="Remove ${reminder.time} reminder">×</button></span>`).join('')
    : '<span class="side-copy">No reminders yet.</span>';
}

async function addReminder() {
  const time = document.getElementById('reminder-time').value || '19:00';
  if (!Array.isArray(appState.settings.reminders)) appState.settings.reminders = [];
  if (appState.settings.reminders.some(reminder => reminder.time === time)) {
    showToast(`A ${time} reminder already exists.`);
    return;
  }
  if (appState.settings.reminders.length >= 8) {
    showToast('Keep at most 8 reminders so they stay useful.');
    return;
  }
  appState.settings.reminders.push({ time, lastSent: '' });
  appState.settings.reminders.sort((a, b) => a.time.localeCompare(b.time));
  if ('Notification' in window && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch { showToast('Browser notification permission was not granted.'); }
  }
  saveAppState();
  renderReminders();
  showToast(`${time} added. You now have ${appState.settings.reminders.length} daily reminder${appState.settings.reminders.length === 1 ? '' : 's'}.`);
}

function removeReminder(index) {
  if (!Array.isArray(appState.settings.reminders)) return;
  appState.settings.reminders.splice(index, 1);
  saveAppState();
  renderReminders();
}

async function testNotification() {
  if (!('Notification' in window)) {
    showToast('This browser does not support notifications.');
    return;
  }
  if (Notification.permission === 'default') await Notification.requestPermission();
  const sent = await showSystemNotification('SAT Vocab', 'Five honest reviews are enough to keep today moving.');
  if (!sent) showToast('Allow notifications in browser settings, then try again.');
}

function checkReminder() {
  const reminders = Array.isArray(appState.settings.reminders) ? appState.settings.reminders : [];
  if (!reminders.length) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = localDateKey(now);
  const reminder = reminders.find(item => item.time === time && item.lastSent !== today);
  if (!reminder) return;
  reminder.lastSent = today;
  saveAppState();
  const remaining = Math.max(0, dailyGoal() - (appState.activity[today] || 0));
  const message = remaining ? `${remaining} reviews protect today. Start with one card.` : 'Today’s minimum is complete.';
  showToast(message);
  showSystemNotification('SAT Vocab', message);
}

function updateDeckLabels() {
  document.getElementById('pdf-deck-count').textContent = `${pdfWords.length || 990} entries · from sat.vocab.pdf`;
  const personalDeck = activeDeckId === 'pdf' ? appState.personalDecks[appState.settings.lastPersonalDeck || MAIN_DECK_ID] || appState.personalDecks[MAIN_DECK_ID] : appState.personalDecks[activeDeckId];
  document.getElementById('personal-tab-name').textContent = personalDeck.name;
  document.getElementById('custom-deck-count').textContent = `${Object.keys(appState.personalDecks).length} decks · ${personalDeck.words.length} in current`;
}

function profileMetrics() {
  let reviews = 0;
  let mastered = 0;
  let correct = 0;
  let longestInterval = 0;
  const history = [];
  Object.values(appState.progress).forEach(progress => {
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
  const collectionCount = Object.keys(appState.personalDecks || {}).length;
  const rewardChecks = [
    [reviews >= 1, 25], [reviews >= 10, 50], [reviews >= 50 && retention >= 85, 250], [reviews >= 100, 300],
    [mastered >= 10, 200], [mastered >= 50, 800],
    [streak >= 3, 150], [streak >= 7, 400], [streak >= 30, 2000],
    [collectionCount >= 2, 200], [cleanRun >= 20, 500], [longestInterval >= 30, 1200]
  ];
  const achievementXp = rewardChecks.reduce((sum, [unlocked, reward]) => sum + (unlocked ? reward : 0), 0);
  const xp = reviews * 5 + mastered * 30 + streak * 50 + achievementXp;
  return { reviews, mastered, streak, retention, cleanRun, longestInterval, achievementXp, xp, level: Math.floor(xp / 500) + 1 };
}

function renderMainRoadmap() {
  const roadmap = document.getElementById('main-roadmap');
  if (!roadmap) return;
  const level = profileMetrics().level;
  const steps = [
    { level: 1, title: 'Wake Glyph' },
    { level: 3, title: 'Silver' },
    { level: 5, title: 'Jade' },
    { level: 8, title: 'Gold' },
    { level: 10, title: 'Emerald' },
    { level: 15, title: 'Obsidian' }
  ];
  const next = steps.find(step => step.level > level);
  document.getElementById('main-roadmap-next').textContent = next ? `Next: level ${next.level} · ${next.title}` : 'Final frame unlocked';
  roadmap.innerHTML = steps.map(step => `<div class="main-road-step ${level >= step.level ? 'done' : ''} ${next && next.level === step.level ? 'current' : ''}"><span>LVL ${step.level}</span><strong>${step.title}</strong></div>`).join('');
}

function renderProfile(populateForm = false) {
  if (!document.getElementById('profile-title')) return;
  const profile = appState.profile || emptyState().profile;
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
    { name: 'PDF vocabulary', words: pdfWords.length || 990, id: 'pdf' },
    ...Object.values(appState.personalDecks).map(deck => ({ name: deck.name, words: deck.words.length, id: deck.id }))
  ];
  document.getElementById('profile-collections').innerHTML = decks.map(deck => {
    const cards = ((appState.progress[deck.id] || {}).cards) || {};
    const learned = Object.values(cards).filter(record => isMasteredCard(record)).length;
    return `<article class="collection-item"><strong>${escapeHtml(deck.name)}</strong><span>${deck.words} words · ${learned} mastered</span></article>`;
  }).join('');
  if (typeof updateCloudProfilePreview === 'function') updateCloudProfilePreview(metrics);
}

function saveProfile(event) {
  event.preventDefault();
  const name = document.getElementById('profile-name').value.trim();
  if (name.length < 2) {
    showToast('Use at least 2 characters for your display name.');
    return;
  }
  appState.profile = {
    ...appState.profile,
    name,
    bio: document.getElementById('profile-bio').value.trim(),
    leaderboardOptIn: document.getElementById('leaderboard-opt-in').checked
  };
  saveAppState();
  renderProfile(true);
  if (typeof syncCloudNow === 'function') syncCloudNow();
  showToast('Profile saved.');
}

function applyRemoteCloudState(state) {
  appState = state;
  activeDeckId = appState.activeDeckId || MAIN_DECK_ID;
  localStorage.setItem(APP_KEY, JSON.stringify(appState));
  document.getElementById('daily-new').value = appState.settings.dailyNew;
  document.getElementById('daily-reviews').value = appState.settings.dailyReviews;
  document.getElementById('daily-goal').value = dailyGoal();
  renderReminders();
  switchDeck(activeDeckId);
}

function installApp() {
  if (!deferredInstallPrompt) {
    showToast('Use your browser menu and choose “Install app” or “Add to Home Screen”.');
    return;
  }
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => {
    deferredInstallPrompt = null;
    document.getElementById('install-app').classList.add('hidden');
  });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.getElementById('install-app').classList.remove('hidden');
});

function renderOnboardingStep() {
  document.querySelectorAll('[data-onboarding-step]').forEach(step => step.classList.toggle('active', Number(step.dataset.onboardingStep) === onboardingStep));
  document.querySelectorAll('[data-onboarding-marker]').forEach(marker => marker.classList.toggle('active', Number(marker.dataset.onboardingMarker) === onboardingStep));
  document.getElementById('onboarding-back').classList.toggle('hidden', onboardingStep === 1);
  const next = document.getElementById('onboarding-next');
  const nextCopy = {
    en: onboardingStep === 3 ? (diagnosticResults.length >= 15 ? 'Build my plan' : 'Answer the diagnostic') : 'Continue',
    ru: onboardingStep === 3 ? (diagnosticResults.length >= 15 ? 'Создать мой план' : 'Заверши диагностику') : 'Продолжить',
    kk: onboardingStep === 3 ? (diagnosticResults.length >= 15 ? 'Жоспарымды құру' : 'Диагностиканы аяқта') : 'Жалғастыру'
  };
  next.textContent = nextCopy[onboardingLocale] || nextCopy.en;
  next.disabled = onboardingStep === 3 && diagnosticResults.length < 15;
  if (onboardingStep === 3 && !diagnosticItems.length) startDiagnostic();
}

function moveOnboarding(direction) {
  if (direction < 0) {
    onboardingStep = Math.max(1, onboardingStep - 1);
    renderOnboardingStep();
    return;
  }
  if (onboardingStep === 1) {
    const selected = document.querySelector('#locale-choices .selected');
    onboardingLocale = selected ? selected.dataset.locale : 'en';
    onboardingStep = 2;
  } else if (onboardingStep === 2) {
    onboardingStep = 3;
  } else if (diagnosticResults.length >= 15) finishOnboarding();
  renderOnboardingStep();
}

function startDiagnostic() {
  diagnosticItems = shuffled(STARTER_WORDS.map((word, index) => ({ word, index }))).slice(0, 15);
  diagnosticIndex = 0;
  diagnosticResults = [];
  renderDiagnosticQuestion();
}

function renderDiagnosticQuestion() {
  if (diagnosticIndex >= diagnosticItems.length) {
    document.getElementById('diagnostic-progress').textContent = '15 / 15';
    document.getElementById('diagnostic-word').textContent = `${diagnosticResults.filter(result => result.correct).length} already strong`;
    document.getElementById('diagnostic-options').innerHTML = '<p class="side-copy">Your first study plan is ready.</p>';
    renderOnboardingStep();
    return;
  }
  const current = diagnosticItems[diagnosticIndex];
  document.getElementById('diagnostic-progress').textContent = `${diagnosticIndex + 1} / ${diagnosticItems.length}`;
  document.getElementById('diagnostic-word').textContent = current.word[0];
  const distractors = shuffled(STARTER_WORDS.filter(word => word[0] !== current.word[0])).slice(0, 3);
  const options = shuffled([current.word, ...distractors]);
  document.getElementById('diagnostic-options').innerHTML = options.map(option => `<button type="button" onclick="answerDiagnostic('${option[0].replace(/'/g,"\\'")}')">${escapeHtml(option[2])}</button>`).join('');
}

function answerDiagnostic(answer) {
  if (diagnosticIndex >= diagnosticItems.length) return;
  const current = diagnosticItems[diagnosticIndex];
  diagnosticResults.push({ index: current.index, correct: answer === current.word[0] });
  diagnosticIndex += 1;
  renderDiagnosticQuestion();
}

function finishOnboarding() {
  const today = localDateKey();
  const cards = appState.progress[MAIN_DECK_ID].cards;
  diagnosticResults.filter(result => result.correct).forEach(result => {
    cards[result.index] = { interval:7,due:addDaysKey(today,7),reviews:1,correct:1,lapses:0,lastRating:'easy',lastReview:new Date().toISOString(),history:[{at:new Date().toISOString(),rating:'easy',source:'diagnostic'}],stability:7,difficulty:4 };
  });
  const languageNames = { en:'Russian', ru:'Russian', kk:'Kazakh' };
  appState.settings.locale = onboardingLocale;
  appState.settings.satDate = document.getElementById('onboarding-sat-date').value;
  appState.settings.dailyGoal = Math.min(100, Math.max(5, Number(document.getElementById('onboarding-daily-goal').value || 20)));
  appState.settings.onboardingComplete = true;
  appState.profile.translationLanguage = languageNames[onboardingLocale];
  saveAppState();
  document.getElementById('onboarding-dialog').close();
  applyLocale();
  queue = shuffled(dailyPlanIndices().plan);
  renderAll();
  showToast('Your first SAT plan is ready.');
}

document.addEventListener('keydown', event => {
  if (mode !== 'flash' || ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(event.target.tagName)) return;
  if (event.key === '1') rateCard('again');
  if (event.key === '2') rateCard('hard');
  if (event.key === '3') rateCard('know');
  if (event.key === '4') rateCard('easy');
});

async function initializeApp() {
  applyLocale();
  document.getElementById('today-label').textContent = `${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date())} · today’s session`;
  document.getElementById('daily-new').value = appState.settings.dailyNew;
  document.getElementById('daily-reviews').value = appState.settings.dailyReviews;
  document.getElementById('daily-goal').value = dailyGoal();
  renderReminders();
  renderProfile(true);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => showToast('Offline mode could not be registered.'));
  try {
    const loadedWords = await loadBundledPdfWords();
    pdfWords = Array.isArray(loadedWords) ? loadedWords : [];
  } catch {
    pdfWords = [];
  }
  if (window.RU_PDF) {
    pdfWords.forEach(row => {
      if (!row[4] && window.RU_PDF[row[0]]) row[4] = window.RU_PDF[row[0]];
    });
  }
  if (!appState.personalDecks[activeDeckId] && activeDeckId !== 'pdf') activeDeckId = MAIN_DECK_ID;
  renderPersonalDeckSelect();
  updateDeckLabels();
  switchDeck(activeDeckId === 'pdf' && !pdfWords.length ? MAIN_DECK_ID : activeDeckId);
  applyWorkspaceView();
  renderAll();
  renderProfile(true);
  checkReminder();
  setInterval(checkReminder, 30000);
  if (typeof initializeCloudSync === 'function') initializeCloudSync();
  document.querySelectorAll('#locale-choices [data-locale]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('#locale-choices [data-locale]').forEach(option => option.classList.toggle('selected', option === button));
    onboardingLocale = button.dataset.locale;
    applyLocale(onboardingLocale);
  }));
  const defaultSatDate = new Date();
  defaultSatDate.setDate(defaultSatDate.getDate() + 90);
  document.getElementById('onboarding-sat-date').min = localDateKey();
  document.getElementById('onboarding-sat-date').value = appState.settings.satDate || localDateKey(defaultSatDate);
  document.getElementById('dictionary-query').addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      findDictionaryWords();
    }
  });
  if (!appState.settings.onboardingComplete) setTimeout(() => document.getElementById('onboarding-dialog').showModal(), 0);
}

initializeApp();
