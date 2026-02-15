/**
 * MCP (Model Context Protocol) types
 */

import type { JSONSchema } from "./llm";

/**
 * MCP client interface for interacting with MCP servers
 */
export interface MCPClient {
  /** Initialize the MCP connection */
  initialize(): Promise<void>;
  /** Gracefully shut down the connection */
  shutdown(): Promise<void>;
  /** List available tools from the server */
  listTools(): Promise<MCPToolDefinition[]>;
  /** Call a tool on the MCP server */
  callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult>;
  /** Get server information */
  getServerInfo(): Promise<MCPServerInfo>;
}

/**
 * Information about an MCP server
 */
export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: string[];
}

/**
 * Definition of a tool provided by an MCP server
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

/**
 * Result from calling an MCP tool
 */
export interface MCPToolResult {
  content: string;
  isError: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for connecting to an MCP server
 */
export interface MCPServerConfig {
  /** Command to run (e.g., "npx") */
  command: string;
  /** Command arguments */
  args: string[];
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * MCP JSON-RPC request
 */
export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC response
 */
export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

/**
 * MCP error object
 */
export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * Standard MCP error codes
 */
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;
