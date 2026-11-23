export type SnackCategory = 'SWEET' | 'SAVOURY' | 'DRINK' | 'HEALTHY_ISH';

export type StockStatus = 'STOCKED' | 'RUNNING_LOW' | 'GONE';

export interface Snack {
  id: string;
  name: string;
  category: SnackCategory;
  quantity: number;
  lowStockThreshold: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  voteCount: number;
  derivedStatus: StockStatus;
  hasVoted: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface SnacksResponse {
  success: boolean;
  data: Snack[];
  pagination: Pagination;
}

export interface SnackOfTheWeekData {
  snack: {
    id: string;
    name: string;
    category: SnackCategory;
    quantity: number;
    lowStockThreshold: number;
    weeklyVoteCount: number;
  } | null;
  weeklyVoteCount: number;
  weekWindow: {
    timezone: string;
    startOfWeek: string;
    endOfWeek: string;
  };
}

export interface CreateSnackPayload {
  name: string;
  category: SnackCategory;
  quantity?: number;
  lowStockThreshold?: number;
}

export interface UpdateSnackPayload {
  name?: string;
  category?: SnackCategory;
  lowStockThreshold?: number;
}
