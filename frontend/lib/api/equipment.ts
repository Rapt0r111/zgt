import apiClient from './client';
import type {
  Equipment,
  EquipmentCreate,
  EquipmentUpdate,
  EquipmentListResponse,
  Movement,
  MovementCreate,
  MovementListResponse,
  StorageDevice,
  StorageDeviceCreate,
  StorageDeviceUpdate,
  StorageDeviceListResponse,
  SealCheckRequest,
  SealCheckResponse,
  EquipmentStats,
  SealIssuesResponse
} from '@/types/equipment';

export const equipmentApi = {
  // ============ EQUIPMENT ============
  
  getList: async (params?: {
    skip?: number;
    limit?: number;
    equipment_type?: string;
    status?: string;
    search?: string;
  }): Promise<EquipmentListResponse> => {
    const response = await apiClient.get('/api/equipment', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Equipment> => {
    const response = await apiClient.get(`/api/equipment/${id}`);
    return response.data;
  },

  create: async (data: EquipmentCreate): Promise<Equipment> => {
    const response = await apiClient.post('/api/equipment', data);
    return response.data;
  },

  update: async (id: number, data: EquipmentUpdate): Promise<Equipment> => {
    const response = await apiClient.put(`/api/equipment/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/equipment/${id}`);
  },

  // ============ MOVEMENTS ============

  createMovement: async (data: MovementCreate): Promise<Movement> => {
    const response = await apiClient.post('/api/equipment/movements', data);
    return response.data;
  },

  getMovementHistory: async (
    equipmentId: number,
    params?: { skip?: number; limit?: number }
  ): Promise<MovementListResponse> => {
    const response = await apiClient.get(`/api/equipment/${equipmentId}/movements`, { params });
    return response.data;
  },

  // ============ SEALS ============

  checkSeals: async (data: SealCheckRequest): Promise<SealCheckResponse> => {
    const response = await apiClient.post('/api/equipment/seals/check', data);
    return response.data;
  },

  getSealIssues: async (): Promise<SealIssuesResponse> => {
    const response = await apiClient.get('/api/equipment/seals/issues');
    return response.data;
  },

  // ============ STATISTICS ============

  getStatistics: async (): Promise<EquipmentStats> => {
    const response = await apiClient.get('/api/equipment/stats');
    return response.data;
  },

  // ============ STORAGE DEVICES ============

  getStorageDevices: async (params?: {
    skip?: number;
    limit?: number;
    equipment_id?: number;
    status?: string;
    search?: string;
  }): Promise<StorageDeviceListResponse> => {
    const response = await apiClient.get('/api/equipment/storage-devices', { params });
    return response.data;
  },

  getStorageDeviceById: async (id: number): Promise<StorageDevice> => {
    const response = await apiClient.get(`/api/equipment/storage-devices/${id}`);
    return response.data;
  },

  createStorageDevice: async (data: StorageDeviceCreate): Promise<StorageDevice> => {
    const response = await apiClient.post('/api/equipment/storage-devices', data);
    return response.data;
  },

  updateStorageDevice: async (id: number, data: StorageDeviceUpdate): Promise<StorageDevice> => {
    const response = await apiClient.put(`/api/equipment/storage-devices/${id}`, data);
    return response.data;
  },

  deleteStorageDevice: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/equipment/storage-devices/${id}`);
  },
};