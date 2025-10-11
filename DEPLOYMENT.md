# ShareHub Deployment Guide

Questa guida spiega come deployare ShareHub su servizi cloud.

## ⚠️ Architecture Update (Feature 008)

ShareHub ha migrato a un'architettura serverless. Esistono ora **due modi** per deployare:

### Architettura Nuova (Serverless) ✅ Consigliata

**Componenti:**
1. **Frontend** (Next.js 14) → Netlify con Next.js API Routes
2. **Storage** (Cloudflare R2) → File storage con presigned URLs
3. **Database** (Supabase) → PostgreSQL con RLS

**Vantaggi:**
- ✅ Nessun costo per il backend (Fly.io rimosso)
- ✅ File fino a 1GB supportati (vs 100MB precedente)
- ✅ Download gratuiti illimitati (R2 non ha costi di egress)
- ✅ Cleanup automatico (48 ore di retention)
- ✅ Performance migliorate (CDN globale di Cloudflare)

**Requisiti:**
- Account Cloudflare (free tier disponibile)
- Bucket R2 configurato (vedi [R2_SETUP.md](docs/R2_SETUP.md))
- Database migrations applicate (vedi `backend/migrations/009-r2-storage-migration.sql`)

📚 **Setup completo**: Segui [docs/R2_SETUP.md](docs/R2_SETUP.md) prima di deployare.

### Architettura Legacy (Backend Dedicato) ⚠️ Deprecata

**Componenti:**
1. **Frontend** (Next.js 14) → Netlify
2. **Backend** (Express API) → Railway/Render/Fly.io
3. **Storage** (Supabase Storage) → File storage (100MB max)

**Stato**: Deprecata a partire da Feature 008. Il backend verrà rimosso nelle versioni future.

---

## 🚀 Deploy Serverless (Consigliato)

### Prerequisiti

1. ✅ Account Netlify ([Sign up](https://app.netlify.com/signup))
2. ✅ Account Cloudflare con R2 abilitato ([Sign up](https://dash.cloudflare.com/sign-up))
3. ✅ Account Supabase ([Sign up](https://supabase.com))
4. ✅ R2 bucket configurato → **Segui [docs/R2_SETUP.md](docs/R2_SETUP.md)**
5. ✅ Database migrations applicate → Vedi `backend/migrations/README-APPLY-009.md`

### Passo 1: Setup Cloudflare R2

Segui la guida completa in [docs/R2_SETUP.md](docs/R2_SETUP.md).

**Riepilogo**:
1. Crea bucket R2 chiamato `sharehub-slides`
2. Genera API credentials (Access Key ID, Secret Access Key)
3. Configura CORS policy per permettere uploads dal browser
4. Salva le credenziali (le userai nel Passo 3)

### Passo 2: Applica Database Migrations

```bash
# Opzione A: Via Supabase CLI
cd backend
npx supabase db push

# Opzione B: Via Supabase Dashboard
# 1. Vai su https://supabase.com/dashboard → SQL Editor
# 2. Copia e incolla il contenuto di backend/migrations/009-r2-storage-migration.sql
# 3. Esegui la query
```

**Verifica migration**:
```sql
-- In Supabase SQL Editor
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'slides'
  AND column_name IN ('r2_key', 'deleted_at');

-- Dovresti vedere:
-- r2_key       | text
-- deleted_at   | timestamp with time zone
```

### Passo 3: Deploy su Netlify

#### Opzione A: Deploy da GitHub (Consigliato)

1. Vai su [Netlify](https://app.netlify.com/)
2. Click **Add new site** → **Import an existing project**
3. Seleziona GitHub e autorizza Netlify
4. Scegli il repository: `3civette/sharehub`
5. Netlify rileverà automaticamente `netlify.toml`
6. **NON** deployare ancora - prima configura le variabili d'ambiente (vedi sotto)

#### Opzione B: Deploy da CLI

```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy (dalla root del progetto)
cd frontend
netlify deploy --prod
```

### Passo 4: Configura Environment Variables su Netlify

Vai su **Site settings → Environment variables** e aggiungi:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key  # ⚠️ SECRET

# Cloudflare R2 Configuration (da Passo 1)
R2_ACCOUNT_ID=a1b2c3d4...your_account_id
R2_ACCESS_KEY_ID=1a2b3c4d...your_access_key_id
R2_SECRET_ACCESS_KEY=A1B2C3D4...your_secret_access_key  # ⚠️ SECRET
R2_BUCKET_NAME=sharehub-slides
```

⚠️ **IMPORTANTE**:
- `SUPABASE_SERVICE_ROLE_KEY` è richiesto per la cleanup function (bypassa RLS)
- Non confondere con `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pubblico)

### Passo 5: Deploy!

1. Click **Deploy site** su Netlify
2. Attendi il completamento del build (2-3 minuti)
3. Netlify ti darà un URL: `https://your-site-name.netlify.app`

### Passo 6: Verifica Deployment

#### Test Upload

1. Vai su `https://your-site.netlify.app/admin/events`
2. Crea un evento e aggiungi una session
3. Carica una slide (prova con un file PDF)
4. **Verifica in R2**: Vai su Cloudflare Dashboard → R2 → `sharehub-slides` → Dovresti vedere il file

#### Test Download

1. Vai alla pagina pubblica dell'evento
2. Click su download di una slide
3. Il file dovrebbe scaricarsi direttamente da R2

#### Test Scheduled Cleanup

La cleanup function viene eseguita automaticamente ogni 6 ore da Netlify.

**Verifica configurazione**:
1. Vai su Netlify Dashboard → **Functions**
2. Dovresti vedere `cleanup` nella lista
3. Click su cleanup → **Logs** per vedere le esecuzioni

**Test manuale** (opzionale):
```bash
# Trigger cleanup manualmente (richiede autenticazione)
curl -X POST https://your-site.netlify.app/api/cleanup
```

### Passo 7: Configura Custom Domain (Opzionale)

1. Vai su Netlify Dashboard → **Domain settings**
2. Click **Add custom domain**
3. Aggiungi il tuo dominio (es. `sharehub.example.com`)
4. Segui le istruzioni per configurare i DNS records
5. Netlify provvederà automaticamente SSL certificate via Let's Encrypt

**Aggiorna CORS su R2**:
Dopo aver aggiunto il custom domain, aggiorna la CORS policy del bucket R2:

```json
{
  "AllowedOrigins": [
    "http://localhost:3000",
    "https://your-site.netlify.app",
    "https://sharehub.example.com"  ← Aggiungi il tuo dominio
  ],
  ...
}
```

---

## 🔧 Deploy Backend Legacy (Deprecato)

⚠️ **Attenzione**: Questa sezione documenta l'architettura legacy (prima di Feature 008). Il backend dedicato verrà rimosso nelle versioni future.

## 🚀 Deploy Frontend su Netlify

### 1. Preparazione

Il repository è già configurato con `netlify.toml` nella root.

### 2. Deploy su Netlify

#### Opzione A: Deploy da GitHub (Consigliato)

1. Vai su [Netlify](https://app.netlify.com/)
2. Click su "Add new site" → "Import an existing project"
3. Seleziona GitHub e autorizza Netlify
4. Scegli il repository: `3civette/sharehub`
5. Netlify rileverà automaticamente le impostazioni da `netlify.toml`
6. Configura le variabili d'ambiente (vedi sotto)
7. Click su "Deploy site"

#### Opzione B: Deploy da CLI

```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy (dalla root del progetto)
netlify deploy --prod
```

### 3. Variabili d'Ambiente su Netlify

Vai su **Site settings → Environment variables** e aggiungi:

```
NEXT_PUBLIC_SUPABASE_URL=https://agmkgrpxgpzqscbkizdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
NEXT_PUBLIC_API_URL=<url_del_backend_deployato>
```

⚠️ **IMPORTANTE**: `NEXT_PUBLIC_API_URL` deve puntare al backend deployato (vedi sezione Backend).

## 🔧 Deploy Backend

Il backend Express **NON può** girare su Netlify. Usa uno di questi servizi:

### Opzione 1: Railway (Consigliato)

1. Vai su [Railway.app](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Seleziona `3civette/sharehub`
4. Configura:
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Aggiungi variabili d'ambiente (vedi sotto)
6. Railway ti darà un URL (es. `https://sharehub-backend.railway.app`)

### Opzione 2: Render

1. Vai su [Render.com](https://render.com/)
2. Click "New +" → "Web Service"
3. Connetti il repository GitHub
4. Configura:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Aggiungi variabili d'ambiente (vedi sotto)

### Opzione 3: Fly.io

```bash
# Installa flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Naviga nel backend
cd backend

# Inizializza
flyctl launch

# Deploy
flyctl deploy
```

### Variabili d'Ambiente Backend

Configura queste variabili nel dashboard del servizio scelto:

```
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://agmkgrpxgpzqscbkizdl.supabase.co
SUPABASE_ANON_KEY=<your_supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
```

## 🔗 Collegamento Frontend-Backend

Dopo aver deployato il backend, copia l'URL e aggiornalo su Netlify:

1. Vai su Netlify Dashboard → Site settings → Environment variables
2. Aggiorna `NEXT_PUBLIC_API_URL` con l'URL del backend
3. Redeploy il frontend

## ✅ Verifica

Dopo il deploy:

1. **Frontend**: Visita il sito Netlify
2. **Backend**: Testa l'API con:
   ```bash
   curl <BACKEND_URL>/health
   ```
3. **Integrazione**: Verifica che il frontend chiami correttamente il backend

## 🔐 Sicurezza

### CORS

Il backend deve permettere richieste dal dominio Netlify. Aggiorna `backend/src/app.ts`:

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-site.netlify.app', // Aggiungi il tuo dominio Netlify
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### Supabase RLS

Verifica che tutte le Row Level Security policies siano attive in Supabase.

## 📊 Monitoraggio

- **Netlify**: Build logs e deploy logs nel dashboard
- **Railway/Render**: Logs in tempo reale nel dashboard
- **Supabase**: Database logs e auth logs nel dashboard

## 🐛 Troubleshooting

### Frontend non si connette al backend

- Verifica che `NEXT_PUBLIC_API_URL` sia corretto
- Controlla i CORS nel backend
- Verifica che il backend sia online

### Errori di build su Netlify

- Controlla i logs di build
- Verifica che tutte le dipendenze siano in `dependencies` (non `devDependencies`)
- Assicurati che Node version sia 20

### Backend crashes

- Controlla i logs del servizio
- Verifica che tutte le variabili d'ambiente siano configurate
- Testa localmente con le stesse variabili d'ambiente

## 📚 Risorse

- [Netlify Docs](https://docs.netlify.com/)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Supabase Docs](https://supabase.com/docs)
