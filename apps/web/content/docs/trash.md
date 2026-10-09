---
title: Trash
description: Soft-delete projects and restore them when needed.
---

Trash holds projects you removed from the active list without permanently destroying them (soft delete). Team deletion also sends that team’s projects here.

## Move to trash

From **Projects**, open a project’s menu and choose **Delete** / **Move to trash**. The project disappears from the active list.

Nested child diagrams belonging to that project follow the root’s lifecycle — treat deleting a project as removing that whole bundle from active use.

## Browse trash

Open **Trash** from the workspace navigation (`Projects` → Trash filter). You will see deleted projects with restore / permanent delete actions (when available).

## Restore

Select **Restore** to return a project to the active list. Collaborators regain access according to previous permissions where applicable.

## Permanent delete

If offered, permanent delete removes the project from trash. Prefer export first if you might need the content later.

## Leave vs trash

| Action | Effect |
| --- | --- |
| **Leave** | You lose access; project remains for owner/team |
| **Move to trash** | Project is removed from active workspace (owner/authorized action) |
| **Delete team** | Team is removed; its projects move to Trash |
| **Transfer ownership** | Someone else becomes owner; project stays active |

## Tips

- Soft-delete accidental duplicates instead of renaming forever.
- Restore soon if a delete was a mistake — do not rely on trash as long-term storage.
- For archival, use [Export & import](/docs/export-import) and keep the JSON outside the app.
