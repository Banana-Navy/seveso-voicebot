import { Conversation } from '@elevenlabs/client';
import './style.css';

const AGENT_ID = 'agent_3401kvqnemkfev98yj4xq64tg1xn';
const SCENARIOS = {
  toxic_cloud: { fr: 'un nuage toxique ou une fuite de gaz', nl: 'een toxische wolk of gaslek', de: 'eine Giftwolke oder einen Gasaustritt', en: 'a toxic cloud or gas leak' },
  explosion: { fr: 'une explosion industrielle', nl: 'een industriële explosie', de: 'eine Industrieexplosion', en: 'an industrial explosion' },
  industrial_fire: { fr: 'un incendie industriel', nl: 'een industriële brand', de: 'einen Industriebrand', en: 'an industrial fire' },
  environmental_pollution: { fr: "une pollution de l'environnement", nl: 'milieuverontreiniging', de: 'eine Umweltverschmutzung', en: 'environmental pollution' },
  preventive_evacuation: { fr: 'une évacuation préventive', nl: 'een preventieve evacuatie', de: 'eine vorsorgliche Evakuierung', en: 'a preventive evacuation' },
  undetermined: { fr: "une situation d'urgence", nl: 'een noodsituatie', de: 'eine Notsituation', en: 'an emergency situation' }
};
let conversation = null;
let selectedScenario = 'undetermined';

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
  setStatus('connecting');
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const situation = SCENARIOS[selectedScenario] || SCENARIOS.undetermined;
    conversation = await Conversation.startSession({
      agentId: AGENT_ID,
      connectionType: 'webrtc',
      dynamicVariables: {
        preset_scenario: selectedScenario,
        situation_fr: situation.fr,
        situation_nl: situation.nl,
        situation_de: situation.de,
        situation_en: situation.en
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
  let ticking = false;
  const updateParallax = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const range = window.innerWidth <= 720 ? 12 : 28;
    const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight));
    parallaxItems.forEach((item) => item.style.setProperty('--parallax-y', `${progress * range}px`));
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

document.querySelectorAll('.tech-links a').forEach((link) => {
  link.addEventListener('click', () => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    document.querySelectorAll('.architecture-flow .is-targeted').forEach((item) => item.classList.remove('is-targeted'));
    target.classList.add('is-targeted');
    window.setTimeout(() => target.classList.remove('is-targeted'), 2200);
  });
});
