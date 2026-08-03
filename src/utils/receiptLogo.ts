import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

let cachedLogoDataUri: string | null = null;

/**
 * Resolves the bundled Nexis College logo to a base64 data URI so it can be
 * embedded directly in the receipt HTML — expo-print's renderer runs outside
 * the app's own module bundler, so a plain require()'d asset URI won't
 * resolve there; a data URI always will. Cached after the first successful
 * resolution since the asset never changes at runtime.
 */
export async function getReceiptLogoDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri;

  try {
    const asset = Asset.fromModule(require("../assets/images/nexis-logo.png"));
    await asset.downloadAsync();

    if (!asset.localUri) return null;

    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    cachedLogoDataUri = `data:image/png;base64,${base64}`;
    return cachedLogoDataUri;
  } catch (err) {
    console.warn("⚠️ Could not load receipt logo, continuing without it:", err);
    return null;
  }
}
