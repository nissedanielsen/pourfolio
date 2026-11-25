# Pourfolio

Inventarie för drycker hemma – sprit, likör, mixers, färskvaror med mera.
Senare ska appen kunna föreslå drinkar utifrån det som finns hemma.

## Struktur

| Katalog              | Innehåll                                        |
| -------------------- | ----------------------------------------------- |
| `backend/`           | Java 21, Spring Boot, Maven, Flyway, PostgreSQL |
| `frontend/`          | React, TypeScript, Vite, MUI                    |
| `docker-compose.yml` | Lokal PostgreSQL för utveckling                 |

Konvention: användargränssnittet är på svenska; kod, API och databas på engelska.

## Kom igång lokalt

Krav: Java 21+, Node 22+, Docker.

```sh
docker compose up -d                 # PostgreSQL på localhost:5432

cd backend && ./mvnw spring-boot:run # API på http://localhost:8080
cd frontend && npm install && npm run dev   # UI på http://localhost:5173
```

Vite proxar `/api` till backend under utveckling.

## API

Med backend igång finns dokumentationen på <http://localhost:8080/swagger-ui.html>
och OpenAPI-specifikationen på <http://localhost:8080/v3/api-docs>.

| Metod    | Sökväg                                | Beskrivning                                                                                         |
| -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/categories`                     | Kategoriträdet (två nivåer)                                                                         |
| `GET`    | `/api/inventory-items`                | Sök/filtrera: `q`, `categoryId`, `minAbv`, `maxAbv`, `unitType`, `lowStock`, `page`, `size`, `sort` |
| `GET`    | `/api/inventory-items/{id}`           | Hämta en post                                                                                       |
| `POST`   | `/api/inventory-items`                | Skapa                                                                                               |
| `PUT`    | `/api/inventory-items/{id}`           | Ersätt                                                                                              |
| `PATCH`  | `/api/inventory-items/{id}/remaining` | Uppdatera mängd kvar                                                                                |
| `DELETE` | `/api/inventory-items/{id}`           | Ta bort                                                                                             |

Mängder lagras i ml för `VOLUME` och i styck för `COUNT`; frontend visar volymer i cl.
Fel returneras som RFC 9457 problem details, med fältfel i `errors`.

Efter API-ändringar: starta backend och kör `npm run generate:api` i `frontend/` för att
uppdatera `src/api/schema.ts`.

## Tester

```sh
cd backend && ./mvnw verify          # kräver Docker (Testcontainers)
cd frontend && npm run lint && npm test
```

Frontendtesterna kör hela appen mot ett mockat API (MSW) – ingen backend behövs.

### End-to-end (Playwright)

Kör hela kedjan – riktig frontend, backend och databas – i Chromium (desktop och mobil):

```sh
docker compose up -d
cd frontend
npx playwright install chromium   # första gången
npm run e2e
```

En backend som redan kör på :8080 återanvänds, annars startas den. I CI körs testerna mot
ett produktionsbygge av frontend.

## Konfiguration

Backend (miljövariabler, med standardvärden för lokal utveckling):

| Variabel               | Standard                                     |
| ---------------------- | -------------------------------------------- |
| `DATABASE_URL`         | `jdbc:postgresql://localhost:5432/pourfolio` |
| `DATABASE_USERNAME`    | `pourfolio`                                  |
| `DATABASE_PASSWORD`    | `pourfolio`                                  |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173`                      |
| `PORT`                 | `8080`                                       |

Frontend: `VITE_API_URL` – backendens adress när frontend och backend driftas separat
(t.ex. frontend på Vercel). Lämnas tom lokalt.

## Driftsättning

Frontend och backend driftas separat. Vercel kör inte Java, så backend behöver en
containertjänst.

**Databas** – en hanterad PostgreSQL, t.ex. Neon. Flyway skapar tabellerna vid start.

**Backend** – bygg containern från `backend/Dockerfile` (t.ex. Render, Railway, Fly.io eller
Google Cloud Run) och sätt:

- `DATABASE_URL` som JDBC-URL, t.ex. `jdbc:postgresql://<host>/<db>?sslmode=require`
  (inte `postgres://…`-formatet som vissa tjänster visar)
- `DATABASE_USERNAME` och `DATABASE_PASSWORD`
- `CORS_ALLOWED_ORIGINS` till frontendens adress, t.ex. `https://pourfolio.vercel.app`

`PORT` sätts normalt av tjänsten. Hälsokontroll: `/actuator/health`.

**Frontend (Vercel)** – importera repot, välj `frontend` som _Root Directory_ och sätt
`VITE_API_URL` till backendens adress. `frontend/vercel.json` gör att direktlänkar som
`/items/12` fungerar.

Appen har ingen inloggning ännu – den som har adressen kan ändra inventariet.
