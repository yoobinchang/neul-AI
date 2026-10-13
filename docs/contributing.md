# Working together

## Before coding

Choose a small issue with an owner and observable completion criteria. If another part consumes your data, agree on its contract first. Use fictional examples while the other implementation is pending.

A primarily reviews voice changes, B brain/schema changes, and C app changes. Ownership means review responsibility, not a prohibition on helping. Contract changes need review by both producer and consumer. B reviews schema changes and coordinates migrations.

## Branch and PR workflow

Start a task with a clean working tree:

```bash
git switch main
git pull --ff-only
git switch -c feat/call-list
```

Implement a focused change, then:

```bash
git status
git diff
git add app/
git commit -m "feat: add call list screen"
git push -u origin feat/call-list
```

Stage the actual files for your task; app/ is just the example. Open a PR from the task branch to main. Explain the behavior, verification, and interface changes. Push additional commits to the same branch to update that PR. Ask a teammate to review before merging.

After merge, return to main, pull it, and create a new branch for the next task. Branches contain the whole repository; the PR shows the changes, not a separate copy of one folder. Keep branches short-lived and coordinate shared-file changes. If Git reports conflicts, inspect both changes and resolve deliberately rather than discarding a teammate's work.

## PR checklist

- The change matches one issue and its completion criteria.
- Relevant checks were run; limitations are stated.
- Contracts and examples match changed behavior.
- No secrets or real parent data are included.
- Another owner reviews cross-boundary changes.

## CI and CD

CI runs actual checks such as lint, type checks, tests, and builds. Add it under .github/workflows after the chosen stack has meaningful commands. Configure required checks/reviews separately if the team wants merge enforcement; a workflow alone is not enforcement.

CD is deployment, not git push. Add a test environment before production automation. Keep backend deployment and mobile distribution separate. This scaffold intentionally contains no placeholder CI, deployment workflow, or claimed passing application tests.

## Communication

Use issues for work, PRs for code review, and docs for current agreements. Announce contract changes to affected teammates. Integrate a small path early rather than waiting for all workstreams to finish. Use the weekly sync for blockers and next milestones, not as the only opportunity to connect code.
