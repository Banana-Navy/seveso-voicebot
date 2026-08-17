import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CRITICAL_DISTRESS, NON_FRENCH_INPUT, NON_FRENCH_NOTICE } from '../src/agent-policy.js';

const agentPrompt = await readFile(new URL('../config/elevenlabs-agent-prompt.md', import.meta.url), 'utf8');

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

assert.match(agentPrompt, /Réponds uniquement en français/);
assert.match(agentPrompt, /ne peut pas appeler ni transférer réellement/i);
assert.match(agentPrompt, new RegExp(NON_FRENCH_NOTICE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.equal(NON_FRENCH_INPUT.test('Hello, can you help me in English?'), true);
assert.equal(NON_FRENCH_INPUT.test('Hallo, help mij alsjeblieft'), true);
assert.equal(NON_FRENCH_INPUT.test('Bonjour, pouvez-vous m’aider ?'), false);

console.log('Politique agent : langue, urgence et faux positifs validés.');
