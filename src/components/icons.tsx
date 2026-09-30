import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8" /></Icon>
);
export const UserIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.2-4 4.4-6 8-6s6.8 2 8 6" /></Icon>
);
export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
  </Icon>
);
export const BasketIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 9.5h17l-1.6 9.1a2 2 0 0 1-2 1.7H7.1a2 2 0 0 1-2-1.7L3.5 9.5Z" />
    <path d="m8 9.5 3-6M16 9.5l-3-6M9 13.5v3M15 13.5v3M12 13.5v3" />
  </Icon>
);
export const MenuIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 7h16M4 12h16M4 17h10" /></Icon>
);
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
);
export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4h3.5l1.6 4-2.2 1.4a11 11 0 0 0 6.7 6.7l1.4-2.2 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5C10.4 20 4 13.6 3.5 5.6A1.5 1.5 0 0 1 5 4Z" />
  </Icon>
);
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const MinusIcon = (p: IconProps) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const ArrowRightIcon = (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const ChevronDownIcon = (p: IconProps) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const ChevronLeftIcon = (p: IconProps) => <Icon {...p}><path d="m15 6-6 6 6 6" /></Icon>;
export const ChevronRightIcon = (p: IconProps) => <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>;
export const SlidersIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Icon>
);
export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const TrashIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" /></Icon>
);
export const StoreIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" /><path d="M10 20v-5h4v5" /></Icon>
);
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4M12 17h.01" /></Icon>
);

/* ---------- Aisle icons (one per category slug) ---------- */

const aisle: Record<string, React.ReactNode> = {
  "rice-grains": (
    <>
      <path d="M12 21V9" />
      <path d="M12 9c-2.5-.5-3.5-2.7-3-5 2.4.4 3.4 2.6 3 5ZM12 9c2.5-.5 3.5-2.7 3-5-2.4.4-3.4 2.6-3 5Z" />
      <path d="M12 14c-2.8-.3-4.2-2.4-4-5 2.7.2 4.1 2.3 4 5ZM12 14c2.8-.3 4.2-2.4 4-5-2.7.2-4.1 2.3-4 5Z" />
    </>
  ),
  "beans-legumes": (
    <>
      <path d="M7.5 5.5c3-1.4 6 .8 5.3 3.7-.4 1.6-2.6 1.8-3 3.4-.8 3-4.7 3.4-6 .7-1.4-2.8.8-6.7 3.7-7.8Z" />
      <path d="M15.8 11.2c2.7-.4 4.7 2 3.7 4.5-.6 1.4-2.4 1.3-3.1 2.6-1.3 2.4-4.6 1.8-5-.7-.5-2.7 1.8-6 4.4-6.4Z" />
    </>
  ),
  "flours-swallow": (
    <>
      <path d="M6 9h12l-1 11H7L6 9Z" />
      <path d="M8 9c0-2 1.8-3 4-3s4 1 4 3" />
      <path d="M10 14h4" />
    </>
  ),
  "spices-seasonings": (
    <>
      <path d="M14 3.5c1.5 1 1.8 2.5 1.2 4" />
      <path d="M15.2 7.5c2.6 1.4 3 5.2.7 8.8-2.4 3.7-6.6 5-9.4 4.2-.4-.1-.4-.6 0-.8 3.3-1.8 4.2-5 4.4-8 .2-3.2 2-5.4 4.3-4.2Z" />
    </>
  ),
  "pastes-canned": (
    <>
      <ellipse cx="12" cy="6" rx="6" ry="2" />
      <path d="M6 6v12c0 1.1 2.7 2 6 2s6-.9 6-2V6" />
      <path d="M6 10.5c0 1.1 2.7 2 6 2s6-.9 6-2" />
    </>
  ),
  "breakfast-beverages": (
    <>
      <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Z" />
      <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M9 3.5c-.8 1 .8 1.8 0 3M12.5 3.5c-.8 1 .8 1.8 0 3" />
    </>
  ),
  snacks: (
    <>
      <path d="M4.5 16.5C7 9 12.5 5 19.5 4.5c-.5 7-4.5 12.5-12 15" />
      <path d="M4.5 16.5 7.5 19.5M9 12l3 3M12.5 8.5l3 3" />
    </>
  ),
  "vegetables-leaves": (
    <>
      <path d="M5 19c0-8 5-13.5 14-14-.5 9-6 14-14 14Z" />
      <path d="M5 19 13 11M9.5 14.5H13M12 12V9" />
    </>
  ),
  "meat-fish": (
    <>
      <path d="M3.5 12c2.8-4 7-5.5 11-4.5 2 .5 3.5 2 4.5 4.5-1 2.5-2.5 4-4.5 4.5-4 1-8.2-.5-11-4.5Z" />
      <path d="M19 12l2-2.5v5L19 12ZM14.5 11.5h.01" />
    </>
  ),
  "herbal-bitters": (
    <>
      <path d="M10 3h4M10.5 3v4.5L8 10v10h8V10l-2.5-2.5V3" />
      <path d="M8 14h8" />
    </>
  ),
  "beauty-personal-care": (
    <>
      <path d="M9 9h6v11H9z" />
      <path d="M10.5 9V6h3v3M12 6V3.5h3.5" />
      <path d="M9 13h6" />
    </>
  ),
  "kitchen-household": (
    <>
      <path d="M4 11h16v2a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-2Z" />
      <path d="M2.5 11h19M9 7.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5" />
    </>
  ),
};

export function AisleIcon({ slug, ...p }: IconProps & { slug: string | undefined }) {
  return (
    <Icon strokeWidth={1.4} {...p}>
      {aisle[slug ?? ""] ?? <path d="M4 9h16v11H4zM4 9l2-5h12l2 5M9 13h6" />}
    </Icon>
  );
}
