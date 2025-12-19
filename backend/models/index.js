/**
 * Model dispatch layer
 * API: runModel(engine, prompt) → string
 *      getEngineInfo(engine) → { engine, model, endpoint }
 */

const localOllama = require('./localOllama');

const engines = {
  'ollama-local': localOllama,
  'anthropic': {
    run: async () => { throw new Error('anthropic: not implemented'); },
    getConfig: () => ({ engine: 'anthropic', model: null, endpoint: null })
  },
  'openai': {
    run: async () => { throw new Error('openai: not implemented'); },
    getConfig: () => ({ engine: 'openai', model: null, endpoint: null })
  }
};

async function runModel(engine, prompt) {
  const driver = engines[engine];
  if (!driver) {
    throw new Error(`Unknown engine: ${engine}`);
  }
  return driver.run(prompt);
}

function getEngineInfo(engine) {
  const driver = engines[engine];
  if (!driver || !driver.getConfig) {
    return { engine, model: null, endpoint: null };
  }
  return driver.getConfig();
}

module.exports = { runModel, getEngineInfo };
