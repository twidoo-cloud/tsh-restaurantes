'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Search, X, MapPin, Clock, Wifi } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MenuItem {
  id: string; name: string; description: string | null; price: number | string;
  imageUrl: string | null; tags: string[]; attributes: any;
}

interface MenuCategory {
  id: string; name: string; description: string | null; products: MenuItem[];
}

export default function PublicMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableNum = searchParams.get('table');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  useEffect(() => { loadMenu(); }, [slug]);

  const loadMenu = async () => {
    try {
      const r = await fetch(`${API}/menu/${slug}`);
      if (!r.ok) throw new Error('Restaurante no encontrado');
      const d = await r.json();
      setData(d);
      if (d.menu?.length > 0) setActiveCategory(d.menu[0].id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
    </div>
  );

  if (error || !data) return (
    <div className="flex min-h-screen items-center justify-center bg-white p-8 text-center">
      <div><p className="text-4xl mb-4">🍽️</p><p className="text-lg font-semibold text-gray-900">Restaurante no encontrado</p><p className="text-sm text-gray-500 mt-1">Verifica el enlace e intenta de nuevo</p></div>
    </div>
  );

  const { restaurant, branding, menu } = data;
  const accent = branding?.accent_color || branding?.accentColor || '#2563EB';
  const logoUrl = branding?.logo_url || branding?.logoUrl;

  const filtered: MenuCategory[] = search
    ? menu.map((c: MenuCategory) => ({
        ...c,
        products: c.products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())),
      })).filter((c: MenuCategory) => c.products.length > 0)
    : menu;

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={restaurant.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ backgroundColor: accent }}>
                  {restaurant.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">{restaurant.name}</h1>
                {tableNum && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> Mesa {tableNum}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Wifi size={12} /> Menú Digital
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en el menú..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm text-gray-900 focus:border-gray-400 focus:outline-none" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
          </div>
        </div>

        {/* Category tabs */}
        {!search && (
          <div className="overflow-x-auto border-t">
            <div className="mx-auto flex max-w-lg gap-0.5 px-4">
              {menu.map((c: MenuCategory) => (
                <button key={c.id} onClick={() => { setActiveCategory(c.id); document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className={`shrink-0 border-b-2 px-4 py-2.5 text-xs font-semibold transition whitespace-nowrap ${activeCategory === c.id ? 'border-current' : 'border-transparent text-gray-500'}`}
                  style={activeCategory === c.id ? { color: accent, borderColor: accent } : {}}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Menu content */}
      <main className="mx-auto max-w-lg px-4 pb-20 pt-4">
        {filtered.length === 0 ? (
          <div className="py-12 text-center"><p className="text-gray-400">No se encontraron resultados</p></div>
        ) : (
          filtered.map((cat: MenuCategory) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="mb-6">
              <h2 className="mb-3 text-lg font-bold text-gray-900">{cat.name}</h2>
              {cat.description && <p className="mb-3 text-sm text-gray-500">{cat.description}</p>}
              <div className="space-y-2">
                {cat.products.map(item => (
                  <button key={item.id} onClick={() => setSelectedItem(item)}
                    className="flex w-full items-start gap-3 rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.description && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{item.description}</p>}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: accent }}>{formatPrice(item.price)}</span>
                        {item.tags?.map((tag: string) => (
                          <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{tag}</span>
                        ))}
                      </div>
                    </div>
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-white/90 backdrop-blur-sm py-2 text-center text-[10px] text-gray-400">
        Powered by POS-SaaS · {restaurant.name}
      </footer>

      {/* Item detail modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedItem(null)} />
          <div className="relative mx-auto w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl sm:mx-4">
            {selectedItem.imageUrl && (
              <img src={selectedItem.imageUrl} alt={selectedItem.name} className="h-48 w-full rounded-t-2xl object-cover" />
            )}
            <button onClick={() => setSelectedItem(null)} className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"><X size={16} /></button>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
              {selectedItem.description && <p className="mt-2 text-sm text-gray-600">{selectedItem.description}</p>}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-bold" style={{ color: accent }}>{formatPrice(selectedItem.price)}</span>
                {selectedItem.tags?.map((tag: string) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{tag}</span>
                ))}
              </div>
              {selectedItem.attributes && typeof selectedItem.attributes === 'object' && Object.keys(selectedItem.attributes).length > 0 && (
                <div className="mt-4 space-y-1">
                  {Object.entries(selectedItem.attributes).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500 capitalize">{k}</span>
                      <span className="text-gray-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
