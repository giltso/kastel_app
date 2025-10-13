# Claude Code Prompt Injection: SDK vs MCP Server Comparison

## Executive Summary

This document provides an in-depth comparison of two sophisticated approaches for programmatically injecting prompts into Claude Code:

1. **Claude Agent SDK** - Official TypeScript/Python SDK for building autonomous AI agents
2. **Custom MCP Server** - Build a Model Context Protocol server that exposes prompt injection as a tool

Both approaches enable automation, but differ significantly in architecture, complexity, and use cases.

---

## Table of Contents

- [1. Claude Agent SDK Deep Dive](#1-claude-agent-sdk-deep-dive)
  - [1.1 Architecture Overview](#11-architecture-overview)
  - [1.2 How It Works Internally](#12-how-it-works-internally)
  - [1.3 API Methods & Configuration](#13-api-methods--configuration)
  - [1.4 Authentication & Setup](#14-authentication--setup)
  - [1.5 Implementation Examples](#15-implementation-examples)
  - [1.6 Pros, Cons & Limitations](#16-pros-cons--limitations)
- [2. Custom MCP Server Deep Dive](#2-custom-mcp-server-deep-dive)
  - [2.1 MCP Protocol Overview](#21-mcp-protocol-overview)
  - [2.2 Architecture & Design](#22-architecture--design)
  - [2.3 Server Implementation](#23-server-implementation)
  - [2.4 Tool Registration & Invocation](#24-tool-registration--invocation)
  - [2.5 Implementation Examples](#25-implementation-examples)
  - [2.6 Pros, Cons & Limitations](#26-pros-cons--limitations)
- [3. Side-by-Side Comparison](#3-side-by-side-comparison)
  - [3.1 Architecture Differences](#31-architecture-differences)
  - [3.2 Complexity & Learning Curve](#32-complexity--learning-curve)
  - [3.3 Integration Patterns](#33-integration-patterns)
  - [3.4 Performance Characteristics](#34-performance-characteristics)
  - [3.5 Security Considerations](#35-security-considerations)
- [4. Decision Matrix](#4-decision-matrix)
- [5. Hybrid Approach](#5-hybrid-approach)
- [6. Conclusion](#6-conclusion)

---

## 1. Claude Agent SDK Deep Dive

### 1.1 Architecture Overview

The Claude Agent SDK is an official library that wraps Claude Code's capabilities into a programmable API. It essentially runs Claude Code as a subprocess and provides a clean interface for sending prompts and receiving responses.

**Key Components:**

```
┌─────────────────────────────────────────────────────────┐
│                  Your Application                        │
│  ┌────────────────────────────────────────────────┐    │
│  │   import { query } from                        │    │
│  │   '@anthropic-ai/claude-agent-sdk'             │    │
│  │                                                 │    │
│  │   const result = query({ prompt: "..." })      │    │
│  └───────────────────┬─────────────────────────────┘    │
└────────────────────┼─────────────────────────────────────┘
                     │
                     │ Spawns & Manages
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Claude Code Process                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  - File operations (Read, Write, Edit)         │    │
│  │  - Code execution (Bash tool)                  │    │
│  │  - Web search                                  │    │
│  │  - MCP tool integrations                       │    │
│  │  - Session management                          │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ API Calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Anthropic API                               │
│           (Claude Sonnet/Opus Models)                    │
└─────────────────────────────────────────────────────────┘
```

**Architecture Characteristics:**
- **Standalone Process**: SDK spawns a new Claude Code instance for each session
- **Async Streaming**: Responses stream back via async generators
- **Full Tool Access**: Has access to all Claude Code tools (Read, Write, Bash, Grep, Glob, etc.)
- **Session Isolation**: Each SDK invocation is independent (unless using session management)

### 1.2 How It Works Internally

When you call `query()`, the SDK:

1. **Spawns Claude Code** as a subprocess with `--print --output-format=stream-json`
2. **Configures Environment**:
   - Sets `ANTHROPIC_API_KEY` from environment
   - Applies options (model, allowedTools, systemPrompt, etc.)
   - Sets up working directory and additional directories
3. **Sends Prompt** via stdin as JSON-formatted message
4. **Streams Response** from stdout, parsing JSON chunks
5. **Yields Messages** to your async iterator:
   - User messages (echoed back)
   - Assistant messages (text responses)
   - Tool use/result pairs
   - Thinking blocks (if enabled)
6. **Manages Lifecycle** - Handles interruption, cleanup, error handling

**Key Internal Features:**
- **Automatic Context Management**: Tracks conversation history automatically
- **Tool Permission Handling**: Can prompt for permissions or bypass via options
- **Error Recovery**: Built-in retry logic and error handling
- **Session Persistence**: Optional session ID for continuing conversations

### 1.3 API Methods & Configuration

#### Primary Method: `query()`

```typescript
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: string | AsyncGenerator<UserMessage>,
  options?: Options
});

// Returns AsyncGenerator<Message>
for await (const message of result) {
  console.log(message);
}
```

#### Options Interface

```typescript
interface Options {
  // Model Configuration
  model?: string;                    // 'claude-sonnet-4-5-20250929', 'opus', etc.
  fallbackModel?: string;            // Model to use if primary is overloaded

  // System Prompt
  systemPrompt?: string;             // Override default system prompt
  appendSystemPrompt?: string;       // Add to default system prompt

  // Tool Permissions
  allowedTools?: string[];           // ['Read', 'Write', 'Bash(git:*)']
  disallowedTools?: string[];        // Tools to explicitly deny
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

  // Session Management
  sessionId?: string;                // UUID for session persistence
  continue?: boolean;                // Continue most recent session
  resume?: string;                   // Resume specific session by ID
  forkSession?: boolean;             // Create new ID when resuming

  // Working Directory
  additionalDirectories?: string[];  // Extra directories to allow access

  // Advanced
  mcpConfig?: string[];              // MCP server configs
  agents?: Record<string, Agent>;    // Custom subagents
  settings?: string | object;        // Additional settings

  // Callbacks
  canUseTool?: (tool: ToolUse) => boolean | Promise<boolean>;
}
```

#### Streaming Input

For multi-turn conversations or dynamic prompts:

```typescript
const result = query({
  prompt: async function*() {
    yield { type: 'user', message: 'First part' };
    // ... do some processing
    yield { type: 'user', message: 'Follow-up based on data' };
  },
  options: { model: 'opus' }
});
```

### 1.4 Authentication & Setup

**Installation:**
```bash
npm install @anthropic-ai/claude-agent-sdk
# or
pnpm add @anthropic-ai/claude-agent-sdk
```

**Authentication Options:**

1. **API Key** (Requires Claude Pro/Max subscription)
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Long-lived Token** (Recommended for automation)
   ```bash
   claude setup-token
   # Follow OAuth flow, token stored in ~/.claude/.credentials.json
   ```

3. **Third-party Providers**
   ```bash
   # Amazon Bedrock
   export AWS_BEARER_TOKEN_BEDROCK=...

   # Google Vertex AI
   export CLOUD_ML_REGION=us-central1
   ```

**Requirements:**
- Node.js 18+
- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)
- Active Claude subscription (Pro or Max for most features)

### 1.5 Implementation Examples

#### Example 1: Simple Code Analysis

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function analyzeCodebase(directory: string) {
  const result = query({
    prompt: `Analyze the codebase in ${directory} and identify:
    1. Main architectural patterns
    2. Potential security issues
    3. Code quality metrics

    Provide a summary report.`,
    options: {
      additionalDirectories: [directory],
      allowedTools: ['Read', 'Grep', 'Glob', 'Bash(git:*)'],
      model: 'claude-sonnet-4-5-20250929'
    }
  });

  let analysis = '';
  for await (const message of result) {
    if (message.type === 'assistant') {
      analysis += message.content;
    }
  }

  return analysis;
}

// Usage
const report = await analyzeCodebase('/workspaces/myapp');
console.log(report);
```

#### Example 2: Automated Refactoring Pipeline

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function refactorWithApproval(files: string[], instructions: string) {
  const result = query({
    prompt: `Refactor the following files according to these instructions:

    Files: ${files.join(', ')}
    Instructions: ${instructions}

    For each file:
    1. Read the current implementation
    2. Propose refactored version
    3. Ask for approval before writing
    `,
    options: {
      permissionMode: 'default', // Will prompt for file edits
      allowedTools: ['Read', 'Edit', 'Write'],
      canUseTool: async (tool) => {
        // Custom approval logic
        if (tool.name === 'Edit' || tool.name === 'Write') {
          console.log(`Approve ${tool.name} on ${tool.input.file_path}?`);
          // Could integrate with Slack, email, etc.
          return await promptUser(`Allow ${tool.name}?`);
        }
        return true; // Auto-approve Read
      }
    }
  });

  for await (const message of result) {
    if (message.type === 'tool_use') {
      console.log(`Tool: ${message.name}`, message.input);
    }
  }
}
```

#### Example 3: CI/CD Integration

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import * as fs from 'fs';

async function prReview(prNumber: string) {
  const result = query({
    prompt: `Review PR #${prNumber} using these criteria:
    1. Code quality and maintainability
    2. Test coverage
    3. Security vulnerabilities
    4. Performance implications

    Run the test suite and linter.
    Generate a detailed review comment.`,
    options: {
      allowedTools: ['Read', 'Bash(git:*)', 'Bash(pnpm:*)', 'Bash(npm:*)'],
      permissionMode: 'bypassPermissions', // CI/CD sandbox
      model: 'opus' // Use most capable model for thorough review
    }
  });

  let reviewComment = '';
  const toolsUsed = [];

  for await (const message of result) {
    if (message.type === 'assistant') {
      reviewComment += message.content;
    }
    if (message.type === 'tool_use') {
      toolsUsed.push(message.name);
    }
  }

  // Post to GitHub PR
  await postPRComment(prNumber, reviewComment);

  return { reviewComment, toolsUsed };
}
```

#### Example 4: Multi-Session Workflow

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { randomUUID } from 'crypto';

async function multiStepAnalysis() {
  const sessionId = randomUUID();

  // Step 1: Initial analysis
  console.log('Step 1: Analyzing...');
  await query({
    prompt: 'Analyze the project structure and identify key components.',
    options: { sessionId }
  }).next(); // Consume all messages

  // Step 2: Deep dive (same session, has context from step 1)
  console.log('Step 2: Deep dive...');
  await query({
    prompt: 'Now focus on the authentication system. How is it implemented?',
    options: {
      sessionId,
      continue: true // Explicitly continue
    }
  }).next();

  // Step 3: Recommendations (still same session)
  console.log('Step 3: Recommendations...');
  const result = query({
    prompt: 'Based on everything we discussed, what improvements do you recommend?',
    options: { sessionId, continue: true }
  });

  for await (const message of result) {
    if (message.type === 'assistant') {
      console.log(message.content);
    }
  }
}
```

### 1.6 Pros, Cons & Limitations

#### Pros ✅

1. **Official & Supported**: Maintained by Anthropic, follows best practices
2. **Zero Boilerplate**: Ready to use with minimal setup
3. **Full Tool Access**: Inherits all Claude Code tools (file ops, bash, search, etc.)
4. **Automatic Context**: Manages conversation history transparently
5. **Type Safety**: Full TypeScript support with strong typing
6. **Session Management**: Built-in session persistence and resumption
7. **Error Handling**: Robust error recovery and interruption handling
8. **Flexible Permissions**: Granular control over tool usage
9. **Streaming**: Real-time async streaming of responses
10. **CI/CD Friendly**: Works well in automated pipelines with `bypassPermissions`

#### Cons ❌

1. **New Session Per Query**: Can't inject into existing interactive session
2. **Subprocess Overhead**: Spawns full Claude Code process (higher resource usage)
3. **Requires Subscription**: Need Claude Pro/Max for most use cases
4. **API Rate Limits**: Subject to Anthropic API limits
5. **Network Dependency**: Requires internet connection for API calls
6. **Limited Control**: Can't modify internal Claude Code behavior
7. **Black Box**: Can't customize tool implementation
8. **Cost**: API calls incur usage costs

#### Limitations ⚠️

- **No Live Session Injection**: Cannot inject into running interactive Claude session
- **Process Lifecycle**: Each query is independent unless explicitly using sessions
- **API Key Management**: Need to securely store and rotate credentials
- **Version Coupling**: SDK version must match Claude Code version
- **Platform Requirements**: Node.js 18+ required (no browser support)
- **Debugging**: Harder to debug than native Claude Code session
- **No Custom Tools**: Can't add your own tools (must use MCP for that)

#### Best Use Cases 🎯

- **Batch Processing**: Analyze multiple codebases, repos, or PRs
- **CI/CD Integration**: Automated PR reviews, test generation, deployment checks
- **Scheduled Tasks**: Nightly security scans, weekly code quality reports
- **Custom Agents**: Build specialized agents for specific domains
- **API Wrappers**: Expose Claude Code capabilities via REST API
- **Data Pipelines**: Process code/docs and feed into downstream systems

---

## 2. Custom MCP Server Deep Dive

### 2.1 MCP Protocol Overview

The **Model Context Protocol (MCP)** is an open standard for connecting AI applications to external systems. Think of it as "USB-C for AI" - a universal interface for exposing tools, data, and capabilities to LLMs.

**Core Concepts:**

```
┌─────────────────────────────────────────────────────────┐
│                   MCP Client                             │
│              (Claude Code, Claude.ai,                    │
│               VS Code, Cursor, etc.)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ MCP Protocol
                     │ (JSON-RPC 2.0)
                     │
┌────────────────────▼────────────────────────────────────┐
│                   MCP Server                             │
│  ┌────────────────────────────────────────────────┐    │
│  │  Tools:  Functions the AI can invoke           │    │
│  │  Resources:  Data/content the AI can read      │    │
│  │  Prompts:  Pre-defined prompt templates        │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Your Custom Logic:                                     │
│  - Database connections                                 │
│  - API integrations                                     │
│  - File systems                                         │
│  - External services                                    │
│  - ANYTHING YOU WANT                                    │
└─────────────────────────────────────────────────────────┘
```

**MCP is NOT:**
- A way to modify Claude's behavior
- A training or fine-tuning mechanism
- A prompt engineering framework
- Limited to code-related tasks

**MCP IS:**
- A standardized protocol (JSON-RPC 2.0)
- Stateless request-response communication
- Extensible with custom tools
- Transport-agnostic (stdio, HTTP, SSE, WebSocket)
- Language-agnostic (implement in any language)

### 2.2 Architecture & Design

#### Transport Protocols

MCP supports multiple transport mechanisms:

**1. stdio (Standard Input/Output)**
- Process-to-process communication
- Client spawns server as subprocess
- JSON messages over stdin/stdout
- **Best for:** Local integrations, simple servers

```bash
# Claude Code spawns MCP server like this:
pnpx @example/mcp-server
```

**2. SSE (Server-Sent Events)**
- HTTP-based unidirectional streaming
- Client connects to server URL
- Server pushes events to client
- **Best for:** Remote servers, webhooks, pub/sub patterns

```json
{
  "mcpServers": {
    "remote-server": {
      "url": "https://api.example.com/mcp",
      "transport": "sse"
    }
  }
}
```

**3. HTTP (Streamable HTTP)**
- Bidirectional HTTP requests
- Can be stateless or session-based
- Standard REST-like interface
- **Best for:** Web services, cloud deployments, scalable architectures

```json
{
  "mcpServers": {
    "web-server": {
      "url": "https://mcp.example.com",
      "transport": "http"
    }
  }
}
```

#### Message Flow

```
┌──────────────┐                              ┌──────────────┐
│ Claude Code  │                              │  MCP Server  │
└──────┬───────┘                              └──────┬───────┘
       │                                             │
       │  1. Initialize Connection                  │
       ├────────────────────────────────────────────▶
       │     {"jsonrpc":"2.0","method":"initialize"}│
       │                                             │
       │  2. Server Capabilities                    │
       │◀────────────────────────────────────────────┤
       │     {tools: [...], resources: [...]}       │
       │                                             │
       │  3. List Tools (optional)                  │
       ├────────────────────────────────────────────▶
       │     {"method":"tools/list"}                │
       │                                             │
       │  4. Tool Definitions                       │
       │◀────────────────────────────────────────────┤
       │     [{name:"inject_prompt", schema:{...}}] │
       │                                             │
       │  [AI decides to use tool]                  │
       │                                             │
       │  5. Call Tool                              │
       ├────────────────────────────────────────────▶
       │     {"method":"tools/call",                │
       │      "params":{name:"inject_prompt",       │
       │                arguments:{...}}}            │
       │                                             │
       │  6. Tool Result                            │
       │◀────────────────────────────────────────────┤
       │     {content: [{type:"text",text:"..."}]}  │
       │                                             │
```

### 2.3 Server Implementation

#### Basic Server Structure (TypeScript)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 1. Create server instance
const server = new Server(
  {
    name: 'prompt-injection-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}, // We expose tools
    },
  }
);

// 2. Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'inject_prompt',
        description: 'Inject a prompt into Claude Code for processing',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt to inject',
            },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'urgent'],
              description: 'Execution priority',
            },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

// 3. Implement tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'inject_prompt') {
    const { prompt, priority = 'normal' } = request.params.arguments;

    // Your custom logic here
    const result = await processPrompt(prompt, priority);

    return {
      content: [
        {
          type: 'text',
          text: `Prompt queued: ${result.queueId}\nEstimated processing: ${result.eta}`,
        },
      ],
    };
  }

  throw new Error('Unknown tool');
});

// 4. Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### Advanced: Queue-Based Prompt Injection

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

// Queue for prompt injection
class PromptQueue extends EventEmitter {
  private queue: Array<{ id: string; prompt: string; priority: number; timestamp: number }> = [];
  private processing = false;

  async enqueue(prompt: string, priority: 'low' | 'normal' | 'high' | 'urgent') {
    const priorityMap = { low: 0, normal: 1, high: 2, urgent: 3 };
    const id = `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.queue.push({
      id,
      prompt,
      priority: priorityMap[priority],
      timestamp: Date.now(),
    });

    // Sort by priority (descending), then timestamp (ascending)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    this.emit('enqueued', { id, queueLength: this.queue.length });
    this.processNext();

    return { queueId: id, position: this.queue.findIndex(item => item.id === id) + 1 };
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const item = this.queue.shift()!;

    try {
      // Write to file that Claude Code monitors
      const queueFile = '/tmp/claude-prompt-queue.jsonl';
      await fs.appendFile(
        queueFile,
        JSON.stringify({ ...item, status: 'processing' }) + '\n'
      );

      this.emit('processing', item);

      // Could also:
      // - Send to external API
      // - Trigger webhook
      // - Write to database
      // - Publish to message queue

    } catch (error) {
      this.emit('error', { item, error });
    } finally {
      this.processing = false;
      // Process next item
      setTimeout(() => this.processNext(), 100);
    }
  }
}

const promptQueue = new PromptQueue();

// Create MCP server with queue integration
const server = new Server({
  name: 'queue-injection-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} },
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'inject_prompt',
      description: 'Add prompt to processing queue',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'check_queue',
      description: 'Check prompt queue status',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'inject_prompt': {
      const { prompt, priority = 'normal' } = request.params.arguments;
      const result = await promptQueue.enqueue(prompt, priority);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Prompt queued\nQueue ID: ${result.queueId}\nPosition: ${result.position}`,
          },
        ],
      };
    }

    case 'check_queue': {
      const status = {
        queueLength: promptQueue.queue.length,
        processing: promptQueue.processing,
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error('Unknown tool');
  }
});
```

### 2.4 Tool Registration & Invocation

#### Tool Schema Design

MCP tools use JSON Schema for input validation:

```typescript
{
  name: 'inject_prompt',
  description: 'A clear, concise description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt text to inject',
        minLength: 1,
        maxLength: 10000,
      },
      target: {
        type: 'string',
        enum: ['current-session', 'new-session', 'background'],
        description: 'Where to inject the prompt',
        default: 'new-session',
      },
      metadata: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          timestamp: { type: 'number' },
          user: { type: 'string' },
        },
      },
    },
    required: ['prompt'],
  },
}
```

#### How Claude Code Invokes Tools

1. **Discovery**: Claude Code calls `tools/list` on server startup
2. **AI Decision**: Claude's AI model decides when to use a tool based on:
   - Tool name and description
   - Input schema
   - Current conversation context
3. **Validation**: Claude Code validates arguments against schema
4. **Execution**: Claude Code calls `tools/call` with tool name and arguments
5. **Result Processing**: Server returns result, Claude incorporates into response

**Important**: Claude decides WHETHER to use the tool. You can't force it to call your tool - you can only make it likely by:
- Clear, relevant tool descriptions
- Appropriate naming
- Providing context in the conversation that suggests tool usage
- Using slash commands or @-mentions if available

### 2.5 Implementation Examples

#### Example 1: Simple HTTP MCP Server

```typescript
// server.ts
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';

const app = express();
app.use(express.json());

const mcpServer = new Server({
  name: 'http-injection-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} },
});

// Tool registration (same as before)
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'inject_prompt',
    description: 'Inject a prompt for processing',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
      },
      required: ['prompt'],
    },
  }],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'inject_prompt') {
    const { prompt } = request.params.arguments;

    // Store prompt in database, queue, file, etc.
    await storePrompt(prompt);

    return {
      content: [{ type: 'text', text: `Prompt stored: ${prompt.substring(0, 50)}...` }],
    };
  }
});

// HTTP endpoint for MCP protocol
app.post('/mcp', async (req, res) => {
  const transport = new HttpServerTransport(req, res);
  await mcpServer.connect(transport);
});

// REST API for external systems to trigger prompts
app.post('/api/prompts', async (req, res) => {
  const { prompt, source } = req.body;
  const result = await storePrompt(prompt, { source });
  res.json({ success: true, promptId: result.id });
});

app.listen(3000, () => {
  console.log('MCP Server running on http://localhost:3000');
});
```

**Claude Code Configuration:**
```json
{
  "mcpServers": {
    "injection-server": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    }
  }
}
```

#### Example 2: Webhook-Triggered Injection

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import express from 'express';
import * as crypto from 'crypto';

const app = express();
app.use(express.json());

// In-memory store (use Redis/DB in production)
const pendingPrompts = new Map<string, {
  prompt: string;
  source: string;
  timestamp: number;
  processed: boolean;
}>();

// Webhook endpoint (e.g., from GitHub, Slack, Jenkins)
app.post('/webhook/github', async (req, res) => {
  const { action, pull_request } = req.body;

  if (action === 'opened' || action === 'synchronize') {
    const prompt = `Review PR #${pull_request.number}: ${pull_request.title}

    Changes: ${pull_request.changed_files} files
    URL: ${pull_request.html_url}

    Please analyze the code changes and provide review comments.`;

    const id = crypto.randomUUID();
    pendingPrompts.set(id, {
      prompt,
      source: 'github-webhook',
      timestamp: Date.now(),
      processed: false,
    });

    res.json({ success: true, promptId: id });
  }
});

// MCP Server exposes tool to retrieve pending prompts
const mcpServer = new Server({
  name: 'webhook-injection-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} },
});

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_pending_prompts',
      description: 'Retrieve prompts triggered by webhooks',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 },
        },
      },
    },
    {
      name: 'mark_processed',
      description: 'Mark a prompt as processed',
      inputSchema: {
        type: 'object',
        properties: {
          promptId: { type: 'string' },
        },
        required: ['promptId'],
      },
    },
  ],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'get_pending_prompts') {
    const { limit = 10 } = request.params.arguments;

    const pending = Array.from(pendingPrompts.entries())
      .filter(([_, p]) => !p.processed)
      .slice(0, limit)
      .map(([id, p]) => `[${id}] ${p.source}: ${p.prompt.substring(0, 100)}...`);

    return {
      content: [{
        type: 'text',
        text: pending.length > 0
          ? `Pending prompts:\n${pending.join('\n\n')}`
          : 'No pending prompts',
      }],
    };
  }

  if (request.params.name === 'mark_processed') {
    const { promptId } = request.params.arguments;
    const prompt = pendingPrompts.get(promptId);

    if (prompt) {
      prompt.processed = true;
      return {
        content: [{ type: 'text', text: `Marked ${promptId} as processed` }],
      };
    }
  }
});
```

#### Example 3: Scheduled Prompt Injection

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as cron from 'node-cron';
import * as fs from 'fs/promises';

// Queue for scheduled prompts
const scheduledPrompts: Array<{
  id: string;
  prompt: string;
  schedule: string; // cron expression
  nextRun: Date;
  enabled: boolean;
}> = [];

// Load from config file
async function loadScheduledPrompts() {
  try {
    const data = await fs.readFile('scheduled-prompts.json', 'utf-8');
    const prompts = JSON.parse(data);

    prompts.forEach((p: any) => {
      scheduledPrompts.push(p);

      // Set up cron job
      if (p.enabled) {
        cron.schedule(p.schedule, async () => {
          await triggerPrompt(p.id, p.prompt);
        });
      }
    });
  } catch (error) {
    console.error('Failed to load scheduled prompts:', error);
  }
}

async function triggerPrompt(id: string, prompt: string) {
  // Write to queue file that Claude monitors
  await fs.appendFile(
    '/tmp/claude-scheduled-prompts.jsonl',
    JSON.stringify({ id, prompt, timestamp: Date.now() }) + '\n'
  );
}

// MCP Server
const server = new Server({
  name: 'scheduled-injection-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} },
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_scheduled_prompts',
      description: 'List all scheduled prompt jobs',
      inputSchema: { type: 'object' },
    },
    {
      name: 'add_scheduled_prompt',
      description: 'Add a new scheduled prompt (cron format)',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          schedule: { type: 'string', description: 'Cron expression (e.g., "0 9 * * *")' },
        },
        required: ['prompt', 'schedule'],
      },
    },
  ],
}));

await loadScheduledPrompts();
```

**Example scheduled-prompts.json:**
```json
[
  {
    "id": "daily-security-scan",
    "prompt": "Run security scan on all repositories and report vulnerabilities",
    "schedule": "0 2 * * *",
    "enabled": true
  },
  {
    "id": "weekly-code-review",
    "prompt": "Review code quality metrics and suggest improvements",
    "schedule": "0 9 * * 1",
    "enabled": true
  }
]
```

### 2.6 Pros, Cons & Limitations

#### Pros ✅

1. **Maximum Flexibility**: Build ANY tool you can imagine
2. **Integration Hub**: Connect to databases, APIs, webhooks, schedulers
3. **Language Agnostic**: Implement in Python, Go, Rust, JavaScript, etc.
4. **Scalable Architecture**: HTTP/SSE transports enable cloud deployment
5. **Reusable**: One server can serve multiple clients (Claude Code, Claude.ai, VS Code)
6. **Event-Driven**: Can respond to external triggers (webhooks, cron, file watchers)
7. **Custom Logic**: Full control over tool implementation
8. **No API Costs**: Server runs on your infrastructure
9. **Offline Capable**: stdio transport works without internet
10. **Standard Protocol**: Future-proof, vendor-neutral

#### Cons ❌

1. **High Complexity**: Requires building and maintaining server infrastructure
2. **Protocol Knowledge**: Must understand MCP spec and JSON-RPC
3. **Indirect Control**: Can't FORCE Claude to use your tool (AI decides)
4. **Configuration Overhead**: Must register server in Claude Code settings
5. **Debugging Difficulty**: Harder to debug than direct SDK calls
6. **No Built-in Auth**: Must implement your own authentication/authorization
7. **Version Management**: Must handle protocol version compatibility
8. **Operational Burden**: Server uptime, monitoring, logging, error handling

#### Limitations ⚠️

- **AI-Dependent**: Claude must decide to invoke your tool
- **No Direct Injection**: Can't inject prompts without Claude calling tool first
- **Workaround Required**: Need polling, file monitoring, or user triggers
- **Stateless Protocol**: Each request is independent (must manage state externally)
- **Schema Constraints**: Input/output must conform to JSON Schema
- **No Streaming Output**: Tool results are atomic (no streaming)
- **Permission Model**: Subject to Claude Code's permission system
- **Discovery Delay**: Tools only discovered at session start

#### Best Use Cases 🎯

- **External Service Integration**: Connect Claude to databases, APIs, SaaS tools
- **Custom Data Access**: Expose proprietary data sources to Claude
- **Workflow Automation**: Trigger prompts from external events (CI/CD, webhooks)
- **Multi-Client Scenarios**: One server serves Claude Code, Claude.ai, and custom apps
- **Enterprise Deployments**: Central MCP server for entire organization
- **Specialized Tools**: Domain-specific tools (legal, medical, financial)
- **Hybrid Architectures**: Combine with SDK for complex workflows

---

## 3. Side-by-Side Comparison

### 3.1 Architecture Differences

| Aspect | Claude Agent SDK | Custom MCP Server |
|--------|------------------|-------------------|
| **Architecture** | Direct process invocation | Client-server protocol |
| **Communication** | Stdin/stdout with subprocess | JSON-RPC over stdio/HTTP/SSE |
| **Coupling** | Tightly coupled to Claude Code | Loosely coupled, reusable |
| **Deployment** | Library in your app | Separate server process |
| **State Management** | Managed by SDK | You manage state |
| **Tool Access** | All Claude Code tools | Only tools you implement |

**Visual Comparison:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE AGENT SDK                            │
│                                                                  │
│  Your App ──calls──▶ SDK ──spawns──▶ Claude Code ──API──▶ LLM  │
│                       │                                          │
│                       └──── Direct Control ────┘                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOM MCP SERVER                            │
│                                                                  │
│  External Event ──triggers──▶ MCP Server ──stores──▶ Queue      │
│                                    │                             │
│  Claude Code ──discovers──▶ MCP Server ──invokes tool──▶        │
│       │                            │                             │
│       └────── reads queue ─────────┘                            │
│       │                                                          │
│       └──── API ────▶ LLM                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Complexity & Learning Curve

**Claude Agent SDK:**
- ⭐⭐☆☆☆ **Setup Complexity**: `npm install` and set API key
- ⭐⭐⭐☆☆ **Code Complexity**: Straightforward async/await patterns
- ⭐⭐☆☆☆ **Learning Curve**: Familiar to JavaScript/TypeScript developers
- ⭐☆☆☆☆ **Operational Complexity**: Just run your script

**Custom MCP Server:**
- ⭐⭐⭐⭐☆ **Setup Complexity**: Server setup, transport config, registration
- ⭐⭐⭐⭐☆ **Code Complexity**: JSON-RPC, schema validation, handler logic
- ⭐⭐⭐⭐☆ **Learning Curve**: Must understand MCP spec, protocol patterns
- ⭐⭐⭐⭐⭐ **Operational Complexity**: Server deployment, monitoring, scaling

**Time to First Working Prototype:**
- SDK: **30 minutes** (install, auth, write script)
- MCP: **4-8 hours** (understand protocol, implement server, test, configure)

### 3.3 Integration Patterns

#### Pattern 1: Direct Automation (SDK)

```typescript
// Immediate execution, full control
const result = await query({
  prompt: 'Analyze codebase'
});
```

**Use when:**
- You control the timing
- No external triggers needed
- Batch processing workflows
- CI/CD pipelines

#### Pattern 2: Event-Driven (MCP)

```typescript
// Webhook → MCP Server → Claude discovers → Claude invokes tool
app.post('/webhook', (req, res) => {
  queue.add(req.body.prompt);
  res.json({ queued: true });
});
```

**Use when:**
- External systems trigger prompts
- Async, event-driven architecture
- Multiple trigger sources
- Shared infrastructure

#### Pattern 3: Hybrid (SDK + MCP)

```typescript
// SDK orchestrates, MCP provides custom tools
const result = await query({
  prompt: 'Check prompt queue and process top priority item',
  options: {
    mcpConfig: ['./queue-server-config.json']
  }
});
```

**Use when:**
- Need both immediate execution AND custom tools
- Complex multi-step workflows
- Best of both worlds

### 3.4 Performance Characteristics

| Metric | Claude Agent SDK | Custom MCP Server |
|--------|------------------|-------------------|
| **Latency** | ~2-5s (process spawn + API) | ~100-500ms (tool call) + SDK overhead |
| **Throughput** | Limited by API rate limits | Limited by server capacity |
| **Memory** | ~200MB per Claude Code instance | ~50MB MCP server (varies) |
| **Concurrency** | Multiple SDK instances | Single server, many clients |
| **Scalability** | Horizontal (more machines) | Vertical + Horizontal |
| **Network** | Always requires internet | stdio: no network needed |

**Benchmark Example (rough estimates):**

```
Scenario: Process 100 prompts

SDK Approach:
- Serial: 100 × 5s = 500s (~8 minutes)
- Parallel (10 workers): 100 ÷ 10 × 5s = 50s

MCP Approach:
- Depends on how often Claude checks queue
- If polling every 10s: 100 × 10s = 1000s (~17 minutes)
- If using slash command: ~50s (similar to SDK)
- If webhook + immediate processing: ~50s
```

### 3.5 Security Considerations

#### Claude Agent SDK

**Threats:**
- ✅ API key exposure (store in env vars, use secrets management)
- ✅ Subprocess injection (validate all inputs)
- ✅ File system access (use `additionalDirectories` restrictions)
- ✅ Tool permissions (use allowedTools/disallowedTools)

**Best Practices:**
```typescript
const result = query({
  prompt: sanitizeInput(userPrompt), // Never trust user input
  options: {
    allowedTools: ['Read'], // Minimal permissions
    disallowedTools: ['Bash'], // Deny dangerous tools
    permissionMode: 'default', // Always ask for destructive operations
  }
});
```

#### Custom MCP Server

**Threats:**
- ⚠️ Unauthenticated access (implement auth middleware)
- ⚠️ Tool abuse (rate limit, validate inputs)
- ⚠️ Injection attacks (sanitize all inputs)
- ⚠️ Resource exhaustion (limit queue size, timeout long operations)
- ⚠️ Data leakage (don't expose sensitive info in tool results)

**Best Practices:**
```typescript
// Authentication
app.use('/mcp', (req, res, next) => {
  if (!validateToken(req.headers.authorization)) {
    return res.status(401).send('Unauthorized');
  }
  next();
});

// Input validation
if (request.params.name === 'inject_prompt') {
  const { prompt } = request.params.arguments;

  // Sanitize
  if (typeof prompt !== 'string' || prompt.length > 10000) {
    throw new Error('Invalid prompt');
  }

  // Rate limit
  if (await isRateLimited(userId)) {
    throw new Error('Rate limit exceeded');
  }

  // Process safely
  const result = await safelyProcessPrompt(prompt);
}
```

---

## 4. Decision Matrix

### Choose **Claude Agent SDK** if:

✅ You need immediate, programmatic control
✅ Building batch processing pipelines
✅ CI/CD integration (PR reviews, test generation)
✅ Scheduled tasks (cron jobs, nightly scans)
✅ Want minimal setup and maintenance
✅ Don't need custom tools beyond built-ins
✅ Okay with API costs and rate limits
✅ TypeScript/JavaScript ecosystem

**Example Scenarios:**
- "Analyze all PRs opened today and post review comments"
- "Generate test cases for every new function added this week"
- "Nightly security scan of all repositories"

### Choose **Custom MCP Server** if:

✅ Need to integrate with external systems (databases, APIs)
✅ Event-driven architecture (webhooks, pub/sub)
✅ Custom, domain-specific tools
✅ Multiple clients will use your tools
✅ Want to minimize API costs (server runs locally)
✅ Building enterprise-wide AI infrastructure
✅ Need fine-grained control over tool logic
✅ Can invest in server development/operations

**Example Scenarios:**
- "Connect Claude to our internal CRM database"
- "Trigger code reviews when GitHub webhook fires"
- "Expose proprietary data analysis tools to Claude"
- "Build tool suite for entire engineering org"

### Choose **Hybrid (Both)** if:

✅ Complex workflows with multiple stages
✅ Need both immediate execution AND custom tools
✅ SDK orchestrates, MCP provides specialized capabilities
✅ Want flexibility to choose per use case

**Example Scenario:**
- "SDK runs nightly scan → calls MCP tool to fetch data from internal DB → SDK processes results → SDK calls MCP tool to file tickets in Jira"

---

## 5. Hybrid Approach

The most powerful solution combines both approaches:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Layer                       │
│                  (Claude Agent SDK)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Scheduled Tasks                                   │    │
│  │  CI/CD Integration                                 │    │
│  │  Batch Processing                                  │    │
│  └─────────────────┬──────────────────────────────────┘    │
└────────────────────┼───────────────────────────────────────┘
                     │
                     │ spawns Claude Code with MCP config
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code                             │
│                                                              │
│  Built-in Tools: Read, Write, Edit, Bash, Grep, Glob       │
│         +                                                    │
│  Custom MCP Tools (via connected servers)                   │
└────────┬────────────────────────────────┬───────────────────┘
         │                                │
         │                                │
    ┌────▼────────┐                  ┌────▼──────────┐
    │  MCP Server │                  │  MCP Server   │
    │  (Internal  │                  │  (External    │
    │   Data)     │                  │   Services)   │
    └─────────────┘                  └───────────────┘
```

### Implementation

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Configure MCP servers for custom tools
const mcpConfig = [
  './mcp-servers/internal-db.json',    // Access internal databases
  './mcp-servers/jira-integration.json', // File tickets
  './mcp-servers/slack-notifier.json',  // Send notifications
];

async function hybridWorkflow() {
  const result = query({
    prompt: `
    Complete this multi-step workflow:

    1. Analyze codebase for security issues
    2. Query internal vulnerability database (use 'query_vuln_db' tool)
    3. Generate detailed report
    4. File high-priority issues in Jira (use 'create_jira_ticket' tool)
    5. Notify team in Slack (use 'send_slack_message' tool)
    `,
    options: {
      mcpConfig,
      allowedTools: [
        'Read', 'Grep', 'Glob',  // Built-in tools for code analysis
        'query_vuln_db',         // Custom MCP tool
        'create_jira_ticket',    // Custom MCP tool
        'send_slack_message',    // Custom MCP tool
      ],
      model: 'opus', // Use most capable model
    }
  });

  for await (const message of result) {
    if (message.type === 'tool_use') {
      console.log(`Using tool: ${message.name}`);
    }
  }
}

// Schedule via cron
hybridWorkflow();
```

### Benefits of Hybrid Approach

1. **Best of Both Worlds**: SDK's ease + MCP's extensibility
2. **Gradual Migration**: Start with SDK, add MCP tools as needed
3. **Clear Separation**: SDK for orchestration, MCP for integration
4. **Reusable Tools**: MCP tools work across all Claude clients
5. **Flexible Deployment**: Run SDK in CI/CD, MCP in dedicated servers

---

## 6. Conclusion

### Summary

| Aspect | Claude Agent SDK | Custom MCP Server |
|--------|------------------|-------------------|
| **Complexity** | Low | High |
| **Flexibility** | Medium | Very High |
| **Setup Time** | 30 minutes | 4-8 hours |
| **Use Case** | Direct automation | Integration & events |
| **Maintenance** | Minimal | Significant |
| **Extensibility** | Limited to built-in tools | Unlimited custom tools |
| **Best For** | Quick automation, CI/CD | Enterprise integration |

### Recommendations

**For most developers starting out:** Use **Claude Agent SDK**
- Faster to prototype
- Lower operational burden
- Sufficient for 80% of use cases

**For enterprise teams:** Build **Custom MCP Server**
- Reusable across organization
- Connects to internal systems
- One-time investment, long-term value

**For power users:** Use **Hybrid Approach**
- SDK for orchestration
- MCP for specialized tools
- Maximum flexibility

### Next Steps

1. **Experiment**: Try SDK first with a simple script
2. **Evaluate**: Determine if built-in tools are sufficient
3. **Extend**: If needed, build MCP server for custom tools
4. **Iterate**: Refine your approach based on real-world usage

### Resources

- **Claude Agent SDK**: https://github.com/anthropics/claude-agent-sdk-typescript
- **MCP Specification**: https://modelcontextprotocol.io
- **Claude Code Docs**: https://docs.claude.com/en/docs/claude-code
- **MCP TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Example MCP Servers**: https://github.com/modelcontextprotocol/servers

---

*Document Version: 1.0*
*Last Updated: 2025-10-13*
*Author: Claude (via Claude Code)*
