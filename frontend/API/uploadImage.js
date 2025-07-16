// frontend/API/uploadImage.js
import { CLOUDINARY_UPLOAD_API, cloudinaryUploadPreset } from "../Constants/index";

// General function to upload images or videos to Cloudinary
export const uploadMediaToCloudinary = async (mediaUri, mediaType) => {
  try {
    const formData = new FormData();
    
    // Check media type to determine whether it's an image or video
    const fileExtension = mediaUri.split('.').pop();
    let fileType = mediaType || (fileExtension === 'mp4' ? 'video/mp4' : 'image/jpeg');
    
    formData.append("file", {
      uri: mediaUri,
      name: mediaUri.split('/').pop(),
      type: fileType, // Dynamically set file type based on the file extension or passed type
    });
    formData.append("upload_preset", cloudinaryUploadPreset);

    const response = await fetch(CLOUDINARY_UPLOAD_API, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload media to Cloudinary");
    }

    const data = await response.json();
    console.log("Cloudinary URL:", data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading media to Cloudinary:", error.message);
    return null;
  }
};

// Separate function for image uploads (for backward compatibility)
export const uploadImagesToCloudinary = async (imageUri) => {
  return uploadMediaToCloudinary(imageUri, 'image/jpeg');
};

// Separate function for video uploads (for backward compatibility)
export const uploadVideoToCloudinary = async (videoUri) => {
  return uploadMediaToCloudinary(videoUri, 'video/mp4');
};
