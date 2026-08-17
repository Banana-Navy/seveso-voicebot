import { Conversation } from '@elevenlabs/client';
import './style.css';

const AGENT_ID = 'agent_3401kvqnemkfev98yj4xq64tg1xn';
let conversation = null;

const panel = document.querySelector('.call-panel');
const startButton = document.querySelector('.panel-call');
const endButton = document.querySelector('.panel-end');
const closeButton = document.querySelector('.panel-close');
const stateTitle = document.querySelector('.call-state strong');
const stateNote = document.querySelector('.call-state small');
const errorNode = document.querySelector('.call-error');

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
  stateTitle.textContent = connecting ? 'Connexion…' : connected ? (mode === 'speaking' ? 'CVESO vous répond' : 'CVESO vous écoute') : 'Prêt à démarrer';
  stateNote.textContent = connected ? 'Parlez naturellement, vous pouvez interrompre le bot.' : 'Cliquez pour autoriser le microphone';
}

document.querySelectorAll('.call-trigger').forEach((button) => button.addEventListener('click', () => setPanel(true)));
document.querySelector('.panel-backdrop').addEventListener('click', () => setPanel(false));
closeButton.addEventListener('click', () => setPanel(false));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setPanel(false); });

startButton.addEventListener('click', async () => {
  errorNode.textContent = '';
  setStatus('connecting');
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    conversation = await Conversation.startSession({
      agentId: AGENT_ID,
      connectionType: 'webrtc',
      dynamicVariables: {
        preset_scenario: 'undetermined',
        situation_fr: "une situation d'urgence",
        situation_nl: 'een noodsituatie',
        situation_de: 'eine Notsituation',
        situation_en: 'an emergency situation'
      },
      onConnect: () => setStatus('connected', 'listening'),
      onModeChange: ({ mode }) => setStatus('connected', mode),
      onDisconnect: () => { conversation = null; setStatus('disconnected'); },
      onError: (message) => { errorNode.textContent = String(message || 'Connexion impossible. Réessayez.'); setStatus('disconnected'); }
    });
  } catch (error) {
    const denied = /permission|denied|notallowed|microphone|getusermedia/i.test(String(error));
    errorNode.textContent = denied ? 'Micro refusé — autorisez-le dans votre navigateur puis réessayez.' : 'Connexion impossible. Réessayez.';
    setStatus('disconnected');
  }
});

endButton.addEventListener('click', async () => {
  if (conversation) await conversation.endSession();
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
