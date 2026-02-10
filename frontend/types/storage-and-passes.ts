export interface StorageAndPass {
    id: number;
    asset_type: 'flash_drive' | 'electronic_pass';
    serial_number: string;
    model?: string;
    manufacturer?: string;
    status: 'in_use' | 'stock' | 'broken' | 'lost';
    assigned_to_id?: number;
    capacity_gb?: number;
    access_level?: number;
    issue_date?: string;
    return_date?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    assigned_to_name?: string;
    assigned_to_rank?: string;
  }
  
  export interface StorageAndPassCreate {
    asset_type: 'flash_drive' | 'electronic_pass';
    serial_number: string;
    model?: string;
    manufacturer?: string;
    status?: 'in_use' | 'stock' | 'broken' | 'lost';
    assigned_to_id?: number;
    capacity_gb?: number;
    access_level?: number;
    notes?: string;
  }
  
  export type StorageAndPassUpdate = Partial<StorageAndPassCreate>;
  
  export interface AssignmentRequest {
    assigned_to_id: number;
    notes?: string;
  }
  
  export interface StorageAndPassListResponse {
    total: number;
    items: StorageAndPass[];
  }