# Smart Resume Analyzer (ATS Score Checker)

A client-side tool that scores how well a resume matches a job description — the same way an Applicant Tracking System (ATS) would — and gives actionable feedback to improve it.

## Problem Statement
Many qualified candidates get filtered out by ATS software before a human recruiter ever sees their resume, usually because the resume doesn't contain the keywords the job description expects. This tool lets a user check and fix that in seconds.

## Tech Stack
- **HTML5** — semantic structure, accessible forms, `<details>` for collapsible panels
- **CSS3** — custom properties (theming/dark mode), CSS Grid & Flexbox, SVG-based animated gauge, keyframe animations, responsive media queries
- **JavaScript (Vanilla, ES6+)** — DOM manipulation, async/await, string tokenization, Set operations, the Flesch Reading Ease formula, Blob/File download API, localStorage persistence

## Features
- Keyword match scoring between resume and job description
- Animated dial gauge showing match score with color-coded verdict
- Matched vs. missing keyword breakdown (highlighter / red-pen visual style)
- Readability scoring (Flesch Reading Ease formula)
- Dynamic, rule-based suggestions
- Scan history saved locally (persists across browser sessions via `localStorage`)
- Downloadable plain-text report
- Dark/light theme toggle
- Fully responsive, keyboard-accessible layout

## How the Scoring Works
1. Both texts are lowercased and tokenized into words.
2. Common stop-words (the, and, of, etc.) are removed.
3. The job description's most frequent remaining words become the "target keywords" (capped at 30).
4. The match score = (keywords also found in the resume) ÷ (total target keywords) × 100.
5. Readability is calculated with the Flesch Reading Ease formula using sentence length and syllable counts.

## Files
| File | Purpose |
|---|---|
| `index.html` | Page structure and content |
| `style.css` | All styling, theming, and animations |
| `script.js` | Analysis logic, DOM rendering, and storage |

## Running It
Just open `index.html` in any modern browser — no build step, no server, no dependencies beyond an internet connection for the Google Fonts import (it gracefully falls back to system fonts if offline).

## Possible Future Improvements
- Bigram/phrase matching (e.g. "project management") instead of single words
- PDF resume upload with text extraction
- Weighted keyword importance based on job title/section (skills vs. responsibilities)
