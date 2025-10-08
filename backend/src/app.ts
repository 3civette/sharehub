import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import tenantsRouter from './routes/tenants';
import eventsRouter from './routes/events';
import slidesRouter from './routes/slides';
import dashboardRouter from './routes/dashboard';
import brandingRouter from './routes/branding';
// Admin panel routes (Feature 002)
import adminBrandingRouter from './routes/admin-branding';
import adminSettingsRouter from './routes/admin-settings';
import adminEventsRouter from './routes/admin-events';
import { adminAuth, verifyTenantAccess } from './middleware/adminAuth';

// Event Flow routes (Feature 003)
import eventFlowRoutes from './routes/eventFlowRoutes';
import sessionRoutes from './routes/sessionRoutes';
import speechRoutes from './routes/speechRoutes';
import slideRoutes from './routes/slideRoutes';
import dashboardFlowRoutes from './routes/dashboardRoutes';
import publicRoutes from './routes/publicRoutes';

// Public Event Page routes (Feature 004)
import publicEventRoutes from './routes/publicEventRoutes';

// Event Dashboard routes (Feature 005)
import eventDashboardRoutes from './routes/eventDashboard';
import adminSessionRoutes from './routes/admin-sessions';
import adminSpeechRoutes from './routes/admin-speeches';
import adminSlideRoutes from './routes/admin-slides';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/tenants', tenantsRouter);
app.use('/events', eventsRouter);
app.use('/slides', slidesRouter);
app.use('/dashboard', dashboardRouter);
app.use('/', brandingRouter);

// Admin panel routes (Feature 002 - with auth middleware)
app.use('/branding', adminAuth, verifyTenantAccess, adminBrandingRouter);
app.use('/settings', adminAuth, verifyTenantAccess, adminSettingsRouter);
app.use('/admin/events', adminAuth, adminEventsRouter);

// Event Flow routes (Feature 003 - with token-based auth in routes)
app.use('/api/events', eventFlowRoutes);
app.use('/api', sessionRoutes);
app.use('/api', speechRoutes);
app.use('/api', slideRoutes);
app.use('/api', dashboardFlowRoutes);
app.use('/api', publicRoutes);

// Public Event Page routes (Feature 004 - no auth required)
app.use('/api/public', publicEventRoutes);

// Event Dashboard routes (Feature 005 - admin auth required)
app.use('/api/admin/events', eventDashboardRoutes);
app.use('/api/admin', adminSessionRoutes);
app.use('/api/admin', adminSpeechRoutes);
app.use('/api/admin', adminSlideRoutes);

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

