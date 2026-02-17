'use client';

import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS, Locale } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';

/**
 * Compact language switcher — dropdown with flag + label.
 * Usage: <LanguageSelector /> anywhere in the app.
 */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const locales: Locale[] = ['es', 'en'];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
          compact
            ? 'hover:bg-white/10 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Globe size={15} />
        <span>{LOCALE_FLAGS[locale]}</span>
        {!compact && <span>{LOCALE_LABELS[locale]}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border bg-white py-1 shadow-lg">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => { setLocale(loc); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                loc === locale ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'
              }`}
            >
              <span className="text-base">{LOCALE_FLAGS[loc]}</span>
              <span>{LOCALE_LABELS[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
