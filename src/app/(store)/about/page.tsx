import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "ADISAH African Store brings authentic African groceries closer to home.",
  alternates: { canonical: "/about" },
};

// The ADISAH story is intentionally not written yet: it will be supplied by
// the owner. Only confirmed facts appear here.
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-14">
      <p className="kicker">About us</p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-forest-900 sm:text-5xl">
        Authentic African groceries, closer to home.
      </h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink-700">
        <p>
          ADISAH African Store stocks the rice, beans, flours, spices, leaves, drinks and household staples that
          African kitchens in the United States rely on — the familiar brands and the fresh essentials, in one place.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/shop" className="btn btn-primary">Start shopping</Link>
        <Link href="/contact" className="btn btn-outline">Contact us</Link>
      </div>
    </div>
  );
}
