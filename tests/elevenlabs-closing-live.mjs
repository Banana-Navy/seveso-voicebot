import assert from 'node:assert/strict';
import { Conversation } from '@elevenlabs/client';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

let conversationId;
const agentMessages = [];
let resolveMessage;

const conversation = await Conversation.startSession({
  agentId: 'agent_3401kvqnemkfev98yj4xq64tg1xn',
  textOnly: true,
  overrides: { conversation: { textOnly: true } },
  onConnect: ({ conversationId: id }) => { conversationId = id; },
  onMessage: (message) => {
    if (message.role !== 'agent' || !message.message) return;
    agentMessages.push(message.message);
    resolveMessage?.();
  }
});

async function waitForAgentCount(count) {
  if (agentMessages.length >= count) return;
  await Promise.race([
    new Promise((resolve) => { resolveMessage = resolve; }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Réponse ${count} absente`)), 25000))
  ]);
  resolveMessage = null;
  assert.ok(agentMessages.length >= count);
}

await waitForAgentCount(1);
conversation.sendUserMessage("Il y a un nuage toxique. Je suis à l'abri, portes et fenêtres fermées, ventilation coupée, sans blessé.");
await waitForAgentCount(2);
conversation.sendUserMessage("Je n'ai plus de question et je souhaite terminer l'appel.");
await waitForAgentCount(3);
await conversation.endSession().catch(() => {});

const closing = agentMessages.at(-1);
assert.match(closing, /pris en compte|bien noté/i);
assert.match(closing, /bi[ -]?Alert|112|consignes officielles/i);
assert.doesNotMatch(closing, /\bBE-Alert\b/i, 'Le texte TTS ne doit pas provoquer la prononciation « bé Alert ».');
assert.match(closing, /Prenez soin de vous|Au revoir/i);
assert.doesNotMatch(closing, /transmis|rappel|recontact/i);

console.log(JSON.stringify({ conversationId, closing }, null, 2));
