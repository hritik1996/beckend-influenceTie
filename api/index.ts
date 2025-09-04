// Vercel Serverless Function Entry Point
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from '../src/routes/auth';
import usersRouter from '../src/routes/users';
import influencersRouter from '../src/routes/influencers';
import campaignsRouter from '../src/routes/campaigns';
import messagesRouter from '../src/routes/messages';
import adminRouter from '../src/routes/admin';

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ 
  origin: corsOrigin, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'InfluenceTie API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/influencers', influencersRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/admin', adminRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    message: 'InfluenceTie API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      campaigns: '/api/campaigns',
      messages: '/api/messages',
      admin: '/api/admin'
    }
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Export for Vercel
export default app;
