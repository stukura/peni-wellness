# Typing Speed Game — Build Prompt

Build a single-file `typing-game.html` (HTML + CSS + JS, no external dependencies) that measures typing speed. Share-ready, polished, works offline.

## Core gameplay
- On load, show a start screen with a "Start" button and a difficulty selector: Easy (common short words), Medium (mixed sentences), Hard (punctuation + long words).
- When started, display a passage of ~50 words drawn from a built-in word/sentence bank. The current character to type is highlighted; already-typed characters turn green if correct, red if incorrect.
- A hidden input (or a focused text field) captures keystrokes. Do not advance past an incorrect character — the user must correct it.
- A 60-second countdown timer begins on the first keystroke. When it hits zero, the run ends.
- Users can also click "Finish early" to end on the current word.

## Metrics to compute and display at end
- **WPM** = (correct characters / 5) / (elapsed minutes)
- **Accuracy** = correct keystrokes / total keystrokes × 100%
- **Raw WPM** (ignoring errors) and **Net WPM** (penalized by errors)
- Total characters typed, errors made, time elapsed

## Share feature (important)
- After a run, generate a shareable result. Two options, implement both:
  1. A "Copy result" button that copies a text summary to clipboard: `I typed X WPM with Y% accuracy on [difficulty] — beat me at <URL>`.
  2. A "Share link" button that encodes the score into the URL hash (e.g. `#score=wpm:72,acc:96,diff:medium`) so when a friend opens the link they see "Your friend scored 72 WPM — can you beat them?" as a challenge banner above the start screen.

## Polish
- Modern, clean design: large readable monospace font for the passage, soft color palette, responsive layout (works on mobile + desktop).
- Store personal best in `localStorage` and show it on the start screen.
- Subtle animations: timer pulse in last 10 seconds, result card fades in.
- Keyboard shortcut: `Tab` or `Esc` → restart.

## Constraints
- One HTML file, no build step, no CDN dependencies. All JS/CSS inline.
- No tracking, no external calls.
- Code should be readable — small functions, clear names.
