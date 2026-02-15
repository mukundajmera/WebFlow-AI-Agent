# BrowserAI Craft - Project Structure Documentation

## 1. Complete Folder Hierarchy

```
browserai-craft/
├── README.md                      # Project overview, quick start guide
├── LICENSE                        # Open source license (MIT)
├── package.json                   # Dependencies, scripts
├── pnpm-lock.yaml                 # Lock file for reproducible builds
├── tsconfig.json                  # TypeScript configuration
├── plasmo.config.ts               # Plasmo framework configuration
├── tailwind.config.js             # Tailwind CSS customization
├── postcss.config.js              # PostCSS configuration
├── vitest.config.ts               # Vitest test configuration
├── .env.example                   # Environment template (API keys)
├── .gitignore                     # Git ignore patterns
├── .eslintrc.js                   # Linting rules
├── .prettierrc                    # Code formatting rules
│
├── src/                           # Source code root
│   ├── sidepanel/                 # Side panel UI (React components)
│   │   ├── index.tsx              # Entry point, main layout
│   │   ├── components/            # Reusable UI components
│   │   │   ├── PromptInput.tsx    # Natural language input field
│   │   │   ├── LLMSelector.tsx    # Provider selection dropdown
│   │   │   ├── AdapterSelector.tsx# Website adapter picker
│   │   │   ├── DataSourcePicker.tsx # CSV/Sheets upload
│   │   │   ├── ConfigPanel.tsx    # Settings interface
│   │   │   ├── JobQueue.tsx       # Active/history jobs list
│   │   │   ├── ProgressBar.tsx    # Visual progress indicator
│   │   │   └── DebugPanel.tsx     # Developer debug logs
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useJobs.ts         # Job state management
│   │   │   ├── useLLMProviders.ts # Provider status
│   │   │   └── useConfig.ts       # User settings
│   │   ├── styles/                # CSS styles
│   │   │   └── globals.css        # Global styles and Tailwind imports
│   │   └── types/                 # UI-specific types
│   │       └── ui.types.ts        # Component prop types
│   │
│   ├── background/                # Service worker (main logic)
│   │   ├── index.ts               # Service worker entry point
│   │   ├── messages/              # Message handlers (UI → Background)
│   │   │   ├── orchestrate.ts     # Main automation trigger
│   │   │   ├── configure.ts       # Update settings
│   │   │   ├── status.ts          # Job status queries
│   │   │   ├── pause.ts           # Pause job
│   │   │   ├── resume.ts          # Resume job
│   │   │   └── cancel.ts          # Cancel job
│   │   └── core/                  # Core orchestration logic
│   │       ├── OrchestrationEngine.ts  # Main brain
│   │       ├── TaskPlanner.ts     # Prompt → tasks conversion
│   │       ├── ExecutionLoop.ts   # Observe-Think-Act loop
│   │       ├── StateManager.ts    # Job persistence
│   │       └── PromptParser.ts    # Natural language parsing
│   │
│   ├── contents/                  # Content scripts (injected into pages)
│   │   ├── universal-injector.ts  # Injects into any page
│   │   ├── dom-monitor.ts         # Watches DOM changes
│   │   ├── action-executor.ts     # Executes click/type actions
│   │   └── screenshot-helper.ts   # Captures page/element images
│   │
│   ├── core/                      # Generic framework (site-agnostic)
│   │   ├── llm/                   # LLM integration
│   │   │   ├── LLMAdapter.ts      # Main LLM interface
│   │   │   ├── BaseLLMProvider.ts # Abstract provider class
│   │   │   ├── providers/         # Concrete provider implementations
│   │   │   │   ├── GroqProvider.ts
│   │   │   │   ├── DeepseekProvider.ts
│   │   │   │   ├── OllamaProvider.ts
│   │   │   │   ├── LMStudioProvider.ts
│   │   │   │   └── WebLLMProvider.ts
│   │   │   ├── ToolCalling.ts     # MCP tool integration
│   │   │   └── PromptTemplates.ts # Reusable prompts
│   │   │
│   │   ├── vision/                # Vision & multimodal AI
│   │   │   ├── VisionAgent.ts     # Main vision interface
│   │   │   ├── ScreenshotCapture.ts # Capture utilities
│   │   │   ├── ElementDetector.ts # Find elements visually
│   │   │   ├── LayoutAnalyzer.ts  # Understand design structure
│   │   │   └── AestheticScorer.ts # Rate visual appeal
│   │   │
│   │   ├── browser/               # Browser automation
│   │   │   ├── BrowserAgent.ts    # Main browser interface
│   │   │   ├── MCPIntegration.ts  # MCP client
│   │   │   ├── DOMQuery.ts        # DOM inspection utilities
│   │   │   ├── ActionExecutor.ts  # Execute browser actions
│   │   │   └── SelfHealing.ts     # Adaptive selector strategies
│   │   │
│   │   ├── adapters/              # Website-specific logic
│   │   │   ├── BaseAdapter.ts     # Abstract adapter interface
│   │   │   ├── AdapterRegistry.ts # Load adapters dynamically
│   │   │   ├── CanvaAdapter.ts    # Canva implementation
│   │   │   ├── FigmaAdapter.ts    # Future: Figma implementation
│   │   │   └── GenericAdapter.ts  # Fallback for unknown sites
│   │   │
│   │   ├── data/                  # Data sources & parsing
│   │   │   ├── CSVParser.ts       # CSV file handling
│   │   │   ├── GoogleSheetsConnector.ts # Sheets API integration
│   │   │   ├── AssetManager.ts    # Image/logo handling
│   │   │   └── DataValidator.ts   # Input validation
│   │   │
│   │   ├── types/                 # TypeScript definitions
│   │   │   ├── common.ts          # Shared types
│   │   │   ├── llm.ts             # LLM types
│   │   │   ├── vision.ts          # Vision types
│   │   │   ├── browser.ts         # Browser types
│   │   │   ├── adapter.ts         # Adapter types
│   │   │   ├── orchestration.ts   # Orchestration types
│   │   │   ├── data.ts            # Data types
│   │   │   ├── mcp.ts             # MCP types
│   │   │   ├── config.ts          # Configuration types
│   │   │   └── index.ts           # Barrel export
│   │   │
│   │   └── utils/                 # Shared utilities
│   │       ├── Logger.ts          # Structured logging
│   │       ├── ErrorHandler.ts    # Error utilities
│   │       ├── ConfigManager.ts   # Read/write config
│   │       ├── Retry.ts           # Retry logic with backoff
│   │       └── Validation.ts      # Input validation helpers
│   │
│   ├── mcp-servers/               # MCP server configurations
│   │   ├── playwright-mcp.json    # Playwright MCP config
│   │   └── browser-mcp.json       # Browser MCP config
│   │
│   └── assets/                    # Static resources
│       ├── icon-16.png            # Extension icon (16x16)
│       ├── icon-48.png            # Extension icon (48x48)
│       ├── icon-128.png           # Extension icon (128x128)
│       └── logo.svg               # SVG logo
│
├── adapters/                      # Adapter knowledge bases
│   ├── canva/                     # Canva-specific knowledge
│   │   ├── selectors.yaml         # UI element selectors
│   │   ├── workflows.yaml         # Common task sequences
│   │   ├── canvas-rules.yaml      # Canvas interaction rules
│   │   ├── prompts/               # Canva-specific LLM prompts
│   │   │   ├── template-search.txt
│   │   │   ├── text-edit.txt
│   │   │   ├── image-replace.txt
│   │   │   └── export.txt
│   │   └── examples/              # Example designs/data
│   │       ├── sample-template.png
│   │       └── sample-data.csv
│   ├── figma/                     # Future: Figma knowledge
│   │   └── .gitkeep
│   └── README.md                  # How to create adapters
│
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # System design
│   ├── PROJECT_STRUCTURE.md       # Folder structure (this file)
│   ├── TECH_STACK.md              # Technology choices
│   ├── DESIGN_PRINCIPLES.md       # Coding principles
│   ├── DEVELOPMENT_ROADMAP.md     # Implementation phases
│   ├── ADAPTER_SYSTEM.md          # Creating adapters guide
│   ├── MCP_INTEGRATION.md         # MCP setup guide
│   ├── CANVA_DEEP_DIVE.md         # Canva automation knowledge
│   ├── USER_GUIDE.md              # End-user documentation
│   ├── API_REFERENCE.md           # Developer API docs
│   ├── TROUBLESHOOTING.md         # Common issues & fixes
│   ├── CONTRIBUTING.md            # Contribution guidelines
│   └── CHANGELOG.md               # Version history
│
├── tests/                         # Test suites
│   ├── unit/                      # Unit tests (Vitest)
│   │   ├── llm/                   # LLM adapter tests
│   │   ├── vision/                # Vision agent tests
│   │   ├── browser/               # Browser agent tests
│   │   └── adapters/              # Adapter tests
│   ├── integration/               # Integration tests
│   │   ├── orchestration.test.ts  # End-to-end orchestration
│   │   └── canva-workflows.test.ts# Canva-specific flows
│   ├── e2e/                       # End-to-end tests (Playwright)
│   │   ├── single-design.spec.ts
│   │   └── bulk-generation.spec.ts
│   ├── fixtures/                  # Test data
│   │   ├── sample.csv
│   │   ├── screenshot.png
│   │   └── mock-responses.json
│   ├── helpers/                   # Test utilities
│   │   ├── mock-llm.ts
│   │   └── mock-browser.ts
│   └── setup.ts                   # Test setup file
│
├── scripts/                       # Build & dev scripts
│   ├── build.sh                   # Production build
│   ├── dev.sh                     # Development server
│   ├── test.sh                    # Run all tests
│   └── package-extension.sh       # Create distributable ZIP
│
└── .husky/                        # Git hooks
    ├── pre-commit                 # Run lint-staged
    └── pre-push                   # Run type-check and tests
```

---

## 2. Module Organization Philosophy

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UI LAYER (src/sidepanel/)                        │
│              Presentation logic, user interaction                   │
│              React components, hooks, styles                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓ chrome.runtime.sendMessage
┌─────────────────────────────────────────────────────────────────────┐
│               CONTROL LAYER (src/background/)                       │
│          Orchestration, business logic, state management            │
│          Service worker, message handlers, core engine              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓ function calls
┌─────────────────────────────────────────────────────────────────────┐
│               EXECUTION LAYER (src/core/*)                          │
│           Capabilities: LLM, Vision, Browser automation             │
│           Provider-agnostic interfaces, tool implementations        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓ adapter.method()
┌─────────────────────────────────────────────────────────────────────┐
│               ADAPTER LAYER (src/core/adapters/, adapters/)         │
│            Site-specific knowledge, selectors, workflows            │
│            Self-contained modules per supported website             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓ API calls, MCP protocol
┌─────────────────────────────────────────────────────────────────────┐
│               EXTERNAL LAYER                                        │
│           MCP servers, LLM APIs, Google APIs, browser APIs          │
└─────────────────────────────────────────────────────────────────────┘
```

### Separation Principles

| Principle | Implementation |
|-----------|----------------|
| UI knows nothing about LLM providers | UI calls abstract `useLLMProviders()` hook |
| Core framework knows nothing about Canva | Uses `BaseAdapter` interface, no hardcoded selectors |
| Adapters are self-contained | All Canva knowledge in `adapters/canva/` folder |
| Types are centralized | All types in `src/core/types/`, single source of truth |
| Utils are pure functions | No side effects, easily testable |

---

## 3. File Naming Conventions

### TypeScript Files

| Pattern | Usage | Examples |
|---------|-------|----------|
| `PascalCase.ts` | Classes, components, providers | `OrchestrationEngine.ts`, `CanvaAdapter.ts` |
| `camelCase.ts` | Utilities, helpers | `logger.ts`, `retry.ts` |
| `*.types.ts` | Type-only files | `ui.types.ts`, `api.types.ts` |
| `*.test.ts` | Unit test files | `LLMAdapter.test.ts` |
| `*.spec.ts` | E2E test files | `single-design.spec.ts` |

### React Components

| Pattern | Usage | Examples |
|---------|-------|----------|
| `PascalCase.tsx` | React components | `PromptInput.tsx`, `JobQueue.tsx` |
| One component per file | Maintainability | `ConfigPanel.tsx` contains only `ConfigPanel` |
| Co-located styles | CSS modules (optional) | `Button.tsx` + `Button.module.css` |

### Configuration Files

| Pattern | Usage | Examples |
|---------|-------|----------|
| `kebab-case.json` | JSON configs | `playwright-mcp.json`, `browser-mcp.json` |
| `kebab-case.yaml` | YAML configs | `canvas-rules.yaml`, `selectors.yaml` |
| `.example` suffix | Templates | `.env.example` |

---

## 4. Import Path Aliases

TypeScript path aliases enable clean imports without long relative paths:

```typescript
// Instead of this (error-prone, hard to refactor):
import { LLMAdapter } from '../../../core/llm/LLMAdapter';
import { Job } from '../../../core/types/orchestration';

// Use this (clean, maintainable):
import { LLMAdapter } from '~core/llm/LLMAdapter';
import { Job } from '~types/orchestration';
```

### Alias Configuration

| Alias | Resolves To | Usage |
|-------|-------------|-------|
| `~core/*` | `src/core/*` | Core framework modules |
| `~sidepanel/*` | `src/sidepanel/*` | UI components and hooks |
| `~background/*` | `src/background/*` | Service worker modules |
| `~contents/*` | `src/contents/*` | Content script modules |
| `~adapters/*` | `adapters/*` | Adapter knowledge bases |
| `~types/*` | `src/core/types/*` | Type definitions |
| `~utils/*` | `src/core/utils/*` | Utility functions |

---

## 5. Data Flow Summary

### User Input Flow

```
src/sidepanel/index.tsx
    │
    │ User types prompt and clicks "Generate"
    │
    ↓ chrome.runtime.sendMessage({ type: 'START_JOB', payload })
    │
src/background/messages/orchestrate.ts
    │
    │ Receives message, validates input
    │
    ↓ orchestrationEngine.execute(prompt, config)
    │
src/background/core/OrchestrationEngine.ts
    │
    │ Parses prompt, creates task plan, executes
    │
    ↓ Returns Job result
```

### State Updates Flow

```
OrchestrationEngine updates job progress
    │
    ↓ stateManager.saveJob(updatedJob)
    │
src/background/core/StateManager.ts
    │
    │ Saves to chrome.storage.local
    │
    ↓ chrome.storage.local.set({ jobs: [...] })
    │
chrome.storage.onChanged event fires
    │
src/sidepanel/hooks/useJobs.ts
    │
    │ Detects storage change, updates state
    │
    ↓ React re-renders UI with new progress
```

### Content Script Flow

```
src/background/core/BrowserAgent.ts
    │
    │ Needs to click element on page
    │
    ↓ chrome.tabs.sendMessage(tabId, { type: 'CLICK', target })
    │
src/contents/action-executor.ts
    │
    │ Receives message, finds element, clicks
    │
    ↓ return { success: true, result }
    │
BrowserAgent receives result, continues
```

---

## 6. Key Directories Explained

### `src/core/llm/providers/`
Each provider implements the same interface but connects to different LLM services:
- **GroqProvider.ts**: Free cloud API (Llama 3.3 70B)
- **OllamaProvider.ts**: Local LLM via localhost:11434
- **LMStudioProvider.ts**: Local LLM via localhost:1234
- **WebLLMProvider.ts**: In-browser LLM via WebGPU

### `src/core/types/`
Centralized TypeScript definitions ensure consistency across the codebase:
- All types exported from `index.ts` barrel file
- Organized by concern (LLM, Vision, Browser, etc.)
- Shared by all layers without circular dependencies

### `adapters/canva/`
Self-contained knowledge base for Canva automation:
- `selectors.yaml`: CSS selectors for UI elements
- `workflows.yaml`: Multi-step task sequences
- `prompts/`: LLM prompts tailored to Canva tasks
- `examples/`: Sample data for testing

### `tests/`
Three-level testing strategy:
- `unit/`: Isolated function/component tests (Vitest)
- `integration/`: Component interaction tests (Vitest + MSW)
- `e2e/`: Full workflow tests (Playwright)
