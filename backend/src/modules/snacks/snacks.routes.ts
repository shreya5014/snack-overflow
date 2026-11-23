import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  checkoutHandler,
  consumeHandler,
  createSnackHandler,
  deleteSnackHandler,
  getSnackHandler,
  listSnacksHandler,
  restockHandler,
  snackOfTheWeekHandler,
  updateSnackHandler,
  voteHandler,
} from './snacks.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  amountActionSchema,
  checkoutSchema,
  createSnackSchema,
  querySnacksSchema,
  updateSnackSchema,
} from './snacks.validation.js';

export const snacksRouter = Router();

// Public / Authenticated Pantry Listing
snacksRouter.get('/', authenticate, validate(querySnacksSchema, 'query'), listSnacksHandler);

// Snack of the Week (must precede /:id)
snacksRouter.get('/snack-of-the-week', authenticate, snackOfTheWeekHandler);

// Multi-Item Batch Checkout (must precede /:id)
snacksRouter.post('/checkout', authenticate, validate(checkoutSchema, 'body'), checkoutHandler);

// Single Snack Details
snacksRouter.get('/:id', authenticate, getSnackHandler);

// Admin-Only: Create Snack
snacksRouter.post('/', authenticate, authorize(Role.ADMIN), validate(createSnackSchema, 'body'), createSnackHandler);

// Admin-Only: Update Snack
snacksRouter.put('/:id', authenticate, authorize(Role.ADMIN), validate(updateSnackSchema, 'body'), updateSnackHandler);

// Admin-Only: Soft Delete Snack
snacksRouter.delete('/:id', authenticate, authorize(Role.ADMIN), deleteSnackHandler);

// Admin-Only: Restock Snack
snacksRouter.post(
  '/:id/restock',
  authenticate,
  authorize(Role.ADMIN),
  validate(amountActionSchema, 'body'),
  restockHandler
);

// Members & Admins: Consume Snack
snacksRouter.post(
  '/:id/consume',
  authenticate,
  validate(amountActionSchema, 'body'),
  consumeHandler
);

// Members & Admins: Vote for Snack
snacksRouter.post('/:id/vote', authenticate, voteHandler);
