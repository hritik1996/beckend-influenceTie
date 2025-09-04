import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import influencersRouter from './routes/influencers';
import campaignsRouter from './routes/campaigns';
import messagesRouter from './routes/messages';
import adminRouter from './routes/admin';
import { testDatabaseConnection, disconnectDatabase } from './lib/database';

dotenv.config();

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'InfluenceTie API' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/influencers', influencersRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/admin', adminRouter);

// Basic error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Narrow unknown to Error safely
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  if (err) {
    console.error(err);
  }
  res.status(500).json({ message });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Start server with database connection test
async function startServer() {
  try {
    // Railway-specific database setup
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('🚂 Railway environment detected');
      try {
        const { setupRailwayDatabase } = require('../scripts/railway-setup.js');
        await setupRailwayDatabase();
      } catch (setupError) {
        const message = setupError instanceof Error ? setupError.message : String(setupError);
        console.log('Database setup skipped:', message);
      }
    }
    
    // Test database connection
    const isDbConnected = await testDatabaseConnection();
    if (!isDbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 InfluenceTie API listening on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed.');
        await disconnectDatabase();
        console.log('Graceful shutdown complete.');
        process.exit(0);
      });
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();


