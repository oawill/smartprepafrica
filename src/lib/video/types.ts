export type VideoSource = {
  playbackUrl: string;
  captionsUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** Alternate-quality renditions, when the source actually has them. Null
   * (not a fake single-item list) when only one playback URL exists, which
   * is the case for every lesson today since videos are plain hosted URLs
   * rather than served by an adaptive-streaming provider. */
  qualityOptions: { label: string; url: string }[] | null;
};
