import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import WorkoutFriends from "../components/WorkoutFriends";
import { workoutFriendsAPI } from "../services/workoutFriendsAPI";

jest.mock("expo-router", () => ({ useFocusEffect: (effect: () => void) => {
  const { useEffect } = jest.requireActual("react");
  useEffect(effect, [effect]);
} }));
jest.mock("../services/workoutNudgeNotifications", () => ({
  getNudgeToken: jest.fn().mockResolvedValue(null),
}));
jest.mock("../services/workoutFriendsAPI", () => ({
  workoutFriendsAPI: {
    overview: jest.fn(),
    nudge: jest.fn(),
  },
}));

it("keeps a suggested nudge in the draft until the sender submits it", async () => {
  const overview = jest.mocked(workoutFriendsAPI.overview);
  overview.mockResolvedValue({
    sharing: false,
    friends: [{ username: "Jamie", status: "FRIEND", days: null, target: null, canNudgeAt: null }],
  });

  render(<WorkoutFriends username="Alex" target={2} />);
  expect(await screen.findByText("Progress is private")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Nudge" }));
  fireEvent.press(screen.getByRole("button", { name: "Surprise me" }));
  expect(screen.getByLabelText("Nudge message").props.value).toBeTruthy();
  expect(workoutFriendsAPI.nudge).not.toHaveBeenCalled();

  fireEvent.changeText(screen.getByLabelText("Nudge message"), "Want to go together?");
  fireEvent.press(screen.getByRole("button", { name: "Send nudge" }));
  await waitFor(() => expect(workoutFriendsAPI.nudge).toHaveBeenCalledWith("Jamie", "Want to go together?"));
  expect(await screen.findByText("Nudge sent in Messages.")).toBeTruthy();
});
