import apiClient from './client';
import type { Personnel, PersonnelCreate, PersonnelUpdate, PersonnelListResponse } from '@/types/personnel';

export const personnelApi = {
  getList: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PersonnelListResponse> => {
    // ИСПРАВЛЕНО: Добавлен слеш в конце
    const response = await apiClient.get('/api/personnel/', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Personnel> => {
    const response = await apiClient.get(`/api/personnel/${id}`);
    return response.data;
  },

  create: async (data: PersonnelCreate): Promise<Personnel> => {
    // ИСПРАВЛЕНО: Добавлен слеш в конце
    const response = await apiClient.post('/api/personnel/', data);
    return response.data;
  },

  update: async (id: number, data: PersonnelUpdate): Promise<Personnel> => {
    const response = await apiClient.put(`/api/personnel/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/personnel/${id}`);
  },

  checkClearance: async (id: number) => {
    const response = await apiClient.get(`/api/personnel/${id}/clearance/check`);
    return response.data;
  },
};