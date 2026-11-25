import { AxiosError, AxiosHeaders } from "axios";

import { photoCacheKey, photoSize, resolveMediaUrl } from "@/components/chat/chatUtils";
import { messagingAPI } from "@/services/messagingAPI";
import { BACKEND_ORIGIN } from "@/services/networkConfig";
import { toPhotoUploadError } from "@/utils/chatErrors";
import { PhotoPermissionError, pickChatPhoto, preparePhoto } from "@/utils/chatPhotos";

// ── Picker and manipulator stand-ins ─────────────────────────────────────

const mockPicker = {
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
};
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: (...a: unknown[]) => mockPicker.requestCameraPermissionsAsync(...a),
  launchCameraAsync: (...a: unknown[]) => mockPicker.launchCameraAsync(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockPicker.launchImageLibraryAsync(...a),
}));

const mockResize = jest.fn();
const mockSave = jest.fn();
const mockManipulate = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
}));

const mockPost = jest.fn();
jest.mock("@/services/authAPI", () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => mockPost(...args) },
}));

function axiosError(status?: number): AxiosError {
  const error = new AxiosError("failed");
  if (status) {
    error.response = { status, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } };
  }
  return error;
}

beforeEach(() => {
  jest.clearAllMocks();
  const context = { resize: mockResize, renderAsync: jest.fn(async () => ({ saveAsync: mockSave })) };
  mockResize.mockReturnValue(context);
  mockManipulate.mockReturnValue(context);
  mockSave.mockResolvedValue({ uri: "file:///cache/out.jpg", width: 1600, height: 1200 });
  mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
});

describe("picking a photo", () => {
  it("asks for the camera first, and stops if the member says no", async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    await expect(pickChatPhoto("camera")).rejects.toBeInstanceOf(PhotoPermissionError);
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("takes a photo once the camera is allowed, and resolves null if they cancel", async () => {
    mockPicker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
    await expect(pickChatPhoto("camera")).resolves.toBeNull();
    expect(mockPicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ["images"], exif: false }),
    );
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it("chooses from the library without asking for any permission, then shrinks it", async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///photos/big.jpg", width: 4000, height: 3000 }],
    });

    const photo = await pickChatPhoto("library");

    expect(mockPicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(mockManipulate).toHaveBeenCalledWith("file:///photos/big.jpg");
    expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
    expect(mockSave).toHaveBeenCalledWith({ compress: 0.75, format: "jpeg" });
    expect(photo).toEqual({ uri: "file:///cache/out.jpg", width: 1600, height: 1200 });
  });

  it("caps a tall photo by its height and leaves small ones at their size", async () => {
    await preparePhoto("file:///tall.jpg", 3000, 4000);
    expect(mockResize).toHaveBeenLastCalledWith({ height: 1600 });

    mockResize.mockClear();
    await preparePhoto("file:///small.jpg", 800, 600);
    expect(mockResize).not.toHaveBeenCalled();
    // Still saved as JPEG at 0.75, whatever format it came in
    expect(mockSave).toHaveBeenLastCalledWith({ compress: 0.75, format: "jpeg" });
  });
});

describe("uploading a photo", () => {
  it("posts the file as multipart with a long timeout and reports progress", async () => {
    mockPost.mockImplementation(async (_url, _form, config) => {
      config.onUploadProgress({ loaded: 25, total: 100 });
      config.onUploadProgress({ loaded: 100, total: 100 });
      config.onUploadProgress({ loaded: 50 }); // no total: ignored
      return { data: { mediaId: 12, width: 1600, height: 1200 } };
    });
    const progress = jest.fn();
    const controller = new AbortController();
    // Jest's FormData is Node's; React Native's takes {uri, name, type} parts, so record what's appended
    const appended: unknown[][] = [];
    const appendSpy = jest.spyOn(FormData.prototype, "append").mockImplementation(function (...args: unknown[]) {
      appended.push(args);
    });

    const uploaded = await messagingAPI.uploadPhoto("file:///cache/out.jpg", progress, controller.signal);
    appendSpy.mockRestore();

    expect(uploaded).toEqual({ mediaId: 12, width: 1600, height: 1200 });
    const [url, form, config] = mockPost.mock.calls[0];
    expect(url).toBe("/messaging/media");
    expect(form).toBeInstanceOf(FormData);
    expect(appended).toEqual([["file", { uri: "file:///cache/out.jpg", name: "photo.jpg", type: "image/jpeg" }]]);
    expect(config).toMatchObject({
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
      signal: controller.signal,
    });
    expect(progress.mock.calls).toEqual([[0.25], [1]]);
  });

  it("labels each way an upload can fail", () => {
    expect(toPhotoUploadError(axiosError(413))).toBe("Photo too large");
    expect(toPhotoUploadError(axiosError(415))).toBe("Couldn't read photo");
    expect(toPhotoUploadError(axiosError(400))).toBe("Couldn't read photo");
    expect(toPhotoUploadError(axiosError(429))).toBe("Too many photos, wait a bit");
    expect(toPhotoUploadError(axiosError(401))).toBe("Sign in again");
    expect(toPhotoUploadError(axiosError(503))).toBe("Photos unavailable");
    expect(toPhotoUploadError(axiosError(500))).toBe("Upload failed");
    expect(toPhotoUploadError(axiosError())).toBe("No connection");
    expect(toPhotoUploadError(new Error("boom"))).toBe("Upload failed");
  });
});

describe("photo helpers", () => {
  it("resolves the server's relative photo URLs against the backend", () => {
    expect(resolveMediaUrl("/api/messaging/media/4/raw?exp=1&sig=x")).toBe(
      `${BACKEND_ORIGIN}/api/messaging/media/4/raw?exp=1&sig=x`,
    );
    expect(resolveMediaUrl("https://bucket.r2.cloudflarestorage.com/x.jpg?X-Amz-Signature=1")).toBe(
      "https://bucket.r2.cloudflarestorage.com/x.jpg?X-Amz-Signature=1",
    );
    expect(resolveMediaUrl("file:///cache/out.jpg")).toBe("file:///cache/out.jpg");
    expect(resolveMediaUrl(undefined)).toBeUndefined();
    expect(resolveMediaUrl("")).toBeUndefined();
  });

  it("caches a photo by its id, since its URL changes on every fetch", () => {
    expect(photoCacheKey(42)).toBe("chat-media-42");
    expect(photoCacheKey(undefined)).toBeUndefined();
    expect(photoCacheKey(null)).toBeUndefined();
  });

  it("sizes photos to fit 240 x 300, keeping their shape", () => {
    expect(photoSize({ width: 1600, height: 1200 })).toEqual({ width: 240, height: 180 });
    expect(photoSize({ width: 1200, height: 1600 })).toEqual({ width: 225, height: 300 });
    expect(photoSize({ width: 100, height: 100 })).toEqual({ width: 240, height: 240 });
    expect(photoSize(null)).toEqual({ width: 240, height: 180 });
    expect(photoSize({ width: 0, height: 10 })).toEqual({ width: 240, height: 180 });
  });
});
