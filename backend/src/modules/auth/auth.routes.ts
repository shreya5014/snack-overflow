import { Router } from 'express';
import { loginHandler, meHandler } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { loginSchema } from './auth.validation.js';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema, 'body'), loginHandler);
authRouter.get('/me', authenticate, meHandler);
