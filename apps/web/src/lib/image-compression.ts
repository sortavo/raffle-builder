/**
 * Client-side image compression utility using Canvas API
 * Compresses images before upload to reduce storage usage and improve load times
 */

export interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  minSizeToCompress: number; // Only compress files larger than this (in bytes)
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.8,
  minSizeToCompress: 500 * 1024, // 500KB
};

/**
 * Loads an image file into an HTMLImageElement
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculates new dimensions while maintaining aspect ratio
 */
const calculateDimensions = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

/**
 * Determines if image has transparency (PNG with alpha)
 */
const hasTransparency = (file: File): boolean => {
  return file.type === 'image/png';
};

/**
 * Converts canvas to File
 */
const canvasToFile = (
  canvas: HTMLCanvasElement,
  fileName: string,
  mimeType: string,
  quality: number
): Promise<File> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], fileName, { type: mimeType });
          resolve(file);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      mimeType,
      quality
    );
  });
};

/**
 * Compresses an image file using Canvas API
 * @param file The image file to compress
 * @param options Compression options
 * @returns CompressionResult with the compressed file and size information
 */
export const compressImage = async (
  file: File,
  options?: Partial<CompressionOptions>
): Promise<CompressionResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Skip compression for small files
  if (originalSize < opts.minSizeToCompress) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  try {
    const img = await loadImage(file);
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      opts.maxWidth,
      opts.maxHeight
    );

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Determine output format: preserve PNG for transparency, otherwise use JPEG
    const preserveTransparency = hasTransparency(file);
    const mimeType = preserveTransparency ? 'image/png' : 'image/jpeg';
    const quality = preserveTransparency ? 1 : opts.quality;
    
    // Generate new filename with correct extension
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const extension = preserveTransparency ? 'png' : 'jpg';
    const newFileName = `${baseName}.${extension}`;

    const compressedFile = await canvasToFile(canvas, newFileName, mimeType, quality);
    const compressedSize = compressedFile.size;

    // If compression didn't help, return original
    if (compressedSize >= originalSize) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        wasCompressed: false,
      };
    }

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      wasCompressed: true,
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file on error
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }
};

/**
 * Formats bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
