# Subagent Prompt: Durable Scaffold Pass

Use this prompt with a coding subagent working inside:
`/home/jason/dev/interactive-business-card`

---

You are working on a local-first project called **interactive-business-card**.

Your job is **not** to finish the app. Your job is to strengthen the scaffold so later agents can build on it cleanly over the full lifecycle of the project.

## Product shape
This is a **private interactive business card** for Jason's contracting services.

Core behavior:
- A QR code points to `/c/[token]`
- The token is required
- Invalid, missing, expired, or revoked tokens must fail closed
- A valid token opens a personalized chat experience
- The chat is grounded in Jason's contracting-services context
- Inference should support **cloud providers first**, with a clean seam for **OpenRouter** and possible later **AWS Bedrock** support
- The app is **not public open chat** and should never behave like a generic public assistant

## Important design intent
Treat this pass as **scaffolding that must survive the entire project lifecycle**.
That means:
- prefer durable module boundaries over quick hacks
- encode architectural intent in code structure, docstrings, types, and docs
- create seams that make later implementation obvious
- do not overbuild features that are still speculative
- do not add generic abstractions with no immediate use
- keep the project small, but make the important edges explicit

## What to focus on
Focus on expressing the project's core ideas through:
1. file structure
2. docstrings
3. type definitions
4. interface boundaries
5. route and module stubs
6. small architecture docs and ADRs

Do **not** spend most of your effort on styling, polished UI, or broad feature work.

## Your objectives

### 1) Inspect the existing scaffold first
Read the repo and understand what already exists before editing.
Pay special attention to:
- `src/app/c/[token]/page.tsx`
- `src/app/api/session/route.ts`
- `src/app/api/chat/route.ts`
- `src/lib/auth/token.ts`
- `src/lib/ai/client.ts`
- `src/lib/ai/prompt.ts`
- `src/lib/context/loaders.ts`
- `src/lib/db/schema.ts`
- `src/lib/session/opening.ts`
- `context/*.md`
- `docs/architecture.md`
- `docs/decisions/*`

### 2) Strengthen the long-lived architecture
Improve the scaffold so the following concepts are clearly represented in code:
- **token gate**
- **token record / metadata**
- **token validation result**
- **personalized opening context**
- **chat session state**
- **provider-agnostic inference interface**
- **prompt assembly pipeline**
- **business context loading**
- **fail-closed access enforcement**

If a concept is currently blurred, split it into better-named types or modules.

### 3) Make later implementation easier
Where helpful, add:
- precise TypeScript types
- function signatures with strong names
- docstrings describing responsibilities and invariants
- TODO markers only when they communicate a real next implementation step
- lightweight placeholder return values only where necessary to keep the scaffold coherent

The code should read like a map for the next agent.

### 4) Keep provider strategy explicit
We are leaning toward **OpenRouter first**, but want room for **Bedrock** later.
Reflect that in code by creating a small durable seam, for example:
- provider config type
- model config type
- inference client interface
- one OpenRouter-oriented implementation path or stub
- explicit note that Bedrock is a later adapter, not today's complexity

Do not build a huge provider framework.

### 5) Keep persistence simple but intentional
Assume a small local persistence layer for token metadata and sessions.
If the repo currently uses SQLite-oriented seams, keep that shape unless you find a strong reason not to.
Express the important records and relationships in types/schema comments, even if the DB implementation remains partial.

### 6) Strengthen docs
Update or add lightweight docs so a later implementer can quickly answer:
- what this app is
- what is protected by the token gate
- what happens on valid vs invalid token access
- how personalization enters the prompt
- where provider integration belongs
- what the next implementation phases are

Prefer short, high-signal docs.

## Constraints
- Stay within the existing project and its intended stack unless the scaffold is clearly wrong
- Prefer **Next.js + TypeScript** conventions already present
- No auth system beyond the QR-token gate
- No vector database
- No generic agent framework
- No public access mode
- No fake implementation that hides unresolved decisions
- No broad dependency churn unless required by the scaffold itself

## Deliverables
By the end of this pass, I want:
1. a stronger repo scaffold
2. clearer code/docstring expression of the architecture
3. any missing durable types/interfaces added
4. updated docs/ADRs where needed
5. a short summary of what you changed and what the next subagent should implement next

## Preferred working style
- Make small, deliberate edits
- Preserve long-term clarity over short-term cleverness
- Name things so future agents can reason locally
- If a file is a seam, say so in the docstring
- If a route must fail closed, say so in code comments and types
- If a module owns a responsibility, make that obvious

## Specific guidance for route behavior
### `/c/[token]`
Should represent a token-gated entry experience, not a generic page.

### `/api/session`
Should exist to validate/open a token-backed session boundary.

### `/api/chat`
Should assume a validated session/token context and should not be callable as an open public chat endpoint.

## Specific guidance for prompt design
Prompt assembly should be layered and explicit:
- base system instruction
- contracting services context
- token personalization context
- conversation history

Make those layers visible in code.

## Output expectations
At the end, provide:
- a concise change summary
- a list of files changed
- a list titled **Next subagent should implement:** with the next 3–5 concrete steps

If you need to choose between shipping more code and making the architecture clearer, choose the architecture.
