import { Auditor, InMemoryAuditSink } from "./audit/audit";
import { createSafeMcpHandler } from "./mcp/server";
import { proofProject } from "./mcp/safe-tools";
import { createGateway, type GatewayBindings } from "./gateway/gateway";
import { operatorBridge } from "./operator/bridge";
import { dashboard } from "./operator/dashboard";

const auditSink = new InMemoryAuditSink();
const auditor = new Auditor(auditSink);
const mcpHandler = createSafeMcpHandler(auditor);
const gateway = createGateway();

export function getProofProject(projectId: string) {
  return projectId === proofProject.project_id ? structuredClone(proofProject) : null;
}

export { auditSink, auditor };
export * from "./application/control-plane";
export * from "./audit/audit";
export * from "./domain/state-machine";
export * from "./domain/task";
export * from "./executors/daytona";
export * from "./executors/executor";
export * from "./executors/genspark";
export * from "./executors/mock";
export * from "./mcp/safe-tools";
export * from "./policy/policy";
export * from "./verification/verification";

export default {
  async fetch(request: Request, env: GatewayBindings = {}): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({
        service: "genspark-execution-bridge",
        status: "ok",
        phase: 5,
        production_execution: env.GATEWAY_EXECUTION_ENABLED === "true" && !!env.DB && !!env.DAYTONA_API_KEY && !!env.GATEWAY_OPERATOR_TOKEN,
        daytona_execution_proof: "pass",
        daytona_public_execution: false,
        genspark_remote_execution: "unverified"
      });
    }

    if (url.pathname === "/" && request.method === "GET") return dashboard();

    if (url.pathname.startsWith("/operator/")) return operatorBridge(request, env);

    if (url.pathname === "/execute" || url.pathname.startsWith("/executions/")) {
      return gateway(request, env);
    }

    if (url.pathname === "/mcp") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
            "access-control-allow-headers": "Accept,Content-Type,MCP-Protocol-Version,Mcp-Method,Mcp-Name,Mcp-Session-Id"
          }
        });
      }

      const response = await mcpHandler.fetch(request);
      const headers = new Headers(response.headers);
      headers.set("access-control-allow-origin", "*");
      headers.set("access-control-expose-headers", "Mcp-Session-Id,MCP-Protocol-Version");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }
};
