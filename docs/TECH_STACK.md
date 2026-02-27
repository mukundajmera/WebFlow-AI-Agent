# BrowserAI Craft - Technology Stack Documentation

## 1. Core Framework Stack

### Extension Framework: Plasmo

**Version**: Latest stable (check [plasmo.com](https://plasmo.com))

**Why Chosen**:
- **Modern DX**: Hot module replacement, TypeScript-first, React support out of the box
- **Cross-browser**: Single codebase compiles to Chrome, Firefox, Edge
- **Manifest V3**: Future-proof (Google deprecated V2 in 2024)
- **Built-in utilities**: Message passing wrappers, storage helpers, content script injection

**Alternatives Considered**:
| Alternative | Why Not Chosen |
|-------------|----------------|
| Vanilla Chrome Extension API | Too verbose, manual manifest management, no hot reload |
| WXT | Less mature, smaller community, fewer examples |
| Extension.js | React-only, less flexible for our multi-framework needs |

**Installation**: `pnpm create plasmo`  
**Documentation**: [docs.plasmo.com](https://docs.plasmo.com)

---

### Programming Language: TypeScript 5.x

**Why Chosen**:
- **Type Safety**: Catch errors at compile time, not runtime
- **IDE Support**: IntelliSense, refactoring tools, go-to-definition
- **Scalability**: Large codebase maintainability with interfaces and generics
- **Modern Features**: Decorators, async/await, template literals, optional chaining

**Configuration**: Strict mode enabled, `noImplicitAny: true`

**Alternatives Considered**:
| Alternative | Why Not Chosen |
|-------------|----------------|
| JavaScript | Too error-prone for a codebase of this complexity |
| Flow | Declining ecosystem, weaker tooling than TypeScript |

---

### Package Manager: pnpm

**Why Chosen**:
- **Faster**: Shared node_modules across projects via hard links
- **Disk Efficient**: Symlinks instead of copies, saves gigabytes on large projects
- **Strict**: Prevents phantom dependencies (packages not in package.json)

**Installation**: `npm install -g pnpm`

**Alternatives Considered**:
| Alternative | Why Not Chosen |
|-------------|----------------|
| npm | Slower installs, duplicates packages, larger disk usage |
| yarn | Less disk-efficient than pnpm, npm parity achieved |

---

## 2. User Interface Stack

### UI Framework: React 18

**Why Chosen**:
- **Component Reuse**: Build once, compose everywhere
- **Large Ecosystem**: Rich library of UI components, hooks, patterns
- **Concurrent Features**: Automatic batching, transitions, Suspense
- **Team Familiarity**: Widely known, easy to onboard contributors

**Alternatives Considered**:
| Alternative | Why Not Chosen |
|-------------|----------------|
| Vue 3 | Less team experience, smaller component ecosystem |
| Svelte | Smaller ecosystem, fewer ready-made components |
| Solid.js | Too new, limited production deployments |

---

### Styling: Tailwind CSS 3.x

**Why Chosen**:
- **Rapid Development**: Utility-first approach eliminates context switching
- **Consistent Design**: Built-in design system (spacing, colors, typography)
- **Small Bundle**: PurgeCSS removes unused styles automatically
- **Responsive**: Mobile-first utilities (`sm:`, `md:`, `lg:`)
- **Dark Mode**: Built-in support via `dark:` modifier

**Configuration**: Custom theme for brand colors, extended spacing scale

**Alternatives Considered**:
| Alternative | Why Not Chosen |
|-------------|----------------|
| CSS-in-JS (Emotion, Styled Components) | Runtime overhead, SSR complexity |
| Sass/SCSS | More boilerplate, harder to maintain consistency |
| Plain CSS | Inconsistent styles, no design system |

---

### State Management: Zustand

**Why Chosen**:
- **Lightweight**: <1KB gzipped
- **TypeScript-first**: Excellent type inference
- **Minimal Boilerplate**: No providers, reducers, or actions required
- **React 18 Compatible**: Supports concurrent rendering
- **Devtools**: Works with React DevTools

**Usage**: Global state for jobs, config, UI state

**Alternatives Considered**:
| Alternative | Why Not Chosen |
|-------------|----------------|
| Redux | Too complex for our needs, excessive boilerplate |
| Jotai | Less mature, atomic model adds complexity |
| Context API | Performance issues at scale, prop drilling |

---

## 3. LLM Integration Stack

### Free Cloud LLM: Groq

**API**: `https://api.groq.com/openai/v1/chat/completions`

**Models**:
- `llama-3.3-70b-versatile` - Primary text generation
- `llama-3.2-90b-vision-preview` - Vision tasks

**Why Chosen**:
- **Free Tier**: Generous limits for development and testing
- **Fast Inference**: Industry-leading response times (<500ms for most queries)
- **OpenAI-compatible**: Drop-in replacement, easy integration
- **Model Quality**: Llama 3.3 70B performs well on reasoning tasks

**Rate Limits**: 30 requests/minute (free), 6000 requests/day  
**API Key**: Free registration at [groq.com](https://groq.com)

---

### Paid Cloud LLM: Deepseek

**API**: `https://api.deepseek.com/v1/chat/completions`

**Models**:
- `deepseek-chat` - General conversation
- `deepseek-reasoner` - Complex reasoning tasks

**Why Chosen**:
- **Cost-effective**: $0.27 per 1M input tokens
- **Strong Reasoning**: Excellent for planning and multi-step tasks
- **OpenAI-compatible**: Standard chat completions API

**Pricing**: [deepseek.com/pricing](https://www.deepseek.com/pricing)

---

### Local LLM: Ollama + LM Studio

#### Ollama

**Purpose**: CLI-based local LLM runtime  
**API**: `http://localhost:11434`

**Models**:
- `llama3.2` - General text
- `qwen2.5` - Alternative general text
- `llava:13b` - Vision capabilities

**Installation**: [ollama.com/download](https://ollama.com/download)

**Why Chosen**:
- **Simple**: Single binary, easy model management (`ollama pull llama3.2`)
- **Lightweight**: Low memory footprint compared to alternatives
- **Fast Switching**: Swap models instantly

#### LM Studio

**Purpose**: GUI-based local LLM runtime  
**API**: `http://localhost:1234` (OpenAI-compatible)

**Models**: User downloads via built-in model browser

**Installation**: [lmstudio.ai](https://lmstudio.ai)

**Why Chosen**:
- **User-friendly**: Visual interface for non-technical users
- **MCP Integration**: Built-in Model Context Protocol support
- **Mac Optimized**: Metal acceleration for Apple Silicon

---

### In-Browser LLM: WebLLM (mlc-ai)

**Library**: `@mlc-ai/web-llm`  
**Technology**: WebGPU (hardware acceleration)

**Models**:
- `Llama-3.2-1B-Instruct` - Fast, 2GB download
- `Phi-3.5-mini` - Efficient, 3GB download

**Why Chosen**:
- **Zero Setup**: No installation required
- **Privacy**: Everything runs client-side
- **Offline**: Works without internet after model download

**Limitation**: Requires modern browser with WebGPU support  
**Fallback**: Transformers.js (WASM-based, slower but wider support)

---

## 4. Vision & Multimodal Stack

### Local Vision Model: LLaVA 13B (via Ollama)

**Model**: `llava:13b`

**Purpose**:
- Analyze screenshots to locate UI elements
- Verify task completion visually
- Describe page state for debugging

**Why Chosen**:
- **Best Local Multimodal**: Outperforms alternatives on visual understanding
- **Ollama Integration**: Easy deployment via `ollama pull llava:13b`
- **13B Sweet Spot**: Balance of quality and speed (7B too weak, 34B too slow)

**Hardware Requirements**: 16GB+ RAM, GPU recommended  
**Installation**: `ollama pull llava:13b`

---

### Cloud Vision Models

#### GPT-4V (OpenAI)

**API**: OpenAI chat completions with `image_url` content  
**Pricing**: ~$0.01 per image  
**Why**: Best-in-class accuracy for complex visual tasks

#### Gemini 2.0 Vision (Google)

**API**: Google Generative AI  
**Pricing**: Generous free tier  
**Why**: Cost-effective alternative with good performance

---

### Screenshot Library

**API**: `chrome.tabs.captureVisibleTab()`  
**Format**: PNG base64

**Utilities**:
- Compression (JPEG conversion, quality adjustment)
- Cropping (extract regions of interest)
- Resizing (reduce dimensions before LLM transmission)

---

## 5. Browser Automation Stack

### MCP Protocol: Model Context Protocol

**Purpose**: Standardized tool calling for browser automation  
**Specification**: [modelcontextprotocol.io](https://modelcontextprotocol.io)

**Why Chosen**:
- **Industry Standard**: Backed by Google, Anthropic
- **Tool Abstraction**: LLMs call browser tools uniformly
- **Self-documenting**: Tools expose schemas dynamically
- **Interoperability**: Works across different LLM providers

---

### MCP Server: Playwright MCP

**Package**: `@executeautomation/playwright-mcp-server`  
**Installation**: `npx -y @executeautomation/playwright-mcp-server`

**Tools Provided**:
- `browser_navigate` - Navigate to URL
- `browser_click` - Click element
- `browser_type` - Type text
- `browser_screenshot` - Capture page
- `browser_wait` - Wait for condition
- `browser_upload` - Upload file
- `browser_evaluate` - Run custom JavaScript

**Why Chosen**:
- **Full-featured**: Comprehensive browser control
- **Active Maintenance**: Regular updates and fixes
- **Production-ready**: Battle-tested in real deployments

---

### Alternative MCP Server: Browser MCP

**Package**: `@modelcontextprotocol/server-browser`

**Why**: Lightweight alternative when full Playwright capabilities aren't needed

---

### Content Script Framework

**Technology**: Vanilla TypeScript

**Why**: Maximum performance, minimal overhead, direct DOM access

**Pattern**: Message-based communication with background service worker

**Injection**: Plasmo handles automatic injection based on manifest configuration

---

## 6. Data & Storage Stack

### CSV Parsing: PapaParse

**Package**: `papaparse`

**Features**:
- Robust error handling for malformed CSVs
- Streaming support for large files
- Auto-detect delimiters
- Header parsing and type conversion

**TypeScript Types**: `@types/papaparse`

**Why Chosen**:
- Battle-tested, handles edge cases gracefully
- Streaming prevents memory issues with large files

---

### Google Sheets: Google Sheets API v4

**Authentication**: OAuth 2.0  
**Scopes**: `spreadsheets.readonly`  
**Library**: `googleapis` npm package

**Why**: Official Google SDK, well-documented, reliable

---

### Chrome Storage: chrome.storage.local API

**Capacity**: 10MB for extension local storage

**Usage**:
- Job state persistence
- User configuration
- Compressed screenshots (temporary)

**Wrapper**: Plasmo provides typed storage wrappers

**Cleanup Strategy**: Auto-delete old jobs to stay under limit

---

### File Handling: FileReader API

**Purpose**: Read user-uploaded CSVs, images

**Format**: Base64 for transmission, Blob for processing

---

## 7. Testing Stack

### Unit Testing: Vitest

**Why Chosen**:
- **Fast**: Vite-powered, instant feedback
- **TypeScript**: First-class support
- **API**: Jest-compatible, easy migration

**Configuration**: `vitest.config.ts`  
**Coverage**: v8 for coverage reports  
**Target**: >80% coverage for core logic

---

### Integration Testing: Vitest + Mock Services

**Strategy**: Mock LLM responses, MCP calls

**Tools**:
- `msw` (Mock Service Worker) for API mocking
- Custom mocks for Chrome APIs

**Purpose**: Test component interactions without external dependencies

---

### E2E Testing: Playwright Test

**Why Chosen**:
- **Browser Automation**: Same technology as MCP server
- **Multi-browser**: Test Chrome, Firefox, Edge
- **Debugging**: Trace viewer, video recording, screenshots

**Test Environment**: Load unpacked extension in test browser

**Fixtures**: Sample Canva pages, mock data

---

### Visual Regression (Optional): Playwright + Percy

**Purpose**: Detect unintended UI changes

**Tool**: [Percy.io](https://percy.io) for visual diffs

**Usage**: Screenshot side panel on each build, compare against baseline

---

## 8. Development Tools Stack

### Linting: ESLint

**Configuration**:
- `@typescript-eslint/recommended`
- `plugin:react/recommended`
- `plugin:react-hooks/recommended`
- `prettier` (disables conflicting rules)

**Auto-fix**: On save in VS Code

---

### Formatting: Prettier

**Configuration**:
- 2-space indent
- Semicolons
- Double quotes
- Trailing commas (ES5)

**Integration**: ESLint-Prettier plugin

---

### Type Checking: tsc --noEmit

**Purpose**: Check types without emitting files (Plasmo handles build)

**CI**: Run in GitHub Actions on every PR

**Pre-commit**: Optional local check

---

### Git Hooks: Husky + lint-staged

**Pre-commit**: Run linter and formatter on staged files  
**Pre-push**: Run type check and unit tests

**Why**: Catch issues before they reach CI

---

### Debugging

| Target | Tool |
|--------|------|
| Background (Service Worker) | `chrome://extensions/` → Inspect service worker |
| Content Scripts | Regular Chrome DevTools |
| React Components | React DevTools extension |

---

## 9. Build & Deployment Stack

### Build Tool: Vite (via Plasmo)

**Why**: Fast HMR (Hot Module Replacement), ESM-native

**Configuration**: `plasmo.config.ts` overrides Vite defaults

**Output**: `build/` folder with Manifest V3 structure

---

### Bundler: Rollup (internal to Vite)

**Why**: Tree-shaking, smaller bundles

**Configuration**: Automatic via Plasmo

---

### Minification: Terser

**Purpose**: Reduce bundle size for production

**Setting**: Enabled automatically in Plasmo production builds

---

### Manifest Version: Manifest V3

**Why Required**: Chrome deprecated V2 in 2024

**Features**:
- Service workers (no persistent background pages)
- Declarative permissions
- Enhanced security

---

### Cross-Browser Build

**Chrome**: Default target (`pnpm build`)  
**Firefox**: `plasmo build --target=firefox-mv3`

**Manifest Adaptations**: Handled automatically by Plasmo

---

### Chrome Web Store Publishing

**Tool**: Chrome Web Store Developer Dashboard  
**Process**: Upload ZIP, fill metadata, submit for review  
**Review Time**: ~3-5 business days

---

### Version Control: Git + GitHub

**Branching**: GitFlow (main, develop, feature/*)  
**CI/CD**: GitHub Actions  
**Releases**: Semantic versioning, GitHub Releases

---

## 10. Monitoring & Analytics (Post-Launch)

### Error Tracking: Sentry (Optional)

**Purpose**: Capture runtime errors in production

**Privacy**: Opt-in only, user can disable

**Integration**: Sentry SDK for browser extensions

---

### Usage Analytics: Minimal, Privacy-First

**Approach**: Custom telemetry (not Google Analytics)

**Data Collected**:
- Feature usage counts
- Performance metrics
- Error rates

**Storage**: Aggregated, anonymized, local only

**Consent**: Explicit opt-in required

---

### Logging: Custom Logger Utility

**Levels**: DEBUG, INFO, WARN, ERROR

**Storage**: `chrome.storage.local` (last 1000 entries)

**Export**: Download logs as JSON for debugging

---

## Technology Decision Matrix

| Decision | Chosen | Key Factor |
|----------|--------|------------|
| Extension Framework | Plasmo | Best DX, cross-browser support |
| LLM Provider | Groq (primary) | Free tier, fast inference |
| Local LLM | Ollama | Simple setup, lightweight |
| Vision Model | LLaVA 13B | Best local multimodal |
| Browser Automation | Playwright MCP | Industry standard, MCP native |
| State Management | Zustand | Minimal boilerplate |
| Testing | Vitest | Fast, TypeScript-first |
| Styling | Tailwind CSS | Rapid development |
