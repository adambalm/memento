const BACKEND_URL = 'http://localhost:3000';

const captureBtn = document.getElementById('captureBtn');
const statusDiv = document.getElementById('status');
const engineSelect = document.getElementById('engineSelect');
const debugModeCheckbox = document.getElementById('debugMode');
const modeButtons = document.querySelectorAll('.mode-btn');
const lockWarning = document.getElementById('lockWarning');
const lockMessage = document.getElementById('lockMessage');
const lockLink = document.getElementById('lockLink');

let selectedMode = 'results';
let currentLockStatus = null;

// Restore settings from storage
chrome.storage.local.get(['selectedEngine', 'debugMode', 'outputMode'], (result) => {
  if (result.selectedEngine) {
    engineSelect.value = result.selectedEngine;
  }
  if (result.debugMode) {
    debugModeCheckbox.checked = result.debugMode;
  }
  if (result.outputMode) {
    selectedMode = result.outputMode;
    updateModeButtons();
  }
});

// Check lock status on popup open
checkLockStatus();

// Save engine selection when changed
engineSelect.addEventListener('change', () => {
  chrome.storage.local.set({ selectedEngine: engineSelect.value });
});

// Save debug mode selection when changed
debugModeCheckbox.addEventListener('change', () => {
  chrome.storage.local.set({ debugMode: debugModeCheckbox.checked });
});

// Mode button handlers
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMode = btn.dataset.mode;
    chrome.storage.local.set({ outputMode: selectedMode });
    updateModeButtons();
    updateCaptureButton();
  });
});

function updateModeButtons() {
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === selectedMode);
  });
}

// Check lock status from backend
async function checkLockStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/lock-status`);
    currentLockStatus = await response.json();

    if (currentLockStatus.locked) {
      lockMessage.textContent = `${currentLockStatus.itemsRemaining} unresolved items`;
      lockLink.onclick = (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: `${BACKEND_URL}/launchpad/${currentLockStatus.sessionId}` });
      };
      lockWarning.style.display = 'block';
    } else {
      lockWarning.style.display = 'none';
    }

    updateCaptureButton();
  } catch (error) {
    console.log('Could not check lock status:', error.message);
    lockWarning.style.display = 'none';
  }
}

function updateCaptureButton() {
  if (currentLockStatus?.locked && selectedMode === 'launchpad') {
    captureBtn.disabled = true;
    captureBtn.textContent = 'Resolve session first';
  } else {
    captureBtn.disabled = false;
    captureBtn.textContent = selectedMode === 'launchpad' ? 'Capture → Launchpad' : 'Capture Session';
  }
}

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

      // Detect if this is likely a PDF (can't extract content from Chrome's PDF viewer)
      const isPdf = (tab.url || '').toLowerCase().endsWith('.pdf') ||
                    (tab.url || '').includes('/pdf/') ||
                    (tab.title || '').toLowerCase().includes('.pdf');
      const needsVisualExtraction = isPdf && !content;

      console.log(`[Memento] CAPTURED: ${tab.title?.slice(0, 50)} (groupId: ${tab.groupId}, windowId: ${tab.windowId})${needsVisualExtraction ? ' [PDF - needs visual extraction]' : ''}`);

      tabData.push({
        url: tab.url || '',
        title: tab.title || '',
        content: content,
        needsVisualExtraction: needsVisualExtraction  // Flag for backend to use Playwright + vision
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

// Send data to backend for classification
// Returns { html, sessionId } for results mode
// Returns { sessionId } for launchpad mode
async function classifySession(tabs, engine, debugMode, mode) {
  if (mode === 'launchpad') {
    // Launchpad mode: get JSON, acquire lock, return session ID
    const response = await fetch(`${BACKEND_URL}/classifyBrowserContext`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs, engine, debugMode, mode: 'launchpad' })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const classification = await response.json();
    const sessionId = classification.meta?.sessionId || classification.timestamp?.replace(/:/g, '-').replace(/\.\d{3}Z$/, '');

    // Acquire lock
    const lockResponse = await fetch(`${BACKEND_URL}/api/acquire-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        itemsRemaining: classification.totalTabs || 0
      })
    });

    const lockResult = await lockResponse.json();
    if (!lockResult.success) {
      console.warn('Could not acquire lock:', lockResult.message);
    }

    return { sessionId, totalTabs: classification.totalTabs };
  } else {
    // Results mode: get HTML back
    const response = await fetch(`${BACKEND_URL}/classifyAndRender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs, engine, debugMode })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    return { html: await response.text() };
  }
}

// Main capture flow with 5-minute global timeout (exhaustive classification needs time)
async function captureSession() {
  // Block if locked and in launchpad mode
  if (currentLockStatus?.locked && selectedMode === 'launchpad') {
    setStatus('Resolve current session first', true);
    return;
  }

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
    const debugMode = debugModeCheckbox.checked;
    const debugLabel = debugMode ? ' (debug)' : '';
    const modeLabel = selectedMode === 'launchpad' ? ' → Launchpad' : '';
    setStatus(`<span class="spinner"></span>Classifying ${tabs.length} tabs via ${engineLabel}${debugLabel}${modeLabel}...`);

    // Step 2: Send to backend (4 min budget for exhaustive LLM classification)
    const result = await withTimeout(classifySession(tabs, engine, debugMode, selectedMode), 240000, null);

    clearTimeout(timeoutId);

    if (!result) {
      setStatus('Classification timed out', true);
      setLoading(false);
      return;
    }

    // Step 3: Open appropriate page based on mode
    if (selectedMode === 'launchpad') {
      // Launchpad mode: open launchpad URL
      await chrome.tabs.create({ url: `${BACKEND_URL}/launchpad/${result.sessionId}` });
      setStatus(`Captured ${result.totalTabs} tabs → Launchpad`);
    } else {
      // Results mode: open blob URL
      // Extract and log classifier source from HTML comment
      const sourceMatch = result.html?.match(/<!-- MEMENTO_SOURCE:(\w+):?(.*?) -->/);
      const classifierSource = sourceMatch ? sourceMatch[1] : 'unknown';
      const classifierModel = sourceMatch && sourceMatch[2] ? sourceMatch[2] : null;
      console.log(`[Memento] Classification source: ${classifierSource}${classifierModel ? ` (${classifierModel})` : ''}`);

      const blob = new Blob([result.html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      await chrome.tabs.create({ url: blobUrl });
      setStatus(`Captured ${tabs.length} tabs!`);
    }
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
