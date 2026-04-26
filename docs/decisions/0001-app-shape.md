# ADR 0001: App shape and entry gating

## Status
Accepted

## Decision
Use a small Next.js application with a token-gated entry route at `/c/[token]`.

## Why
- Token validation belongs on the server.
- UI and API can live in one repo and one local process.
- The app needs a custom first-run experience rather than a generic chat shell.
- Cloud inference keeps setup light while leaving room to swap providers later.

## Consequences
- Server-side utilities and route handlers become core project seams.
- Token lifecycle needs scripts and a persistence layer.
- The chat UI should assume authenticated session context, not open access.
