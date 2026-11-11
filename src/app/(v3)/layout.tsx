import { BottomNav } from "@/components/BottomNav";
import { AddedToast, CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

// The v3 ordering-app pages share this chrome. The museum (/museum) brings its own.
export default function V3Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <AddedToast />
      <BottomNav />
      <CartDrawer />
    </>
  );
}
