/**
 * Biometric Authentication Utilities
 * 
 * Provides WebAuthn-based biometric authentication support for mobile devices
 * Compatible with fingerprint, face ID, and other platform authenticators
 */

export interface BiometricCapability {
  isSupported: boolean;
  hasPlatformAuthenticator: boolean;
  hasExternalAuthenticator: boolean;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

export interface BiometricCredential {
  id: string;
  publicKey: string;
  userId: string;
  username: string;
  createdAt: number;
}

export interface BiometricAuthResult {
  success: boolean;
  credential?: BiometricCredential;
  error?: string;
}

/**
 * Check if biometric authentication is supported on this device/browser
 */
export const checkBiometricSupport = async (): Promise<BiometricCapability> => {
  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    return {
      isSupported: false,
      hasPlatformAuthenticator: false,
      hasExternalAuthenticator: false,
      userVerification: 'discouraged'
    };
  }

  try {
    // Check if platform authenticator (biometric) is available
    const hasPlatform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    // Check for external authenticators (USB keys, etc.)
    const hasExternal = await PublicKeyCredential.isExternalCTAP2SecurityKeySupported?.() || false;

    return {
      isSupported: true,
      hasPlatformAuthenticator: hasPlatform,
      hasExternalAuthenticator: hasExternal,
      userVerification: hasPlatform ? 'required' : 'preferred'
    };
  } catch (error) {
    console.warn('Biometric support check failed:', error);
    return {
      isSupported: false,
      hasPlatformAuthenticator: false,
      hasExternalAuthenticator: false,
      userVerification: 'discouraged'
    };
  }
};

/**
 * Register a new biometric credential for a user
 */
export const registerBiometric = async (
  userId: string,
  username: string
): Promise<BiometricAuthResult> => {
  try {
    const support = await checkBiometricSupport();
    
    if (!support.isSupported || !support.hasPlatformAuthenticator) {
      return {
        success: false,
        error: 'Biometric authentication not supported on this device'
      };
    }

    // Generate a random challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Create credential creation options
    const createOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'Lumora',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: support.userVerification,
          requireResidentKey: false,
        },
        timeout: 60000, // 60 seconds
        attestation: 'none',
      },
    };

    // Create the credential
    const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential;
    
    if (!credential) {
      return {
        success: false,
        error: 'Failed to create biometric credential'
      };
    }

    // Extract public key and credential ID
    const response = credential.response as AuthenticatorAttestationResponse;
    const publicKeyArray = new Uint8Array(response.publicKey!);
    const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyArray));
    const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

    const biometricCredential: BiometricCredential = {
      id: credentialIdBase64,
      publicKey: publicKeyBase64,
      userId,
      username,
      createdAt: Date.now()
    };

    // Store credential locally for this session
    try {
      localStorage.setItem('lumora-biometric-credential', JSON.stringify(biometricCredential));
    } catch (storageError) {
      console.warn('Failed to store biometric credential locally:', storageError);
    }

    return {
      success: true,
      credential: biometricCredential
    };

  } catch (error) {
    console.error('Biometric registration failed:', error);
    
    let errorMessage = 'Biometric registration failed';
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric registration was cancelled or not allowed';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Biometric authentication is not supported';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error during biometric registration';
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Authenticate using biometric credentials
 */
export const authenticateBiometric = async (
  userId: string,
  username: string
): Promise<BiometricAuthResult> => {
  try {
    const support = await checkBiometricSupport();
    
    if (!support.isSupported || !support.hasPlatformAuthenticator) {
      return {
        success: false,
        error: 'Biometric authentication not supported on this device'
      };
    }

    // Get stored credential
    let storedCredential: BiometricCredential | null = null;
    try {
      const stored = localStorage.getItem('lumora-biometric-credential');
      if (stored) {
        storedCredential = JSON.parse(stored);
      }
    } catch (storageError) {
      console.warn('Failed to retrieve stored biometric credential:', storageError);
    }

    if (!storedCredential || storedCredential.userId !== userId) {
      return {
        success: false,
        error: 'No biometric credential found for this user'
      };
    }

    // Generate a random challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Convert stored credential ID back to ArrayBuffer
    const credentialId = Uint8Array.from(atob(storedCredential.id), c => c.charCodeAt(0));

    // Create credential request options
    const requestOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key',
          transports: ['internal'] // Platform authenticator only
        }],
        userVerification: support.userVerification,
        timeout: 60000, // 60 seconds
      },
    };

    // Get the credential
    const credential = await navigator.credentials.get(requestOptions) as PublicKeyCredential;
    
    if (!credential) {
      return {
        success: false,
        error: 'Biometric authentication failed'
      };
    }

    // Verify the credential ID matches
    const receivedIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    if (receivedIdBase64 !== storedCredential.id) {
      return {
        success: false,
        error: 'Biometric credential mismatch'
      };
    }

    return {
      success: true,
      credential: storedCredential
    };

  } catch (error) {
    console.error('Biometric authentication failed:', error);
    
    let errorMessage = 'Biometric authentication failed';
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric authentication was cancelled or not allowed';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Biometric authentication is not supported';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error during biometric authentication';
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Check if user has a registered biometric credential
 */
export const hasBiometricCredential = (userId: string): boolean => {
  try {
    const stored = localStorage.getItem('lumora-biometric-credential');
    if (!stored) return false;
    
    const credential = JSON.parse(stored) as BiometricCredential;
    return credential.userId === userId;
  } catch {
    return false;
  }
};

/**
 * Remove stored biometric credential
 */
export const removeBiometricCredential = (): void => {
  try {
    localStorage.removeItem('lumora-biometric-credential');
  } catch (error) {
    console.warn('Failed to remove biometric credential:', error);
  }
};

/**
 * Check if biometric authentication should be offered
 * (mobile device + biometric support + HTTPS)
 */
export const shouldOfferBiometric = async (): Promise<boolean> => {
  // Must be HTTPS (required for WebAuthn)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    return false;
  }

  // Check if mobile device (reuse existing mobile detection)
  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile) {
    return false;
  }

  // Check biometric support
  const support = await checkBiometricSupport();
  return support.isSupported && support.hasPlatformAuthenticator;
};
