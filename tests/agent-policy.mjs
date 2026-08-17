import assert from 'node:assert/strict';
import { CRITICAL_DISTRESS, FRENCH_ONLY_PROMPT, NON_FRENCH_NOTICE } from '../src/agent-policy.js';

for (const phrase of [
  'Je m étouffe',
  'Elle vient de perdre connaissance',
  'Je n arrive plus à respirer',
  '[gasping]'
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

assert.match(FRENCH_ONLY_PROMPT, /Réponds uniquement en français/);
assert.match(FRENCH_ONLY_PROMPT, /ne peut pas transférer vers le 112/i);
assert.match(FRENCH_ONLY_PROMPT, new RegExp(NON_FRENCH_NOTICE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

console.log('Politique agent : langue, urgence et faux positifs validés.');
