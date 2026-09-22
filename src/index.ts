import { Auditor, InMemoryAuditSink } from "./audit/audit";
import { createSafeMcpHandler } from "./mcp/server";
import { proofProject } from "./mcp/safe-tools";

const auditSink = new InMemoryAuditSink();
const auditor = new Auditor(auditSink);
const mcpHandler = createSafeMcpHandler(auditor);

export function getProofProject(projectId: string) {
  return projectId === proofProject.project_id ? structuredClone(proofProject) : null;
}

export { auditSink, auditor };
export * from "./application/control-plane";
export * from "./audit/audit";
export * from "./domain/state-machine";
export * from "./domain/task";
export * from "./executors/executor";
export * from "./executors/genspark";
export * from "./executors/mock";
export * from "./mcp/safe-tools";
export * from "./policy/policy";
export * from "./verification/verification";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({
        service: "genspark-execution-bridge",
        status: "ok",
        phase: 1,
        production_execution: false,
        genspark_remote_execution: "unverified"
      });
    }

    if (url.pathname === "/audit" && request.method === "GET") {
      return Response.json({ events: auditSink.events() }, {
        headers: { "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/mcp") return mcpHandler.fetch(request);

    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }
};
