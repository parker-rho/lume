# Selected Elements Storage

## Overview

The system now **automatically saves** which element was selected for each step to `dedalus.json`.

## What Gets Saved

Every time you call `/select-element`, it saves:

```json
{
  "step_number": 1,
  "step_text": "1. Click the microphone icon to unmute...",
  "selected_element": {
    "id": "ai-2",
    "tag": "button",
    "text": "Unmute"
  },
  "timestamp": "2025-11-09T15:30:45.123456"
}
```

## Example `dedalus.json` After Running Steps

```json
{
  "message": "My mute button has a red slash",
  "instructions": [
    "Steps to fix the mute button..."
  ],
  "selected_elements": [
    {
      "step_number": 1,
      "step_text": "1. Identify the Device or Program...",
      "selected_element": null,
      "timestamp": "2025-11-09T15:30:45.123456"
    },
    {
      "step_number": 2,
      "step_text": "2. Understanding the Red Slash...",
      "selected_element": null,
      "timestamp": "2025-11-09T15:30:46.789012"
    },
    {
      "step_number": 3,
      "step_text": "3. Click the microphone icon to unmute...",
      "selected_element": {
        "id": "ai-2",
        "tag": "button",
        "text": "Unmute"
      },
      "timestamp": "2025-11-09T15:30:47.345678"
    }
  ]
}
```

## New API Endpoint

### Get Selected Elements History

Retrieve all stored selected elements:

```bash
curl http://127.0.0.1:5001/selected-elements-history
```

**Response:**
```json
{
  "status": "success",
  "count": 3,
  "history": [
    {
      "step_number": 1,
      "step_text": "1. Identify the Device...",
      "selected_element": null,
      "timestamp": "2025-11-09T15:30:45.123456"
    },
    {
      "step_number": 3,
      "step_text": "3. Click the microphone...",
      "selected_element": {
        "id": "ai-2",
        "tag": "button",
        "text": "Unmute"
      },
      "timestamp": "2025-11-09T15:30:47.345678"
    }
  ]
}
```

## Usage Example

```bash
# 1. Generate instructions
curl -X POST http://127.0.0.1:5001/parse \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I unmute?"}'

# 2. Select element for step 0 (automatically saves)
curl -X POST http://127.0.0.1:5001/select-element \
  -H "Content-Type: application/json" \
  -d @test_select.json

# 3. Select element for step 1 (automatically saves)
curl -X POST http://127.0.0.1:5001/select-element \
  -H "Content-Type: application/json" \
  -d '{
    "annotated_html": [...],
    "step_index": 1
  }'

# 4. View all saved elements
curl http://127.0.0.1:5001/selected-elements-history
```

## Benefits

✅ **Debugging** - See which elements were selected for which steps  
✅ **Progress Tracking** - Know which steps have been completed  
✅ **Replay** - Recreate the user's journey through steps  
✅ **Analytics** - Track which UI elements are being used  
✅ **Resume** - Continue from where the user left off

## In Your Extension

```javascript
// Process a step and save automatically
const response = await fetch('http://127.0.0.1:5001/select-element', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    annotated_html: payload,
    step_index: currentStep
  })
});

// Element is now saved automatically!

// Later, retrieve the history
const historyResponse = await fetch('http://127.0.0.1:5001/selected-elements-history');
const history = await historyResponse.json();

console.log('User completed', history.count, 'steps');
```

## Auto-Update Behavior

- If you run the same step twice, it **updates** the saved element (doesn't duplicate)
- Each step is identified by `step_number`
- Timestamps track when each selection was made

