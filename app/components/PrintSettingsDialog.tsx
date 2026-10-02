"use client";

import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import {
  DEFAULT_PRINT_SETTINGS,
  type PaperSize,
  type PrinterType,
  type PrintSettings,
} from "@/lib/printPaper";

const STORAGE_KEY = "pos-print-settings";

const SIZES: Record<PrinterType, { value: PaperSize; label: string }[]> = {
  thermal: [
    { value: "58", label: "58 mm" },
    { value: "80", label: "80 mm" },
  ],
  sheet: [
    { value: "A4", label: "A4" },
    { value: "A5", label: "A5" },
  ],
};

export function PrintSettingsDialog({
  open,
  onClose,
  onPrint,
}: {
  open: boolean;
  onClose: () => void;
  onPrint: (settings: PrintSettings) => void;
}) {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);

  // Remember the last choice on this device, but still ask every time.
  useEffect(() => {
    if (!open) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.type && saved?.size && SIZES[saved.type as PrinterType]?.some((s) => s.value === saved.size)) {
        setSettings(saved);
      }
    } catch {}
  }, [open]);

  if (!open) return null;

  const setType = (type: PrinterType) =>
    setSettings({ type, size: SIZES[type][type === "thermal" ? 1 : 0].value });

  const choice = (active: boolean) =>
    `py-4 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
      active
        ? "border-[#3F5F7F] bg-[#F4F7FA] text-[#3F5F7F]"
        : "border-black/10 bg-white text-[#52525B] hover:border-black/30"
    }`;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between bg-[#171717] text-white px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Printer className="w-4 h-4" /> Print Settings
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-black mb-2.5">Printer Type</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setType("thermal")} className={choice(settings.type === "thermal")}>
                Thermal Roll
              </button>
              <button type="button" onClick={() => setType("sheet")} className={choice(settings.type === "sheet")}>
                Sheet (A4/A5)
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-black mb-2.5">Paper Size</p>
            <div className="grid grid-cols-2 gap-3">
              {SIZES[settings.type].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, size: s.value })}
                  className={choice(settings.size === s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 px-5 py-4 bg-[#FAFAFA] border-t border-black/10">
          <button
            onClick={onClose}
            className="text-xs font-black uppercase tracking-wider text-[#52525B] hover:text-black cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
              } catch {}
              onPrint(settings);
            }}
            className="flex items-center gap-2 bg-[#3F5F7F] hover:bg-[#35516C] text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Now
          </button>
        </div>
      </div>
    </div>
  );
}
