# Neul

An AI phone assistant that supports families when a caregiver cannot answer.

A parent calls their child's existing number. When a tested conditional-forwarding setup routes an unanswered call to Neul, the AI identifies itself, uses caregiver-provided context, and talks with the parent. The caregiver can review a call summary and receive alerts when follow-up may be needed.

**Status: planning scaffold. No application, database, integrations, or deployment are implemented.** This repository combines the technical-plan draft and the later team discussion. Proposals are not team approvals.

## Product boundaries

- The child receives the original call first.
- The AI discloses that it is AI; no voice cloning or impersonation.
- Caregivers enter and edit parent information through the app.
- Neul does not provide medical advice, call emergency services automatically, or track GPS.
- Development and demo data must be fictional.

## Repository ownership

| Folder | Proposed owner | Responsibility |
| --- | --- | --- |
| `voice/` | A: Live Call | Phone setup, prompts, call events, urgent SMS/calls, Lost Mode |
| `brain/` | B: Brain & Data | Data model, authentication/authorization, profile lookup, summaries, app API, push delivery |
| `app/` | C: Caregiver App | Setup, profile/contact forms, call feed/detail, alerts, push registration |
| `docs/` | Shared; B coordinates contracts | Plans and agreed interfaces |

These are code ownership boundaries, not separate deployment requirements. A also writes backend code. Framework-specific subfolders will be added after stack selection.

## Start here

1. Read [the product plan](docs/plan.md) and [open decisions](docs/decisions.md).
2. Confirm owners and a first integration milestone in [the work plan](docs/work-plan.md).
3. Review [the architecture](docs/architecture.md), [data model](docs/data-model.md), and [draft contracts](docs/contracts.md).
4. Follow [the contribution workflow](docs/contributing.md) and [safety rules](docs/safety.md).
5. Use [fictional examples](docs/examples.json) to build independently.

## First integration target

Save one fictional completed call through B's backend boundary and display it in C's app. A can test a phone/voice provider independently, then replace the fictional call input with a real test-call event. This narrow checkpoint does not remove urgent alerts from the intended demo scope.

## Local setup

There is no runnable application yet. Clone the shared repository, read the documents, and create a task branch. Runtime versions, dependencies, environment variables, and run/test commands must be added by the stack-initialization PR. Do not invent commands or add a CI workflow that reports success without checking code.

Copy `.env.example` to a local `.env` only once actual variables have been documented. Never commit credentials or real family data.

## Document status

All endpoint names, JSON fields, and implementation choices in these documents are **review drafts**, except the requested initial folder layout. See [source reconciliation](docs/source-notes.md) for differences between the supplied plans and the editorial choices in this scaffold.
