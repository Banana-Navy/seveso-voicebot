# Voicebot SEVESO

Landing page et démonstration vocale en français pour Seveso Voice, assistant d'aide à la population en situation de crise industrielle.

## Développement

```bash
npm install
npm run dev
```

Le voicebot utilise l'agent ElevenLabs déjà en production (`agent_3401kvqnemkfev98yj4xq64tg1xn`) via WebRTC. Aucun secret n'est embarqué dans le client.

La démonstration force le français au démarrage et applique un prompt de sécurité limité aux consignes publiques officielles belges. Les langues supplémentaires et le transfert téléphonique sont désactivés. Une détection sémantique conservatrice des formulations de détresse et des balises audio transcrites déclenche une alerte 112 visible. Cette détection n'est pas un dispositif médical et ne diagnostique pas l'état de l'appelant.

Le navigateur soumet en parallèle chaque transcription utilisateur et des métriques acoustiques non enregistrées (`VAD` et pic de volume) à la fonction Supabase `analyze_vocal_distress`. Cette fonction applique un vocabulaire fermé côté serveur et renvoie uniquement des codes déterministes (`CHOKING`, `RESPIRATORY_DISTRESS`, `LOSS_OF_CONSCIOUSNESS`, etc.). Les métriques acoustiques ne peuvent jamais déclencher seules une urgence : elles servent uniquement d'indice complémentaire à une déclaration explicite.

Pour qu'un remplacement de prompt ou de langue envoyé par le navigateur soit accepté, les overrides `System prompt`, `Language` et `ASR keywords` doivent être autorisés dans l'onglet Security de l'agent ElevenLabs. Les guardrails Focus, Manipulation et un validateur de réponse métier doivent aussi être activés dans le tableau de bord avant un usage autre que démonstratif.

## Déploiement

Chaque push sur `main` construit le site avec Vite et le déploie sur GitHub Pages.
