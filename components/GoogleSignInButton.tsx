import React from 'react';
import { StyleSheet, Text } from 'react-native';

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onToken: (idToken: string) => void;
}

export function GoogleSignInButton(_: GoogleSignInButtonProps) {
  return <Text style={styles.message}>Google sign-in is currently available on the web app.</Text>;
}

const styles = StyleSheet.create({
  message: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    width: '90%',
  },
});
