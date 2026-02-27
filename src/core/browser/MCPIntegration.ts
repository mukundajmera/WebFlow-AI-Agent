/**
 * MCP (Model Context Protocol) integration for browser automation.
 * Manages MCP server lifecycle and translates browser actions to MCP tool calls.
 */

import type { ActionResult } from "~types/common";
import type { MCPAction } from "~types/browser";
import type {
  MCPToolDefinition,
  MCPToolResult,
  MCPServerConfig,
  MCPRequest,
} from "~types/mcp";

/** Standard MCP tool names for browser automation */
const TOOL_MAPPINGS = {
  browser_navigate: "browser_navigate",
  browser_click: "browser_click",
  browser_type: "browser_type",
  browser_screenshot: "browser_screenshot",
  browser_wait: "browser_wait",
  browser_upload: "browser_upload",
  browser_evaluate: "browser_evaluate",
} as const;

/**
 * Manages MCP server connections and provides a bridge between
 * browser actions and MCP tool invocations.
 */
export class MCPIntegration {
  public serverConfig: MCPServerConfig | null = null;
  private availableTools: MCPToolDefinition[] = [];
  private initialized = false;
  private requestId = 0;

  /**
   * Initialize the MCP integration with the given server config.
   * In a browser-extension context MCP servers run externally;
   * this stores config and marks the integration as ready.
   */
  async initialize(config?: MCPServerConfig): Promise<void> {
    try {
      if (config) {
        this.serverConfig = config;
      }

      // Pre-populate available tools with the standard browser tool set
      this.availableTools = Object.values(TOOL_MAPPINGS).map((name) => ({
        name,
        description: `MCP tool: ${name}`,
        inputSchema: { type: "object" as const },
      }));

      this.initialized = true;
      console.info("[MCPIntegration] Initialized successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error("[MCPIntegration] Initialization failed:", message);
      throw new Error(`MCP initialization failed: ${message}`);
    }
  }

  /**
   * Gracefully shut down the MCP connection and clean up resources.
   */
  async shutdown(): Promise<void> {
    try {
      this.initialized = false;
      this.availableTools = [];
      this.serverConfig = null;
      console.info("[MCPIntegration] Shut down successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error("[MCPIntegration] Shutdown error:", message);
    }
  }

  /**
   * Execute a browser action via the corresponding MCP tool.
   * @param action - The MCP action containing a tool name and arguments.
   * @returns The raw MCP tool result.
   */
  async executeAction(action: MCPAction): Promise<MCPToolResult> {
    if (!this.initialized) {
      return { content: "", isError: true, metadata: { error: "MCP not initialized" } };
    }

    const toolExists = this.availableTools.some((t) => t.name === action.tool);
    if (!toolExists) {
      return {
        content: "",
        isError: true,
        metadata: { error: `Unknown tool: ${action.tool}` },
      };
    }

    return this.callTool(action.tool, action.args as Record<string, any>);
  }

  /**
   * Return the list of tools currently available from the MCP server.
   */
  async getAvailableTools(): Promise<MCPToolDefinition[]> {
    return [...this.availableTools];
  }

  /**
   * Generic tool invocation. Builds a JSON-RPC 2.0 request and returns
   * the result (or an error wrapper).
   */
  async callTool(
    toolName: string,
    args: Record<string, any>,
  ): Promise<MCPToolResult> {
    if (!this.initialized) {
      return { content: "", isError: true, metadata: { error: "MCP not initialized" } };
    }

    const request: MCPRequest = {
      jsonrpc: "2.0",
      id: ++this.requestId,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    };

    try {
      console.debug("[MCPIntegration] Calling tool:", toolName, args);

      // In a real implementation this would send `request` over the
      // configured transport (stdio / SSE). For now we return a
      // placeholder success so consumers can integrate seamlessly.
      const result: MCPToolResult = {
        content: JSON.stringify({ tool: toolName, args, requestId: request.id }),
        isError: false,
        metadata: { toolName, requestId: request.id },
      };

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error("[MCPIntegration] Tool call failed:", message);
      return { content: "", isError: true, metadata: { error: message } };
    }
  }

  /**
   * Convert an {@link MCPToolResult} into a standard {@link ActionResult}.
   */
  parseResult(result: MCPToolResult): ActionResult {
    return {
      success: !result.isError,
      data: result.isError ? undefined : result.content,
      error: result.isError
        ? (result.metadata?.error as string) ?? result.content
        : undefined,
      timestamp: new Date().toISOString(),
      duration: 0,
    };
  }

  /** Whether the integration has been initialised. */
  isInitialized(): boolean {
    return this.initialized;
  }
}
