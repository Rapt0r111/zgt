import type {
	AssignmentRequest,
	StorageAndPass,
	StorageAndPassCreate,
	StorageAndPassListResponse,
	StorageAndPassUpdate,
} from "@/types/storage-and-passes";
import apiClient from "./client";

export const storageAndPassesApi = {
	getList: async (params?: {
		skip?: number;
		limit?: number;
		asset_type?: string;
		status?: string;
		search?: string;
	}): Promise<StorageAndPassListResponse> => {
		const response = await apiClient.get("/api/storage-and-passes/", {
			params,
		});
		return response.data;
	},

	getStatistics: async (params?: {
        asset_type?: string;
        status?: string;
        search?: string;
    }): Promise<{ total_assets: number; by_type: any; by_status: any }> => {
        const response = await apiClient.get("/api/storage-and-passes/stats", { params });
        return response.data;
    },

	getById: async (id: number): Promise<StorageAndPass> => {
		const response = await apiClient.get(`/api/storage-and-passes/${id}`);
		return response.data;
	},

	create: async (data: StorageAndPassCreate): Promise<StorageAndPass> => {
		const response = await apiClient.post("/api/storage-and-passes/", data);
		return response.data;
	},

	update: async (
		id: number,
		data: StorageAndPassUpdate,
	): Promise<StorageAndPass> => {
		const response = await apiClient.patch(
			`/api/storage-and-passes/${id}`,
			data,
		);
		return response.data;
	},

	delete: async (id: number): Promise<void> => {
		await apiClient.delete(`/api/storage-and-passes/${id}`);
	},

	assign: async (
		id: number,
		request: AssignmentRequest,
	): Promise<StorageAndPass> => {
		const response = await apiClient.post(
			`/api/storage-and-passes/${id}/assign`,
			request,
		);
		return response.data;
	},

	revoke: async (id: number): Promise<StorageAndPass> => {
		const response = await apiClient.post(
			`/api/storage-and-passes/${id}/revoke`,
		);
		return response.data;
	},
};
