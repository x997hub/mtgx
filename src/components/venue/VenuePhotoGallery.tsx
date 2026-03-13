import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { VenuePhoto } from "@/types/database.types";

const VENUE_IMAGES_BUCKET = "venue-images";

interface VenuePhotoGalleryProps {
  photos: VenuePhoto[];
  title: string;
}

export function VenuePhotoGallery({ photos, title }: VenuePhotoGalleryProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {photos.map((photo, idx) => {
            const url = supabase.storage
              .from(VENUE_IMAGES_BUCKET)
              .getPublicUrl(photo.storage_path).data.publicUrl;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className="shrink-0 snap-start rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <img src={url} alt="" className="h-28 w-40 object-cover" />
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={selectedIdx !== null}
        onOpenChange={() => setSelectedIdx(null)}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black border-none">
          {selectedIdx !== null && (
            <img
              src={
                supabase.storage
                  .from(VENUE_IMAGES_BUCKET)
                  .getPublicUrl(photos[selectedIdx].storage_path).data.publicUrl
              }
              alt=""
              className="w-full h-full object-contain max-h-[85vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
