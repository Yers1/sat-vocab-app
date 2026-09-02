# SAT Vocab - focused recall trainer

A focused SAT vocabulary app with a complete PDF-derived reference deck, independent personal decks, adaptive spaced repetition, and offline support. No frameworks or build step required.

The current release has a Quizlet-style Learn mode, a resumable study stack, friend groups with a shared leaderboard, EN/RU/KK onboarding with an optional 15-word diagnostic, Russian glosses for every bundled word, a 75-new-words-a-day target, memory-stability scheduling, and quality-based achievements. Progress is stored locally and, with an account, synced across devices.

![SAT Vocab Trainer](https://img.shields.io/badge/SAT-1000%20words-e8c547?style=flat-square) ![HTML](https://img.shields.io/badge/built%20with-HTML%2FJS-e8c547?style=flat-square) ![No dependencies](https://img.shields.io/badge/dependencies-none-4caf72?style=flat-square)

## Features

- **Separate libraries** - 990 entries extracted from `sat.vocab.pdf`, each with a Russian gloss, plus as many independent personal decks as you need
- **Quizlet-style Learn mode** - flip a card, sort it into *Still learning* or *Know*, finish the round, then re-study the still-learning pile until it is empty; a split progress bar tracks both piles
- **Resumable stack** - closing the tab, opening the Profile page, or switching decks and coming back drops you on the exact card you stopped on
- **Instant workspace navigation** - Study, Library, Progress, and Groups switch in place without reloading the app or vocabulary data
- **Adaptive SRS underneath** - each sort updates the card's difficulty, stability, due date, and interval; already-known words are cycled back in for reinforcement
- **75 new words a day** - the default target, with a *N / 75 new words today* bar and a streak that counts the day once you hit it
- **Daily plan** - reviews first, then new words, with an honest stopping point
- **Friend groups** - create a group, share the code, friends join in one tap with no signup, and a shared leaderboard ranks everyone by XP, new words today, streak, and mastered count
- **Study modes** - Quizlet flashcards, typed recall with hints, sentence context, multiple choice tests, and analytics
- **Focused recovery** - launch sessions containing only recent mistakes or weak words
- **One-field word entry** - type only an English word; SAT data fills instantly offline, while unknown words use the free dictionary and offer a meaning picker before saving
- **Personal word tools** - create, rename, and delete decks; edit every auto-filled field, add an optional translation, or import TXT, CSV, TSV, and JSON
- **Analytics** - retention, due/mastered totals, hardest words, and a seven-day workload forecast
- **SAT pace plan** - set an exam date and see days left, words remaining, daily pace, weekly target, and deck completion
- **Library control** - search and filter words, edit entries, select many words, reset schedules, delete safely, and preview imports before saving
- **Dictionary search without AI** - paste up to 30 words, match the bundled SAT catalog first, use the free English Dictionary API for missing entries, choose meanings, and add selected results to any personal deck
- **Daily discipline** - GitHub-style 91-day activity heatmap, five-review daily minimum, and streak tracking
- **Backup and transfer** - export or share every deck, schedule, streak, and setting, then import it on another device
- **Installable PWA** - install from a supported browser and keep studying after the core app has been cached
- **Multiple reminders** - add up to eight daily times, remove them independently, and test browser notifications
- **Separate learner profile page** - the Profile button opens a dedicated tab with GitHub-style identity, XP, level, review totals, streak, collections, and an opt-in leaderboard
- **Gamification** - animated XP frames and stat counters, the non-animal Glyph mascot, 12 permanent achievement relics with bonus XP, unlockable skins, a one-year contribution map, and synced Roadmaps on study and profile pages
- **Profile images** - choose initials, the app logo, Glyph, or upload a custom photo that is resized locally
- **Card state at a glance** - every card is tagged New, Learning, or Review with a count of how many times you have seen it
- **Retry-first typing** - wrong typed answers can be attempted repeatedly; Show answer appears only after the first miss
- **Randomized study order** - cards are shuffled instead of following the source list
- **Pronunciation and keyboard controls** - browser speech on both sides of the card, plus Space to flip and the arrow keys (or 1 / 2) to sort

## Live Demo

Production: https://sat-vocab-app-eosin.vercel.app

For local use, open `index.html` in a modern browser or serve the folder with any static server. Keep all repository files together.

Or deploy for free on GitHub Pages:

1. Fork this repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your app will be live at `https://<your-username>.github.io/sat-vocab-app`

## Usage

```bash
git clone https://github.com/Yers1/sat-vocab-app
cd sat-vocab-app
open index.html   # macOS
# or just drag index.html into your browser
```

## How It Works

### Learn mode
- Tap a card or press Space to reveal the definition, its Russian gloss, and an example sentence with the target word underlined
- Sort each card with **Still learning** or **Know** (arrow keys or 1 / 2); the buttons stay disabled until the answer is revealed
- The `‹ ›` arrows move through the round's remaining cards without sorting
- When the round ends, keep reviewing the still-learning pile or restart the set; "Know" cards leave the round but still return later for spaced review
- The session is saved continuously, so you can leave and resume mid-stack
- Switch between PDF vocabulary and My words without mixing progress

### Type and Context modes
- Type the English word from its definition; reveal first-letter, length, and translation hints only when needed
- Restore missing words inside real example sentences using four answer choices

### Test mode
- Up to 30 randomly selected words per session
- 4 multiple choice options per question
- Green = correct, Red = wrong
- Wrong answers return to the active deck's learning queue

### Import format

For TXT, CSV, and TSV, use one row per word:

```text
word | English definition | translation in your language | example sentence
```

JSON may contain arrays in the app's five-field format or objects with `word`, `definition`, `translation`, `example`, and optional `partOfSpeech` fields.

## Stack

- Pure HTML + CSS + Vanilla JS
- Zero dependencies
- Static PWA files with no server runtime
- Offline shell caching through a service worker

## Optional cloud sync

The app works fully offline with no account. Friend groups, cross-device sync, and email accounts use Supabase and stay disabled until a project is connected.

1. Create a Supabase project and run `supabase-schema.sql` in its SQL editor.
2. In **Authentication → Sign In / Providers → Email**, turn on **Anonymous sign-ins** (so friends can join a group by link with no signup) and turn off **Confirm email** if you want instant email registration.
3. Put the project URL and publishable key in `cloud-config.js`, then commit and deploy.

Once connected, the Groups tab lets anyone create or join a group, and the Account block accepts email + password sign-up. The publishable key is safe to ship to the browser: Row Level Security in `supabase-schema.sql` keeps each person's vocabulary state private, and the group leaderboard is gated by the invite code.

## Word List

The PDF tab contains all 990 unique headword entries found in the supplied 70-page *The 1000 Most Common SAT Words* reference, covering A-Z with part of speech, definition, and example sentence.

## Contributing

Pull requests are welcome.


