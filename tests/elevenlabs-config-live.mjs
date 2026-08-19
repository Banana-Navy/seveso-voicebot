import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const settings = JSON.parse(await readFile(new URL('../config/elevenlabs-agent-settings.json', import.meta.url), 'utf8'));
const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${settings.agent_id}`, {
  headers: { 'xi-api-key': apiKey }
});
assert.equal(response.status, 200);
const agent = await response.json();
const config = agent.conversation_config;

assert.equal(config.agent.language, 'fr');
assert.deepEqual(Object.keys(config.language_presets ?? {}), []);
assert.equal(config.agent.first_message, settings.first_message);
assert.equal(config.agent.disable_first_message_interruptions, true);
assert.equal(config.turn.transcribe_on_disabled_interruptions, false);
assert.equal(config.turn.turn_model, 'turn_v3');
assert.equal(config.turn.turn_eagerness, settings.turn.turn_eagerness);
assert.equal(config.turn.merge_with_default_ignore_terms, true);
assert.deepEqual(config.turn.interruption_ignore_term_languages, ['fr']);
assert.equal(config.vad.background_voice_detection, false);
assert.equal(config.tts.voice_id, settings.voice.voice_id);
assert.equal(config.tts.model_id, settings.voice.model_id);
assert.equal(config.tts.speed, settings.voice.speed);
assert.equal(config.tts.stability, settings.voice.stability);
assert.equal(config.tts.expressive_mode, true);
assert.deepEqual(config.agent.prompt.tool_ids, settings.active_tool_ids);

for (const required of ['Voicebot SEVESO', 'version de démonstration', 'incidents industriels', 'enregistré', 'Pour quelle situation appelez-vous']) {
  assert.ok(config.agent.first_message.includes(required), `Introduction incomplète : ${required}`);
}

console.log(`Configuration distante validée : ${agent.version_id}, français seul, introduction non interruptible, voix ${settings.voice.name} fr-BE.`);
