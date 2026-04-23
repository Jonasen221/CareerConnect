import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Check } from 'lucide-react';

/**
 * MobileSelect - renders a native Select on desktop, a bottom-sheet Drawer on mobile.
 * 
 * Usage (drop-in replacement for shadcn Select):
 *   <MobileSelect value={val} onValueChange={setVal} placeholder="Pick one"
 *     options={[{ value: 'a', label: 'Option A' }, ...]} />
 */
export default function MobileSelect({ value, onValueChange, options = [], placeholder = 'Select...', className = '' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  const handleSelect = (v) => {
    onValueChange(v);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)} className="bg-transparent text-slate-600 mt-1.5 px-3 py-2 text-sm rounded-md flex h-9 w-full items-center justify-between border border-input shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">


        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {/* Desktop: native drawer hidden, use portal; Mobile: drawer */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-1 overflow-y-auto max-h-[60vh]">
            {options.map((opt) =>
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-medium text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-700 transition-colors">

                {opt.label}
                {value === opt.value && <Check className="w-4 h-4 text-[#5BA4C4]" />}
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>);

}