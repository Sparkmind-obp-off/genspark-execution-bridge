import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export interface ProofProject {
  project_id: string;
  name: string;
  status: "ok";
  proof: true;
}

export interface AuditEvent {
  event: string;
  timestamp: string;
  project_id?: string;
  tool?: string;
  request_id?: string;
}

const PROOF_PROJECT: ProofProject = {
  project_id: "proof-project",
  name: "Genspark Execution Bridge Proof",
  status: "ok",
  proof: true
};

// Runtime-local audit evidence. Production persistence should be added after
// the connectivity proof succeeds; no secrets are ever recorded here.
const auditEvents: AuditEvent[] = [];

function audit(event: AuditEvent): void {
  auditEvents.push(event);
  console.log(JSON.stringify({ ...event, component: "mcp-proof-server" }));
}

export function getProofProject(projectId: string): ProofProject | null {
  if (projectId !== PROOF_PROJECT.project_id) return null;
  return PROOF_PROJECT;
}

function buildServer() {
  const server = new McpServer(
    { name: "genspark-execution-bridge-proof", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  audit({
    event: "mcp.connection.checked",
    timestamp: new Date().toISOString()
  });

  server.registerTool(
    "get_project",
    {
      title: "Get Proof Project",
      description:
        "Read-only MCP proof tool. Returns a fixed harmless project record. No writes, deployment, shell, secrets, or external side effects.",
      inputSchema: {
        project_id: z.string().min(1).max(100)
      },
      outputSchema: {
        project_id: z.string(),
        name: z.string(),
        status: z.literal("ok"),
        proof: z.literal(true)
      }
    },
    async ({ project_id }) => {
      audit({
        event: "mcp.tool.discovered",
        timestamp: new Date().toISOString(),
        tool: "get_project"
      });

      const project = getProofProject(project_id);
      if (!project) {
        audit({
          event: "mcp.tool.invoked",
          timestamp: new Date().toISOString(),
          tool: "get_project",
          project_id
        });
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify({ error: "UNKNOWN_PROJECT" }) }]
        };
      }

      audit({
        event: "mcp.tool.invoked",
        timestamp: new Date().toISOString(),
        tool: "get_project",
        project_id
      });

      audit({
        event: "mcp.tool.result_returned",
        timestamp: new Date().toISOString(),
        tool: "get_project",
        project_id
      });

      return {
        content: [{ type: "text", text: JSON.stringify(project) }],
        structuredContent: project
      };
    }
  );

  return server;
}

const mcpHandler = createMcpHandler(buildServer);

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        service: "genspark-execution-bridge-proof",
        status: "ok",
        proof_version: "p0-p3-v1"
      });
    }

    if (url.pathname === "/audit") {
      return Response.json({
        events: auditEvents.map(({ event, timestamp, tool, project_id }) => ({
          event,
          timestamp,
          ...(tool ? { tool } : {}),
          ...(project_id ? { project_id } : {})
        }))
      });
    }

    if (url.pathname === "/mcp") {
      return mcpHandler(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
