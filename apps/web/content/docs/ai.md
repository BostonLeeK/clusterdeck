---
title: AI diagram
description: Generate a first-draft diagram from a natural-language prompt.
---

The **AI diagram** feature turns a prompt into a starter canvas so you do not begin from a blank page.

## When to use it

- Kick off a greenfield architecture sketch
- Translate a written design doc into boxes and arrows
- Explore alternatives quickly before manual refinement

AI output is a **draft**. Always review node names, edges, and nesting before sharing as truth.

## How to run it

1. Start a new diagram or open the AI entry point in the product.
2. Describe the system: actors, services, data stores, important flows.
3. Generate and wait for the draft to appear on the canvas.
4. Edit freely — move nodes, fix edges, add nested diagrams, tags, and flows.

## Writing a good prompt

Include:

- Purpose of the system
- Major components and their roles
- External dependencies
- Environments (if relevant)
- Any nesting you want (“payment service should have an inner diagram”)

Avoid:

- Secrets, private keys, customer PII
- Extremely long paste-dumps with no structure — summarize first

## Limits

- Models can invent plausible but wrong components — verify against reality.
- Complex networking (exact ports, failovers) usually needs human cleanup.
- Nested depth and connector publishing are often best done manually after the draft.

## Next steps after generation

1. Rename generic nodes to your real service names.
2. Attach [nested diagrams](/docs/editor/nested) for busy services.
3. Add [flows](/docs/editor/tags-flows) for the primary user journey.
4. [Share](/docs/sharing) or [export](/docs/export-import) when the draft is solid.
