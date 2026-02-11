import { cleanEmptyStrings } from "@/lib/utils/transform";
import type {
	Personnel,
	PersonnelCreate,
	PersonnelListResponse,
	PersonnelUpdate,
} from "@/types/personnel";
import apiClient from "./client";

export const personnelApi = {
	getList: async (params?: {
		skip?: number;
		limit?: number;
		status?: string;
		search?: string;
	}) => {
		const response = await apiClient.get("/api/personnel/", { params });
		return response.data as PersonnelListResponse;
	},

	getById: async (id: number) => {
		const response = await apiClient.get(`/api/personnel/${id}`);
		return response.data as Personnel;
	},

	create: async (data: PersonnelCreate) => {
		const cleanData = cleanEmptyStrings(data);
		const response = await apiClient.post("/api/personnel/", cleanData);
		return response.data as Personnel;
	},

	update: async (id: number, data: PersonnelUpdate) => {
		const cleanData = cleanEmptyStrings(data);
		const response = await apiClient.put(`/api/personnel/${id}`, cleanData);
		return response.data as Personnel;
	},

	delete: async (id: number) => {
		await apiClient.delete(`/api/personnel/${id}`);
	},

	checkClearance: async (id: number) => {
		const response = await apiClient.get(
			`/api/personnel/${id}/clearance/check`,
		);
		return response.data;
	},
};
