# PHASE 3-5: COMPLETE PROMPTS

---

## PROMPT 3.1: Data Sources & CSV/Sheets Integration

```
PROJECT: BrowserAI Craft - Data Source Integration

ROLE: You are building data source connectors that enable bulk automation by loading data from CSV files and Google Sheets.

CONTEXT FROM RESEARCH:
Reference PDF sections:
- Section 2.3: Bulk generation workflows
- Section 7.2: Data mapping strategies

KEY CAPABILITIES:
1. Parse CSV files from user uploads
2. Connect to Google Sheets via API
3. Validate data structure
4. Map columns to design fields
5. Handle data transformations

═══════════════════════════════════════════════════════════════════════
COMPONENT 1: CSVParser (src/data/CSVParser.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Parse and validate CSV files for bulk automation.

CLASS: CSVParser

METHOD: parse(file: File): Promise<DataRow[]>
Purpose: Parse CSV file to array of objects
Implementation:
1. Read file as text
2. Detect delimiter (comma, semicolon, tab)
3. Parse using Papa Parse library or custom parser:
   ```typescript
   const lines = text.split('\n')
   const headers = lines[0].split(delimiter)
   const rows = lines.slice(1).map(line => {
     const values = line.split(delimiter)
     const obj = {}
     headers.forEach((header, i) => {
       obj[header.trim()] = values[i]?.trim() || ''
     })
     return obj
   })
   ```
4. Validate: At least one data row
5. Return array of DataRow objects

METHOD: parseFromText(csvText: string): Promise<DataRow[]>
Purpose: Parse CSV from string
Implementation: Same as parse() but accepts string

METHOD: detectDelimiter(sample: string): string
Purpose: Auto-detect CSV delimiter
Implementation:
1. Count occurrences of common delimiters: , ; \t |
2. Check first few lines for consistency
3. Return most likely delimiter

METHOD: validateStructure(rows: DataRow[], expectedColumns?: string[]): ValidationResult
Purpose: Verify CSV has required structure
Implementation:
1. Check all rows have same columns
2. Check for empty rows
3. If expectedColumns provided: verify they exist
4. Return {valid: boolean, errors: string[]}

METHOD: preview(file: File, rowCount: number = 5): Promise<DataRow[]>
Purpose: Get preview of CSV data
Implementation:
- Parse only first N rows
- Return for UI display before full import

METHOD: detectEncoding(file: File): Promise<string>
Purpose: Detect file encoding (UTF-8, Latin-1, etc.)
Implementation:
- Read first 1KB of file
- Use encoding detection library
- Return detected encoding

METHOD: convertToDataRows(parsed: any[]): DataRow[]
Purpose: Convert parsed CSV to internal format
Implementation:
```typescript
return parsed.map((row, index) => ({
  id: `row_${index}`,
  data: row,
  status: 'pending'
}))
```

ERROR HANDLING:
- Empty file: Throw descriptive error
- Malformed CSV: Show line number of error
- Encoding issues: Try UTF-8, then Latin-1, then fail
- Large files (>10MB): Warn about performance

═══════════════════════════════════════════════════════════════════════
COMPONENT 2: GoogleSheetsConnector (src/data/GoogleSheetsConnector.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Connect to Google Sheets and fetch data.

CLASS: GoogleSheetsConnector

CONSTRUCTOR:
```typescript
constructor(apiKey?: string) {
  this.apiKey = apiKey || this.getStoredApiKey()
}
```

METHOD: authenticate(): Promise<void>
Purpose: OAuth flow for Google Sheets access
Implementation:
1. Use chrome.identity.launchWebAuthFlow()
2. Get authorization code
3. Exchange for access token
4. Store token securely in chrome.storage

METHOD: fetchSheetData(sheetUrl: string, range?: string): Promise<DataRow[]>
Purpose: Load data from sheet
Implementation:
1. Parse sheet URL to extract spreadsheetId
2. Default range: 'A1:Z1000' if not specified
3. Call Google Sheets API:
   ```
   GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}
   Authorization: Bearer {accessToken}
   ```
4. Parse response:
   ```json
   {
     "values": [
       ["Name", "Title", "Company"],
       ["John", "CEO", "Acme Inc"],
       ["Jane", "CTO", "Tech Corp"]
     ]
   }
   ```
5. First row is headers
6. Convert to DataRow[] format
7. Return data

METHOD: getSheetMetadata(sheetUrl: string): Promise<SheetMetadata>
Purpose: Get sheet name, columns, row count
Implementation:
1. Call API: GET /spreadsheets/{id}
2. Extract metadata: title, sheet names, row counts
3. Return SheetMetadata object

METHOD: listAccessibleSheets(): Promise<SheetInfo[]>
Purpose: List user's sheets (for UI picker)
Implementation:
1. Requires Google Drive API scope
2. Call Drive API: list spreadsheets
3. Return array of {id, name, url}

METHOD: validateSheetAccess(sheetUrl: string): Promise<boolean>
Purpose: Check if sheet is accessible
Implementation:
1. Try to fetch metadata
2. If successful: return true
3. If 403: return false (no access)
4. If 404: throw error (sheet doesn't exist)

METHOD: refreshToken(): Promise<void>
Purpose: Refresh expired access token
Implementation:
- Use refresh token to get new access token
- Update stored credentials

ERROR HANDLING:
- Not authenticated: Trigger OAuth flow
- Sheet not found: Clear error message with sheet URL
- No permission: Explain user needs to grant access
- Rate limits: Retry with exponential backoff
- Network errors: Retry with timeout

SECURITY:
- Store access token encrypted in chrome.storage.local
- Never log or expose tokens
- Clear tokens on logout

═══════════════════════════════════════════════════════════════════════
COMPONENT 3: DataMapper (src/data/DataMapper.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Map data columns to design fields intelligently.

CLASS: DataMapper

METHOD: suggestMapping(columns: string[], designFields: string[]): ColumnMapping
Purpose: Auto-suggest column-to-field mappings
Implementation:
1. For each design field:
   - Find best matching column by similarity:
     * Exact match (case-insensitive)
     * Contains match ("title_text" matches "Title")
     * Semantic similarity using simple NLP
2. Example mapping:
   ```typescript
   {
     "headline": "Title",
     "bodyText": "Description",
     "imageSrc": "Image_URL"
   }
   ```
3. Return ColumnMapping object

METHOD: applyMapping(dataRow: DataRow, mapping: ColumnMapping): MappedData
Purpose: Transform row data using mapping
Implementation:
```typescript
const mapped = {}
for (const [field, column] of Object.entries(mapping)) {
  mapped[field] = dataRow.data[column] || ''
}
return mapped
```

METHOD: validateMapping(mapping: ColumnMapping, requiredFields: string[]): boolean
Purpose: Check if all required fields are mapped
Implementation:
- Check each required field has a mapping
- Return true if all present, false otherwise

METHOD: transformValue(value: string, transformation: Transformation): string
Purpose: Apply transformations to data
Implementation:
Supported transformations:
- uppercase: value.toUpperCase()
- lowercase: value.toLowerCase()
- trim: value.trim()
- truncate: value.substring(0, maxLength)
- dateFormat: Format date string
- urlEncode: encodeURIComponent(value)

METHOD: detectFieldTypes(rows: DataRow[]): FieldTypes
Purpose: Infer data types of columns
Implementation:
1. Sample first 10 rows
2. For each column:
   - Check if all values are numbers → number type
   - Check if values are URLs → url type
   - Check if values are dates → date type
   - Default: text type
3. Return FieldTypes mapping

═══════════════════════════════════════════════════════════════════════
COMPONENT 4: DataValidator (src/data/DataValidator.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Validate data quality before processing.

CLASS: DataValidator

METHOD: validateRows(rows: DataRow[], rules: ValidationRule[]): ValidationReport
Purpose: Run validation checks on data
Implementation:
1. For each row and each rule:
   - Apply rule check
   - Collect violations
2. Return ValidationReport with:
   - totalRows
   - validRows
   - invalidRows (with reasons)
   - warnings

VALIDATION RULES:

Rule: requiredFields
Check: Specified fields are not empty
```typescript
{
  type: 'requiredFields',
  fields: ['Title', 'Description']
}
```

Rule: maxLength
Check: Text fields don't exceed character limit
```typescript
{
  type: 'maxLength',
  field: 'Description',
  maxLength: 200
}
```

Rule: validUrl
Check: URL fields are valid URLs
```typescript
{
  type: 'validUrl',
  field: 'Image_URL'
}
```

Rule: validEmail
Check: Email fields match email pattern
```typescript
{
  type: 'validEmail',
  field: 'Email'
}
```

Rule: pattern
Check: Field matches regex pattern
```typescript
{
  type: 'pattern',
  field: 'Phone',
  pattern: /^\d{3}-\d{3}-\d{4}$/
}
```

METHOD: sanitizeData(rows: DataRow[]): DataRow[]
Purpose: Clean common data issues
Implementation:
- Trim whitespace
- Remove empty rows
- Fix common encoding issues (' → ')
- Normalize line breaks
- Return cleaned rows

METHOD: detectDuplicates(rows: DataRow[], keyFields: string[]): number[]
Purpose: Find duplicate rows
Implementation:
1. Create Set of row signatures (concatenated key fields)
2. Track row indices with duplicate signatures
3. Return array of duplicate row indices

═══════════════════════════════════════════════════════════════════════
COMPONENT 5: DataSourceFactory (src/data/DataSourceFactory.ts)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Create appropriate data source connector.

FUNCTION: createDataSource(config: DataSourceConfig): DataSource
Purpose: Factory function
Implementation:
```typescript
switch (config.type) {
  case 'csv':
    return new CSVDataSource(config.file)
  case 'googleSheets':
    return new GoogleSheetsDataSource(config.sheetUrl, config.range)
  case 'json':
    return new JSONDataSource(config.data)
  case 'manual':
    return new ManualDataSource(config.rows)
  default:
    throw new Error(`Unknown data source type: ${config.type}`)
}
```

FUNCTION: detectDataSourceType(input: string): DataSourceType
Purpose: Auto-detect data source from user input
Implementation:
```typescript
if (input.startsWith('https://docs.google.com/spreadsheets')) {
  return 'googleSheets'
} else if (input.endsWith('.csv')) {
  return 'csv'
} else if (input.startsWith('{') || input.startsWith('[')) {
  return 'json'
} else {
  return 'unknown'
}
```

═══════════════════════════════════════════════════════════════════════
INTEGRATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

UI INTEGRATION:
- File upload for CSV
- Google Sheets URL input
- Column mapping UI (drag-and-drop)
- Data preview table
- Validation report display

WORKFLOW:
1. User selects data source
2. System loads and validates data
3. System suggests column mapping
4. User confirms or adjusts mapping
5. System processes each row in bulk automation

ERROR HANDLING:
- Invalid file: Show format requirements
- API errors: Show connection troubleshooting
- Validation failures: Highlight problematic rows
- Large datasets: Show progress bar

PERFORMANCE:
- Stream large CSV files (don't load all in memory)
- Paginate Google Sheets requests (1000 rows at a time)
- Process data in batches to avoid memory issues

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

CREATE:
1. CSVParser.ts - CSV parsing
2. GoogleSheetsConnector.ts - Google Sheets integration
3. DataMapper.ts - Column mapping logic
4. DataValidator.ts - Data validation
5. DataSourceFactory.ts - Factory utilities

REQUIREMENTS:
- Follow type definitions from Phase 0
- Comprehensive error handling
- Support large datasets (streaming)
- Intelligent column mapping
- Data validation with clear errors
- Google OAuth integration
- JSDoc documentation

VALIDATION:
- Can parse CSV files correctly
- Can connect to Google Sheets
- Suggests accurate column mappings
- Validates data against rules
- Handles encoding issues
- Reports errors clearly
```

---

## PROMPT 4.1: Chrome Extension Structure

```
PROJECT: BrowserAI Craft - Chrome Extension Architecture

ROLE: You are building the Chrome extension structure with background service worker, content scripts, and popup UI.

CONTEXT FROM RESEARCH:
Reference PDF sections:
- Section 4.2: Browser extension integration
- Section 6.1: Manifest V3 requirements

MANIFEST V3 REQUIREMENTS:
- Service worker instead of background page
- Declarative permissions
- Content Security Policy compliance
- Remote code restrictions

═══════════════════════════════════════════════════════════════════════
COMPONENT 1: manifest.json
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Chrome extension manifest with all required permissions.

CONTENT:
```json
{
  "manifest_version": 3,
  "name": "BrowserAI Craft",
  "version": "1.0.0",
  "description": "AI-powered browser automation for design platforms",
  
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "downloads",
    "identity"
  ],
  
  "host_permissions": [
    "https://canva.com/*",
    "https://*.canva.com/*",
    "https://figma.com/*",
    "https://*.figma.com/*",
    "http://localhost:*/*",
    "https://sheets.googleapis.com/*"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["https://canva.com/*", "https://*.canva.com/*"],
      "js": ["content-scripts/canva.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://figma.com/*", "https://*.figma.com/*"],
      "js": ["content-scripts/figma.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["<all_urls>"],
      "js": ["content-scripts/generic.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["injected.js"],
      "matches": ["https://canva.com/*", "https://figma.com/*"]
    }
  ],
  
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly"
    ]
  }
}
```

EXPLANATION OF KEY FIELDS:
- **permissions**: Core capabilities needed
  * activeTab: Access current tab
  * storage: Persist state
  * scripting: Inject scripts
  * downloads: Save generated files
  * identity: Google OAuth

- **host_permissions**: Website access
  * Design platforms: Canva, Figma
  * Local LLMs: localhost
  * Google APIs: Sheets

- **content_scripts**: Injected page scripts
  * Per-platform scripts for platform-specific logic
  * Generic script for fallback automation

- **service_worker**: Background processing
  * Handles orchestration
  * Manages state
  * Communicates with UI

═══════════════════════════════════════════════════════════════════════
COMPONENT 2: Background Service Worker (background.js)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Service worker that coordinates all automation operations.

STRUCTURE:
```javascript
// Import all core modules
import { OrchestrationEngine } from './core/OrchestrationEngine.js'
import { StateManager } from './core/StateManager.js'
import { LLMAdapter } from './core/llm/LLMAdapter.js'
// ... other imports

// Initialize core systems
let orchestrator
let stateManager
let config

// Service worker lifecycle
self.addEventListener('install', (event) => {
  console.log('BrowserAI Craft installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('BrowserAI Craft activated')
  event.waitUntil(initializeSystems())
})

async function initializeSystems() {
  // Load config
  config = await chrome.storage.local.get('config')
  
  // Initialize state manager
  stateManager = new StateManager()
  
  // Initialize LLM adapter
  const llmConfig = config.llm || getDefaultLLMConfig()
  const llmAdapter = new LLMAdapter(llmConfig)
  
  // Initialize orchestrator
  orchestrator = new OrchestrationEngine({
    llmAdapter,
    stateManager,
    config
  })
  
  // Resume any interrupted jobs
  await resumeInterruptedJobs()
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse)
  return true  // Async response
})

async function handleMessage(message, sender) {
  switch (message.action) {
    case 'startJob':
      return await startJob(message.data)
    
    case 'pauseJob':
      return await pauseJob(message.jobId)
    
    case 'resumeJob':
      return await resumeJob(message.jobId)
    
    case 'cancelJob':
      return await cancelJob(message.jobId)
    
    case 'getJobStatus':
      return await getJobStatus(message.jobId)
    
    case 'getAllJobs':
      return await getAllJobs()
    
    case 'updateConfig':
      return await updateConfig(message.config)
    
    case 'testLLMConnection':
      return await testLLMConnection()
    
    default:
      throw new Error(`Unknown action: ${message.action}`)
  }
}

// Job management functions
async function startJob(jobData) {
  const job = await orchestrator.createJob(jobData)
  await orchestrator.execute(job)
  return {success: true, jobId: job.id}
}

async function pauseJob(jobId) {
  await orchestrator.pauseJob(jobId)
  return {success: true}
}

async function resumeJob(jobId) {
  await orchestrator.resumeJob(jobId)
  return {success: true}
}

async function cancelJob(jobId) {
  await orchestrator.cancelJob(jobId)
  return {success: true}
}

async function getJobStatus(jobId) {
  const job = await stateManager.getJobState(jobId)
  return {success: true, job}
}

async function getAllJobs() {
  const jobs = await stateManager.getAllJobs()
  return {success: true, jobs}
}

// Configuration
async function updateConfig(newConfig) {
  await stateManager.saveConfig(newConfig)
  await initializeSystems()  // Reinitialize with new config
  return {success: true}
}

async function testLLMConnection() {
  try {
    const result = await orchestrator.testLLM()
    return {success: true, result}
  } catch (error) {
    return {success: false, error: error.message}
  }
}

// Resume interrupted jobs on startup
async function resumeInterruptedJobs() {
  const activeJob = await stateManager.getActiveJob()
  if (activeJob && activeJob.status === 'running') {
    console.log('Resuming interrupted job:', activeJob.id)
    await orchestrator.resumeJob(activeJob.id)
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service worker error:', event.error)
  // Log to state manager for debugging
  stateManager.saveLogs([{
    level: 'error',
    message: event.error.message,
    stack: event.error.stack,
    timestamp: Date.now()
  }])
})
```

MANIFEST V3 CONSIDERATIONS:
- Service workers can be terminated at any time
- All state must be persisted to storage
- Long-running operations need to use alarms or port connections
- No DOM access (use content scripts)

═══════════════════════════════════════════════════════════════════════
COMPONENT 3: Content Scripts
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Scripts injected into web pages for DOM manipulation.

**Generic Content Script (content-scripts/generic.js):**

```javascript
// Generic content script for all websites
console.log('[BrowserAI] Content script loaded')

// Establish communication with background
let port = chrome.runtime.connect({name: 'content-script'})

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleContentMessage(message).then(sendResponse)
  return true
})

async function handleContentMessage(message) {
  switch (message.action) {
    case 'getDOMState':
      return await getDOMState()
    
    case 'click':
      return await clickElement(message.selector || message.coordinates)
    
    case 'type':
      return await typeText(message.selector, message.text, message.options)
    
    case 'wait':
      return await waitForCondition(message.condition, message.timeout)
    
    case 'evaluate':
      return await evaluateScript(message.script)
    
    case 'getComputedStyle':
      return await getComputedStyle(message.selector)
    
    case 'isVisible':
      return await isElementVisible(message.selector)
    
    default:
      throw new Error(`Unknown action: ${message.action}`)
  }
}

// DOM State Extraction
async function getDOMState() {
  const state = {
    url: window.location.href,
    title: document.title,
    visibleElements: extractVisibleElements(),
    forms: extractForms(),
    canvasElements: extractCanvasElements()
  }
  return {success: true, state}
}

function extractVisibleElements() {
  const selectors = [
    'button', 
    '[role="button"]',
    'input',
    'textarea',
    'select',
    'a[href]',
    '[onclick]'
  ]
  
  const elements = []
  for (const selector of selectors) {
    const nodes = document.querySelectorAll(selector)
    for (const node of nodes) {
      if (isVisible(node)) {
        elements.push({
          tag: node.tagName.toLowerCase(),
          selector: getUniqueSelector(node),
          text: node.textContent?.trim().substring(0, 100) || '',
          attributes: getRelevantAttributes(node),
          bbox: node.getBoundingClientRect()
        })
      }
    }
  }
  return elements
}

// Element Interaction
async function clickElement(target) {
  try {
    let element
    
    if (typeof target === 'string') {
      // Selector
      element = document.querySelector(target)
      if (!element) throw new Error(`Element not found: ${target}`)
    } else {
      // Coordinates
      element = document.elementFromPoint(target.x, target.y)
      if (!element) throw new Error(`No element at coordinates: ${target.x}, ${target.y}`)
    }
    
    // Scroll into view
    element.scrollIntoView({behavior: 'smooth', block: 'center'})
    await sleep(500)
    
    // Click
    element.click()
    
    return {success: true}
  } catch (error) {
    return {success: false, error: error.message}
  }
}

async function typeText(selector, text, options = {}) {
  try {
    const element = document.querySelector(selector)
    if (!element) throw new Error(`Element not found: ${selector}`)
    
    // Focus
    element.focus()
    await sleep(100)
    
    // Clear if requested
    if (options.clearFirst) {
      element.value = ''
    }
    
    // Type with optional delay
    if (options.typeDelay) {
      for (const char of text) {
        element.value += char
        element.dispatchEvent(new Event('input', {bubbles: true}))
        await sleep(options.typeDelay)
      }
    } else {
      element.value = text
      element.dispatchEvent(new Event('input', {bubbles: true}))
    }
    
    // Trigger change event
    element.dispatchEvent(new Event('change', {bubbles: true}))
    
    return {success: true}
  } catch (error) {
    return {success: false, error: error.message}
  }
}

// Utility functions
function isVisible(element) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  )
}

function getUniqueSelector(element) {
  // Try id
  if (element.id) return `#${element.id}`
  
  // Try data-testid
  if (element.dataset.testid) return `[data-testid="${element.dataset.testid}"]`
  
  // Try unique class combination
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c)
    const selector = element.tagName.toLowerCase() + '.' + classes.join('.')
    if (document.querySelectorAll(selector).length === 1) {
      return selector
    }
  }
  
  // Fallback: nth-child
  let path = []
  while (element.parentElement) {
    const siblings = Array.from(element.parentElement.children)
    const index = siblings.indexOf(element) + 1
    path.unshift(`${element.tagName.toLowerCase()}:nth-child(${index})`)
    element = element.parentElement
  }
  return path.join(' > ')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

**Platform-Specific Content Script (content-scripts/canva.js):**

```javascript
// Canva-specific helpers
console.log('[BrowserAI] Canva content script loaded')

// Canva-specific DOM queries
function getCanvasElements() {
  return {
    canvas: document.querySelector('canvas[role="img"]'),
    toolbar: document.querySelector('[data-testid="toolbar"]'),
    sidebar: document.querySelector('[data-testid="sidebar"]')
  }
}

// Canva-specific actions
async function selectTextElement(index = 0) {
  const textElements = document.querySelectorAll('[data-text-element="true"]')
  if (textElements[index]) {
    textElements[index].click()
    return {success: true}
  }
  return {success: false, error: 'Text element not found'}
}

// Export platform-specific functions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.platform === 'canva') {
    handleCanvaMessage(message).then(sendResponse)
    return true
  }
})

async function handleCanvaMessage(message) {
  switch (message.customAction) {
    case 'selectTextElement':
      return await selectTextElement(message.index)
    case 'getCanvasElements':
      return {success: true, elements: getCanvasElements()}
    default:
      return {success: false, error: 'Unknown Canva action'}
  }
}
```

═══════════════════════════════════════════════════════════════════════
INTEGRATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

COMMUNICATION PATTERNS:

**Popup → Background:**
```javascript
// In popup
chrome.runtime.sendMessage({
  action: 'startJob',
  data: jobData
}, (response) => {
  if (response.success) {
    console.log('Job started:', response.jobId)
  }
})
```

**Background → Content Script:**
```javascript
// In background
chrome.tabs.sendMessage(tabId, {
  action: 'click',
  selector: '#button'
}, (response) => {
  console.log('Click result:', response)
})
```

**Content Script → Background:**
```javascript
// In content script
chrome.runtime.sendMessage({
  action: 'updateTaskStatus',
  taskId: '123',
  status: 'completed'
})
```

LIFECYCLE MANAGEMENT:
- Service worker may be terminated: Persist all state
- Content scripts reinjected on page load: Re-establish communication
- Use long-lived connections (chrome.runtime.connect) for persistent communication

ERROR HANDLING:
- Handle disconnected ports gracefully
- Retry failed message passing
- Log all errors for debugging

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

CREATE:
1. manifest.json - Extension manifest
2. background.js - Service worker
3. content-scripts/generic.js - Generic DOM script
4. content-scripts/canva.js - Canva-specific script
5. content-scripts/figma.js - Figma-specific script

REQUIREMENTS:
- Manifest V3 compliant
- Proper permission declarations
- Service worker lifecycle handling
- Content script injection
- Message passing infrastructure
- Error handling and logging
- State persistence

VALIDATION:
- Extension loads in Chrome
- Service worker activates
- Content scripts inject correctly
- Message passing works
- Can access target websites
- Permissions are sufficient
```

---

## PROMPT 5.1: Desktop App with Electron (Windows/macOS/Linux)

```
PROJECT: BrowserAI Craft - Cross-Platform Desktop Application

ROLE: You are building an Electron-based desktop application that wraps the Chrome extension with native capabilities and works on Windows, macOS, and Linux.

CONTEXT FROM RESEARCH:
Reference PDF sections:
- Section 4.2: Desktop integration patterns
- Section 8.1: Cross-platform deployment

WHY ELECTRON:
- Cross-platform: Single codebase for all OS
- Native integrations: File system, system tray, notifications
- Embedded browser: Control Chromium instance
- MCP server lifecycle: Start/stop LM Studio, Ollama processes

═══════════════════════════════════════════════════════════════════════
COMPONENT 1: Electron Main Process (main.js)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Main Electron process that manages windows, native integrations, and MCP servers.

```javascript
const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

// Global references
let mainWindow
let tray
let mcpServers = {}

// App lifecycle
app.on('ready', async () => {
  await createMainWindow()
  await createSystemTray()
  await startMCPServers()
  await loadExtension()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await stopMCPServers()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

// Main window
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'BrowserAI Craft',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true  // For embedded browser
    }
  })
  
  // Load UI
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile('dist/index.html')
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// System tray
async function createSystemTray() {
  tray = new Tray(path.join(__dirname, 'assets/tray-icon.png'))
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show BrowserAI Craft', click: () => mainWindow.show() },
    { label: 'Start Job', click: () => mainWindow.webContents.send('tray-start-job') },
    { type: 'separator' },
    { 
      label: 'LM Studio',
      submenu: [
        { label: 'Start', click: () => startLMStudio() },
        { label: 'Stop', click: () => stopLMStudio() },
        { label: 'Status', click: () => checkLMStudioStatus() }
      ]
    },
    { 
      label: 'Ollama',
      submenu: [
        { label: 'Start', click: () => startOllama() },
        { label: 'Stop', click: () => stopOllama() },
        { label: 'Status', click: () => checkOllamaStatus() }
      ]
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  
  tray.setContextMenu(contextMenu)
  tray.setToolTip('BrowserAI Craft')
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
}

// MCP Server Management
async function startMCPServers() {
  // Try to start LM Studio (if installed)
  try {
    await startLMStudio()
  } catch (error) {
    console.log('LM Studio not available:', error.message)
  }
  
  // Try to start Ollama (if installed)
  try {
    await startOllama()
  } catch (error) {
    console.log('Ollama not available:', error.message)
  }
}

async function stopMCPServers() {
  if (mcpServers.lmstudio) {
    mcpServers.lmstudio.kill()
  }
  if (mcpServers.ollama) {
    mcpServers.ollama.kill()
  }
}

// LM Studio Integration
async function startLMStudio() {
  const lmstudioPath = getLMStudioPath()
  if (!lmstudioPath) {
    throw new Error('LM Studio not installed')
  }
  
  // Start LM Studio process
  mcpServers.lmstudio = spawn(lmstudioPath, ['--server'], {
    detached: true
  })
  
  mcpServers.lmstudio.stdout.on('data', (data) => {
    console.log('[LM Studio]', data.toString())
    mainWindow.webContents.send('lmstudio-log', data.toString())
  })
  
  mcpServers.lmstudio.stderr.on('data', (data) => {
    console.error('[LM Studio Error]', data.toString())
  })
  
  // Wait for server to be ready
  await waitForServer('http://localhost:1234', 30000)
  
  mainWindow.webContents.send('lmstudio-status', {running: true})
}

async function stopLMStudio() {
  if (mcpServers.lmstudio) {
    mcpServers.lmstudio.kill()
    mcpServers.lmstudio = null
    mainWindow.webContents.send('lmstudio-status', {running: false})
  }
}

function getLMStudioPath() {
  const possiblePaths = {
    win32: [
      path.join(process.env.LOCALAPPDATA, 'LM Studio', 'lmstudio.exe'),
      'C:\\Program Files\\LM Studio\\lmstudio.exe'
    ],
    darwin: [
      '/Applications/LM Studio.app/Contents/MacOS/LM Studio',
      path.join(process.env.HOME, 'Applications/LM Studio.app/Contents/MacOS/LM Studio')
    ],
    linux: [
      '/usr/bin/lmstudio',
      '/usr/local/bin/lmstudio',
      path.join(process.env.HOME, '.local/bin/lmstudio')
    ]
  }
  
  const paths = possiblePaths[process.platform] || []
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// Ollama Integration
async function startOllama() {
  const ollamaPath = getOllamaPath()
  if (!ollamaPath) {
    throw new Error('Ollama not installed')
  }
  
  mcpServers.ollama = spawn(ollamaPath, ['serve'], {
    detached: true
  })
  
  mcpServers.ollama.stdout.on('data', (data) => {
    console.log('[Ollama]', data.toString())
    mainWindow.webContents.send('ollama-log', data.toString())
  })
  
  await waitForServer('http://localhost:11434', 30000)
  
  mainWindow.webContents.send('ollama-status', {running: true})
}

async function stopOllama() {
  if (mcpServers.ollama) {
    mcpServers.ollama.kill()
    mcpServers.ollama = null
    mainWindow.webContents.send('ollama-status', {running: false})
  }
}

function getOllamaPath() {
  const possiblePaths = {
    win32: [
      path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe'),
      'C:\\Program Files\\Ollama\\ollama.exe'
    ],
    darwin: [
      '/usr/local/bin/ollama',
      path.join(process.env.HOME, '.ollama/ollama')
    ],
    linux: [
      '/usr/bin/ollama',
      '/usr/local/bin/ollama'
    ]
  }
  
  const paths = possiblePaths[process.platform] || []
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// Utility: Wait for server to be ready
async function waitForServer(url, timeout) {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok) return true
    } catch (error) {
      // Server not ready yet
    }
    await sleep(1000)
  }
  
  throw new Error(`Server at ${url} failed to start within ${timeout}ms`)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Chrome Extension Loading
async function loadExtension() {
  const extensionPath = path.join(__dirname, 'extension')
  
  try {
    // Load unpacked extension
    await mainWindow.webContents.session.loadExtension(extensionPath, {
      allowFileAccess: true
    })
    console.log('Extension loaded successfully')
  } catch (error) {
    console.error('Failed to load extension:', error)
    dialog.showErrorBox('Extension Error', `Failed to load extension: ${error.message}`)
  }
}

// IPC Handlers
ipcMain.handle('start-lmstudio', async () => {
  try {
    await startLMStudio()
    return {success: true}
  } catch (error) {
    return {success: false, error: error.message}
  }
})

ipcMain.handle('stop-lmstudio', async () => {
  await stopLMStudio()
  return {success: true}
})

ipcMain.handle('start-ollama', async () => {
  try {
    await startOllama()
    return {success: true}
  } catch (error) {
    return {success: false, error: error.message}
  }
})

ipcMain.handle('stop-ollama', async () => {
  await stopOllama()
  return {success: true}
})

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (result.canceled) return null
  
  const filePath = result.filePaths[0]
  const content = fs.readFileSync(filePath, 'utf-8')
  
  return { path: filePath, content }
})

ipcMain.handle('save-file', async (event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: data.filename,
    filters: data.filters
  })
  
  if (result.canceled) return null
  
  fs.writeFileSync(result.filePath, data.content)
  return result.filePath
})

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData')
})
```

═══════════════════════════════════════════════════════════════════════
COMPONENT 2: Preload Script (preload.js)
═══════════════════════════════════════════════════════════════════════

PURPOSE:
Secure bridge between renderer and main process.

```javascript
const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // LM Studio controls
  startLMStudio: () => ipcRenderer.invoke('start-lmstudio'),
  stopLMStudio: () => ipcRenderer.invoke('stop-lmstudio'),
  
  // Ollama controls
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  stopOllama: () => ipcRenderer.invoke('stop-ollama'),
  
  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  
  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Event listeners
  onLMStudioStatus: (callback) => {
    ipcRenderer.on('lmstudio-status', (event, data) => callback(data))
  },
  onOllamaStatus: (callback) => {
    ipcRenderer.on('ollama-status', (event, data) => callback(data))
  },
  onTrayStartJob: (callback) => {
    ipcRenderer.on('tray-start-job', callback)
  }
})
```

═══════════════════════════════════════════════════════════════════════
INTEGRATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

PACKAGING:
Use electron-builder for packaging:
```json
{
  "build": {
    "appId": "com.browserai.craft",
    "productName": "BrowserAI Craft",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "extension/**/*",
      "assets/**/*",
      "dist/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"],
      "icon": "assets/icon.icns"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Utility",
      "icon": "assets/icon.png"
    }
  }
}
```

AUTO-UPDATES:
Implement auto-update using electron-updater:
- Check for updates on app start
- Download in background
- Prompt user to install
- Restart to apply

═══════════════════════════════════════════════════════════════════════
OUTPUT DELIVERABLES
═══════════════════════════════════════════════════════════════════════

CREATE:
1. main.js - Electron main process
2. preload.js - Preload script
3. package.json - Dependencies and build config
4. Build scripts for Windows/macOS/Linux

REQUIREMENTS:
- Cross-platform compatibility
- MCP server lifecycle management
- System tray integration
- Native file dialogs
- Auto-update capability
- Extension loading
- Secure IPC communication

VALIDATION:
- Builds on all platforms
- LM Studio starts/stops correctly
- Ollama starts/stops correctly
- Extension loads and functions
- File operations work
- System tray functional
- Auto-update works
```

---

**END OF ALL PROMPTS (Phase 1-5)**

All prompts are now complete! These provide comprehensive, implementation-ready specifications covering:
- **Phase 1**: Core framework (orchestration, vision, browser, state)
- **Phase 2**: Integrations (adapters, LLM providers)
- **Phase 3**: Data sources (CSV, Google Sheets)
- **Phase 4**: Extension architecture
- **Phase 5**: Desktop app (Electron)

Would you like me to create any additional documentation or implementation guides?