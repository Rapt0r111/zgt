import { cleanEmptyStrings } from "@/lib/utils/transform";
import type { Personnel, PersonnelCreate, PersonnelListResponse, PersonnelUpdate } from "@/types/personnel";
import apiClient from "./client";

export const personnelApi = {
  getList: async (params?: { skip?: number; limit?: number; status?: string; search?: string }): Promise<PersonnelListResponse> => {
    const { data } = await apiClient.get("/api/personnel/", { params });
    return data;
  },

  getById: async (id: number): Promise<Personnel> => {
    const { data } = await apiClient.get(`/api/personnel/${id}`);
    return data;
  },

  create: async (payload: PersonnelCreate): Promise<Personnel> => {
    const { data } = await apiClient.post("/api/personnel/", cleanEmptyStrings(payload as unknown as Record<string, unknown>));
    return data;
  },

  update: async (id: number, payload: PersonnelUpdate): Promise<Personnel> => {
    const { data } = await apiClient.put(`/api/personnel/${id}`, cleanEmptyStrings(payload as Record<string, unknown>));
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/personnel/${id}`);
  },

  checkClearance: async (id: number) => {
    const { data } = await apiClient.get(`/api/personnel/${id}/clearance/check`);
    return data;
  },
};