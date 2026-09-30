import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Young_Serif } from "next/font/google";
import { CartDrawer } from "@/components/store/CartDrawer";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { env } from "@/lib/env";
import { formatUsPhone, telHref } from "@/lib/phone";
import { getCategories, getStoreSettings } from "@/lib/storefront/queries";
import "@/styles/store.css";

const display = Young_Serif({ weight: "400", subsets: ["latin"], variable: "--font-young-serif", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "ADISAH African Store — Authentic African groceries", template: "%s · ADISAH African Store" },
  description:
    "Shop authentic African groceries online at ADISAH African Store: rice, beans, spices, leaves, drinks and the everyday favourites you know.",
  applicationName: "ADISAH African Store",
  openGraph: { type: "website", siteName: "ADISAH African Store", locale: "en_US" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#10301f",
  width: "device-width",
  initialScale: 1,
};

// Catalog data must always be current (prices change from Store Operations
// without redeploying), so storefront pages render per request.
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getStoreSettings(), getCategories().catch(() => [])]);
  const phone = settings.contact_phone ? formatUsPhone(settings.contact_phone) : null;
  const phoneHref = settings.contact_phone ? telHref(settings.contact_phone) : null;

  return (
    <html lang="en-US" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-forest-800 focus:px-4 focus:py-2 focus:text-cream-50">
          Skip to content
        </a>
        <Header settings={settings} categories={categories} />
        <main id="main">{children}</main>
        <Footer settings={settings} categories={categories} />
        <CartDrawer phone={phone} phoneHref={phoneHref} />
      </body>
    </html>
  );
}
