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
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Réponse ${count} absente`)), 25_000))
  ]);
  resolveMessage = null;
  assert.ok(agentMessages.length >= count);
}

await waitForAgentCount(1);
conversation.sendUserMessage("Il y a une fuite de gaz au numéro 16, rue de la Loi, à 1000 Bruxelles. Il n'y a pas de blessé.");
await waitForAgentCount(2);
await conversation.endSession();
await new Promise((resolve) => setTimeout(resolve, 1_500));

const detailResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
  headers: { 'xi-api-key': apiKey }
});
assert.equal(detailResponse.status, 200);
const detail = await detailResponse.json();
const history = JSON.parse(detail.conversation_initiation_client_data.dynamic_variables.system__conversation_history);
const calls = history.entries.flatMap((entry) => entry.tool_requests ?? []);
const addressCall = calls.find((call) => call.tool_name === 'SEVESO_resolve_belgian_address');

assert.ok(addressCall, 'Le résolveur d’adresse SEVESO n’a pas été appelé.');
assert.equal(addressCall.params_as_json?.postcode ?? addressCall.params?.postcode, '1000');
assert.equal(addressCall.params_as_json?.house_number ?? addressCall.params?.house_number, '16');
assert.match(agentMessages.at(-1), /Est-ce bien/i);
assert.match(agentMessages.at(-1), /Rue de la Loi 16, 1000 Bruxelles/i);

console.log(JSON.stringify({
  conversationId,
  tool: addressCall.tool_name,
  confirmation: agentMessages.at(-1)
}, null, 2));
