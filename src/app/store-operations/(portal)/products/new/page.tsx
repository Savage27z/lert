import type { Metadata } from "next";
import Link from "next/link";
import { NewProductForm } from "@/components/ops/ProductForms";
import { PageHeader } from "@/components/ops/PageHeader";
import { requireStaff } from "@/lib/ops/auth";
import { opsPath } from "@/lib/ops/paths";
import { can } from "@/lib/ops/permissions";
import { listTaxonomy } from "@/lib/ops/queries";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const staff = await requireStaff("catalog.write");
  const taxonomy = await listTaxonomy();
  return (
    <>
      <Link href={opsPath("/products")} className="text-[12.5px] text-ink-500 hover:underline">← Products</Link>
      <PageHeader title="Add product" description="New products start as hidden drafts. Publish them from the product page when they're ready." />
      <NewProductForm categories={taxonomy.categories} brands={taxonomy.brands} canPrice={can(staff, "pricing.write")} />
    </>
  );
}
