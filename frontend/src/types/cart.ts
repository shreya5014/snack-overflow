import { Snack } from './snack.js';

export interface CartItem {
  snack: Snack;
  quantity: number;
}

export interface CheckoutPayloadItem {
  snackId: string;
  amount: number;
}
