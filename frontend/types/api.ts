export interface ValidationError {
	loc: (string | number)[];
	msg: string;
	type: string;
}

export interface ApiErrorResponse {
	response?: {
		status?: number;
		data?: {
			detail?: string | ValidationError[];
		};
	};
	message?: string;
}
