export interface JwtPayload {
  sub: string;     // User ID
  email: string;   // User email
  role: string;    // User role
  iat?: number;    // Issued at
  exp?: number;    // Expires at
}

export class JwtClaimsUtil {
  /**
   * Obtiene un claim específico del request.user (equivalente a User.FindFirstValue en C#)
   */
  static findFirstValue(request: any, claimType: string): string | null {
    const user = request.user as JwtPayload;
    if (!user) return null;

    switch (claimType.toLowerCase()) {
      case 'sub':
      case 'userid':
      case 'id':
        return user.sub;
      case 'email':
        return user.email;
      case 'role':
        return user.role;
      default:
        return user[claimType] || null;
    }
  }

  /**
   * Obtiene el ID del usuario (equivalente a obtener "sub" claim)
   */
  static getUserId(request: any): string | null {
    return this.findFirstValue(request, 'sub');
  }

  /**
   * Obtiene el email del usuario
   */
  static getUserEmail(request: any): string | null {
    return this.findFirstValue(request, 'email');
  }

  /**
   * Obtiene el rol del usuario
   */
  static getUserRole(request: any): string | null {
    return this.findFirstValue(request, 'role');
  }

  /**
   * Obtiene todos los claims del usuario
   */
  static getAllClaims(request: any): JwtPayload | null {
    return request.user as JwtPayload || null;
  }
}
