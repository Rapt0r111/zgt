import axios from 'axios';
import { toast } from 'sonner';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

// CSRF token storage
let csrfToken: string | null = null;

// Response interceptor - capture CSRF token and handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Capture CSRF token from headers
    if (response.headers['x-csrf-token']) {
      csrfToken = response.headers['x-csrf-token'];
      console.log('✅ CSRF token captured');
    }
    return response;
  },
  (error) => {
    console.error('API Error Details:', error.response?.data);
    
    // Log validation errors in detail
    if (error.response?.status === 422) {
      console.error('Validation Error:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        toast.error('Сессия истекла');
        window.location.href = '/login';
      }
    }
    
    // Handle CSRF errors
    if (error.response?.status === 403 && error.response?.data?.detail?.includes('CSRF')) {
      toast.error('Ошибка безопасности. Обновите страницу.');
    } else if (error.response?.status === 403) {
      toast.error('Недостаточно прав');
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      toast.error('Слишком много запросов. Попробуйте позже.');
    }
    
    // Handle server errors
    if (error.response?.status === 500) {
      toast.error('Ошибка сервера');
    }
    
    // Handle service unavailable
    if (error.response?.status === 503) {
      toast.error('Сервис временно недоступен');
    }
    
    return Promise.reject(error);
  }
);

// Request interceptor - attach CSRF token to mutating requests
apiClient.interceptors.request.use((config) => {
  // Attach CSRF token to POST/PUT/PATCH/DELETE requests
  const mutatingMethods = ['post', 'put', 'patch', 'delete'];
  if (mutatingMethods.includes(config.method?.toLowerCase() || '')) {
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    } else {
      console.warn('⚠️  CSRF token not available for mutating request');
    }
  }
  
  return config;
});

export default apiClient;