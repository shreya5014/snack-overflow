import { z } from 'zod';
import { SnackCategory } from '@prisma/client';

export const DerivedStockStatusEnum = z.enum(['STOCKED', 'RUNNING_LOW', 'GONE']);
export type DerivedStockStatus = z.infer<typeof DerivedStockStatusEnum>;

export const querySnacksSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, { message: 'Page must be a positive integer' }),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 50, {
      message: 'Limit must be between 1 and 50',
    }),
  search: z.string().optional(),
  category: z.nativeEnum(SnackCategory).optional(),
  status: DerivedStockStatusEnum.optional(),
});

export type QuerySnacksInput = z.infer<typeof querySnacksSchema>;

export const createSnackSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  category: z.nativeEnum(SnackCategory, { errorMap: () => ({ message: 'Invalid snack category' }) }),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .nonnegative('Quantity cannot be negative')
    .default(0),
  lowStockThreshold: z
    .number()
    .int('Low stock threshold must be an integer')
    .positive('Low stock threshold must be greater than zero')
    .default(5),
});

export type CreateSnackInput = z.infer<typeof createSnackSchema>;

export const updateSnackSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category: z.nativeEnum(SnackCategory).optional(),
  lowStockThreshold: z.number().int().positive().optional(),
});

export type UpdateSnackInput = z.infer<typeof updateSnackSchema>;

export const amountActionSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .int('Amount must be an integer')
    .positive('Amount must be a positive integer greater than zero'),
});

export type AmountActionInput = z.infer<typeof amountActionSchema>;

export const checkoutItemSchema = z.object({
  snackId: z.string().min(1, 'Snack ID is required'),
  amount: z
    .number({ required_error: 'Amount is required' })
    .int('Amount must be an integer')
    .positive('Amount must be a positive integer greater than zero'),
});

export const checkoutSchema = z.object({
  items: z
    .array(checkoutItemSchema)
    .min(1, 'Cart cannot be empty')
    .max(30, 'Cart exceeds maximum 30 items limit'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
