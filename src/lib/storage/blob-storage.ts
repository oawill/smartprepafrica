import { put } from "@vercel/blob";

/** Every media URL elsewhere in this app is a manually-pasted external
 * link — there is no real upload/storage flow anywhere (see
 * src/lib/video/resolve-video-source.ts's comment on this exact gap). This
 * is the first real one, kept behind a single seam so a different provider
 * (S3, Cloudinary) could replace it later without touching call sites. */
export function isBlobStorageConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function uploadAudio(opts: {
  pathname: string;
  data: Uint8Array;
  contentType: string;
}): Promise<{ url: string }> {
  const blob = await put(opts.pathname, Buffer.from(opts.data), {
    access: "public",
    contentType: opts.contentType,
    addRandomSuffix: true,
  });
  return { url: blob.url };
}

/** Same upload seam as uploadAudio, generalized for images/charts/
 * diagrams — e.g. for an admin who wants to host a SAT graphic or TOEFL
 * illustration and paste the resulting URL into a bulk-import file, rather
 * than sourcing an external link. */
export async function uploadImage(opts: {
  pathname: string;
  data: Uint8Array;
  contentType: string;
}): Promise<{ url: string }> {
  const blob = await put(opts.pathname, Buffer.from(opts.data), {
    access: "public",
    contentType: opts.contentType,
    addRandomSuffix: true,
  });
  return { url: blob.url };
}
