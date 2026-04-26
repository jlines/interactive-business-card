# ADR 0002: Context sources live in-repo

## Status
Accepted

## Decision
Store the business-card assistant's grounding context in versioned markdown files under `context/`.

## Why
- Easy to inspect and edit
- Works before any CMS or admin UI exists
- Keeps prompt changes tied to code history

## Consequences
- Prompt assembly must load and combine markdown files predictably.
- Changes to positioning or tone should be committed like code.
