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
  
  export function formatApiError(error: ApiErrorResponse): string {
    const detail = error.response?.data?.detail;
    
    if (typeof detail === 'string') {
      return detail;
    }
    
    if (Array.isArray(detail)) {
      return detail.map(err => `${err.loc?.join('.') || ''}: ${err.msg}`).join('; ');
    }
    
    return error.message || 'Произошла ошибка';
  }