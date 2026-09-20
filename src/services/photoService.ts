import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { generateId } from '../utils/id';

export interface CropAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const photoService = {
  /**
   * Captures or picks a photo from camera or gallery.
   * Returns dataUrl or null if cancelled.
   * Catches permission denials and throws a specific error.
   */
  async capturePhoto(source: 'camera' | 'gallery'): Promise<string | null> {
    try {
      const cameraSource = source === 'camera' ? CameraSource.Camera : CameraSource.Photos;
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: cameraSource,
      });

      return image.dataUrl || null;
    } catch (err: any) {
      const message = err?.message?.toLowerCase() || '';
      if (
        message.includes('permission') ||
        message.includes('denied') ||
        message.includes('access')
      ) {
        throw new Error('PERMISSION_DENIED');
      }
      if (message.includes('cancel') || message.includes('user cancelled')) {
        return null;
      }
      console.error('[PhotoService] capturePhoto error:', err);
      throw err;
    }
  },

  /**
   * Crops the image to a 1:1 square, resizes to 512x512,
   * and exports as JPEG with quality 0.85.
   */
  async createCropped512Jpeg(
    imageSrc: string,
    cropAreaPixels: CropAreaPixels
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Draw cropped area into 512x512 canvas
        ctx.drawImage(
          image,
          cropAreaPixels.x,
          cropAreaPixels.y,
          cropAreaPixels.width,
          cropAreaPixels.height,
          0,
          0,
          512,
          512
        );

        // Export as JPEG at quality 0.85
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      image.onerror = (e) => reject(e);
      image.src = imageSrc;
    });
  },

  /**
   * Saves base64 JPEG data to Directory.Data (app private storage)
   * under employee_photos/{uuid}.jpg.
   * Returns the relative path.
   */
  async savePhotoToPrivateStorage(base64DataUrl: string): Promise<string> {
    const uuid = generateId();
    const relativePath = `employee_photos/${uuid}.jpg`;

    // Strip prefix: data:image/jpeg;base64,
    const base64Data = base64DataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

    // Write file to app private data directory
    await Filesystem.writeFile({
      path: relativePath,
      data: base64Data,
      directory: Directory.Data,
      recursive: true,
    });

    return relativePath;
  },

  /**
   * Resolves a relative photo_path to a webview-renderable URI.
   */
  async getDisplayUri(relativePath: string | null): Promise<string | null> {
    if (!relativePath) return null;

    try {
      // In web browser development fallback:
      // Filesystem plugin on web can retrieve as data URL
      const uriResult = await Filesystem.getUri({
        path: relativePath,
        directory: Directory.Data,
      });

      if (Capacitor.getPlatform() === 'web') {
        // In browser, reading file data as data URL directly is most reliable
        try {
          const fileData = await Filesystem.readFile({
            path: relativePath,
            directory: Directory.Data,
          });
          if (typeof fileData.data === 'string') {
            if (fileData.data.startsWith('data:')) return fileData.data;
            return `data:image/jpeg;base64,${fileData.data}`;
          }
        } catch {
          // If readFile fails, try convertFileSrc
        }
      }

      return Capacitor.convertFileSrc(uriResult.uri);
    } catch (err) {
      console.warn('[PhotoService] Could not resolve photo URI:', relativePath, err);
      return null;
    }
  },

  /**
   * Safely removes a photo file from private storage.
   */
  async deletePhotoFile(relativePath: string | null): Promise<void> {
    if (!relativePath) return;
    try {
      await Filesystem.deleteFile({
        path: relativePath,
        directory: Directory.Data,
      });
    } catch (e) {
      // File might already be deleted or not found
      console.warn('[PhotoService] deletePhotoFile failed:', relativePath, e);
    }
  },

  /**
   * Reads photo as base64 string for backup export
   */
  async readPhotoAsBase64(relativePath: string): Promise<string | null> {
    try {
      const res = await Filesystem.readFile({
        path: relativePath,
        directory: Directory.Data,
      });
      if (typeof res.data === 'string') {
        return res.data.replace(/^data:image\/[a-z]+;base64,/, '');
      }
      return null;
    } catch (err) {
      console.warn('[PhotoService] readPhotoAsBase64 failed for:', relativePath, err);
      return null;
    }
  },

  /**
   * Restores a photo file from base64 string from backup
   */
  async writePhotoFromBase64(relativePath: string, base64: string): Promise<void> {
    await Filesystem.writeFile({
      path: relativePath,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });
  },
};
