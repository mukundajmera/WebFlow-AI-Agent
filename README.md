# BrowserAI Craft

🤖 AI-powered browser automation framework with visual reasoning.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![Plasmo](https://img.shields.io/badge/Plasmo-Framework-purple)](https://plasmo.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## Overview

BrowserAI Craft is a revolutionary cross-browser automation framework that transforms natural language instructions into automated web workflows. Unlike traditional automation tools that rely on brittle selectors, BrowserAI Craft uses AI-powered visual reasoning to understand and interact with web pages.

### Key Features

- 🗣️ **Natural Language Interface** - Describe what you want, not how to do it
- 👁️ **Visual Reasoning** - AI analyzes screenshots to understand UI state
- 🔄 **Self-Healing** - Automatically recovers when selectors break
- 🔒 **Privacy-First** - Support for local LLMs (Ollama, LM Studio)
- 🔌 **Extensible** - Pluggable adapter system for any website

### First Target: Canva Automation

Create hundreds of designs from CSV data with a single prompt:

```
"Create 100 Instagram posts from my spreadsheet, using the blue minimalist template"
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Chrome browser

### Installation

```bash
# Clone repository
git clone https://github.com/mukundajmera/WebFlow-AI-Agent.git
cd WebFlow-AI-Agent

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Edit .env and add your API keys (Groq is free!)

# Start development server
pnpm dev
```

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `build/chrome-mv3-dev` folder
5. Click the extension icon to open the side panel

## Development

### Available Scripts

```bash
pnpm dev              # Start development server with hot reload
pnpm build            # Production build for Chrome
pnpm build:firefox    # Production build for Firefox
pnpm test             # Run unit tests
pnpm test:e2e         # Run end-to-end tests
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix linting issues
pnpm format           # Format code with Prettier
pnpm type-check       # TypeScript type checking
```

### Project Structure

```
browserai-craft/
├── src/
│   ├── sidepanel/        # React UI components
│   ├── background/       # Service worker logic
│   ├── contents/         # Content scripts
│   └── core/             # Core framework
│       ├── llm/          # LLM integration
│       ├── vision/       # Visual AI
│       ├── browser/      # Browser automation
│       ├── adapters/     # Website adapters
│       └── types/        # TypeScript definitions
├── adapters/             # Website-specific knowledge
│   └── canva/            # Canva selectors & workflows
├── docs/                 # Documentation
└── tests/                # Test suites
```

## Architecture

BrowserAI Craft uses a layered architecture:

```
┌─────────────────────────────────────────┐
│         UI Layer (Side Panel)           │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│     Orchestration Engine (Background)   │
│     Observe → Think → Act → Verify      │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         Execution Layer                 │
│   LLM Adapter │ Vision │ Browser Agent  │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         Adapter Layer                   │
│      Canva │ Figma │ Generic            │
└─────────────────────────────────────────┘
```

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## LLM Support

### Cloud Providers (API Key Required)
- **Groq** - Free tier, fast inference (recommended)
- **Deepseek** - Cost-effective, strong reasoning

### Local Providers (No API Key)
- **Ollama** - CLI-based, easy setup
- **LM Studio** - GUI-based, MCP integration

### In-Browser (Experimental)
- **WebLLM** - WebGPU-powered, zero setup

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design
- [Project Structure](docs/PROJECT_STRUCTURE.md) - Code organization
- [Tech Stack](docs/TECH_STACK.md) - Technology choices

## Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`pnpm test`)
5. Submit a pull request

## Roadmap

- [x] Phase 0: Foundation & Architecture
- [ ] Phase 1: Core Framework
- [ ] Phase 2: LLM Integration
- [ ] Phase 3: Vision Agent
- [ ] Phase 4: Browser Agent
- [ ] Phase 5: Canva Adapter
- [ ] Phase 6: Bulk Generation
- [ ] Phase 7: Polish & Testing
- [ ] Phase 8: Cross-Browser Support

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ by the BrowserAI Craft Team