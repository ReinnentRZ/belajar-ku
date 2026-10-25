export type Role = 'PARENT' | 'TUTOR' | 'ADMIN';
export type GradeLevel = 'PAUD' | 'TK' | 'SD' | 'SMP';
export type TeachingMode = 'ONLINE' | 'OFFLINE_VISIT';
export type OrderStatus = 'WAITING_PAYMENT' | 'PAID' | 'CANCELLED' | 'EXPIRED';
export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';
export type MutationType = 'CREDIT_FROM_SESSION' | 'WITHDRAWAL';

export interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
}

export interface SelectedSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserTokenPayload;
    user: UserTokenPayload;
  }
}
