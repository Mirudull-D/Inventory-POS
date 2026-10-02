export type PrinterType = "thermal" | "sheet";
export type PaperSize = "58" | "80" | "A4" | "A5";
export type PrintSettings = { type: PrinterType; size: PaperSize };

export const DEFAULT_PRINT_SETTINGS: PrintSettings = { type: "thermal", size: "80" };

// Query-string form (used when opening the invoice page for printing), e.g. "thermal-80".
export const paperKey = (s: PrintSettings): string => `${s.type}-${s.size}`;

export const parsePaperKey = (key?: string | null): PrintSettings | null => {
  if (!key) return null;
  const [type, size] = key.split("-");
  if ((type === "thermal" && (size === "58" || size === "80")) || (type === "sheet" && (size === "A4" || size === "A5"))) {
    return { type, size } as PrintSettings;
  }
  return null;
};

// Print-only CSS for the chosen paper. Thermal rolls use a narrow continuous page and a
// smaller root font size so rem-based layouts shrink to fit.
export const paperPrintCss = (s: PrintSettings): string => {
  if (s.type === "thermal") {
    const mm = s.size === "58" ? 58 : 80;
    const root = s.size === "58" ? 7 : 9;
    return `@page{size:${mm}mm auto;margin:2mm}
html{font-size:${root}px !important}
html,body{width:${mm - 4}mm !important;max-width:${mm - 4}mm !important}
.invoice-sheet{max-width:100% !important;width:100% !important;padding:0 !important;overflow-wrap:anywhere}`;
  }
  return `@page{size:${s.size} portrait;margin:${s.size === "A5" ? "8mm 7mm" : "12mm 10mm"}}`;
};
