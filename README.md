# FactoryFlow

API Express/Mongoose de suivi des matieres premieres, stocks, produits et ordres de production.

## Demarrage avec Docker

```powershell
Copy-Item .env.example .env
# Remplacer SECRET_KEY dans .env par une valeur aleatoire.
docker compose up --build -d
```

Par defaut : API sur `http://localhost:3001`, Swagger sur `http://localhost:3001/api-docs`, specification sur `http://localhost:3001/openapi.json` et controle du processus sur `/health`.

Compose initialise un replica set MongoDB `rs0` a un membre pour les transactions de consommation des stocks. Pour une base externe, definir `DOCKER_MONGO_URI` dans `.env`. Cette base doit aussi prendre en charge les transactions : replica set ou MongoDB Atlas. Les adresses annoncees par ses membres doivent etre accessibles au backend.

## Demarrage local

Node.js 20 ou plus recent et un replica set MongoDB ou Atlas sont necessaires.

```powershell
npm ci
Copy-Item .env.example .env
# Configurer MONGO_URI pour une base accessible depuis Windows, puis SECRET_KEY.
# Exemple pour un replica set local : mongodb://localhost:27017/factoryflow?replicaSet=rs0
npm run dev
```

`npm start` lance le serveur sans nodemon. Le serveur charge `.env` avant de lire `PORT` et se connecte a MongoDB avant d'accepter les requetes. La base du service Compose n'est pas exposee sur Windows ; utiliser le backend Docker ou configurer une base locale distincte.

## Architecture

```text
routes -> controllers -> services -> repositories -> models / MongoDB
```

- Les controllers lisent la requete et construisent la reponse HTTP.
- Les services valident les donnees et appliquent les regles metier.
- Les repositories executent les requetes Mongoose et les transactions.
- Les erreurs metier contiennent un statut et un message ; les erreurs inattendues donnent une reponse JSON 500 sans exposer leurs details.

## Parcours d'utilisation

1. Creer un compte avec `POST /api/auth/register` : le premier utilisateur devient `ADMIN`, les suivants `OPERATOR`. `/api/auth/createUser` reste disponible comme alias.
2. Se connecter avec `POST /api/auth/login`, copier `token`, puis utiliser **Authorize** dans Swagger. Les routes protegees attendent `Authorization: Bearer <token>`.
3. Creer les matieres, initialiser leurs stocks et definir les produits avec une composition non vide, sans doublons et avec des quantites positives par unite.
4. Un administrateur planifie un ordre avec `POST /api/production-orders`, la reference du produit, une quantite et l'identifiant d'un operateur. L'identifiant utilisateur est le champ `sub` de `/api/auth/me` apres connexion de cet utilisateur.
5. L'administrateur ou l'operateur assigne demarre l'ordre avec `PATCH /api/production-orders/{id}/start`. La composition est copiee lors de la planification ; les modifications ulterieures du produit ne changent pas cet instantane.
6. Le demarrage deduit `quantityPerUnit * quantity` pour chaque matiere dans une seule transaction. Un stock manquant ou insuffisant annule la transaction et laisse l'ordre planifie.
7. `PATCH /api/production-orders/{id}/complete` termine un ordre en cours. `PATCH /api/production-orders/{id}/cancel` annule seulement un ordre encore planifie. Les operateurs ne peuvent consulter ou modifier que leurs propres ordres ; les administrateurs peuvent tous les consulter.

Les references sont normalisees en majuscules. Les quantites doivent etre finies ; les chaines numeriques sont acceptees pour compatibilite. Les stocks initiaux restent immuables. Un produit utilise par un ordre de production ne peut pas etre supprime. La deconnexion revoque uniquement le token courant, valable un jour.

Les routes existantes conservent leurs noms, verbes HTTP et enveloppes (`message_error`, `info_product`, `allMaterial`, etc.). Swagger detaille les entrees, sorties et codes d'erreur de chaque route.

## Tests

```powershell
npm test
npm run test:services
```

Les tests utilisent `node:test` et des repositories simules : aucune base ni cle reelle n'est necessaire. Les tests des services couvrent authentification, validation, composition, stocks, droits et transitions des ordres. Les tests HTTP verifient les routes existantes, Swagger, les erreurs JSON et l'authentification. Ces tests unitaires ne remplacent pas une verification des transactions sur un vrai replica set.

La specification editable est `docs/openapi.yaml` (OpenAPI 3.0.3). Les routes `/api-docs` et `/openapi.json` utilisent ce meme fichier.

References : [specification OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3) et [conditions des transactions MongoDB](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).
