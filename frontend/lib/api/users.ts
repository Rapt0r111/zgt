import apiClient from './client';
import type { 
  User, 
  UserCreate, 
  UserUpdate, 
  UserListResponse,
  ChangePasswordRequest 
} from '@/types/user';

export const usersApi = {
  getList: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<UserListResponse> => {
    const response = await apiClient.get('/api/users/', { params });
    return response.data;
  },

  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  create: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post('/api/users/', data);
    return response.data;
  },

  update: async (id: number, data: UserUpdate): Promise<User> => {
    const response = await apiClient.put(`/api/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },

  changePassword: async (id: number, data: ChangePasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/users/${id}/change-password`, data);
    return response.data;
  },

  toggleActive: async (id: number): Promise<{ message: string; is_active: boolean }> => {
    const response = await apiClient.post(`/api/users/${id}/toggle-active`);
    return response.data;
  },
};