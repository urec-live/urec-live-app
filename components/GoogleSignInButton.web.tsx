import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select: boolean;
        ux_mode: 'popup';
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type: 'standard';
          theme: 'outline';
          size: 'large';
          text: 'continue_with';
          shape: 'rectangular';
          width: number;
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityServices() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-urec-google-sign-in="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google sign-in failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.urecGoogleSignIn = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in failed to load.'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onToken: (idToken: string) => void;
}

export function GoogleSignInButton({ disabled = false, onToken }: GoogleSignInButtonProps) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
  const buttonRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!clientId) return;
    let active = true;

    loadGoogleIdentityServices()
      .then(() => {
        if (!active || !window.google || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => onTokenRef.current(credential),
          auto_select: false,
          ux_mode: 'popup',
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        });
      })
      .catch((failure) => {
        if (active) {
          setError(failure instanceof Error ? failure.message : 'Google sign-in is unavailable.');
        }
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  if (!clientId) {
    return <Text style={styles.message}>Google sign-in is not configured for this environment.</Text>;
  }

  return (
    <View style={[styles.container, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      <div ref={buttonRef} style={{ minHeight: 44 }} />
      {error ? <Text style={styles.error}>{error} Refresh to try again.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minHeight: 44,
    width: '90%',
  },
  disabled: {
    opacity: 0.5,
  },
  message: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    width: '90%',
  },
  error: {
    color: '#b42318',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});
