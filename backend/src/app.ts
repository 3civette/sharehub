import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tenantsRouter from './routes/tenants';
import eventsRouter from './routes/events';
import slidesRouter from './routes/slides';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/tenants', tenantsRouter);
app.use('/events', eventsRouter);
app.use('/slides', slidesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ShareHub backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL}`);
});

export default app;
