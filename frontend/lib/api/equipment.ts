import type {
  Equipment, EquipmentCreate, EquipmentListResponse, EquipmentStats, EquipmentUpdate,
  Movement, MovementCreate, MovementListResponse,
  StorageDevice, StorageDeviceCreate, StorageDeviceListResponse, StorageDeviceUpdate,
} from "@/types/equipment";
import apiClient from "./client";

export const equipmentApi = {
  getList: async (params?: { skip?: number; limit?: number; equipment_type?: string; status?: string; search?: string }): Promise<EquipmentListResponse> => {
    const { data } = await apiClient.get("/api/equipment/", { params });
    return data;
  },

  getById: async (id: number): Promise<Equipment> => {
    const { data } = await apiClient.get(`/api/equipment/${id}`);
    return data;
  },

  create: async (payload: EquipmentCreate): Promise<Equipment> => {
    const { data } = await apiClient.post("/api/equipment/", payload);
    return data;
  },

  update: async (id: number, payload: EquipmentUpdate): Promise<Equipment> => {
    const { data } = await apiClient.put(`/api/equipment/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/equipment/${id}`);
  },

  createMovement: async (payload: MovementCreate): Promise<Movement> => {
    const { data } = await apiClient.post("/api/equipment/movements", payload);
    return data;
  },

  getMovementHistory: async (equipmentId: number, params?: { skip?: number; limit?: number }): Promise<MovementListResponse> => {
    const { data } = await apiClient.get(`/api/equipment/${equipmentId}/movements`, { params });
    return data;
  },

  getStatistics: async (params?: { equipment_type?: string; status?: string; search?: string }): Promise<EquipmentStats> => {
    const { data } = await apiClient.get("/api/equipment/stats", { params });
    return data;
  },

  getStorageDevices: async (params?: { skip?: number; limit?: number; equipment_id?: number; status?: string; search?: string }): Promise<StorageDeviceListResponse> => {
    const { data } = await apiClient.get("/api/equipment/storage-devices/", { params });
    return data;
  },

  getStorageDeviceById: async (id: number): Promise<StorageDevice> => {
    const { data } = await apiClient.get(`/api/equipment/storage-devices/${id}`);
    return data;
  },

  createStorageDevice: async (payload: StorageDeviceCreate): Promise<StorageDevice> => {
    const { data } = await apiClient.post("/api/equipment/storage-devices/", payload);
    return data;
  },

  updateStorageDevice: async (id: number, payload: StorageDeviceUpdate): Promise<StorageDevice> => {
    const { data } = await apiClient.put(`/api/equipment/storage-devices/${id}`, payload);
    return data;
  },

  deleteStorageDevice: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/equipment/storage-devices/${id}`);
  },
};