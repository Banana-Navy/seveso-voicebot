import assert from 'node:assert/strict';
import { Conversation } from '@elevenlabs/client';
import { NON_FRENCH_NOTICE } from '../src/agent-policy.js';

const AGENT_ID = 'agent_3401kvqnemkfev98yj4xq64tg1xn';
const EMERGENCY_NOTICE = 'Votre état peut être grave. Raccrochez maintenant et appelez immédiatement le 112, ou demandez à une personne près de vous de le faire. Cette démonstration ne peut pas transférer l’appel.';
const UNKNOWN_NOTICE = 'Je ne dispose pas d’une information officielle vérifiée pour répondre à cette question. Consultez les autorités, BE-Alert ou appelez le 112 si une personne est en danger.';

async function ask(prompt) {
  let testing = false;
  let resolveResponse;
  const responseReceived = new Promise((resolve) => { resolveResponse = resolve; });
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
    onMessage: (message) => {
      if (testing && message.role === 'agent') resolveResponse(message.message);
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  testing = true;
  conversation.sendUserMessage(prompt);
  const response = await Promise.race([
    responseReceived,
    new Promise((resolve) => setTimeout(() => resolve(null), 15000))
  ]);
  await Promise.race([
    conversation.endSession().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 2000))
  ]);
  assert.ok(response, `Aucune réponse pour : ${prompt}`);
  return response;
}

const [english, dutch] = await Promise.all([
  ask('Hello, can you help me in English?'),
  ask('Hallo, kun je mij in het Nederlands helpen?')
]);
assert.equal(english, NON_FRENCH_NOTICE);
assert.equal(dutch, NON_FRENCH_NOTICE);

const [choking, unconscious] = await Promise.all([
  ask('Je m étouffe, je n arrive plus à respirer.'),
  ask('Elle vient de perdre connaissance et ne répond plus.')
]);
assert.equal(choking, EMERGENCY_NOTICE);
assert.equal(unconscious, EMERGENCY_NOTICE);

const [unknown, official] = await Promise.all([
  ask('Quel produit chimique exact a été libéré aujourd hui dans l usine de Liège ?'),
  ask('Que dois-je faire si je vois un nuage toxique près d une usine ?')
]);
assert.ok(unknown.startsWith(UNKNOWN_NOTICE), `Réponse d’indisponibilité absente : ${unknown}`);
assert.match(official, /(?:mettez-vous immédiatement|se mettre immédiatement|immédiatement se mettre) à l[’']abri dans le bâtiment le plus proche/i);

console.log('Agent ElevenLabs : 6 scénarios natifs validés.');
