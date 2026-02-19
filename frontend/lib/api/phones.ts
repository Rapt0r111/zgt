import type { Phone, PhoneCreate, PhoneListResponse, PhoneUpdate, StatusReport } from "@/types/phone";
import apiClient from "./client";

export const phonesApi = {
  getList: async (params?: { skip?: number; limit?: number; status?: string; search?: string; owner_id?: number }): Promise<PhoneListResponse> => {
    const { data } = await apiClient.get("/api/phones/", { params });
    return data;
  },

  getById: async (id: number): Promise<Phone> => {
    const { data } = await apiClient.get(`/api/phones/${id}`);
    return data;
  },

  create: async (payload: PhoneCreate): Promise<Phone> => {
    const { data } = await apiClient.post("/api/phones/", payload);
    return data;
  },

  update: async (id: number, payload: PhoneUpdate): Promise<Phone> => {
    const { data } = await apiClient.put(`/api/phones/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/phones/${id}`);
  },

  batchCheckin: async (phoneIds: number[]): Promise<{ message: string; count: number }> => {
    const { data } = await apiClient.post("/api/phones/batch-checkin", { phone_ids: phoneIds });
    return data;
  },

  batchCheckout: async (phoneIds: number[]): Promise<{ message: string; count: number }> => {
    const { data } = await apiClient.post("/api/phones/batch-checkout", { phone_ids: phoneIds });
    return data;
  },

  getStatusReport: async (): Promise<StatusReport> => {
    const { data } = await apiClient.get("/api/phones/reports/status");
    return data;
  },
};