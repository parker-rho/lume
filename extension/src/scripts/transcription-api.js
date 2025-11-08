/**
 * Transcription API for AI Model Integration
 */

class TranscriptionAPI {
  /**
   * Get the most recent transcription
   * @returns {Promise<string>} Latest transcription text
   */
  static async getLatest() {
    const { lastTranscription } = await chrome.storage.local.get('lastTranscription');
    return lastTranscription || '';
  }

  /**
   * Get all transcriptions (conversation history)
   * @returns {Promise<Array<string>>} Array of text strings
   */
  static async getAll() {
    const { transcriptions = [] } = await chrome.storage.local.get('transcriptions');
    return transcriptions;
  }

  /**
   * Get conversation history as JSON string (ready for AI model)
   * @returns {Promise<string>} JSON string
   */
  static async getAllAsJSON() {
    const transcriptions = await this.getAll();
    return JSON.stringify(transcriptions, null, 2);
  }

  /**
   * Get conversation history formatted for AI prompt
   * @returns {Promise<string>} Formatted conversation string
   */
  static async getConversationHistory() {
    const transcriptions = await this.getAll();
    return transcriptions.map((text, index) => 
      `[${index + 1}] ${text}`
    ).join('\n');
  }

  /**
   * Get conversation count
   * @returns {Promise<number>} Number of stored transcriptions
   */
  static async getCount() {
    const transcriptions = await this.getAll();
    return transcriptions.length;
  }

  /**
   * Export all transcriptions to a downloadable JSON file
   */
  static async exportToFile() {
    const json = await this.getAllAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcriptions_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Clear all transcriptions
   */
  static async clear() {
    await chrome.storage.local.remove(['transcriptions', 'lastTranscription']);
  }

  /**
   * Listen for new transcriptions in real-time
   * @param {Function} callback - Called with new transcription object
   */
  static onNewTranscription(callback) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.lastTranscription) {
        callback(changes.lastTranscription.newValue);
      }
    });
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.TranscriptionAPI = TranscriptionAPI;
}

