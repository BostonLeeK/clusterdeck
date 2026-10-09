---
title: Sharing
description: Invite collaborators and publish read-only public links with nested drill-down.
---

Sharing controls who can view or edit a diagram outside your private drafts.

## Invite collaborators

Project owners (and authorized admins) invite people from the editor **Share** dialog:

1. Add people by email / account.
2. Choose access level (**editor** or **viewer**).
3. Send the invite.

Invited editors join [realtime](/docs/collaboration) sessions. Removing a member revokes editor access. Revoke from the same dialog when someone should leave.

## Public links

Create a **public link** for read-only access without an account.

- URL shape: `/p/[token]` for the root diagram.
- Nested drill-down: `/p/[token]/[diagramId]` opens a child diagram in the same share.

Viewers can navigate the nested tree but cannot edit, export privileged data beyond what the public page allows, or manage members.

### When to use public links

- Architecture review with stakeholders
- Embedding a system map in an internal wiki (link out)
- Incident war-room context for people without seats

### When not to

- Diagrams that contain secrets, private IPs you must not expose, or unreleased strategy — sanitize first or keep invite-only.

## Revoke and rotate

Disable or regenerate the public token from Share settings if a link leaked. Old URLs stop working after revoke.

## Sharing vs teams

| Mechanism | Best for |
| --- | --- |
| **Team membership** | Ongoing co-ownership |
| **Invite** | Specific people on one diagram |
| **Public link** | Broad read-only audience |

See also [Teams](/docs/teams).
