# PHASE 1: CORE FRAMEWORK - COMPLETE PROMPTS

**Project:** BrowserAI Craft - AI-Powered Browser Automation Framework

---

## PROMPT 1.3: Vision Agent & Multimodal Reasoning

```
PROJECT: BrowserAI Craft - Vision Agent for Canvas Interaction

ROLE: You are building the vision agent that enables the system to "see" and understand visual elements on the page, especially for canvas-based interfaces where DOM inspection is insufficient.

CONTEXT FROM RESEARCH:
Reference PDF sections:
- Section 3.1-3.3: Multimodal Perception, SSVP, Visual Reasoning
- Section 3.4: Visual anchoring techniques
- Section 5.2: Vision integration in Observe-Think-Act cycle

KEY CAPABILITIES:
1. Analyze screenshots to detect UI elements
2. Locate elements by semantic description
3. Verify task completion visually
4. Score template aesthetics
5. Extract text from images (OCR)
6. Understand design layouts

═══════════════════════════════════════════════════════════════════════
COMPONENT 1: VisionAgent (src/core/vision/VisionAgent.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Main interface for all vision-based operations using multimodal LLMs.

CONSTRUCTOR:
- Accept: LLMAdapter (must support vision)
- Validate: LLM has vision capability (llmAdapter.supportsVision)
- Throw error if vision not supported
- Store: Reference to LLM adapter

PUBLIC METHODS:

Method: analyzeAndDecide(screenshot: string, instruction: string): Promise<BrowserAction>
Purpose: Given screenshot and instruction, determine next action
Use Case: "Click the Export button" → returns click action with coordinates
Implementation:
1. Build vision prompt:
   ```
   System: You are analyzing a web interface screenshot to decide the next action.
   
   User Instruction: {instruction}
   Screenshot: [attached]
   
   Analyze the screenshot and identify the target element.
   Determine the appropriate action (click, type, scroll, etc.)
   
   Output JSON:
   {
     "action": "click" | "type" | "hover" | "scroll",
     "target": {"type": "coordinates", "x": pixel_x, "y": pixel_y},
     "value": "text to type if action is type",
     "confidence": 0-100,
     "reasoning": "why this is the correct action"
   }
   
   If element not found or instruction unclear, set confidence to 0.
   ```
2. Call llmAdapter.generateWithVision(prompt, screenshot)
3. Parse JSON response
4. Convert to BrowserAction object
5. Validate confidence > 50 (otherwise throw low confidence error)
6. Return BrowserAction

Method: verify(screenshot: string, verificationPrompt: string): Promise<VerificationResult>
Purpose: Check if task was completed successfully
Use Case: "Verify text says 'Summer Sale 2026'" → returns success true/false
Implementation:
1. Build verification prompt:
   ```
   System: You are verifying task completion by analyzing a screenshot.
   
   Task to verify: {verificationPrompt}
   Screenshot: [attached]
   
   Check if the task was completed successfully. Look for:
   - Expected elements are present
   - No error messages or warnings
   - Visual state matches expected outcome
   - Text content is correct (if applicable)
   
   Output JSON:
   {
     "success": true | false,
     "reasoning": "detailed explanation of what you see",
     "confidence": 0-100,
     "issues": ["list of problems found, if any"]
   }
   ```
2. Call llmAdapter.generateWithVision()
3. Parse response
4. Return VerificationResult object

Method: locateElement(screenshot: string, description: string): Promise<ElementLocation>
Purpose: Find element by semantic description
Use Case: "the blue button labeled 'Download'" → returns bounding box
Implementation:
1. Build location prompt:
   ```
   System: Find the element in this screenshot that matches the description.
   
   Element description: {description}
   Screenshot: [attached]
   
   Locate the element and return its bounding box.
   Use percentages (0-100) for coordinates to be resolution-independent.
   
   Output JSON:
   {
     "found": true | false,
     "bbox": {
       "x": 0-100,      // top-left X as percentage
       "y": 0-100,      // top-left Y as percentage  
       "width": 0-100,  // width as percentage
       "height": 0-100  // height as percentage
     },
     "confidence": 0-100,
     "reasoning": "description of element found"
   }
   ```
2. Call llmAdapter.generateWithVision()
3. Parse response
4. Convert percentage bbox to ElementLocation
5. Return ElementLocation object

Method: scoreTemplateMatch(templateScreenshot: string, styleDescription: string): Promise<number>
Purpose: Rate how well template matches desired style
Use Case: styleDescription = "minimalist, serif fonts, neutral colors" → score 0-100
Implementation:
1. Build scoring prompt:
   ```
   System: Score this design template based on how well it matches the desired style.
   
   Desired style: {styleDescription}
   Template screenshot: [attached]
   
   Evaluate the template on these criteria:
   - Typography: Font choices, hierarchy, readability
   - Color palette: Colors used, harmony, appropriateness
   - Layout: Structure, balance, use of whitespace
   - Visual style: Overall aesthetic match to description
   
   Provide a score from 0-100:
   - 90-100: Perfect match
   - 70-89: Good match
   - 50-69: Moderate match
   - 30-49: Weak match
   - 0-29: Poor match
   
   Output JSON:
   {
     "score": 0-100,
     "reasoning": "detailed explanation of score",
     "strengths": ["what matches well"],
     "weaknesses": ["what doesn't match"]
   }
   ```
2. Call llmAdapter.generateWithVision()
3. Parse response
4. Return numeric score

Method: detectElements(screenshot: string): Promise<DetectedElement[]>
Purpose: Identify all interactive elements in screenshot
Use Case: Build element map for vision-based navigation
Implementation:
1. Build detection prompt:
   ```
   System: Analyze this interface and identify all interactive elements.
   
   Screenshot: [attached]
   
   Identify buttons, inputs, links, dropdowns, and other interactive elements.
   
   For each element provide:
   - type: "button" | "input" | "link" | "dropdown" | "image" | "text"
   - label: visible text or description
   - bbox: bounding box as percentages (0-100)
   - confidence: how certain you are (0-100)
   
   Output JSON array:
   [
     {
       "type": "button",
       "label": "Export",
       "bbox": {"x": 85, "y": 5, "width": 10, "height": 5},
       "confidence": 95
     },
     ...
   ]
   ```
2. Call llmAdapter.generateWithVision()
3. Parse JSON array
4. Convert to DetectedElement[] objects
5. Filter by confidence > 50
6. Return array

Method: extractText(screenshot: string, region?: BoundingBox): Promise<string>
Purpose: OCR functionality - extract visible text
Use Case: Read text from canvas-rendered elements
Implementation:
1. If region specified: crop screenshot to region first
2. Build OCR prompt:
   ```
   System: Extract all visible text from this image.
   
   Screenshot: [attached]
   
   Return all text you can read, maintaining layout structure.
   Separate distinct text blocks with newlines.
   
   Output plain text (not JSON).
   ```
3. Call llmAdapter.generateWithVision()
4. Return extracted text string

Method: compareScreenshots(before: string, after: string, changeDescription: string): Promise<boolean>
Purpose: Verify expected change occurred
Use Case: "Text changed from 'Hello' to 'World'" → returns true if detected
Implementation:
1. Build comparison prompt:
   ```
   System: Compare these two screenshots to verify a specific change occurred.
   
   Expected change: {changeDescription}
   Before screenshot: [attached]
   After screenshot: [attached]
   
   Did the expected change occur?
   
   Output JSON:
   {
     "changeDetected": true | false,
     "reasoning": "what changed or didn't change"
   }
   ```
2. Call llmAdapter.generateWithVision() with both images
3. Parse response
4. Return boolean

Method: analyzeLayout(screenshot: string): Promise<LayoutStructure>
Purpose: Understand design structure and hierarchy
Use Case: Identify text layers, image placeholders for editing
Implementation:
1. Build layout analysis prompt:
   ```
   System: Analyze the layout structure of this design.
   
   Screenshot: [attached]
   
   Identify:
   - Visual hierarchy (heading levels, body text)
   - Text blocks and their bounding boxes
   - Image placeholders and their locations
   - Layout grid structure (rows, columns)
   
   Output JSON:
   {
     "hierarchy": ["h1", "h2", "body"],
     "textBlocks": [
       {"content": "preview", "bbox": {...}, "level": "h1"}
     ],
     "imagePlaceholders": [
       {"bbox": {...}, "type": "photo" | "logo" | "icon"}
     ],
     "gridStructure": {"rows": 3, "columns": 2}
   }
   ```
2. Call llmAdapter.generateWithVision()
3. Parse response
4. Return LayoutStructure object

PRIVATE METHODS:

Method: buildVisionPrompt(systemPrompt: string, userPrompt: string, additionalContext?: string): string
Purpose: Format consistent vision prompts
Implementation:
- Combine system, user, and optional context
- Add standard instructions about JSON output
- Return formatted prompt string

Method: validateConfidence(confidence: number, operation: string): void
Purpose: Ensure confidence meets threshold
Implementation:
- If confidence < 50: throw LowConfidenceError
- Log confidence level
- Operation name for error context

ERROR HANDLING:
- No vision support: Throw clear error suggesting providers that support vision
- Low confidence: Throw with suggestion to retry or use DOM approach
- Malformed JSON: Retry once with clarification prompt
- Network errors: Retry with backoff
- Log all vision calls with prompts and responses for debugging

═══════════════════════════════════════════════════════════════════════
COMPONENT 2: ScreenshotCapture (src/core/vision/ScreenshotCapture.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Utilities for capturing and manipulating screenshots.

FUNCTION: captureFullPage(): Promise<Screenshot>
Purpose: Capture entire page (scroll and stitch if needed)
Implementation:
1. Get page dimensions: document.body.scrollHeight
2. Get viewport height
3. If page fits in viewport: capture once
4. Else: Scroll and capture sections, stitch together
5. Return Screenshot object with metadata

FUNCTION: captureViewport(): Promise<Screenshot>
Purpose: Capture visible area only
Implementation:
1. Use chrome.tabs.captureVisibleTab()
2. Options: format: 'png', quality: 90
3. Return base64 data as Screenshot object

FUNCTION: captureElement(selector: string): Promise<Screenshot>
Purpose: Capture specific element
Implementation:
1. Find element by selector
2. Get element bounding box
3. Capture viewport
4. Crop to element region
5. Return cropped Screenshot

FUNCTION: cropScreenshot(screenshot: string, bbox: BoundingBox): Promise<string>
Purpose: Extract region from screenshot
Implementation:
1. Load screenshot into canvas
2. Calculate crop coordinates from bbox
3. Draw cropped region to new canvas
4. Export as base64
5. Return cropped image data

FUNCTION: resizeScreenshot(screenshot: string, maxWidth: number): Promise<string>
Purpose: Reduce size for faster LLM processing
Implementation:
1. Load screenshot into canvas
2. Calculate new dimensions (maintain aspect ratio)
3. Draw resized image
4. Export as base64
5. Return resized data

FUNCTION: compressScreenshot(screenshot: string, quality: number): Promise<string>
Purpose: Compress to reduce token usage
Implementation:
1. Load into canvas
2. Convert to JPEG with specified quality (0-100)
3. If still too large, reduce dimensions
4. Return compressed data

FUNCTION: annotateScreenshot(screenshot: string, annotations: Annotation[]): Promise<string>
Purpose: Draw boxes/labels on screenshot for debugging
Implementation:
1. Load screenshot into canvas
2. For each annotation: draw rectangle and label
3. Use contrasting colors
4. Export annotated image
5. Return annotated data

TYPE: Annotation
```typescript
interface Annotation {
  bbox: BoundingBox
  label: string
  color?: string
}
```

═══════════════════════════════════════════════════════════════════════
COMPONENT 3: ElementDetector (src/core/vision/ElementDetector.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Utilities for working with detected elements.

FUNCTION: convertPercentageToPx(bbox: BoundingBox, screenWidth: number, screenHeight: number): BoundingBox
Purpose: Convert percentage bbox to pixel coordinates
Implementation:
```typescript
return {
  x: (bbox.x / 100) * screenWidth,
  y: (bbox.y / 100) * screenHeight,
  width: (bbox.width / 100) * screenWidth,
  height: (bbox.height / 100) * screenHeight
}
```

FUNCTION: convertPxToPercentage(bbox: BoundingBox, screenWidth: number, screenHeight: number): BoundingBox
Purpose: Convert pixel coordinates to percentage
Implementation: Inverse of above function

FUNCTION: getCenterPoint(bbox: BoundingBox): Coordinates
Purpose: Get center coordinates of bounding box
Implementation:
```typescript
return {
  x: bbox.x + bbox.width / 2,
  y: bbox.y + bbox.height / 2
}
```

FUNCTION: findClosestElement(clickPoint: Coordinates, elements: DetectedElement[]): DetectedElement
Purpose: Given click coordinates, find nearest element
Implementation:
1. Calculate distance from clickPoint to each element's center
2. Return element with minimum distance

FUNCTION: filterByType(elements: DetectedElement[], type: ElementType): DetectedElement[]
Purpose: Filter elements by type
Implementation:
- Filter array where element.type === type
- Return filtered array

FUNCTION: sortByConfidence(elements: DetectedElement[]): DetectedElement[]
Purpose: Sort elements by confidence descending
Implementation:
- Sort by element.confidence (high to low)
- Return sorted array

FUNCTION: groupByProximity(elements: DetectedElement[], threshold: number): DetectedElement[][]
Purpose: Group nearby elements (for composite UI components)
Implementation:
1. Calculate distances between all element pairs
2. Group elements within threshold distance
3. Return array of groups

═══════════════════════════════════════════════════════════════════════
COMPONENT 4: LayoutAnalyzer (src/core/vision/LayoutAnalyzer.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Analyze design layout and structure for automated editing.

CLASS: LayoutAnalyzer

CONSTRUCTOR:
- Accept: VisionAgent
- Store reference for analysis calls

Method: analyzeHierarchy(screenshot: string): Promise<LayoutHierarchy>
Purpose: Identify visual hierarchy (headers, subheaders, body text)
Implementation:
1. Use VisionAgent.analyzeLayout()
2. Parse hierarchy information
3. Classify text elements by size and position
4. Return LayoutHierarchy object

Method: detectGrid(screenshot: string): Promise<GridStructure>
Purpose: Find grid-based layouts
Implementation:
1. Analyze element positions
2. Detect alignment patterns (rows, columns)
3. Calculate grid dimensions
4. Return GridStructure

Method: findTextLayers(screenshot: string): Promise<TextLayer[]>
Purpose: Locate all text elements in design
Implementation:
1. Use VisionAgent to detect text
2. Extract text content and position
3. Classify by style (heading, body, caption)
4. Return array of TextLayer objects

Method: findImagePlaceholders(screenshot: string): Promise<ImagePlaceholder[]>
Purpose: Detect image slots for replacement
Implementation:
1. Use VisionAgent to detect images
2. Identify placeholder images vs content images
3. Get bounding boxes
4. Classify by type (photo, logo, icon)
5. Return array of ImagePlaceholder objects

TYPES:
```typescript
interface LayoutHierarchy {
  levels: string[]  // ["h1", "h2", "body"]
  structure: HierarchyNode[]
}

interface GridStructure {
  rows: number
  columns: number
  cellSize: {width: number, height: number}
  gaps: {horizontal: number, vertical: number}
}

interface TextLayer {
  content: string
  bbox: BoundingBox
  level: "h1" | "h2" | "h3" | "body" | "caption"
  style: {
    fontSize: number
    fontFamily: string
    color: string
    alignment: "left" | "center" | "right"
  }
}

interface ImagePlaceholder {
  bbox: BoundingBox
  type: "photo" | "logo" | "icon" | "background"
  aspectRatio: number
}
```

═══════════════════════════════════════════════════════════════════════
COMPONENT 5: AestheticScorer (src/core/vision/AestheticScorer.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Score designs based on aesthetic criteria for template selection.

CLASS: AestheticScorer

CONSTRUCTOR:
- Accept: VisionAgent

Method: scoreTemplate(screenshot: string, criteria: StyleCriteria): Promise<AestheticScore>
Purpose: Comprehensive aesthetic scoring
Implementation:
1. Score typography using VisionAgent
2. Score color palette
3. Score layout structure
4. Score whitespace usage
5. Combine scores with weights
6. Return AestheticScore object

Method: scoreTypography(screenshot: string, desiredStyle: string): Promise<number>
Purpose: Rate font choices and hierarchy
Implementation:
1. Prompt: "Rate typography (0-100) for {desiredStyle} style"
2. Evaluate: font choices, hierarchy clarity, readability
3. Return score

Method: scoreColorPalette(screenshot: string, desiredColors?: string[]): Promise<number>
Purpose: Rate color choices
Implementation:
1. Extract color palette from screenshot
2. Check harmony, contrast, brand alignment
3. Compare to desiredColors if provided
4. Return score

Method: scoreLayout(screenshot: string): Promise<number>
Purpose: Rate layout structure
Implementation:
1. Evaluate balance, symmetry
2. Check whitespace usage
3. Assess visual flow
4. Return score

Method: compareTemplates(screenshots: string[], criteria: StyleCriteria): Promise<RankedTemplate[]>
Purpose: Rank multiple templates
Implementation:
1. Score each template
2. Sort by score descending
3. Return ranked array with scores

TYPES:
```typescript
interface StyleCriteria {
  style?: string  // "minimalist", "modern", "playful"
  colors?: string[]
  typography?: string  // "serif", "sans-serif", "modern"
  layout?: string  // "grid", "asymmetric", "centered"
}

interface RankedTemplate {
  screenshot: string
  score: AestheticScore
  rank: number
}
```

═══════════════════════════════════════════════════════════════════════
INTEGRATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

DEPENDENCIES:
From LLMAdapter:
- generateWithVision(): All vision operations
- Must validate supportsVision = true

From BrowserAgent:
- captureScreenshot(): Get screenshots for analysis

PERFORMANCE CONSIDERATIONS:
- Screenshot size impacts tokens: Compress to max 1024px width
- Vision calls are expensive: Cache results when possible
- Rate limits: Respect provider limits (Groq: 30/min)
- Parallelize when possible: Multiple template scoring

CACHING STRATEGY:
- Cache screenshot analysis for 5 minutes
- Key: screenshot hash + prompt hash
- Store in memory (not persistent storage)
- Clear cache when page changes significantly

ERROR RECOVERY:
- If vision fails: Fall back to DOM-based approach when possible
- If confidence low: Retry with better screenshot (closer crop, higher quality)
- If rate limited: Queue requests and process sequentially

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

CREATE:
1. VisionAgent.ts - Main vision interface
2. ScreenshotCapture.ts - Screenshot utilities
3. ElementDetector.ts - Element manipulation utilities
4. LayoutAnalyzer.ts - Design structure analysis
5. AestheticScorer.ts - Template scoring

REQUIREMENTS:
- Follow type definitions from Phase 0
- Comprehensive error handling
- Confidence thresholds enforced
- Screenshot optimization (compression, resizing)
- Caching for performance
- Logging of all vision operations
- JSDoc with usage examples

VALIDATION:
- Can detect button in screenshot and return coordinates
- Verification correctly identifies success/failure
- Template scoring differentiates styles
- OCR extracts text from canvas
- Coordinates are resolution-independent
- Handles multiple image formats (PNG, JPEG)
```

---

## PROMPT 1.4: Browser Agent & MCP Integration

```
PROJECT: BrowserAI Craft - Browser Automation Agent

ROLE: You are creating the browser agent that executes actions on web pages using MCP (Model Context Protocol) servers. This component translates high-level actions into actual browser interactions.

CONTEXT FROM RESEARCH:
Reference PDF sections:
- Section 4.2: WebMCP integration patterns
- Section 6.1: Self-healing element location
- Section 6.2: Semantic retry routines

MCP SERVERS:
1. Playwright MCP (@executeautomation/playwright-mcp-server)
   - Full browser automation capabilities
   - Headless or headed mode
   - Network control, screenshots, file handling

2. Browser MCP (lightweight alternative)
   - Direct browser control
   - Simpler API

═══════════════════════════════════════════════════════════════════════
COMPONENT 1: BrowserAgent (src/core/browser/BrowserAgent.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
High-level interface for all browser automation operations.

CONSTRUCTOR:
- Accept: MCPIntegration, Config (timeouts, retries)
- Initialize MCP client
- Set default timeouts and retry configs
- Store references

PUBLIC METHODS:

Method: getCurrentPageUrl(): Promise<string>
Purpose: Get active tab URL
Implementation:
1. Query chrome.tabs.query({active: true, currentWindow: true})
2. Return tabs[0].url
3. Throw error if no active tab

Method: getCurrentTab(): Promise<chrome.tabs.Tab>
Purpose: Get active tab object
Implementation:
1. Query active tab
2. Return full tab object
3. Include tabId for later operations

Method: captureScreenshot(options?: ScreenshotOptions): Promise<Screenshot>
Purpose: Capture visible tab as Screenshot object
Implementation:
1. Get active tab
2. Call chrome.tabs.captureVisibleTab()
3. Options: format (png/jpeg), quality
4. Apply compression if specified
5. Return Screenshot object with metadata

Method: getDOMState(): Promise<DOMState>
Purpose: Extract page structure via content script
Implementation:
1. Inject content script if not already present
2. Send message to content script: {action: 'getDOMState'}
3. Content script returns:
   - url, title
   - visibleElements (interactive elements with selectors)
   - forms (form fields and structure)
   - canvasElements (canvas tags with contexts)
4. Return DOMState object

Method: click(target: string | Coordinates, options?: ActionOptions): Promise<ActionResult>
Purpose: Click element by CSS selector or coordinates
Implementation:
1. If target is string (selector):
   - Send to content script: {action: 'click', selector: target}
   - Content script finds element and clicks
   - Scroll into view if needed
2. If target is Coordinates:
   - Send to content script: {action: 'clickAt', x, y}
   - Content script dispatches click event at coordinates
3. Wait for click to register (100ms)
4. Capture result (success/failure)
5. Return ActionResult with timing

Method: type(selector: string, text: string, options?: TypeOptions): Promise<ActionResult>
Purpose: Type text into input field
Implementation:
1. If options.clearFirst: Clear field first
2. Send to content script: {action: 'type', selector, text}
3. Content script:
   - Finds input element
   - Focuses element
   - Types text with optional delay between keys
   - Triggers input events
4. Verify text was entered
5. Return ActionResult

Method: typeAtCoordinates(coords: Coordinates, text: string): Promise<ActionResult>
Purpose: Click coordinates first, then type
Implementation:
1. Click at coordinates
2. Wait 200ms for focus
3. Type text using sendKeys
4. Return ActionResult

Method: uploadFile(selector: string, filePath: string): Promise<ActionResult>
Purpose: Handle file input elements
Implementation:
1. Use MCP browser_upload tool
2. Find file input by selector
3. Set file path
4. Trigger change event
5. Return ActionResult

Method: wait(condition: WaitCondition, options?: WaitOptions): Promise<ActionResult>
Purpose: Wait for various conditions
Implementation:
- element_visible: Poll for element appearing
- element_hidden: Poll for element disappearing  
- network_idle: Monitor network requests (use MCP)
- timeout: Simple delay
- custom: Evaluate custom function
Default timeout: 5000ms
Poll interval: 100ms
Return ActionResult when condition met or timeout

Method: navigate(url: string): Promise<ActionResult>
Purpose: Navigate to URL
Implementation:
1. Use chrome.tabs.update({url: url})
2. Wait for page load (document.readyState === 'complete')
3. Return ActionResult

Method: scroll(direction: "up" | "down" | "to_element", amount?: number | string): Promise<ActionResult>
Purpose: Scroll page or to element
Implementation:
1. If to_element: Find element and scrollIntoView()
2. If up/down: window.scrollBy(0, amount)
3. Wait for scroll completion
4. Return ActionResult

Method: hover(target: string | Coordinates): Promise<ActionResult>
Purpose: Hover over element
Implementation:
1. Find element or use coordinates
2. Dispatch mouseover event
3. Hold for 200ms
4. Return ActionResult

Method: pressKey(key: string, modifiers?: string[]): Promise<ActionResult>
Purpose: Press keyboard key(s)
Implementation:
1. Build KeyboardEvent with key and modifiers
2. Dispatch to active element or body
3. Common keys: 'Enter', 'Escape', 'Tab', 'ArrowDown'
4. Modifiers: ['Control', 'Shift', 'Alt', 'Meta']
5. Return ActionResult

Method: evaluate(script: string): Promise<any>
Purpose: Run JavaScript in page context
Implementation:
1. Send to content script: {action: 'evaluate', script}
2. Content script executes script
3. Return result
Use for: Custom interactions, reading computed properties

Method: executeAction(action: BrowserAction): Promise<ActionResult>
Purpose: Route generic action to appropriate method
Implementation:
- Switch on action.type
- Call corresponding method with action.target and action.value
- Apply action.options
- Return ActionResult

SELF-HEALING METHODS:

Method: findElementWithHealing(selector: string, description: string, visionAgent: VisionAgent): Promise<ElementSelector>
Purpose: Try multiple strategies to locate element
Implementation:
1. Try DOM selector first (fastest)
2. If not found: Try alternative selectors (data-testid, aria-label)
3. If still not found: Use vision to locate by description
4. If found visually: Return coordinates
5. If still not found: Throw ElementNotFoundError with suggestions

Method: clickWithHealing(target: ElementSelector, description: string, visionAgent: VisionAgent): Promise<ActionResult>
Purpose: Attempt click with retries and healing
Implementation:
1. Try standard click
2. If fails (element not found):
   - Check if modal/popup is blocking → close it
   - Use vision to locate element
   - Try clicking coordinates
3. If fails (element not clickable):
   - Scroll into view
   - Wait for animations to complete
   - Try again
4. Max 3 attempts
5. Return ActionResult or throw error

Method: typeWithHealing(selector: string, text: string, visionAgent: VisionAgent): Promise<ActionResult>
Purpose: Type with fallback strategies
Implementation:
1. Try standard type
2. If fails: Check if element exists but disabled → wait for enable
3. If fails: Use vision to locate input field
4. If fails: Try clicking nearby and using sendKeys
5. Return ActionResult

HELPER METHODS:

Method: waitForPageLoad(): Promise<void>
Purpose: Wait for page to fully load
Implementation:
- Check document.readyState === 'complete'
- Check no pending network requests (via MCP)
- Wait for common loading indicators to disappear
- Timeout: 30 seconds

Method: isElementVisible(selector: string): Promise<boolean>
Purpose: Check element visibility
Implementation:
- Query element
- Check: offsetWidth > 0 && offsetHeight > 0
- Check: not hidden by CSS (display: none, visibility: hidden)
- Check: not obscured by overlay
- Return boolean

Method: getComputedStyle(selector: string): Promise<CSSStyleDeclaration>
Purpose: Get element styles
Implementation:
- Find element
- Return window.getComputedStyle(element)

Method: waitForSelector(selector: string, timeout?: number): Promise<Element>
Purpose: Poll for element appearance
Implementation:
- Poll every 100ms
- Check if element exists and visible
- Return element when found
- Throw timeout error if not found within timeout

ERROR HANDLING:
- Element not found: Try healing, then throw descriptive error
- Element not interactable: Wait and retry, then throw
- Page navigation: Detect and handle gracefully
- Timeout: Clear explanation of what was waiting for
- Network errors: Retry with backoff

LOGGING:
- Log every action with: type, target, timing, success/failure
- Save screenshots on failures
- Include page URL and state in logs

═══════════════════════════════════════════════════════════════════════
COMPONENT 2: MCPIntegration (src/core/browser/MCPIntegration.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Interface with MCP servers for browser automation.

CLASS: MCPIntegration

PROPERTIES:
- private client: MCPClient
- private serverConfig: MCPServerConfig
- private availableTools: MCPToolDefinition[]
- private serverProcess: ChildProcess | null

METHODS:

Method: initialize(): Promise<void>
Purpose: Start MCP server and connect
Implementation:
1. Spawn MCP server process:
   ```typescript
   spawn(serverConfig.command, serverConfig.args, {
     env: {...process.env, ...serverConfig.env}
   })
   ```
2. Wait for server to be ready (stdout: "Server started")
3. Connect to server (typically localhost:port)
4. List available tools via MCP protocol
5. Store tools in availableTools
6. Set initialized = true

Method: shutdown(): Promise<void>
Purpose: Gracefully close MCP server
Implementation:
1. Send shutdown message to server
2. Wait for process exit
3. Kill process if doesn't exit within 5 seconds
4. Clean up resources

Method: executeAction(action: MCPAction): Promise<MCPToolResult>
Purpose: Call MCP tool with arguments
Implementation:
1. Validate tool exists in availableTools
2. Validate args match tool's input schema
3. Build MCP request:
   ```json
   {
     "jsonrpc": "2.0",
     "id": generateId(),
     "method": "tools/call",
     "params": {
       "name": action.tool,
       "arguments": action.args
     }
   }
   ```
4. Send request to MCP server
5. Wait for response
6. Parse result
7. Return MCPToolResult

Method: getAvailableTools(): Promise<MCPToolDefinition[]>
Purpose: List all tools provided by MCP server
Implementation:
1. If cached: return cached tools
2. Else: Send MCP request:
   ```json
   {
     "jsonrpc": "2.0",
     "id": generateId(),
     "method": "tools/list"
   }
   ```
3. Parse response: array of tool definitions
4. Cache result
5. Return tools

Method: callTool(toolName: string, args: Record<string, any>): Promise<any>
Purpose: Generic tool calling interface
Implementation:
1. Validate tool exists
2. Validate args against tool schema
3. Call executeAction()
4. Return result

Method: parseResult(result: MCPToolResult): ActionResult
Purpose: Convert MCP result to internal format
Implementation:
- Map MCP success/error to ActionResult
- Extract relevant data
- Include timing information
- Return ActionResult

TOOL MAPPINGS:
Common MCP Playwright tools:
- browser_navigate → navigate to URL
- browser_click → click element
- browser_type → type text
- browser_screenshot → capture screenshot
- browser_wait → wait for condition
- browser_upload → upload file
- browser_evaluate → run JavaScript

ERROR HANDLING:
- Server not running: Throw with instructions to start
- Tool not found: List available tools in error
- Invalid args: Show expected schema
- Server timeout: Retry once, then fail
- Connection errors: Attempt reconnect

═══════════════════════════════════════════════════════════════════════
COMPONENT 3: DOMQuery (src/core/browser/DOMQuery.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Utilities for DOM interaction and querying.

FUNCTION: buildSelector(element: string, context?: string): string
Purpose: Smart selector builder
Implementation:
- Combine element type with context
- Example: buildSelector("button", "search form")
  → "form[role='search'] button"
- Use semantic HTML attributes when possible

FUNCTION: waitForSelector(selector: string, timeout: number): Promise<Element>
Purpose: Poll for element appearance
Implementation:
- Set up interval polling (100ms)
- Check if element exists and visible
- Clear interval when found
- Throw timeout error if not found
- Return element

FUNCTION: parseVisibleElements(html: string): VisibleElement[]
Purpose: Extract interactive elements from HTML
Implementation:
1. Parse HTML string to DOM
2. Query for interactive elements:
   - Buttons: button, [role="button"]
   - Inputs: input, textarea, select
   - Links: a[href]
3. For each element:
   - Get selector (prefer id, data-testid, unique class)
   - Get text content
   - Get bounding box
   - Get attributes
   - Determine if interactive
4. Return array of VisibleElement objects

FUNCTION: detectCanvasElements(): CanvasElement[]
Purpose: Find <canvas> elements and their contexts
Implementation:
1. Query all canvas elements
2. For each canvas:
   - Get selector
   - Get dimensions (width, height)
   - Detect context type (getContext call)
   - Store reference
3. Return array of CanvasElement objects

FUNCTION: isInteractive(element: Element): boolean
Purpose: Determine if element is interactive
Implementation:
- Check tag name (button, a, input, select, textarea)
- Check role attribute
- Check onclick handler
- Check cursor style (pointer)
- Return boolean

FUNCTION: getUniqueSelector(element: Element): string
Purpose: Generate unique selector for element
Implementation:
1. Try id: #elementId (if unique)
2. Try data-testid: [data-testid="value"]
3. Try name attribute: [name="value"]
4. Try aria-label: [aria-label="value"]
5. Fall back to: tagName.className:nth-child(n)
6. Return first unique selector found

═══════════════════════════════════════════════════════════════════════
COMPONENT 4: ActionExecutor (src/core/browser/ActionExecutor.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Execute complex action sequences with retry logic.

CLASS: ActionExecutor

CONSTRUCTOR:
- Accept: BrowserAgent, RetryConfig

Method: executeSequence(actions: BrowserAction[]): Promise<ActionResult[]>
Purpose: Run multiple actions in order
Implementation:
1. Initialize results array
2. For each action:
   - Execute action via BrowserAgent
   - Capture result
   - If failure and stopOnError: throw error
   - If failure and continueOnError: log and continue
3. Return array of results

Method: executeWithRetry(action: BrowserAction, retryConfig: RetryConfig): Promise<ActionResult>
Purpose: Retry failed actions with backoff
Implementation:
1. Attempt action
2. If success: return result
3. If failure:
   - Check if error is retryable
   - If not retryable: throw immediately
   - If retryable and attempts < max:
     * Calculate backoff delay
     * Wait delay
     * Retry action
4. Return result or throw after max attempts

RETRY STRATEGIES:

Strategy: immediate
- No delay between retries
- Use for: Quick operations, transient failures

Strategy: linear
- Fixed delay: delay * attempt
- Use for: Rate-limited operations

Strategy: exponential
- Exponential delay: baseDelay * (2 ^ attempt)
- Use for: Network operations, server errors
- Add jitter to avoid thundering herd

RETRYABLE ERRORS:
- Element not found (might appear after delay)
- Network timeout
- Rate limit errors
- Stale element reference

NON-RETRYABLE ERRORS:
- Invalid selector
- Permission denied
- Navigation canceled by user

═══════════════════════════════════════════════════════════════════════
COMPONENT 5: SelfHealing (src/core/browser/SelfHealing.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Adaptive element location when selectors break.

CLASS: SelfHealing

CONSTRUCTOR:
- Accept: BrowserAgent, VisionAgent

Method: healSelector(failedSelector: string, context: DOMState, visionAgent: VisionAgent): Promise<string>
Purpose: Find working alternative selector
Implementation:
1. Try selector variations:
   - Without specific classes: button (not button.primary.large)
   - Using text content: button:contains("Export")
   - Using position: .toolbar button:nth-child(2)
2. Try attribute-based selectors:
   - [data-testid], [aria-label], [name]
3. If all fail: Use vision to locate element
4. Vision returns coordinates
5. Find nearest DOM element to coordinates
6. Generate new selector for that element
7. Return working selector

Method: detectUIChange(expectedSelector: string): Promise<UIChangeReport>
Purpose: Detect if UI structure changed
Implementation:
1. Check if selector exists
2. If not found: Capture screenshot
3. Compare with previous screenshot (if available)
4. Use vision to identify what changed
5. Return UIChangeReport with:
   - What changed
   - Suggested new selector
   - Confidence level

Method: findSimilarElement(brokenSelector: string): Promise<string>
Purpose: Fuzzy matching for selectors
Implementation:
1. Parse broken selector (tag, classes, attributes)
2. Query elements with partial matches:
   - Same tag, different classes
   - Similar text content
   - Similar position
3. Score each candidate by similarity
4. Return selector of best match

HEALING STRATEGIES:

Strategy 1: Attribute Fallback
- Try alternative attributes (id → data-testid → name → aria-label)
- Use most stable attribute available

Strategy 2: Structural Navigation
- Navigate from stable parent element
- Example: #header .logo → #header [src*="logo"]

Strategy 3: Text Content Matching
- Use :contains() or text matching
- Less brittle than class names

Strategy 4: Vision-based Location
- Last resort when DOM approaches fail
- Use VisionAgent to find element visually
- Generate new selector from found element

LOGGING:
- Log each healing attempt
- Track success rate of healing strategies
- Suggest adapter updates based on patterns

═══════════════════════════════════════════════════════════════════════
INTEGRATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

DEPENDENCIES:
From Content Scripts:
- DOM manipulation and querying
- Event dispatching
- Element visibility checks

From Chrome APIs:
- tabs: Query and update tabs
- scripting: Execute scripts in tabs
- storage: Cache element locations

From VisionAgent:
- locateElement(): Vision-based element finding
- For self-healing when DOM fails

MCP Server Configuration:
- Playwright MCP: Default choice
- Browser MCP: Lightweight alternative
- Config file: src/mcp-servers/playwright-mcp.json

CONTENT SCRIPT COMMUNICATION:
Background → Content Script:
```typescript
chrome.tabs.sendMessage(tabId, {
  action: 'click',
  selector: '#button'
})
```

Content Script → Background:
```typescript
chrome.runtime.sendMessage({
  action: 'actionComplete',
  result: {success: true, data: {...}}
})
```

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

CREATE:
1. BrowserAgent.ts - Main browser interface
2. MCPIntegration.ts - MCP client
3. DOMQuery.ts - DOM utilities
4. ActionExecutor.ts - Sequence execution
5. SelfHealing.ts - Adaptive selectors

REQUIREMENTS:
- Follow type definitions from Phase 0
- Comprehensive error handling
- Retry logic with configurable strategies
- Self-healing element location
- Content script integration
- MCP server lifecycle management
- Logging of all actions

VALIDATION:
- Can navigate to URL
- Can click button by selector
- Can type text into input
- Screenshot capture works
- MCP tools are called correctly
- Self-healing recovers from changed selectors
- Content script communication functions
- Handles page navigation gracefully
```

---

## PROMPT 1.5: State Management & Job Queue System

```
PROJECT: BrowserAI Craft - State Management & Persistence

ROLE: You are creating the state management system that persists job execution state across browser sessions and manages the job queue.

CONTEXT:
Browser extensions can crash, browser can close, user can navigate away. State must persist to enable pause/resume functionality and crash recovery. Use Chrome Storage API with 10MB limit.

═══════════════════════════════════════════════════════════════════════
COMPONENT 1: StateManager (src/background/core/StateManager.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Central state management for all jobs, configuration, and logs.

CLASS: StateManager

CONSTRUCTOR:
- Initialize Chrome storage listeners
- Set up event emitters for UI updates
- Load initial state

STORAGE KEYS:
```typescript
const STORAGE_KEYS = {
  JOBS: 'browserai_jobs',           // All jobs
  ACTIVE_JOB: 'browserai_active_job', // Currently running job ID
  CONFIG: 'browserai_config',       // User configuration
  LOGS: 'browserai_logs',           // Recent logs
  CACHE: 'browserai_cache'          // Temporary cache
}
```

PUBLIC METHODS:

Method: saveJobState(job: Job): Promise<void>
Purpose: Persist job to storage
Implementation:
1. Calculate job progress:
   ```typescript
   const completedCount = job.tasks.filter(t => t.status === 'completed').length
   job.progress = (completedCount / job.tasks.length) * 100
   ```
2. Update timestamps (startedAt, completedAt based on status)
3. Compress screenshots in job.errors if present
4. Serialize job to JSON
5. Save to chrome.storage.local:
   ```typescript
   const key = `${STORAGE_KEYS.JOBS}.${job.id}`
   await chrome.storage.local.set({[key]: job})
   ```
6. Update jobs index (list of all job IDs)
7. Emit storage change event: {type: 'job_updated', jobId: job.id}
8. Check storage usage, trigger cleanup if needed

Method: getJobState(jobId: string): Promise<Job | null>
Purpose: Retrieve job by ID
Implementation:
1. Query chrome.storage.local for key `browserai_jobs.${jobId}`
2. If not found: return null
3. Deserialize JSON to Job object
4. Decompress screenshots if compressed
5. Validate job structure (ensure all required fields)
6. Return Job object

Method: getAllJobs(): Promise<Job[]>
Purpose: Get all jobs for queue display
Implementation:
1. Get jobs index from storage
2. Load each job by ID in parallel
3. Filter out null results (deleted jobs)
4. Sort by createdAt descending (newest first)
5. Return array of Job objects

Method: getActiveJob(): Promise<Job | null>
Purpose: Get currently running job
Implementation:
1. Get active job ID from storage
2. If no active job: return null
3. Load job by ID
4. Verify job.status === 'running'
5. Return Job or null if not actually running

Method: setActiveJob(jobId: string | null): Promise<void>
Purpose: Mark job as active
Implementation:
1. Save jobId to ACTIVE_JOB key
2. If jobId is null: clear active job
3. Emit event: {type: 'active_job_changed', jobId}

Method: updateTaskStatus(jobId: string, taskId: string, status: TaskStatus, result?: any): Promise<void>
Purpose: Update individual task within job
Implementation:
1. Load job from storage
2. Find task by taskId in job.tasks array
3. Update task.status
4. If result provided: save to task.result
5. Update task.attempts if needed
6. Recalculate job.progress
7. Update job.status if all tasks complete:
   - If all completed: job.status = 'completed'
   - If any failed and can't retry: job.status = 'failed'
8. Save updated job
9. Emit event: {type: 'task_updated', jobId, taskId, status}

Method: pauseJob(jobId: string): Promise<void>
Purpose: Pause running job
Implementation:
1. Load job from storage
2. Verify job.status === 'running'
3. Set job.status = 'paused'
4. Save current task index (which task to resume from)
5. Persist job state immediately
6. Clear from active job
7. Emit event: {type: 'job_paused', jobId}

Method: resumeJob(jobId: string): Promise<void>
Purpose: Resume paused job
Implementation:
1. Load job from storage
2. Verify job.status === 'paused'
3. Set job.status = 'running'
4. Restore task index (resume from saved position)
5. Set as active job
6. Persist state
7. Emit event: {type: 'job_resumed', jobId}
8. Return control to OrchestrationEngine to continue execution

Method: cancelJob(jobId: string): Promise<void>
Purpose: Cancel running or paused job
Implementation:
1. Load job from storage
2. Set job.status = 'cancelled'
3. Set job.completedAt = now
4. Save final state
5. Clear from active job if was active
6. Emit event: {type: 'job_cancelled', jobId}
7. Trigger cleanup of associated resources

Method: deleteJob(jobId: string): Promise<void>
Purpose: Remove job from storage
Implementation:
1. Load job to get associated resources
2. Delete all screenshots in job.errors
3. Remove job from storage
4. Remove from jobs index
5. Trigger storage cleanup
6. Emit event: {type: 'job_deleted', jobId}

Method: getRecentJobs(limit: number = 10): Promise<Job[]>
Purpose: Get most recent jobs for UI
Implementation:
1. Get all jobs
2. Sort by createdAt descending
3. Take first `limit` jobs
4. Return array

Method: getJobsByStatus(status: JobStatus): Promise<Job[]>
Purpose: Filter jobs by status
Implementation:
1. Get all jobs
2. Filter where job.status === status
3. Sort by createdAt descending
4. Return array

CONFIGURATION METHODS:

Method: saveConfig(config: UserConfig): Promise<void>
Purpose: Persist user configuration
Implementation:
1. Validate config structure
2. Encrypt sensitive data (API keys)
3. Save to chrome.storage.local under CONFIG key
4. Emit event: {type: 'config_updated'}

Method: getConfig(): Promise<UserConfig>
Purpose: Load user configuration
Implementation:
1. Query storage for CONFIG key
2. If not found: return default config
3. Decrypt sensitive data
4. Return UserConfig object

Method: updateConfig(partial: Partial<UserConfig>): Promise<void>
Purpose: Update specific config fields
Implementation:
1. Load current config
2. Merge with partial update
3. Validate merged config
4. Save updated config

LOGGING METHODS:

Method: saveLogs(entries: LogEntry[]): Promise<void>
Purpose: Persist log entries
Implementation:
1. Get current logs from storage
2. Append new entries
3. Keep only last 1000 entries (FIFO)
4. Save to storage under LOGS key

Method: getLogs(filter?: LogFilter): Promise<LogEntry[]>
Purpose: Retrieve logs with optional filtering
Implementation:
1. Load all logs from storage
2. Apply filters: level, component, jobId, date range
3. Sort by timestamp descending
4. Return filtered array

Method: clearLogs(): Promise<void>
Purpose: Delete all logs
Implementation:
1. Remove LOGS key from storage
2. Emit event: {type: 'logs_cleared'}

Method: exportLogs(): Promise<string>
Purpose: Export logs as JSON for debugging
Implementation:
1. Get all logs
2. Serialize to formatted JSON
3. Return JSON string
4. UI can trigger download

CLEANUP METHODS:

Method: cleanupOldJobs(): Promise<void>
Purpose: Free storage space by removing old jobs
Implementation:
1. Get all completed jobs
2. Find jobs older than 7 days
3. For each old job:
   - Delete associated screenshots
   - Remove from storage
4. Update jobs index
5. Log cleanup summary

Method: compressScreenshots(job: Job): Job
Purpose: Reduce screenshot sizes in job data
Implementation:
1. For each screenshot in job.errors:
   - Resize to max 800px width (maintain aspect)
   - Compress to JPEG quality 60%
   - Convert to base64
2. Update job with compressed screenshots
3. Return modified job

Method: checkStorageUsage(): Promise<{used: number, limit: number, percentage: number}>
Purpose: Monitor storage consumption
Implementation:
1. Get chrome.storage.local.getBytesInUse()
2. Calculate percentage of 10MB limit
3. Return usage stats
4. Trigger cleanup if > 80%

Method: cleanupCache(): Promise<void>
Purpose: Clear temporary cached data
Implementation:
1. Remove CACHE key from storage
2. Clear in-memory caches
3. Emit event: {type: 'cache_cleared'}

STORAGE LIMITS HANDLING:

Method: ensureStorageSpace(requiredBytes: number): Promise<void>
Purpose: Ensure enough space available
Implementation:
1. Check current usage
2. If available space < required:
   - Run cleanupOldJobs()
   - Compress screenshots in recent jobs
   - If still insufficient: throw storage full error
3. Return when space available

ENCRYPTION:

Method: encryptApiKey(key: string): string
Purpose: Encrypt sensitive data before storage
Implementation:
- Use subtle crypto API
- Key derivation from extension ID (unique per install)
- Return encrypted string

Method: decryptApiKey(encrypted: string): string
Purpose: Decrypt API keys when loading config
Implementation:
- Use same key derivation
- Decrypt and return original string

EVENT EMITTING:

Method: emitStateChange(event: StateChangeEvent): void
Purpose: Notify UI of state changes
Implementation:
1. Trigger chrome.storage.onChanged listener
2. UI components subscribe via chrome.storage.onChanged
3. Event types:
   - job_updated: Job state changed
   - job_created: New job added
   - job_deleted: Job removed
   - task_updated: Task status changed
   - config_updated: Config changed
   - active_job_changed: Active job changed

MIGRATION:

Method: migrateStorage(fromVersion: string, toVersion: string): Promise<void>
Purpose: Handle storage schema changes between versions
Implementation:
1. Detect old storage format
2. Load old data
3. Transform to new format
4. Save in new format
5. Remove old keys
6. Log migration completion

═══════════════════════════════════════════════════════════════════════
COMPONENT 2: JobQueue (src/background/core/JobQueue.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Manage queue of jobs waiting to execute.

CLASS: JobQueue

PROPERTIES:
- private queue: Job[] (in-memory queue)
- private processing: boolean (is queue being processed)
- private stateManager: StateManager

CONSTRUCTOR:
- Accept StateManager
- Initialize empty queue
- Load queued jobs from storage

PUBLIC METHODS:

Method: enqueue(job: Job): Promise<void>
Purpose: Add job to queue
Implementation:
1. Set job.status = 'queued'
2. Add to in-memory queue
3. Persist job via StateManager
4. Emit event: {type: 'job_queued', jobId}
5. If not already processing: start processing

Method: dequeue(): Promise<Job | null>
Purpose: Get next job from queue
Implementation:
1. Find first job with status 'queued'
2. Remove from queue
3. Return job or null if queue empty

Method: startProcessing(): Promise<void>
Purpose: Begin processing queued jobs
Implementation:
1. Set processing = true
2. While queue not empty:
   - Dequeue next job
   - Set as active job
   - Execute job via OrchestrationEngine
   - Wait for completion
   - Process next job
3. Set processing = false when queue empty

Method: stopProcessing(): Promise<void>
Purpose: Stop queue processing
Implementation:
1. Set processing = false
2. Pause current job if any
3. Jobs remain queued

Method: getQueuedJobs(): Job[]
Purpose: Get all jobs waiting in queue
Implementation:
- Filter queue for status 'queued'
- Return array

Method: getQueuePosition(jobId: string): number
Purpose: Get job's position in queue
Implementation:
- Find job index in queued jobs
- Return position (1-indexed)
- Return -1 if not in queue

Method: removeFromQueue(jobId: string): Promise<void>
Purpose: Remove job from queue without executing
Implementation:
1. Find job in queue
2. Remove from queue
3. Update job.status = 'cancelled'
4. Persist via StateManager

Method: prioritizeJob(jobId: string): Promise<void>
Purpose: Move job to front of queue
Implementation:
1. Find job in queue
2. Remove from current position
3. Insert at index 0
4. Emit event: {type: 'job_prioritized', jobId}

Method: getQueueLength(): number
Purpose: Get number of jobs in queue
Implementation:
- Return queue.length

═══════════════════════════════════════════════════════════════════════
COMPONENT 3: CacheManager (src/background/core/CacheManager.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
In-memory caching for performance optimization.

CLASS: CacheManager

PROPERTIES:
- private cache: Map<string, CacheEntry>
- private maxSize: number (max entries)
- private ttl: number (time to live in ms)

METHOD: set(key: string, value: any, ttl?: number): void
Purpose: Store value in cache
Implementation:
1. Create CacheEntry with value and expiry time
2. If cache at max size: evict oldest entry
3. Store in cache Map
4. Schedule cleanup after TTL

METHOD: get(key: string): any | null
Purpose: Retrieve cached value
Implementation:
1. Get entry from cache
2. Check if expired (now > expiry)
3. If expired: delete entry, return null
4. Else: return value

METHOD: has(key: string): boolean
Purpose: Check if key exists and not expired
Implementation:
- Return cache.has(key) && !isExpired(key)

METHOD: delete(key: string): void
Purpose: Remove entry from cache
Implementation:
- cache.delete(key)

METHOD: clear(): void
Purpose: Clear all cached data
Implementation:
- cache.clear()

CACHE STRATEGIES:

Screenshot Analysis Cache:
- Key: hash(screenshot) + hash(prompt)
- TTL: 5 minutes
- Reduces redundant vision API calls

LLM Response Cache:
- Key: hash(system prompt + user prompt)
- TTL: 10 minutes
- For identical prompts in same session

Element Location Cache:
- Key: url + selector + timestamp
- TTL: 2 minutes
- Invalidate on page change

EVICTION POLICY:
- LRU (Least Recently Used)
- When cache reaches maxSize, remove oldest entry

═══════════════════════════════════════════════════════════════════════
COMPONENT 4: StorageMonitor (src/background/core/StorageMonitor.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Monitor Chrome storage usage and trigger cleanup.

CLASS: StorageMonitor

CONSTRUCTOR:
- Accept StateManager
- Start monitoring on initialization

METHOD: startMonitoring(): void
Purpose: Begin periodic storage checks
Implementation:
1. Set interval: check every 5 minutes
2. On each check: call checkAndCleanup()

METHOD: stopMonitoring(): void
Purpose: Stop monitoring
Implementation:
- Clear interval

METHOD: checkAndCleanup(): Promise<void>
Purpose: Check usage and cleanup if needed
Implementation:
1. Get storage usage via StateManager
2. If usage > 80%:
   - Log warning
   - Run StateManager.cleanupOldJobs()
   - Compress screenshots in recent jobs
3. If usage > 95%:
   - Log critical warning
   - Delete oldest jobs aggressively
   - Clear cache
   - Notify user of storage issues

METHOD: getStorageReport(): Promise<StorageReport>
Purpose: Detailed storage breakdown
Implementation:
1. Calculate bytes used by:
   - Jobs data
   - Screenshots
   - Logs
   - Config
   - Cache
2. Return StorageReport with breakdown

TYPES:
```typescript
interface StorageReport {
  totalUsed: number
  totalLimit: number
  percentage: number
  breakdown: {
    jobs: number
    screenshots: number
    logs: number
    config: number
    cache: number
  }
  recommendations: string[]  // Cleanup suggestions
}
```

═══════════════════════════════════════════════════════════════════════
INTEGRATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

CHROME STORAGE API:
- Use chrome.storage.local (10MB limit)
- Never use chrome.storage.sync (too small, 100KB)
- Handle QUOTA_BYTES_PER_ITEM limit (8KB per key)
- For large jobs: split across multiple keys if needed

PERSISTENCE GUARANTEES:
- Save after every task completion
- Save on job pause/resume/cancel
- Save config changes immediately
- Persist logs in batches (every 10 entries or 1 minute)

CRASH RECOVERY:
- On extension startup: Load active job
- Check if job status is 'running'
- Resume from last completed task
- Or mark as 'failed' if unrecoverable

UI SYNCHRONIZATION:
- Use chrome.storage.onChanged listeners
- UI components re-render on storage changes
- No polling needed

MIGRATION STRATEGY:
- Version storage schema
- Check version on load
- Run migrations if version mismatch
- Backwards compatible when possible

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

CREATE:
1. StateManager.ts - Main state management
2. JobQueue.ts - Queue management
3. CacheManager.ts - In-memory caching
4. StorageMonitor.ts - Storage monitoring

REQUIREMENTS:
- Follow type definitions from Phase 0
- Comprehensive error handling
- Storage limit management
- Encryption for sensitive data
- Event emission for UI updates
- Cleanup strategies
- Migration support
- JSDoc documentation

VALIDATION:
- Job state persists after browser restart
- Pause/resume works correctly
- Storage stays under 10MB limit
- Old jobs are cleaned up automatically
- Screenshots are compressed efficiently
- UI updates when state changes
- Multiple tabs don't conflict
- Handles storage quota errors gracefully
```

---

**END OF PHASE 1 PROMPTS**

All 5 Phase 1 prompts are now complete. These provide comprehensive, instruction-only specifications for building the core framework without any code implementation.
