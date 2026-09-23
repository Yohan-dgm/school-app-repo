import * as FileSystem from "expo-file-system";

// Persistent on-device cache for chat attachments (images/video/PDF/voice
// notes) so repeat opens don't re-download or re-convert media. Cache key is
// a deterministic hash of the resolved attachment URL, so "is this cached?"
// is just a file-existence check — no separate manifest to keep in sync.
//
// Attachments can never be edited (the backend only allows editing text
// messages), so the only invalidation case is delete — callers evict() when
// a message is deleted.

const CACHE_DIR = `${FileSystem.documentDirectory}chat-media-cache/`;
const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500MB

let dirReadyPromise: Promise<void> | null = null;
const inFlightDownloads = new Map<string, Promise<string>>();
let evictionSweepRunning = false;

const ensureDir = async (): Promise<void> => {
  if (!dirReadyPromise) {
    dirReadyPromise = (async () => {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
    })();
  }
  return dirReadyPromise;
};

// Simple non-cryptographic string hash — good enough for a cache key.
const hashUrl = (url: string): string => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
};

const extensionFor = (url: string): string => {
  const clean = url.split("?")[0];
  const match = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match ? match[1].toLowerCase() : "bin";
};

const pathFor = (remoteUrl: string): string =>
  `${CACHE_DIR}${hashUrl(remoteUrl)}.${extensionFor(remoteUrl)}`;

/** Returns the local file:// uri if this url is already cached, else null. */
export const getLocalUri = async (remoteUrl?: string | null): Promise<string | null> => {
  if (!remoteUrl) return null;
  await ensureDir();
  const path = pathFor(remoteUrl);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
};

/**
 * Returns the local cached uri for this url, downloading it first if needed.
 * Concurrent calls for the same url share one in-flight download.
 */
export const ensureCached = async (
  remoteUrl?: string | null,
  authToken?: string | null
): Promise<string | null> => {
  if (!remoteUrl) return null;
  await ensureDir();
  const path = pathFor(remoteUrl);

  const existing = await FileSystem.getInfoAsync(path);
  if (existing.exists) return path;

  const inFlight = inFlightDownloads.get(remoteUrl);
  if (inFlight) return inFlight;

  const downloadPromise = (async () => {
    try {
      const headers: Record<string, string> | undefined = authToken
        ? { Authorization: `Bearer ${authToken}` }
        : undefined;

      const downloadResumable = FileSystem.createDownloadResumable(remoteUrl, path, { headers });
      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error("Download failed");

      runEvictionSweepInBackground();
      return result.uri;
    } finally {
      inFlightDownloads.delete(remoteUrl);
    }
  })();

  inFlightDownloads.set(remoteUrl, downloadPromise);
  return downloadPromise;
};

/**
 * Called right after a successful send: the bytes are already on-device
 * (the file the user picked/recorded), so copy them straight into the
 * cache instead of re-downloading what was just uploaded.
 */
export const adoptLocalFile = async (
  remoteUrl?: string | null,
  localSourceUri?: string | null
): Promise<void> => {
  if (!remoteUrl || !localSourceUri) return;
  try {
    await ensureDir();
    const path = pathFor(remoteUrl);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) return;
    await FileSystem.copyAsync({ from: localSourceUri, to: path });
  } catch (err) {
    console.warn("[ChatMediaCache] Failed to adopt local file into cache:", err);
  }
};

/** Deletes the cached copy of this url, if any (e.g. on message delete). */
export const evict = async (remoteUrl?: string | null): Promise<void> => {
  if (!remoteUrl) return;
  try {
    const path = pathFor(remoteUrl);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  } catch (err) {
    console.warn("[ChatMediaCache] Failed to evict cached media:", err);
  }
};

// Size-capped FIFO eviction: if the cache dir exceeds MAX_CACHE_BYTES,
// delete the oldest (by modification time) files until back under cap.
const runEvictionSweepInBackground = (): void => {
  if (evictionSweepRunning) return;
  evictionSweepRunning = true;

  (async () => {
    try {
      const entries = await FileSystem.readDirectoryAsync(CACHE_DIR);
      const infos = await Promise.all(
        entries.map(async (name) => {
          const path = `${CACHE_DIR}${name}`;
          const info = await FileSystem.getInfoAsync(path);
          return info.exists && !info.isDirectory
            ? { path, size: info.size ?? 0, modificationTime: info.modificationTime ?? 0 }
            : null;
        })
      );
      const files = infos.filter((f): f is NonNullable<typeof f> => f !== null);

      let totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize <= MAX_CACHE_BYTES) return;

      const oldestFirst = files.sort((a, b) => a.modificationTime - b.modificationTime);
      for (const file of oldestFirst) {
        if (totalSize <= MAX_CACHE_BYTES) break;
        await FileSystem.deleteAsync(file.path, { idempotent: true });
        totalSize -= file.size;
      }
    } catch (err) {
      console.warn("[ChatMediaCache] Eviction sweep failed:", err);
    } finally {
      evictionSweepRunning = false;
    }
  })();
};

export default { getLocalUri, ensureCached, adoptLocalFile, evict };
