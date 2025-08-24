// Client-side Cloudinary utilities (no server dependencies)

/**
 * Get optimized image URL with transformations
 * This version works by modifying existing Cloudinary URLs instead of relying on environment variables
 */
export function getOptimizedImageUrl(
  publicIdOrUrl: string,
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit' | 'pad';
    quality?: 'auto' | number;
    format?: 'auto' | 'jpg' | 'png' | 'webp';
  } = {}
): string {
  const transformations = [];
  
  if (options.width || options.height) {
    const dimensions = [];
    if (options.width) dimensions.push(`w_${options.width}`);
    if (options.height) dimensions.push(`h_${options.height}`);
    if (options.crop) dimensions.push(`c_${options.crop}`);
    transformations.push(dimensions.join(','));
  }
  
  if (options.quality) {
    transformations.push(`q_${options.quality}`);
  }
  
  if (options.format) {
    transformations.push(`f_${options.format}`);
  }
  
  const transformationString = transformations.length > 0 
    ? transformations.join('/') + '/'
    : '';
  
  // If it's already a full Cloudinary URL, modify it by inserting transformations
  if (publicIdOrUrl.includes('res.cloudinary.com')) {
    // Extract parts from existing URL: https://res.cloudinary.com/CLOUD_NAME/image/upload/v123456/folder/image.jpg
    const match = publicIdOrUrl.match(/https:\/\/res\.cloudinary\.com\/([^\/]+)\/image\/upload\/(.+)/);
    if (match) {
      const [, cloudName, pathAfterUpload] = match;
      const url = `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}${pathAfterUpload}`;
      return url;
    }
  }
  
  // Fallback: try to use environment variable for public_id only
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (cloudName) {
    const url = `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}${publicIdOrUrl}`;
    return url;
  }
  
  // If all else fails, return the original input (might be a direct URL)
  return publicIdOrUrl;
}

/**
 * Generate thumbnail URL
 * Can accept either a publicId or full cloudinaryUrl
 */
export function getThumbnailUrl(publicIdOrUrl: string, size: number = 200): string {
  return getOptimizedImageUrl(publicIdOrUrl, {
    width: size,
    height: size,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * Generate preview URL  
 * Can accept either a publicId or full cloudinaryUrl
 */
export function getPreviewUrl(publicIdOrUrl: string, width: number = 800): string {
  return getOptimizedImageUrl(publicIdOrUrl, {
    width,
    quality: 'auto',
    format: 'auto',
    crop: 'limit'
  });
}