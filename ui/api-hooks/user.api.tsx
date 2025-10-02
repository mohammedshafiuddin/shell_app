import axios from "@/services/axios";
import { useQuery, useMutation, QueryClient, useQueryClient } from "@tanstack/react-query";
import type { User, UpcomingAppointment } from "shared-types";


export interface CreateUserPayload {
  name: string;
  email: string;
  mobile: string;
  address?: string;
  password: string;
  role?: string;
}

export interface CreateUserResponse {
  user: User;
  message: string;
}

export interface UserResponsibilities {
  hospitalAdminFor: number | null; // ID of hospital the user is admin for, if any
  secretaryFor: number[]; // IDs of doctors the user is secretary for
}

export interface UpdateUserProfilePayload {
  name?: string;
  email?: string;
  mobile?: string;
  address?: string;
  profilePicUrl?: string;
}

export function useGetUserById(userId: number | string | undefined | null) {
  
  return useQuery<User | undefined>({
    queryKey: ['user', 'user-details', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      
      const res = await axios.get<User>(`/users/user/${userId}`);
      return res.data;
    },
  });
}



export function useCreateUser() {
  return useMutation({
    mutationFn: async (userPayload: FormData) => {
      try {

        const response = await axios.post('/users/signup', userPayload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      }
      catch (error) {
        console.log(error);
      }
    },
  });
}

/**
 * Hook to update a user's profile
 */
export function useUpdateUser(userId: number) {
  const queryClient = new QueryClient();

  return useMutation<CreateUserResponse, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const response = await axios.put<CreateUserResponse>(
        `/users/${userId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['business-users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}

export function useHasPushToken({enabled}: {enabled: boolean}) {
  return useQuery<boolean>({
    queryKey: ['has-push-token'],
    queryFn: async () => {
      const res = await axios.get('/users/has-push-token');
      return res.data.hasPushToken;
    },
    refetchOnMount: true,
    enabled,
  });
}


export function useAddPushToken() {
  return useMutation({
    mutationFn: async (pushToken: string) => {
      const res = await axios.post('/users/push-token', { pushToken });
      return res.data;
    },
  });
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: async (payload: import("shared-types").GoogleSignInPayload) => {
      const response = await axios.post<import("shared-types").GoogleSignInResponse>('/users/google-auth', payload);
      return response.data;
    },
  });
}



