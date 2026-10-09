---
title: Live status
description: Background health checks, TTL overlay on the canvas, and email alerts after N failures.
---

Live status shows whether services are up **right now**. You configure a probe on each infra node; the **health-runner** microservice checks it on an interval, updates the canvas overlay, and can email you when something stays down.

## Documented vs observed

| Kind | Where it lives | Who sets it |
| --- | --- | --- |
| **Documented status** | `node.data.status` | You / MCP `update_diagram` |
| **Observed status** | TTL store (`diagram_node_observations`) | health-runner, webhook, or MCP `set_node_status` |

Canvas rules:

- Fresh observation → **LIVE** + observed color  
- Older than `staleAfterSec` → **STALE**, fall back to documented status  
- No observation → documented only  

Observed updates do **not** write diagram history.

## Configure a check (inspector)

1. Select an infra node → Edit.  
2. Turn on **Live status tracking**.  
3. Choose probe kind:
   - **HTTP** — GET a URL (expect status, default 200)  
   - **TCP** — open `host:port`  
   - **External** — push-only (n8n/MCP); runner skips these  
4. Set interval and stale timeout.  
5. Optionally enable **Email alerts** (see below).

The background runner reads the **persisted** diagram snapshot (same data that survives reload). Save/leave the editor so the config is stored before expecting probes.

## Background health-runner

Service: `apps/health-runner` (Docker Compose service `health-runner`).

On each tick (default 15s) it:

1. Loads nodes with `health.enabled` and kind `http` / `tcp`  
2. Probes when each node’s `intervalSec` elapsed  
3. Writes observed status (`source: health-runner`)  
4. Evaluates alert rules and may send email  

Env:

| Variable | Meaning |
| --- | --- |
| `HEALTH_RUNNER_ENABLED` | `true` / `false` (default true) |
| `HEALTH_RUNNER_TICK_MS` | Loop period (default `15000`) |
| `HEALTH_RUNNER_ALLOW_PRIVATE` | Allow RFC1918 / localhost targets (default `false`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Required for email alerts |

SSRF defaults: private IPs, localhost, and link-local hosts are blocked unless `HEALTH_RUNNER_ALLOW_PRIVATE=true` (use when the runner runs inside your VPC).

Local:

```bash
pnpm --filter health-runner dev
```

## Alerts: email and Slack (N failures in a window)

On the node, enable **Alerts**:

| Field | Default | Meaning |
| --- | --- | --- |
| Failures | 3 | How many failed probes |
| Window (sec) | 300 | Time window for those failures |
| Cool (sec) | 3600 | Minimum time between alerts |
| Emails | (owner) | Comma-separated; blank → project owner if Slack is empty |
| Slack webhook | — | Incoming Webhook URL from Slack |

### Slack setup

1. In Slack: create an app / enable **Incoming Webhooks**.
2. Add the webhook to a channel and copy the URL (`https://hooks.slack.com/services/…`).
3. Paste it into the node alert settings.

Example: 3 failures within 5 minutes → email and/or Slack once; no repeat for 1 hour while still failing.

Recovery clears the failure window when a probe succeeds.

## Push without the runner

Still supported for External kind or custom monitors:

### HTTP webhook

```http
POST /api/health/ingest
Authorization: Bearer cd_…
Content-Type: application/json

{
  "diagramId": "DIAGRAM_ID",
  "observations": [
    {
      "nodeId": "NODE_ID",
      "status": "offline",
      "message": "connection refused",
      "source": "n8n",
      "staleAfterSec": 180
    }
  ]
}
```

Requires MCP token + project MCP enabled.

### MCP

- `set_node_status` — write observations  
- `list_node_status` — read overlay  

## Related

- [MCP](/docs/mcp)  
- [Nodes](/docs/editor/nodes)  
