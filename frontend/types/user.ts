export interface User {
    id: number;
    username: string;
    full_name: string;
    role: string;
    is_active: boolean;
    last_login?: string;
    created_at: string;
  }
  
  export interface UserCreate {
    username: string;
    password: string;
    full_name: string;
    role: string;
  }
  
  export interface UserUpdate {
    username?: string;
    full_name?: string;
    role?: string;
    is_active?: boolean;
  }
  
  export interface ChangePasswordRequest {
    old_password?: string;
    new_password: string;
  }
  
  export interface UserListResponse {
    total: number;
    items: User[];
  }