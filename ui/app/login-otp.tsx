import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { useSendOtp } from "@/api-hooks/auth.api";
import { getJWT, JWT_KEY, saveJWT, saveRoles } from "../hooks/useJWT";
import { useRoles } from "../components/context/roles-context";
import { useRouter } from "expo-router";
import MyButton from "@/components/button";
import MyTextInput from "@/components/textinput";
import { useTheme } from "./hooks/theme.context";
import MyText from "@/components/text";
import * as SecureStore from "expo-secure-store";
import { OPT_LAST_SENT_TIME } from "../lib/const-strs";
import { useNotification } from "@/services/notif-service/notif-context";
import { useAuth } from "@/components/context/auth-context";

function LoginOtp() {
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { mobile: "", otp: "" },
  });
  React.useEffect(() => {
    (async () => {
      const token = await getJWT();
      if (token) {
        router.replace("/(drawer)/dashboard");
      } else {
        // setCheckingAuth(false);
      }
    })();
  }, []);
  const { mutate: sendOtp, status: sendOtpStatus } = useSendOtp();
  const { loginOtpFunc, isLoggingInOtp, refreshRoles, loginOtpError } = useAuth();
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [timerId, setTimerId] = useState<number | null>(null);
  const OTP_COOLDOWN_SECONDS = 180; // 3 minutes
  const OTP_TIMESTAMP_KEY = OPT_LAST_SENT_TIME;
  const router = useRouter();
  const { theme } = useTheme();

  const { expoPushToken } = useNotification();

  // On mount, check for persisted cooldown
  React.useEffect(() => {
    (async () => {
      const lastSent = await SecureStore.getItemAsync(OTP_TIMESTAMP_KEY);
      if (lastSent) {
        const lastSentTime = parseInt(lastSent, 10);
        const now = Date.now();
        const diff = Math.floor((now - lastSentTime) / 1000);
        if (diff < OTP_COOLDOWN_SECONDS) {
          setOtpCooldown(OTP_COOLDOWN_SECONDS - diff);
        }
      }
    })();
  }, []);

  // Start timer when cooldown is set
  React.useEffect(() => {
    if (otpCooldown > 0) {
      const id = setInterval(() => {
        setOtpCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerId(id);
      return () => clearInterval(id);
    }
    if (timerId) clearInterval(timerId);
  }, [otpCooldown]);

  const onSendOtp = async () => {
    clearErrors();
    if (otpCooldown > 0) return;
    const mobile = watch("mobile");
    if (!mobile || !/^\d{10,15}$/.test(mobile)) {
      setError("mobile", {
        type: "manual",
        message: "Enter a valid mobile number",
      });
      return;
    }
    sendOtp(mobile, {
      onSuccess: async () => {
        setOtpSent(true);
        const now = Date.now();
        await SecureStore.setItemAsync(OTP_TIMESTAMP_KEY, now.toString());
        setOtpCooldown(OTP_COOLDOWN_SECONDS);
      },
      onError: (err) => {
        setError("mobile", {
          type: "manual",
          message: err?.message || "Failed to send OTP",
        });
      },
    });
  };

  const onVerifyOtp = async (data: any) => {
    clearErrors();
    if (!data.mobile || !/^\d{10,15}$/.test(data.mobile)) {
      setError("mobile", {
        type: "manual",
        message: "Enter a valid mobile number",
      });
      return;
    }
    if (!data.otp || data.otp.length < 4) {
      setError("otp", { type: "manual", message: "Enter the OTP" });
      return;
    }
    try {
      loginOtpFunc({
        mobile: data.mobile, 
        otp: data.otp, 
        pushToken: expoPushToken 
      });
    } catch (e:any) {
      setOtpVerified(false);
      setError("otp", { type: "manual", message: e?.message || "Invalid OTP" });
    }
  };

  return (
    <View style={styles.container}>
      <MyText
        weight="bold"
        color="black2"
        style={{ fontSize: 32, marginBottom: 8 }}
      >
        Login with OTP
      </MyText>
      <MyText color="gray1" style={{ fontSize: 16, marginBottom: 24 }}>
        Enter your mobile number to receive an OTP
      </MyText>
      <Controller
        control={control}
        name="mobile"
        rules={{ required: "Mobile number is required" }}
        render={({ field: { onChange, onBlur, value } }) => (
          <MyTextInput
            placeholder="Enter your mobile number"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="phone-pad"
            style={styles.input}
            maxLength={15}
            error={!!errors.mobile}
            cursorColor="blue1"
            editable={!otpSent}
          />
        )}
      />
      {errors.mobile && (
        <Text style={styles.error}>{errors.mobile.message}</Text>
      )}
      <MyButton
        onPress={onSendOtp}
        fillColor="blue1"
        textColor="white1"
        fullWidth
        loading={sendOtpStatus === "pending"}
        disabled={otpSent || otpCooldown > 0}
        style={{ marginBottom: 16 }}
      >
        {otpCooldown > 0
          ? `Resend OTP in ${otpCooldown}s`
          : otpSent
          ? "OTP Sent"
          : "Send OTP"}
      </MyButton>
      {otpSent && (
        <>
          <Controller
            control={control}
            name="otp"
            rules={{ required: "OTP is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <MyTextInput
                placeholder="Enter OTP"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                maxLength={6}
                style={styles.input}
                error={!!errors.otp}
              />
            )}
          />
          {errors.otp && <Text style={styles.error}>{errors.otp.message}</Text>}
          <MyButton
            onPress={handleSubmit(onVerifyOtp)}
            fillColor="blue1"
            textColor="white1"
            fullWidth
            loading={isLoggingInOtp}
            style={{ marginBottom: 16, minWidth: 120 }}
          >
            Verify OTP
          </MyButton>
          <View style={{ minHeight: 22, marginBottom: 8 }}>
            {otpVerified && (
              <Text
                style={{
                  color: theme.colors.green1,
                  textAlign: "left",
                  fontSize: 13,
                }}
              >
                OTP verified successfully
              </Text>
            )}
            {/* {!otpVerified && (
              <Text style={{ color: theme.colors.red1, textAlign: 'left', fontSize: 13 }}>
                Invalid OTP
              </Text>
            )} */}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  input: {
    marginBottom: 16,
  },
  error: {
    color: "red",
    marginBottom: 8,
    textAlign: "center",
  },
});

export default LoginOtp;
