export interface Equipment {
	id: number;
	equipment_type: string;
	inventory_number?: string;       // optional: личные ноутбуки без инв. номера
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
	has_laptop?: boolean;
	laptop_functional?: boolean;
	has_charger?: boolean;
	charger_functional?: boolean;
	has_mouse?: boolean;
	mouse_functional?: boolean;
	has_bag?: boolean;
	bag_functional?: boolean;
	operating_system?: string;
	current_owner_id?: number | null;
	current_location?: string;
	status: string;
	notes?: string;
	is_personal: boolean;            // новое поле
	is_active: boolean;
	created_at: string;
	updated_at: string;
	current_owner_name?: string;
	current_owner_rank?: string;
}

export interface EquipmentCreate {
	equipment_type: string;
	inventory_number?: string;       // optional: личным ноутбукам не нужен
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
	has_laptop?: boolean;
	laptop_functional?: boolean;
	has_charger?: boolean;
	charger_functional?: boolean;
	has_mouse?: boolean;
	mouse_functional?: boolean;
	has_bag?: boolean;
	bag_functional?: boolean;
	operating_system?: string;
	current_owner_id?: number | null;
	current_location?: string;
	status?: string;
	notes?: string;
	is_personal?: boolean;           // новое поле
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

export interface EquipmentStats {
	total_equipment: number;
	by_type: Record<string, number>;
	by_status: Record<string, number>;
	pending_movements: number;
}