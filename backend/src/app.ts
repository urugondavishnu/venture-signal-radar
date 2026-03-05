import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { companyRoutes } from './routes/companies';
import { agentRoutes } from './routes/agents';
import { reportRoutes } from './routes/reports';
import { userRoutes } from './routes/users';
import { cronRoutes } from './routes/cron';

const app = express();

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
app.use('/api', cronRoutes);

export default app;
