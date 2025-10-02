import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Alert, TextInput } from 'react-native';
import { GoogleSignin, statusCodes, User } from '@react-native-google-signin/google-signin';
import { GoogleSignInPayload, GoogleSignInResponse } from 'shared-types';
import { useSignInWithGoogle } from '@/api-hooks/user.api';
import BottomDialog from '@/components/dialog';
import { useAuth } from './context/auth-context';
import { useNotification } from '@/services/notif-service/notif-context';

interface GoogleSignInButtonProps {
  onSuccess?: (response: GoogleSignInResponse) => void;
  onError: (error: string) => void;
  postLoginAction?: (result: any) => void;
  style?: object;
  textStyle?: object;
  children?: React.ReactNode;
}

// Initialize Google Sign-In configuration
GoogleSignin.configure({
  webClientId: '1027756985127-tqtoema5pvk8jjmdn1nfaqns7q53btb9.apps.googleusercontent.com',
  // androidClientId: '1027756985127-u80db0nm2u7e9g4375lhhgt934u1oj88.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['profile', 'email'],
});


const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  style,
  textStyle,
  children,
}) => {

  const { postLoginAction } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const [isGoogleSignInDialogOpen, setIsGoogleSignInDialogOpen] = useState(false);
  const { mutate: signInWithGoogle } = useSignInWithGoogle();
  const { expoPushToken } = useNotification();

  // Function to validate mobile number
  const isValidMobileNumber = (mobile: string) => {
    return /^\d{10,15}$/.test(mobile); // Validates 10-15 digit mobile number
  };
  
  // First step: Get Google user data and send to backend without mobile
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      // Check if Play Services are available
      await GoogleSignin.hasPlayServices();
      
      // Start the sign-in process
      const userInfo = await GoogleSignin.signIn();

      const { idToken, serverAuthCode, user } = userInfo.data!;

      // Prepare the initial payload without mobile number
      const initialPayload: GoogleSignInPayload = {
        idToken: idToken || '',
        serverAuthCode: serverAuthCode || undefined,
        user: {
          id: user.id,
          name: user.name || null,
          email: user.email,
          photo: user.photo || null,
        },
        expoPushToken: null
      };
      
      // Call the backend API using the hook
      signInWithGoogle(initialPayload, {
        onSuccess: async (response) => {
          
          // If response includes requiresMobile, it means user needs to provide mobile
          if (response.requiresMobile) {
            // Show mobile number dialog
            setIsGoogleSignInDialogOpen(true);
          } else {
            // User already exists or was created, perform post login actions
            if (postLoginAction) {
              postLoginAction(response);
              await GoogleSignin.signOut(); // Sign out from Google to avoid session issues

            } else if (onSuccess) {
              // Fallback to original onSuccess if postLoginAction is not provided
              onSuccess(response);
            }
          }
        },
        onError: (error: any) => {
          // Keep dialog open on error and show error message
          const errorMessage = error.message || 'Backend authentication failed';
          onError(errorMessage);
        }
      });
    } catch (err: any) {
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

      // Call the error callback
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Second step: Submit mobile number along with Google data
  const handleMobileNumberSubmit = async () => {
    if (!isValidMobileNumber(mobileNumber)) {
      onError('Please enter a valid mobile number (10-15 digits)');
      return;
    }

    try {
      setIsLoading(true);

      // Get Google user data again (in case user cancelled previously)
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken, serverAuthCode, user } = userInfo.data!;

      // Prepare payload with mobile number
      const payload: GoogleSignInPayload = {
        idToken: idToken || '',
        serverAuthCode: serverAuthCode || undefined,
        user: {
          id: user.id,
          name: user.name || null,
          email: user.email,
          photo: user.photo || null,
        },
        mobile: mobileNumber, // Add mobile number to the payload
        expoPushToken
      };

      // Call the backend API using the hook
      signInWithGoogle(payload, {
        onSuccess: async (response) => {
          // Close dialog on success
          setIsGoogleSignInDialogOpen(false);
          // Reset mobile number after successful sign-in
          setMobileNumber('');
          // Perform post login actions
          if (postLoginAction) {
            postLoginAction(response);
            await GoogleSignin.signOut(); // Sign out from Google to avoid session issues
          } else if (onSuccess) {
            // Fallback to original onSuccess if postLoginAction is not provided
            onSuccess(response);
          }
        },
        onError: (error: any) => {
          // Keep dialog open on error and show error message
          const errorMessage = error.message || 'Backend authentication failed';
          onError(errorMessage);
        }
      });
    } catch (err: any) {
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

      // Call the error callback
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    // Start the Google sign-in process
    handleGoogleSignIn();
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.googleButton,
          {
            opacity: isLoading ? 0.6 : 1,
          },
          style,
        ]}
        onPress={handleSignIn}
        disabled={isLoading}
      >
        <View style={styles.googleLogoContainer}>
          <View style={styles.googleLogo}>
            <View style={styles.googleLogoInner} />
          </View>
        </View>
        <Text style={[styles.googleButtonText, textStyle]}>
          {isLoading ? 'Signing in...' : children || 'Sign in with Google'}
        </Text>
      </TouchableOpacity>

      {/* Mobile Number Input Dialog (for new users) */}
      <BottomDialog open={isGoogleSignInDialogOpen} onClose={() => setIsGoogleSignInDialogOpen(false)}>
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
            Enter Mobile Number
          </Text>
          <Text style={{ marginBottom: 16, textAlign: 'center', color: '#666' }}>
            Please provide your mobile number to complete the sign-in process
          </Text>
          
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              marginBottom: 16,
            }}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="Enter your mobile number"
            keyboardType="phone-pad"
            maxLength={15}
          />
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: '#f0f0f0',
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => {
                setIsGoogleSignInDialogOpen(false);
                setMobileNumber(''); // Clear mobile number when cancelled
              }}
            >
              <Text style={{ color: '#333', fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: '#4285F4',
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={handleMobileNumberSubmit}
              disabled={isLoading}
            >
              <Text style={{ color: 'white', fontWeight: '500' }}>
                {isLoading ? 'Processing...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomDialog>
    </>
  );
};

const styles = StyleSheet.create({
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleLogoContainer: {
    marginRight: 12,
  },
  googleLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    position: 'relative',
    overflow: 'hidden',
  },
  googleLogoInner: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    borderLeftWidth: 10,
    borderLeftColor: '#4285F4', // Blue
    borderBottomWidth: 10,
    borderBottomColor: '#34A853', // Green
    borderRightWidth: 10,
    borderRightColor: '#FBBC05', // Yellow
    borderTopWidth: 10,
    borderTopColor: '#EA4335', // Red
    borderRadius: 10,
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default GoogleSignInButton;