# Voicebot CVESO

Landing page et démonstration vocale pour l'assistant CVESO dédié aux risques industriels.

## Développement

```bash
npm install
npm run dev
```

Le voicebot utilise l'agent ElevenLabs déjà en production (`agent_3401kvqnemkfev98yj4xq64tg1xn`) via WebRTC. Aucun secret n'est embarqué dans le client.

## Déploiement

Chaque push sur `main` construit le site avec Vite et le déploie sur GitHub Pages.
