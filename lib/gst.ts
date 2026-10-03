// GST helpers. Product prices are GST-INCLUSIVE: the price the admin enters (and the customer
// pays) already contains the tax. GST is only ever carved out of the price for display on the
// invoice (CGST + SGST), never added on top of it.

export type GstLine = { price: number; qty: number; rate: number };

export type GstRateRow = {
  rate: number; // full GST rate, e.g. 18
  gst: number; // GST ₹ contained in the lines at this rate
};

// GST ₹ contained inside a GST-inclusive amount: amount − amount ÷ (1 + rate/100).
export const gstInside = (amount: number, rate: number): number =>
  rate > 0 && amount > 0 ? amount - amount / (1 + rate / 100) : 0;

// Effective (blended) rate on the taxable value: GST ₹ ÷ (inclusive amount − GST ₹) × 100.
// For a single rate this returns that rate exactly (18 → 18).
export const effectiveGstRate = (inclusiveAmount: number, gst: number): number => {
  const taxable = inclusiveAmount - gst;
  return taxable > 0 && gst > 0 ? Math.round((gst / taxable) * 10000) / 100 : 0;
};

// Group GST-inclusive lines by rate. `factor` scales every line (used to spread an
// order-level discount across the lines: (subtotal − discount) ÷ subtotal).
export const gstByRate = (lines: GstLine[], factor = 1): GstRateRow[] => {
  const map = new Map<number, number>();
  for (const l of lines) {
    if (!(l.rate > 0)) continue;
    const gst = gstInside(l.price * l.qty * factor, l.rate);
    map.set(l.rate, (map.get(l.rate) ?? 0) + gst);
  }
  return [...map.entries()]
    .map(([rate, gst]) => ({ rate, gst }))
    .sort((a, b) => a.rate - b.rate);
};

// Orders saved before GST became inclusive stored subtotal = item total + GST (GST was added
// on top). Detect them so old invoices still print correctly: for those, the stored subtotal
// exceeds the sum of the item lines by the GST amount.
export const isLegacyAddedGst = (o: {
  isGst: boolean;
  subtotal: number;
  gstAmount: number;
  itemsTotal: number;
}): boolean => {
  if (!o.isGst || !(o.gstAmount > 0)) return false;
  const matchesInclusive = Math.abs(o.itemsTotal - o.subtotal) < 0.5;
  const matchesAdded = Math.abs(o.itemsTotal + o.gstAmount - o.subtotal) < 0.5;
  return matchesAdded && !matchesInclusive;
};
