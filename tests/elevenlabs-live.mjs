import { Conversation } from '@elevenlabs/client';

const AGENT_ID = 'agent_3401kvqnemkfev98yj4xq64tg1xn';
const prompt = process.argv.slice(2).join(' ') || 'Bonjour, que dois-je faire si je vois un nuage toxique ?';
const messages = [];
const diagnostics = [];

let resolveResponse;
const responseReceived = new Promise((resolve) => { resolveResponse = resolve; });
let testing = false;
let conversationId = null;

const conversation = await Conversation.startSession({
  agentId: AGENT_ID,
  textOnly: true,
  overrides: {
    conversation: { textOnly: true }
  },
  dynamicVariables: {
    preset_scenario: 'undetermined',
    situation_fr: "une situation d'urgence",
    demo_language: 'fr',
    multilingual_enabled: false,
    emergency_transfer_enabled: false
  },
  onConnect: ({ conversationId: id }) => { conversationId = id; },
  onMessage: (message) => {
    messages.push(message);
    if (testing && message.role === 'agent') resolveResponse(message.message);
  },
  onAgentToolRequest: (event) => diagnostics.push({ type: 'tool_request', event }),
  onAgentToolResponse: (event) => diagnostics.push({ type: 'tool_response', event }),
  onGuardrailTriggered: (event) => diagnostics.push({ type: 'guardrail', event }),
  onError: (message, context) => diagnostics.push({ type: 'error', message: String(message), context }),
  onDisconnect: (details) => diagnostics.push({ type: 'disconnect', details })
});

await new Promise((resolve) => setTimeout(resolve, 2500));
testing = true;
conversation.sendUserMessage(prompt);

const response = await Promise.race([
  responseReceived,
  new Promise((resolve) => setTimeout(() => resolve(null), 30000))
]);

await Promise.race([
  conversation.endSession().catch(() => {}),
  new Promise((resolve) => setTimeout(resolve, 3000))
]);
console.log(JSON.stringify({ conversationId, prompt, response, messages, diagnostics }, null, 2));
process.exit(response ? 0 : 1);
