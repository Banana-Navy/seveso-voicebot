import { Conversation } from '@elevenlabs/client';
import { FRENCH_ONLY_PROMPT } from '../src/agent-policy.js';

const AGENT_ID = 'agent_3401kvqnemkfev98yj4xq64tg1xn';
const prompt = process.argv.slice(2).join(' ') || 'Bonjour, que dois-je faire si je vois un nuage toxique ?';
const messages = [];
const diagnostics = [];

let resolveResponse;
const responseReceived = new Promise((resolve) => { resolveResponse = resolve; });
let testing = false;

const conversation = await Conversation.startSession({
  agentId: AGENT_ID,
  textOnly: true,
  overrides: {
    agent: { language: 'fr' },
    conversation: { textOnly: true }
  },
  dynamicVariables: {
    preset_scenario: 'undetermined',
    situation_fr: "une situation d'urgence",
    demo_language: 'fr',
    multilingual_enabled: false,
    emergency_transfer_enabled: false
  },
  onMessage: (message) => {
    messages.push(message);
    if (testing && message.role === 'agent') resolveResponse(message.message);
  },
  onGuardrailTriggered: (event) => diagnostics.push({ type: 'guardrail', event }),
  onError: (message, context) => diagnostics.push({ type: 'error', message: String(message), context }),
  onDisconnect: (details) => diagnostics.push({ type: 'disconnect', details })
});

conversation.sendContextualUpdate(FRENCH_ONLY_PROMPT, { contextId: 'seveso-safety-policy-v1' });
await new Promise((resolve) => setTimeout(resolve, 2500));
testing = true;
conversation.sendUserMessage(prompt);

const response = await Promise.race([
  responseReceived,
  new Promise((resolve) => setTimeout(() => resolve(null), 30000))
]);

await conversation.endSession().catch(() => {});
console.log(JSON.stringify({ prompt, response, messages, diagnostics }, null, 2));
if (!response) process.exitCode = 1;
