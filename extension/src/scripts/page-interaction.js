/**
 * Page Interaction Handler - Agent 2 Functionality
 * Handles element highlighting, click detection, and HTML annotation for Agent 2
 */

(function() {
  'use strict';
  
  let currentHighlightedElement = null;
  let clickListener = null;
  
  // Listen for messages from popup/background via chrome.runtime
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'GET_ANNOTATED_HTML':
        handleGetAnnotatedHTML(sendResponse);
        return true; // Keep channel open for async response
        
      case 'HIGHLIGHT_ELEMENT':
        handleHighlightElement(message.element, sendResponse);
        return false;
        
      case 'REMOVE_HIGHLIGHT':
        handleRemoveHighlight(sendResponse);
        return false;
        
      case 'SETUP_CLICK_LISTENER':
        handleSetupClickListener(message.elementId, sendResponse);
        return false;
        
      default:
        return false;
    }
  });
  
  // Listen for messages from injected page scripts via window.postMessage
  window.addEventListener('message', async (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;
    
    if (event.data && event.data.type === 'FETCH_API_REQUEST') {
      await handleFetchAPIFromPage(event.data);
    } else if (event.data && event.data.type === 'GET_ANNOTATED_HTML_REQUEST') {
      handleGetAnnotatedHTMLFromPage(event.data);
    } else if (event.data && event.data.type === 'HIGHLIGHT_ELEMENT_REQUEST') {
      handleHighlightElementFromPage(event.data);
    } else if (event.data && event.data.type === 'REMOVE_HIGHLIGHT_REQUEST') {
      handleRemoveHighlightFromPage(event.data);
    } else if (event.data && event.data.type === 'SETUP_CLICK_LISTENER_REQUEST') {
      handleSetupClickListenerFromPage(event.data);
    }
  });
  
  /**
   * Proxy fetch requests from page context (content script has extension permissions)
   */
  async function handleFetchAPIFromPage(data) {
    const { requestId, url, method, headers, body } = data;
    
    try {
      const response = await fetch(url, {
        method: method || 'GET',
        headers: headers || {},
        body: body ? JSON.stringify(body) : undefined
      });
      
      const responseData = await response.json();
      
      // Send response back to page context
      window.postMessage({
        type: 'FETCH_API_RESPONSE',
        requestId,
        success: true,
        data: responseData,
        status: response.status
      }, '*');
      
    } catch (error) {
      console.error('Fetch proxy error:', error);
      
      // Send error back to page context
      window.postMessage({
        type: 'FETCH_API_RESPONSE',
        requestId,
        success: false,
        error: error.message
      }, '*');
    }
  }
  
  /**
   * Handle GET_ANNOTATED_HTML from page context
   */
  function handleGetAnnotatedHTMLFromPage(data) {
    const { requestId } = data;
    
    try {
      const annotatedHTML = typeof DOMAnnotator !== 'undefined' 
        ? DOMAnnotator.createAnnotatedHtml(document)
        : [];
      
      window.postMessage({
        type: 'GET_ANNOTATED_HTML_RESPONSE',
        requestId,
        annotatedHTML
      }, '*');
      
    } catch (error) {
      console.error('Error creating annotated HTML:', error);
      window.postMessage({
        type: 'GET_ANNOTATED_HTML_RESPONSE',
        requestId,
        annotatedHTML: []
      }, '*');
    }
  }
  
  /**
   * Handle HIGHLIGHT_ELEMENT from page context
   */
  function handleHighlightElementFromPage(data) {
    const { requestId, element } = data;
    handleHighlightElement(element, () => {});
    
    if (requestId) {
      window.postMessage({
        type: 'HIGHLIGHT_ELEMENT_RESPONSE',
        requestId,
        success: true
      }, '*');
    }
  }
  
  /**
   * Handle REMOVE_HIGHLIGHT from page context
   */
  function handleRemoveHighlightFromPage(data) {
    const { requestId } = data;
    removeHighlight();
    
    if (requestId) {
      window.postMessage({
        type: 'REMOVE_HIGHLIGHT_RESPONSE',
        requestId,
        success: true
      }, '*');
    }
  }
  
  /**
   * Handle SETUP_CLICK_LISTENER from page context
   */
  function handleSetupClickListenerFromPage(data) {
    const { requestId, elementId } = data;
    handleSetupClickListener(elementId, () => {});
    
    if (requestId) {
      window.postMessage({
        type: 'SETUP_CLICK_LISTENER_RESPONSE',
        requestId,
        success: true
      }, '*');
    }
  }
  
  /**
   * Get annotated HTML from current page using DOMAnnotator
   */
  function handleGetAnnotatedHTML(sendResponse) {
    try {
      // Check if DOMAnnotator is loaded
      if (typeof DOMAnnotator === 'undefined') {
        console.error('DOMAnnotator not loaded');
        sendResponse({ annotatedHTML: [] });
        return;
      }
      
      // Create annotated HTML
      const annotatedHTML = DOMAnnotator.createAnnotatedHtml(document);
      
      console.log('Annotated HTML created:', annotatedHTML.length, 'elements');
      sendResponse({ annotatedHTML });
      
    } catch (error) {
      console.error('Error creating annotated HTML:', error);
      sendResponse({ annotatedHTML: [] });
    }
  }
  
  /**
   * Highlight an element on the page
   */
  function handleHighlightElement(element, sendResponse) {
    try {
      // Remove any existing highlight
      removeHighlight();
      
      if (!element || !element.id) {
        console.error('Invalid element to highlight:', element);
        sendResponse({ success: false });
        return;
      }
      
      // Find element by data-id attribute
      const targetElement = document.querySelector(`[data-id="${element.id}"]`);
      
      if (!targetElement) {
        console.error('Element not found:', element.id);
        sendResponse({ success: false });
        return;
      }
      
      // Store reference
      currentHighlightedElement = targetElement;
      
      // Add highlight styles
      targetElement.style.outline = '3px solid #4CAF50';
      targetElement.style.outlineOffset = '2px';
      targetElement.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
      targetElement.style.transition = 'all 0.3s ease';
      targetElement.style.cursor = 'pointer';
      
      // Scroll into view smoothly
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
      
      console.log('Element highlighted:', element.id);
      sendResponse({ success: true });
      
    } catch (error) {
      console.error('Error highlighting element:', error);
      sendResponse({ success: false });
    }
  }
  
  /**
   * Remove highlight from current element
   */
  function handleRemoveHighlight(sendResponse) {
    try {
      removeHighlight();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error removing highlight:', error);
      sendResponse({ success: false });
    }
  }
  
  function removeHighlight() {
    if (currentHighlightedElement) {
      currentHighlightedElement.style.outline = '';
      currentHighlightedElement.style.outlineOffset = '';
      currentHighlightedElement.style.backgroundColor = '';
      currentHighlightedElement.style.transition = '';
      currentHighlightedElement.style.cursor = '';
      currentHighlightedElement = null;
    }
    
    // Remove click listener if exists
    if (clickListener) {
      document.removeEventListener('click', clickListener, true);
      clickListener = null;
    }
  }
  
  /**
   * Setup click listener for specific element
   */
  function handleSetupClickListener(elementId, sendResponse) {
    try {
      // Remove any existing listener
      if (clickListener) {
        document.removeEventListener('click', clickListener, true);
      }
      
      // Create new click listener
      clickListener = function(event) {
        // Check if clicked element has the target data-id
        const clickedElement = event.target.closest(`[data-id="${elementId}"]`);
        
        if (clickedElement) {
          console.log('Target element clicked:', elementId);
          
          // Notify popup that element was clicked via window.postMessage
          window.postMessage({
            type: 'ELEMENT_CLICKED',
            elementId: elementId
          }, '*');
          
          // Remove highlight and listener
          removeHighlight();
          
          // Don't prevent default - let the click go through
          // event.preventDefault();
          // event.stopPropagation();
        }
      };
      
      // Add listener with capture phase to catch clicks early
      document.addEventListener('click', clickListener, true);
      
      console.log('Click listener setup for:', elementId);
      sendResponse({ success: true });
      
    } catch (error) {
      console.error('Error setting up click listener:', error);
      sendResponse({ success: false });
    }
  }
  
  console.log('Digital Literacy - Agent 2 Page Interaction loaded');
})();

