# PHASE 2-5: COMPLETE PROMPTS

---

## PROMPT 2.1: Website Adapters (Canva, Figma, Generic)

```
PROJECT: BrowserAI Craft - Website-Specific Adapters

ROLE: You are building adapters that encode website-specific knowledge: selectors, workflows, and custom actions for different design platforms.

CONTEXT FROM RESEARCH:
Reference PDF sections:
- Section 4.1: Platform adaptation patterns
- Section 2.2: Canva-specific workflows
- Section 7.1: Multi-platform orchestration

ADAPTER ARCHITECTURE:
Each adapter implements the WebsiteAdapter interface with:
- Site detection (URL patterns)
- Element selectors (buttons, inputs, canvas)
- Common workflows (create, edit, export)
- Custom actions (platform-specific operations)
- Verification strategies

═══════════════════════════════════════════════════════════════════════
COMPONENT 1: CanvaAdapter (src/adapters/CanvaAdapter.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Encode Canva-specific knowledge for automation.

CLASS: CanvaAdapter implements WebsiteAdapter

PROPERTIES:
```typescript
name = 'Canva'
urlPatterns = [/canva\.com\/design/, /canva\.com\/create/]
baseUrl = 'https://www.canva.com'
```

SELECTORS:
```typescript
selectors = {
  // Navigation
  homeButton: '[data-testid="home-button"]',
  createButton: '[data-testid="create-button"]',
  templatesTab: '[data-testid="templates-tab"]',
  searchInput: '[data-testid="search-input"]',
  
  // Canvas
  canvasContainer: '[data-testid="canvas-container"]',
  editor: '[data-testid="editor"]',
  designCanvas: 'canvas[role="img"]',
  
  // Toolbar
  textButton: '[data-testid="text-button"]',
  imagesButton: '[data-testid="images-button"]',
  elementsButton: '[data-testid="elements-button"]',
  uploadsButton: '[data-testid="uploads-button"]',
  
  // Export
  exportButton: '[data-testid="export-button"]',
  downloadButton: '[data-testid="download-button"]',
  fileTypeDropdown: '[data-testid="file-type-dropdown"]',
  
  // Templates
  templateCard: '[data-testid="template-card"]',
  templatePreview: '[data-testid="template-preview"]',
  useTemplateButton: '[data-testid="use-template-button"]',
  
  // Text editing
  textElement: '[data-text-element="true"]',
  textInput: '[contenteditable="true"]',
  
  // Modals
  modal: '[role="dialog"]',
  modalClose: '[aria-label="Close"]',
  loadingSpinner: '[data-testid="loading-spinner"]'
}
```

WORKFLOWS:
```typescript
commonTasks = {
  createFromTemplate: [
    {id: 'nav_home', action: 'navigate', target: this.baseUrl},
    {id: 'click_templates', action: 'click', target: this.selectors.templatesTab},
    {id: 'search_template', action: 'type', target: this.selectors.searchInput},
    {id: 'select_template', action: 'custom', customAction: 'selectBestTemplate'},
    {id: 'open_editor', action: 'click', target: this.selectors.useTemplateButton}
  ],
  
  editText: [
    {id: 'wait_editor', action: 'wait', condition: 'element_visible', target: this.selectors.editor},
    {id: 'click_text', action: 'custom', customAction: 'selectTextElement'},
    {id: 'edit_text', action: 'type', target: this.selectors.textInput},
    {id: 'deselect', action: 'click', target: this.selectors.canvasContainer}
  ],
  
  replaceImage: [
    {id: 'select_image', action: 'custom', customAction: 'selectImageElement'},
    {id: 'click_uploads', action: 'click', target: this.selectors.uploadsButton},
    {id: 'upload_file', action: 'uploadFile', target: 'input[type="file"]'},
    {id: 'apply_image', action: 'custom', customAction: 'applyUploadedImage'}
  ],
  
  export: [
    {id: 'click_export', action: 'click', target: this.selectors.exportButton},
    {id: 'select_format', action: 'click', target: this.selectors.fileTypeDropdown},
    {id: 'choose_format', action: 'custom', customAction: 'selectExportFormat'},
    {id: 'download', action: 'click', target: this.selectors.downloadButton},
    {id: 'wait_download', action: 'wait', condition: 'network_idle'}
  ]
}
```

METHODS:

Method: detectWebsite(url: string): boolean
Purpose: Check if current URL is Canva
Implementation:
```typescript
return this.urlPatterns.some(pattern => pattern.test(url))
```

Method: getKnowledgeBase(): AdapterKnowledge
Purpose: Return all selectors and workflows
Implementation:
- Return object with selectors, commonTasks, customActions metadata

Method: buildThinkPrompt(observation: Observation): string
Purpose: Create context-aware prompt for LLM reasoning
Implementation:
```typescript
return `
System: You are automating Canva design creation.

Current Page: ${observation.url}
Goal: ${observation.task.goal}

Canva UI Structure:
- Left sidebar: Templates, Elements, Text, Uploads
- Center: Canvas editor
- Top toolbar: Export, Share, Undo/Redo

Available Elements (from DOM):
${JSON.stringify(observation.domState.visibleElements)}

Canva-Specific Selectors:
${JSON.stringify(this.selectors)}

Previous Actions:
${observation.previousActions.map(a => `${a.type} on ${a.target}`).join('\n')}

Determine the next action to achieve the goal. Consider:
1. Text elements in Canva are editable by clicking them
2. Images can be replaced via Uploads panel
3. Template search requires specific keywords
4. Export requires selecting format first

Output JSON with action, target, reasoning.
`
```

Method: buildVerifyPrompt(task: Task): string
Purpose: Create verification criteria for task
Implementation:
```typescript
const criteria = {
  createDesign: 'Canvas editor is open with template loaded',
  editText: 'Text element shows new content',
  replaceImage: 'New image is visible on canvas',
  export: 'Download initiated (check downloads folder)'
}
return criteria[task.type] || 'Task appears complete'
```

Method: executeCustomAction(actionName: string, context: any): Promise<ActionResult>
Purpose: Execute Canva-specific custom actions
Implementation:
Switch on actionName:

**selectBestTemplate**:
1. Capture screenshots of visible templates
2. Score each template using VisionAgent.scoreTemplateMatch()
3. Select highest scoring template
4. Click template card
5. Wait for editor to load
6. Return result

**selectTextElement**:
1. Use VisionAgent to detect all text elements
2. Match against context.targetText or use first element
3. Click text element coordinates
4. Wait for text input to become active
5. Return result

**selectImageElement**:
1. Use VisionAgent to detect image placeholders
2. Select based on context (position, size) or first image
3. Click image coordinates
4. Wait for image editing options to appear
5. Return result

**selectExportFormat**:
1. From context.exportFormat (png, pdf, jpg, mp4)
2. Click file type dropdown
3. Find format option in dropdown
4. Click format option
5. Return result

**applyUploadedImage**:
1. Wait for upload to complete (no loading spinner)
2. Find uploaded image in uploads panel
3. Drag image to canvas or selected placeholder
4. Wait for image to render
5. Return result

Method: handlePageLoad(url: string): Promise<void>
Purpose: Wait for Canva-specific page loads
Implementation:
1. Wait for no loading spinner
2. Wait for canvas container visible
3. Wait for network idle (Canva loads async)
4. Add 1 second buffer for animations
5. Return when ready

Method: getElementPosition(elementDescription: string, visionAgent: VisionAgent): Promise<Coordinates>
Purpose: Locate Canva canvas elements visually
Implementation:
1. Capture canvas screenshot
2. Use VisionAgent.locateElement(screenshot, elementDescription)
3. Convert percentage bbox to pixel coordinates
4. Return center point of element

═══════════════════════════════════════════════════════════════════════
COMPONENT 2: FigmaAdapter (src/adapters/FigmaAdapter.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Encode Figma-specific knowledge (similar structure to Canva).

CLASS: FigmaAdapter implements WebsiteAdapter

PROPERTIES:
```typescript
name = 'Figma'
urlPatterns = [/figma\.com\/file/, /figma\.com\/design/]
baseUrl = 'https://www.figma.com'
```

SELECTORS:
```typescript
selectors = {
  // Navigation
  homeButton: '[data-testid="home-button"]',
  newFileButton: '[data-testid="new-file-button"]',
  
  // Canvas
  canvas: '[class*="canvas"]',
  viewport: '[class*="viewport"]',
  
  // Toolbar
  toolbar: '[class*="toolbar"]',
  textTool: '[title="Text"]',
  rectangleTool: '[title="Rectangle"]',
  
  // Layers
  layersPanel: '[class*="layers-panel"]',
  textLayer: '[class*="text-layer"]',
  
  // Export
  exportButton: '[title="Export"]',
  exportDialog: '[role="dialog"]'
}
```

WORKFLOWS:
```typescript
commonTasks = {
  openFile: [
    {id: 'navigate', action: 'navigate', target: '{fileUrl}'},
    {id: 'wait_load', action: 'wait', condition: 'element_visible', target: this.selectors.canvas}
  ],
  
  editText: [
    {id: 'select_layer', action: 'custom', customAction: 'selectTextLayer'},
    {id: 'enter_edit', action: 'doubleClick', target: this.selectors.canvas},
    {id: 'edit_text', action: 'type'},
    {id: 'exit_edit', action: 'pressKey', value: 'Escape'}
  ],
  
  export: [
    {id: 'open_export', action: 'click', target: this.selectors.exportButton},
    {id: 'configure', action: 'custom', customAction: 'configureExport'},
    {id: 'download', action: 'click', target: '[data-testid="export-download"]'}
  ]
}
```

CUSTOM ACTIONS:
Similar pattern to Canva but adapted for Figma's API and UI structure.

═══════════════════════════════════════════════════════════════════════
COMPONENT 3: GenericWebAdapter (src/adapters/GenericWebAdapter.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Fallback adapter for websites without specific implementation.

CLASS: GenericWebAdapter implements WebsiteAdapter

PROPERTIES:
```typescript
name = 'Generic Web'
urlPatterns = [/.*/]  // Matches any URL
baseUrl = null
```

SELECTORS:
Use semantic selectors that work across sites:
```typescript
selectors = {
  button: 'button, [role="button"], input[type="submit"]',
  input: 'input[type="text"], input[type="email"], textarea',
  link: 'a[href]',
  image: 'img',
  canvas: 'canvas'
}
```

WORKFLOWS:
Generic workflows based on common patterns:
```typescript
commonTasks = {
  fillForm: [
    {id: 'find_inputs', action: 'custom', customAction: 'detectFormFields'},
    {id: 'fill_fields', action: 'custom', customAction: 'fillFormFields'},
    {id: 'submit', action: 'click', target: 'button[type="submit"]'}
  ],
  
  clickButton: [
    {id: 'find_button', action: 'custom', customAction: 'findButtonByText'},
    {id: 'click', action: 'click'}
  ]
}
```

METHOD: buildThinkPrompt(observation: Observation): string
Implementation:
```typescript
return `
System: You are automating a generic web page.

Current Page: ${observation.url}
Goal: ${observation.task.goal}

Since this is not a recognized platform, rely heavily on:
1. DOM structure analysis
2. Visual detection of elements
3. Common web patterns (forms, buttons, links)

Available Elements:
${JSON.stringify(observation.domState.visibleElements)}

Screenshot Analysis:
Use vision to identify and locate target elements.

Output JSON with action, target, reasoning.
`
```

CUSTOM ACTIONS:
- detectFormFields: Find all input fields in DOM
- fillFormFields: Map data to form fields intelligently
- findButtonByText: Locate button by label using vision

═══════════════════════════════════════════════════════════════════════
COMPONENT 4: AdapterRegistry (src/adapters/AdapterRegistry.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Manage and select appropriate adapter for current website.

CLASS: AdapterRegistry

PROPERTIES:
```typescript
private adapters: WebsiteAdapter[] = []
private defaultAdapter: WebsiteAdapter
```

CONSTRUCTOR:
```typescript
constructor() {
  // Register all adapters
  this.registerAdapter(new CanvaAdapter())
  this.registerAdapter(new FigmaAdapter())
  
  // Generic adapter as fallback
  this.defaultAdapter = new GenericWebAdapter()
}
```

METHODS:

Method: registerAdapter(adapter: WebsiteAdapter): void
Purpose: Add adapter to registry
Implementation:
- Push adapter to adapters array
- Sort by specificity (more specific patterns first)

Method: getAdapter(url: string): WebsiteAdapter
Purpose: Select appropriate adapter for URL
Implementation:
1. Iterate through registered adapters
2. Check if adapter.detectWebsite(url) returns true
3. Return first matching adapter
4. If no match: return defaultAdapter

Method: getAllAdapters(): WebsiteAdapter[]
Purpose: List all registered adapters
Implementation:
- Return copy of adapters array

Method: hasAdapterFor(url: string): boolean
Purpose: Check if specific adapter exists for URL
Implementation:
- Try to get adapter
- Return true if not default adapter

═══════════════════════════════════════════════════════════════════════
COMPONENT 5: AdapterFactory (src/adapters/AdapterFactory.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Helper to create adapter instances with dependencies.

FUNCTION: createAdapter(name: string, dependencies: AdapterDependencies): WebsiteAdapter
Purpose: Factory function for adapter creation
Implementation:
```typescript
switch (name) {
  case 'canva':
    return new CanvaAdapter(dependencies.visionAgent, dependencies.browserAgent)
  case 'figma':
    return new FigmaAdapter(dependencies.visionAgent, dependencies.browserAgent)
  case 'generic':
    return new GenericWebAdapter(dependencies.visionAgent, dependencies.browserAgent)
  default:
    throw new Error(`Unknown adapter: ${name}`)
}
```

FUNCTION: loadAdapterConfig(name: string): AdapterConfig
Purpose: Load adapter configuration from file
Implementation:
- Read config/adapters/{name}.json
- Parse and validate
- Return AdapterConfig object

═══════════════════════════════════════════════════════════════════════
INTEGRATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

DEPENDENCIES:
From VisionAgent:
- scoreTemplateMatch(): Template selection
- locateElement(): Visual element finding
- analyzeLayout(): Design structure understanding

From BrowserAgent:
- All browser automation methods
- For executing adapter workflows

EXTENSIBILITY:
To add new platform adapter:
1. Create new class implementing WebsiteAdapter
2. Define selectors for platform
3. Define common workflows
4. Implement custom actions
5. Register in AdapterRegistry

CONFIGURATION:
Store adapter configs in: src/config/adapters/
- canva.json: Canva-specific settings
- figma.json: Figma-specific settings
- Allows updates without code changes

SELECTOR MAINTENANCE:
- Adapters may break when platforms update UI
- Log selector failures for monitoring
- Provide UI for users to report broken selectors
- Update adapters via extension updates

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

CREATE:
1. CanvaAdapter.ts - Canva automation
2. FigmaAdapter.ts - Figma automation  
3. GenericWebAdapter.ts - Fallback adapter
4. AdapterRegistry.ts - Adapter management
5. AdapterFactory.ts - Adapter creation utilities

REQUIREMENTS:
- Implement WebsiteAdapter interface
- Comprehensive selector definitions
- Workflow templates for common tasks
- Custom action implementations
- Verification strategies
- Self-healing selector alternatives
- JSDoc documentation

VALIDATION:
- Adapter correctly detects target website
- Selectors match current UI elements
- Workflows execute successfully
- Custom actions work as expected
- Verification confirms task completion
- Falls back gracefully on failures
```

---

## PROMPT 2.2: LLM Integration Layer

```
PROJECT: BrowserAI Craft - LLM Integration

ROLE: You are building the LLM integration layer that connects to local LLMs via LM Studio and Ollama, with support for multiple providers and model formats.

CONTEXT FROM RESEARCH:
Reference PDF sections:
- Section 1.2: Prompt engineering patterns
- Section 2.1: Local LLM integration (LM Studio, Ollama)
- Section 3.3: Vision model integration

KEY REQUIREMENTS:
- Support LM Studio OpenAI-compatible API
- Support Ollama native API
- Support OpenAI API (for comparison/fallback)
- Handle text and vision models separately
- Streaming responses for real-time feedback
- Context management for long conversations

═══════════════════════════════════════════════════════════════════════
COMPONENT 1: LLMAdapter (src/core/llm/LLMAdapter.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Unified interface for all LLM providers.

CLASS: LLMAdapter

CONSTRUCTOR:
```typescript
constructor(config: LLMConfig) {
  this.config = config
  this.provider = this.createProvider(config.provider)
  this.supportsVision = config.visionModel !== null
}
```

PROPERTIES:
```typescript
private config: LLMConfig
private provider: LLMProvider
public supportsVision: boolean
private conversationHistory: Message[] = []
```

PUBLIC METHODS:

Method: generate(prompt: string, options?: GenerateOptions): Promise<string>
Purpose: Generate text completion
Implementation:
1. Build messages array:
   ```typescript
   const messages = [
     {role: 'system', content: options?.systemPrompt || 'You are a helpful assistant'},
     ...this.conversationHistory,
     {role: 'user', content: prompt}
   ]
   ```
2. Call provider.complete(messages, options)
3. Extract response text
4. If options.saveHistory: Add to conversationHistory
5. Return response text

Method: generateWithVision(prompt: string, images: string[], options?: GenerateOptions): Promise<string>
Purpose: Generate completion with image inputs
Implementation:
1. Verify supportsVision is true (throw error if false)
2. Build multimodal messages:
   ```typescript
   const messages = [
     {role: 'system', content: options?.systemPrompt},
     {
       role: 'user',
       content: [
         {type: 'text', text: prompt},
         ...images.map(img => ({type: 'image_url', image_url: {url: img}}))
       ]
     }
   ]
   ```
3. Call provider.complete(messages, options)
4. Return response text

Method: generateStreaming(prompt: string, onChunk: (chunk: string) => void, options?: GenerateOptions): Promise<string>
Purpose: Stream response chunks for real-time display
Implementation:
1. Build messages array
2. Set options.stream = true
3. Call provider.complete(messages, options)
4. For each chunk received: call onChunk(chunk)
5. Accumulate full response
6. Return complete response

Method: parseJSON<T>(response: string): T
Purpose: Extract and parse JSON from LLM response
Implementation:
1. Extract JSON from markdown code blocks if present:
   ```typescript
   const jsonMatch = response.match(/```json\n([\s\S]+?)\n```/)
   const jsonStr = jsonMatch ? jsonMatch[1] : response
   ```
2. Parse as JSON
3. Validate structure (basic checks)
4. Return typed object
5. Throw error if invalid JSON

Method: validateResponse(response: string, schema: object): boolean
Purpose: Validate LLM response against JSON schema
Implementation:
- Use JSON schema validator
- Return true if valid
- Log validation errors if invalid

Method: clearHistory(): void
Purpose: Clear conversation context
Implementation:
- this.conversationHistory = []

Method: getHistory(): Message[]
Purpose: Get conversation history
Implementation:
- Return copy of conversationHistory

RETRY LOGIC:

Method: generateWithRetry(prompt: string, maxAttempts: number = 3): Promise<string>
Purpose: Retry on failures
Implementation:
1. For attempt 1 to maxAttempts:
   - Try generate()
   - If success: return result
   - If failure (rate limit, network): wait and retry
   - If failure (invalid API key, model not found): fail immediately
2. Throw error after max attempts

═══════════════════════════════════════════════════════════════════════
COMPONENT 2: LMStudioProvider (src/core/llm/providers/LMStudioProvider.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
LM Studio integration via OpenAI-compatible API.

CLASS: LMStudioProvider implements LLMProvider

PROPERTIES:
```typescript
private baseURL: string = 'http://localhost:1234/v1'
private apiKey: string = 'lm-studio'  // LM Studio doesn't require real key
private model: string
```

CONSTRUCTOR:
```typescript
constructor(config: LMStudioConfig) {
  this.baseURL = config.baseURL || 'http://localhost:1234/v1'
  this.model = config.model || 'local-model'
}
```

METHOD: complete(messages: Message[], options?: CompletionOptions): Promise<string>
Purpose: Call LM Studio API
Implementation:
1. Build request body (OpenAI format):
   ```json
   {
     "model": this.model,
     "messages": messages,
     "temperature": options?.temperature || 0.7,
     "max_tokens": options?.maxTokens || 2000,
     "stream": options?.stream || false,
     "response_format": options?.responseFormat  // {"type": "json_object"}
   }
   ```
2. Make POST request to ${this.baseURL}/chat/completions
3. Parse response:
   ```json
   {
     "choices": [{
       "message": {"role": "assistant", "content": "response text"}
     }]
   }
   ```
4. Return choices[0].message.content

METHOD: completeStreaming(messages: Message[], onChunk: (chunk: string) => void): Promise<string>
Purpose: Stream responses
Implementation:
1. Set stream: true in request
2. Use EventSource or fetch with streaming
3. Parse SSE events:
   ```
   data: {"choices":[{"delta":{"content":"chunk"}}]}
   ```
4. Call onChunk for each delta
5. Accumulate and return full response

METHOD: testConnection(): Promise<boolean>
Purpose: Verify LM Studio is running
Implementation:
1. Try GET ${this.baseURL}/models
2. If successful: return true
3. If connection refused: return false with helpful error:
   "LM Studio not running. Please start LM Studio and load a model."

METHOD: listModels(): Promise<string[]>
Purpose: Get available models
Implementation:
1. GET ${this.baseURL}/models
2. Parse response: `{"data": [{"id": "model-name"}]}`
3. Return array of model IDs

═══════════════════════════════════════════════════════════════════════
COMPONENT 3: OllamaProvider (src/core/llm/providers/OllamaProvider.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Ollama integration via native API.

CLASS: OllamaProvider implements LLMProvider

PROPERTIES:
```typescript
private baseURL: string = 'http://localhost:11434'
private model: string
```

CONSTRUCTOR:
```typescript
constructor(config: OllamaConfig) {
  this.baseURL = config.baseURL || 'http://localhost:11434'
  this.model = config.model || 'llama2'
}
```

METHOD: complete(messages: Message[], options?: CompletionOptions): Promise<string>
Purpose: Call Ollama API
Implementation:
1. Convert messages to Ollama format:
   ```json
   {
     "model": this.model,
     "messages": messages,
     "stream": false,
     "options": {
       "temperature": options?.temperature,
       "num_predict": options?.maxTokens
     }
   }
   ```
2. POST to ${this.baseURL}/api/chat
3. Parse response: `{"message": {"content": "response"}}`
4. Return message.content

METHOD: completeStreaming(messages: Message[], onChunk: (chunk: string) => void): Promise<string>
Purpose: Stream responses
Implementation:
1. Set stream: true
2. POST to /api/chat
3. Parse JSONL stream (one JSON per line):
   ```json
   {"message":{"content":"chunk"}}
   {"message":{"content":"chunk2"}}
   {"done":true}
   ```
4. Call onChunk for each message
5. Return accumulated response

METHOD: generateEmbedding(text: string): Promise<number[]>
Purpose: Generate embeddings for text (useful for future features)
Implementation:
1. POST to ${this.baseURL}/api/embeddings
2. Body: `{"model": this.model, "prompt": text}`
3. Return embedding vector

METHOD: testConnection(): Promise<boolean>
Purpose: Verify Ollama is running
Implementation:
1. GET ${this.baseURL}/api/tags
2. If successful: return true
3. If error: return false with message:
   "Ollama not running. Install: https://ollama.ai"

METHOD: pullModel(modelName: string, onProgress: (progress: number) => void): Promise<void>
Purpose: Download model if not present
Implementation:
1. POST to ${this.baseURL}/api/pull
2. Body: `{"name": modelName, "stream": true}`
3. Parse progress updates from stream
4. Call onProgress with percentage
5. Return when complete

═══════════════════════════════════════════════════════════════════════
COMPONENT 4: OpenAIProvider (src/core/llm/providers/OpenAIProvider.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
OpenAI API integration (for comparison/fallback).

CLASS: OpenAIProvider implements LLMProvider

PROPERTIES:
```typescript
private apiKey: string
private baseURL: string = 'https://api.openai.com/v1'
private model: string
```

CONSTRUCTOR:
```typescript
constructor(config: OpenAIConfig) {
  this.apiKey = config.apiKey
  this.model = config.model || 'gpt-4-turbo-preview'
}
```

METHOD: complete(messages: Message[], options?: CompletionOptions): Promise<string>
Purpose: Call OpenAI API
Implementation:
1. Build request (same format as LM Studio)
2. Add Authorization header: `Bearer ${this.apiKey}`
3. POST to ${this.baseURL}/chat/completions
4. Handle rate limits (429 errors) with retry
5. Return response

METHOD: completeWithVision(messages: Message[], options?: CompletionOptions): Promise<string>
Purpose: Use GPT-4 Vision
Implementation:
1. Set model to 'gpt-4-vision-preview'
2. Format messages with image_url content
3. Call complete() with vision messages
4. Return response

ERROR HANDLING:
- 401: Invalid API key
- 429: Rate limit (retry with backoff)
- 500: OpenAI server error (retry once)
- Network errors: Retry with timeout

═══════════════════════════════════════════════════════════════════════
COMPONENT 5: ProviderFactory (src/core/llm/ProviderFactory.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Create provider instances from configuration.

FUNCTION: createProvider(config: LLMConfig): LLMProvider
Purpose: Factory function
Implementation:
```typescript
switch (config.provider) {
  case 'lmstudio':
    return new LMStudioProvider(config.lmstudio)
  case 'ollama':
    return new OllamaProvider(config.ollama)
  case 'openai':
    return new OpenAIProvider(config.openai)
  default:
    throw new Error(`Unknown provider: ${config.provider}`)
}
```

FUNCTION: detectAvailableProviders(): Promise<ProviderAvailability[]>
Purpose: Check which providers are accessible
Implementation:
1. Test LM Studio connection (localhost:1234)
2. Test Ollama connection (localhost:11434)
3. Test OpenAI API key if configured
4. Return array of available providers with status

═══════════════════════════════════════════════════════════════════════
COMPONENT 6: PromptBuilder (src/core/llm/PromptBuilder.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Utilities for building effective prompts.

CLASS: PromptBuilder

METHOD: buildSystemPrompt(role: string, context?: string): string
Purpose: Create consistent system prompts
Implementation:
```typescript
const base = `You are ${role}. You provide precise, actionable responses.`
const contextStr = context ? `\n\nContext: ${context}` : ''
return base + contextStr
```

METHOD: buildFewShotPrompt(task: string, examples: Example[]): string
Purpose: Create few-shot learning prompts
Implementation:
```typescript
let prompt = `Task: ${task}\n\nExamples:\n`
for (const example of examples) {
  prompt += `\nInput: ${example.input}\nOutput: ${example.output}\n`
}
prompt += `\nNow complete the following:\nInput: `
return prompt
```

METHOD: buildChainOfThoughtPrompt(question: string): string
Purpose: Encourage step-by-step reasoning
Implementation:
```typescript
return `${question}\n\nLet's think through this step-by-step:\n1.`
```

METHOD: formatJSONPrompt(schema: object, instruction: string): string
Purpose: Request JSON output
Implementation:
```typescript
return `${instruction}\n\nOutput JSON matching this schema:\n${JSON.stringify(schema, null, 2)}\n\nOutput ONLY valid JSON, no markdown.`
```

═══════════════════════════════════════════════════════════════════════
INTEGRATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

PROVIDER SELECTION:
Priority order:
1. LM Studio (if running) - Free, local
2. Ollama (if running) - Free, local
3. OpenAI (if API key configured) - Paid, cloud

USER CONFIGURATION:
Allow users to choose preferred provider in settings:
```typescript
interface LLMConfig {
  provider: 'lmstudio' | 'ollama' | 'openai'
  textModel: string
  visionModel: string | null
  temperature: number
  maxTokens: number
}
```

ERROR HANDLING:
- Provider not available: Show setup instructions
- Model not found: List available models
- Rate limits: Automatic retry with backoff
- Network errors: Retry then fail gracefully

PERFORMANCE:
- Cache frequently used prompts
- Stream responses for better UX
- Timeout long-running requests (60s)

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

CREATE:
1. LLMAdapter.ts - Main adapter
2. LMStudioProvider.ts - LM Studio integration
3. OllamaProvider.ts - Ollama integration
4. OpenAIProvider.ts - OpenAI integration
5. ProviderFactory.ts - Provider creation
6. PromptBuilder.ts - Prompt utilities

REQUIREMENTS:
- Implement LLMProvider interface for each provider
- Support text and vision models
- Streaming responses
- Retry logic and error handling
- Connection testing
- Model listing
- JSDoc documentation

VALIDATION:
- Can connect to LM Studio
- Can connect to Ollama
- Can generate text completions
- Can parse JSON responses
- Can stream responses
- Handles rate limits gracefully
- Provides helpful error messages
```

---

**[File continues with PROMPT 3.1, 3.2, 4.1, 4.2, and 5.1, but truncated here due to length limits]**

Let me know if you want the remaining prompts (Phase 3-5) in a separate file!