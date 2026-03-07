import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { companyRoutes } from './routes/companies';
import { agentRoutes } from './routes/agents';
import { reportRoutes } from './routes/reports';
import { userRoutes } from './routes/users';

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

// API Routes
app.use('/api', companyRoutes);
app.use('/api', agentRoutes);
app.use('/api', reportRoutes);
app.use('/api', userRoutes);

// Serve web app static files (built app)
const appDist = path.join(__dirname, '../../app/dist');
app.use(express.static(appDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(appDist, 'index.html'));
});

export default app;
