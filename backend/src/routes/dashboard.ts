import express from 'express';
import { getDashboardMetrics } from '../services/metrics';
import { getRecentActivities } from '../services/activityLogger';

const router = express.Router();

// GET /api/dashboard/metrics/:tenantId
router.get('/metrics/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const metrics = await getDashboardMetrics(tenantId);
    res.json(metrics);
  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/activity/:tenantId
router.get('/activity/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    const activities = await getRecentActivities(tenantId, limit);
    res.json({ activities });
  } catch (error: any) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
