
import { otpSenderAuthToken } from "./env-exporter";
import { OTP_COMMENT_NAME } from "./const-strings";
import { getKeyVal, setKeyVal } from "./key-val-store";


export async function setOtpCreds(mobile: string, authKey: string) {
  try {
    await setKeyVal(mobile, authKey, OTP_COMMENT_NAME);
  } catch (e) {
    console.error("Error setting OTP credentials", e);
    throw new Error("Error setting OTP credentials");
  }
}

export async function getOtpCreds(mobile: string) {
  const authKey = await getKeyVal(mobile, OTP_COMMENT_NAME);

  return authKey || null;
}

async function verifyOtpUtil(mobile: string, otp: string, verifId: string):Promise<boolean> {
    const reqUrl = `https://cpaas.messagecentral.com/verification/v3/validateOtp?&verificationId=${verifId}&code=${otp}`;
  const resp = await fetch(reqUrl, {
    method: "GET",
    headers: {
      authToken: otpSenderAuthToken,
    },
  });

  const rawData = await resp.json();
  if (rawData.data?.verificationStatus === "VERIFICATION_COMPLETED") {
    // delete the verificationId from the local storage
    return true;
  }
  return false;
}

export async function verifyOtpCreds(mobile: string, otp: string) {
  // const {mobile, otp} = body;
  const verifId = await getOtpCreds(mobile);

  if (!verifId) {
    return false;
  }
  
  const isValid = await verifyOtpUtil(mobile, otp, verifId);
  return isValid;
}
