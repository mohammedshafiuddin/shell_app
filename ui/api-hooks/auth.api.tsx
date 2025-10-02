import axios from "@/services/axios";
import { useMutation } from "@tanstack/react-query";

export interface LoginPayload {
  login: string; // Can be email or mobile
  password: string;
  useUsername?: boolean;
}

export interface LoginOtpPayload {
  mobile: string;
  otp: string;
  pushToken?: string | null;
}

export interface LoginResponse {
  user: {
    id: number;
    name: string;
    email: string;
    mobile: string;
    roles: string[];
  };
  token: string; // Now non-optional as the backend will always send it
  message: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  mobile: string;
  address: string;
  password: string;
}

export interface SignupResponse {
  user: {
    id: number;
    name: string;
    email: string;
    mobile: string;
  };
  message: string;
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // Use the shared axios instance directly
      await axios.post('/users/logout');
    },
    retry: false
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      console.log({payload})
      
      // Use the shared axios instance directly
      const response = await axios.post<LoginResponse>('/users/login', payload);
      const data = response.data;
      return data;
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: async (payload: SignupPayload) => {
      const response = await axios.post<SignupResponse>('/users/signup', payload);
      return response.data;
    },
  });
}


// Send OTP
export function useSendOtp() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const url = `/users/send-otp/${phone}`;
      
      const res = await axios.get(url);
      return res.data;
    },
  });
}

// Verify OTP
export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ phone, otp }: { phone: string; otp: string }) => {
      const res = await axios.post(`/users/verify-otp`, { phone, otp });
      return res.data;
    },
  });
}

export function useLoginOtp() {
  return useMutation({
    mutationFn: async (payload: LoginOtpPayload) => {
      // Use the shared axios instance directly
      const response = await axios.post<LoginResponse>('/users/login-otp', payload);
      const data = response.data;
      return data;
    },
  });
}