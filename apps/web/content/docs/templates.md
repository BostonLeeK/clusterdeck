---
title: Templates
description: Start from presets and save your own reusable projects.
---

Templates are starter projects you can use when creating something new. They speed up common layouts (e.g. web app + DB + queue) and keep team conventions consistent.

## Start from a template

1. Go to **Projects**.
2. Create a **New project**.
3. Choose a template from the list (built-in or saved by you/your team).
4. The editor opens with that content preloaded — including nested diagram trees when the template had them.

You can freely edit, delete, or extend anything from the template — it is a copy, not a live link.

## Save as template

From a project you can access:

1. Open the project card menu (or editor entry point).
2. Choose **Save as template**.
3. Confirm the name.

The saved template becomes available for future creates. It reuses the project’s **diagram tree**.

Good template candidates:

- Company reference architecture
- Recurring client onboarding map
- Nested “service + dependencies” pattern you reuse often

## Templates vs duplicates

| | Template | Duplicate |
| --- | --- | --- |
| Purpose | Reusable starter for many new projects | One-off copy of an existing project |
| When | Create flow | Project menu |
| Nested content | Included when saved from a full tree | Copied with the project |

## Best practices

- Keep templates **generic** (no client secrets, no temporary IPs).
- Prefer clear node titles and a small nested example so users learn the pattern.
- Update a template when conventions change; old projects are unaffected.
