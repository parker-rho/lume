# Complete Step-by-Step Flow Guide

## Overview

Your system now has a **complete agent workflow** that guides users through tasks step-by-step with automatic click detection.

## How It Works

### 1. User Speaks

User clicks the voice button and says: *"How do I unmute myself on Zoom?"*

### 2. Speech-to-Text

The speech is transcribed using OpenAI Whisper API.

### 3. Agent 1: Generate Instructions

**popup.js** → **Flask `/parse`** → **make_instructions.py**

- Takes: User's question + Annotated HTML from page
- Searches web for instructions
- Returns: Step-by-step guide (e.g., 6 steps)
- Saves to: `dedalus.json`

### 4. Agent 2: Step-by-Step Guidance

For each step (starting at step 0):

#### A. Select Element

**popup.js** → **Flask `/select-element`** → **select_elements.py**

- Takes: Current step index + Annotated HTML
- Returns: Which element to click (or null if informational)
- Saves: Selected element to `dedalus.json`

#### B. Show Message

- 600ms delay (natural lag)
- Display step text in chat bubble
- Example: *"1. Click the microphone button to unmute yourself"*

#### C. If Element Exists → Wait for Click

1. **Highlight element** on page (green outline)
2. **Setup click listener** via content-script.js
3. **Start 30-second timeout**

**Two outcomes:**

**✅ User Clicks Element**
- Remove highlight
- Clear timeout
- Progress to next step (step index++)
- Repeat from Step 4A with new step

**⏰ User Doesn't Click (after 30s)**
- **Keep highlight active** (don't remove)
- Show reminder message: *"I noticed you haven't clicked yet. Take your time..."*
- **Restart 30-second timer** (continue waiting)
- Repeat reminder every 30s until user clicks

#### D. If Element is NULL → Auto-Progress

- 1500ms delay
- Automatically progress to next step (step index++)
- Repeat from Step 4A

### 5. All Steps Completed

When `result.completed === true`:
- Show success message: *"Great! All steps completed! 🎉"*
- Return to idle state

## File Structure

```
extension/
├── src/
│   ├── popup/
│   │   └── popup.js          # Main controller with agent flow
│   └── scripts/
│       ├── annotator.js       # Creates annotated HTML
│       ├── content-script.js  # Page interaction & click detection
│       ├── speech-service.js  # Speech-to-text
│       └── background.js      # Background service
└── manifest.json              # Extension config

dedalus/
├── server.py                  # Flask API server
├── make_instructions.py       # Agent 1: Generate instructions
├── select_elements.py         # Agent 2: Select elements
└── dedalus.json              # Stores instructions + selected elements
```

## Key Features

### Natural Delays Between Messages

```javascript
await this.delay(600);  // Before showing step
await this.delay(1500); // Before auto-progressing (null element)
await this.delay(800);  // Before completion message
```

### Click Detection

Content script listens for clicks on highlighted elements:

```javascript
// Setup listener
chrome.tabs.sendMessage(tabId, {
  type: 'SETUP_CLICK_LISTENER',
  elementId: 'ai-42'
});

// Detect click
document.addEventListener('click', (event) => {
  if (event.target.matches('[data-id="ai-42"]')) {
    chrome.runtime.sendMessage({ type: 'ELEMENT_CLICKED' });
  }
}, true);
```

### Timeout & Reminders

If user doesn't click within 30 seconds:

```javascript
this.clickTimeout = setTimeout(() => {
  // DON'T remove highlight - keep it active
  
  // Show reminder message
  this.addChatMessage("I noticed you haven't clicked yet. Take your time - the element is still highlighted.", 'bot');
  
  // Restart the timer - keep waiting for click
  if (this.currentSelectedElement && this.isProcessingSteps) {
    this.clickTimeout = setTimeout(() => {
      this.handleClickTimeout(annotatedHTML);
    }, this.CLICK_TIMEOUT_DURATION);
  }
}, 30000);
```

## Message Flow Example

**User**: "How do I unmute on Zoom?"

**Bot** (600ms delay): "1. Find the microphone icon at the bottom of the Zoom window"  
→ No element to click, auto-progresses after 1500ms

**Bot** (600ms delay): "2. Click the microphone icon to unmute yourself"  
→ Highlights microphone button, waits for click

*(30 seconds pass without clicking)*

**Bot**: "I noticed you haven't clicked yet. Take your time - the element is still highlighted."  
→ Keeps highlight, restarts 30s timer

*User clicks button* ✓

**Bot** (600ms delay): "3. You should now see the icon without a red slash"  
→ No element to click, auto-progresses after 1500ms

**Bot** (800ms delay): "Great! All steps completed! 🎉"

## Testing

### 1. Start Flask Server

```bash
cd /Users/sennet/HackPrinceton/old-people/dedalus
source ../venv/bin/activate
PORT=5001 python3 server.py
```

### 2. Load Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `/Users/sennet/HackPrinceton/old-people/extension`

### 3. Test the Flow

1. Navigate to any webpage (e.g., gmail.com)
2. Click the extension icon
3. Click "Tap to ask"
4. Say: "How do I compose an email?"
5. Watch the step-by-step guidance unfold!

## API Endpoints Used

```
POST /parse
- Input: { message, context }
- Output: { status, result }
- Agent: 1 (make_instructions)

POST /select-element
- Input: { annotated_html, step_index, instructions_file }
- Output: { status, result: { step_number, step_text, selected_element, completed } }
- Agent: 2 (select_elements)

GET /selected-elements-history
- Output: { status, count, history }
- Returns: All saved selected elements
```

## State Management

```javascript
// Tracked in popup.js
this.currentStepIndex = 0;           // Current step being processed
this.totalSteps = 0;                 // Total number of steps
this.isProcessingSteps = false;      // Whether actively guiding
this.currentSelectedElement = null;  // Element user should click
this.lastUserTranscript = null;      // For re-prompting
this.clickTimeout = null;            // 30s timeout handle
```

## Customization

### Change Click Timeout

```javascript
this.CLICK_TIMEOUT_DURATION = 30000; // 30 seconds (in milliseconds)
```

### Adjust Message Delays

```javascript
await this.delay(600);  // Step message delay
await this.delay(1500); // Auto-progress delay
await this.delay(800);  // Completion delay
```

### Highlight Styling

In `content-script.js`:

```javascript
targetElement.style.outline = '3px solid #4CAF50';
targetElement.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
```

## Troubleshooting

### Element not highlighting?

- Check if `annotator.js` is loaded: Open DevTools → Console → Type `DOMAnnotator`
- Verify element has `data-id` attribute
- Check content script loaded: `chrome://extensions` → Details → Inspect views

### Click not detected?

- Ensure click listener is set up (check console logs)
- Verify element ID matches
- Try clicking directly on element (not parent/child)

### Steps not progressing?

- Check Flask server is running on port 5001
- Verify `dedalus.json` has instructions
- Check browser console for errors

## Architecture Diagram

```
User Speech
    ↓
Speech-to-Text (Whisper API)
    ↓
[Agent 1: make_instructions]
    - Input: Question + Annotated HTML
    - Output: Step-by-step instructions
    - Saves to: dedalus.json
    ↓
[Agent 2: select_elements] ← Loop starts here
    - Input: Step index + Annotated HTML
    - Output: Selected element (or null)
    - Saves to: dedalus.json
    ↓
Show Step Message (600ms delay)
    ↓
Element exists? → YES → Highlight + Wait for click
                    ↓
                  Clicked? → YES → Next step (loop back)
                    ↓
                   NO (30s timeout)
                    ↓
                  Show reminder + restart timer
                  (keep waiting for click)
                ↓ NO
              Auto-progress (1500ms delay)
              Next step (loop back)
    ↓
All steps done? → Show completion message
```

Your complete agent system is ready! 🚀

