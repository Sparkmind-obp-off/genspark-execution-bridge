import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { Auditor } from "../audit/audit";
import {
  getProjectInputSchema,
  getProjectOutputSchema,
  getStatusInputSchema,
  getStatusOutputSchema,
  getTaskInputSchema,
  getTaskOutputSchema,
  invokeSafeTool,
  type SafeToolName
} from "./safe-tools";

export function createSafeMcpHandler(auditor: Auditor) {
  return createMcpHandler(() => {
    const server = new McpServer(
      { name: "genspark-execution-bridge", version: "1.0.0-phase.1" },
      { capabilities: { tools: {} } }
    );

    void auditor.emit({ event: "mcp.connection.checked", outcome: "request_received" });

    registerReadTool(server, auditor, "get_project", {
      title: "Get Project",
      description: "Read-only lookup of the fixed Phase 1 proof project. No secrets or side effects.",
      inputSchema: getProjectInputSchema.shape,
      outputSchema: getProjectOutputSchema.shape
    });
    registerReadTool(server, auditor, "get_task", {
      title: "Get Task",
      description: "Read-only lookup of a public-safe Phase 1 proof task summary. Task input and secrets are never returned.",
      inputSchema: getTaskInputSchema.shape,
      outputSchema: getTaskOutputSchema.shape
    });
    registerReadTool(server, auditor, "get_status", {
      title: "Get Status",
      description: "Read-only lookup of deterministic execution status. No mutation or external side effect.",
      inputSchema: getStatusInputSchema.shape,
      outputSchema: getStatusOutputSchema.shape
    });

    return server;
  });
}

function registerReadTool(
  server: McpServer,
  auditor: Auditor,
  name: SafeToolName,
  definition: {
    title: string;
    description: string;
    inputSchema: Record<string, z.ZodType>;
    outputSchema: Record<string, z.ZodType>;
  }
): void {
  void auditor.emit({ event: "mcp.tool.discovered", tool: name, outcome: "registered" });
  server.registerTool(
    name,
    definition,
    async (input: unknown) => {
      const result = await invokeSafeTool(name, input, auditor);
      if (!result.ok) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: JSON.stringify({ error: result.error.code, message: result.error.message }) }]
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.value) }],
        structuredContent: result.value
      };
    }
  );
}
