import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE } from "@/constants/chat";

export type PhotoSource = "camera" | "library";

/** A photo ready to upload: a local JPEG file, at most PHOTO_MAX_EDGE on its long edge. */
export interface PreparedPhoto {
  uri: string;
  width: number;
  height: number;
}

/** The member said no to camera access (or turned it off in Settings). */
export class PhotoPermissionError extends Error {
  constructor() {
    super("Camera access is off");
    this.name = "PhotoPermissionError";
  }
}

/**
 * Lets the member take or pick one photo, then shrinks it for upload. Resolves to null when they
 * cancel. The server re-encodes it again and strips EXIF, so nothing here has to.
 */
export async function pickChatPhoto(source: PhotoSource): Promise<PreparedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
  let result: ImagePicker.ImagePickerResult;
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new PhotoPermissionError();
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    // The system photo picker needs no permission
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  const asset = result.canceled ? undefined : result.assets?.[0];
  if (!asset) return null;
  return preparePhoto(asset.uri, asset.width, asset.height);
}

/** Resizes to PHOTO_MAX_EDGE on the long edge (never up) and saves as JPEG at PHOTO_JPEG_QUALITY. */
export async function preparePhoto(uri: string, width: number, height: number): Promise<PreparedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > PHOTO_MAX_EDGE) {
    context.resize(width >= height ? { width: PHOTO_MAX_EDGE } : { height: PHOTO_MAX_EDGE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO_JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
