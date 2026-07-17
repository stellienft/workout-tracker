import Image from "next/image";
import { CoverImage } from "@/components/ui/cover-image";
import { Play } from "lucide-react";

export function VideoThumb({
  thumbnailUrl,
  coverPath,
  alt,
}: {
  thumbnailUrl: string | null;
  coverPath: string | null;
  alt: string;
}) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
      {thumbnailUrl ? (
        <Image src={thumbnailUrl} alt={alt} fill sizes="80px" className="object-cover" />
      ) : (
        <CoverImage path={coverPath} alt={alt} sizes="80px" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
        <Play className="h-5 w-5 text-white/90" fill="currentColor" />
      </div>
    </div>
  );
}
