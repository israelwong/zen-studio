import { useState, useCallback } from 'react';
import { uploadFileStorage, deleteFileStorage } from '@/lib/actions/shared/media.actions';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  url: string;
  fileName: string;
  size: number;
  isUploading?: boolean;
}

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[], studioSlug: string, category: string, subcategory?: string): Promise<UploadedFile[]> => {
      setIsUploading(true);
      const uploadedFiles: UploadedFile[] = [];

      try {
        for (const file of files) {
          try {
            const result = await uploadFileStorage({
              file,
              studioSlug,
              category,
              subcategory
            });

            if (result.success && result.publicUrl) {
              uploadedFiles.push({
                id: `${Date.now()}-${Math.random()}`,
                url: result.publicUrl,
                fileName: file.name,
                size: file.size
              });
              toast.success(`${file.name} subido correctamente`);
            } else {
              toast.error(`Error subiendo ${file.name}: ${result.error}`);
            }
          } catch (error) {
            toast.error(`Error subiendo ${file.name}`);
            console.error(error);
          }
        }
        return uploadedFiles;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const deleteFile = useCallback(
    async (publicUrl: string, studioSlug: string): Promise<boolean> => {
      try {
        const result = await deleteFileStorage({
          publicUrl,
          studioSlug
        });

        if (result.success) {
          toast.success('Archivo eliminado correctamente');
          return true;
        } else {
          toast.error(`Error eliminando archivo: ${result.error}`);
          return false;
        }
      } catch (error) {
        toast.error('Error eliminando archivo');
        console.error(error);
        return false;
      }
    },
    []
  );

  return {
    uploadFiles,
    deleteFile,
    isUploading
  };
}
