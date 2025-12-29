const BACKEND_URL = 'http://localhost:3000';

const captureBtn = document.getElementById('captureBtn');
const statusDiv = document.getElementById('status');
const engineSelect = document.getElementById('engineSelect');

// Restore last selected engine from storage
chrome.storage.local.get(['selectedEngine'], (result) => {
  if (result.selectedEngine) {
    engineSelect.value = result.selectedEngine;
  }
});

// Save engine selection when changed
engineSelect.addEventListener('change', () => {
  chrome.storage.local.set({ selectedEngine: engineSelect.value });
});

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

// Content extraction limit (8k chars for deep dive capability)
const CONTENT_LIMIT = 8000;

// Extract page content from a tab using scripting API (with 2s timeout per tab)
async function extractPageContent(tabId) {
  try {
    const extraction = chrome.scripting.executeScript({
      target: { tabId },
      func: (limit) => {
        const bodyText = document.body?.innerText || '';
        return bodyText.slice(0, limit);
      },
      args: [CONTENT_LIMIT]
    });
    const results = await withTimeout(extraction, 2000, null);
    return results?.[0]?.result || '';
  } catch (error) {
    console.log(`Could not extract content from tab ${tabId}:`, error.message);
    return '';
  }
}

// Gather all open tabs with their data
async function gatherTabData() {
  const tabs = await chrome.tabs.query({});

  // === DIAGNOSTIC LOGGING ===
  console.log(`[Memento] chrome.tabs.query returned ${tabs.length} tabs`);
  console.table(tabs.map(t => ({
    id: t.id,
    windowId: t.windowId,
    groupId: t.groupId,
    title: t.title?.slice(0, 40),
    url: t.url?.slice(0, 60),
    status: t.status
  })));

  const tabData = [];
  let skippedChrome = 0;
  let skippedExtension = 0;
  let skippedAbout = 0;
  let skippedError = 0;

  for (const tab of tabs) {
    try {
      // Skip chrome:// and other restricted URLs
      if (tab.url?.startsWith('chrome://')) {
        skippedChrome++;
        console.log(`[Memento] SKIP chrome:// - ${tab.title}`);
        continue;
      }
      if (tab.url?.startsWith('chrome-extension://')) {
        skippedExtension++;
        console.log(`[Memento] SKIP chrome-extension:// - ${tab.title}`);
        continue;
      }
      if (tab.url?.startsWith('about:')) {
        skippedAbout++;
        console.log(`[Memento] SKIP about: - ${tab.title}`);
        continue;
      }

      let content = '';
      if (tab.id) {
        content = await extractPageContent(tab.id);
      }

      console.log(`[Memento] CAPTURED: ${tab.title?.slice(0, 50)} (groupId: ${tab.groupId}, windowId: ${tab.windowId})`);

      tabData.push({
        url: tab.url || '',
        title: tab.title || '',
        content: content
      });
    } catch (error) {
      skippedError++;
      console.log(`[Memento] ERROR skipping tab ${tab.id}: ${error.message}`);
    }
  }

  console.log(`[Memento] === SUMMARY ===`);
  console.log(`[Memento] Raw from query: ${tabs.length}`);
  console.log(`[Memento] Skipped chrome://: ${skippedChrome}`);
  console.log(`[Memento] Skipped extension://: ${skippedExtension}`);
  console.log(`[Memento] Skipped about:: ${skippedAbout}`);
  console.log(`[Memento] Skipped errors: ${skippedError}`);
  console.log(`[Memento] Final captured: ${tabData.length}`);
  // === END DIAGNOSTIC LOGGING ===

  return tabData;
}

// Send data to backend for classification and get HTML back
async function classifySession(tabs, engine) {
  const response = await fetch(`${BACKEND_URL}/classifyAndRender`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tabs, engine })
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  return response.text();
}

// Main capture flow with 5-minute global timeout (exhaustive classification needs time)
async function captureSession() {
  setLoading(true);
  setStatus('<span class="spinner"></span>Gathering tab data...');

  const timeoutId = setTimeout(() => {
    setStatus('Capture timed out', true);
    setLoading(false);
  }, 300000);  // 5 minutes for testing

  try {
    // Step 1: Gather tab data (30s budget)
    const tabs = await withTimeout(gatherTabData(), 30000, []);

    if (tabs.length === 0) {
      clearTimeout(timeoutId);
      setStatus('No tabs to capture', true);
      setLoading(false);
      return;
    }

    const engine = engineSelect.value;
    const engineLabel = engineSelect.options[engineSelect.selectedIndex].text;
    setStatus(`<span class="spinner"></span>Classifying ${tabs.length} tabs via ${engineLabel}...`);

    // Step 2: Send to backend and get HTML (4 min budget for exhaustive LLM classification)
    const html = await withTimeout(classifySession(tabs, engine), 240000, null);

    clearTimeout(timeoutId);

    // Extract and log classifier source from HTML comment
    const sourceMatch = html?.match(/<!-- MEMENTO_SOURCE:(\w+):?(.*?) -->/);
    const classifierSource = sourceMatch ? sourceMatch[1] : 'unknown';
    const classifierModel = sourceMatch && sourceMatch[2] ? sourceMatch[2] : null;
    console.log(`[Memento] Classification source: ${classifierSource}${classifierModel ? ` (${classifierModel})` : ''}`);

    if (!html) {
      setStatus('Classification timed out', true);
      setLoading(false);
      return;
    }

    // Step 3: Open results page via blob URL
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    await chrome.tabs.create({ url: blobUrl });

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
