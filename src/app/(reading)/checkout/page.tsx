import { Moved, movedMetadata } from "@/components/redirect/Moved";

// The old ordering-app site's checkout ended in an email to Daniel: its successor is Contact.
export const metadata = movedMetadata("/contact", "Contact");

export default function CheckoutMoved() {
  return <Moved to="/contact" label="Contact" />;
}
