import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  getJWT,
  deleteJWT,
  getRoles,
  saveJWT,
  saveRoles,
  saveUserId,
  getUserId,
} from "../../hooks/useJWT";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import queryClient from "@/utils/queryClient";
import { DeviceEventEmitter } from "react-native";
import { FORCE_LOGOUT_EVENT, SESSION_EXPIRED_MSG } from "@/lib/const-strs";
import { useLogin, useLoginOtp, useLogout } from "@/api-hooks/auth.api";
import {
  UserResponsibilities,
} from "@/api-hooks/user.api";
import { InfoToast, SuccessToast } from "@/services/toaster";
import { StorageService } from "@/lib/StorageService";
import { useNotification } from "@/services/notif-service/notif-context";

interface LoginFormInputs {
  login: string;
  password: string;
  useUsername?: boolean;
  expoPushToken?: string | null;
}

interface LoginOtpFormInputs {
  mobile: string;
  otp: string;
  pushToken?: string | null;
}

interface AuthContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  logout: ({
    isSessionExpired,
  }: {
    isSessionExpired?: boolean;
  }) => Promise<void>;
  roles: string[] | null;
  setRoles: (roles: string[] | null) => void;
  refreshRoles: () => Promise<void>;
  loginFunc: (payload: LoginFormInputs) => Promise<void>;
  loginOtpFunc: (payload: LoginOtpFormInputs) => Promise<void>;
  postLoginAction: (result: any) => Promise<void>;
  userId: number | null;
  isLoggingIn: boolean;
  isLoggingInOtp: boolean;
  loginError?: string;
  loginOtpError?: string;
}

const defaultResponsibilities: UserResponsibilities = {
  hospitalAdminFor: null,
  secretaryFor: [],
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { mutate: loginApi, isPending: isLoggingIn, error: loginError } = useLogin();
  const { mutate: loginOtpApi, isPending: isLoggingInOtp, error: loginOtpError } = useLoginOtp();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  const refreshRoles = async () => {
    const r = await getRoles();
    setRoles(r);
  };
  

  useEffect(() => {
    refreshRoles();
  }, []);
  const { mutate: logoutApi } = useLogout();
  const router = useRouter();
  const [responsibilitiesError, setResponsibilitiesError] =
    useState<Error | null>(null);
  

  React.useEffect(() => {
    (async () => {
      const token = await getJWT();

      setIsLoggedIn(!!token);
      if (!token) {
        if (!pathname.includes("login")) {
          router.replace("/login" as any);
        }
      } else {
        router.replace("/(drawer)/dashboard");
        const userId = await getUserId();
        setUserId(userId ? parseInt(userId) : null);
      }
    })();
  }, []);

  const pathname = usePathname();


  const logout = async ({
    isSessionExpired,
  }: {
    isSessionExpired?: boolean;
  }) => {

    const pageConditon =
      pathname.includes("/login") ||
      pathname.includes("/signup") ||
      pathname === "/";

    if (!isSessionExpired) {
      logoutApi({} as any, {
        onSuccess: () => {},
        onSettled: () => {
          
          if (!pageConditon) {
            router.replace({
              pathname: "/login" as any,
              params: isSessionExpired ? { message: SESSION_EXPIRED_MSG } : {},
            });
          }
          deleteJWT();
        },
      });
      setIsLoggedIn(false);
    } else {
      deleteJWT();
      setIsLoggedIn(false);
      InfoToast("Session expired. Please log in again.");
      if (!pageConditon) {
        router.replace({
          pathname: "/login" as any,
          params: { message: SESSION_EXPIRED_MSG },
        });
      }
    }
    queryClient.clear();
  };

  const loginFunc = async (data: LoginFormInputs) => {
    loginApi(data, {
      onSuccess: async (result) => {
        await postLoginAction(result);
      },
      onError: (e: any) => {
        // setError("login", {
        //   type: "manual",
        //   message: e.message || "Login failed",
        // });
      },
    });
  };

  const loginOtpFunc = async (data: LoginOtpFormInputs) => {
    loginOtpApi(data, {
      onSuccess: async (result) => {
        await postLoginAction(result);
      },
      onError: (e: any) => {
        // setError("login", {
        //   type: "manual",
        //   message: e.message || "Login failed",
        // });
      },
    });
  };

  const postLoginAction = async (result: any) => {
    await saveUserId(result.user.id.toString());
    setUserId(result.user.id);

    await saveJWT(result.token);
    
    // Update login state in auth context
    setIsLoggedIn(true);

    // Handle roles if available
    if (result.user.roles) {
      await saveRoles(result.user.roles);
      await refreshRoles();
    }

    // Clear the 'message' search param from the URL after login
    router.replace({
      pathname: "/(drawer)/dashboard",
      params: {},
    });
  };

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      FORCE_LOGOUT_EVENT,
      () => {
        logout({ isSessionExpired: true });
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);
  

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        logout,
        roles,
        setRoles,
        refreshRoles,
        loginFunc,
        loginOtpFunc,
        postLoginAction,
        userId,
        isLoggingIn,
        isLoggingInOtp,
        loginError: loginError?.message,
        loginOtpError: loginOtpError?.message
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};