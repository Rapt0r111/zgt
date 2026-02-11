export interface Phone {
	id: number;
	owner_id: number;
	model?: string;
	color?: string;
	imei_1?: string;
	imei_2?: string;
	serial_number?: string;
	has_camera: boolean;
	has_recorder: boolean;
	storage_location?: string;
	status: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	owner_full_name?: string;
	owner_rank?: string;
}

export interface PhoneCreate {
	owner_id: number;
	model?: string;
	color?: string;
	imei_1?: string;
	imei_2?: string;
	serial_number?: string;
	has_camera?: boolean;
	has_recorder?: boolean;
	storage_location?: string;
	status?: string;
}

export type PhoneUpdate = Partial<PhoneCreate>;

export interface PhoneListResponse {
	total: number;
	items: Phone[];
}

export interface StatusReport {
	total_phones: number;
	checked_in: number;
	checked_out: number;
	phones_not_submitted: Phone[];
}
