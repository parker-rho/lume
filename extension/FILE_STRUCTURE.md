# Extension File Structure

## Content Scripts (Run on every webpage)

### 1. `src/scripts/annotator.js`
- **Purpose**: Creates annotated HTML from page elements
- **Function**: `DOMAnnotator.createAnnotatedHtml(document)`
- **Output**: Array of `{ id, tag, text }` objects
- **Used by**: Agent 2 to understand page structure

### 2. `src/scripts/content_script.js` 
- **Purpose**: Injects floating "Tap to ask" widget at bottom-right of page
- **What it does**:
  - Creates the voice button UI
  - Loads popup.css, popup.js, speech-service.js, waveform.js
  - Makes the widget appear on every webpage
- **Result**: Floating widget visible on all pages

### 3. `src/scripts/page-interaction.js` (NEW - Agent 2 Handler)
- **Purpose**: Handles Agent 2's page interactions
- **Functions**:
  - `GET_ANNOTATED_HTML` - Returns annotated elements
  - `HIGHLIGHT_ELEMENT` - Highlights element with green outline
  - `REMOVE_HIGHLIGHT` - Removes highlight
  - `SETUP_CLICK_LISTENER` - Detects when user clicks highlighted element
- **Used by**: popup.js to guide users step-by-step

## Popup Scripts (Run in the floating widget)

### `src/popup/popup.js`
- **Purpose**: Main controller for the widget
- **Manages**:
  - Voice button states (idle, listening, thinking, responding)
  - Chat bubbles (user and bot messages)
  - Agent 1 & Agent 2 coordination
  - Step-by-step guidance flow
- **Communicates with**: page-interaction.js, Flask server

### `src/popup/waveform.js`
- **Purpose**: Visualizes audio waveform while listening
- **Shows**: Animated waveform inside voice button

### `src/scripts/speech-service.js`
- **Purpose**: Handles speech-to-text using OpenAI Whisper API
- **Features**:
  - Records audio
  - Silence detection (auto-stop after 2s silence)
  - Transcribes via Whisper API

## Background Script

### `src/scripts/background.js`
- **Purpose**: Background service worker
- **Current**: Minimal functionality (extension lifecycle)
- **Future**: Could handle long-running tasks

## Load Order

```
1. annotator.js          (DOMAnnotator class)
2. content_script.js     (Injects widget → loads popup scripts)
3. page-interaction.js   (Agent 2 message handlers)
   ↓
   Widget loads:
   - popup.css
   - speech-service.js
   - waveform.js  
   - popup.js
```

## Communication Flow

```
User clicks "Tap to ask"
    ↓
popup.js → speech-service.js → Records audio → Whisper API
    ↓
Transcription complete
    ↓
popup.js → Flask /parse (Agent 1) → Generate instructions
    ↓
popup.js → page-interaction.js → GET_ANNOTATED_HTML
    ↓
popup.js → Flask /select-element (Agent 2) → Select element
    ↓
popup.js → page-interaction.js → HIGHLIGHT_ELEMENT
    ↓
popup.js → page-interaction.js → SETUP_CLICK_LISTENER
    ↓
User clicks highlighted element
    ↓
page-interaction.js → popup.js → ELEMENT_CLICKED
    ↓
popup.js → Next step (repeat)
```

## Key Files Summary

| File | Purpose | Role |
|------|---------|------|
| `annotator.js` | Create page element list | Data collection |
| `content_script.js` | Inject floating widget | UI injection |
| `page-interaction.js` | Agent 2 interactions | Highlighting & clicks |
| `popup.js` | Main controller | Orchestration |
| `speech-service.js` | Voice input | Speech-to-text |
| `waveform.js` | Audio visualization | UI feedback |

## Naming Conventions

- **content_script.js** (underscore) = Widget injection
- **page-interaction.js** (dash) = Agent 2 handler
- **All other files** = Use dashes (e.g., speech-service.js)

This keeps the old widget injection file distinct from the new Agent 2 functionality!

