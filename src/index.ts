import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
// Load environment variables BEFORE importing any modules that depend on them
// Try default CWD first; if nothing is loaded (e.g., running from dist), try project root
const primaryEnv = dotenv.config();
if (!primaryEnv.parsed) {
  try {
    const fallbackEnvPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(fallbackEnvPath)) {
      dotenv.config({ path: fallbackEnvPath });
    }
  } catch (_err) {
    // ignore fallback env load errors
  }
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import passport from './config/passport';

import { registerApiRoutes } from './api';
import { testDatabaseConnection, disconnectDatabase } from './lib/database';

const app = express();

// CORS configuration - support multiple origins for production and development
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production' 
    ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow all influencetie.com subdomains and both HTTP/HTTPS
        if (!origin || /^https?:\/\/(.*\.)?influencetie\.com$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ 
  origin: corsOrigins, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan('dev'));

// Initialize Passport
app.use(passport.initialize());

// Backward-compat redirects for OAuth (in case an old callback URL is used)
// Redirect /auth/google -> /api/v1/auth/google
app.get('/auth/google', (_req: Request, res: Response) => {
  res.redirect(302, '/api/v1/auth/google');
});

// Redirect /auth/google/callback -> /api/v1/auth/google/callback, preserving query string
app.get('/auth/google/callback', (req: Request, res: Response) => {
  const query = req.url.split('?')[1];
  const redirectTo = `/api/v1/auth/google/callback${query ? `?${query}` : ''}`;
  res.redirect(302, redirectTo);
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'InfluenceTie API' });
});

registerApiRoutes(app);

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
    // Railway-specific database setup removed
    
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


