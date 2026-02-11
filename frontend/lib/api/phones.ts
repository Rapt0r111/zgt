import type {
	Phone,
	PhoneCreate,
	PhoneListResponse,
	PhoneUpdate,
	StatusReport,
} from "@/types/phone";
import apiClient from "./client";

export const phonesApi = {
	getList: async (params?: {
		skip?: number;
		limit?: number;
		status?: string;
		search?: string;
		owner_id?: number;
	}) => {
		const response = await apiClient.get("/api/phones/", { params });
		return response.data as PhoneListResponse;
	},

	getById: async (id: number) => {
		const response = await apiClient.get(`/api/phones/${id}`);
		return response.data as Phone;
	},

	create: async (data: PhoneCreate) => {
		const response = await apiClient.post("/api/phones/", data);
		return response.data as Phone;
	},

	update: async (id: number, data: PhoneUpdate) => {
		const response = await apiClient.put(`/api/phones/${id}`, data);
		return response.data as Phone;
	},

	delete: async (id: number) => {
		await apiClient.delete(`/api/phones/${id}`);
	},

	batchCheckin: async (phoneIds: number[]) => {
		const response = await apiClient.post("/api/phones/batch-checkin", {
			phone_ids: phoneIds,
		});
		return response.data as { message: string; count: number };
	},

	batchCheckout: async (phoneIds: number[]) => {
		const response = await apiClient.post("/api/phones/batch-checkout", {
			phone_ids: phoneIds,
		});
		return response.data as { message: string; count: number };
	},

	getStatusReport: async () => {
		const response = await apiClient.get("/api/phones/reports/status");
		return response.data as StatusReport;
	},
};
