import { Moved, movedMetadata } from "@/components/redirect/Moved";

// The museum used to live here. Old bookmarks (/museum, /museum#case-003, /museum#desk) go to the same stop
// on the homepage, where the hall stands at the named case and focuses its label, as it did here.
export const metadata = movedMetadata("/", "The museum has moved");

export default function MuseumMoved() {
  return <Moved to="/" keepHash label="the museum" />;
}
