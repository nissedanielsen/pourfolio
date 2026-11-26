# Pourfolio

Inventarie för drycker hemma – sprit, likör, mixers, färskvaror med mera – och förslag på
drinkar utifrån det som finns hemma.

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

Logga in med **pourfolio / pourfolio**. `./mvnw spring-boot:run` använder profilen `local`
([application-local.yml](backend/src/main/resources/application-local.yml)) med dessa
utvecklingsuppgifter. Jar-filen och Docker-imagen gör det aldrig.

## Inloggning

Appen har en enda användare, vars uppgifter anges som miljövariabler (se Konfiguration).
`POST /api/auth/login` ger en token som gäller i 24 timmar och skickas som
`Authorization: Bearer <token>`. Alla andra `/api`-anrop kräver token. Efter fem felaktiga
försök inom en minut spärras inloggningen tillfälligt (429).

Byt `AUTH_TOKEN_SECRET` för att logga ut alla enheter direkt.

## Drinkförslag

Appen har en startsamling med drygt 40 klassiska recept (migreringen `V5__create_recipe.sql`)
och jämför dem med inventariet:

- **Ingredienser** – en flaska kan ange vilken ingrediens den är (t.ex. Campari, söt vermouth,
  lime). Formuläret gissar ingrediensen från namnet. Receptrader kräver antingen en viss
  ingrediens eller valfri vara i en kategori ("valfri gin").
- **Ersättningar** – t.ex. bourbon ↔ rye, sockerlag ↔ socker.
- **Volym** – mängderna jämförs i ml och appen räknar ut hur många drinkar det räcker till.
  Citrusfrukter räknas om till juice (en lime ≈ 3 cl), andra styckvaror (t.ex. burkar tonic)
  räknas som en portion per styck. Stänk och "fyll upp" kräver bara att något finns.
- **Alltid hemma** – is, vatten, sodavatten, socker, sockerlag och salt behöver inte registreras.
- **Köptips** – vad som skulle göra flest nya drinkar möjliga, bland recept som bara saknar en sak.

## Streckkoder

_Skanna_ på inventariesidan läser EAN-streckkoden med mobilkameran (eller från ett foto, eller
inskriven för hand) och fyller i formuläret:

1. **Du har redan flaskan** – välj att öppna den eller lägga till en ny.
2. **Känd sedan tidigare** – uppgifterna från förra gången du sparade en flaska med koden.
   Produkterna sparas i `known_product` och finns kvar även när flaskorna tagits bort.
3. **Open Food Facts** – förslag från den öppna produktdatabasen
   ([openfoodfacts.org](https://world.openfoodfacts.org), ODbL). Bara streckkoden skickas.
   Datan är användarbidragen och ojämn, så förslaget ska kontrolleras.
4. **Okänd** – formuläret med bara streckkoden ifylld.

Läsningen sker i webbläsaren: inbyggd `BarcodeDetector` där den finns (Chrome på Android),
annars en WebAssembly-version av ZXing (t.ex. Safari på iPhone). `.wasm`-filen serveras från
appen själv och laddas först när skannern öppnas. Kameran kräver HTTPS (eller localhost).

## API

Lokalt finns dokumentationen på <http://localhost:8080/swagger-ui.html> (logga in via
`/api/auth/login` och klistra in token under _Authorize_) och OpenAPI-specifikationen på
<http://localhost:8080/v3/api-docs>. I produktion är båda avstängda.

| Metod    | Sökväg                                | Beskrivning                                                                                         |
| -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/auth/login`                     | Logga in, ger token (kräver ingen token)                                                            |
| `GET`    | `/api/auth/me`                        | Inloggad användare                                                                                  |
| `GET`    | `/api/categories`                     | Kategoriträdet (två nivåer)                                                                         |
| `GET`    | `/api/inventory-items`                | Sök/filtrera: `q`, `categoryId`, `minAbv`, `maxAbv`, `unitType`, `lowStock`, `page`, `size`, `sort` |
| `GET`    | `/api/inventory-items/{id}`           | Hämta en post                                                                                       |
| `POST`   | `/api/inventory-items`                | Skapa                                                                                               |
| `PUT`    | `/api/inventory-items/{id}`           | Ersätt                                                                                              |
| `PATCH`  | `/api/inventory-items/{id}/remaining` | Uppdatera mängd kvar                                                                                |
| `DELETE` | `/api/inventory-items/{id}`           | Ta bort                                                                                             |
| `GET`    | `/api/ingredients`                    | Alla ingredienser                                                                                   |
| `GET`    | `/api/recipes`                        | Recept matchade mot inventariet; `filter` = `ALL`, `CAN_MAKE` eller `MISSING_ONE`                   |
| `GET`    | `/api/recipes/{id}`                   | Recept med status per ingrediens                                                                    |
| `GET`    | `/api/recipes/shopping-suggestions`   | Köptips                                                                                             |
| `GET`    | `/api/barcodes/{barcode}`             | Det som är känt om en streckkod (egna flaskor, tidigare produkter, Open Food Facts)                 |

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

| Variabel                  | Standard                                     |
| ------------------------- | -------------------------------------------- |
| `DATABASE_URL`            | `jdbc:postgresql://localhost:5432/pourfolio` |
| `DATABASE_USERNAME`       | `pourfolio`                                  |
| `DATABASE_PASSWORD`       | `pourfolio`                                  |
| `CORS_ALLOWED_ORIGINS`    | `http://localhost:5173`                      |
| `PORT`                    | `8080`                                       |
| `AUTH_USERNAME`           | – (krävs; `pourfolio` lokalt)                |
| `AUTH_PASSWORD`           | – (krävs; `pourfolio` lokalt)                |
| `AUTH_TOKEN_SECRET`       | – (krävs, minst 32 tecken)                   |
| `API_DOCS_ENABLED`        | `false` (på lokalt)                          |
| `OPEN_FOOD_FACTS_ENABLED` | `true` (av i tester och E2E)                 |

Utan `AUTH_*` vägrar backend att starta, i stället för att köra utan skydd.

Frontend: `VITE_API_URL` – backendens adress när frontend och backend driftas separat
(t.ex. frontend på Vercel). Lämnas tom lokalt.

## Driftsättning

Frontend och backend driftas separat. Vercel kör inte Java, så backend behöver en
containertjänst.

**Databas** – en hanterad PostgreSQL, t.ex. Neon. Flyway skapar tabellerna vid start.
Använd Neons direkta anslutning (värdnamn utan `-pooler`). Appen håller inga anslutningar
öppna i onödan, så Neon kan stängas av när appen inte används.

**Backend** – bygg containern från `backend/Dockerfile` (t.ex. Render, Railway, Fly.io eller
Google Cloud Run) och sätt:

- `DATABASE_URL` som JDBC-URL, t.ex. `jdbc:postgresql://<host>/<db>?sslmode=require`
  (inte `postgres://…`-formatet som vissa tjänster visar)
- `DATABASE_USERNAME` och `DATABASE_PASSWORD`
- `CORS_ALLOWED_ORIGINS` till frontendens adress, t.ex. `https://pourfolio.vercel.app`
- `AUTH_USERNAME` och `AUTH_PASSWORD` – dina inloggningsuppgifter
- `AUTH_TOKEN_SECRET` – en lång slumpmässig sträng, t.ex. från PowerShell:

  ```powershell
  $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
  ```

Imagen är optimerad för snabb start på små instanser: JVM-flaggor för få CPU:er och
Class Data Sharing (ett klassarkiv som skapas vid bygget). Med 0,1 CPU startar Spring på
cirka 56 s i stället för 173 s. Flaggorna kan ändras via `JAVA_TOOL_OPTIONS`.

`PORT` sätts normalt av tjänsten. Använd `/actuator/health/liveness` som hälsokontroll i
tjänsten – den frågar inte databasen, så täta kontroller håller inte Neon vaken.
`/actuator/health` kontrollerar även databasen och passar för manuell felsökning.

**Frontend (Vercel)** – importera repot, välj `frontend` som _Root Directory_ och sätt
`VITE_API_URL` till backendens adress. `frontend/vercel.json` gör att direktlänkar som
`/items/12` fungerar.
