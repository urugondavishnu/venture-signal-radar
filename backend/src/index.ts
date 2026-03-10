import app from './app';
import { startScheduler } from './schedulers/daily-pipeline';

const PORT = process.env.PORT || 3001;

// Start daily intelligence pipeline scheduler (local/persistent server only)
startScheduler();

const server = app.listen(PORT, () => {
  console.log(`[Server] Daily Delta running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

export default app;
