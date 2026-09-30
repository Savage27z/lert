import type { Metadata } from "next";
import { Instrument_Sans, Young_Serif } from "next/font/google";
import "@/styles/ops.css";

const display = Young_Serif({ weight: "400", subsets: ["latin"], variable: "--font-young-serif", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans", display: "swap" });

// Separate root layout: none of the storefront's code, styles or links are
// shared with this area, and nothing here is linked from the storefront.
export const metadata: Metadata = {
  title: { default: "Store Operations", template: "%s · Store Operations" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default function OpsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
