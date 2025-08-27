// Server-side only Cloudinary utilities
// This file should only be imported in API routes or server components

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
}

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  transformation?: any[];
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  tags?: string[];
}

/**
 * Upload a base64 image to Cloudinary
 */
export async function uploadBase64Image(
  base64Data: string,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    // Ensure base64 data has proper format
    const base64String = base64Data.startsWith('data:') 
      ? base64Data 
      : `data:image/png;base64,${base64Data}`;

    const uploadOptions = {
      resource_type: 'image' as const,
      folder: options.folder || 'chatgpt-images',
      public_id: options.public_id,
      transformation: options.transformation,
      tags: options.tags || [],
      quality: 'auto:good',
      fetch_format: 'auto',
    };

    const result = await cloudinary.uploader.upload(base64String, uploadOptions);
    
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      created_at: result.created_at,
    };
  } catch (error) {
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Upload a file buffer to Cloudinary
 */
export async function uploadFileBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;
    
    const uploadOptions = {
      resource_type: mimeType.startsWith('image/') ? 'image' as const : 'auto' as const,
      folder: options.folder || 'chatgpt-uploads',
      public_id: options.public_id || filename.split('.')[0],
      original_filename: filename,
      tags: options.tags || [],
      quality: mimeType.startsWith('image/') ? 'auto:good' : undefined,
      fetch_format: mimeType.startsWith('image/') ? 'auto' : undefined,
    };

    const result = await cloudinary.uploader.upload(base64String, uploadOptions);
    
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      bytes: result.bytes,
      width: result.width || 0,
      height: result.height || 0,
      created_at: result.created_at,
    };
  } catch (error) {
    throw new Error('Failed to upload file to Cloudinary');
  }
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    return false;
  }
}

/**
 * Bulk delete images from Cloudinary
 */
export async function bulkDeleteFromCloudinary(publicIds: string[]): Promise<{
  deleted: string[];
  failed: string[];
}> {
  const deleted: string[] = [];
  const failed: string[] = [];
  
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    
    Object.entries(result.deleted).forEach(([publicId, status]) => {
      if (status === 'deleted') {
        deleted.push(publicId);
      } else {
        failed.push(publicId);
      }
    });
    
    // Also add any not_found as failed
    if (result.not_found) {
      failed.push(...result.not_found);
    }
  } catch (error) {
    failed.push(...publicIds);
  }
  
  return { deleted, failed };
}

export default cloudinary;