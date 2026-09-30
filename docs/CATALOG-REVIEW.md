# Catalog import — items that need owner review

Source: the product list transcribed from the ADISAH POS screenshots. That list is not assumed to
be the full inventory. Every item below is flagged **Needs review** in Store Operations
(Dashboard → Needs review, or Products → "Needs review" filter).

## Kept off the website until variants and prices are entered
The POS shows several prices, but the variant names and prices aren't legible, so they were not
guessed. Each is imported as a **hidden** product with no variants.

| POS name | What's needed |
|---|---|
| Gari Ijebu 4lbs | Each variant's size/title and price |
| Indomie Onions | Each variant's size/title and price |
| Olaola Yam 5lbs | Each variant's size/title and price |
| Par Excellence Rice 25lbs | Each variant's size/title and price |
| Peak Milk Powder 400G | The three variants' titles and prices |

## Truncated second variants (kept offline)
| Product | Known | Needed |
|---|---|---|
| Derica Paste 210g | "Regular" $2.99 (live). Second variant $4.99 (**offline**) | Real title/size of the $4.99 variant. Confirm SKU M719440 belongs to "Regular". |
| Gino Tomato Paste 210g | "Regular" $2.99 (live). Second variant $4.99 (**offline**) | Real title/size of the $4.99 variant. Confirm SKU Y781787 belongs to "Regular". |

## Variable-price items (visible, sold out, not purchasable online)
Goat Meat, Mackerel, Whitening Fish. Decide the online workflow: per-lb price, quote, pickup only,
or in store only. Also confirm "Whitening Fish" (possibly "Whiting").

## Naming / identity questions (live, as named in the POS)
| POS name | Question |
|---|---|
| Cut Bitter Leaf / Uncut Bitterleaf | Preferred spelling ("Bitter Leaf" vs "Bitterleaf") and pack sizes |
| De Rica | Same product line as Derica Paste 210g? Different size? |
| Mcvite Shortbread 200g | Possibly "McVitie's". Customer name left as in POS until confirmed |
| Coco Samba, Kick & Start, Plum | Product type unclear. Currently **uncategorized** |
| Honey Beans | Confirm SKU 605327C belongs to the 4 lbs variant |
| Crayfish, Funbact A, Honey, Mudet Herbal Mixture, Plantain Chips, Pundu, Smooth Cassava | Pack size / brand not shown |

## Import conventions
- Pack sizes were moved from the product name into the variant (e.g. "Milo 400G" → Milo / 400 g).
  The POS name is stored unchanged in `source_name`.
- **Stock quantities aren't in the source data**, so count tracking is off for every item.
  Status is "In stock" unless the POS showed it sold out. Turn tracking on per variant in
  Inventory to have items sell out automatically at 0.
- Category assignments, homepage "featured" picks, and search aliases (e.g. *garri*, *ewedu*,
  *iru*, *yaji*) are editable merchandising defaults.
- No descriptions, images, ratings or reviews were invented.
