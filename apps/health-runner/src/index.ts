import { isNull } from "drizzle-orm";
import {
  db,
  diagrams,
  getHealthRuntime,
  projects,
  upsertHealthRuntime,
  upsertNodeObservation,
  users,
} from "@dataflow/db";
import { defaultStaleAfterSec, type DiagramSnapshot, type InfraNodeData, type NodeHealthConfig } from "@dataflow/shared";
import { eq } from "drizzle-orm";
import { alertEmailHtml, emailConfigured, sendAlertEmail } from "./email";
import { probeHealth } from "./probe";
import { sendSlackAlert } from "./slack";

type ProbeTarget = {
  diagramId: string;
  diagramName: string;
  projectId: string;
  projectName: string;
  ownerEmail: string | null;
  nodeId: string;
  title: string;
  health: NodeHealthConfig;
};

const TICK_MS = Number(process.env.HEALTH_RUNNER_TICK_MS ?? 15_000);
const ENABLED = (process.env.HEALTH_RUNNER_ENABLED ?? "true").toLowerCase() !== "false";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

function asSnapshot(value: unknown): DiagramSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as DiagramSnapshot;
  if (!Array.isArray(snapshot.nodes)) return null;
  return snapshot;
}

async function loadTargets(): Promise<ProbeTarget[]> {
  const rows = await db
    .select({
      diagramId: diagrams.id,
      diagramName: diagrams.name,
      projectId: projects.id,
      projectName: projects.name,
      snapshot: diagrams.snapshot,
      ownerEmail: users.email,
    })
    .from(diagrams)
    .innerJoin(projects, eq(diagrams.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(isNull(projects.deletedAt))
    .limit(2000);

  const targets: ProbeTarget[] = [];
  for (const row of rows) {
    const snapshot = asSnapshot(row.snapshot);
    if (!snapshot) continue;
    for (const node of snapshot.nodes) {
      if (node.type !== "infra") continue;
      const data = node.data as InfraNodeData;
      const health = data.health;
      if (!health?.enabled || !health.url) continue;
      if (health.kind === "external") continue;
      targets.push({
        diagramId: row.diagramId,
        diagramName: row.diagramName,
        projectId: row.projectId,
        projectName: row.projectName,
        ownerEmail: row.ownerEmail,
        nodeId: node.id,
        title: data.title || node.id,
        health,
      });
    }
  }
  return targets;
}

function pruneFailures(times: string[], windowSec: number, now = Date.now()) {
  const cutoff = now - windowSec * 1000;
  return times.filter((item) => {
    const ts = Date.parse(item);
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

async function maybeAlert(target: ProbeTarget, message: string, failureTimes: string[], lastAlertAt: Date | null) {
  const alert = target.health.alert;
  if (!alert?.enabled) return false;
  const failCount = alert.failCount ?? 3;
  const windowSec = alert.windowSec ?? 300;
  const cooldownSec = alert.cooldownSec ?? 3600;
  if (failureTimes.length < failCount) return false;
  if (lastAlertAt && Date.now() - lastAlertAt.getTime() < cooldownSec * 1000) return false;

  const emails = [...(alert.emails ?? [])];
  if (!emails.length && !alert.slackWebhookUrl && target.ownerEmail) emails.push(target.ownerEmail);
  const unique = [...new Set(emails.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  const slackWebhookUrl = alert.slackWebhookUrl?.trim();
  const appUrl = `${APP_URL}/editor/${target.projectId}/${target.diagramId}`;

  if (!unique.length && !slackWebhookUrl) {
    console.warn(`[health-runner] alert skipped (no email/slack) ${target.diagramId}/${target.nodeId}`);
    return false;
  }

  let sent = false;

  if (unique.length) {
    if (!emailConfigured()) {
      console.warn(`[health-runner] email skipped (not configured) ${target.diagramId}/${target.nodeId}`);
    } else {
      await sendAlertEmail({
        to: unique,
        subject: `[ClusterDeck] ${target.title} is unhealthy`,
        html: alertEmailHtml({
          projectName: target.projectName,
          diagramName: target.diagramName,
          nodeTitle: target.title,
          nodeId: target.nodeId,
          message,
          failCount,
          windowSec,
          url: target.health.url,
          appUrl,
        }),
      });
      console.log(`[health-runner] alert mailed ${target.diagramId}/${target.nodeId} → ${unique.join(",")}`);
      sent = true;
    }
  }

  if (slackWebhookUrl) {
    await sendSlackAlert({
      webhookUrl: slackWebhookUrl,
      projectName: target.projectName,
      diagramName: target.diagramName,
      nodeTitle: target.title,
      nodeId: target.nodeId,
      message,
      failCount,
      windowSec,
      url: target.health.url,
      appUrl,
    });
    console.log(`[health-runner] alert slack ${target.diagramId}/${target.nodeId}`);
    sent = true;
  }

  return sent;
}

async function processTarget(target: ProbeTarget) {
  const intervalSec = Math.max(15, target.health.intervalSec ?? 60);
  const runtime = await getHealthRuntime(target.diagramId, target.nodeId);
  if (runtime?.lastProbeAt && Date.now() - runtime.lastProbeAt.getTime() < intervalSec * 1000) {
    return;
  }

  const result = await probeHealth(target.health);
  const staleAfterSec = defaultStaleAfterSec(target.health);
  await upsertNodeObservation({
    diagramId: target.diagramId,
    nodeId: target.nodeId,
    status: result.status,
    message: result.message,
    source: "health-runner",
    staleAfterSec,
  });

  const now = new Date();
  if (result.ok) {
    await upsertHealthRuntime({
      diagramId: target.diagramId,
      nodeId: target.nodeId,
      failureTimes: [],
      lastOkAt: now,
      lastProbeAt: now,
      lastAlertAt: runtime?.lastAlertAt ?? null,
    });
    console.log(`[health-runner] ok ${target.diagramId}/${target.nodeId} ${result.message}`);
    return;
  }

  const windowSec = target.health.alert?.windowSec ?? 300;
  const failureTimes = pruneFailures([...(runtime?.failureTimes ?? []), now.toISOString()], windowSec);
  const alerted = await maybeAlert(target, result.message, failureTimes, runtime?.lastAlertAt ?? null);
  await upsertHealthRuntime({
    diagramId: target.diagramId,
    nodeId: target.nodeId,
    failureTimes,
    lastOkAt: runtime?.lastOkAt ?? null,
    lastProbeAt: now,
    lastAlertAt: alerted ? now : (runtime?.lastAlertAt ?? null),
  });
  console.log(`[health-runner] fail ${target.diagramId}/${target.nodeId} ${result.message}`);
}

async function tick() {
  if (!ENABLED) return;
  const targets = await loadTargets();
  for (const target of targets) {
    try {
      await processTarget(target);
    } catch (error) {
      const message = error instanceof Error ? error.message : "tick failed";
      console.error(`[health-runner] error ${target.diagramId}/${target.nodeId}: ${message}`);
    }
  }
}

console.log(
  `[health-runner] starting (enabled=${ENABLED}, tick=${TICK_MS}ms, email=${emailConfigured() ? "on" : "off"})`,
);
await tick();
setInterval(() => {
  void tick();
}, TICK_MS);
