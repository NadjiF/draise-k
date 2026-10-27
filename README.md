# La Draise-K

Boutique fictive de pièces détachées vélo, avec un assistant IA qui transforme un besoin décrit en langage courant (« je veux changer ma chaîne ») en devis.

Projet de démonstration : les produits et les prix sont fictifs, rien n'est à vendre. Le domaine a été choisi volontairement simple pour mettre en avant la stack et l'intégration d'un LLM. Projet développé avec Claude Code comme assistant de programmation : cadrage, choix techniques et validation de chaque étape sont de mon fait.

**Site en ligne :** [à compléter](https://draise-k-dz8w.vercel.app/)

## Fonctionnalités

- **Catalogue** de 25 pièces, filtrable par catégorie et par critères du vélo (taille de roue, type de frein, nombre de vitesses), avec l'état du filtre dans l'URL.
- **Fiche pièce** avec les compatibilités en langage clair.
- **Assistant** : l'utilisateur décrit son besoin, l'assistant propose les pièces adaptées avec un devis, pose une question s'il manque une information, ou indique honnêtement ce que le catalogue ne couvre pas.
- Interface responsive, accessible au clavier, mode sombre automatique.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Gemini (`@google/genai`) · Vitest

## Choix techniques

- **Le LLM choisit, le code vérifie.** Gemini propose des identifiants de pièces ; le serveur ignore les identifiants inconnus, vérifie les compatibilités et calcule lui-même les prix et le total. Le modèle ne calcule jamais un prix.
- **Prix en centimes.** Stockés en entiers pour éviter les erreurs d'arrondi des nombres décimaux en JavaScript, formatés en euros uniquement à l'affichage.
- **Sortie structurée et intention obligatoire.** La réponse du modèle est imposée par un schéma JSON, avec un champ `intention` (`devis`, `question`, `non_couvert`, `hors_sujet`). Le serveur contrôle la cohérence de la réponse ; une réponse incohérente est traitée comme une question, pour que l'utilisateur ait toujours une réponse.
- **Catalogue filtré avant l'appel.** Quand les critères du vélo sont connus, le modèle ne reçoit que les pièces compatibles : il ne peut pas proposer une pièce incompatible.
- **Route sans état.** Pour répondre à une question de l'assistant, le navigateur renvoie l'historique de l'échange (3 échanges au maximum) ; rien n'est stocké côté serveur.
- **Clé API côté serveur uniquement**, jamais exposée au navigateur.

## Lancer le projet

```bash
npm install
```

Créer un fichier `.env.local` à la racine avec une clé Gemini (gratuite sur [Google AI Studio](https://aistudio.google.com/apikey)) :

```
GEMINI_API_KEY=votre_clé
```

```bash
npm run dev      # http://localhost:3000
npm run build    # build de production
npm run lint
```

## Tests

```bash
npm test             # tests unitaires et de la route, Gemini simulé
npm run test:gemini  # test de bout en bout avec le vrai Gemini
```

Les tests unitaires couvrent la logique des critères, le calcul du devis et la route de l'assistant (validation, erreurs, cohérence), sans appeler Gemini : ils sont rapides, gratuits et reproductibles. Le test réel est séparé car il consomme du quota et dépend d'un modèle non déterministe.

## Limites connues

- La limitation du nombre de requêtes est en mémoire : elle n'est pas partagée entre plusieurs instances du serveur. Le quota gratuit de Gemini sert de plafond.
- Le temps de réponse de l'assistant varie selon la charge des serveurs de Google (souvent 5 à 20 secondes).
- Le modèle peut parfois mal formuler une réponse (par exemple, deux questions en une). Les pièces, les compatibilités et les prix restent toujours vérifiés par le serveur.

## Auteur

Nadji Fali — [portfolio](https://) · [GitHub](https://github.com/NadjiF)
