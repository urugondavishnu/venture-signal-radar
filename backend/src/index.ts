import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { companyRoutes } from './routes/companies';
import { agentRoutes } from './routes/agents';
import { reportRoutes } from './routes/reports';
import { userRoutes } from './routes/users';
import { startScheduler } from './schedulers/daily-pipeline';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', companyRoutes);
app.use('/api', agentRoutes);
app.use('/api', reportRoutes);
app.use('/api', userRoutes);

// Start daily intelligence pipeline scheduler
startScheduler();

const server = app.listen(PORT, () => {
  console.log(`[Server] Venture Signal Tracker running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

export default app;
