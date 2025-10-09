# ShareHub Deployment Guide

Questa guida spiega come deployare ShareHub su servizi cloud.

## Architettura

ShareHub è composto da due parti:

1. **Frontend** (Next.js 14) → Netlify
2. **Backend** (Express API) → Railway/Render/Fly.io

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
