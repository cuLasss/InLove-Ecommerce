import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

export interface ImageUploadOptions {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  quality?: number;
}

class ImageUploadService {
  private readonly BUCKET_NAME = 'product-images';
  private readonly DEFAULT_MAX_SIZE = 5;
  private readonly DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly DEFAULT_QUALITY = 0.8;

  async uploadImage(
    file: File,
    productId: string,
    options: ImageUploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const bucketExists = await this.ensureBucketExists();
      if (!bucketExists) {
        return {
          success: false,
          error: 'Bucket product-images indisponivel. Configure o bucket e as politicas RLS no Supabase.',
        };
      }

      const validation = this.validateFile(file, options);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const processedFile = await this.processImage(file, options);
      const fileName = this.generateFileName(file.name, productId);
      const filePath = `${options.folder || 'products'}/${fileName}`;

      const { error } = await supabase.storage.from(this.BUCKET_NAME).upload(filePath, processedFile, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        return {
          success: false,
          error: `Erro no upload: ${error.message}`,
        };
      }

      const { data: urlData } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async deleteImage(imagePath: string): Promise<UploadResult> {
    try {
      const { error } = await supabase.storage.from(this.BUCKET_NAME).remove([imagePath]);

      if (error) {
        return {
          success: false,
          error: `Erro ao remover imagem: ${error.message}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async ensureBucketExists(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.getBucket(this.BUCKET_NAME);

      if (error) {
        return false;
      }

      return Boolean(data);
    } catch {
      return false;
    }
  }

  private validateFile(file: File, options: ImageUploadOptions): { valid: boolean; error?: string } {
    const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;
    const allowedTypes = options.allowedTypes || this.DEFAULT_ALLOWED_TYPES;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de arquivo nao permitido. Tipos aceitos: ${allowedTypes.join(', ')}`,
      };
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return {
        valid: false,
        error: `Arquivo muito grande. Tamanho maximo: ${maxSize}MB`,
      };
    }

    return { valid: true };
  }

  private async processImage(file: File, options: ImageUploadOptions): Promise<File> {
    const quality = options.quality || this.DEFAULT_QUALITY;

    if (!file.type.includes('image/') || quality >= 1) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erro ao comprimir imagem'));
              return;
            }

            resolve(
              new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
            );
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Erro ao carregar imagem'));
      };

      img.src = objectUrl;
    });
  }

  private generateFileName(originalName: string, productId: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || 'jpg';

    return `${productId}_${timestamp}_${randomId}.${extension}`;
  }
}

export const imageUploadService = new ImageUploadService();

export const useImageUpload = () => ({
  uploadImage: imageUploadService.uploadImage.bind(imageUploadService),
  deleteImage: imageUploadService.deleteImage.bind(imageUploadService),
  ensureBucketExists: imageUploadService.ensureBucketExists.bind(imageUploadService),
});
