import { Moved, movedMetadata } from "@/components/redirect/Moved";

// The old ordering-app site's work history: its successor is About.
export const metadata = movedMetadata("/about", "About");

export default function OrdersMoved() {
  return <Moved to="/about" label="About" />;
}
