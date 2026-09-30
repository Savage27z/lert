import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PhoneIcon } from "@/components/icons";
import { formatUsPhone, telHref } from "@/lib/phone";
import type { CategorySummary, StoreSettings } from "@/lib/storefront/types";
import { HeaderActions } from "./HeaderActions";
import { MobileMenu } from "./MobileMenu";
import { NAV_LINKS } from "./nav";
import { SearchForm } from "./SearchForm";

export function Header({ settings, categories }: { settings: StoreSettings; categories: CategorySummary[] }) {
  const phone = settings.contact_phone ? formatUsPhone(settings.contact_phone) : null;
  const phoneHref = settings.contact_phone ? telHref(settings.contact_phone) : null;

  return (
    <header>
      <div className="selvedge" />
      {settings.announcement?.text && (
        <div className="bg-forest-900 text-cream-100">
          <p className="mx-auto max-w-7xl px-4 py-2 text-center text-[0.8rem] sm:px-6">
            {settings.announcement.href ? (
              <Link href={settings.announcement.href} className="underline-offset-4 hover:underline">
                {settings.announcement.text}
              </Link>
            ) : (
              settings.announcement.text
            )}
          </p>
        </div>
      )}

      <div className="sticky top-0 z-30 border-b border-cream-200 bg-cream-50/95 backdrop-blur supports-[backdrop-filter]:bg-cream-50/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-2 sm:px-6 lg:h-[4.5rem] lg:gap-8">
          <MobileMenu categories={categories} phone={phone} phoneHref={phoneHref} />
          <Link href="/" className="mr-auto shrink-0 lg:mr-0" aria-label="ADISAH African Store — home">
            <Logo compact />
          </Link>
          <div className="hidden flex-1 lg:block lg:max-w-xl">
            <SearchForm id="search-desktop" />
          </div>
          <div className="lg:ml-auto">
            <HeaderActions />
          </div>
        </div>
      </div>

      <div className="border-b border-cream-200 bg-cream-50 px-4 pb-3 pt-1 lg:hidden">
        <SearchForm id="search-mobile" />
      </div>

      <nav aria-label="Main" className="hidden border-b border-cream-200 bg-cream-50 lg:block">
        <div className="mx-auto flex h-11 max-w-7xl items-center justify-between px-6">
          <ul className="flex items-center gap-7 text-[0.9rem] font-medium text-ink-700">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="py-3 hover:text-forest-800">{l.label}</Link>
              </li>
            ))}
          </ul>
          {phone && phoneHref && (
            <a href={phoneHref} className="inline-flex items-center gap-2 text-[0.85rem] font-medium text-forest-800 hover:underline">
              <PhoneIcon size={16} /> {phone}
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
