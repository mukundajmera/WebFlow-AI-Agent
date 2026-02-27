# BrowserAI Craft - Architecture Documentation

## 1. Executive Summary

BrowserAI Craft is a revolutionary cross-browser AI automation framework designed to transform how users interact with web applications. Unlike traditional automation tools (Selenium, Puppeteer) that rely on brittle selectors and imperative scripting, BrowserAI Craft uses natural language prompts combined with AI-powered visual reasoning to understand and execute complex workflows.

The core innovation lies in its generic adapter pattern—the framework knows nothing about specific websites. All site-specific knowledge is encapsulated in pluggable adapters, allowing the same core engine to automate Canva, Figma, Adobe Express, or any web application without modification to the core codebase.

Key capabilities include:
- **Natural Language Interface**: Users describe what they want ("Create 100 social media posts from this CSV") rather than how to do it
- **Visual Reasoning**: AI analyzes screenshots to understand UI state, locate elements, and verify results
- **Self-Healing**: When selectors break, the system automatically tries alternative strategies (vision, semantic matching)
- **Privacy-First**: Support for local LLMs (Ollama, LM Studio) ensures sensitive data never leaves the user's machine

Target users include marketing teams needing bulk content creation, designers automating repetitive tasks, and automation engineers building robust web workflows.

---

## 2. System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (Chrome Side Panel)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │Prompt Input │ │LLM Selector │ │ Data Upload │ │ Job Queue   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                            │
│  │ Config Panel│ │Progress Bar │ │ Debug Panel │                            │
│  └─────────────┘ └─────────────┘ └─────────────┘                            │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ chrome.runtime.sendMessage()
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│              ORCHESTRATION ENGINE (Background Service Worker)                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Observe → Think → Act → Verify                    │   │
│  │                         (Execution Loop)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │  Task Planner  │  │ State Manager  │  │ Prompt Parser  │               │
│  │  (NL → Tasks)  │  │  (Persistence) │  │  (Intent)      │               │
│  └────────────────┘  └────────────────┘  └────────────────┘               │
└───┬─────────────┬──────────────┬──────────────┬──────────────────────────┘
    │             │              │              │
    ↓             ↓              ↓              ↓
┌────────┐  ┌────────────┐  ┌──────────────┐  ┌───────────────┐
│  LLM   │  │   Vision   │  │   Browser    │  │    Adapter    │
│Adapter │  │   Agent    │  │    Agent     │  │   Registry    │
└───┬────┘  └─────┬──────┘  └──────┬───────┘  └───────┬───────┘
    │             │                │                  │
    ↓             ↓                ↓                  ↓
┌────────┐  ┌────────────┐  ┌──────────────┐  ┌───────────────┐
│ Groq   │  │ Screenshot │  │  MCP Server  │  │ Canva/Figma   │
│Ollama  │  │ GPT-4V     │  │  Playwright  │  │  Adapters     │
│LMStudio│  │ LLaVA      │  │  DOM Actions │  │ Knowledge Base│
│WebLLM  │  │            │  │              │  │               │
└────────┘  └────────────┘  └──────────────┘  └───────────────┘
```

---

## 3. Component Architecture

### A. Orchestration Engine

**Purpose**: Central controller that coordinates all automation activities, implementing the Observe-Think-Act-Verify loop.

**Responsibilities**:
- Parse user prompts into executable task plans
- Manage execution state and job queue
- Coordinate between LLM, Vision, and Browser agents
- Handle error recovery and retry logic
- Emit progress events to UI

**Interfaces**:
```typescript
interface OrchestrationEngine {
  execute(prompt: string, config: JobConfig): Promise<Job>
  pauseJob(jobId: string): Promise<void>
  resumeJob(jobId: string): Promise<void>
  cancelJob(jobId: string): Promise<void>
  getJobStatus(jobId: string): Promise<JobStatus>
}
```

**Dependencies**: LLMAdapter, VisionAgent, BrowserAgent, AdapterRegistry, StateManager

### B. LLM Adapter

**Purpose**: Unified interface for multiple LLM providers, abstracting away provider-specific APIs.

**Responsibilities**:
- Manage connections to cloud (Groq, Deepseek) and local (Ollama, LM Studio) LLMs
- Handle text generation, vision tasks, and tool calling
- Implement fallback chains when primary provider fails
- Cache responses for identical prompts

**Interfaces**:
```typescript
interface LLMAdapter {
  generate(messages: LLMMessage[], options?: GenerateOptions): Promise<LLMResponse>
  generateWithVision(messages: LLMMessage[], image: string): Promise<LLMResponse>
  generateWithTools(messages: LLMMessage[], tools: Tool[]): Promise<LLMResponse>
  setProvider(provider: LLMProvider): void
}
```

**Dependencies**: Provider configurations, API keys

### C. Vision Agent

**Purpose**: Multimodal AI component for visual understanding of web pages.

**Responsibilities**:
- Analyze screenshots to locate UI elements
- Verify task completion through visual inspection
- Score aesthetic matches for template selection
- Generate element descriptions for self-healing

**Interfaces**:
```typescript
interface VisionAgent {
  locateElement(screenshot: string, description: string): Promise<ElementLocation>
  verifyCompletion(screenshot: string, task: Task): Promise<VerificationResult>
  scoreAesthetics(screenshot: string): Promise<AestheticScore>
  describeScreen(screenshot: string): Promise<VisionResult>
}
```

**Dependencies**: LLMAdapter (vision-capable model), Screenshot utilities

### D. Browser Agent

**Purpose**: Execute actions on web pages through DOM manipulation or MCP server.

**Responsibilities**:
- Execute browser actions (click, type, scroll, navigate)
- Capture screenshots
- Monitor DOM state changes
- Implement self-healing selector strategies

**Interfaces**:
```typescript
interface BrowserAgent {
  executeAction(action: BrowserAction): Promise<ActionResult>
  captureScreenshot(options?: ScreenshotOptions): Promise<Screenshot>
  getDOMState(): Promise<DOMState>
  waitForCondition(condition: WaitCondition): Promise<boolean>
}
```

**Dependencies**: MCP client, Content script messaging

### E. Adapter Registry

**Purpose**: Manage website-specific adapters and load appropriate logic based on current URL.

**Responsibilities**:
- Detect current website and load matching adapter
- Provide adapter knowledge (selectors, workflows)
- Enable adapter hot-swapping when user navigates
- Validate adapter compatibility

**Interfaces**:
```typescript
interface AdapterRegistry {
  getAdapter(url: string): BaseAdapter
  registerAdapter(adapter: BaseAdapter): void
  listAdapters(): string[]
  isSupported(url: string): boolean
}
```

**Dependencies**: Adapter implementations

### F. State Manager

**Purpose**: Persist job state across browser sessions using Chrome Storage API.

**Responsibilities**:
- Save and restore job state
- Track job history
- Manage storage limits (cleanup old jobs)
- Handle concurrent state updates

**Interfaces**:
```typescript
interface StateManager {
  saveJob(job: Job): Promise<void>
  loadJob(jobId: string): Promise<Job | null>
  listJobs(filter?: JobFilter): Promise<Job[]>
  deleteJob(jobId: string): Promise<void>
  clearHistory(): Promise<void>
}
```

**Dependencies**: Chrome Storage API

### G. Data Connectors

**Purpose**: Load and parse data from various sources (CSV, Google Sheets).

**Responsibilities**:
- Parse CSV files with robust error handling
- Authenticate and fetch Google Sheets data
- Validate data against expected schema
- Transform data for use in workflows

**Interfaces**:
```typescript
interface DataConnector {
  parse(source: DataSource): Promise<ParsedData>
  validate(data: ParsedData, schema?: DataSchema): ValidationResult
  getHeaders(source: DataSource): Promise<string[]>
}
```

**Dependencies**: PapaParse, Google APIs

---

## 4. Data Flow Diagrams

### Scenario A: Single Design Generation

```
User enters prompt: "Create a social media post for our summer sale"
                           │
                           ↓
              ┌─────────────────────────┐
              │    PROMPT PARSER        │
              │ Extract: action=create  │
              │ style="social media"    │
              │ exportFormat=default    │
              └────────────┬────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │    ADAPTER REGISTRY     │
              │ Detect: canva.com       │
              │ Load: CanvaAdapter      │
              └────────────┬────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │     TASK PLANNER        │
              │ 1. Navigate to Canva    │
              │ 2. Search template      │
              │ 3. Select template      │
              │ 4. Edit text            │
              │ 5. Export design        │
              └────────────┬────────────┘
                           │
                           ↓
         ┌─────────────────────────────────────┐
         │         EXECUTION LOOP              │
         │  ┌─────────────────────────────┐   │
         │  │ OBSERVE: Screenshot + DOM   │   │
         │  └──────────────┬──────────────┘   │
         │                 ↓                   │
         │  ┌─────────────────────────────┐   │
         │  │ THINK: LLM analyzes state   │   │
         │  │ Decides next action         │   │
         │  └──────────────┬──────────────┘   │
         │                 ↓                   │
         │  ┌─────────────────────────────┐   │
         │  │ ACT: Browser executes       │   │
         │  │ Click/Type/Navigate         │   │
         │  └──────────────┬──────────────┘   │
         │                 ↓                   │
         │  ┌─────────────────────────────┐   │
         │  │ VERIFY: Vision checks       │   │
         │  │ Action completed?           │   │
         │  └──────────────┬──────────────┘   │
         │                 │                   │
         │                 ↓                   │
         │         Next task or Done           │
         └─────────────────────────────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │    UPDATE UI            │
              │ Progress: 100%          │
              │ Result: Export URL      │
              └─────────────────────────┘
```

### Scenario B: Bulk Generation from CSV

```
User uploads CSV (100 rows) + prompt: "Create posts for each row"
                           │
                           ↓
              ┌─────────────────────────┐
              │      CSV PARSER         │
              │ Validate: headers match │
              │ Count: 100 rows         │
              │ Map: columns to fields  │
              └────────────┬────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │     TASK PLANNER        │
              │ Strategy: Sequential    │
              │ Tasks per row:          │
              │   - Duplicate template  │
              │   - Replace values      │
              │   - Export              │
              │ Total: 300 tasks        │
              └────────────┬────────────┘
                           │
                           ↓
         ┌─────────────────────────────────────┐
         │       BATCH EXECUTION LOOP          │
         │                                     │
         │  FOR each row in CSV:               │
         │    1. Load row data into context    │
         │    2. Execute task sequence         │
         │    3. Store result                  │
         │    4. Update progress (1/100...)    │
         │                                     │
         │  Handle errors:                     │
         │    - Retry failed rows              │
         │    - Skip if max retries reached    │
         │    - Log error with context         │
         └─────────────────────────────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │   BATCH EXPORT          │
              │ 97 successful           │
              │ 3 failed (logged)       │
              │ Download: designs.zip   │
              └─────────────────────────┘
```

### Scenario C: Self-Healing Recovery

```
Action fails: Click on "Export" button
                           │
                           ↓
              ┌─────────────────────────┐
              │   CAPTURE FAILURE       │
              │ Error: Element not found│
              │ Selector: #export-btn   │
              │ Screenshot: [captured]  │
              └────────────┬────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │   LLM ANALYZES ERROR    │
              │ Context: screenshot +   │
              │ selector + error message│
              │ Output: recovery plan   │
              └────────────┬────────────┘
                           │
                           ↓
         ┌─────────────────────────────────────┐
         │      RECOVERY CHAIN                 │
         │                                     │
         │  Try 1: Alternative CSS selector    │
         │    → button[aria-label="Export"]    │
         │    → Result: NOT FOUND              │
         │                                     │
         │  Try 2: Vision-based location       │
         │    → "Find blue Export button"      │
         │    → Result: Found at (850, 120)    │
         │    → Click at coordinates           │
         │    → Result: SUCCESS                │
         │                                     │
         │  Log: Recovery successful           │
         │  Update: selector cache             │
         └─────────────────────────────────────┘
                           │
                           ↓
              ┌─────────────────────────┐
              │   CONTINUE EXECUTION    │
              │ Mark task complete      │
              │ Proceed to next task    │
              └─────────────────────────┘
```

---

## 5. Technology Stack with Rationale

| Component | Technology | Rationale | Alternatives Considered |
|-----------|-----------|-----------|------------------------|
| Framework | Plasmo | Cross-browser, React support, hot reload, Manifest V3 ready | Vanilla Chrome API (too verbose), WXT (less mature) |
| Language | TypeScript 5.x | Type safety, IDE support, scales well | JavaScript (too error-prone at scale) |
| UI Framework | React 18 | Component reuse, large ecosystem, concurrent features | Vue (less team experience), Svelte (smaller ecosystem) |
| Styling | Tailwind CSS | Rapid development, consistent design, small bundle | CSS-in-JS (runtime overhead), Sass (more boilerplate) |
| State Management | Zustand | Lightweight (<1KB), TypeScript-first, minimal boilerplate | Redux (too complex), Context API (performance issues) |
| LLM - Free Cloud | Groq | Fast inference, free tier, Llama 3.3 70B available | OpenAI (expensive), Claude (no free tier) |
| LLM - Local | Ollama + LM Studio | Privacy, offline capability, user likely has setup | LocalAI (less mature), Llama.cpp (too low-level) |
| Vision Model | LLaVA 13B (local), GPT-4V (cloud) | Best multimodal performance for the task | Qwen2-VL (harder setup), Claude Vision (expensive) |
| Browser Automation | Playwright MCP | Industry standard, self-healing, MCP integration | Puppeteer (less capable), Selenium (outdated) |
| MCP Protocol | Playwright MCP Server | Standardized tool calling, active maintenance | Custom implementation (reinventing wheel) |
| Data Parsing | PapaParse | Robust CSV handling, streaming support | Custom parser (error-prone), csv-parse (fewer features) |
| Testing | Vitest + Playwright Test | Fast, modern, excellent TypeScript support | Jest (slower), Mocha (more config needed) |
| Build Tool | Vite (via Plasmo) | Fast HMR, modern ES modules | Webpack (slow), Rollup (more config) |

---

## 6. Design Patterns & Principles

### Adapter Pattern
- **Purpose**: Support multiple websites without changing core framework
- **Implementation**: `BaseAdapter` interface with site-specific implementations (`CanvaAdapter`, `FigmaAdapter`)
- **Benefits**: Extensibility, separation of concerns, testability
- **Usage**: `AdapterRegistry.getAdapter(url)` returns site-specific logic

### Strategy Pattern
- **Purpose**: Switch between LLM providers dynamically at runtime
- **Implementation**: `BaseLLMProvider` interface with concrete providers (`GroqProvider`, `OllamaProvider`)
- **Benefits**: Runtime flexibility, easy to add new providers
- **Usage**: `LLMAdapter.setProvider(provider)` changes active provider

### Observer Pattern
- **Purpose**: UI updates when job state changes without tight coupling
- **Implementation**: `StateManager` emits events, UI components subscribe
- **Benefits**: Loose coupling, reactive updates, testable
- **Usage**: `chrome.storage.onChanged` listeners in React hooks

### Factory Pattern
- **Purpose**: Create appropriate provider/adapter instances based on configuration
- **Implementation**: Factory methods in `LLMAdapter` and `AdapterRegistry`
- **Benefits**: Centralized object creation, validation, encapsulation

### Chain of Responsibility
- **Purpose**: Self-healing tries multiple recovery strategies in sequence
- **Implementation**: Recovery chain: DOM selector → Alternative selector → Vision → Fail
- **Benefits**: Flexible error handling, graceful degradation

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Generic-First** | Core framework knows nothing about Canva—all site logic lives in adapters |
| **Configuration over Code** | Users configure behavior through settings, not code modifications |
| **Fail-Safe** | Never crash; always attempt recovery before reporting failure |
| **Privacy-First** | Local LLM option available for sensitive data; cloud is opt-in |
| **Observable** | Everything is logged for debugging; structured logging throughout |
| **Extensible** | New adapters can be added without touching core framework code |

---

## 7. Cross-Component Communication

### Message Passing

```typescript
// UI → Background (Side Panel to Service Worker)
chrome.runtime.sendMessage({ type: 'START_JOB', payload: { prompt, config } })

// Background → Content Script
chrome.tabs.sendMessage(tabId, { type: 'EXECUTE_ACTION', payload: action })

// Content Script → Background
chrome.runtime.sendMessage({ type: 'ACTION_RESULT', payload: result })
```

### State Synchronization

- **Source of Truth**: Background service worker maintains authoritative job state
- **UI Updates**: Side panel listens to `chrome.storage.onChanged` events
- **Content Scripts**: Stateless; receive instructions, return results
- **Conflict Resolution**: Background validates all state changes

### Event Flow

```
User clicks "Generate"
    │
    ↓ sendMessage({ type: 'START_JOB' })
    │
Background orchestrator starts
    │
    ↓ Load adapter, create task plan
    │
Execute tasks (loop)
    │
    ↓ chrome.storage.local.set({ job: updatedJob })
    │
UI detects storage change
    │
    ↓ Re-render with new progress
    │
Job completes
    │
    ↓ Final state update, notify user
```

---

## 8. Security & Privacy Architecture

### Sensitive Data Handling

| Data Type | Storage | Encryption | Cloud Exposure |
|-----------|---------|------------|----------------|
| API Keys | `chrome.storage.local` | AES-256 | Never |
| Screenshots | Memory only | N/A | Only if user chooses cloud vision |
| User Prompts | `chrome.storage.local` | None | Only if using cloud LLM |
| CSV Data | Memory only | N/A | Never |
| Design Exports | User's disk | N/A | Never |

### Permissions Model

```json
{
  "permissions": [
    "tabs",           // Read active tab URL
    "storage",        // Persist settings and state
    "activeTab",      // Capture screenshots
    "scripting"       // Inject content scripts
  ],
  "host_permissions": [
    "http://localhost:*/*",    // Local LLMs (Ollama, LM Studio)
    "https://www.canva.com/*"  // Target site (expandable)
  ]
}
```

### Sandbox Isolation

- **Content Scripts**: Run in isolated world, cannot access page's JavaScript context
- **Service Worker**: No DOM access, only message passing
- **Extension Storage**: Encrypted by browser, inaccessible to web pages

---

## 9. Scalability Considerations

### Performance Optimizations

| Area | Strategy |
|------|----------|
| Screenshots | Compress to JPEG, resize to max 1920px before storage/transmission |
| LLM Calls | Cache responses for identical prompts (configurable TTL) |
| Adapters | Lazy load—only load adapter when user navigates to matching site |
| Bulk Jobs | Throttle concurrent executions to prevent rate limiting |

### Resource Limits

| Resource | Limit | Mitigation |
|----------|-------|------------|
| Chrome Storage | 10MB | Auto-delete old jobs, compress screenshots |
| Memory | Browser-managed | Stream large files, avoid storing screenshots in memory |
| API Rate | Provider-specific | Queue requests, implement backoff |
| CPU | User system | Throttle bulk operations if system is constrained |

### Future Scaling

- **Multi-Tab Support**: Coordinate automation across multiple tabs
- **Background Processing**: Queue jobs for later execution
- **Cloud Offloading**: Optional server for heavy vision tasks (future phase)

---

## 10. Development Workflow

### Coding Standards

- **TypeScript**: Strict mode enabled, no implicit `any`
- **Linting**: ESLint with TypeScript and React rules
- **Formatting**: Prettier (2-space indent, semicolons)
- **Style**: Functional programming for pure logic, classes for stateful components
- **Documentation**: JSDoc comments for public APIs

### Version Control

- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`)
- **Branching**: Feature branches from `main`
- **Reviews**: Required for all PRs
- **Versioning**: Semantic versioning (0.x.x for beta)

### Testing Strategy

| Level | Tool | Target |
|-------|------|--------|
| Unit | Vitest | Pure functions, isolated components (>80% coverage) |
| Integration | Vitest + MSW | Component interactions, API mocking |
| E2E | Playwright | Critical user workflows |
| Manual QA | Human | Real Canva workflows, edge cases |

### Release Process

1. **Alpha**: Internal team testing
2. **Beta**: Invited external testers
3. **Production**: Chrome Web Store submission
