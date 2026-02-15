# **🚀 PHASE 0: FOUNDATION & ARCHITECTURE - SUPER-OPTIMIZED PROMPTS**

***

## **PROMPT 0.1: Project Architecture & System Design Documentation**

```
PROJECT: BrowserAI Craft - Comprehensive Architecture Documentation

ROLE: You are the lead architect creating the foundational documentation for BrowserAI Craft, a revolutionary cross-browser AI automation framework. This documentation will guide all future development.

CONTEXT FROM RESEARCH:
Carefully study the attached PDF "2026-AI-Canva-Automation-Research.pdf" which provides the theoretical foundation:

KEY SECTIONS TO REFERENCE:
- Section 1: Agentic Shift in Creative Workflow Automation
  * Intent-based execution vs imperative scripting
  * Self-healing properties
  * Visual reasoning capabilities

- Section 2: Authenticated Session Persistence
  * S3-backed profile hydration concept (adapt for local browser storage)
  * Session management strategies

- Section 3: Multimodal Perception and Visual Reasoning
  * SSVP (Synergistic Semantic-Visual Prompting)
  * Canvas element interaction challenges
  * Visual anchoring techniques

- Section 4: Hybrid API-Agent Orchestration
  * Graph pattern for task flows
  * WebMCP integration strategy
  * API vs UI interaction decision logic

- Section 5: Technical Implementation Stack
  * AgentCore concepts
  * Observe-Think-Act cycle

- Section 6: Self-Healing and Governance
  * Semantic retry routines
  * Human-in-the-loop patterns
  * Observability requirements

PROJECT VISION:
BrowserAI Craft is NOT just a Canva automation tool. It is a GENERIC FRAMEWORK for AI-driven browser automation that:
- Works with ANY website through pluggable adapters
- Uses local OR cloud LLMs (user choice)
- Combines vision AI with DOM manipulation for robust automation
- Heals itself when UI changes break selectors
- Provides simple natural language interface for complex workflows

FIRST TARGET: Canva (design automation)
FUTURE TARGETS: Figma, Adobe Express, Google Slides, social media platforms, any web application

═══════════════════════════════════════════════════════════════════════
DOCUMENT 1: ARCHITECTURE.md
═══════════════════════════════════════════════════════════════════════

CREATE COMPREHENSIVE ARCHITECTURE DOCUMENTATION WITH THESE SECTIONS:

1. EXECUTIVE SUMMARY
Write 300-word overview covering:
- What BrowserAI Craft is and why it exists
- Core innovation (generic AI-driven automation with adapter pattern)
- Key capabilities (natural language → automated workflows)
- Target users (teams, designers, marketers, automation engineers)
- Differentiation from traditional automation (Selenium, Puppeteer)

2. SYSTEM OVERVIEW DIAGRAM
Create ASCII or Mermaid diagram showing:
- User Layer (Chrome Extension UI)
- Control Layer (Orchestration Engine, State Manager)
- Execution Layer (LLM Adapter, Vision Agent, Browser Agent)
- Adapter Layer (Website-specific logic: Canva, Figma, etc.)
- External Services (LLM APIs, MCP Servers, Data Sources)
- Data flow between layers (arrows showing communication)

Use this structure:
```
┌─────────────────────────────────────────────────────────┐
│            USER INTERFACE (Side Panel)                  │
│  [Prompt Input] [Config] [Job Queue] [Progress]        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│         ORCHESTRATION ENGINE (Background)               │
│  -  Parse Prompt → Plan Tasks → Execute Loop            │
│  -  State Management → Error Recovery                    │
└───┬─────────────┬──────────────┬──────────────┬────────┘
    ↓             ↓              ↓              ↓
[LLM Adapter] [Vision Agent] [Browser Agent] [Adapters]
    ↓             ↓              ↓              ↓
[Groq/Ollama] [Screenshot]   [MCP Server]  [Canva/Figma]
[LM Studio]   [GPT-4V/LLaVA] [Playwright]  [Knowledge Base]
```

3. COMPONENT ARCHITECTURE
Detail each major component with:
- Purpose (what it does)
- Responsibilities (specific duties)
- Interfaces (public API methods)
- Dependencies (what it requires)
- Data inputs/outputs

COMPONENTS TO DOCUMENT:

A. ORCHESTRATION ENGINE
- Central controller coordinating all automation
- Implements Observe-Think-Act loop from research PDF
- Manages task planning, execution, retry logic
- Interfaces: execute(prompt), pauseJob(), resumeJob()

B. LLM ADAPTER
- Unified interface for multiple LLM providers
- Supports: Groq (free cloud), Deepseek, Ollama, LM Studio, WebLLM
- Handles: text generation, vision tasks, tool calling
- Provider abstraction pattern (BaseLLMProvider interface)

C. VISION AGENT
- Multimodal reasoning for visual tasks
- Analyzes screenshots to locate elements
- Verifies task completion visually
- Scores aesthetic matches (template selection)
- Implements SSVP concepts from research

D. BROWSER AGENT
- Executes actions on web pages
- Integrates with MCP (Model Context Protocol) servers
- Supports: click, type, scroll, screenshot, wait
- Self-healing element location

E. ADAPTER REGISTRY
- Pluggable website-specific logic
- Detects current site and loads appropriate adapter
- Each adapter provides: selectors, workflows, knowledge
- Base adapter interface for extensibility

F. STATE MANAGER
- Persists job state across sessions
- Uses Chrome Storage API
- Supports pause/resume functionality
- Tracks progress, errors, results

G. DATA CONNECTORS
- CSV parser
- Google Sheets integration
- Asset manager (logos, images)

4. DATA FLOW DIAGRAMS
Create flow diagrams for key scenarios:

SCENARIO A: Single Design Generation
User enters prompt → Parser extracts intent → Adapter loaded → Task plan created → Execute loop (Observe→Think→Act→Verify) → Export result → Update UI

SCENARIO B: Bulk Generation from CSV
User uploads CSV → Parser + Data loader → Task plan with loops → Parallel execution (if config allows) → Batch export → Progress updates

SCENARIO C: Self-Healing Recovery
Action fails → Capture failure context → LLM analyzes error → Try alternative (vision vs DOM) → Success or escalate → Log recovery attempt

5. TECHNOLOGY STACK WITH RATIONALE
Create table format:

| Component | Technology | Rationale | Alternatives Considered |
|-----------|-----------|-----------|------------------------|
| Framework | Plasmo | Cross-browser, React support, hot reload, Manifest V3 | Vanilla Chrome API (too verbose), WXT (less mature) |
| Language | TypeScript | Type safety, IDE support, scales well | JavaScript (too error-prone) |
| UI Framework | React 18 | Component reuse, large ecosystem, team familiarity | Vue (less team experience), Svelte (smaller ecosystem) |
| Styling | Tailwind CSS | Rapid development, consistent design | CSS-in-JS (slower), plain CSS (harder maintenance) |
| State Management | Zustand | Lightweight, TypeScript-first, minimal boilerplate | Redux (too complex), Context API (performance issues) |
| LLM - Free Cloud | Groq | Fast inference, free tier, Llama 3.3 70B | OpenAI (expensive), Claude (no free tier) |
| LLM - Local | Ollama + LM Studio | Privacy, offline, user already has setup | LocalAI (less mature), Llama.cpp (too low-level) |
| Vision Model | LLaVA 13B (local), GPT-4V (cloud) | Best multimodal performance | Qwen2-VL (good but harder setup), Claude Vision (expensive) |
| Browser Automation | Playwright MCP | Industry standard, self-healing, MCP integration | Puppeteer (less capable), Selenium (outdated) |
| MCP Protocol | Playwright MCP Server | Standardized tool calling, browser control | Custom implementation (reinventing wheel) |
| Data Parsing | PapaParse | Robust CSV handling, streaming support | Custom parser (buggy), csv-parse (less features) |
| Testing | Vitest + Playwright Test | Fast, modern, TypeScript support | Jest (slower), Mocha (more config) |
| Build Tool | Vite (via Plasmo) | Fast HMR, modern ES modules | Webpack (slow), Rollup (more config) |

6. DESIGN PATTERNS & PRINCIPLES

Document patterns used throughout system:

ADAPTER PATTERN:
- Purpose: Support multiple websites without changing core
- Implementation: BaseAdapter interface, CanvaAdapter extends it
- Benefits: Extensibility, separation of concerns
- Usage: AdapterRegistry.getAdapter(url) returns site-specific logic

STRATEGY PATTERN:
- Purpose: Switch between LLM providers dynamically
- Implementation: BaseLLMProvider interface, concrete providers
- Benefits: Runtime flexibility, easy to add providers

OBSERVER PATTERN:
- Purpose: UI updates when job state changes
- Implementation: StateManager emits events, UI listens
- Benefits: Loose coupling, reactive updates

FACTORY PATTERN:
- Purpose: Create appropriate provider/adapter based on config
- Implementation: LLMAdapter constructor, AdapterRegistry
- Benefits: Centralized object creation, validation

CHAIN OF RESPONSIBILITY:
- Purpose: Self-healing tries multiple recovery strategies
- Implementation: Try DOM → Try vision → Try alternative workflow
- Benefits: Flexible error handling

DESIGN PRINCIPLES:
- Generic-first: Core framework knows nothing about Canva
- Configuration over code: Users configure, don't modify code
- Fail-safe: Never crash, always attempt recovery
- Privacy-first: Local LLM option for sensitive data
- Observable: Everything is logged for debugging
- Extensible: New adapters without touching core

7. CROSS-COMPONENT COMMUNICATION

Explain how components interact:

MESSAGE PASSING:
- UI → Background: chrome.runtime.sendMessage()
- Background → Content Script: chrome.tabs.sendMessage()
- Content Script → Background: chrome.runtime.sendMessage()

STATE SYNCHRONIZATION:
- Background maintains source of truth
- UI polls or listens for chrome.storage.onChanged
- Content scripts are stateless, receive instructions

EVENT FLOW:
User clicks "Generate" → UI sends message → Background orchestrator starts → Loads adapter → Executes tasks → Updates state → UI reflects changes

8. SECURITY & PRIVACY ARCHITECTURE

SENSITIVE DATA HANDLING:
- API keys encrypted in chrome.storage.local
- Screenshots never sent to cloud unless user explicitly uses cloud vision
- Local LLM option for complete privacy
- User data (CSV, designs) stays local, not logged to external services

PERMISSIONS MODEL:
- tabs: Read active tab URL
- storage: Persist settings and state
- Host permissions: localhost (for local LLMs), canva.com, etc.
- activeTab: Capture screenshots
- No broad permissions (no cookies, no history)

SANDBOX ISOLATION:
- Content scripts run in isolated world
- Background service worker has no DOM access
- Communication only through message passing

9. SCALABILITY CONSIDERATIONS

PERFORMANCE:
- Parallel task execution where possible
- Screenshot compression before storage/transmission
- LLM response caching for identical prompts
- Lazy loading of adapters (only load when needed)

RESOURCE LIMITS:
- Chrome storage: 10MB limit, implement cleanup
- Memory: Monitor screenshot accumulation
- CPU: Throttle bulk operations if system constrained
- Network: Rate limit API calls to avoid bans

FUTURE SCALING:
- Multi-tab support (coordinate across tabs)
- Background processing (long-running jobs)
- Cloud offloading (optional server for heavy tasks)

10. DEVELOPMENT WORKFLOW

CODING STANDARDS:
- TypeScript strict mode
- ESLint + Prettier enforced
- Functional programming preferred for pure logic
- Classes for stateful components
- JSDoc comments for public APIs

VERSION CONTROL:
- Git with conventional commits
- Feature branches
- PR reviews required
- Semantic versioning (0.x.x for beta)

TESTING STRATEGY:
- Unit tests for pure functions (>80% coverage)
- Integration tests for component interactions
- E2E tests for critical workflows
- Manual QA on real Canva workflows

RELEASE PROCESS:
- Alpha: Internal team testing
- Beta: Invited testers
- Prod: Chrome Web Store submission

═══════════════════════════════════════════════════════════════════════
DOCUMENT 2: PROJECT_STRUCTURE.md
═══════════════════════════════════════════════════════════════════════

CREATE DETAILED FOLDER STRUCTURE DOCUMENTATION:

1. COMPLETE FOLDER HIERARCHY
Provide full tree structure with explanations:

```
browserai-craft/
├── README.md                      # Project overview, quick start
├── LICENSE                        # Open source license (MIT recommended)
├── package.json                   # Dependencies, scripts
├── pnpm-lock.yaml                # Lock file for reproducible builds
├── tsconfig.json                 # TypeScript configuration
├── plasmo.config.ts              # Plasmo framework config
├── tailwind.config.js            # Tailwind CSS customization
├── .env.example                  # Environment template (API keys)
├── .gitignore                    # Git ignore patterns
├── .eslintrc.js                  # Linting rules
├── .prettierrc                   # Code formatting rules
│
├── src/                          # Source code root
│   ├── sidepanel/                # Side panel UI (React components)
│   │   ├── index.tsx             # Entry point, main layout
│   │   ├── components/           # Reusable UI components
│   │   │   ├── PromptInput.tsx   # Natural language input field
│   │   │   ├── LLMSelector.tsx   # Provider selection dropdown
│   │   │   ├── AdapterSelector.tsx # Website adapter picker
│   │   │   ├── DataSourcePicker.tsx # CSV/Sheets upload
│   │   │   ├── ConfigPanel.tsx   # Settings interface
│   │   │   ├── JobQueue.tsx      # Active/history jobs list
│   │   │   ├── ProgressBar.tsx   # Visual progress indicator
│   │   │   └── DebugPanel.tsx    # Developer debug logs
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useJobs.ts        # Job state management
│   │   │   ├── useLLMProviders.ts # Provider status
│   │   │   └── useConfig.ts      # User settings
│   │   ├── styles/               # CSS modules or Tailwind
│   │   │   └── globals.css       # Global styles
│   │   └── types/                # UI-specific types
│   │       └── ui.types.ts
│   │
│   ├── background/               # Service worker (main logic)
│   │   ├── index.ts              # Service worker entry
│   │   ├── messages/             # Message handlers (UI → Background)
│   │   │   ├── orchestrate.ts    # Main automation trigger
│   │   │   ├── configure.ts      # Update settings
│   │   │   ├── status.ts         # Job status queries
│   │   │   ├── pause.ts          # Pause job
│   │   │   ├── resume.ts         # Resume job
│   │   │   └── cancel.ts         # Cancel job
│   │   └── core/                 # Core orchestration logic
│   │       ├── OrchestrationEngine.ts  # Main brain
│   │       ├── TaskPlanner.ts    # Prompt → tasks
│   │       ├── ExecutionLoop.ts  # Observe-Think-Act
│   │       ├── StateManager.ts   # Job persistence
│   │       └── PromptParser.ts   # NL parsing
│   │
│   ├── contents/                 # Content scripts (injected into pages)
│   │   ├── universal-injector.ts # Injects into any page
│   │   ├── dom-monitor.ts        # Watches DOM changes
│   │   ├── action-executor.ts    # Executes click/type actions
│   │   └── screenshot-helper.ts  # Captures page/element images
│   │
│   ├── core/                     # Generic framework (site-agnostic)
│   │   ├── llm/                  # LLM integration
│   │   │   ├── LLMAdapter.ts     # Main LLM interface
│   │   │   ├── BaseLLMProvider.ts # Abstract provider
│   │   │   ├── providers/        # Concrete providers
│   │   │   │   ├── GroqProvider.ts
│   │   │   │   ├── DeepseekProvider.ts
│   │   │   │   ├── OllamaProvider.ts
│   │   │   │   ├── LMStudioProvider.ts
│   │   │   │   └── WebLLMProvider.ts
│   │   │   ├── ToolCalling.ts    # MCP tool integration
│   │   │   └── PromptTemplates.ts # Reusable prompts
│   │   │
│   │   ├── vision/               # Vision & multimodal AI
│   │   │   ├── VisionAgent.ts    # Main vision interface
│   │   │   ├── ScreenshotCapture.ts # Capture utilities
│   │   │   ├── ElementDetector.ts # Find elements visually
│   │   │   ├── LayoutAnalyzer.ts # Understand design structure
│   │   │   └── AestheticScorer.ts # Rate visual appeal
│   │   │
│   │   ├── browser/              # Browser automation
│   │   │   ├── BrowserAgent.ts   # Main browser interface
│   │   │   ├── MCPIntegration.ts # MCP client
│   │   │   ├── DOMQuery.ts       # DOM inspection
│   │   │   ├── ActionExecutor.ts # Execute browser actions
│   │   │   └── SelfHealing.ts    # Adaptive selectors
│   │   │
│   │   ├── adapters/             # Website-specific logic
│   │   │   ├── BaseAdapter.ts    # Abstract adapter interface
│   │   │   ├── AdapterRegistry.ts # Load adapters dynamically
│   │   │   ├── CanvaAdapter.ts   # Canva implementation
│   │   │   ├── FigmaAdapter.ts   # Future: Figma
│   │   │   └── GenericAdapter.ts # Fallback for unknown sites
│   │   │
│   │   ├── data/                 # Data sources & parsing
│   │   │   ├── CSVParser.ts      # CSV file handling
│   │   │   ├── GoogleSheetsConnector.ts # Sheets API
│   │   │   ├── AssetManager.ts   # Image/logo handling
│   │   │   └── DataValidator.ts  # Input validation
│   │   │
│   │   ├── types/                # TypeScript definitions
│   │   │   ├── common.ts         # Shared types
│   │   │   ├── llm.ts            # LLM types
│   │   │   ├── vision.ts         # Vision types
│   │   │   ├── browser.ts        # Browser types
│   │   │   ├── adapter.ts        # Adapter types
│   │   │   ├── orchestration.ts  # Orchestration types
│   │   │   ├── data.ts           # Data types
│   │   │   └── mcp.ts            # MCP types
│   │   │
│   │   └── utils/                # Shared utilities
│   │       ├── Logger.ts         # Structured logging
│   │       ├── ErrorHandler.ts   # Error utilities
│   │       ├── ConfigManager.ts  # Read/write config
│   │       ├── Retry.ts          # Retry logic
│   │       └── Validation.ts     # Input validation
│   │
│   ├── mcp-servers/              # MCP server configs
│   │   ├── playwright-mcp.json   # Playwright MCP config
│   │   └── browser-mcp.json      # Browser MCP config
│   │
│   └── assets/                   # Static resources
│       ├── icon-16.png           # Extension icon (16x16)
│       ├── icon-48.png           # Extension icon (48x48)
│       ├── icon-128.png          # Extension icon (128x128)
│       └── logo.svg              # SVG logo
│
├── adapters/                     # Adapter knowledge bases
│   ├── canva/                    # Canva-specific knowledge
│   │   ├── selectors.yaml        # UI element selectors
│   │   ├── workflows.yaml        # Common task sequences
│   │   ├── canvas-rules.yaml     # Canvas interaction rules
│   │   ├── prompts/              # Canva-specific LLM prompts
│   │   │   ├── template-search.txt
│   │   │   ├── text-edit.txt
│   │   │   ├── image-replace.txt
│   │   │   └── export.txt
│   │   └── examples/             # Example designs/data
│   │       ├── sample-template.png
│   │       └── sample-data.csv
│   ├── figma/                    # Future: Figma knowledge
│   └── README.md                 # How to create adapters
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md           # System design (this doc)
│   ├── PROJECT_STRUCTURE.md      # Folder structure (this doc)
│   ├── TECH_STACK.md             # Technology choices
│   ├── DESIGN_PRINCIPLES.md      # Coding principles
│   ├── DEVELOPMENT_ROADMAP.md    # Implementation phases
│   ├── ADAPTER_SYSTEM.md         # Creating adapters
│   ├── MCP_INTEGRATION.md        # MCP setup guide
│   ├── CANVA_DEEP_DIVE.md        # Canva automation knowledge
│   ├── USER_GUIDE.md             # End-user documentation
│   ├── API_REFERENCE.md          # Developer API docs
│   ├── TROUBLESHOOTING.md        # Common issues & fixes
│   ├── CONTRIBUTING.md           # Contribution guidelines
│   └── CHANGELOG.md              # Version history
│
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests (Vitest)
│   │   ├── llm/                  # LLM adapter tests
│   │   ├── vision/               # Vision agent tests
│   │   ├── browser/              # Browser agent tests
│   │   └── adapters/             # Adapter tests
│   ├── integration/              # Integration tests
│   │   ├── orchestration.test.ts # End-to-end orchestration
│   │   └── canva-workflows.test.ts # Canva-specific flows
│   ├── e2e/                      # End-to-end tests (Playwright)
│   │   ├── single-design.spec.ts
│   │   └── bulk-generation.spec.ts
│   ├── fixtures/                 # Test data
│   │   ├── sample.csv
│   │   ├── screenshot.png
│   │   └── mock-responses.json
│   └── helpers/                  # Test utilities
│       ├── mock-llm.ts
│       └── mock-browser.ts
│
├── scripts/                      # Build & dev scripts
│   ├── build.sh                  # Production build
│   ├── dev.sh                    # Development server
│   ├── test.sh                   # Run all tests
│   └── package-extension.sh      # Create distributable ZIP
│
└── .github/                      # GitHub config
    ├── workflows/                # CI/CD pipelines
    │   ├── ci.yml                # Test on PR
    │   └── release.yml           # Publish to Web Store
    └── ISSUE_TEMPLATE/           # Issue templates
        ├── bug_report.md
        └── feature_request.md
```

2. MODULE ORGANIZATION PHILOSOPHY

LAYERED ARCHITECTURE:
```
UI Layer (sidepanel/) → Presentation, user interaction
    ↓
Control Layer (background/core/) → Orchestration, business logic
    ↓
Execution Layer (core/llm, core/vision, core/browser/) → Capabilities
    ↓
Adapter Layer (core/adapters/) → Site-specific knowledge
    ↓
External Layer (MCP servers, LLM APIs, Data sources)
```

SEPARATION PRINCIPLES:
- UI knows nothing about LLM providers (uses abstract interface)
- Core framework knows nothing about Canva (uses adapters)
- Adapters are self-contained (all knowledge in one folder)
- Types are centralized (single source of truth)
- Utils are pure functions (no side effects)

3. FILE NAMING CONVENTIONS

TYPESCRIPT FILES:
- PascalCase for classes: `OrchestrationEngine.ts`, `CanvaAdapter.ts`
- camelCase for utilities: `logger.ts`, `retry.ts`
- `.types.ts` suffix for type-only files
- `.test.ts` suffix for test files
- `.spec.ts` suffix for E2E tests

REACT COMPONENTS:
- PascalCase: `PromptInput.tsx`, `JobQueue.tsx`
- One component per file
- Co-locate styles if using CSS modules

CONFIGURATION FILES:
- kebab-case: `playwright-mcp.json`, `canvas-rules.yaml`
- `.example` suffix for templates: `.env.example`

4. IMPORT PATH ALIASES

Configure TypeScript path aliases for clean imports:
```typescript
// Instead of: import { LLMAdapter } from '../../../core/llm/LLMAdapter'
// Use: import { LLMAdapter } from '~core/llm/LLMAdapter'

Path aliases:
~core/* → src/core/*
~sidepanel/* → src/sidepanel/*
~background/* → src/background/*
~contents/* → src/contents/*
~adapters/* → adapters/*
~types/* → src/core/types/*
~utils/* → src/core/utils/*
```

5. DATA FLOW SUMMARY

USER INPUT FLOW:
sidepanel/index.tsx → background/messages/orchestrate.ts → background/core/OrchestrationEngine.ts → Executes

STATE UPDATES FLOW:
OrchestrationEngine updates → StateManager.save() → chrome.storage → sidepanel/hooks/useJobs detects change → UI re-renders

CONTENT SCRIPT FLOW:
background/core/BrowserAgent → chrome.tabs.sendMessage() → contents/action-executor.ts → DOM manipulation → return result

═══════════════════════════════════════════════════════════════════════
DOCUMENT 3: TECH_STACK.md
═══════════════════════════════════════════════════════════════════════

CREATE COMPREHENSIVE TECHNOLOGY STACK DOCUMENTATION:

1. CORE FRAMEWORK STACK

EXTENSION FRAMEWORK: Plasmo
- Version: Latest stable (check plasmo.com)
- Why chosen:
  * Modern DX: Hot reload, TypeScript first, React support
  * Cross-browser: Single codebase for Chrome + Firefox
  * Manifest V3: Future-proof (Google deprecating V2)
  * Built-in: Message passing, storage wrappers, content script injection
- Alternatives considered:
  * Vanilla Chrome Extension API: Too verbose, manual manifest management
  * WXT: Less mature, smaller community
  * Extension.js: React-only, less flexible
- Installation: `pnpm create plasmo`
- Documentation: https://docs.plasmo.com

PROGRAMMING LANGUAGE: TypeScript 5.x
- Why chosen:
  * Type safety: Catch errors at compile time
  * IDE support: IntelliSense, refactoring tools
  * Scales well: Large codebase maintainability
  * Modern features: Decorators, async/await, generics
- Configuration: Strict mode enabled, no implicit any
- Alternatives: JavaScript (too error-prone for this complexity)

PACKAGE MANAGER: pnpm
- Why chosen:
  * Faster: Shared node_modules across projects
  * Disk efficient: Hard links instead of copies
  * Strict: Enforces proper dependency declaration
- Installation: `npm install -g pnpm`
- Alternatives: npm (slower), yarn (less efficient)

2. USER INTERFACE STACK

UI FRAMEWORK: React 18
- Why chosen:
  * Component reuse: Build once, use everywhere
  * Large ecosystem: Rich library of components
  * Team familiarity: (User's profile shows React experience)
  * Concurrent features: Better performance
- Alternatives: Vue (less team experience), Svelte (smaller ecosystem), Solid (too new)

STYLING: Tailwind CSS 3.x
- Why chosen:
  * Rapid development: Utility-first approach
  * Consistent design: Design system built-in
  * Small bundle: PurgeCSS removes unused styles
  * Responsive: Mobile-first by default
- Configuration: Custom theme for brand colors
- Alternatives: CSS-in-JS (runtime overhead), Sass (more boilerplate), plain CSS (harder to maintain)

STATE MANAGEMENT: Zustand
- Why chosen:
  * Lightweight: <1KB gzipped
  * TypeScript-first: Excellent type inference
  * Minimal boilerplate: No providers, actions, reducers
  * React 18 compatible: Supports concurrent rendering
- Usage: Global state for jobs, config, UI state
- Alternatives: Redux (too complex), Jotai (less mature), Context API (performance issues at scale)

3. LLM INTEGRATION STACK

FREE CLOUD LLM: Groq
- API: https://api.groq.com/openai/v1/chat/completions
- Models:
  * llama-3.3-70b-versatile (primary)
  * llama-3.2-90b-vision-preview (vision tasks)
- Why chosen:
  * Free tier: Generous limits for testing
  * Fast inference: Lightning-fast responses
  * OpenAI-compatible: Easy integration
- Rate limits: 30 req/min (free), 6000 req/day
- API key: Free registration at groq.com

PAID CLOUD LLM: Deepseek
- API: https://api.deepseek.com/v1/chat/completions
- Models:
  * deepseek-chat (general)
  * deepseek-reasoner (complex reasoning)
- Why chosen:
  * Cost-effective: $0.27/1M input tokens
  * Strong reasoning: Excellent for planning tasks
  * OpenAI-compatible API
- Pricing: https://www.deepseek.com/pricing

LOCAL LLM: Ollama + LM Studio
- Ollama:
  * Purpose: CLI-based local LLM runtime
  * API: http://localhost:11434
  * Models: llama3.2, qwen2.5, llava:13b (vision)
  * Installation: https://ollama.com/download
  * Why: Simple, lightweight, fast model switching
- LM Studio:
  * Purpose: GUI-based local LLM runtime
  * API: http://localhost:1234 (OpenAI-compatible)
  * Models: User downloads via UI
  * Installation: https://lmstudio.ai
  * Why: User-friendly, MCP integration, Mac-optimized

IN-BROWSER LLM: WebLLM (mlc-ai)
- Library: @mlc-ai/web-llm
- Technology: WebGPU (hardware acceleration)
- Models:
  * Llama-3.2-1B-Instruct (fast, 2GB)
  * Phi-3.5-mini (efficient, 3GB)
- Why chosen:
  * Zero setup: No installation required
  * Privacy: Everything client-side
  * Offline: Works without internet
- Limitation: Requires modern browser with WebGPU support
- Fallback: Transformers.js (WASM-based, slower but wider support)

4. VISION & MULTIMODAL STACK

LOCAL VISION MODEL: LLaVA 13B (via Ollama)
- Model: llava:13b
- Purpose: Analyze screenshots, locate elements, verify designs
- Why chosen:
  * Best local multimodal: Outperforms alternatives
  * Ollama integration: Easy deployment
  * 13B sweet spot: Balance of quality and speed (7B too weak, 34B too slow)
- Hardware requirements: 16GB+ RAM, GPU recommended
- Installation: `ollama pull llava:13b`

CLOUD VISION MODEL: GPT-4V (OpenAI) or Gemini 2.0 Vision (Google)
- GPT-4V:
  * API: OpenAI chat completions with image_url
  * Pricing: $0.01/image (approx)
  * Why: Best-in-class accuracy
- Gemini 2.0 Vision:
  * API: Google Generative AI
  * Pricing: Free tier generous
  * Why: Cost-effective alternative

SCREENSHOT LIBRARY: Native Chrome API
- API: chrome.tabs.captureVisibleTab()
- Format: PNG base64
- Utilities: Compression, cropping, resizing helpers

5. BROWSER AUTOMATION STACK

MCP PROTOCOL: Model Context Protocol
- Purpose: Standardized tool calling for browser automation
- Specification: https://modelcontextprotocol.io
- Why chosen:
  * Industry standard: Google, Anthropic backing
  * Tool abstraction: LLMs call browser tools uniformly
  * Self-documenting: Tools expose schemas dynamically

MCP SERVER: Playwright MCP
- Package: @executeautomation/playwright-mcp-server
- Installation: `npx -y @executeautomation/playwright-mcp-server`
- Tools provided:
  * browser_navigate, browser_click, browser_type
  * browser_screenshot, browser_wait, browser_upload
  * browser_evaluate (run custom JavaScript)
- Why chosen:
  * Full-featured: Comprehensive browser control
  * Active maintenance: Regular updates
  * Production-ready: Battle-tested

ALTERNATIVE MCP SERVER: Browser MCP
- Package: @modelcontextprotocol/server-browser
- Why: Lightweight alternative if Playwright is overkill
- Usage: Simple browser automation without full Playwright overhead

CONTENT SCRIPT FRAMEWORK: Vanilla TypeScript
- Why: Maximum performance, minimal overhead
- Pattern: Message-based communication with background
- Injection: Plasmo handles injection automatically

6. DATA & STORAGE STACK

CSV PARSING: PapaParse
- Package: papaparse
- Why chosen:
  * Robust: Handles malformed CSVs gracefully
  * Streaming: Large file support
  * TypeScript types: @types/papaparse
- Features: Auto-detect delimiters, header parsing, type conversion

GOOGLE SHEETS: Google Sheets API v4
- Authentication: OAuth 2.0
- Scopes: spreadsheets.readonly
- Library: googleapis npm package
- Why: Official Google SDK, well-documented

CHROME STORAGE: chrome.storage.local API
- Capacity: 10MB (for extension local storage)
- Usage: Job state, config, screenshots (compressed)
- Wrapper: Plasmo provides typed storage wrappers
- Cleanup: Auto-delete old jobs to stay under limit

FILE HANDLING: FileReader API
- Purpose: Read user-uploaded CSVs, images
- Format: Base64 for transmission, Blob for processing

7. TESTING STACK

UNIT TESTING: Vitest
- Why chosen:
  * Fast: Vite-powered, instant feedback
  * TypeScript: First-class support
  * API: Jest-compatible, easy migration
- Configuration: vitest.config.ts
- Coverage: c8 for coverage reports
- Target: >80% coverage for core logic

INTEGRATION TESTING: Vitest + Mock Services
- Strategy: Mock LLM responses, MCP calls
- Tools: msw (Mock Service Worker) for API mocking
- Purpose: Test component interactions without external dependencies

E2E TESTING: Playwright Test
- Why chosen:
  * Browser automation: Same tech as MCP server
  * Multi-browser: Test Chrome + Firefox
  * Debugging: Trace viewer, video recording
- Test environment: Load unpacked extension in test browser
- Fixtures: Sample Canva pages, mock data

VISUAL REGRESSION: Playwright + Percy (optional)
- Purpose: Detect unintended UI changes
- Tool: Percy.io for visual diffs
- Usage: Screenshot side panel on each build, compare

8. DEVELOPMENT TOOLS STACK

LINTING: ESLint
- Config: @typescript-eslint recommended
- Plugins: react, react-hooks, plasmo
- Rules: Strict, enforce best practices
- Auto-fix: On save in VS Code

FORMATTING: Prettier
- Config: 2-space indent, single quotes, semicolons
- Integration: ESLint-prettier plugin
- Auto-format: On save

TYPE CHECKING: tsc --noEmit
- Purpose: Check types without emitting files (Plasmo handles build)
- CI: Run in GitHub Actions
- Pre-commit: Run locally before commit

GIT HOOKS: Husky + lint-staged
- Pre-commit: Run linter and formatter on staged files
- Pre-push: Run type check and unit tests
- Why: Catch issues before they reach CI

DEBUGGING: Chrome DevTools + React DevTools
- Background debugging: chrome://extensions → Inspect service worker
- Content script debugging: Regular DevTools
- React debugging: React DevTools extension

9. BUILD & DEPLOYMENT STACK

BUILD TOOL: Vite (via Plasmo)
- Why: Fast HMR (Hot Module Replacement), ESM-native
- Configuration: plasmo.config.ts overrides Vite defaults
- Output: dist/ folder with Manifest V3 structure

BUNDLER: Rollup (internal to Vite)
- Why: Tree-shaking, smaller bundles
- Config: Automatic via Plasmo

MINIFICATION: Terser (production builds)
- Purpose: Reduce bundle size
- Setting: Enabled automatically in Plasmo production builds

MANIFEST VERSION: Manifest V3
- Why: Required for new Chrome extensions (V2 deprecated 2024)
- Features: Service workers (no background pages), declarative permissions

CROSS-BROWSER BUILD: Plasmo --target firefox
- Command: `plasmo build --target=firefox-mv3`
- Output: Separate dist folder for Firefox
- Differences: Manifest adaptations handled automatically

CHROME WEB STORE PUBLISHING:
- Tool: Chrome Web Store Developer Dashboard
- Process: Upload ZIP, fill metadata, submit review
- Review time: ~3-5 days

VERSION CONTROL: Git + GitHub
- Branching: GitFlow (main, develop, feature/*)
- CI/CD: GitHub Actions
- Releases: Semantic versioning, GitHub Releases

10. MONITORING & ANALYTICS (POST-LAUNCH)

ERROR TRACKING: Sentry (optional)
- Purpose: Capture runtime errors in production
- Privacy: Opt-in only, user can disable
- Integration: Sentry SDK for browser extensions

USAGE ANALYTICS: Minimal, privacy-first
- Tool: Custom telemetry (not Google Analytics - privacy concerns)
- Data collected: Feature usage counts, performance metrics
- Storage: Aggregated, anonymized, local only
- Consent: Explicit opt-in required

LOGGING: Custom Logger utility
- Levels: DEBUG, INFO, WARN, ERROR
- Storage: chrome.storage.local (last 1000 entries)
- Export: Download logs as JSON for debugging

═══════════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

DELIVERABLES:
1. ARCHITECTURE.md (complete with all sections above)
2. PROJECT_STRUCTURE.md (complete folder structure with explanations)
3. TECH_STACK.md (comprehensive technology documentation)

FORMAT:
- Markdown with proper headings (##, ###, ####)
- Use tables for comparisons
- Use code blocks for examples
- Use bullet points for lists
- Include ASCII diagrams where helpful

TONE:
- Technical but accessible
- Explain "why" not just "what"
- Assume reader is experienced developer but new to this project

VALIDATION:
- Another developer can understand system from these docs alone
- All technology choices are justified
- Architecture is scalable and maintainable
- No placeholder content - everything is specific and actionable
```

***

## **PROMPT 0.2: Project Scaffold & Configuration Setup**

```
PROJECT: BrowserAI Craft - Complete Project Initialization

ROLE: You are setting up the foundational project structure with all configuration files, dependencies, and build tooling for BrowserAI Craft.

CONTEXT:
You have the architecture documentation from Prompt 0.1. Now create the actual project scaffold that developers will use to start coding.

PREREQUISITES:
- Reference ARCHITECTURE.md for system design
- Reference PROJECT_STRUCTURE.md for folder layout
- Reference TECH_STACK.md for technology choices

═══════════════════════════════════════════════════════════════════════
TASK 1: Initialize Plasmo Project
═══════════════════════════════════════════════════════════════════════

COMMAND SEQUENCE:
```bash
pnpm create plasmo browserai-craft
cd browserai-craft
```

CONFIGURATION DECISIONS:
- Framework: React with TypeScript
- Package manager: pnpm
- Target browser: Chrome (Firefox support Phase 8)
- Manifest: Version 3

═══════════════════════════════════════════════════════════════════════
TASK 2: Create package.json with All Dependencies
═══════════════════════════════════════════════════════════════════════

REQUIRED FIELDS:
- name: "browserai-craft"
- version: "0.1.0" (semantic versioning)
- description: "AI-powered browser automation framework with visual reasoning"
- author: (user's team name)
- license: "MIT"
- engines: node >=20.0.0, pnpm >=8.0.0

SCRIPTS TO DEFINE:
- dev: Start Plasmo dev server with hot reload
- build: Production build for Chrome
- build:firefox: Production build for Firefox
- test: Run Vitest unit tests
- test:e2e: Run Playwright E2E tests
- test:coverage: Generate coverage report
- lint: Run ESLint
- lint:fix: Auto-fix linting issues
- format: Run Prettier
- format:check: Check formatting without fixing
- type-check: Run TypeScript compiler in check mode
- clean: Remove build artifacts
- package: Create distributable ZIP

DEPENDENCIES (PRODUCTION):
Core Framework:
- plasmo: Latest stable version
- react: ^18.2.0
- react-dom: ^18.2.0

State Management:
- zustand: ^4.5.0

LLM Integration:
- openai: ^4.28.0 (for OpenAI-compatible APIs: Groq, Deepseek, LM Studio)
- @mlc-ai/web-llm: ^0.2.0 (for in-browser LLM)

Data Handling:
- papaparse: ^5.4.1 (CSV parsing)
- googleapis: ^134.0.0 (Google Sheets)
- zod: ^3.22.4 (runtime validation)

Utilities:
- uuid: ^9.0.1 (job ID generation)
- date-fns: ^3.3.1 (date formatting)
- lodash-es: ^4.17.21 (utility functions)

MCP Integration:
- Note: MCP servers run externally, no npm package needed
- Communication via fetch() to localhost endpoints

DEV DEPENDENCIES:
TypeScript:
- typescript: ^5.3.0
- @types/react: ^18.2.0
- @types/react-dom: ^18.2.0
- @types/chrome: ^0.0.258 (Chrome API types)
- @types/papaparse: ^5.3.14
- @types/uuid: ^9.0.8
- @types/lodash-es: ^4.17.12

Build Tools:
- vite: ^5.0.0 (internal to Plasmo)
- @plasmohq/storage: Latest (Plasmo storage helpers)

Testing:
- vitest: ^1.2.0
- @vitest/ui: ^1.2.0 (test UI)
- @playwright/test: ^1.41.0
- happy-dom: ^13.0.0 (DOM simulation for unit tests)
- msw: ^2.0.0 (API mocking)

Linting & Formatting:
- eslint: ^8.56.0
- @typescript-eslint/parser: ^6.19.0
- @typescript-eslint/eslint-plugin: ^6.19.0
- eslint-plugin-react: ^7.33.2
- eslint-plugin-react-hooks: ^4.6.0
- prettier: ^3.2.0
- eslint-config-prettier: ^9.1.0
- eslint-plugin-prettier: ^5.1.0

Git Hooks:
- husky: ^9.0.0
- lint-staged: ^15.2.0

Styling:
- tailwindcss: ^3.4.0
- autoprefixer: ^10.4.17
- postcss: ^8.4.33

═══════════════════════════════════════════════════════════════════════
TASK 3: TypeScript Configuration (tsconfig.json)
═══════════════════════════════════════════════════════════════════════

COMPILER OPTIONS:

Target & Module:
- target: "ES2022" (modern JS features)
- module: "ESNext" (ES modules)
- lib: ["ES2022", "DOM", "DOM.Iterable"] (standard + browser APIs)
- moduleResolution: "bundler" (Vite/Plasmo resolution)

Type Checking (STRICT):
- strict: true (enable all strict checks)
- noImplicitAny: true
- strictNullChecks: true
- strictFunctionTypes: true
- strictBindCallApply: true
- strictPropertyInitialization: true
- noImplicitThis: true
- alwaysStrict: true

Additional Checks:
- noUnusedLocals: true (warn about unused variables)
- noUnusedParameters: true (warn about unused params)
- noImplicitReturns: true (functions must return explicitly)
- noFallthroughCasesInSwitch: true (switch statements must break)

Module Resolution:
- esModuleInterop: true (better CommonJS interop)
- allowSyntheticDefaultImports: true
- resolveJsonModule: true (import JSON files)
- isolatedModules: true (Vite requirement)

JSX:
- jsx: "react-jsx" (new JSX transform, no need to import React)
- jsxImportSource: "react"

Paths (ALIASES):
- baseUrl: "."
- paths:
  * "~core/*": ["src/core/*"]
  * "~sidepanel/*": ["src/sidepanel/*"]
  * "~background/*": ["src/background/*"]
  * "~contents/*": ["src/contents/*"]
  * "~adapters/*": ["adapters/*"]
  * "~types/*": ["src/core/types/*"]
  * "~utils/*": ["src/core/utils/*"]

Include/Exclude:
- include: ["src/**/*", "adapters/**/*", "tests/**/*"]
- exclude: ["node_modules", "dist", "build"]

═══════════════════════════════════════════════════════════════════════
TASK 4: Plasmo Configuration (plasmo.config.ts)
═══════════════════════════════════════════════════════════════════════

PLASMO-SPECIFIC SETTINGS:

Manifest:
- manifestVersion: "v3"
- name: "BrowserAI Craft"
- version: "0.1.0"
- description: "AI-powered browser automation with visual reasoning"

Permissions:
- tabs: Read active tab information
- storage: Persist settings and job state
- activeTab: Capture screenshots
- scripting: Inject content scripts dynamically

Host Permissions:
- "http://localhost:*/*" (for local LLMs: Ollama, LM Studio)
- "https://www.canva.com/*" (Canva access)
- Can be extended dynamically for other sites

Side Panel:
- Enable side panel feature
- Default path: src/sidepanel/index.tsx
- Open behavior: Open on user action (click extension icon)

Content Scripts:
- Matches: ["<all_urls>"] (universal injector)
- Run at: "document_end" (after DOM loaded)
- All frames: false (main frame only)

Background:
- Service worker: src/background/index.ts
- Type: "module"
- Persistent: false (Manifest V3 requirement)

Build Configuration:
- Source directory: src/
- Output directory: build/chrome-mv3-prod (or dev)
- Assets directory: src/assets/

Cross-Browser:
- Chrome: Default target
- Firefox: Use `--target=firefox-mv3` flag
- Manifest adaptations: Plasmo handles automatically

═══════════════════════════════════════════════════════════════════════
TASK 5: Tailwind CSS Configuration (tailwind.config.js)
═══════════════════════════════════════════════════════════════════════

CONTENT PATHS:
- "./src/**/*.{js,jsx,ts,tsx}" (scan all source files)

THEME CUSTOMIZATION:

Colors (Custom Palette):
```javascript
colors: {
  primary: {
    50: '#e6f2ff',
    100: '#b3d9ff',
    500: '#0066cc',  // Main brand color
    600: '#0052a3',
    700: '#003d7a',
  },
  secondary: {
    50: '#f0f0f0',
    500: '#6b7280',
    700: '#374151',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    800: '#262626',
    900: '#171717',
  }
}
```

Fonts:
```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['Fira Code', 'monospace'],
}
```

Spacing (Custom Scale):
```javascript
spacing: {
  '18': '4.5rem',
  '88': '22rem',
  '128': '32rem',
}
```

Dark Mode:
- Strategy: 'class' (user can toggle via UI)
- Selector: '.dark' on root element

Plugins:
- @tailwindcss/forms (better form styling)
- @tailwindcss/typography (prose styles for docs)

═══════════════════════════════════════════════════════════════════════
TASK 6: Environment Variables (.env.example)
═══════════════════════════════════════════════════════════════════════

TEMPLATE FILE CONTENT:
```env
# LLM API Keys (Optional - for cloud providers)
PLASMO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
PLASMO_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key_here
PLASMO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here_if_using_gpt4v

# Local LLM Endpoints (Default values)
PLASMO_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434
PLASMO_PUBLIC_LMSTUDIO_ENDPOINT=http://localhost:1234

# Google Sheets API (Optional - if using Sheets integration)
PLASMO_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
PLASMO_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Debug Mode (Set to 'true' for verbose logging)
PLASMO_PUBLIC_DEBUG_MODE=false

# Feature Flags (Enable/disable features during development)
PLASMO_PUBLIC_ENABLE_WEBLLM=true
PLASMO_PUBLIC_ENABLE_VISION=true
PLASMO_PUBLIC_ENABLE_PARALLEL_TASKS=false

# Storage Limits
PLASMO_PUBLIC_MAX_SCREENSHOT_SIZE_MB=2
PLASMO_PUBLIC_MAX_JOBS_IN_HISTORY=50
```

NOTES:
- Plasmo requires `PLASMO_PUBLIC_` prefix for variables accessible in content scripts
- Actual .env file should be gitignored
- Users copy .env.example → .env and fill in their keys

═══════════════════════════════════════════════════════════════════════
TASK 7: ESLint Configuration (.eslintrc.js)
═══════════════════════════════════════════════════════════════════════

PARSER:
- @typescript-eslint/parser

EXTENDS:
- "eslint:recommended"
- "plugin:@typescript-eslint/recommended"
- "plugin:react/recommended"
- "plugin:react-hooks/recommended"
- "prettier" (disables conflicting rules)

PLUGINS:
- "@typescript-eslint"
- "react"
- "react-hooks"
- "prettier"

RULES (KEY CUSTOMIZATIONS):
```javascript
rules: {
  // TypeScript
  '@typescript-eslint/no-explicit-any': 'warn',  // Allow 'any' with warning
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/explicit-function-return-type': 'off',  // Inferred types OK
  
  // React
  'react/react-in-jsx-scope': 'off',  // Not needed with new JSX transform
  'react/prop-types': 'off',  // Using TypeScript for props
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  
  // General
  'no-console': ['warn', { allow: ['warn', 'error'] }],  // Prefer Logger utility
  'prettier/prettier': 'error',  // Enforce Prettier formatting
}
```

SETTINGS:
```javascript
settings: {
  react: {
    version: 'detect',  // Auto-detect React version
  },
}
```

ENV:
- browser: true
- es2022: true
- node: true (for config files)
- webextensions: true (Chrome API globals)

═══════════════════════════════════════════════════════════════════════
TASK 8: Prettier Configuration (.prettierrc)
═══════════════════════════════════════════════════════════════════════

FORMATTING RULES:
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false
}
```

IGNORE PATTERNS (.prettierignore):
```
node_modules
dist
build
coverage
*.min.js
pnpm-lock.yaml
```

═══════════════════════════════════════════════════════════════════════
TASK 9: Git Configuration (.gitignore)
═══════════════════════════════════════════════════════════════════════

PATTERNS TO IGNORE:
```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.plasmo/
*.crx
*.xpi
*.zip

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Testing
coverage/
.nyc_output/
playwright-report/
test-results/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Temporary
.cache/
temp/
tmp/
```

═══════════════════════════════════════════════════════════════════════
TASK 10: Testing Configuration (vitest.config.ts)
═══════════════════════════════════════════════════════════════════════

VITEST SETTINGS:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,  // No need to import describe, it, expect
    environment: 'happy-dom',  // Simulate browser DOM
    setupFiles: './tests/setup.ts',  // Setup file
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '~core': path.resolve(__dirname, './src/core'),
      '~sidepanel': path.resolve(__dirname, './src/sidepanel'),
      '~background': path.resolve(__dirname, './src/background'),
      '~contents': path.resolve(__dirname, './src/contents'),
      '~adapters': path.resolve(__dirname, './adapters'),
      '~types': path.resolve(__dirname, './src/core/types'),
      '~utils': path.resolve(__dirname, './src/core/utils'),
    },
  },
})
```

TEST SETUP FILE (tests/setup.ts):
```typescript
// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    captureVisibleTab: vi.fn(),
  },
} as any

// Mock fetch for LLM API calls
global.fetch = vi.fn()
```

═══════════════════════════════════════════════════════════════════════
TASK 11: Husky & Lint-Staged Setup
═══════════════════════════════════════════════════════════════════════

HUSKY HOOKS:

Pre-commit (.husky/pre-commit):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

Pre-push (.husky/pre-push):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm type-check
pnpm test
```

LINT-STAGED CONFIG (package.json):
```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
}
```

INITIALIZATION:
```bash
pnpm exec husky install
pnpm exec husky add .husky/pre-commit "pnpm lint-staged"
pnpm exec husky add .husky/pre-push "pnpm type-check && pnpm test"
```

═══════════════════════════════════════════════════════════════════════
TASK 12: Initial Folder Structure Creation
═══════════════════════════════════════════════════════════════════════

CREATE DIRECTORIES:
```bash
mkdir -p src/sidepanel/components
mkdir -p src/sidepanel/hooks
mkdir -p src/sidepanel/styles
mkdir -p src/background/messages
mkdir -p src/background/core
mkdir -p src/contents
mkdir -p src/core/llm/providers
mkdir -p src/core/vision
mkdir -p src/core/browser
mkdir -p src/core/adapters
mkdir -p src/core/data
mkdir -p src/core/types
mkdir -p src/core/utils
mkdir -p src/mcp-servers
mkdir -p src/assets
mkdir -p adapters/canva/prompts
mkdir -p adapters/canva/examples
mkdir -p docs
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e
mkdir -p tests/fixtures
mkdir -p scripts
```

CREATE PLACEHOLDER FILES (so folders appear in git):
```bash
touch src/sidepanel/index.tsx
touch src/background/index.ts
touch src/contents/universal-injector.ts
touch adapters/canva/selectors.yaml
touch adapters/canva/workflows.yaml
touch docs/README.md
touch tests/unit/.gitkeep
```

═══════════════════════════════════════════════════════════════════════
TASK 13: README.md (Initial Version)
═══════════════════════════════════════════════════════════════════════

CONTENT SECTIONS:

1. TITLE & BADGES
```markdown
# BrowserAI Craft

AI-powered browser automation framework with visual reasoning.




```

2. OVERVIEW
- What it is: Generic automation framework for any website
- Key feature: Natural language → automated workflows
- First target: Canva design automation

3. QUICK START
```markdown
## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Chrome browser

### Installation
```bash
# Clone repository
git clone [repo-url]
cd browserai-craft

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Edit .env and add your API keys

# Start development server
pnpm dev
```

### Load Extension
1. Open Chrome
2. Go to chrome://extensions/
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `build/chrome-mv3-dev` folder
```

4. DEVELOPMENT WORKFLOW
- Running tests
- Linting & formatting
- Building for production

5. ARCHITECTURE
- Link to docs/ARCHITECTURE.md
- Component overview diagram

6. CONTRIBUTING
- Link to docs/CONTRIBUTING.md
- Code of conduct

7. LICENSE
- MIT License

═══════════════════════════════════════════════════════════════════════
TASK 14: Validation Checklist
═══════════════════════════════════════════════════════════════════════

VERIFY SETUP:
1. [ ] `pnpm install` completes without errors
2. [ ] `pnpm type-check` passes (no TypeScript errors)
3. [ ] `pnpm lint` passes (no linting errors)
4. [ ] `pnpm format:check` passes (all files formatted)
5. [ ] `pnpm dev` starts dev server
6. [ ] Extension loads in Chrome (chrome://extensions/)
7. [ ] Side panel opens when clicking extension icon
8. [ ] No console errors in browser DevTools
9. [ ] All folders from PROJECT_STRUCTURE.md exist
10. [ ] .env.example exists with all required variables

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

PROVIDE:
1. Complete package.json with all dependencies
2. All configuration files (tsconfig.json, plasmo.config.ts, etc.)
3. Folder structure created with placeholder files
4. Initial README.md
5. Setup validation script (bash) to check all prerequisites

FORMAT:
- Actual file contents (not templates with placeholders)
- Comments explaining non-obvious configurations
- Working out-of-the-box (no manual fixes required)

VALIDATION:
- A developer can clone, install, and run immediately
- All scripts in package.json work
- No missing dependencies or type errors
- Extension loads successfully in Chrome
```

***

## **PROMPT 0.3: TypeScript Type System & Interface Definitions**

```
PROJECT: BrowserAI Craft - Complete Type System

ROLE: You are creating the comprehensive TypeScript type definitions that will be the foundation for all future development. These types ensure type safety and serve as contracts between components.

CONTEXT:
- Reference ARCHITECTURE.md for component interfaces
- All types must be strict (no 'any' unless absolutely necessary)
- Types are organized by concern (LLM, Vision, Browser, Adapter, etc.)
- Export all types for use throughout the application

═══════════════════════════════════════════════════════════════════════
FILE 1: src/core/types/common.ts - Shared Types
═══════════════════════════════════════════════════════════════════════

COORDINATE TYPES:
```typescript
export interface Coordinates {
  x: number
  y: number
}

export interface BoundingBox {
  x: number        // Top-left X (pixels or percentage)
  y: number        // Top-left Y
  width: number    // Width
  height: number   // Height
}
```

ELEMENT SELECTOR TYPES:
```typescript
export type ElementSelector = 
  | { type: 'css'; selector: string }                    // DOM: "#button"
  | { type: 'coordinates'; x: number; y: number }       // Vision: click at pixel
  | { type: 'semantic'; description: string }            // LLM: "blue Export button"

export interface Element {
  selector: ElementSelector
  bbox?: BoundingBox
  confidence?: number  // For vision-detected elements
}
```

RESULT TYPES:
```typescript
export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
  duration: number  // milliseconds
}

export interface RetryConfig {
  maxAttempts: number
  backoffMs: number       // Initial backoff
  strategy: 'immediate' | 'linear' | 'exponential'
  retryableErrors?: string[]  // Error patterns to retry
}
```

UTILITY TYPES:
```typescript
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Awaited<T> = T extends Promise<infer U> ? U : T

export type NonEmptyArray<T> = [T, ...T[]]
```

═══════════════════════════════════════════════════════════════════════
FILE 2: src/core/types/llm.ts - LLM Types
═══════════════════════════════════════════════════════════════════════

PROVIDER TYPES:
```typescript
export type LLMProvider = 'groq' | 'deepseek' | 'ollama' | 'lmstudio' | 'webllm'

export interface LLMConfig {
  type: LLMProvider
  apiKey?: string         // For cloud providers
  endpoint?: string       // For local providers
  model?: string          // Model name
  temperature?: number
  maxTokens?: number
}
```

MESSAGE TYPES:
```typescript
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface LLMMessage {
  role: MessageRole
  content: string
  name?: string           // Tool name if role is 'tool'
  imageUrl?: string       // For vision models
}

export interface LLMResponse {
  content: string
  model: string
  usage?: TokenUsage
  finishReason?: 'stop' | 'length' | 'tool_calls'
  toolCalls?: ToolCall[]
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
```

TOOL CALLING TYPES:
```typescript
export interface Tool {
  name: string
  description: string
  parameters: JSONSchema   // Tool input schema
}

export interface ToolCall {
  id?: string
  toolName: string
  arguments: Record<string, any>
}

export interface ToolResult {
  toolCallId: string
  result: any
  isError: boolean
}

// JSON Schema type
export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array'
  properties?: Record<string, JSONSchema>
  required?: string[]
  description?: string
  items?: JSONSchema
  enum?: any[]
}
```

GENERATION OPTIONS:
```typescript
export interface GenerateOptions {
  temperature?: number       // 0-2, default 0.7
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
  stream?: boolean
  responseFormat?: 'text' | 'json'
  tools?: Tool[]
}
```

═══════════════════════════════════════════════════════════════════════
FILE 3: src/core/types/vision.ts - Vision & Multimodal Types
═══════════════════════════════════════════════════════════════════════

VISION RESULT TYPES:
```typescript
export interface VisionResult {
  description: string
  elements: DetectedElement[]
  confidence: number
  timestamp: string
}

export interface DetectedElement {
  type: ElementType
  bbox: BoundingBox
  confidence: number
  label: string
  attributes?: Record<string, any>
}

export type ElementType = 
  | 'button'
  | 'input'
  | 'link'
  | 'image'
  | 'text'
  | 'dropdown'
  | 'checkbox'
  | 'canvas'
  | 'unknown'
```

ELEMENT LOCATION TYPES:
```typescript
export interface ElementLocation {
  found: boolean
  bbox?: BoundingBox
  confidence: number
  selector?: string         // If DOM selector can be inferred
  screenshot?: string       // Annotated screenshot (optional)
}

export interface VisualAnchor {
  description: string       // "The blue Export button"
  location: ElementLocation
  alternatives?: ElementLocation[]  // Backup locations
}
```

AESTHETIC SCORING:
```typescript
export interface AestheticScore {
  score: number            // 0-100
  reasoning: string
  criteria: {
    typography: number     // 0-100
    colorPalette: number
    layout: number
    whitespace: number
    overall: number
  }
}

export interface StyleMatch {
  templateId: string
  score: AestheticScore
  screenshot: string
}
```

VERIFICATION TYPES:
```typescript
export interface VerificationResult {
  success: boolean
  reasoning: string
  confidence: number
  screenshot?: string
  issues?: string[]        // List of problems found
}
```

SCREENSHOT TYPES:
```typescript
export interface Screenshot {
  data: string             // Base64 encoded
  format: 'png' | 'jpeg'
  width: number
  height: number
  timestamp: string
  compressed: boolean
}

export interface ScreenshotOptions {
  quality?: number         // 0-100
  format?: 'png' | 'jpeg'
  fullPage?: boolean
  region?: BoundingBox
  maxWidth?: number        // Resize if larger
}
```

═══════════════════════════════════════════════════════════════════════
FILE 4: src/core/types/browser.ts - Browser Automation Types
═══════════════════════════════════════════════════════════════════════

ACTION TYPES:
```typescript
export type ActionType = 
  | 'click'
  | 'type'
  | 'upload'
  | 'wait'
  | 'navigate'
  | 'screenshot'
  | 'scroll'
  | 'hover'
  | 'press_key'
  | 'evaluate'

export interface BrowserAction {
  type: ActionType
  target?: ElementSelector
  value?: any              // Type-specific value
  options?: ActionOptions
}

export interface ActionOptions {
  timeout?: number
  retries?: number
  waitAfter?: number       // Wait after action (ms)
  scrollIntoView?: boolean
}
```

SPECIFIC ACTION TYPES:
```typescript
export interface ClickAction extends BrowserAction {
  type: 'click'
  button?: 'left' | 'right' | 'middle'
  clickCount?: number
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[]
}

export interface TypeAction extends BrowserAction {
  type: 'type'
  text: string
  delay?: number           // Delay between keystrokes
  clearFirst?: boolean
}

export interface WaitAction extends BrowserAction {
  type: 'wait'
  condition: WaitCondition
  timeout?: number
}

export type WaitCondition = 
  | { type: 'element_visible'; selector: string }
  | { type: 'element_hidden'; selector: string }
  | { type: 'network_idle'; timeout?: number }
  | { type: 'custom'; predicate: () => boolean | Promise<boolean> }
  | { type: 'timeout'; duration: number }
```

DOM STATE TYPES:
```typescript
export interface DOMState {
  url: string
  title: string
  visibleElements: VisibleElement[]
  forms: FormElement[]
  canvasElements: CanvasElement[]
  iframes: IFrameInfo[]
  timestamp: string
}

export interface VisibleElement {
  tagName: string
  selector: string
  text: string
  bbox: BoundingBox
  attributes: Record<string, string>
  isInteractive: boolean
}

export interface FormElement {
  selector: string
  inputs: Array<{
    name: string
    type: string
    value: string
    required: boolean
  }>
  submitButton?: string
}

export interface CanvasElement {
  selector: string
  width: number
  height: number
  context: '2d' | 'webgl' | 'webgl2' | 'unknown'
}
```

MCP TYPES:
```typescript
export interface MCPAction {
  tool: string
  args: Record<string, any>
}

export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: JSONSchema
}

export interface MCPToolResult {
  content: string
  isError: boolean
  metadata?: Record<string, any>
}

export interface MCPServerConfig {
  command: string          // e.g., "npx"
  args: string[]           // e.g., ["-y", "@executeautomation/playwright-mcp-server"]
  env?: Record<string, string>
}
```

═══════════════════════════════════════════════════════════════════════
FILE 5: src/core/types/adapter.ts - Adapter System Types
═══════════════════════════════════════════════════════════════════════

BASE ADAPTER INTERFACE:
```typescript
export interface BaseAdapter {
  name: string
  supportedDomains: string[]
  
  // Knowledge base
  getKnowledge(): AdapterKnowledge
  
  // Prompt building
  buildThinkPrompt(observation: Observation): string
  buildVerifyPrompt(task: Task, result: ActionResult): string
  
  // Custom actions
  executeCustomAction(action: BrowserAction): Promise<ActionResult>
  
  // Lifecycle hooks
  onPageLoad?(): Promise<void>
  onPageUnload?(): Promise<void>
}

export interface AdapterKnowledge {
  selectors: SelectorMap
  workflows: WorkflowMap
  canvasRules?: CanvasRules
  commonTasks: TaskTemplateMap
  tips?: string[]
}
```

SELECTOR TYPES:
```typescript
export type SelectorMap = Record<string, string>
// Example: { searchBox: '#search-input', exportButton: '[data-testid="export"]' }

export interface SelectorMetadata {
  selector: string
  description: string
  alternatives?: string[]  // Fallback selectors
  requiresVision?: boolean
}
```

WORKFLOW TYPES:
```typescript
export interface Workflow {
  name: string
  description: string
  steps: WorkflowStep[]
  requirements?: string[]  // Prerequisites
}

export interface WorkflowStep {
  action: BrowserAction
  description: string
  optional?: boolean
  fallback?: WorkflowStep[]
}

export type WorkflowMap = Record<string, Workflow>
```

CANVAS RULES:
```typescript
export interface CanvasRules {
  editorSelector: string
  requiresVision: boolean
  clickableAreas: {
    textLayers: string
    images: string
    shapes: string
  }
  interactions: {
    click: CanvasInteractionRule
    drag: CanvasInteractionRule
    text: CanvasInteractionRule
  }
}

export interface CanvasInteractionRule {
  strategy: 'vision' | 'coordinate' | 'hybrid'
  fallback?: 'vision' | 'coordinate'
  waitAfter?: number
}
```

TASK TEMPLATE TYPES:
```typescript
export interface TaskTemplate {
  name: string
  workflow: Workflow
  dataMapping?: DataMapping
  conditions?: TaskCondition[]
}

export type TaskTemplateMap = Record<string, TaskTemplate>

export interface DataMapping {
  [key: string]: string   // designField: dataColumn
}

export interface TaskCondition {
  check: string           // Condition to evaluate
  action: 'skip' | 'fail' | 'warn'
}
```

═══════════════════════════════════════════════════════════════════════
FILE 6: src/core/types/orchestration.ts - Orchestration Types
═══════════════════════════════════════════════════════════════════════

JOB & TASK TYPES:
```typescript
export interface Job {
  id: string               // UUID
  prompt: string           // Original user prompt
  config: JobConfig
  tasks: Task[]
  status: JobStatus
  progress: number         // 0-100
  currentTaskIndex: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  results: DesignResult[]
  errors: JobError[]
}

export type JobStatus = 
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface JobConfig {
  llmProvider: LLMConfig
  dataSource?: DataSource
  templateMode: 'same' | 'copy' | 'new'
  exportFormat: 'png' | 'pdf' | 'jpg' | 'mp4'
  assets?: AssetCollection
  parallel?: boolean
  maxConcurrent?: number
}
```

TASK TYPES:
```typescript
export interface Task {
  id: string
  name: string
  type: TaskType
  goal: string
  requiresVision: boolean
  dependencies: string[]   // Task IDs
  status: TaskStatus
  attempts: number
  result?: ActionResult
  error?: string
}

export type TaskType = 
  | 'navigation'
  | 'search'
  | 'select'
  | 'edit_text'
  | 'replace_image'
  | 'export'
  | 'vision_select'
  | 'bulk_generate'
  | 'data_load'
  | 'custom'

export type TaskStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

export interface TaskPlan {
  tasks: Task[]
  strategy: 'sequential' | 'parallel'
  estimatedDuration?: number  // seconds
}
```

EXECUTION CONTEXT:
```typescript
export interface ExecutionContext {
  sessionId: string
  dataSource?: DataSource
  dataRows?: DataRow[]
  assets?: AssetCollection
  config: JobConfig
  adapter: BaseAdapter
  variables?: Record<string, any>  // Dynamic variables
}

export interface Observation {
  screenshot?: Screenshot
  domState: DOMState
  task: Task
  adapterKnowledge: AdapterKnowledge
  previousActions: BrowserAction[]
  attempt: number
}
```

PARSED PROMPT:
```typescript
export interface ParsedPrompt {
  action: 'create' | 'modify' | 'duplicate' | 'export'
  count: number
  style?: string
  templatePreference: 'same' | 'copy' | 'new'
  exportFormat: 'png' | 'pdf' | 'jpg' | 'mp4'
  dataMapping?: DataMapping
  additionalInstructions?: string
}
```

ERROR TYPES:
```typescript
export interface JobError {
  taskId: string
  taskName: string
  error: string
  screenshot?: string
  timestamp: string
  recoveryAttempted: boolean
  recoverySucceeded?: boolean
}
```

RESULT TYPES:
```typescript
export interface DesignResult {
  taskId: string
  designId?: string        // Platform-specific ID
  exportUrl?: string
  localPath?: string
  thumbnail?: string
  metadata?: Record<string, any>
}
```

═══════════════════════════════════════════════════════════════════════
FILE 7: src/core/types/data.ts - Data Source Types
═══════════════════════════════════════════════════════════════════════

DATA SOURCE TYPES:
```typescript
export type DataSourceType = 'csv' | 'sheets' | 'json' | 'manual'

export interface DataSource {
  type: DataSourceType
  source: File | string    // File object or URL
  config?: DataSourceConfig
}

export interface DataSourceConfig {
  delimiter?: string       // CSV delimiter
  hasHeader?: boolean      // CSV has header row
  sheetName?: string       // Google Sheets sheet name
  range?: string           // Google Sheets range (A1:Z100)
}

export type DataRow = Record<string, string | number>

export interface ParsedData {
  rows: DataRow[]
  headers: string[]
  source: DataSource
  parsedAt: string
}
```

ASSET TYPES:
```typescript
export interface AssetCollection {
  logos: FileRef[]
  images: FileRef[]
  fonts?: FontRef[]
  colors?: ColorPalette
}

export interface FileRef {
  path?: string            // Local file path
  url?: string             // Remote URL
  blob?: Blob              // In-memory blob
  type: string             // MIME type
  name: string
  size?: number
}

export interface FontRef {
  family: string
  url?: string
  variants?: string[]      // 'regular', 'bold', 'italic'
}

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}
```

VALIDATION TYPES:
```typescript
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field?: string
  message: string
  row?: number
}

export interface ValidationWarning {
  field?: string
  message: string
  row?: number
  suggestion?: string
}
```

═══════════════════════════════════════════════════════════════════════
FILE 8: src/core/types/mcp.ts - MCP Protocol Types
═══════════════════════════════════════════════════════════════════════

MCP CLIENT INTERFACE:
```typescript
export interface MCPClient {
  initialize(): Promise<void>
  shutdown(): Promise<void>
  listTools(): Promise<MCPToolDefinition[]>
  callTool(name: string, args: Record<string, any>): Promise<MCPToolResult>
  getServerInfo(): Promise<MCPServerInfo>
}

export interface MCPServerInfo {
  name: string
  version: string
  capabilities: string[]
}
```

MCP MESSAGE TYPES:
```typescript
export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, any>
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}
```

═══════════════════════════════════════════════════════════════════════
FILE 9: src/core/types/config.ts - Configuration Types
═══════════════════════════════════════════════════════════════════════

USER CONFIG:
```typescript
export interface UserConfig {
  llm: LLMPreferences
  vision: VisionPreferences
  browser: BrowserPreferences
  defaults: DefaultSettings
  privacy: PrivacySettings
}

export interface LLMPreferences {
  defaultProvider: LLMProvider
  providers: Record<LLMProvider, LLMConfig>
  fallbackChain: LLMProvider[]
}

export interface VisionPreferences {
  preferLocal: boolean
  screenshotQuality: number
  maxScreenshotSize: number  // MB
}

export interface BrowserPreferences {
  defaultTimeout: number
  retryAttempts: number
  slowMode: boolean          // Add delays for debugging
  headless: boolean
}

export interface DefaultSettings {
  exportFormat: 'png' | 'pdf' | 'jpg'
  templateMode: 'same' | 'copy' | 'new'
  parallel: boolean
  maxConcurrent: number
}

export interface PrivacySettings {
  allowCloudVision: boolean
  allowTelemetry: boolean
  storeScreenshots: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}
```

═══════════════════════════════════════════════════════════════════════
FILE 10: src/core/types/index.ts - Barrel Export
═══════════════════════════════════════════════════════════════════════

RE-EXPORT ALL TYPES:
```typescript
// Common
export * from './common'

// LLM
export * from './llm'

// Vision
export * from './vision'

// Browser
export * from './browser'

// Adapter
export * from './adapter'

// Orchestration
export * from './orchestration'

// Data
export * from './data'

// MCP
export * from './mcp'

// Config
export * from './config'
```

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

PROVIDE:
1. All 10 type definition files with complete implementations
2. JSDoc comments for complex types
3. Example usage comments
4. Type guards where applicable
5. Utility types for common patterns

FORMAT:
- Organized by concern (one file per major area)
- Consistent naming conventions (PascalCase for types/interfaces)
- No 'any' types unless absolutely necessary (use 'unknown' and narrow)
- Export all types for external use

VALIDATION:
- All types compile without errors
- Types are imported successfully in other modules
- No circular dependencies
- Types accurately reflect system architecture
```

***

**🎯 Phase 0 Complete!**

**Next Steps:**
- Validate Phase 0 outputs (docs, scaffold, types)
- Confirm readiness for Phase 1 (Core Framework)
- Answer: Should I proceed with **Phase 1 prompts** now?
