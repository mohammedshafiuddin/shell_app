import { useState, useEffect } from 'react';
import { GoogleSignin, statusCodes, User } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

interface GoogleSignInResult {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
  };
  idToken: string | null;
  serverAuthCode: string | null;
  error?: string;
}

interface UseGoogleSignInOptions {
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
  scopes?: string[];
  offlineAccess?: boolean;
}

export function useGoogleSignIn() {
  const options: UseGoogleSignInOptions = {
    webClientId: '1027756985127-tqtoema5pvk8jjmdn1nfaqns7q53btb9.apps.googleusercontent.com',
    androidClientId: '1027756985127-u80db0nm2u7e9g4375lhhgt934u1oj88.apps.googleusercontent.com',
  }
  const [result, setResult] = useState<GoogleSignInResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error,setError] = useState('');
  const [resultString, setResultString] = useState('');

  // Default scopes for Google Sign-In
  const defaultScopes = ['profile', 'email'];
  const defaultOfflineAccess = true;

  // Configuration effect
  useEffect(() => {
    // Determine the appropriate client ID based on the platform
    let clientId: string | undefined;
    if (Platform.OS === 'web') {
      clientId = options?.webClientId;
    } else if (Platform.OS === 'android') {
      clientId = options?.androidClientId;
    } else {
      clientId = options?.iosClientId;
    }

    GoogleSignin.configure({
      webClientId: options.webClientId,
      // androidClientId: Platform.OS === 'android' ? options?.androidClientId : undefined,
      offlineAccess: options?.offlineAccess ?? defaultOfflineAccess,
      scopes: options?.scopes || defaultScopes,
    });
  }, []);

  const signIn = async () => {
    try {
      setIsPending(true);
      setIsError(false);
      
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if(userInfo.data === null) 
        throw new Error("User Not Found")

      const { idToken, serverAuthCode, user } = userInfo.data;
      console.log({idToken, serverAuthCode, user})
      

      // Set the result with user information
      setResult({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.givenName || user.name || undefined,
          lastName: user.familyName || undefined,
          photoUrl: user.photo || undefined,
        },
        idToken,
        serverAuthCode,
      });
      setResultString(JSON.stringify(userInfo.data.user));
      

      setIsPending(false);
    } catch (err: any) {
      console.log({err})
      
      setIsPending(false);
      setIsError(true);
      
      let errorMessage = 'An error occurred during Google sign-in';
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign-in cancelled';
      } else if (err.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign-in in progress';
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
      } else {
        errorMessage = err.message || errorMessage;
      }

      setError(errorMessage);
      // setResult({
      //   error: errorMessage,
      // });
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      setResult(null);
    } catch (error: any) {
      setResult(null);
    }
  };

  const getCurrentUser = async () => {
    try {
      const user = await GoogleSignin.getCurrentUser();
      return user;
    } catch (error: any) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  return {
    signIn,
    signOut,
    getCurrentUser,
    result,
    isPending,
    isError,
    user: result?.user || null,
    idToken: result?.idToken,
    serverAuthCode: result?.serverAuthCode,
    error: JSON.stringify(result?.error),
    resultString: JSON.stringify(resultString)
  };
}