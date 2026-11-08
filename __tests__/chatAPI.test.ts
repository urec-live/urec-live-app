import { klipyAPI } from "@/services/klipyAPI";
import { messagingAPI } from "@/services/messagingAPI";
import { toChatActionError, toMediaSearchError } from "@/utils/chatErrors";

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockPatch = jest.fn();

jest.mock("@/services/authAPI", () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

beforeEach(() => {
  [mockGet, mockPut, mockPost, mockDelete, mockPatch].forEach((m) => m.mockReset().mockResolvedValue({ data: "ok" }));
});

describe("messagingAPI", () => {
  it("pages community and DM history by message id", async () => {
    await messagingAPI.getCommunityHistory();
    expect(mockGet).toHaveBeenLastCalledWith("/messaging/community/history", { params: { limit: 50 } });
    await messagingAPI.getCommunityHistory(120);
    expect(mockGet).toHaveBeenLastCalledWith("/messaging/community/history", { params: { limit: 50, before: 120 } });
    await messagingAPI.getDMHistory("al ex", 7);
    expect(mockGet).toHaveBeenLastCalledWith("/messaging/dm/al%20ex", { params: { limit: 50, before: 7 } });
  });

  it("reacts, unreacts and deletes on the right channel", async () => {
    expect(await messagingAPI.react("community", 4, "🔥")).toBe("ok");
    expect(mockPut).toHaveBeenCalledWith("/messaging/community/messages/4/reaction", { emoji: "🔥" });
    await messagingAPI.unreact("dm", 5);
    expect(mockDelete).toHaveBeenLastCalledWith("/messaging/dm/messages/5/reaction");
    await messagingAPI.deleteMessage("dm", 5);
    expect(mockDelete).toHaveBeenLastCalledWith("/messaging/dm/messages/5");
  });

  it("reports with a reason and leaves out a blank note", async () => {
    await messagingAPI.reportMessage("community", 9, "SPAM", "   ");
    expect(mockPost).toHaveBeenLastCalledWith("/messaging/community/messages/9/report", { reason: "SPAM" });
    await messagingAPI.reportMessage("dm", 9, "OTHER", "  rude  ");
    expect(mockPost).toHaveBeenLastCalledWith("/messaging/dm/messages/9/report", { reason: "OTHER", note: "rude" });
  });
});

describe("klipyAPI", () => {
  it("asks the backend for trending and search pages", async () => {
    await klipyAPI.trending("stickers", 2);
    expect(mockGet).toHaveBeenLastCalledWith("/media/stickers/trending", { params: { page: 2 } });
    await klipyAPI.search("gifs", "leg day");
    expect(mockGet).toHaveBeenLastCalledWith("/media/gifs/search", { params: { q: "leg day", page: 1 } });
  });
});

describe("chat error messages", () => {
  const status = (code: number) => ({ isAxiosError: true, response: { status: code } });
  const offline = { isAxiosError: true };

  it("explains failed actions by status", () => {
    expect(toChatActionError(status(403), "delete")).toBe("You can only delete your own messages.");
    expect(toChatActionError(status(404), "react")).toBe("This message isn't available any more.");
    expect(toChatActionError(status(409), "react")).toBe("This message was deleted.");
    expect(toChatActionError(status(409), "report")).toBe("You've already reported this message, or it was removed.");
    expect(toChatActionError(status(400), "report")).toBe("You can't report your own message.");
    expect(toChatActionError(status(401), "delete")).toBe("Please sign in again.");
    expect(toChatActionError(offline, "report")).toMatch(/Can't reach the server/);
    expect(toChatActionError(status(500), "delete")).toBe("Couldn't delete the message. Please try again.");
    expect(toChatActionError(new Error("boom"), "react")).toBe("Couldn't add your reaction. Please try again.");
  });

  it("explains failed GIF loads", () => {
    expect(toMediaSearchError(status(503))).toBe("GIFs aren't set up on the server yet.");
    expect(toMediaSearchError(status(429))).toBe("GIF search is busy. Try again in a minute.");
    expect(toMediaSearchError(offline)).toMatch(/Can't reach the server/);
    expect(toMediaSearchError(status(502))).toBe("Couldn't load GIFs. Please try again.");
  });
});
