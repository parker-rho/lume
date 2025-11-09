# Dedalus Agent System - Usage Guide

## Overview

This system has **two AI agents** that work together:

1. **`make_instructions.py`** - Generates step-by-step instructions for elderly users
2. **`select_elements.py`** - Identifies which webpage elements to interact with for each step

## Complete Workflow

### Step 1: User asks a question

User says: *"My mute button has a red slash through it"*

### Step 2: Generate Instructions

**Endpoint:** `POST /parse`

```bash
curl -X POST http://127.0.0.1:5000/parse \
  -H "Content-Type: application/json" \
  -d '{"message": "My mute button has a red slash through it"}'
```

**Response:**
```json
{
  "status": "success",
  "result": "Step-by-step instructions for understanding and fixing the mute button with a red slash through it:\n\n1. Look at the microphone or speaker icon on your device's screen.\n2. If you see a red slash through the microphone or speaker, it means your sound or microphone is muted.\n3. To unmute, find the mute button on your device or remote control.\n4. Press the mute button once to turn the sound back on.\n..."
}
```

The instructions are automatically saved to `dedalus.json`.

### Step 3: Annotate the Webpage

In your Chrome extension, use `DOMAnnotator.js` to create a payload:

```javascript
// In your extension's content script
const annotatedHTML = DOMAnnotator.createPayloadForAI(document);
console.log(annotatedHTML);
```

**Output:**
```json
[
  { "id": "ai-1", "tag": "button", "text": "Mute" },
  { "id": "ai-2", "tag": "button", "text": "Unmute" },
  { "id": "ai-3", "tag": "a", "text": "Settings" },
  { "id": "ai-4", "tag": "div", "text": "Volume Control" }
]
```

### Step 4: Get Element for Current Step

**Endpoint:** `POST /select-element`

```bash
curl -X POST http://127.0.0.1:5000/select-element \
  -H "Content-Type: application/json" \
  -d '{
    "annotated_html": [
      {"id": "ai-1", "tag": "button", "text": "Mute"},
      {"id": "ai-2", "tag": "button", "text": "Unmute"},
      {"id": "ai-3", "tag": "a", "text": "Settings"}
    ],
    "step_index": 2
  }'
```

**Response:**
```json
{
  "status": "success",
  "result": {
    "step_number": 3,
    "total_steps": 9,
    "step_text": "3. To unmute, find the mute button on your device or remote control.",
    "selected_element": {
      "id": "ai-2",
      "tag": "button",
      "text": "Unmute"
    },
    "completed": false
  }
}
```

### Step 5: Highlight and Click Element

In your extension:

```javascript
// Get the selected element
const response = await fetch('http://127.0.0.1:5000/select-element', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    annotated_html: annotatedHTML,
    step_index: currentStep
  })
});

const data = await response.json();
const elementToClick = data.result.selected_element;

if (elementToClick) {
  // Use DOMAnnotator to find and highlight
  DOMAnnotator.findAndHighlight(JSON.stringify(elementToClick), document);
  
  // Optionally auto-click after highlighting
  const element = document.querySelector(`[data-ai-id="${elementToClick.id}"]`);
  element?.click();
}
```

### Step 6: Process Next Step

Increment `step_index` and repeat Step 4-5 until all steps are completed.

## API Endpoints

### 1. `/parse` - Generate Instructions

**Request:**
```json
{
  "message": "User's question or problem"
}
```

**Response:**
```json
{
  "status": "success",
  "result": "Generated step-by-step instructions..."
}
```

### 2. `/select-element` - Get Element for One Step

**Request:**
```json
{
  "annotated_html": [...],  // Array from DOMAnnotator
  "step_index": 0,           // Which step (0-indexed)
  "instructions_file": "dedalus/dedalus.json"  // Optional
}
```

**Response:**
```json
{
  "status": "success",
  "result": {
    "step_number": 1,
    "total_steps": 9,
    "step_text": "1. Look at the microphone icon...",
    "selected_element": { "id": "ai-5", "tag": "button", "text": "Microphone" },
    "completed": false
  }
}
```

If step is informational (no clicking needed):
```json
{
  "step_number": 1,
  "step_text": "1. Look at the microphone icon...",
  "selected_element": null,  // No interaction needed
  "completed": false
}
```

When all steps done:
```json
{
  "completed": true,
  "total_steps": 9,
  "message": "All steps completed!"
}
```

### 3. `/select-all-elements` - Process All Steps at Once

**Request:**
```json
{
  "annotated_html": [...],
  "instructions_file": "dedalus/dedalus.json"  // Optional
}
```

**Response:**
```json
{
  "status": "success",
  "results": [
    {
      "step_number": 1,
      "step_text": "1. Look at the microphone icon...",
      "selected_element": null
    },
    {
      "step_number": 2,
      "step_text": "2. Click the microphone to unmute...",
      "selected_element": { "id": "ai-2", "tag": "button", "text": "Unmute" }
    }
  ]
}
```

## Chrome Extension Integration

### Complete Flow in Extension

```javascript
// 1. User speaks/types their problem
const userProblem = "My mute button has a red slash";

// 2. Generate instructions
const instructionsResponse = await fetch('http://127.0.0.1:5000/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userProblem })
});

// 3. Annotate current page
const annotatedHTML = DOMAnnotator.createPayloadForAI(document);

// 4. Process step-by-step
let currentStep = 0;
let completed = false;

while (!completed) {
  const response = await fetch('http://127.0.0.1:5000/select-element', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      annotated_html: annotatedHTML,
      step_index: currentStep
    })
  });
  
  const data = await response.json();
  const result = data.result;
  
  if (result.completed) {
    console.log('All steps completed!');
    break;
  }
  
  // Show step to user
  showStepToUser(result.step_text);
  
  // Highlight element if one was selected
  if (result.selected_element) {
    DOMAnnotator.findAndHighlight(
      JSON.stringify(result.selected_element),
      document
    );
    
    // Wait for user confirmation before next step
    await waitForUserConfirmation();
  }
  
  currentStep++;
}
```

## Testing Locally

1. **Start Flask server:**
```bash
cd /Users/sennet/HackPrinceton/old-people
source venv/bin/activate
python dedalus/server.py
```

2. **Generate instructions:**
```bash
curl -X POST http://127.0.0.1:5000/parse \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I unmute myself?"}'
```

3. **Select element for step 0:**
```bash
curl -X POST http://127.0.0.1:5000/select-element \
  -H "Content-Type: application/json" \
  -d @test_payload.json
```

Where `test_payload.json` contains:
```json
{
  "annotated_html": [
    {"id": "ai-1", "tag": "button", "text": "Mute"},
    {"id": "ai-2", "tag": "button", "text": "Unmute"}
  ],
  "step_index": 0
}
```

## File Structure

```
dedalus/
├── server.py              # Flask API server
├── make_instructions.py   # Agent 1: Generate instructions
├── select_elements.py     # Agent 2: Select elements
├── dedalus.json          # Stores instructions + history
└── USAGE_EXAMPLE.md      # This file
```

## Notes

- The system automatically saves instructions to `dedalus.json`
- `select_elements.py` intelligently determines if a step requires interaction
- If a step is informational only, `selected_element` will be `null`
- The AI matches elements based on semantic meaning, not exact text matching

