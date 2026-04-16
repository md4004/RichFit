import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { PRODUCTS as STATIC_PRODUCTS } from '@/constants';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { db, collection, onSnapshot, query, OperationType, handleFirestoreError } from '@/firebase';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

interface CartItem extends Product {
  quantity: number;
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const path = 'products';
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      setProducts(productData.length > 0 ? productData : STATIC_PRODUCTS);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const categories = ['All', 'Supplements', 'Equipment', 'Apparel', 'Accessories'];

  return (
    <Layout>
      {/* Hero Branding */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <span className="font-headline text-primary font-bold uppercase tracking-[0.3em] text-sm mb-2 block">EQUIPMENT & FUEL</span>
            <h2 className="font-headline text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85]">MEMBER<br />CATALOG</h2>
          </div>
          <div className="flex flex-col items-end gap-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative bg-zinc-900 p-4 border border-zinc-800 hover:border-primary transition-all group"
            >
              <ShoppingCart className="w-6 h-6 text-white group-hover:text-primary transition-colors" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-black font-headline font-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>
            <div className="bg-zinc-900 p-4 border-l-4 border-primary max-w-xs hidden md:block">
              <p className="text-xs font-headline uppercase tracking-wider text-zinc-400 leading-relaxed">
                Exclusive performance gear reserved for RichFit elite members. Engineered for high-intensity output.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-12 border-t border-zinc-800 pt-8">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="SEARCH GEAR..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border-none focus:ring-1 focus:ring-primary text-white font-headline text-xs uppercase py-4 pl-12 pr-4"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-6 py-2 font-headline font-black text-xs uppercase tracking-widest transition-all border-2 whitespace-nowrap",
                selectedCategory === cat ? "bg-primary border-primary text-black" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className={product.isBestSeller ? "md:col-span-8 bg-zinc-900 group relative overflow-hidden flex flex-col md:flex-row" : "md:col-span-4 bg-zinc-900 group"}
            >
              {product.isBestSeller && (
                <div className="absolute top-0 left-0 bg-primary text-black font-black px-4 py-1 z-10 font-headline uppercase text-xs">Best Seller</div>
              )}
              
              <div className={product.isBestSeller ? "md:w-1/2 overflow-hidden h-96 md:h-full" : "relative aspect-[4/5] overflow-hidden"}>
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  src={product.image} 
                  alt={product.name}
                  referrerPolicy="no-referrer"
                />
                {!product.isBestSeller && <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-all"></div>}
              </div>

              <div className={product.isBestSeller ? "md:w-1/2 p-8 flex flex-col justify-between bg-zinc-900" : "p-6"}>
                <div>
                  <p className="font-headline text-primary text-sm font-bold tracking-widest mb-4 uppercase">{product.category}</p>
                  <h3 className="font-headline text-3xl font-black uppercase mb-4 leading-none text-white">{product.name}</h3>
                  <p className="text-zinc-400 text-sm font-body mb-8 line-clamp-3">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <p className="font-headline text-3xl font-black text-white">${product.price.toFixed(2)}</p>
                    {!product.isBestSeller && <span className="text-zinc-500 text-xs font-headline uppercase">{product.sku}</span>}
                  </div>
                </div>
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full bg-primary text-black font-headline font-black uppercase py-4 mt-8 hover:bg-white transition-colors flex items-center justify-center gap-2"
                >
                  {product.isBestSeller ? 'ADD TO KIT →' : 'Quick Add'}
                </button>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800">
              <p className="text-zinc-500 font-headline uppercase text-xl">No gear found matching criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 h-full border-l-8 border-primary flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-headline font-black uppercase text-2xl text-white flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-primary" />
                Your Kit
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4 bg-black p-4 border border-zinc-800">
                  <div className="w-20 h-20 bg-zinc-900 flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-headline font-bold text-white uppercase text-sm truncate">{item.name}</h4>
                    <p className="text-primary font-headline font-black text-xs">${item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center border border-zinc-800">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-zinc-500 hover:text-white"><Minus className="w-3 h-3" /></button>
                        <span className="px-3 text-xs font-mono text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-zinc-500 hover:text-white"><Plus className="w-3 h-3" /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-zinc-700 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                  <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-headline text-xl font-black uppercase tracking-widest">Kit is Empty</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-black border-t border-zinc-800 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-zinc-500 font-headline uppercase font-black text-xs">Total Investment</span>
                  <span className="text-3xl font-black font-headline text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <button className="w-full bg-primary text-black font-headline font-black text-xl uppercase py-5 hover:bg-white transition-all">
                  Secure Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Featured Banner */}
      <section className="mt-16 bg-primary p-12 text-black flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-2xl">
          <h2 className="font-headline text-5xl md:text-7xl font-black uppercase leading-tight mb-4 tracking-tighter">ELITE<br />SUBSCRIPTION</h2>
          <p className="font-headline text-xl font-bold uppercase tracking-tight">GET 20% OFF ALL PRODUCTS AUTOMATICALLY WITH ELITE MEMBERSHIP.</p>
        </div>
        <button className="bg-black text-white font-headline font-black uppercase px-12 py-6 text-xl hover:bg-zinc-900 transition-colors">UPGRADE NOW</button>
      </section>
    </Layout>
  );
}
