# Cloudflare R2 Setup Guide

Questa guida spiega come configurare Cloudflare R2 per l'archiviazione ZIP post-evento.

## Architettura

```
Hot Storage (Fly.io Volume 5GB)     Cold Storage (Cloudflare R2)
┌────────────────────────┐          ┌────────────────────────┐
│ File originali         │          │ ZIP archivio           │
│ Disponibili 7 giorni   │ ───────> │ Permanenti             │
│ Per partecipanti       │          │ Per organizzatori      │
└────────────────────────┘          └────────────────────────┘
```

## Vantaggi R2

- ✅ **Storage economico**: $0.015/GB (dopo 10GB free)
- ✅ **Bandwidth GRATIS**: Download illimitati senza costi
- ✅ **CDN globale**: Download veloci ovunque
- ✅ **ZIP permanenti**: Organizzatori possono riscaricare quando vogliono
- ✅ **S3-compatible**: Usa AWS SDK

## Setup Cloudflare R2

### 1. Crea Bucket

1. Vai su [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click su **R2** nel menu laterale
3. Click **Create bucket**
4. Nome: `sharehub-zips`
5. Location: **Automatic** (ottimizza latency)
6. Click **Create bucket**

### 2. Genera API Token

1. Nel bucket, vai su **Settings**
2. Scroll fino a **R2 API tokens**
3. Click **Create API token**
4. Permessi: **Object Read & Write**
5. Scope: Solo `sharehub-zips` bucket
6. Click **Create API token**
7. **Copia e salva** le credenziali:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (es. `https://xxx.r2.cloudflarestorage.com`)

⚠️ **Importante**: Salva le credenziali ora, non le potrai vedere di nuovo!

### 3. Configura Public Access (Opzionale)

Se vuoi URL pubblici senza autenticazione:

1. Bucket Settings → **Public Access**
2. Click **Allow Access**
3. Scegli dominio personalizzato o usa R2.dev
4. Esempio: `https://sharehub-zips.r2.dev`

### 4. Configura Secrets su Fly.io

```bash
fly secrets set \
  R2_ACCOUNT_ID="your_account_id" \
  R2_ACCESS_KEY_ID="your_access_key_id" \
  R2_SECRET_ACCESS_KEY="your_secret_access_key" \
  R2_BUCKET_NAME="sharehub-zips" \
  R2_PUBLIC_URL="https://sharehub-zips.r2.dev"
```

**Come trovare R2_ACCOUNT_ID**:
- Dashboard → R2 → Settings
- Oppure dall'endpoint URL: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### 5. Installa AWS SDK

```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Workflow Post-Evento

### Giorno dell'evento
- File caricati su Fly.io volume (`/data/events/`)
- Partecipanti scaricano file singoli

### 24h dopo evento
Cronjob automatico (ore 2 AM):
1. Genera ZIP di tutti i file
2. Upload ZIP su R2
3. Invia email a organizzatore con link R2
4. Cancella file originali da Fly.io

### 7 giorni dopo
- File originali già cancellati
- ZIP rimane su R2 per sempre (o finché decidi)

## Costi

### Storage
- **10GB free**, poi $0.015/GB/mese
- 60GB (1 anno, 80 eventi) = $0.75/mese
- 300GB (5 anni) = $4.35/mese

### Bandwidth
- **GRATIS illimitato** 🎉
- Nessun costo egress

### Operazioni
- **1 milione read/mese free**, poi $0.36/milione
- **1 milione write/mese free**, poi $4.50/milione
- Praticamente gratis per il tuo volume

**Totale anno 1**: ~$0.75/mese

## Test Locale

```bash
# Test R2 connection
node -e "
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const test = async () => {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: 'test.txt',
    Body: 'Hello from ShareHub!'
  }));
  console.log('✅ R2 connection successful!');
};

test();
"
```

## Troubleshooting

### "Access Denied"
- Verifica API token permissions
- Controlla bucket name sia corretto

### "Invalid endpoint"
- Endpoint deve essere `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- Non include `/bucketname`

### ZIP non si scarica
- Verifica public access sia abilitato
- Oppure usa signed URLs (valide 7 giorni)

## Risorse

- [R2 Docs](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
