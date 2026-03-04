import { CityBadge } from "@/components/shared/CityBadge";

interface VenueHeaderProps {
  name: string;
  city: string;
  photoUrl?: string | null;
}

export function VenueHeader({ name, city, photoUrl }: VenueHeaderProps) {
  return (
    <div className="space-y-4">
      {photoUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-[#16213e]">
          <img
            src={photoUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-100">{name}</h1>
        <CityBadge city={city} />
      </div>
    </div>
  );
}
