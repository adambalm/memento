const BACKEND_URL = 'http://localhost:3000';

const captureBtn = document.getElementById('captureBtn');
const statusDiv = document.getElementById('status');

function setStatus(message, isError = false) {
  if (isError) {
    statusDiv.innerHTML = `<div class="error">${message}</div>`;
  } else {
    statusDiv.innerHTML = message;
  }
}

function setLoading(loading) {
  captureBtn.disabled = loading;
  if (loading) {
    captureBtn.innerHTML = '<span class="spinner"></span>Capturing...';
  } else {
    captureBtn.textContent = 'Capture Session';
  }
}

// Timeout helper - resolves with fallback after ms
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

// Extract page content from a tab using scripting API (with 1s timeout per tab)
async function extractPageContent(tabId) {
  try {
    const extraction = chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const bodyText = document.body?.innerText || '';
        return bodyText.slice(0, 2000);
      }
    });
    const results = await withTimeout(extraction, 1000, null);
    return results?.[0]?.result || '';
  } catch (error) {
    console.log(`Could not extract content from tab ${tabId}:`, error.message);
    return '';
  }
}

// Gather all open tabs with their data
async function gatherTabData() {
  const tabs = await chrome.tabs.query({});
  const tabData = [];

  for (const tab of tabs) {
    try {
      // Skip chrome:// and other restricted URLs
      if (tab.url?.startsWith('chrome://') ||
          tab.url?.startsWith('chrome-extension://') ||
          tab.url?.startsWith('about:')) {
        continue;
      }

      let content = '';
      if (tab.id) {
        content = await extractPageContent(tab.id);
      }

      tabData.push({
        url: tab.url || '',
        title: tab.title || '',
        content: content
      });
    } catch (error) {
      console.log(`Skipping tab ${tab.id}:`, error.message);
    }
  }

  return tabData;
}

// Send data to backend for classification
async function classifySession(tabs) {
  const response = await fetch(`${BACKEND_URL}/classifyBrowserContext`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tabs })
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  return response.json();
}

// Main capture flow with 70-second global timeout (LLM needs time)
async function captureSession() {
  setLoading(true);
  setStatus('<span class="spinner"></span>Gathering tab data...');

  const timeoutId = setTimeout(() => {
    setStatus('Capture timed out', true);
    setLoading(false);
  }, 70000);

  try {
    // Step 1: Gather tab data (5s budget)
    const tabs = await withTimeout(gatherTabData(), 5000, []);

    if (tabs.length === 0) {
      clearTimeout(timeoutId);
      setStatus('No tabs to capture', true);
      setLoading(false);
      return;
    }

    setStatus(`<span class="spinner"></span>Classifying ${tabs.length} tabs via LLM...`);

    // Step 2: Send to backend (65s budget for LLM)
    const result = await withTimeout(classifySession(tabs), 65000, null);

    clearTimeout(timeoutId);

    if (!result) {
      setStatus('Classification timed out', true);
      setLoading(false);
      return;
    }

    // Step 3: Open results page
    const resultsUrl = `${BACKEND_URL}/results?data=${encodeURIComponent(JSON.stringify(result))}`;
    await chrome.tabs.create({ url: resultsUrl });

    setStatus(`Captured ${tabs.length} tabs!`);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Capture error:', error);
    if (error.message.includes('Failed to fetch')) {
      setStatus('Backend not running. Start the server first.', true);
    } else {
      setStatus(`Error: ${error.message}`, true);
    }
  } finally {
    setLoading(false);
  }
}

// Event listener
captureBtn.addEventListener('click', captureSession);
