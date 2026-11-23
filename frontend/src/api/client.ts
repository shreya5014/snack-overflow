export class ApiError extends Error {
  public code: string;
  public status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('snack_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      if (errorBody && errorBody.error) {
        errorCode = errorBody.error.code || errorCode;
        errorMessage = errorBody.error.message || errorMessage;
      }
    } catch {
      // Body not JSON
    }

    if (response.status === 401 && !endpoint.includes('/login')) {
      // Token expired or invalid
      localStorage.removeItem('snack_token');
      localStorage.removeItem('snack_user');
      window.dispatchEvent(new Event('auth:logout'));
    }

    throw new ApiError(response.status, errorCode, errorMessage);
  }

  return response.json() as Promise<T>;
}
