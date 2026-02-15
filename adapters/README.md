# Adapter Knowledge Bases

This directory contains website-specific adapters for BrowserAI Craft.

## Structure

Each adapter folder contains:

```
adapters/
├── canva/
│   ├── selectors.yaml    # CSS selectors for UI elements
│   ├── workflows.yaml    # Multi-step task sequences
│   ├── canvas-rules.yaml # Canvas interaction rules
│   ├── prompts/          # LLM prompts for Canva tasks
│   └── examples/         # Sample data and screenshots
├── figma/                # (Future)
└── README.md             # This file
```

## Creating a New Adapter

1. Create a folder with the website name (e.g., `figma/`)
2. Add `selectors.yaml` with UI element selectors
3. Add `workflows.yaml` with common task sequences
4. Add prompts in `prompts/` for LLM guidance
5. Implement the adapter class in `src/core/adapters/`

## Selectors Format

```yaml
# selectors.yaml
searchBox: "#search-input"
exportButton: '[data-testid="export"]'
canvas: ".canvas-container"
```

## Workflows Format

```yaml
# workflows.yaml
createDesign:
  description: "Create a new design from template"
  steps:
    - action: click
      target: searchBox
      description: "Click search box"
    - action: type
      target: searchBox
      value: "{{template_name}}"
      description: "Enter template name"
```

## Testing Adapters

Run adapter tests with:

```bash
pnpm test -- --grep "CanvaAdapter"
```
