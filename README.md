# Voicebot SEVESO

## Ouverture sur Windows

Ne pas ouvrir directement `index.html` avec une adresse `file:///…`. Windows et Edge bloquent les modules JavaScript locaux et résolvent certains médias depuis la racine du disque.

- Pour consulter la version publiée : <https://banana-navy.github.io/seveso-voicebot/>.
- Pour travailler localement sous Windows : double-cliquer sur `start-windows.cmd`. Le script démarre Vite sur `http://127.0.0.1:5173/` et ouvre le navigateur. Si Node.js n’est pas installé, il ouvre automatiquement la version publiée.

Toute ouverture directe de `index.html` redirige désormais automatiquement vers la version publiée.

Landing page et démonstration vocale en français pour Seveso Voice, assistant d'aide à la population en situation de crise industrielle.

## Développement

```bash
npm install
npm run dev
```

Le voicebot utilise l'agent ElevenLabs déjà en production (`agent_3401kvqnemkfev98yj4xq64tg1xn`) via WebRTC et par téléphone. Aucun secret n'est embarqué dans le client.

La démonstration utilise nativement le français et applique un prompt de sécurité limité aux consignes publiques officielles belges. Les langues supplémentaires et le transfert vers le 112 sont désactivés. Une détection sémantique conservatrice des formulations de détresse et des balises audio transcrites déclenche une alerte 112 visible. Cette détection n'est pas un dispositif médical et ne diagnostique pas l'état de l'appelant.

Le navigateur soumet en parallèle chaque transcription utilisateur et des métriques acoustiques non enregistrées (`VAD` et pic de volume) à la fonction Supabase `analyze_vocal_distress`. Cette fonction applique un vocabulaire fermé côté serveur et renvoie uniquement des codes déterministes (`CHOKING`, `RESPIRATORY_DISTRESS`, `LOSS_OF_CONSCIOUSNESS`, etc.). Les métriques acoustiques ne peuvent jamais déclencher seules une urgence : elles servent uniquement d'indice complémentaire à une déclaration explicite.

Les paramètres de langue, le prompt, les mots-clés ASR et la base documentaire sont configurés directement sur l'agent ElevenLabs. Le navigateur ne remplace pas cette politique. Les guardrails Focus et Manipulation sont activés sur l'agent.

La configuration reproductible de l’agent est décrite dans `config/elevenlabs-agent-settings.json` et synchronisée avec `npm run sync:agent`. Les outils métier portent le préfixe `SEVESO_`. Le résolveur `SEVESO_resolve_belgian_address` est actif avec une identité Supabase propre à SEVESO ; il mutualise le registre belge BeSt sans partager le token du voicebot Inondations. Les anciens connecteurs de journalisation restent désactivés. L’ouverture SEVESO et la question de qualification constituent le premier message non interruptible. Après ce message, le turn-taking `turn_v3` reprend avec interruptions autorisées, filtrage des hésitations brèves et détection de voix de fond désactivée. La qualification libre est ensuite routée vers les six scénarios existants.

Tests de l’agent :

- `npm run test:policy` : politique locale, ouverture, scénarios et garde-fous ;
- `npm run test:agent-config` : configuration réellement déployée ;
- `npm run test:agent-live` : langue, urgence et consignes officielles ;
- `npm run test:agent-seveso` : synonymes, six scénarios, extraction multi-informations et latence de réponse.
- `npm run test:agent-fallback` : absence de retry et de `call_id` vide lorsqu’un connecteur métier échoue.

## Téléphonie

- Numéro public : [`+32 71 49 61 80`](tel:+3271496180)
- Fournisseur : Twilio via l'intégration native ElevenLabs
- Ressource ElevenLabs : `phnum_9001kqa48jahf38ayg5ak67c7gec`
- Routage entrant : agent SEVESO `agent_3401kvqnemkfev98yj4xq64tg1xn`, branche `agtbrch_1201kvqnen6zet9va46mxxs0e2pe`
- Appels entrants et sortants pris en charge par le numéro

Le numéro permet d'appeler le Voicebot SEVESO. Il ne réalise pas de transfert vers le 112 : en cas de danger vital, le bot demande à l'appelant de raccrocher et d'appeler lui-même le 112.

## Déploiement

Chaque push sur `main` construit le site avec Vite et le déploie sur GitHub Pages.
