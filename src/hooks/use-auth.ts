import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, type SignInRequest, type SignUpRequest } from '@/services/auth.service';
import { useToast } from '@/hooks/use-toast';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  account: () => [...authKeys.all, 'account'] as const,
};

// Get current user
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: authService.getCurrentUser,
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get account info
export function useAccountInfo() {
  return useQuery({
    queryKey: authKeys.account(),
    queryFn: authService.getAccountInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Sign in
export function useSignIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: SignInRequest) => authService.signIn(data),
    onSuccess: (response) => {
      // Set user data in cache
      queryClient.setQueryData(authKeys.user(), response);
      
      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in',
      });
    },
    onError: (error) => {
      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
    },
  });
}

// Sign up
export function useSignUp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: SignUpRequest) => authService.signUp(data),
    onSuccess: (response) => {
      // Set user data in cache
      queryClient.setQueryData(authKeys.user(), response);
      
      toast({
        title: 'Welcome!',
        description: 'Account created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Sign up failed',
        description: error instanceof Error ? error.message : 'Failed to create account',
        variant: 'destructive',
      });
    },
  });
}

// Sign out
export function useSignOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      
      toast({
        title: 'Signed out',
        description: 'Successfully signed out',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sign out',
        variant: 'destructive',
      });
    },
  });
}
