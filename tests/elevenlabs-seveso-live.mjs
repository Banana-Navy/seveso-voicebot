import assert from 'node:assert/strict';
import { Conversation } from '@elevenlabs/client';

const AGENT_ID = 'agent_3401kvqnemkfev98yj4xq64tg1xn';
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const cases = [
  ['explosion', 'On a entendu une énorme détonation dans l’usine.'],
  ['industrial_fire', 'Un bâtiment du site est en feu, les flammes sortent du toit.'],
  ['toxic_cloud', 'On sent une très forte odeur chimique et du gaz semble s’échapper.'],
  ['toxic_cloud', 'Une vapeur suspecte forme un nuage autour des installations.'],
  ['environmental_pollution', 'Un produit s’est déversé dans la rivière près du site.'],
  ['preventive_evacuation', 'Les autorités nous demandent de quitter le quartier préventivement.'],
  ['undetermined', 'Un engin industriel s’est renversé, sans feu, sans fuite et sans blessé.']
];

async function runCase(expectedScenario, prompt) {
  let conversationId;
  let intro;
  let response;
  let resolveIntro;
  let resolveResponse;
  let sentAt;
  const introReady = new Promise((resolve) => { resolveIntro = resolve; });
  const responseReady = new Promise((resolve) => { resolveResponse = resolve; });

  const conversation = await Conversation.startSession({
    agentId: AGENT_ID,
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
      if (!intro) {
        intro = message.message;
        resolveIntro();
      } else if (!response) {
        response = message.message;
        resolveResponse();
      }
    }
  });

  await Promise.race([introReady, new Promise((_, reject) => setTimeout(() => reject(new Error('Introduction absente')), 10000))]);
  sentAt = performance.now();
  conversation.sendUserMessage(prompt);
  await Promise.race([responseReady, new Promise((_, reject) => setTimeout(() => reject(new Error(`Réponse absente : ${prompt}`)), 20000))]);
  const responseLatencyMs = Math.round(performance.now() - sentAt);
  await conversation.endSession();
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const detailResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
    headers: { 'xi-api-key': apiKey }
  });
  const detail = await detailResponse.json();
  const history = JSON.parse(detail.conversation_initiation_client_data.dynamic_variables.system__conversation_history);
  const calls = history.entries.flatMap((entry) => entry.tool_requests ?? []);
  const classify = calls.find((call) => call.tool_name === 'classify_situation');
  assert.ok(classify, `classify_situation non appelé pour : ${prompt}`);
  assert.equal(classify.params_as_json.scenario_code, expectedScenario, `Mauvais scénario pour : ${prompt}`);
  assert.equal(classify.params_as_json.language, 'fr');
  return { expectedScenario, prompt, response, responseLatencyMs, conversationId };
}

const results = [];
for (const [scenario, prompt] of cases) results.push(await runCase(scenario, prompt));

const multiple = await runCase('explosion', 'Il y a eu une explosion, énormément de fumée et deux personnes sont blessées.');
assert.doesNotMatch(multiple.response, /s’agit-il d’une explosion|quel type d’incident/i);
assert.doesNotMatch(multiple.response, /y a-t-il des blessés|combien (?:de personnes|de blessés)/i);
results.push(multiple);

const latencies = results.map((item) => item.responseLatencyMs);
const average = Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);
console.log(JSON.stringify({
  passed: results.length,
  average_response_latency_ms: average,
  max_response_latency_ms: Math.max(...latencies),
  results
}, null, 2));
