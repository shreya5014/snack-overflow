import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Role } from '@prisma/client';
import { authRouter } from './modules/auth/auth.routes.js';
import { snacksRouter } from './modules/snacks/snacks.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './errors/AppError.js';
import { authenticate } from './middleware/authenticate.js';
import { authorize } from './middleware/authorize.js';

// Resolve frontend dist whether run from root or from /backend
const frontendDist = fs.existsSync(path.resolve(process.cwd(), 'frontend/dist'))
  ? path.resolve(process.cwd(), 'frontend/dist')
  : path.resolve(process.cwd(), '../frontend/dist');

export const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Feature Routes
app.use('/api/auth', authRouter);
app.use('/api/snacks', snacksRouter);

// Test Verification Route for RBAC (non-production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test-admin-only', authenticate, authorize(Role.ADMIN), (_req, res) => {
    res.status(200).json({ success: true, message: 'Welcome Admin' });
  });
}

// Serve Frontend Static Files if build exists
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 Route Handler for unmatched API routes
app.use((_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Resource or endpoint not found'));
});

// Centralized Error Handler
app.use(errorHandler);

