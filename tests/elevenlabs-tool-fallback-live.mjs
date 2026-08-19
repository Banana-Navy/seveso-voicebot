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
  dynamicVariables: {
    preset_scenario: 'undetermined',
    situation_fr: "une situation d'urgence",
    demo_language: 'fr',
    multilingual_enabled: false,
    emergency_transfer_enabled: false
  },
  onConnect: ({ conversationId: id }) => { conversationId = id; },
  onMessage: (message) => {
    if (message.role !== 'agent') return;
    agentMessages.push(message.message);
    resolveMessage?.();
  }
});

async function waitForAgentCount(count) {
  if (agentMessages.length >= count) return;
  await Promise.race([
    new Promise((resolve) => { resolveMessage = resolve; }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Réponse ${count} absente`)), 20000))
  ]);
  resolveMessage = null;
  assert.ok(agentMessages.length >= count);
}

await waitForAgentCount(1);
conversation.sendUserMessage('Il y a eu une explosion dans un entrepôt, sans blessé.');
await waitForAgentCount(2);
conversation.sendUserMessage('Cela se passe à Charleroi, près de l’aéroport.');
await waitForAgentCount(3);
await conversation.endSession();
await new Promise((resolve) => setTimeout(resolve, 1200));

const detail = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
  headers: { 'xi-api-key': apiKey }
}).then((response) => response.json());
const history = JSON.parse(detail.conversation_initiation_client_data.dynamic_variables.system__conversation_history);
const calls = history.entries.flatMap((entry) => entry.tool_requests ?? []);
const classifyCalls = calls.filter((call) => call.tool_name === 'classify_situation');
const downstreamCalls = calls.filter((call) => ['save_triage', 'save_location', 'save_symptom', 'save_assistance', 'update_confinement', 'request_transfer'].includes(call.tool_name));

assert.equal(classifyCalls.length, 1, 'La classification ne doit pas être retentée après HTTP 500.');
assert.equal(downstreamCalls.length, 0, 'Aucun outil exigeant call_id ne doit être appelé après l’échec de classification.');
assert.equal(JSON.stringify(calls).includes('"call_id":""'), false, 'Un call_id vide a été transmis.');

console.log(JSON.stringify({ conversationId, classify_calls: classifyCalls.length, downstream_calls: downstreamCalls.length, agentMessages }, null, 2));
