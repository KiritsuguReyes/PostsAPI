export class ApiResponse {
  static success(data: any, message = 'OK') {
    return { success: true, message, data };
  }

  static error(message: string, status = 400) {
    return { success: false, message, status };
  }
}
