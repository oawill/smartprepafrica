/** Deliberately generic — no TOEFL-specific markup or behavior — so this
 * can be reused for lesson audio or other subjects later, not just
 * TOEFL listening practice. */
export function AudioPlayer({ src }: { src: string }) {
  return (
    <audio controls preload="metadata" className="w-full" src={src}>
      Your browser does not support audio playback.
    </audio>
  );
}
