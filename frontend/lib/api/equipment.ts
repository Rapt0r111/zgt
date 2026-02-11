import type {
	Equipment,
	EquipmentCreate,
	EquipmentListResponse,
	EquipmentStats,
	EquipmentUpdate,
	Movement,
	MovementCreate,
	MovementListResponse,
	SealCheckRequest,
	SealCheckResponse,
	StorageDevice,
	StorageDeviceCreate,
	StorageDeviceListResponse,
	StorageDeviceUpdate,
} from "@/types/equipment";
import apiClient from "./client";

export const equipmentApi = {
	getList: async (params?: {
		skip?: number;
		limit?: number;
		equipment_type?: string;
		status?: string;
		search?: string;
	}) => {
		const response = await apiClient.get("/api/equipment/", { params });
		return response.data as EquipmentListResponse;
	},

	getById: async (id: number) => {
		const response = await apiClient.get(`/api/equipment/${id}`);
		return response.data as Equipment;
	},

	create: async (data: EquipmentCreate) => {
		const response = await apiClient.post("/api/equipment/", data);
		return response.data as Equipment;
	},

	update: async (id: number, data: EquipmentUpdate) => {
		const response = await apiClient.put(`/api/equipment/${id}`, data);
		return response.data as Equipment;
	},

	delete: async (id: number) => {
		await apiClient.delete(`/api/equipment/${id}`);
	},

	createMovement: async (data: MovementCreate) => {
		const response = await apiClient.post("/api/equipment/movements", data);
		return response.data as Movement;
	},

	getMovementHistory: async (
		equipmentId: number,
		params?: { skip?: number; limit?: number },
	) => {
		const response = await apiClient.get(
			`/api/equipment/${equipmentId}/movements`,
			{ params },
		);
		return response.data as MovementListResponse;
	},

	checkSeals: async (data: SealCheckRequest) => {
		const response = await apiClient.post("/api/equipment/seals/check", data);
		return response.data as SealCheckResponse;
	},

	getStatistics: async () => {
		const response = await apiClient.get("/api/equipment/stats");
		return response.data as EquipmentStats;
	},

	getStorageDevices: async (params?: {
		skip?: number;
		limit?: number;
		equipment_id?: number;
		status?: string;
		search?: string;
	}) => {
		const response = await apiClient.get("/api/equipment/storage-devices/", {
			params,
		});
		return response.data as StorageDeviceListResponse;
	},

	getStorageDeviceById: async (id: number) => {
		const response = await apiClient.get(
			`/api/equipment/storage-devices/${id}`,
		);
		return response.data as StorageDevice;
	},

	createStorageDevice: async (data: StorageDeviceCreate) => {
		const response = await apiClient.post(
			"/api/equipment/storage-devices/",
			data,
		);
		return response.data as StorageDevice;
	},

	updateStorageDevice: async (id: number, data: StorageDeviceUpdate) => {
		const response = await apiClient.put(
			`/api/equipment/storage-devices/${id}`,
			data,
		);
		return response.data as StorageDevice;
	},

	deleteStorageDevice: async (id: number) => {
		await apiClient.delete(`/api/equipment/storage-devices/${id}`);
	},
};
