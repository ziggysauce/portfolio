import { NotFoundContent } from "@/components/NotFoundContent";
import V3Layout from "./(v3)/layout";

// Unmatched URLs render outside any route group, so this brings the v3 header and footer along.
export default function NotFound() {
  return (
    <V3Layout>
      <NotFoundContent />
    </V3Layout>
  );
}
