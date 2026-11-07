import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page max-w-xl py-16 text-center">
      <h1 className="font-display text-[44px] leading-tight">That&rsquo;s been 86&rsquo;d</h1>
      <p className="mt-3 text-[16px] text-muted">Kitchen talk for &ldquo;we&rsquo;re out of it.&rdquo; This page doesn&rsquo;t exist, but the rest of the menu does.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to the menu
      </Link>
    </div>
  );
}
