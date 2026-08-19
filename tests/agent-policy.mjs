import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CRITICAL_DISTRESS, NON_FRENCH_INPUT, NON_FRENCH_NOTICE } from '../src/agent-policy.js';

const agentPrompt = await readFile(new URL('../config/elevenlabs-agent-prompt.md', import.meta.url), 'utf8');
const settings = JSON.parse(await readFile(new URL('../config/elevenlabs-agent-settings.json', import.meta.url), 'utf8'));

for (const phrase of [
  'Je m étouffe',
  'Elle vient de perdre connaissance',
  'Je n arrive plus à respirer',
  '[gasping]',
  "I can't breathe",
  'Ik kan niet ademen'
]) {
  assert.equal(CRITICAL_DISTRESS.test(phrase), true, `Détresse non détectée : ${phrase}`);
}

for (const phrase of [
  'Je vois un nuage toxique',
  'Pouvez-vous expliquer le risque ?',
  'Il y a une odeur étrange'
]) {
  assert.equal(CRITICAL_DISTRESS.test(phrase), false, `Faux positif : ${phrase}`);
}

assert.match(agentPrompt, /exclusivement en français/i);
assert.match(agentPrompt, /ne transfère pas l’appel/i);
assert.match(agentPrompt, /classify_situation/);
assert.match(agentPrompt, /ne redemande jamais une information déjà donnée/i);
assert.match(agentPrompt, /persons_count=2/);
for (const scenario of ['explosion', 'industrial_fire', 'toxic_cloud', 'environmental_pollution', 'preventive_evacuation', 'undetermined']) {
  assert.match(agentPrompt, new RegExp(`\\b${scenario}\\b`), `Scénario absent du prompt : ${scenario}`);
}
assert.match(settings.first_message, /Voicebot SEVESO/);
assert.match(settings.first_message, /version de démonstration/);
assert.match(settings.first_message, /incidents industriels/);
assert.match(settings.first_message, /enregistré/);
assert.match(settings.first_message, /Pour quelle situation appelez-vous/);
assert.equal(settings.voice.locale, 'fr-BE');
assert.equal(settings.voice.model_id, 'eleven_flash_v2_5');
assert.equal(settings.vad.background_voice_detection, false);
assert.equal(settings.turn.transcribe_on_disabled_interruptions, false);
assert.ok(settings.turn.interruption_ignore_terms.includes('euh'));
assert.equal(NON_FRENCH_INPUT.test('Hello, can you help me in English?'), true);
assert.equal(NON_FRENCH_INPUT.test('Hallo, help mij alsjeblieft'), true);
assert.equal(NON_FRENCH_INPUT.test('Bonjour, pouvez-vous m’aider ?'), false);

console.log('Politique agent : ouverture, scénarios, extraction, langue, urgence et bruit validés.');
