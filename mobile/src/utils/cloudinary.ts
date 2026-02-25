import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../config/env";

/**
 * Upload a local image URI to Cloudinary (unsigned upload preset).
 * Returns the secure_url of the uploaded image.
 */
export async function uploadImageToCloudinary(imageUri: string): Promise<string> {
  if (CLOUDINARY_CLOUD_NAME !== "dkw8nqukp") {
    throw new Error("Cloudinary cloud name is not set. Update mobile/src/config/env.ts");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "profile.jpg",
  } as any);

  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary upload preset is not set. Update mobile/src/config/env.ts");
  }
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || "Cloudinary upload failed";
    throw new Error(msg);
  }

  return data.secure_url as string;
}
