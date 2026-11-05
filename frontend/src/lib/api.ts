import axios, { AxiosError } from 'axios';

/**
 * Isomorphic Base URL resolver:
 * - Browser / Client-side (`typeof window !== 'undefined'`):
 *   Uses an empty string '' so every API request hits the active domain (e.g. https://<tunnel>.trycloudflare.com)
 *   and gets reverse-proxied by Next.js to the backend without loopback failures on mobile/remote devices.
 * - Server-side / SSR (`typeof window === 'undefined'`):
 *   Uses INTERNAL_API_URL ('http://api:5000') or fallback to 'http://localhost:5000'.
 */
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.INTERNAL_API_URL || 'http://localhost:5000';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: true,
});

// Interceptor to inject JWT Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle global 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Dispatch custom event so UI components can react seamlessly
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * Structured API Error Parser
 * Extracts field-level validation errors and primary human-readable message.
 */
export interface ApiErrorResult {
  message: string;
  fieldErrors: Record<string, string>;
  statusCode?: number;
  code?: string;
}

export function getApiErrorMessage(error: unknown): ApiErrorResult {
  const defaultResult: ApiErrorResult = {
    message: 'Terjadi kesalahan pada sistem. Silakan coba beberapa saat lagi.',
    fieldErrors: {},
  };

  if (!error || typeof error !== 'object') {
    return defaultResult;
  }

  const err = error as AxiosError<any> & { message?: string };
  const resData = err.response?.data;

  const result: ApiErrorResult = {
    message: resData?.message || err.message || defaultResult.message,
    fieldErrors: {},
    statusCode: err.response?.status || resData?.statusCode,
    code: resData?.code,
  };

  // Extract structured field-level errors
  if (Array.isArray(resData?.errors)) {
    for (const item of resData.errors) {
      if (item && typeof item === 'object' && item.field && item.message) {
        result.fieldErrors[item.field] = item.message;
        // Map synonyms (phone <-> phoneNumber)
        if (item.field === 'phone') result.fieldErrors['phoneNumber'] = item.message;
        if (item.field === 'phoneNumber') result.fieldErrors['phone'] = item.message;
      }
    }
  }

  // If there are field errors but general message is generic, pick the first specific error message
  const firstFieldKey = Object.keys(result.fieldErrors)[0];
  if (firstFieldKey && result.message === 'Data yang dimasukkan tidak valid') {
    result.message = result.fieldErrors[firstFieldKey] || result.message;
  }

  return result;
}

export default api;
