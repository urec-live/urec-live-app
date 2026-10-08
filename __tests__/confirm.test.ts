import { Alert, AlertButton, Platform } from "react-native";

import { confirmAsync } from "@/utils/confirm";

const OPTIONS = { title: "Are you sure?", message: "This closes your request.", confirmText: "Yes, I got help" };

describe("confirmAsync", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  describe("on iOS and Android", () => {
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
      Platform.OS = "android";
      alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    });

    const buttons = (): AlertButton[] => alertSpy.mock.calls[0][2];

    it("asks with the title, message and both buttons", () => {
      confirmAsync({ ...OPTIONS, cancelText: "Not yet" });

      expect(alertSpy).toHaveBeenCalledWith(
        "Are you sure?",
        "This closes your request.",
        expect.any(Array),
        expect.objectContaining({ cancelable: true }),
      );
      expect(buttons().map((b) => b.text)).toEqual(["Not yet", "Yes, I got help"]);
      expect(buttons()[0].style).toBe("cancel");
    });

    it("resolves true when confirmed", async () => {
      const answer = confirmAsync(OPTIONS);
      buttons()[1].onPress?.();

      await expect(answer).resolves.toBe(true);
    });

    it("resolves false when cancelled", async () => {
      const answer = confirmAsync(OPTIONS);
      buttons()[0].onPress?.();

      await expect(answer).resolves.toBe(false);
    });

    it("resolves false when dismissed by tapping outside (Android)", async () => {
      const answer = confirmAsync(OPTIONS);
      alertSpy.mock.calls[0][3].onDismiss();

      await expect(answer).resolves.toBe(false);
    });

    it("styles the confirm button as destructive when asked", () => {
      confirmAsync({ ...OPTIONS, destructive: true });

      expect(buttons()[1].style).toBe("destructive");
    });
  });

  describe("on web", () => {
    beforeEach(() => {
      Platform.OS = "web";
    });

    it.each([true, false])("uses window.confirm and resolves %s", async (answer) => {
      const confirmSpy = jest.fn(() => answer);
      Object.defineProperty(window, "confirm", { value: confirmSpy, configurable: true, writable: true });
      const alertSpy = jest.spyOn(Alert, "alert");

      await expect(confirmAsync(OPTIONS)).resolves.toBe(answer);

      expect(confirmSpy).toHaveBeenCalledWith("Are you sure?\n\nThis closes your request.");
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });
});
