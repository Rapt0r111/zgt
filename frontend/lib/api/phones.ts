import apiClient from './client';
import type { Phone, PhoneCreate, PhoneUpdate, PhoneListResponse, StatusReport } from '@/types/phone';

export const phonesApi = {
  getList: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
    search?: string;
    owner_id?: number;
  }): Promise<PhoneListResponse> => {
    // ИСПРАВЛЕНО: Добавлен слеш в конце
    const response = await apiClient.get('/api/phones/', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Phone> => {
    const response = await apiClient.get(`/api/phones/${id}`);
    return response.data;
  },

  create: async (data: PhoneCreate): Promise<Phone> => {
    // ИСПРАВЛЕНО: Добавлен слеш в конце
    const response = await apiClient.post('/api/phones/', data);
    return response.data;
  },

  update: async (id: number, data: PhoneUpdate): Promise<Phone> => {
    const response = await apiClient.put(`/api/phones/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/phones/${id}`);
  },

  batchCheckin: async (phoneIds: number[]): Promise<{ message: string; count: number }> => {
    const response = await apiClient.post('/api/phones/batch-checkin', { phone_ids: phoneIds });
    return response.data;
  },

  batchCheckout: async (phoneIds: number[]): Promise<{ message: string; count: number }> => {
    const response = await apiClient.post('/api/phones/batch-checkout', { phone_ids: phoneIds });
    return response.data;
  },

  getStatusReport: async (): Promise<StatusReport> => {
    const response = await apiClient.get('/api/phones/reports/status');
    return response.data;
  },
};