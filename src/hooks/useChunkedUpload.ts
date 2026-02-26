import { useState, useCallback } from "react";
import * as FileSystem from "expo-file-system";
import { 
  useInitChunkedUploadMutation as useChatInit, 
  usePushUploadChunkMutation as useChatPush, 
  useFinishChunkedUploadMutation as useChatFinish 
} from "../api/chat-api";
import {
  useInitChunkedUploadMutation as useActivityInit,
  usePushUploadChunkMutation as useActivityPush,
  useFinishChunkedUploadMutation as useActivityFinish
} from "../api/activity-feed-api";

interface UseChunkedUploadProps {
  onSuccess?: (mediaData: any) => void;
  onError?: (error: string) => void;
}

interface ChunkedUploadMutations {
  init: any;
  push: any;
  finish: any;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk for better reliability
const MAX_RETRIES = 2; // Simple retry logic

const useChunkedUploadBase = (
  { init, push, finish }: ChunkedUploadMutations,
  { onSuccess, onError }: UseChunkedUploadProps = {}
) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(async (fileUri: string, filename: string, mimeType?: string) => {
    setIsUploading(true);
    setProgress(0);

    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      const totalSize = fileInfo.size;
      
      // 1. Initialize Upload
      const initResponse = await init({
        filename,
        total_size: totalSize,
        mime_type: mimeType,
      }).unwrap();

      if (!initResponse.success) {
        throw new Error(initResponse.message || "Failed to initialize upload");
      }

      const uploadId = initResponse.data.upload_id;
      let uploadedSize = 0;

      // 2. Upload Chunks
      while (uploadedSize < totalSize) {
        const length = Math.min(CHUNK_SIZE, totalSize - uploadedSize);
        
        // Read chunk as base64
        const base64Chunk = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
          position: uploadedSize,
          length: length,
        });

        // Write to temporary chunk file
        const chunkUri = `${FileSystem.cacheDirectory}chunk_${uploadId}_${uploadedSize}`;
        await FileSystem.writeAsStringAsync(chunkUri, base64Chunk, {
          encoding: FileSystem.EncodingType.Base64,
        });

        try {
          // Push chunk with retries
          let retryCount = 0;
          let chunkSent = false;
          
          while (retryCount <= MAX_RETRIES && !chunkSent) {
            try {
              const pushResponse = await push({
                upload_id: uploadId,
                chunk: {
                  uri: chunkUri,
                  name: `chunk_${uploadedSize}`,
                  type: "application/octet-stream",
                },
                offset: uploadedSize,
              }).unwrap();

              if (!pushResponse.success) {
                throw new Error(pushResponse.message || "Failed to upload chunk");
              }

              chunkSent = true;
              uploadedSize += length;
              setProgress(uploadedSize / totalSize);
            } catch (chunkError) {
              retryCount++;
              if (retryCount > MAX_RETRIES) {
                throw chunkError;
              }
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        } finally {
          // Always clean up temp chunk file
          await FileSystem.deleteAsync(chunkUri, { idempotent: true });
        }
      }

      // 3. Finish Upload
      const finishResponse = await finish({
        upload_id: uploadId,
      }).unwrap();

      if (!finishResponse.success) {
        throw new Error(finishResponse.message || "Failed to finalize upload");
      }

      setIsUploading(false);
      onSuccess?.(finishResponse.data.media);
      return finishResponse.data.media;

    } catch (error: any) {
      console.error("Chunked upload failed:", error);
      setIsUploading(false);
      const errorMsg = error?.data?.message || error.message || "Upload failed";
      onError?.(errorMsg);
      throw error;
    }
  }, [init, push, finish, onSuccess, onError]);

  return {
    uploadFile,
    isUploading,
    progress,
  };
};

// Hook for Chat module
export const useChatChunkedUpload = (props: UseChunkedUploadProps = {}) => {
  const [init] = useChatInit();
  const [push] = useChatPush();
  const [finish] = useChatFinish();
  
  return useChunkedUploadBase({ init, push, finish }, props);
};

// Hook for Activity Feed module
export const useActivityFeedChunkedUpload = (props: UseChunkedUploadProps = {}) => {
  const [init] = useActivityInit();
  const [push] = useActivityPush();
  const [finish] = useActivityFinish();
  
  return useChunkedUploadBase({ init, push, finish }, props);
};

// Default export/backward compatibility
export const useChunkedUpload = useChatChunkedUpload;
