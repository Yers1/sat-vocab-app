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
  activity: {},
  settings: { reminders: [], dailyNew: 20, dailyReviews: 30, dailyGoal: DEFAULT_DAILY_GOAL, recoveryDays: 1, goalsConfigured: true },
  profile: { name: 'SAT learner', bio: 'Building a stronger SAT vocabulary, one honest review at a time.', leaderboardOptIn: false },
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
      personalDecks: { ...base.personalDecks, ...(saved.personalDecks || {}) },
      progress: { ...base.progress, ...(saved.progress || {}) },
      settings: {
        ...base.settings,
        ...savedSettings,
        dailyNew: hasNewGoalSettings ? Number(savedSettings.dailyNew || 20) : 20,
        dailyReviews: hasNewGoalSettings ? Number(savedSettings.dailyReviews || 30) : 30,
        dailyGoal: hasNewGoalSettings ? Number(savedSettings.dailyGoal || DEFAULT_DAILY_GOAL) : DEFAULT_DAILY_GOAL,
        reminders,
        goalsConfigured: true
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
  return { interval: 0, due: localDateKey(), reviews: 0, correct: 0, lapses: 0, lastRating: 'new', lastReview: '', history: [] };
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
  if (rating === 'again') {
    record.interval = 0;
    record.due = today;
    record.lapses += 1;
  } else if (rating === 'hard') {
    record.interval = record.interval < 1 ? 1 : Math.max(1, Math.round(record.interval * 1.3));
    record.due = addDaysKey(today, record.interval);
  } else {
    record.correct += 1;
    record.interval = record.interval < 1 ? 1 : record.interval < 3 ? 3 : record.interval < 7 ? 7 : Math.min(180, Math.round(record.interval * 2.15));
    record.due = addDaysKey(today, record.interval);
  }
  record.history = Array.isArray(record.history) ? record.history : [];
  record.history.push({ at: record.lastReview, rating, source, ...metadata });
  record.history = record.history.slice(-24);
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
  queue = shuffled(plan.plan);
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
  const labels = { again: 'Again', hard: 'Hard', know: 'Know it' };
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
  document.getElementById('flash-ru').textContent = word[4] || 'No Russian translation saved';
  document.getElementById('flash-ex').textContent = word[3] || `Write a sentence using “${word[0]}”.`;
  flipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  document.querySelectorAll('#rating-actions button').forEach(button => button.disabled = true);
}

function showLearningComplete() {
  document.getElementById('flash-word').textContent = 'Done';
  document.getElementById('flash-pos').textContent = `${sessionKind} session complete`;
  document.getElementById('flash-def').textContent = 'The current set is complete — your study is not limited.';
  document.getElementById('flash-ru').textContent = 'Текущий набор закончен, но можно сразу продолжить ещё 20 слов или пройти всю колоду.';
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
  document.getElementById('plan-title').textContent = plan.length ? `${plan.length} cards · about ${minutes} min` : 'Scheduled work complete';
  document.getElementById('plan-copy').textContent = plan.length
    ? `${Math.min(due.length, appState.settings.dailyReviews)} reviews due + ${Math.min(fresh.length, appState.settings.dailyNew)} new. This is a target, not a limit — continue whenever you want.`
    : 'The planned set is complete. Continue with +20 more, Study all, Type, or Context.';
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

function calculateStreak() {
  let streak = 0;
  let recoveryUsed = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if ((appState.activity[localDateKey(cursor)] || 0) < dailyGoal()) cursor.setDate(cursor.getDate() - 1);
  for (let days = 0; days < 365; days += 1) {
    const count = appState.activity[localDateKey(cursor)] || 0;
    if (count >= dailyGoal()) streak += 1;
    else if (recoveryUsed < appState.settings.recoveryDays && streak > 0) recoveryUsed += 1;
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, recoveryUsed };
}

function renderActivity() {
  const cells = [];
  for (let offset = 90; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date);
    const count = appState.activity[key] || 0;
    const level = count >= 25 ? 4 : count >= 15 ? 3 : count >= 5 ? 2 : count > 0 ? 1 : 0;
    cells.push(`<span class="heat-cell ${level ? `l${level}` : ''}" title="${key}: ${count} reviews"></span>`);
  }
  document.getElementById('heatmap').innerHTML = cells.join('');
  const { streak, recoveryUsed } = calculateStreak();
  document.getElementById('streak-count').textContent = `${streak} day${streak === 1 ? '' : 's'}`;
  const todayCount = appState.activity[localDateKey()] || 0;
  const goal = dailyGoal();
  document.getElementById('streak-rule').textContent = `A day counts after ${goal} honest review${goal === 1 ? '' : 's'}. The target is adjustable.`;
  document.getElementById('commitment-copy').textContent = todayCount >= goal
    ? `Daily minimum complete: ${todayCount} reviews. Continue only while your focus is good.`
    : `${goal - todayCount} honest review${goal - todayCount === 1 ? '' : 's'} left today. ${recoveryUsed ? 'Your recovery day is currently protecting the streak.' : 'One recovery day is available.'}`;
}

function saveStudySettings() {
  appState.settings.dailyNew = Math.min(200, Math.max(1, Number(document.getElementById('daily-new').value || 20)));
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
  const today = localDateKey();
  const due = records.filter(item => item.record.due <= today).length;
  const mastered = records.filter(item => isMasteredCard(item.record)).length;
  const tomorrow = records.filter(item => item.record.due === addDaysKey(today, 1)).length;
  document.getElementById('metric-retention').textContent = `${retention}%`;
  document.getElementById('metric-due').textContent = due;
  document.getElementById('metric-mastered').textContent = mastered;
  document.getElementById('metric-tomorrow').textContent = tomorrow;

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
}

function renderAll() {
  renderDailyPlan();
  renderProgress();
  renderActivity();
  renderFocusedCounts();
  renderProfile();
  if (mode === 'analytics') renderAnalytics();
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

function addCustomWord(event) {
  event.preventDefault();
  if (activeDeckId === 'pdf') return;
  const deck = appState.personalDecks[activeDeckId];
  const word = document.getElementById('new-word').value.trim();
  const part = document.getElementById('new-pos').value.trim() || '—';
  const definition = document.getElementById('new-definition').value.trim();
  const translation = document.getElementById('new-translation').value.trim();
  const example = document.getElementById('new-example').value.trim() || `Write a sentence using “${word}”.`;
  if (deck.words.some(item => normalizeWord(item[0]) === normalizeWord(word))) {
    showToast('This word is already in the selected deck.');
    return;
  }
  deck.words.push([word, part, definition, example, translation]);
  saveAppState();
  event.target.reset();
  renderAll();
  updateDeckLabels();
  renderPersonalDeckSelect();
  showToast(`${word} added to “${deck.name}”.`);
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
      const deck = appState.personalDecks[activeDeckId];
      const imported = parseImportedWords(String(reader.result), extension).filter(item => item[0] && item[2]);
      const existing = new Set(deck.words.map(item => normalizeWord(item[0])));
      const unique = imported.filter(item => !existing.has(normalizeWord(item[0])));
      deck.words.push(...unique);
      saveAppState();
      renderAll();
      updateDeckLabels();
      renderPersonalDeckSelect();
      showToast(`${unique.length} words imported. ${imported.length - unique.length} duplicates skipped.`);
    } catch (error) {
      showToast(`Could not import file: ${error.message}`);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
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
  if (armedAction === action) {
    armedAction = '';
    clearTimeout(armedActionTimer);
    if (buttonId) document.getElementById(buttonId).textContent = action.startsWith('delete-') ? 'Delete' : 'Reset progress';
    return true;
  }
  armedAction = action;
  showToast(message);
  if (buttonId && armedLabel) document.getElementById(buttonId).textContent = armedLabel;
  clearTimeout(armedActionTimer);
  armedActionTimer = setTimeout(() => {
    armedAction = '';
    if (buttonId) document.getElementById(buttonId).textContent = action.startsWith('delete-') ? 'Delete' : 'Reset progress';
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
  Object.entries(appState.progress).forEach(([deckId, progress]) => {
    Object.values((progress && progress.cards) || {}).forEach(record => {
      reviews += Number(record.reviews || 0);
      if (isMasteredCard(record)) mastered += 1;
    });
  });
  const { streak } = calculateStreak();
  const xp = reviews * 5 + mastered * 30 + streak * 50;
  return { reviews, mastered, streak, xp, level: Math.floor(xp / 500) + 1 };
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

document.addEventListener('keydown', event => {
  if (mode !== 'flash' || ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(event.target.tagName)) return;
  if (event.key === '1') rateCard('again');
  if (event.key === '2') rateCard('hard');
  if (event.key === '3') rateCard('know');
});

async function initializeApp() {
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
  if (!appState.personalDecks[activeDeckId] && activeDeckId !== 'pdf') activeDeckId = MAIN_DECK_ID;
  renderPersonalDeckSelect();
  updateDeckLabels();
  switchDeck(activeDeckId === 'pdf' && !pdfWords.length ? MAIN_DECK_ID : activeDeckId);
  renderAll();
  renderProfile(true);
  checkReminder();
  setInterval(checkReminder, 30000);
  if (typeof initializeCloudSync === 'function') initializeCloudSync();
}

initializeApp();
