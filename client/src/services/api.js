import axios from 'axios';
import { refreshSocketAuth } from './socket';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api',
  withCredentials: true,
});

let accessToken = localStorage.getItem(
  'booknest_access_token'
);

export function setAccessToken(token) {
  accessToken = token;

  if (token) {
    localStorage.setItem(
      'booknest_access_token',
      token
    );
  } else {
    localStorage.removeItem(
      'booknest_access_token'
    );
  }

  // Keep the Socket.io handshake authentication
  // synchronized with the latest access token.
  refreshSocketAuth();
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Transparent access-token refresh + request retry.
let refreshing = false;
let queued = [];

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const original = error.config;

    if (
      error.response?.status !== 401 ||
      original?._retry ||
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/signup') ||
      original?.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    // Another request is already refreshing the token.
    // Wait for that refresh to complete.
    if (refreshing) {
      return new Promise((resolve, reject) => {
        queued.push({
          resolve,
          reject,
        });
      }).then((token) => {
        original._retry = true;

        original.headers.Authorization =
          `Bearer ${token}`;

        return api(original);
      });
    }

    refreshing = true;
    original._retry = true;

    try {
      const { data } = await api.post(
        '/auth/refresh'
      );

      // This also updates Socket.io authentication.
      setAccessToken(data.accessToken);

      queued.forEach(({ resolve }) => {
        resolve(data.accessToken);
      });

      queued = [];

      original.headers.Authorization =
        `Bearer ${data.accessToken}`;

      return api(original);
    } catch (refreshError) {
      queued.forEach(({ reject }) => {
        reject(refreshError);
      });

      queued = [];

      setAccessToken(null);

      return Promise.reject(refreshError);
    } finally {
      refreshing = false;
    }
  }
);

export default api;