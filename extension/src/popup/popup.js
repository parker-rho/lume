let enabled = true;

document.addEventListener('DOMContentLoaded', () => {

  function detectColorScheme() {
    chrome.storage.local.get("storageData", (result) => {
      let uiTheme = "light";
      let storageTheme = result.storageData?.uiTheme;

      if(storageTheme){
        uiTheme = storageTheme;
      } else if(!window.matchMedia) {
        uiTheme = "light";
      } else if(window.matchMedia("(prefers-color-scheme: dark)").matches) {
        uiTheme = "dark";
      }

      document.documentElement.setAttribute("data-theme", uiTheme);
    });
  }

  detectColorScheme();

  const checkbox = document.getElementById("toggle-extension");
  const statusText = document.getElementById("status-text");

  chrome.storage.onChanged.addListener((changes) => {
    if (Object.hasOwn(changes, 'enabled')) {
      enabled = !!changes.enabled.newValue;
      checkbox.checked = enabled;
      statusText.textContent = enabled ? "On" : "Off";
    }
  });

  // Restore the switch state from storage
  chrome.storage.local.get("enabled", (result) => {
    if (result.enabled === undefined) {
      result.enabled = true;
    }
    checkbox.checked = !!result.enabled;
    statusText.textContent = !!result.enabled ? "On" : "Off";
  });

  // Listen for changes to the switch
  checkbox.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement) {
      chrome.storage.local.set({enabled: !!event.target.checked});
    }
  });

  // Open options page
  document.getElementById("options-button").addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  });

  // ========== SPEECH-TO-TEXT FUNCTIONALITY ==========
  
  const micButton = document.getElementById('mic-button');
  const micText = micButton.querySelector('.mic-text');
  const statusMessage = document.getElementById('status-message');
  const transcriptionResult = document.getElementById('transcription-result');

  let isRecording = false;

  // Setup speech service callbacks
  speechService.onStateChange((stateData) => {
    updateUI(stateData.state, stateData.message);
  });

  // Microphone button click handler
  micButton.addEventListener('click', async () => {
    if (isRecording) {
      // Stop recording manually if clicked again
      speechService.stopRecording();
      return;
    }

    // Check if API key is configured
    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (!apiKey) {
      statusMessage.textContent = 'Please set your OpenAI API key in Options';
      statusMessage.classList.add('error');
      setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.classList.remove('error');
      }, 3000);
      return;
    }

    // Start recording
    const result = await speechService.startRecording();
    if (!result.success) {
      statusMessage.textContent = result.error;
      statusMessage.classList.add('error');
    }
  });

  /**
   * Update UI based on recording state
   */
  function updateUI(state, message) {
    // Reset classes
    micButton.classList.remove('recording', 'processing');
    statusMessage.classList.remove('error');
    transcriptionResult.classList.add('hidden');

    switch (state) {
      case 'recording':
        isRecording = true;
        micButton.classList.add('recording');
        micButton.disabled = false;
        micText.textContent = 'Listening...';
        statusMessage.textContent = message || 'Speak now...';
        break;

      case 'processing':
        isRecording = false;
        micButton.classList.add('processing');
        micButton.disabled = true;
        micText.textContent = 'Processing...';
        statusMessage.textContent = message || 'Processing your speech...';
        break;

      case 'completed':
        isRecording = false;
        micButton.disabled = false;
        micText.textContent = 'Tap to Speak';
        statusMessage.textContent = 'Done!';
        
        // Show transcription result
        transcriptionResult.innerHTML = `<strong>You said:</strong>${message}`;
        transcriptionResult.classList.remove('hidden');
        
        // Clear status after 2 seconds
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 2000);
        break;

      case 'error':
        isRecording = false;
        micButton.disabled = false;
        micText.textContent = 'Tap to Speak';
        statusMessage.textContent = message || 'Error occurred';
        statusMessage.classList.add('error');
        
        // Clear error after 4 seconds
        setTimeout(() => {
          statusMessage.textContent = '';
          statusMessage.classList.remove('error');
        }, 4000);
        break;

      default:
        isRecording = false;
        micButton.disabled = false;
        micText.textContent = 'Tap to Speak';
    }
  }
});