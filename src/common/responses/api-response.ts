export class ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  timestamp: string;

  constructor(success: boolean, message: string, data?: T, error?: any) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message: string = 'Operación exitosa'): ApiResponse<T> {
    return new ApiResponse(true, message, data);
  }

  static error(message: string, statusCode?: number, details?: any): ApiResponse {
    return new ApiResponse(false, message, null, {
      statusCode,
      details,
    });
  }
}
