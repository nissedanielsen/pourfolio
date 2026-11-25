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

## Konfiguration

Backend (miljövariabler, med standardvärden för lokal utveckling):

| Variabel               | Standard                                     |
| ---------------------- | -------------------------------------------- |
| `DATABASE_URL`         | `jdbc:postgresql://localhost:5432/pourfolio` |
| `DATABASE_USERNAME`    | `pourfolio`                                  |
| `DATABASE_PASSWORD`    | `pourfolio`                                  |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173`                      |

Frontend: `VITE_API_URL` – backendens adress när frontend och backend driftas separat
(t.ex. frontend på Vercel). Lämnas tom lokalt.
