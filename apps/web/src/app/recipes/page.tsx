'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { formatMoney } from '@/lib/currency';
import { api } from '@/lib/api';
import {
  Plus, Trash2, Save, X, ChefHat, DollarSign, TrendingUp,
  AlertTriangle, Package, Percent, BarChart3, Search, Edit2
} from 'lucide-react';

const apiGet = <T,>(path: string): Promise<T> => api.get<T>(path);
const apiPost = <T,>(path: string, body: any): Promise<T> => api.post<T>(path, body);
const apiPut = <T,>(path: string, body: any): Promise<T> => api.put<T>(path, body);
const apiDelete = (path: string) => api.del(path);

type Tab = 'recipes' | 'ingredients' | 'analysis';

export default function RecipesPage() {
  const router = useRouter();
  const store = usePosStore();
  const [tab, setTab] = useState<Tab>('recipes');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Recipe editor state
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [recipeProductId, setRecipeProductId] = useState('');
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [recipeYield, setRecipeYield] = useState('1');
  const [recipeInstructions, setRecipeInstructions] = useState('');

  // Ingredient editor state
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState('kg');
  const [ingCost, setIngCost] = useState('');
  const [ingStock, setIngStock] = useState('');
  const [ingCategory, setIngCategory] = useState('');
  const [showIngDialog, setShowIngDialog] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [r, i, p] = await Promise.all([
        apiGet<any[]>('/recipes'),
        apiGet<any[]>('/ingredients'),
        apiGet<any>('/products'),
      ]);
      setRecipes(r || []);
      setIngredients(i || []);
      setProducts(p?.data || p || []);
      if (tab === 'analysis') {
        const a = await apiGet<any>('/recipes/cost-analysis');
        setAnalysis(a);
      }
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  // ── Ingredient CRUD ──
  const openIngDialog = (ing?: any) => {
    if (ing) {
      setEditingIngredient(ing);
      setIngName(ing.name);
      setIngUnit(ing.unit);
      setIngCost(parseFloat(ing.costPerUnit).toString());
      setIngStock(parseFloat(ing.currentStock).toString());
      setIngCategory(ing.category || '');
    } else {
      setEditingIngredient(null);
      setIngName(''); setIngUnit('kg'); setIngCost(''); setIngStock(''); setIngCategory('');
    }
    setShowIngDialog(true);
  };

  const saveIngredient = async () => {
    const data = { name: ingName, unit: ingUnit, costPerUnit: parseFloat(ingCost) || 0, currentStock: parseFloat(ingStock) || 0, category: ingCategory || undefined };
    if (editingIngredient) {
      await apiPut(`/ingredients/${editingIngredient.id}`, data);
    } else {
      await apiPost('/ingredients', data);
    }
    setShowIngDialog(false);
    loadData();
  };

  // ── Recipe Editor ──
  const openRecipeEditor = (recipe?: any) => {
    if (recipe) {
      setEditingRecipe(recipe);
      setRecipeProductId(recipe.product.id);
      setRecipeYield(recipe.yieldQuantity.toString());
      setRecipeInstructions(recipe.instructions || '');
      setRecipeItems(recipe.items.map((i: any) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity,
        unit: i.unit,
        name: i.ingredient.name,
        costPerUnit: i.ingredient.costPerUnit,
      })));
    } else {
      setEditingRecipe(null);
      setRecipeProductId('');
      setRecipeYield('1');
      setRecipeInstructions('');
      setRecipeItems([]);
    }
  };

  const addRecipeItem = () => {
    setRecipeItems([...recipeItems, { ingredientId: '', quantity: 0, unit: 'kg', name: '', costPerUnit: 0 }]);
  };

  const updateRecipeItem = (idx: number, field: string, value: any) => {
    const items = [...recipeItems];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'ingredientId') {
      const ing = ingredients.find(i => i.id === value);
      if (ing) {
        items[idx].name = ing.name;
        items[idx].unit = ing.unit;
        items[idx].costPerUnit = parseFloat(ing.costPerUnit);
      }
    }
    setRecipeItems(items);
  };

  const removeRecipeItem = (idx: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== idx));
  };

  const saveRecipe = async () => {
    const items = recipeItems.filter(i => i.ingredientId && i.quantity > 0).map(i => ({
      ingredientId: i.ingredientId, quantity: parseFloat(i.quantity), unit: i.unit,
    }));
    if (editingRecipe) {
      await apiPut(`/recipes/${editingRecipe.id}`, { yieldQuantity: parseFloat(recipeYield), instructions: recipeInstructions, items });
    } else {
      await apiPost('/recipes', { productId: recipeProductId, yieldQuantity: parseFloat(recipeYield), instructions: recipeInstructions, items });
    }
    setEditingRecipe(null);
    setRecipeProductId('');
    loadData();
  };

  const totalRecipeCost = recipeItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (i.costPerUnit || 0), 0);
  const selectedProduct = products.find((p: any) => p.id === recipeProductId);
  const productPrice = selectedProduct ? parseFloat(selectedProduct.price) : 0;
  const margin = productPrice > 0 ? ((productPrice - totalRecipeCost) / productPrice) * 100 : 0;

  const productsWithoutRecipe = products.filter((p: any) => !recipes.find(r => r.product.id === p.id));

  const filteredRecipes = searchQuery
    ? recipes.filter(r => r.product.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : recipes;

  if (loading) return <div className="flex h-full items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Recetas y Costeo</h1>

        </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {/* ═══ RECIPES TAB ═══ */}
        {tab === 'recipes' && (
          <div>
            {/* Editor */}
            {(editingRecipe || recipeProductId) ? (
              <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{editingRecipe ? `Editar: ${editingRecipe.product.name}` : 'Nueva Receta'}</h3>
                  <button onClick={() => { setEditingRecipe(null); setRecipeProductId(''); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                {!editingRecipe && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                    <select value={recipeProductId} onChange={e => setRecipeProductId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                      <option value="">Seleccionar producto...</option>
                      {productsWithoutRecipe.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} — {formatMoney(parseFloat(p.price))}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rendimiento</label>
                    <input type="number" value={recipeYield} onChange={e => setRecipeYield(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label>
                    <input type="text" value={recipeInstructions} onChange={e => setRecipeInstructions(e.target.value)}
                      placeholder="Notas de preparación..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                  </div>
                </div>

                {/* Ingredients list */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Ingredientes</h4>
                    <button onClick={addRecipeItem} className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                      <Plus size={14} /> Agregar
                    </button>
                  </div>

                  {recipeItems.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Agrega ingredientes a la receta</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400 uppercase px-1">
                        <span className="col-span-5">Ingrediente</span>
                        <span className="col-span-2">Cantidad</span>
                        <span className="col-span-2">Unidad</span>
                        <span className="col-span-2 text-right">Costo</span>
                        <span className="col-span-1"></span>
                      </div>
                      {recipeItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <select value={item.ingredientId} onChange={e => updateRecipeItem(idx, 'ingredientId', e.target.value)}
                            className="col-span-5 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900">
                            <option value="">Seleccionar...</option>
                            {ingredients.filter(i => i.isActive !== false).map(i => (
                              <option key={i.id} value={i.id}>{i.name} ({formatMoney(parseFloat(i.costPerUnit))}/{i.unit})</option>
                            ))}
                          </select>
                          <input type="number" step="0.01" value={item.quantity || ''} onChange={e => updateRecipeItem(idx, 'quantity', e.target.value)}
                            className="col-span-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900" placeholder="0" />
                          <span className="col-span-2 text-sm text-gray-500">{item.unit || '-'}</span>
                          <span className="col-span-2 text-right text-sm font-medium text-gray-900">
                            {formatMoney((parseFloat(item.quantity) || 0) * (item.costPerUnit || 0))}
                          </span>
                          <button onClick={() => removeRecipeItem(idx)} className="col-span-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cost summary */}
                <div className="rounded-xl bg-gray-50 p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Costo Total</p>
                      <p className="text-lg font-bold text-red-600">{formatMoney(totalRecipeCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Precio Venta</p>
                      <p className="text-lg font-bold text-gray-900">{formatMoney(productPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ganancia</p>
                      <p className="text-lg font-bold text-green-600">{formatMoney(productPrice - totalRecipeCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Margen</p>
                      <p className={`text-lg font-bold ${margin >= 50 ? 'text-green-600' : margin >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                        {margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <button onClick={saveRecipe} disabled={recipeItems.length === 0 || (!editingRecipe && !recipeProductId)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                  <Save size={18} /> Guardar Receta
                </button>
              </div>
            ) : (
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Buscar receta..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900" />
                </div>
                <button onClick={() => setRecipeProductId('new')} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  <Plus size={18} /> Nueva Receta
                </button>
              </div>
            )}

            {/* Recipe list */}
            {!editingRecipe && !recipeProductId && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredRecipes.map(r => {
                  const price = parseFloat(r.product.price);
                  const m = r.margin;
                  return (
                    <div key={r.id} className="rounded-xl border bg-white p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{r.product.name}</h3>
                          <p className="text-xs text-gray-400">{r.items.length} ingredientes · Rinde {r.yieldQuantity}</p>
                        </div>
                        <button onClick={() => openRecipeEditor(r)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                          <Edit2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="rounded-lg bg-red-50 p-2">
                          <p className="text-[10px] text-red-400 uppercase">Costo</p>
                          <p className="text-sm font-bold text-red-600">{formatMoney(r.totalCost)}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-2">
                          <p className="text-[10px] text-gray-400 uppercase">Precio</p>
                          <p className="text-sm font-bold text-gray-900">{formatMoney(price)}</p>
                        </div>
                        <div className={`rounded-lg p-2 ${m >= 50 ? 'bg-green-50' : m >= 30 ? 'bg-amber-50' : 'bg-red-50'}`}>
                          <p className="text-[10px] text-gray-400 uppercase">Margen</p>
                          <p className={`text-sm font-bold ${m >= 50 ? 'text-green-600' : m >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{m.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {r.items.slice(0, 4).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-500">
                            <span>{item.ingredient.name}</span>
                            <span>{item.quantity} {item.unit} — {formatMoney(item.cost)}</span>
                          </div>
                        ))}
                        {r.items.length > 4 && <p className="text-xs text-gray-400">+{r.items.length - 4} más...</p>}
                      </div>
                    </div>
                  );
                })}

                {filteredRecipes.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-400">
                    <ChefHat size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No hay recetas. Crea la primera.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ INGREDIENTS TAB ═══ */}
        {tab === 'ingredients' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Ingredientes</h2>
              <button onClick={() => openIngDialog()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus size={18} /> Nuevo Ingrediente
              </button>
            </div>

            <div className="rounded-xl border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-right">Costo/Unidad</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ingredients.map(ing => {
                    const low = parseFloat(ing.currentStock) <= parseFloat(ing.minStock);
                    return (
                      <tr key={ing.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{ing.name}</td>
                        <td className="px-4 py-3 text-gray-500">{ing.category || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{formatMoney(parseFloat(ing.costPerUnit))}/{ing.unit}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={low ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                            {parseFloat(ing.currentStock)} {ing.unit}
                          </span>
                          {low && <AlertTriangle size={14} className="inline ml-1 text-red-500" />}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ing.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {ing.isActive !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openIngDialog(ing)} className="text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {ingredients.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  <Package size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No hay ingredientes. Crea el primero.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ANALYSIS TAB ═══ */}
        {tab === 'analysis' && analysis && (
          <div>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl bg-white border p-4 text-center">
                <ChefHat size={24} className="mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold text-gray-900">{analysis.summary.totalProducts}</p>
                <p className="text-xs text-gray-500">Productos con receta</p>
              </div>
              <div className="rounded-xl bg-white border p-4 text-center">
                <Percent size={24} className="mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold text-green-600">{analysis.summary.avgMargin}%</p>
                <p className="text-xs text-gray-500">Margen promedio</p>
              </div>
              <div className="rounded-xl bg-white border p-4 text-center">
                <AlertTriangle size={24} className="mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold text-red-600">{analysis.summary.lowMarginCount}</p>
                <p className="text-xs text-gray-500">Margen bajo (&lt;30%)</p>
              </div>
              <div className="rounded-xl bg-white border p-4 text-center">
                <TrendingUp size={24} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold text-emerald-600">{analysis.summary.highMarginCount}</p>
                <p className="text-xs text-gray-500">Margen alto (&gt;60%)</p>
              </div>
            </div>

            {/* Product cost table */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-right">Costo</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Ganancia</th>
                    <th className="px-4 py-3 text-right">Margen</th>
                    <th className="px-4 py-3 text-right">Markup</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analysis.products.map((p: any) => (
                    <tr key={p.productId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.productName}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatMoney(p.cost)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatMoney(p.price)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{formatMoney(p.profit)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          p.margin >= 50 ? 'bg-green-100 text-green-700' : p.margin >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>{p.margin}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.markup}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Ingredient dialog */}
      {showIngDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingIngredient ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input value={ingName} onChange={e => setIngName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Ej: Arroz, Camarón..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select value={ingUnit} onChange={e => setIngUnit(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                    <option value="oz">oz</option>
                    <option value="lt">lt</option>
                    <option value="ml">ml</option>
                    <option value="unidad">unidad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo/Unidad</label>
                  <input type="number" step="0.01" value={ingCost} onChange={e => setIngCost(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                  <input type="number" step="0.01" value={ingStock} onChange={e => setIngStock(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <input value={ingCategory} onChange={e => setIngCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Ej: Mariscos, Verduras..." />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowIngDialog(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveIngredient} disabled={!ingName} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
