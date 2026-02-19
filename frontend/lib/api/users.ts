import type { ChangePasswordRequest, User, UserCreate, UserListResponse, UserUpdate } from "@/types/user";
import apiClient from "./client";

export const usersApi = {
  getList: async (params?: { skip?: number; limit?: number; search?: string }): Promise<UserListResponse> => {
    const { data } = await apiClient.get("/api/users/", { params });
    return data;
  },

  getById: async (id: number): Promise<User> => {
    const { data } = await apiClient.get(`/api/users/${id}`);
    return data;
  },

  create: async (payload: UserCreate): Promise<User> => {
    const { data } = await apiClient.post("/api/users/", payload);
    return data;
  },

  update: async (id: number, payload: UserUpdate): Promise<User> => {
    const { data } = await apiClient.put(`/api/users/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },

  changePassword: async (id: number, payload: ChangePasswordRequest): Promise<{ message: string }> => {
    const { data } = await apiClient.post(`/api/users/${id}/change-password`, payload);
    return data;
  },

  toggleActive: async (id: number): Promise<{ message: string; is_active: boolean }> => {
    const { data } = await apiClient.post(`/api/users/${id}/toggle-active`);
    return data;
  },
};