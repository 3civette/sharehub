# ShareHub

Multi-tenant web platform for sharing slides and photos at events (hotels, conferences, etc.)

## Features

- 🏢 Multi-tenant architecture with custom branding per tenant
- 📅 Event management (public and private events)
- 📊 Slide deck sharing and downloads
- 🔐 Token-based access control for private events
- 🎨 Customizable branding (logo, colors, fonts)
- 🌙 Dark mode di default (3Civette design palette)
- 🇮🇹 Interfaccia completamente in italiano
- 📱 Responsive design
- 📈 Dashboard con metriche in tempo reale
- 🖼️ Upload drag & drop per foto e slide

## Tech Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase Auth

### Backend
- Node.js 20 LTS
- Express.js
- TypeScript
- Supabase (PostgreSQL + Storage + Auth)

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd sharehub
```

2. Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Configure environment variables
```bash
# Frontend
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your values

# Backend
cd ../backend
# Create .env file (see .env.example in root for all variables)
```

📋 See `.env.example` in root for complete list of required variables

### Running the Application

1. Start the backend
```bash
cd backend
npm run dev
```

2. Start the frontend
```bash
cd frontend
npm run dev
```

3. Open http://localhost:3000

## 🚀 Deployment

### Production Deploy

- **Frontend**: Netlify [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/3civette/sharehub)
- **Backend**: Railway / Render / Fly.io

📖 **Complete deployment guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

### Environment Variables for Production

**Netlify** (Frontend):
Set in Site settings → Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (deployed backend URL)

**Railway/Render** (Backend):
- `NODE_ENV=production`
- `PORT=3001`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Specific test file
npm test tests/contract/dashboard.test.ts
```

## 🎨 Design System

**3Civette Palette**:
- Brand Black: `#0B0B0C`
- Brand Ink: `#111827`
- Brand Gold: `#D4AF37`
- Brand Silver: `#E5E7EB`

See [DARK_MODE.md](./DARK_MODE.md) for implementation details.

## Test Data

See [DatiTest.md](./DatiTest.md) for test credentials and sample data.

## Project Structure

```
sharehub/
├── backend/          # Express API server
│   ├── src/
│   │   ├── routes/   # API routes
│   │   └── app.ts    # Main application
│   └── package.json
├── frontend/         # Next.js application
│   ├── src/
│   │   ├── app/      # App router pages
│   │   ├── components/
│   │   ├── contexts/
│   │   └── lib/
│   └── package.json
└── specs/            # Feature specifications
```

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [DARK_MODE.md](./DARK_MODE.md) - Dark mode implementation
- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [DatiTest.md](./DatiTest.md) - Test data and credentials

## License

ISC

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
