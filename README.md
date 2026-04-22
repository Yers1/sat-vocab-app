# SAT Vocab Trainer

A clean, dark-themed flashcard app to study the 1000 most common SAT vocabulary words — no frameworks, no dependencies, just a single HTML file.

![SAT Vocab Trainer](https://img.shields.io/badge/SAT-1000%20words-e8c547?style=flat-square) ![HTML](https://img.shields.io/badge/built%20with-HTML%2FJS-e8c547?style=flat-square) ![No dependencies](https://img.shields.io/badge/dependencies-none-4caf72?style=flat-square)

## Features

- **Flashcard mode** - flip cards to reveal definitions and example sentences, mark words as Known or Skip
- **Quiz mode** - 20 random words per round, choose the correct definition from 4 options
- **Progress tracking** - see how many words you've marked as known vs skipped
- **Shuffle** - randomize card order for varied practice
- **Score feedback** - end-of-quiz results with a motivational message
- 1000 SAT words with definitions and real example sentences

## Live Demo

Open `index.html` in any browser — no server required.

Or deploy for free on GitHub Pages:

1. Fork this repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your app will be live at `https://yourusername.github.io/sat-vocab-app`

## Usage

```bash
git clone https://github.com/yourusername/sat-vocab-app.git
cd sat-vocab-app
open index.html   # macOS
# or just drag index.html into your browser
```

## How It Works

### Flashcard Mode
- Tap a card to flip it and see the definition + example sentence
- **Know** - marks the word as learned and advances
- **Skip** - marks as skipped and advances
- **Next** - advances without marking
- Progress bar shows how far through the deck you are

### Quiz Mode
- 20 randomly selected words per session
- 4 multiple choice options per question
- Green = correct, Red = wrong
- Auto-advances after 1 second
- Final score shown with percentage

## Stack

- Pure HTML + CSS + Vanilla JS
- Zero dependencies
- Single file (`index.html`)
- Works offline

## Word List

All 1000 words sourced from the *SAT Vocabulary: The 1000 Most Common SAT Words* reference list, covering letters A–Z with part of speech, definition, and example sentence for each word.

## Contributing

Pull requests welcome. Ideas:
- Spaced repetition algorithm
- Local storage to persist progress between sessions
- Filter by letter or difficulty
- Typing mode (type the word from the definition)


