# ShareHub Backend - Fly.io Deployment

Questa guida spiega come deployare il backend ShareHub su Fly.io.

## Prerequisiti

1. Installa Fly.io CLI:
   ```bash
   # Windows (PowerShell)
   pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

   # macOS/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. Login a Fly.io:
   ```bash
   fly auth login
   ```

## Deploy

### 1. Prima volta (crea app)

```bash
cd backend

# Crea l'app su Fly.io
fly launch --no-deploy

# Configura variabili d'ambiente
fly secrets set \
  SUPABASE_URL="https://agmkgrpxgpzqscbkizdl.supabase.co" \
  SUPABASE_ANON_KEY="your_anon_key" \
  SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Deploy
fly deploy
```

### 2. Deploy successivi

```bash
cd backend
fly deploy
```

## Variabili d'Ambiente

Le seguenti variabili devono essere configurate con `fly secrets set`:

- `SUPABASE_URL`: URL del progetto Supabase
- `SUPABASE_ANON_KEY`: Chiave anonima Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chiave service role Supabase

⚠️ **NOTA**: `PORT` e `NODE_ENV` sono già configurati in `fly.toml`.

## URL Backend

Dopo il deploy, Fly.io fornirà un URL tipo:
```
https://sharehub-backend.fly.dev
```

Usa questo URL per configurare `NEXT_PUBLIC_API_URL` su Netlify.

## Comandi Utili

```bash
# Vedi status
fly status

# Vedi logs in tempo reale
fly logs

# Apri dashboard
fly dashboard

# SSH nel container
fly ssh console

# Scale VM
fly scale memory 512  # Aumenta RAM a 512MB
fly scale count 2     # Aumenta a 2 istanze
```

## Troubleshooting

### Health check fallisce

Verifica che `/health` endpoint risponda:
```bash
curl https://sharehub-backend.fly.dev/health
```

### Deploy fallisce

Controlla i logs:
```bash
fly logs
```

### Out of memory

Aumenta RAM (costa extra):
```bash
fly scale memory 512
```

## Costi

- **Free tier**: 3 VM shared-cpu-1x (256MB RAM) + 3GB storage + 160GB transfer
- Il backend usa 1 VM → **gratis** finché rimani nel free tier
- Se serve più potenza: ~$5-10/mese

## Risorse

- [Fly.io Docs](https://fly.io/docs/)
- [Fly.io Pricing](https://fly.io/docs/about/pricing/)
