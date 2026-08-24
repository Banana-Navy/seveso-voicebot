import { readFile } from 'node:fs/promises';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const settings = JSON.parse(await readFile(new URL('../config/elevenlabs-agent-settings.json', import.meta.url), 'utf8'));
const prompt = await readFile(new URL('../config/elevenlabs-agent-prompt.md', import.meta.url), 'utf8');

const currentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${settings.agent_id}`, {
  headers: { 'xi-api-key': apiKey }
});
const currentAgent = await currentResponse.json();
if (!currentResponse.ok) throw new Error(`Lecture ElevenLabs refusée (${currentResponse.status}) : ${JSON.stringify(currentAgent)}`);
const builtInTools = currentAgent.conversation_config.agent.prompt.built_in_tools;
const endCallTool = builtInTools?.end_call;
if (!endCallTool) throw new Error('Outil système end_call introuvable.');

const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${settings.agent_id}`, {
  method: 'PATCH',
  headers: {
    'content-type': 'application/json',
    'xi-api-key': apiKey
  },
  body: JSON.stringify({
    conversation_config: {
      asr: { keywords: settings.asr_keywords },
      turn: settings.turn,
      tts: {
        model_id: settings.voice.model_id,
        voice_id: settings.voice.voice_id,
        stability: settings.voice.stability,
        similarity_boost: settings.voice.similarity_boost,
        speed: settings.voice.speed,
        optimize_streaming_latency: settings.voice.optimize_streaming_latency,
        expressive_mode: true
      },
      vad: settings.vad,
      language_presets: {},
      agent: {
        language: 'fr',
        first_message: settings.first_message,
        disable_first_message_interruptions: true,
        prompt: {
          prompt,
          tool_ids: settings.active_tool_ids,
          built_in_tools: {
            ...builtInTools,
            end_call: {
              ...endCallTool,
              description: "Termine et raccroche uniquement lorsque l’échange est clairement clos ou à la demande de l’appelant. Prononce d’abord une clôture humaine qui confirme la prise en compte pendant l’échange, rappelle la consigne immédiate et indique d’appeler le 112 en cas de danger. En mode actif, appelle SEVESO_log_call_end avant de raccrocher. Ne promets jamais une transmission ou un rappel sans confirmation d’un outil."
            }
          }
        }
      }
    }
  })
});

const result = await response.json();
if (!response.ok) throw new Error(`Synchronisation ElevenLabs refusée (${response.status}) : ${JSON.stringify(result)}`);

const config = result.conversation_config;
console.log(JSON.stringify({
  agent_id: result.agent_id,
  version_id: result.version_id,
  language: config.agent.language,
  first_message_interruptible: !config.agent.disable_first_message_interruptions,
  language_presets: Object.keys(config.language_presets ?? {}),
  voice: {
    voice_id: config.tts.voice_id,
    model_id: config.tts.model_id,
    speed: config.tts.speed,
    stability: config.tts.stability
  },
  active_tool_ids: config.agent.prompt.tool_ids,
  turn: {
    model: config.turn.turn_model,
    eagerness: config.turn.turn_eagerness,
    timeout: config.turn.turn_timeout,
    ignored_terms: config.turn.interruption_ignore_terms
  },
  background_voice_detection: config.vad.background_voice_detection
}, null, 2));
