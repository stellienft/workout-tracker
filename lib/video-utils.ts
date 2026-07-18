import { youtubeVideoId, youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/utils";
import type { ExerciseVideo } from "@/lib/types";
import type { LoadedVideo } from "@/lib/workout-loader";

export function normaliseVideoForClient(
  v: ExerciseVideo | null
): LoadedVideo | null {
  if (!v) return null;
  const vid =
    v.provider_video_id ?? (v.source_url ? youtubeVideoId(v.source_url) : null);
  return {
    id: v.id,
    videoId: vid,
    embedUrl: v.embed_url ?? (vid ? youtubeEmbedUrl(vid) : null),
    thumbnailUrl: v.thumbnail_url ?? (vid ? youtubeThumbnailUrl(vid) : null),
    sourceUrl: v.source_url,
    title: v.title,
    creatorName: v.creator_name,
    verificationStatus: v.verification_status,
  };
}
