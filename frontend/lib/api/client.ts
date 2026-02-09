import axios from 'axios';
import { toast } from 'sonner';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ← ВАЖНО! Для работы с cookies
});

// Обработка ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response || error);
    
    if (error.response?.status === 401) {
      // Не перенаправляем на /login если мы уже там
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 403) {
      toast.error('Недостаточно прав');
    }
    
    if (error.response?.status === 500) {
      toast.error('Ошибка сервера');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;