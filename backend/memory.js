const fs = require('fs').promises;
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory', 'sessions');

function getSessionFilename() {
  const now = new Date();
  return now.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '') + '.json';
}

async function ensureDir() {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

async function saveSession(data) {
  try {
    await ensureDir();
    const filename = getSessionFilename();
    const filepath = path.join(MEMORY_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`Session saved: ${filename}`);
  } catch (error) {
    console.error('Failed to save session:', error.message);
    // Non-fatal: don't throw
  }
}

module.exports = { saveSession };
