import { apiClient } from '@/lib/api-client';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  user: User;
}

export interface AccountInfo {
  user: User;
  conversationCount: number;
}

export const authService = {
  // Get current user
  getCurrentUser: async (): Promise<AuthResponse> => {
    return apiClient.get<AuthResponse>('/me');
  },

  // Sign in
  signIn: async (data: SignInRequest): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/login', data);
  },

  // Sign up
  signUp: async (data: SignUpRequest): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/signup', data);
  },

  // Sign out
  signOut: async (): Promise<void> => {
    return apiClient.post('/auth/logout');
  },

  // Get account info
  getAccountInfo: async (): Promise<AccountInfo> => {
    return apiClient.get<AccountInfo>('/account');
  },
};
