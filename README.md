# ShareHub

Multi-tenant web platform for sharing slides and photos at events (hotels, conferences, etc.)

## Features

- 🏢 Multi-tenant architecture with custom branding per tenant
- 📅 Event management (public and private events)
- 📊 Slide deck sharing and downloads
- 🔐 Token-based access control for private events
- 🎨 Customizable branding (logo, colors, fonts)
- 📱 Responsive design

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

2. Install backend dependencies
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. Install frontend dependencies
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

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

## License

ISC
