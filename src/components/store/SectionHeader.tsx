import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

export function SectionHeader({ kicker, title, href, linkLabel, id }: {
  kicker?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 id={id} className="mt-1.5 font-display text-2xl text-forest-900 sm:text-[2rem]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 pb-1 text-sm font-semibold text-forest-700 hover:text-forest-900">
          {linkLabel ?? "View all"} <ArrowRightIcon size={16} />
        </Link>
      )}
    </div>
  );
}
