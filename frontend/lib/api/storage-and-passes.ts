import type {
  AssignmentRequest, StorageAndPass, StorageAndPassCreate,
  StorageAndPassListResponse, StorageAndPassUpdate,
} from "@/types/storage-and-passes";
import apiClient from "./client";

interface StorageStats {
  total_assets: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

export const storageAndPassesApi = {
  getList: async (params?: {
    skip?: number; limit?: number; asset_type?: string; status?: string; search?: string;
  }): Promise<StorageAndPassListResponse> => {
    const { data } = await apiClient.get("/api/storage-and-passes/", { params });
    return data;
  },

  getStatistics: async (params?: {
    asset_type?: string; status?: string; search?: string;
  }): Promise<StorageStats> => {
    const { data } = await apiClient.get("/api/storage-and-passes/stats", { params });
    return data;
  },

  getById: async (id: number): Promise<StorageAndPass> => {
    const { data } = await apiClient.get(`/api/storage-and-passes/${id}`);
    return data;
  },

  create: async (payload: StorageAndPassCreate): Promise<StorageAndPass> => {
    const { data } = await apiClient.post("/api/storage-and-passes/", payload);
    return data;
  },

  update: async (id: number, payload: StorageAndPassUpdate): Promise<StorageAndPass> => {
    const { data } = await apiClient.patch(`/api/storage-and-passes/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/storage-and-passes/${id}`);
  },

  assign: async (id: number, request: AssignmentRequest): Promise<StorageAndPass> => {
    const { data } = await apiClient.post(`/api/storage-and-passes/${id}/assign`, request);
    return data;
  },

  revoke: async (id: number): Promise<StorageAndPass> => {
    const { data } = await apiClient.post(`/api/storage-and-passes/${id}/revoke`);
    return data;
  },
};