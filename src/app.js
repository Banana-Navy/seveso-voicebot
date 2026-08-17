import { Conversation } from '@elevenlabs/client';
import './style.css';
import { CRITICAL_DISTRESS, FRENCH_ONLY_PROMPT, NON_FRENCH_NOTICE } from './agent-policy.js';

const AGENT_ID = 'agent_3401kvqnemkfev98yj4xq64tg1xn';
const DISTRESS_API = 'https://blzyifrmpqrrvurtfgrn.supabase.co/functions/v1/analyze_vocal_distress';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_TYjzQqPTjHbcRp8Tht8tHg_lPMBuaBI';
const SCENARIOS = {
  toxic_cloud: { fr: 'un nuage toxique ou une fuite de gaz' },
  explosion: { fr: 'une explosion industrielle' },
  industrial_fire: { fr: 'un incendie industriel' },
  environmental_pollution: { fr: "une pollution de l'environnement" },
  preventive_evacuation: { fr: 'une évacuation préventive' },
  undetermined: { fr: "une situation d'urgence" }
};
let conversation = null;
let selectedScenario = 'undetermined';
let inputMeter = null;
let microphoneStream = null;
let acousticClassifier = null;
let acousticContext = null;
let acousticSource = null;
let acousticProcessor = null;
let acousticEvents = new Map();
let voiceMetrics = { vadPeak: 0, inputVolumePeak: 0 };

const panel = document.querySelector('.call-panel');
const startButton = document.querySelector('.panel-call');
const endButton = document.querySelector('.panel-end');
const closeButton = document.querySelector('.panel-close');
const stateTitle = document.querySelector('.call-state strong');
const stateNote = document.querySelector('.call-state small');
const errorNode = document.querySelector('.call-error');
const criticalAlert = document.querySelector('.critical-alert');
const safetyMonitor = document.querySelector('.safety-monitor');

const AUDIO_EVENT_LABELS = new Set(['Breathing', 'Wheeze', 'Gasp', 'Pant', 'Cough', 'Throat clearing']);

function setSafetyMonitor(message) {
  if (safetyMonitor) safetyMonitor.lastChild.textContent = message;
}

function currentAudioEvents() {
  const now = Date.now();
  for (const [label, detectedAt] of acousticEvents) {
    if (now - detectedAt > 5000) acousticEvents.delete(label);
  }
  return [...acousticEvents.keys()];
}

async function startAcousticClassifier(stream) {
  try {
    setSafetyMonitor(' Analyse vocale locale en cours d’activation…');
    const { AudioClassifier, FilesetResolver } = await import('@mediapipe/tasks-audio');
    const fileset = await FilesetResolver.forAudioTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@1.0.1/wasm');
    if (stream !== microphoneStream) return;
    acousticClassifier = await AudioClassifier.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/yamnet.tflite` },
      categoryAllowlist: [...AUDIO_EVENT_LABELS],
      maxResults: 4,
      scoreThreshold: 0.32
    });
    if (stream !== microphoneStream) {
      acousticClassifier.close();
      acousticClassifier = null;
      return;
    }

    acousticContext = new AudioContext({ sampleRate: 16000 });
    acousticSource = acousticContext.createMediaStreamSource(stream);
    acousticProcessor = acousticContext.createScriptProcessor(16384, 1, 1);
    const silentOutput = acousticContext.createGain();
    silentOutput.gain.value = 0;
    acousticProcessor.onaudioprocess = (event) => {
      if (!conversation || !acousticClassifier) return;
      const samples = event.inputBuffer.getChannelData(0);
      const results = acousticClassifier.classify(samples, event.inputBuffer.sampleRate);
      for (const result of results) {
        for (const classification of result.classifications) {
          for (const category of classification.categories) {
            if (AUDIO_EVENT_LABELS.has(category.categoryName) && category.score >= 0.32) {
              acousticEvents.set(category.categoryName, Date.now());
            }
          }
        }
      }
    };
    acousticSource.connect(acousticProcessor);
    acousticProcessor.connect(silentOutput);
    silentOutput.connect(acousticContext.destination);
    setSafetyMonitor(' Analyse sémantique et acoustique locale activée — fonction expérimentale');
  } catch (error) {
    console.warn('Classifieur acoustique indisponible :', error);
    setSafetyMonitor(' Détection sémantique activée — analyse acoustique indisponible');
  }
}

async function stopAcousticClassifier() {
  if (acousticProcessor) acousticProcessor.onaudioprocess = null;
  acousticProcessor?.disconnect();
  acousticSource?.disconnect();
  acousticClassifier?.close();
  if (acousticContext && acousticContext.state !== 'closed') await acousticContext.close();
  microphoneStream?.getTracks().forEach((track) => track.stop());
  acousticProcessor = null;
  acousticSource = null;
  acousticClassifier = null;
  acousticContext = null;
  microphoneStream = null;
  acousticEvents.clear();
  setSafetyMonitor(' Détection sémantique de détresse activée — fonction expérimentale');
}

function showCriticalAlert() {
  if (!criticalAlert.hidden) return;
  criticalAlert.hidden = false;
  criticalAlert.querySelector('a').focus({ preventScroll: true });
  conversation?.sendContextualUpdate('ALERTE PRIORITAIRE : des signes de détresse grave ont été détectés. Applique immédiatement le protocole de détresse et demande de raccrocher puis d’appeler le 112. Ne poursuis pas le questionnaire.');
}

function stopInputMeter() {
  if (inputMeter) window.clearInterval(inputMeter);
  inputMeter = null;
}

function startInputMeter() {
  stopInputMeter();
  inputMeter = window.setInterval(() => {
    if (!conversation) return;
    const volume = Number(conversation.getInputVolume?.()) || 0;
    voiceMetrics.inputVolumePeak = Math.max(voiceMetrics.inputVolumePeak, Math.min(1, volume));
  }, 200);
}

async function analyzeVocalDistress(transcript) {
  try {
    const response = await fetch(DISTRESS_API, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        transcript,
        audio: {
          vad_peak: voiceMetrics.vadPeak,
          input_volume_peak: voiceMetrics.inputVolumePeak,
          audio_events: currentAudioEvents()
        }
      })
    });
    if (!response.ok) return;
    const result = await response.json();
    if (result.should_interrupt_demo) showCriticalAlert();
    if (result.detected_language === 'en' || result.detected_language === 'nl') {
      conversation?.sendContextualUpdate(`LANGUE DE DÉMONSTRATION : réponds maintenant et uniquement en français avec cette phrase exacte : « ${NON_FRENCH_NOTICE} »`);
    }
  } catch {
    // Le détecteur local reste actif si le service externe est momentanément indisponible.
  } finally {
    voiceMetrics = { vadPeak: 0, inputVolumePeak: 0 };
  }
}

function setPanel(open) {
  panel.classList.toggle('open', open);
  panel.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('panel-open', open);
  if (open) closeButton.focus();
}

function setStatus(status, mode) {
  const connected = status === 'connected';
  const connecting = status === 'connecting';
  document.querySelector('.orb').classList.toggle('active', connected || connecting);
  startButton.hidden = connected || connecting;
  endButton.hidden = !connected;
  stateTitle.textContent = connecting ? 'Connexion…' : connected ? (mode === 'speaking' ? 'SEVESO vous répond' : 'SEVESO vous écoute') : 'Prêt à démarrer';
  stateNote.textContent = connected ? 'Parlez naturellement, vous pouvez interrompre le bot.' : 'Cliquez pour autoriser le microphone';
}

document.querySelectorAll('.call-trigger').forEach((button) => button.addEventListener('click', () => setPanel(true)));
document.querySelector('.panel-backdrop').addEventListener('click', () => setPanel(false));
closeButton.addEventListener('click', () => setPanel(false));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setPanel(false); });

document.querySelectorAll('.scenario-picker button').forEach((button) => {
  button.addEventListener('click', () => {
    selectedScenario = button.dataset.scenario;
    document.querySelectorAll('.scenario-picker button').forEach((item) => item.classList.toggle('selected', item === button));
  });
});

startButton.addEventListener('click', async () => {
  errorNode.textContent = '';
  criticalAlert.hidden = true;
  voiceMetrics = { vadPeak: 0, inputVolumePeak: 0 };
  setStatus('connecting');
  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    void startAcousticClassifier(microphoneStream);
    const situation = SCENARIOS[selectedScenario] || SCENARIOS.undetermined;
    conversation = await Conversation.startSession({
      agentId: AGENT_ID,
      connectionType: 'webrtc',
      overrides: {
        agent: {
          language: 'fr',
          prompt: { prompt: FRENCH_ONLY_PROMPT }
        },
        asr: {
          keywords: ['SEVESO', 'BE-Alert', '112', 'étouffement', 'suffocation', 'inconscient', 'nuage toxique']
        }
      },
      dynamicVariables: {
        preset_scenario: selectedScenario,
        situation_fr: situation.fr,
        demo_language: 'fr',
        multilingual_enabled: false,
        emergency_transfer_enabled: false
      },
      onConnect: () => { setStatus('connected', 'listening'); startInputMeter(); },
      onModeChange: ({ mode }) => setStatus('connected', mode),
      onMessage: ({ role, message }) => {
        if (role === 'user' && CRITICAL_DISTRESS.test(message)) showCriticalAlert();
        if (role === 'user') void analyzeVocalDistress(message);
      },
      onVadScore: ({ vadScore }) => {
        voiceMetrics.vadPeak = Math.max(voiceMetrics.vadPeak, Math.min(1, Number(vadScore) || 0));
      },
      onDisconnect: () => { stopInputMeter(); void stopAcousticClassifier(); conversation = null; setStatus('disconnected'); },
      onError: (message) => { errorNode.textContent = String(message || 'Connexion impossible. Réessayez.'); void stopAcousticClassifier(); setStatus('disconnected'); }
    });
  } catch (error) {
    await stopAcousticClassifier();
    const denied = /permission|denied|notallowed|microphone|getusermedia/i.test(String(error));
    errorNode.textContent = denied ? 'Micro refusé — autorisez-le dans votre navigateur puis réessayez.' : 'Connexion impossible. Réessayez.';
    setStatus('disconnected');
  }
});

endButton.addEventListener('click', async () => {
  if (conversation) await conversation.endSession();
  stopInputMeter();
  await stopAcousticClassifier();
  conversation = null;
  setStatus('disconnected');
});

const menuButton = document.querySelector('.menu-toggle');
menuButton.addEventListener('click', () => {
  const open = document.querySelector('.nav').classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav a').forEach((link) => link.addEventListener('click', () => document.querySelector('.nav').classList.remove('open')));

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.nav a')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-30% 0px -60%' });
sections.forEach((section) => observer.observe(section));

function initMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('motion-ready');

  const titles = [...document.querySelectorAll('.hero h1, .section h2, .final-cta h2')];
  const cards = [...document.querySelectorAll('.feature-grid article, .architecture-flow article, .protection-grid article, .tech-stack li, .faq details')];
  const pills = [...document.querySelectorAll('.proofs > div, .partner-logos img')];

  titles.forEach((element) => element.classList.add('title-reveal'));
  cards.forEach((element, index) => {
    element.classList.add('motion-card');
    element.style.setProperty('--motion-delay', `${(index % 4) * 70}ms`);
  });
  pills.forEach((element, index) => {
    element.classList.add('motion-pill');
    element.style.setProperty('--motion-delay', `${index * 90}ms`);
  });

  document.querySelectorAll('.architecture-flow, .protection-grid').forEach((group) => {
    group.classList.add('bento-stack');
    [...group.children].forEach((card, index) => card.style.setProperty('--stack-index', index));
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8%', threshold: 0.08 });

  [...titles, ...cards, ...pills].forEach((element) => revealObserver.observe(element));
  requestAnimationFrame(() => document.querySelector('.hero h1')?.classList.add('is-visible'));

  const parallaxItems = [...document.querySelectorAll('.hero-art, .hero-art-mobile')];
  const techBricks = [...document.querySelectorAll('.tech-brick')];
  let ticking = false;
  const updateParallax = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const range = window.innerWidth <= 720 ? 12 : 28;
    const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight));
    parallaxItems.forEach((item) => item.style.setProperty('--parallax-y', `${progress * range}px`));
    techBricks.forEach((brick, index) => {
      const brickRect = brick.getBoundingClientRect();
      const brickProgress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (brickRect.top + brickRect.height / 2)) / window.innerHeight));
      const direction = index % 2 === 0 ? 1 : -1;
      brick.style.setProperty('--brick-parallax', `${brickProgress * direction * 8}px`);
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateParallax);
  }, { passive: true });
  updateParallax();
}

initMotion();
