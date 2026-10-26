import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";
import { Alert } from "react-native";

import LoginScreen from "@/app/(auth)/login";

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: jest.requireActual("react-native").View }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignInWithGoogle = jest.fn();
jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ signIn: mockSignIn, signUp: mockSignUp, signInWithGoogle: mockSignInWithGoogle }),
}));
// Stands in for Google's button: hands the screen an ID token when pressed
jest.mock("../components/GoogleSignInButton", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    GoogleSignInButton: ({ onToken }: { onToken: (idToken: string) => void }) => (
      <Pressable onPress={() => onToken("google-id-token")}>
        <Text>Continue with Google</Text>
      </Pressable>
    ),
  };
});

const networkError = () => new AxiosError("Network Error", "ERR_NETWORK", { headers: new AxiosHeaders() });
const answered = (status: number, data: unknown = {}) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", { headers: new AxiosHeaders() }, null, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const SHORT = "Can't reach UREC Live right now. Check your Wi-Fi or mobile data, then try again.";

function fillIn(fields: Record<string, string>) {
  for (const [placeholder, value] of Object.entries(fields)) {
    fireEvent.changeText(screen.getByPlaceholderText(placeholder), value);
  }
}

describe("Login when the server can't be reached", () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it("says UREC Live can't be reached instead of blaming the password", async () => {
    mockSignIn.mockRejectedValue(networkError());
    render(<LoginScreen />);
    fillIn({ Username: "sam", Password: "secret" });

    fireEvent.press(screen.getByText("Login"));

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Couldn't sign in", SHORT));
  });

  it("still says the credentials are wrong when the server answers that", async () => {
    mockSignIn.mockRejectedValue(answered(401));
    render(<LoginScreen />);
    fillIn({ Username: "sam", Password: "wrong" });

    fireEvent.press(screen.getByText("Login"));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Login Failed", "Invalid credentials. Please try again."),
    );
  });

  it("says the server isn't responding when registering hits a 503", async () => {
    mockSignUp.mockRejectedValue(answered(503));
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Don't have an account? Register"));
    fillIn({ Username: "sam", Email: "sam@example.com", Password: "secret", "Confirm Password": "secret" });

    fireEvent.press(screen.getByText("Register"));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Couldn't register", "UREC Live isn't responding right now. Try again in a minute."),
    );
  });

  it("says UREC Live can't be reached when Google sign-in gets no answer", async () => {
    mockSignInWithGoogle.mockRejectedValue(networkError());
    render(<LoginScreen />);

    fireEvent.press(screen.getByText("Continue with Google"));

    expect(await screen.findByText(SHORT)).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
  });

  it("keeps Google sign-in's own message when the server is slow to wake up", async () => {
    mockSignInWithGoogle.mockRejectedValue(
      new AxiosError("timeout of 210000ms exceeded", "ECONNABORTED", { headers: new AxiosHeaders() }),
    );
    render(<LoginScreen />);

    fireEvent.press(screen.getByText("Continue with Google"));

    expect(await screen.findByText("The server took too long to wake up. Please try Google sign-in again.")).toBeTruthy();
  });

  it("keeps the usual message when the server refuses the registration", async () => {
    // AuthController answers { error }, which the screen doesn't read, so this is main's generic text
    mockSignUp.mockRejectedValue(answered(400, { error: "Username is already taken" }));
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Don't have an account? Register"));
    fillIn({ Username: "sam", Email: "sam@example.com", Password: "secret", "Confirm Password": "secret" });

    fireEvent.press(screen.getByText("Register"));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Registration Failed", "Failed to register. Please try again."),
    );
  });
});
