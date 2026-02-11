export interface Equipment {
	id: number;
	equipment_type: string;
	inventory_number: string;
	serial_number?: string;
	mni_serial_number?: string;
	manufacturer?: string;
	model?: string;
	cpu?: string;
	ram_gb?: number;
	storage_type?: string;
	storage_capacity_gb?: number;
	has_optical_drive: boolean;
	has_card_reader: boolean;
	operating_system?: string;
	current_owner_id?: number;
	current_location?: string;
	seal_number?: string;
	seal_install_date?: string;
	seal_status: string;
	seal_check_date?: string;
	status: string;
	notes?: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	current_owner_name?: string;
	current_owner_rank?: string;
}

export interface EquipmentCreate {
	equipment_type: string;
	inventory_number: string;
	serial_number?: string;
	mni_serial_number?: string;
	manufacturer?: string;
	model?: string;
	cpu?: string;
	ram_gb?: number;
	storage_type?: string;
	storage_capacity_gb?: number;
	has_optical_drive?: boolean;
	has_card_reader?: boolean;
	operating_system?: string;
	current_owner_id?: number;
	current_location?: string;
	seal_number?: string;
	seal_install_date?: string;
	seal_status?: string;
	seal_check_date?: string;
	status?: string;
	notes?: string;
}

export type EquipmentUpdate = Partial<EquipmentCreate>;

export interface EquipmentListResponse {
	total: number;
	items: Equipment[];
}

export interface Movement {
	id: number;
	equipment_id: number;
	from_location?: string;
	to_location: string;
	from_person_id?: number;
	to_person_id?: number;
	movement_type: string;
	document_number?: string;
	document_date?: string;
	reason?: string;
	seal_number_before?: string;
	seal_number_after?: string;
	seal_status?: string;
	created_at: string;
	from_person_name?: string;
	to_person_name?: string;
	created_by_username?: string;
}

export interface MovementCreate {
	equipment_id: number;
	from_location?: string;
	to_location: string;
	from_person_id?: number;
	to_person_id?: number;
	movement_type: string;
	document_number?: string;
	document_date?: string;
	reason?: string;
	seal_number_before?: string;
	seal_number_after?: string;
	seal_status?: string;
}

export interface MovementListResponse {
	total: number;
	items: Movement[];
}

export interface StorageDevice {
	id: number;
	equipment_id?: number;
	device_type: string;
	inventory_number: string;
	serial_number?: string;
	manufacturer?: string;
	model?: string;
	capacity_gb?: number;
	interface?: string;
	status: string;
	location?: string;
	notes?: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	equipment_inventory_number?: string;
}

export interface StorageDeviceCreate {
	equipment_id?: number;
	device_type: string;
	inventory_number: string;
	serial_number?: string;
	manufacturer?: string;
	model?: string;
	capacity_gb?: number;
	interface?: string;
	status?: string;
	location?: string;
	notes?: string;
}

export type StorageDeviceUpdate = Partial<StorageDeviceCreate>;

export interface StorageDeviceListResponse {
	total: number;
	items: StorageDevice[];
}

export interface SealCheckRequest {
	equipment_ids: number[];
	seal_status: string;
	notes?: string;
}

export interface SealCheckResponse {
	checked_count: number;
	damaged_count: number;
	missing_count: number;
	message: string;
}

export interface EquipmentStats {
	total_equipment: number;
	by_type: Record<string, number>;
	by_status: Record<string, number>;
	seal_issues: number;
	pending_movements: number;
}
