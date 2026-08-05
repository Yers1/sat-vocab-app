# SAT Vocab - focused recall trainer

A focused SAT vocabulary app with a complete PDF-derived reference deck and a separate personal deck. No frameworks or build step required.

![SAT Vocab Trainer](https://img.shields.io/badge/SAT-1000%20words-e8c547?style=flat-square) ![HTML](https://img.shields.io/badge/built%20with-HTML%2FJS-e8c547?style=flat-square) ![No dependencies](https://img.shields.io/badge/dependencies-none-4caf72?style=flat-square)

## Features

- **Two separate decks** - 990 entries extracted from `sat.vocab.pdf`, plus a personal deck that starts with 30 curated difficult words
- **Active recall loop** - rate each reveal as Again, Hard, or Know; missed words return to the queue
- **Persistent mastery** - independent progress for each deck is stored locally in the browser
- **30-question test** - wrong answers move back into the learning queue
- **Personal word tools** - add words manually or import TXT, CSV, TSV, and JSON files
- **Daily discipline** - GitHub-style 91-day activity heatmap, five-review daily minimum, and streak tracking
- **Reminders** - optional browser notification at a chosen time while the site is open
- **Pronunciation and keyboard controls** - browser speech plus Space, 1, 2, and 3 shortcuts

## Live Demo

Open `index.html` in a modern browser, or serve the folder with any static server. Keep `index.html` and `pdf-words.js` together.

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
- Two static files (`index.html` and the compressed `pdf-words.js` deck)
- Works offline

## Word List

The PDF tab contains all 990 unique headword entries found in the supplied 70-page *The 1000 Most Common SAT Words* reference, covering A-Z with part of speech, definition, and example sentence.

## Contributing

Pull requests welcome. Ideas:
- Spaced repetition algorithm
- Local storage to persist progress between sessions
- Filter by letter or difficulty
- Typing mode (type the word from the definition)


