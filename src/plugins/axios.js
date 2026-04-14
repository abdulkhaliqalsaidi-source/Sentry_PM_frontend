import axios from 'axios';
import router from '../router';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
});

// Request Interceptor: Attach Access Token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh on 401 + 403 permission denied
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 403 - Permission Denied: dispatch global event for UI feedback
    if (error.response && error.response.status === 403) {
      window.dispatchEvent(new CustomEvent('permission-denied', {
        detail: { url: originalRequest.url, message: error.response.data?.detail || 'ليس لديك صلاحية لهذا الإجراء' }
      }));
      return Promise.reject(error);
    }

    // 401 - Unauthorized: try token refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post('/api/token/refresh/', {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error('Session expired. Redirecting to login...');
          localStorage.clear();
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.clear();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
