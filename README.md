# Spese Casa

Gestionale delle **spese condivise di casa** per due persone (default *Giuseppe* e
*Angela*), che replica fedelmente il foglio Google di partenza: un periodo per
ogni mese, registro delle spese, riepilogo con divisione **50/50** e blocco
*Rimborso e saldo*.

Accanto c'è una seconda sezione, **Budget personale**: privata, una per utente,
con logica diversa (entrate/uscite, nessun debito fra persone). Vedi
[§ 1.1](#11-budget-personale-sezione-privata).

La navigazione è divisa in due **workspace**: 🏠 *Spese casa* e 👛 *Spese
personali*. Si passa dall'uno all'altro dal menu utente in alto a destra, dove
stanno anche *Impostazioni* ed *Esci*. La barra laterale è un elenco piatto del
workspace attivo — *Mesi*, poi le sue voci — e il marchio in cima riporta alla
dashboard, che è la landing del workspace. Su mobile la stessa barra diventa un
drawer.

Inoltre: **andamenti multi-mese** per entrambe le sezioni ([§ 1.2](#12-andamenti-multi-mese)),
**cestino** con ripristino ([§ 1.3](#13-cestino-soft-delete)), **riflesso automatico**
delle spese di casa nel budget personale ([§ 1.4](#14-collegamento-spese-casa--budget-personale))
e **PWA installabile** su iPhone ([§ 9](#9-pwa-installarla-su-iphone)).

| Parte | Stack |
| --- | --- |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2, PostgreSQL, JWT |
| Frontend | React 18 + TypeScript, Vite, React Router, Tailwind CSS, TanStack Query, Axios, React Hook Form + Zod, Recharts |
| Infra | Docker Compose (Postgres + backend + frontend con nginx) |

```
.
├── backend/          API FastAPI, modelli, migrazioni, test
├── frontend/         SPA React + TypeScript
├── docker-compose.yml
└── .env.example
```

---

## 1. Concetti di dominio

* **Household** – raggruppa i due membri, i periodi e il modello di spese fisse.
  Valuta EUR di default. Viene creato automaticamente alla registrazione.
* **Member** – uno dei due coinquilini (nome + colore). Sono esattamente due:
  le spese si dividono **sempre** 50/50, non esistono altre modalità.
* **Period** – l'equivalente di un foglio/tab del Google Sheet, tipicamente un
  mese ("Ottobre 2025"). Ha il proprio registro spese e il proprio saldo.
* **Expense** – una riga del registro: data *(facoltativa, come le celle vuote
  del foglio)*, descrizione, categoria, pagato da, importo.
* **CommonIncome** – un'**entrata comune**: soldi che rientrano nel bilancio di
  casa (un reso, un rimborso, un bonus) e si dividono 50/50 come le spese.
  Ha data *(facoltativa)*, descrizione, categoria, **ricevuto da** (chi ha
  materialmente incassato) e importo. Si comporta da spesa negativa.
* **Settlement** – uno per periodo: `rimborso_versato` e `ricevuto`. Tutto il
  resto (dovuto, residuo, stato) è **calcolato**, mai memorizzato.
* **RecurringExpenseTemplate** – modello configurabile delle spese fisse
  (Condominio, Affitto, Luce, Acqua) usato per precompilare i nuovi periodi.

**Categorie fisse** (enum non modificabile):
`Casa, Affitto, Bollette, Spesa, Trasporti, Svago, Salute, Altro`.
Le entrate comuni hanno il proprio elenco: `Rimborso, Reso, Bonus, Altro`.

### Logica di calcolo

Per ogni periodo:

| Grandezza | Formula |
| --- | --- |
| Totale speso | somma degli importi delle **spese** |
| Entrate comuni totali | somma degli importi delle **entrate comuni** |
| **Netto da dividere** | `totale_speso - entrate_comuni_totali` |
| Ha pagato *X* | somma delle spese con `paid_by = X` |
| Ha incassato *X* | somma delle entrate comuni con `ricevuto_da = X` |
| **Contributo netto di *X*** | `ha_pagato_X - ha_incassato_X` (può essere negativo) |
| Quota a testa (50%) | `netto_da_dividere / 2` |
| Saldo | `abs(contributo_netto_X - quota_a_testa)` |
| Chi deve a chi | chi ha un contributo netto **sotto** la quota deve il saldo all'altro |
| Importo dovuto | `= saldo` |
| Residuo | `importo_dovuto - rimborso_versato` |

Senza entrate comuni i numeri coincidono con quelli di prima: il netto è il
totale speso e il contributo netto è quanto ha pagato ciascuno.

Stato del rimborso:

* `dovuto == 0` → **Siete in pari**
* `residuo > 0` → **● Da saldare**
* `residuo <= 0` e `dovuto > 0` → **✓ Saldato**

Tutti i calcoli usano `Decimal` con arrotondamento commerciale (half-up) a due
decimali e vivono in [`backend/app/services/summary.py`](backend/app/services/summary.py),
in funzioni pure, coperte da test.

**Esempio di riferimento** (caricato dal seed e verificato dai test):

```
Totale speso ......... 3.509,32 €
Ha pagato Giuseppe ... 1.709,29 €
Ha pagato Angela ..... 1.800,03 €
Quota a testa (50%) .. 1.754,66 €
Saldo ................    45,37 €   → Giuseppe deve a Angela
```

Il seed aggiunge anche un'entrata comune (reso da 80,00 € incassato da
Giuseppe), che sposta i conti su:

```
Entrate comuni .......    80,00 €
Netto da dividere .... 3.429,32 €
Quota a testa (50%) .. 1.714,66 €
Saldo ................    85,37 €   → Giuseppe deve a Angela
```

**Esempio minimo** (nei test): unica spesa da 100 € pagata da Giuseppe più un
reso da 40 € incassato da Giuseppe → netto 60 €, quota 30 € a testa, contributo
netto Giuseppe 60 € e Angela 0 € → *Angela deve a Giuseppe 30,00 €*.

### 1.1 Budget personale (sezione privata)

Sezione **separata e privata**: ogni utente vede e modifica solo il proprio
budget. Non c'è divisione fra persone, non ci sono debiti né conguagli: è un
rendiconto entrate/uscite personale, fedele al foglio *"Budget mensile 2026"*.

Ha la stessa struttura della sezione condivisa: una **dashboard** con selettore
del mese in alto (apre il più recente, ma si cambia liberamente), le quattro
card del riepilogo, le tabelle di entrate e uscite e i grafici — uscite per
categoria, confronto entrate/uscite e andamento del saldo fra i mesi.

* **PersonalPeriod** – un mese ("Ottobre 2026"), legato a `owner_id`.
* **Income** – una riga ENTRATE: categoria, dettaglio, importo.
* **PersonalExpense** – una riga USCITE: categoria, negozio/dettaglio, importo
  e `pagato` (`false` = in sospeso, `true` = già addebitata).

**Categorie entrata**: `Riporto, Stipendio, Altro`.
`Riporto` è il saldo carta portato dal mese precedente.

**Categorie uscita**: `Affitto, Assicurazioni, Telefonia, Abbonamenti,
Cura persona, Finanziamenti, Spesa, Trasporti, Svago, Salute, Altro`.

Gli importi possono essere **vuoti** (`null`): come le celle vuote del foglio,
valgono zero nelle somme ma restano distinguibili da uno zero vero.

#### Logica di calcolo

Per ogni mese personale:

| Valore | Formula |
| --- | --- |
| Entrate totali | somma degli importi delle entrate |
| Uscite totali | somma degli importi delle uscite |
| Uscite pagate | somma delle uscite con `pagato = true` |
| Uscite in sospeso | uscite totali − uscite pagate |
| **Saldo reale (carta)** | entrate totali − uscite **pagate** |
| **Saldo dopo spese in sospeso** | entrate totali − uscite **totali** |

Riferimento riprodotto dal foglio (*Ottobre 2026*, tutte le uscite in sospeso):
entrate `1.749,00 €`, uscite `932,73 €`, saldo carta `1.749,00 €`, saldo dopo
sospese `816,27 €`.

#### Isolamento fra utenti

Requisito non negoziabile: **un utente non può leggere né modificare i dati
personali di un altro.**

* Ogni query parte da `owner_id = current_user.id`
  ([`app/crud/personal.py`](backend/app/crud/personal.py)); non esiste un
  percorso che raggiunga una riga senza quel filtro.
* La dependency `get_personal_period_or_404` risolve il periodo **già filtrato
  per proprietario**: un mese altrui risponde `404`, non `403`, così da non
  rivelarne nemmeno l'esistenza.
* Le righe (entrate/uscite) si raggiungono solo via join sul periodo posseduto:
  incrociare il proprio `period_id` con l'id di una riga altrui dà `404`.
* La rotta frontend `/budget` sta dentro `ProtectedRoute`.

Il comportamento è coperto da
[`tests/test_personal_isolation.py`](backend/tests/test_personal_isolation.py).

### 1.2 Andamenti multi-mese

Ogni sezione ha una pagina **Andamento** (`/periodi/andamento` e
`/budget/andamento`) che legge aggregati calcolati **sul server**: il client non
scarica i registri per sommarli.

* **Spese casa** — per ogni mese: spese totali, entrate comuni, netto da
  dividere, saldo.
* **Budget personale** — per ogni mese: entrate, uscite, saldo reale (carta),
  saldo dopo le spese in sospeso.
* In entrambe: grafico ad area mese per mese, **confronto mese-su-mese** con
  badge ↑/↓ (variazione assoluta e percentuale), **spesa media per categoria**
  sui mesi dell'intervallo e **classifica dei mesi più cari**.
* Filtri: ultimi 3/6/12 mesi (o tutti) e categoria.

L'intervallo si esprime come *"ultimi N mesi"* perché i periodi sono etichette
(`"Ottobre 2026"`), non date: l'unico ordinamento affidabile è quello di
creazione.

### 1.3 Cestino (soft delete)

Nessuna eliminazione è immediata. Spese, entrate comuni, periodi, mesi personali
e relative righe hanno `deleted_at` e `deleted_by_id`: il `DELETE` valorizza il
timestamp, e **ogni** query di lettura filtra `deleted_at IS NULL`, così i
riepiloghi non vedono più l'elemento.

Il **Cestino** (`/cestino`, sotto Impostazioni) elenca cosa è stato buttato,
quando e da chi, con filtro per sezione, e offre *Ripristina* ed *Elimina
definitivamente* (con conferma).

* Il cestino della sezione **casa** è condiviso; quello **personale** mostra
  solo i propri elementi.
* Ripristinando un periodo tornano anche le sue righe.
* Le voci *derivate* non compaiono nel cestino: seguono la loro sorgente.

### 1.4 Collegamento Spese casa → Budget personale

I movimenti condivisi che toccano davvero la **tua carta** compaiono da soli fra
le tue voci personali, così il *Saldo reale (carta)* è corretto senza
reinserire niente.

| Movimento condiviso | Voce derivata nel personale |
| --- | --- |
| Spesa pagata da te | **uscita** dell'importo **intero**, già pagata |
| Entrata comune incassata da te | **entrata** |
| Conguaglio che incassi | **entrata** |
| Conguaglio che versi | **uscita**, già pagata |

**Esempio.** Paghi 300 € di affitto (uscita personale 300) e il partner ti
rimborsa 150 € (entrata personale 150): impatto netto sul tuo saldo **−150 €**,
cioè la tua quota reale.

Regole:

* le voci derivate sono **di sola lettura** (badge *"Spesa casa"* /
  *"Entrata comune"* / *"Conguaglio"*); si modificano dalla sorgente, e l'API
  risponde `409` a chi ci prova;
* vanno nel mese personale con la **stessa etichetta** del periodo condiviso; se
  non esiste, viene creato;
* la **categoria originale** è mantenuta (`Casa` e `Bollette` sono state aggiunte
  alle categorie personali apposta, così non si perde nulla);
* se la sorgente cambia, la derivata si aggiorna; se cambia il pagante, la voce
  si sposta sull'altro utente;
* soft delete coerente: sorgente nel cestino → derivata cestinata; sorgente
  ripristinata → derivata ripristinata; hard delete → derivata cancellata;
* `source_type`/`source_id` marcano le derivate, che **non** generano a loro
  volta altre voci (niente cicli né doppi conteggi).

Il riallineamento è **idempotente e per periodo**
([`app/services/personal_sync.py`](backend/app/services/personal_sync.py)): dopo
ogni scrittura si ricalcola l'insieme desiderato e lo si confronta con quello
esistente, invece di una logica incrementale che può andare fuori sincrono.

**Opt-in.** In *Impostazioni → Account* c'è l'interruttore *"Rifletti le Spese
casa nel mio budget"* (attivo di default). Spegnendolo, le voci derivate già
create vengono rimosse; riaccendendolo tornano. Accanto si sceglie **quale
membro sei** nel registro di casa: senza quel legame non si può sapere di chi è
la carta.

---

## 2. Avvio con Docker (più rapido)

Prerequisiti: Docker e Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Al primo avvio il backend attende Postgres, applica le migrazioni Alembic e
carica i dati d'esempio.

| Servizio | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:8000/api/v1 |
| Swagger | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

Credenziali demo: **demo@spesecasa.it** / **demo1234**

Per non caricare i dati d'esempio, imposta `RUN_SEED: "false"` nel servizio
`backend` di `docker-compose.yml`.

```bash
docker compose down      # ferma tutto
docker compose down -v   # ferma e cancella anche il volume del database
```

---

## 3. Avvio locale (sviluppo)

### 3.1 Prerequisiti

* Python **3.12+**
* Node.js **20+** (testato su 22) e npm
* PostgreSQL **14+** in esecuzione

### 3.2 Database

```bash
createdb spese_casa
psql -c "CREATE USER spese WITH PASSWORD 'spese'; GRANT ALL ON DATABASE spese_casa TO spese;"
```

In alternativa, solo Postgres via Docker:

```bash
docker compose up -d db
```

### 3.3 Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
```

Crea `backend/.env` (oppure esporta le variabili a mano):

```dotenv
DATABASE_URL=postgresql+asyncpg://spese:spese@localhost:5432/spese_casa
SECRET_KEY=una-chiave-lunga-e-casuale-generata-con-openssl-rand-hex-32
ENVIRONMENT=development
BACKEND_CORS_ORIGINS=http://localhost:5173
```

Migrazioni, seed e avvio:

```bash
alembic upgrade head        # crea lo schema
python -m app.seed          # carica il periodo d'esempio (--force per ricrearlo)
uvicorn app.main:app --reload --port 8000
```

Il seed stampa un autocontrollo dei totali:

```
[seed] Periodo 'Ottobre 2025': 31 spese inserite
       OK  totale_speso                3509.32 (atteso 3509.32)
       OK  ha_pagato_Giuseppe          1709.29 (atteso 1709.29)
       OK  ha_pagato_Angela            1800.03 (atteso 1800.03)
       OK  quota_a_testa               1754.66 (atteso 1754.66)
       OK  saldo                         45.37 (atteso 45.37)
       -> → Giuseppe deve a Angela
```

### 3.4 Frontend

```bash
cd frontend
npm install
npm run dev
```

Apri http://localhost:5173. In sviluppo Vite fa da proxy su `/api` verso
`http://localhost:8000`: nessun problema di CORS e nessun URL assoluto nel
codice. Per puntare a un backend diverso:

```bash
VITE_PROXY_TARGET=http://127.0.0.1:8899 npm run dev
```

Altri comandi utili:

```bash
npm run typecheck    # solo type checking
npm run build        # build di produzione in dist/
npm run preview      # anteprima della build
```

---

## 4. Test

Tutto con un comando solo, dalla radice del progetto:

```bash
make test
```

Nell'ordine: **TypeScript → ESLint → build di produzione → pytest → Playwright**.
Se uno dei controlli statici è rosso la suite si ferma lì. I singoli pezzi sono
`make statici`, `make test-backend`, `make e2e`; `make e2e-report` apre l'ultimo
report HTML. Gli stessi passi girano in CI (`.github/workflows/ci.yml`).

### End-to-end (Playwright)

```bash
cd frontend && npm run e2e
```

Girano su **Chromium** (desktop 1280×800 e Pixel 5) e su **WebKit** (iPhone 13),
cioè il motore di Safari. L'ambiente è isolato: un backend sulla porta 8099 con
un **SQLite dedicato** (`backend/e2e.db`, mai il Postgres di sviluppo), Vite su
:5199 e la build di produzione su :4199 per i test della PWA. Il database viene
riseminato da `backend/tests_e2e/seed_e2e.py` all'avvio e fra un file di test e
l'altro, con numeri tondi scelti apposta (Settembre 1200/550/350, e il caso
300 €/150 € di agosto per il collegamento casa→personale).

Coprono: autenticazione e sessione, CRUD e calcoli delle spese di casa, budget
personale e sua privatezza, riflesso casa→personale, mesi, andamenti, cestino,
export CSV, navigazione a due workspace, PWA (manifest, service worker, lettura
offline, blocco delle scritture offline), più i controlli trasversali di
responsività, accessibilità, stati vuoti/errore e pulizia della console.

### API (pytest)

```bash
cd backend
source .venv/bin/activate
pytest -q
```

I test girano su SQLite in memoria, quindi non serve Postgres. Coprono:

* il motore di calcolo (`test_summary_calculations.py`), incluso il caso di
  riferimento del foglio e i casi limite (in pari, totale a centesimo dispari,
  rimborso superiore al dovuto);
* autenticazione, refresh e isolamento fra household;
* CRUD periodi, spese, membri e spese fisse ricorrenti;
* endpoint di riepilogo, settlement ed export CSV;
* il **budget personale** (`test_personal_budget.py`): CRUD di mesi, entrate e
  uscite, toggle `pagato`, riepilogo che riproduce i numeri del foglio
  (1.749,00 / 932,73 / 1.749,00 / 816,27) e precompilazione dal mese precedente;
* l'**isolamento fra utenti** (`test_personal_isolation.py`): un secondo utente
  registrato non legge, non scrive e non cancella nulla del primo — nemmeno
  conoscendo gli id esatti — e riceve sempre `404`;
* le **entrate comuni** (`test_common_incomes.py`): CRUD, saldo netto,
  contributo netto negativo, entrata che riporta in pari, retrocompatibilità
  del periodo di riferimento ed export CSV;
* gli **andamenti** (`test_trends.py`): ordine dei mesi, netto e saldo per
  punto, media per categoria, classifica, filtro sugli ultimi N mesi, esclusione
  dei cestinati e privatezza del trend personale;
* il **cestino** (`test_trash.py`): l'elemento sparisce dai conti ma resta
  ripristinabile, hard delete definitivo, privatezza del cestino personale;
* il **collegamento casa→personale** (`test_personal_sync.py`): l'esempio
  300 €/150 €, entrambi i lati del conguaglio, aggiornamento e spostamento della
  derivata al cambio pagante, sola lettura, assenza di doppi conteggi e opt-out.

---

## 4.1 Dati d'esempio del budget personale

Il foglio *"Budget mensile 2026"* (tre mesi: ottobre, novembre, dicembre) si
carica nell'account indicato — e **solo** in quello:

```bash
cd backend
python -m app.personal_seed --email tua@email.it          # salta i mesi già presenti
python -m app.personal_seed --email tua@email.it --force  # li ricrea
```

Lo script stampa i totali di ogni mese, così si verifica a colpo d'occhio che
coincidano con il foglio.

---

## 5. Variabili d'ambiente

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://spese:spese@localhost:5432/spese_casa` | DSN **async**; un `postgresql://` viene convertito in automatico |
| `SECRET_KEY` | placeholder | Chiave di firma JWT — **da cambiare in produzione** (`openssl rand -hex 32`) |
| `JWT_ALGORITHM` | `HS256` | Algoritmo di firma |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Durata dell'access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Durata del refresh token |
| `ENVIRONMENT` | `development` | `development` / `test` / `production` |
| `SQL_ECHO` | `False` | Log delle query SQL |
| `BACKEND_CORS_ORIGINS` | `http://localhost:5173,…` | Origini ammesse, separate da virgola |
| `DEFAULT_MEMBER_A` / `DEFAULT_MEMBER_B` | `Giuseppe` / `Angela` | Nomi dei membri creati alla registrazione |
| `DEFAULT_HOUSEHOLD_NAME` | `Casa` | Nome di default dell'household |
| `DEFAULT_CURRENCY` | `EUR` | Valuta |
| `VITE_API_BASE_URL` | `/api/v1` | Base URL delle API lato frontend |
| `VITE_PROXY_TARGET` | `http://localhost:8000` | Target del proxy Vite in sviluppo |

---

## 6. API

Tutte le rotte sono sotto `/api/v1` e documentate in Swagger (`/docs`).
Eccetto `register`, `login`, `token` e `refresh`, richiedono l'header
`Authorization: Bearer <access_token>`.

| Metodo | Rotta | Descrizione |
| --- | --- | --- |
| `POST` | `/auth/register` | Registrazione (crea household + i due membri + spese fisse) |
| `POST` | `/auth/login` | Login JSON → coppia di token |
| `POST` | `/auth/token` | Login form-encoded (pulsante *Authorize* di Swagger) |
| `POST` | `/auth/refresh` | Rinnova la coppia di token |
| `GET` | `/auth/me` | Profilo dell'utente autenticato |
| `GET` | `/members` | Elenca i due membri |
| `PATCH` | `/members/{id}` | Aggiorna nome/colore |
| `GET` `POST` | `/periods` | Lista (con totali e saldo) / creazione |
| `GET` `PATCH` `DELETE` | `/periods/{id}` | Dettaglio / rinomina / elimina |
| `GET` `POST` | `/periods/{id}/expenses` | Registro spese / nuova spesa |
| `PATCH` `DELETE` | `/periods/{id}/expenses/{expense_id}` | Modifica / elimina spesa |
| `GET` `POST` | `/periods/{id}/common-incomes` | **Entrate comuni** del periodo / nuova entrata |
| `PATCH` `DELETE` | `/periods/{id}/common-incomes/{income_id}` | Modifica / elimina entrata comune |
| `GET` | `/periods/{id}/summary` | **Riepilogo completo calcolato** |
| `GET` `PUT` | `/periods/{id}/settlement` | Legge / aggiorna rimborso versato e *Ricevuto?* |
| `GET` | `/periods/{id}/export.csv` | Export CSV del registro |
| `GET` `POST` | `/recurring-templates` | Modello delle spese fisse |
| `PATCH` `DELETE` | `/recurring-templates/{id}` | Modifica / elimina |
| `GET` `POST` | `/personal/periods` | **Budget personale**: i miei mesi / nuovo mese |
| `GET` `PATCH` `DELETE` | `/personal/periods/{id}` | Dettaglio / rinomina / elimina |
| `GET` `POST` | `/personal/periods/{id}/incomes` | Entrate del mese / nuova entrata |
| `PATCH` `DELETE` | `/personal/periods/{id}/incomes/{income_id}` | Modifica / elimina entrata |
| `GET` `POST` | `/personal/periods/{id}/expenses` | Uscite del mese / nuova uscita |
| `PATCH` `DELETE` | `/personal/periods/{id}/expenses/{expense_id}` | Modifica (incluso `pagato`) / elimina |
| `GET` | `/personal/periods/{id}/summary` | **Riepilogo personale calcolato** |
| `GET` | `/personal/periods/{id}/export.csv` | Export CSV di entrate e uscite |
| `GET` | `/periods/trends` | **Andamento** multi-mese delle Spese casa (`?mesi=N`) |
| `GET` | `/personal/trends` | **Andamento** multi-mese del proprio budget (`?mesi=N`) |
| `GET` | `/trash` | **Cestino**: elementi eliminati (`?sezione=casa\|personale`) |
| `POST` | `/trash/{tipo}/{id}/restore` | Ripristina un elemento |
| `DELETE` | `/trash/{tipo}/{id}` | Elimina definitivamente (non recuperabile) |
| `PATCH` | `/auth/me` | Preferenze: `rifletti_spese_casa`, `member_id` |
| `GET` | `/health` | Healthcheck |

Esempio di risposta di `/periods/{id}/summary` (estratto):

```json
{
  "period_nome": "Ottobre 2025",
  "totale_speso": 3509.32,
  "entrate_comuni_totali": 0.0,
  "netto_da_dividere": 3509.32,
  "quota_a_testa": 1754.66,
  "per_membro": [
    {
      "member": { "nome": "Giuseppe" },
      "ha_pagato": 1709.29, "ha_ricevuto": 0.0,
      "contributo_netto": 1709.29, "differenza": -45.37
    },
    {
      "member": { "nome": "Angela" },
      "ha_pagato": 1800.03, "ha_ricevuto": 0.0,
      "contributo_netto": 1800.03, "differenza": 45.37
    }
  ],
  "saldo": 45.37,
  "chi_deve_a_chi": "→ Giuseppe deve a Angela",
  "in_pari": false,
  "per_categoria": [{ "categoria": "Casa", "totale": 644.97, "percentuale": 18.38 }],
  "rimborso": {
    "importo_dovuto": 45.37,
    "rimborso_versato": 0.0,
    "residuo": 45.37,
    "stato": "da_saldare",
    "stato_label": "● Da saldare",
    "ricevuto": false
  }
}
```

---

## 7. Struttura del codice

```
backend/app/
├── api/
│   ├── deps.py              dependency: sessione, utente, periodo, membri
│   └── v1/
│       ├── router.py
│       └── endpoints/       auth, members, periods, expenses, common_incomes,
│                             summary, recurring, personal, trends, trash
├── core/                    config (pydantic-settings) e security (bcrypt + JWT)
├── crud/                    accesso dati per entità
├── db/                      Base dichiarativa, engine e sessione async
├── models/                  modelli SQLAlchemy + enum di dominio
├── schemas/                 schemi Pydantic v2 (richieste/risposte)
├── services/
│   ├── summary.py           motore di calcolo condiviso (funzioni pure)
│   ├── personal_summary.py  motore di calcolo del budget personale
│   ├── personal_sync.py     riflesso Spese casa -> budget personale
│   ├── trends.py            aggregati multi-mese
│   ├── csv_export.py        export CSV in formato italiano
│   ├── personal_csv.py      export CSV del budget personale
│   ├── defaults.py          spese fisse di default
│   ├── seed_data.py         dataset d'esempio del foglio condiviso
│   └── personal_seed_data.py  dataset reale di "Budget mensile 2026"
├── main.py                  app FastAPI, CORS, handler di errore
├── seed.py                  CLI di seed con autocontrollo dei totali
└── personal_seed.py         CLI di seed del budget personale (--email)

frontend/src/
├── api/                     client Axios + un modulo per risorsa
├── components/
│   ├── ui/                  button, card, table, dialog, field, badge, toast, …
│   ├── layout/              app-sidebar (elenco del workspace), topbar
│   ├── period/              SummaryCard, CategoryCard, SettlementCard
│   ├── expenses/            ExpenseTable, ExpenseForm
│   ├── common-incomes/      CommonIncomeTable, CommonIncomeForm
│   ├── trends/              TrendParts (badge variazione, medie, classifica)
│   ├── settings/            CategoriesCard, AccountCard
│   └── personal/            IncomeTable, PersonalExpenseTable, form, grafici,
│                            PersonalPeriodSelect
├── context/AuthContext.tsx  sessione, login/logout, ripristino token
├── hooks/                   usePeriods, useExpenses, useSummary, useMembers,
│                         useTemplates, useCommonIncomes, usePersonal
├── lib/                     format (it-IT), queryKeys, tokens, download
├── pages/                   Login, Registrazione, Periodi, Dashboard, Registro,
│                         Andamento (casa + personale), Budget personale,
│                         Cestino, Impostazioni
└── types/                   tipi allineati agli schemi del backend
```

---

## 8. Scelte e assunzioni

Dove la specifica lasciava margine, è stata scelta l'opzione più sensata:

1. **Un household per utente.** La registrazione crea un nuovo household con i
   due membri di default; tutti i dati sono isolati per household. Più utenti
   possono condividere lo stesso household a livello di schema (FK), ma l'app
   non espone ancora un flusso di invito.
2. **Quota arrotondata.** Con un totale a centesimo dispari (es. 100,01 €) la
   quota è arrotondata half-up (50,01 €) e il saldo viene calcolato sempre dal
   **primo** membro, così i due valori restano coerenti fra loro.
3. **Rimborso superiore al dovuto.** Il residuo diventa negativo e lo stato è
   **✓ Saldato**, con una nota esplicita nella UI.
4. **Importi in JSON come numeri.** Lato server i calcoli sono sempre in
   `Decimal`; in uscita gli importi sono serializzati come numeri (non stringhe)
   per comodità del frontend e dei grafici.
5. **Spese fisse precompilate.** Poiché una spesa richiede importo > 0 e un
   pagante, le righe generate da un modello privo di questi campi nascono come
   segnaposto (0,01 € sul primo membro, data vuota) da correggere a mano —
   l'equivalente delle celle vuote del foglio.
6. **Unicità del nome periodo** per household (confronto case-insensitive), per
   evitare due "Ottobre 2025".
7. **CSV in formato italiano**: separatore `;`, virgola decimale e BOM UTF-8,
   così Excel lo apre correttamente con un doppio click. Il file include, dopo
   il registro, anche riepilogo, totali per categoria e blocco rimborso.
8. **Eliminazione di un periodo** cancella a cascata spese e settlement
   (`ON DELETE CASCADE` a livello di database).
9. **Categorie non modificabili**: sono un enum sia in Python sia in Postgres,
   così un valore fuori lista è impossibile anche scrivendo a mano nel database.

**Budget personale:**

10. **Proprietà per utente, non per household.** Il budget personale è legato a
    `owner_id` → `users.id`: due coinquilini che condividono la stessa casa
    hanno budget personali del tutto separati.
11. **Importi facoltativi.** A differenza delle spese condivise (che richiedono
    importo > 0), qui `importo` è `NULL`-abile: il foglio ha righe promemoria
    senza cifra (*Riporto*, *Luce*, *Acqua*). Valgono zero nelle somme e la UI
    le mostra come `—`, senza bisogno di segnaposto artificiali.
12. **404 invece di 403** sulle risorse altrui: un `403` confermerebbe che
    quella risorsa esiste.
13. **Precompilazione dal mese precedente** invece di una tabella di modelli
    dedicata: i fogli mensili dell'Excel sono copie l'uno dell'altro, quindi
    "ricopia il mese scorso" è insieme più semplice e più fedele. Si configura
    modificando l'ultimo mese. Il *Riporto* generato è il **saldo dopo spese in
    sospeso** del mese precedente (azzerato se negativo, perché un'entrata
    negativa non è rappresentabile).
14. **Toggle "Pagato" senza toast.** È l'azione più frequente della sezione: la
    conferma è il cambio di stato della riga e l'aggiornamento del riepilogo.

**Entrate comuni e navigazione:**

15. **Entrata comune = spesa negativa.** Invece di introdurre un secondo
    meccanismo di divisione, un'entrata comune abbassa il contributo di chi
    l'ha incassata. Il risultato è che il motore di calcolo resta uno solo:
    `compute_balance` riceve i **contributi netti** invece di quanto ha pagato
    ciascuno, e senza entrate comuni i numeri non cambiano di una virgola.
16. **Contributo netto negativo ammesso.** Se qualcuno incassa più di quanto
    spende il suo contributo va sotto zero; il saldo resta corretto e la UI
    mostra semplicemente un numero negativo.
17. **Percentuali per categoria sul totale delle spese**, non sul netto: dire
    "il 18% delle spese" resta leggibile anche con dei resi in giro. Le entrate
    comuni hanno una loro tabella e un loro totale.
18. **Le voci "Entrate comuni" e "Rimborso e saldo" della sidebar sono ancore**
    verso le rispettive schede della dashboard del periodo, non pagine a sé:
    la specifica chiedeva quelle tabelle **dentro** la dashboard, e duplicarle
    in pagine separate avrebbe significato mantenere due volte la stessa cosa.
    Stesso discorso per *Entrate* / *Uscite* del budget personale.
19. **Rotte senza id che seguono il mese selezionato**: `/mesi` e `/budget` sono
    le dashboard del **mese corrente** (o dell'ultimo scelto nella sessione),
    `/mesi/spese` il registro dello stesso mese, `/mesi/:id` e `/budget/:id` i
    link diretti a un mese, `/mesi/elenco` e `/budget/elenco` gli elenchi. Con
    un id nell'URL comanda l'id, che riallinea la selezione globale.
20. **"Categorie" in Impostazioni è di sola consultazione**: le categorie sono
    enum fissi in Python e in Postgres, quindi la scheda mostra cosa si può
    scegliere invece di fingere una modifica impossibile.

**Andamenti, cestino e collegamento:**

21. **Intervallo come "ultimi N mesi"** invece di un range di date: i periodi
    sono etichette libere, non date, quindi un filtro `da`/`a` avrebbe richiesto
    di imporre un formato al nome.
22. **Percentuale di variazione omessa quando il mese precedente è zero**: una
    variazione percentuale su base zero non significa niente. Il colore del badge
    segue il *significato*, non il segno: per le uscite salire è una cattiva
    notizia, per entrate e saldi è il contrario.
23. **Cestino unico con filtro**, non uno per sezione: chi cerca qualcosa che ha
    cancellato di solito non ricorda in quale delle due sezioni l'aveva fatto.
24. **Soft delete anche sui periodi**, non solo sulle righe: cestinare un mese
    per sbaglio sarebbe il danno peggiore, e ripristinandolo tornano anche le sue
    righe senza doverle ricordare una per una.
25. **Le voci derivate restano fuori dal cestino**: non hanno vita propria, e
    offrire un "ripristina" che il successivo riallineamento annulla sarebbe
    fuorviante.
26. **Categoria originale mantenuta** (opzione consigliata dalla specifica): per
    farlo ho aggiunto `Casa` e `Bollette` alle categorie delle uscite personali,
    così tutte e 8 le categorie di casa hanno una corrispondenza 1:1 e i trend per
    categoria restano sensati.
27. **Opt-out rimuove le voci derivate esistenti** invece di lasciarle: una voce
    di sola lettura che non si aggiorna più sarebbe peggio di una assente. Basta
    riaccendere l'interruttore per riaverle.
28. **Serve il legame membro↔utente.** Non esistendo un flusso di invito, chi
    registra lo household viene collegato al primo membro; gli altri si scelgono
    da *Impostazioni → Account*. Senza quel legame il riflesso è disattivato,
    perché non si saprebbe di chi è la carta.
29. **Riallineamento per periodo intero, idempotente**, invece di una logica
    incrementale per singola riga: è più semplice e non può andare fuori sincrono.
30. **Nessuna coda di scrittura offline** (come da specifica): offline la lettura
    funziona dalla cache e le mutazioni sono bloccate a monte da un interceptor
    Axios con messaggio esplicito.
31. **Svuotamento automatico del cestino non implementato**: era opzionale, e
    farlo bene richiede uno scheduler (cron o task periodico) che il progetto non
    ha ancora.

**Mese condiviso:**

32. **Il mese selezionato è uno solo per tutta l'app** (`MeseContext`) ed è
    identificato dalla sua **etichetta** ("Settembre 2026"), non da un id: le due
    sezioni hanno id indipendenti ma condividono i nomi, ed è già così che il
    riflesso casa→personale accoppia i mesi.
33. **La selezione non viene salvata**: all'apertura si riparte sempre dal mese
    corrente, come da specifica, non dall'ultimo consultato.
34. **Se il mese scelto non esiste in una sezione si vede uno stato vuoto**, mai
    un ripiego silenzioso su un altro mese: il numero mostrato deve sempre essere
    quello del mese scritto in cima.
35. **Error boundary attorno alla pagina, non attorno all'app**: se una vista si
    rompe, sidebar e topbar restano vive e si può cambiare sezione. Si azzera
    cambiando percorso, così l'errore vecchio non resta appiccicato.

**Due workspace:**

36. **Il workspace lo detta il percorso** (`/mesi*` = casa, `/budget*` =
    personale), non una preferenza salvata: un link diretto o un ricaricamento
    devono aprire la barra laterale giusta. Impostazioni e Cestino valgono per
    entrambi e non lo cambiano: si resta in quello da cui si è arrivati.
37. **La dashboard non è una voce di menu**: è la landing del workspace e ci si
    torna dal marchio in cima alla barra. Per questo la prima voce è *Mesi*.
38. **Il cestino si raggiunge da Impostazioni**: togliendo il gruppo
    *Impostazioni* dalla barra laterale sarebbe rimasto senza porta d'ingresso,
    e il menu utente ha un ordine fissato (workspace, Impostazioni, Esci).

---

## 9. PWA: installarla su iPhone

Il frontend è una **PWA installabile**: dopo l'installazione si apre a schermo
intero, con la sua icona, e **in lettura funziona anche senza rete**.

### Installazione da iPhone

1. apri l'app in **Safari** (non Chrome: su iOS solo Safari può installare);
2. tocca il pulsante **Condividi** (il quadrato con la freccia in su);
3. scorri e scegli **"Aggiungi a Home"**;
4. conferma: trovi l'icona 🏠 fra le app.

Su Android/desktop compare invece il normale prompt di installazione del browser.

### Cosa funziona offline

* **Sì**: l'avvio dell'app (l'app shell è in precache) e tutto quel che hai già
  visitato — periodi, riepiloghi, registri, budget personale. Le risposte delle
  `GET` sono in *stale-while-revalidate*: vedi subito la copia salvata e intanto
  il dato si riscarica.
* **No**: creare, modificare o eliminare. Le scritture sono bloccate a monte con
  il messaggio *"Sei offline: modifiche non disponibili"*, e una barra gialla in
  cima alla pagina segnala lo stato. Non c'è una coda di scrittura offline.

Quando esce una versione nuova, il service worker la scarica da solo e compare
un avviso **"C'è una versione nuova dell'app!"** con il pulsante *Aggiorna*
(applicarla ricarica la pagina, quindi la scelta resta all'utente).

> ⚠️ Il service worker è attivo solo nella **build di produzione**
> (`npm run build` + `npm run preview`, o il container nginx). In `npm run dev`
> è disattivato di proposito, altrimenti nasconderebbe le modifiche.

---

## 10. Note di produzione

* Cambia `SECRET_KEY` e le credenziali di Postgres prima del deploy.
* Il seed è pensato per sviluppo e demo: in produzione lascia `RUN_SEED=false`.
* Restringi `BACKEND_CORS_ORIGINS` al dominio reale del frontend.
* L'immagine del backend gira come utente non-root; quella del frontend serve
  la build statica con nginx e fa da reverse proxy su `/api`.
