import { apiClient } from './client.js';
import {
  CreateSnackPayload,
  Snack,
  SnackCategory,
  SnackOfTheWeekData,
  SnacksResponse,
  StockStatus,
  UpdateSnackPayload,
} from '../types/snack.js';
import { AuthResponse, User } from '../types/auth.js';

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await apiClient<{ success: boolean; data: AuthResponse }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return res.data;
}

export async function fetchMe(): Promise<User> {
  const res = await apiClient<{ success: boolean; data: User }>('/api/auth/me');
  return res.data;
}

export interface SnacksFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: SnackCategory | 'ALL';
  status?: StockStatus | 'ALL';
}

export async function fetchSnacks(filters: SnacksFilters = {}): Promise<SnacksResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
  if (filters.category && filters.category !== 'ALL') params.append('category', filters.category);
  if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);

  const queryString = params.toString();
  const endpoint = queryString ? `/api/snacks?${queryString}` : '/api/snacks';

  return apiClient<SnacksResponse>(endpoint);
}

export async function fetchSnackOfTheWeek(): Promise<SnackOfTheWeekData> {
  const res = await apiClient<{ success: boolean; data: SnackOfTheWeekData }>(
    '/api/snacks/snack-of-the-week'
  );
  return res.data;
}

export async function createSnack(payload: CreateSnackPayload): Promise<Snack> {
  const res = await apiClient<{ success: boolean; data: Snack }>('/api/snacks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateSnack(id: string, payload: UpdateSnackPayload): Promise<Snack> {
  const res = await apiClient<{ success: boolean; data: Snack }>(`/api/snacks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteSnack(id: string): Promise<void> {
  await apiClient<{ success: boolean; message: string }>(`/api/snacks/${id}`, {
    method: 'DELETE',
  });
}

export async function restockSnack(id: string, amount: number): Promise<{ snack: Snack; log: any }> {
  const res = await apiClient<{ success: boolean; data: { snack: Snack; log: any } }>(
    `/api/snacks/${id}/restock`,
    {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }
  );
  return res.data;
}

export async function consumeSnack(id: string, amount: number = 1): Promise<{ snack: Snack; log: any }> {
  const res = await apiClient<{ success: boolean; data: { snack: Snack; log: any } }>(
    `/api/snacks/${id}/consume`,
    {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }
  );
  return res.data;
}

export async function voteForSnack(id: string): Promise<void> {
  await apiClient<{ success: boolean; message: string; data: any }>(`/api/snacks/${id}/vote`, {
    method: 'POST',
  });
}

export async function checkoutCart(items: { snackId: string; amount: number }[]): Promise<any> {
  const res = await apiClient<{ success: boolean; message: string; data: any }>('/api/snacks/checkout', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  return res.data;
}
