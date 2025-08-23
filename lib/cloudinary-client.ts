// Client-side Cloudinary utilities (no server dependencies)

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedImageUrl(
  publicId: string,
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
  
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}${publicId}`;
}

/**
 * Generate thumbnail URL
 */
export function getThumbnailUrl(publicId: string, size: number = 200): string {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * Generate preview URL
 */
export function getPreviewUrl(publicId: string, width: number = 800): string {
  return getOptimizedImageUrl(publicId, {
    width,
    quality: 'auto',
    format: 'auto',
    crop: 'limit'
  });
}