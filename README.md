# SAT Vocab - focused recall trainer

A focused SAT vocabulary app with a complete PDF-derived reference deck, independent personal decks, adaptive spaced repetition, and offline support. No frameworks or build step required.

![SAT Vocab Trainer](https://img.shields.io/badge/SAT-1000%20words-e8c547?style=flat-square) ![HTML](https://img.shields.io/badge/built%20with-HTML%2FJS-e8c547?style=flat-square) ![No dependencies](https://img.shields.io/badge/dependencies-none-4caf72?style=flat-square)

## Features

- **Separate libraries** - 990 entries extracted from `sat.vocab.pdf`, plus as many independent personal decks as you need
- **Adaptive SRS** - Again, Hard, and Know ratings schedule every card with its own due date and interval
- **Daily plan** - a short mix of due reviews and new words with an honest stopping point
- **Adjustable workload** - choose daily new words, due reviews, and streak target; continue with 20 more cards or the full deck at any time
- **Five study modes** - flashcards, typed recall with hints, sentence context, multiple choice tests, and analytics
- **Focused recovery** - launch sessions containing only recent mistakes or weak words
- **Personal word tools** - create, rename, and delete decks; add words manually or import TXT, CSV, TSV, and JSON
- **Analytics** - retention, due/mastered totals, hardest words, and a seven-day workload forecast
- **Daily discipline** - GitHub-style 91-day activity heatmap, five-review daily minimum, and streak tracking
- **Backup and transfer** - export or share every deck, schedule, streak, and setting, then import it on another device
- **Installable PWA** - install from a supported browser and keep studying after the core app has been cached
- **Multiple reminders** - add up to eight daily times, remove them independently, and test browser notifications
- **Separate learner profile page** - the Profile button opens a dedicated tab with GitHub-style identity, XP, level, review totals, streak, collections, and an opt-in leaderboard
- **Gamification** - animated XP frames and stat counters, the non-animal Glyph mascot, 12 permanent achievement relics with bonus XP, unlockable skins, a one-year contribution map, and synced Roadmaps on study and profile pages
- **Profile images** - choose initials, the app logo, Glyph, or upload a custom photo that is resized locally
- **Visible review history** - Again, Hard, and Know ratings show their next interval immediately and remain available in Stats
- **Retry-first typing** - wrong typed answers can be attempted repeatedly; Show answer appears only after the first miss
- **Randomized study order** - new cards are shuffled instead of following the source list
- **Pronunciation and keyboard controls** - browser speech plus Space, 1, 2, and 3 shortcuts

## Live Demo

Production: https://sat-vocab-app-eosin.vercel.app

For local use, open `index.html` in a modern browser or serve the folder with any static server. Keep all repository files together.

Or deploy for free on GitHub Pages:

1. Fork this repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your app will be live at `https://Yers1.io/sat-vocab-app`

## Usage

```bash
git clone https://github.com/Yers1/sat-vocab-app
cd sat-vocab-app
open index.html   # macOS
# or just drag index.html into your browser
```

## How It Works

### Learn mode
- Tap a card or press Space to reveal the definition, Russian translation when available, and example
- Choose **Again**, **Hard**, or **Know it**; ratings stay disabled until the answer is revealed
- Again and Hard cards return automatically; Know it marks the word mastered
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
word | English definition | Russian translation | example sentence
```

JSON may contain arrays in the app's five-field format or objects with `word`, `definition`, `translation`, `example`, and optional `partOfSpeech` fields.

## Stack

- Pure HTML + CSS + Vanilla JS
- Zero dependencies
- Static PWA files with no server runtime
- Offline shell caching through a service worker

## Optional cloud sync

The app works locally without an account. Cross-device sync, email login, and the shared leaderboard use Supabase and stay disabled until a project is connected.

1. Create a Supabase project and run `supabase-schema.sql` in its SQL editor.
2. Add `https://sat-vocab-app-eosin.vercel.app` to the allowed Auth redirect URLs.
3. Put the project URL and publishable key in `cloud-config.js`.
4. Commit and deploy. Users can then request a magic login link from the Profile section.

The publishable key is safe to ship to the browser. Row Level Security from `supabase-schema.sql` ensures users can only read and write their own vocabulary state; only opted-in profile statistics are public.

## Word List

The PDF tab contains all 990 unique headword entries found in the supplied 70-page *The 1000 Most Common SAT Words* reference, covering A-Z with part of speech, definition, and example sentence.

## Contributing

Pull requests are welcome.


