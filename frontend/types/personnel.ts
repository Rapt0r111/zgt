export interface Personnel {
  id: number;
  full_name: string;
  rank?: string;
  position?: string;
  unit?: string;
  personal_number?: string;
  service_number?: string;
  security_clearance_level?: number;
  clearance_order_number?: string;
  clearance_expiry_date?: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonnelCreate {
  full_name: string;
  rank?: string;
  position?: string;
  unit?: string;
  personal_number?: string;
  service_number?: string;
  security_clearance_level?: number;
  clearance_order_number?: string;
  clearance_expiry_date?: string;
  status?: string;
}

export type PersonnelUpdate = Partial<PersonnelCreate>;

export interface PersonnelListResponse {
  total: number;
  items: Personnel[];
}