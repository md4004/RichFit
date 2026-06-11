import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { PRODUCTS as STATIC_PRODUCTS } from '@/constants';
import { TrendingUp, Plus, MoreVertical, Search, Trash2, Upload, X, Filter, History, DollarSign, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { db, collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, setDoc, OperationType, handleFirestoreError, storage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, orderBy, limit } from '@/firebase';
import { Product, Transaction } from '@/types';
import { cn } from '@/lib/utils';

export default function AdminShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<'inventory' | 'history'>('inventory');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [transactionDeleteConfirm, setTransactionDeleteConfirm] = useState<string | null>(null);
  const [transactionConfig, setTransactionConfig] = useState<{ product: Product, type: 'sale' | 'restock' } | null>(null);
  const [transactionQty, setTransactionQty] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    category: 'Supplements',
    sku: '',
    image: ''
  });

  useEffect(() => {
    const productsPath = 'products';
    const productsQuery = query(collection(db, productsPath));
    
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productData.length > 0 ? productData : STATIC_PRODUCTS);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, productsPath);
    });

    const transactionsPath = 'transactions';
    const transactionsQuery = query(collection(db, transactionsPath), orderBy('date', 'desc'), limit(50));
    
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(transactionData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, transactionsPath);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeTransactions();
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }

    setUploading(true);
    console.log("Attempting product image upload:", file.name);
    
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      
      // Using uploadBytes for better compatibility
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Product upload successful, getting URL...");
      
      const url = await getDownloadURL(snapshot.ref);
      console.log("Product file available at:", url);
      
      setFormData(prev => ({ ...prev, image: url }));
      alert("Product image uploaded successfully.");
    } catch (error: any) {
      console.error("Product upload error:", error);
      let message = "PRODUCT IMAGE UPLOAD FAILED\n\n";
      
      if (error.code === 'storage/unknown') {
        message += "This is likely a CORS issue. You must configure your Firebase Storage bucket to allow uploads from this domain.\n\n";
        message += "Command: gsutil cors set cors.json gs://gen-lang-client-0430129528.firebasestorage.app";
      } else if (error.code === 'storage/unauthorized') {
        message += "Permissions denied. Check Storage Rules.";
      } else {
        message += error.message;
      }
      
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        image: formData.image || `https://picsum.photos/seed/${formData.name}/800/600`,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'products'), productData);
      setShowAddModal(false);
      setFormData({ name: '', price: 0, stock: 0, category: 'Supplements', sku: '', image: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const handleTransaction = async () => {
    if (!transactionConfig) return;
    const { product, type } = transactionConfig;
    const quantity = transactionQty;

    try {
      const newStock = type === 'sale' ? product.stock - quantity : product.stock + quantity;
      if (newStock < 0) {
        alert("Insufficient stock for this operation.");
        return;
      }

      await updateDoc(doc(db, 'products', product.id), { stock: newStock });
      
      await addDoc(collection(db, 'transactions'), {
        productId: product.id,
        productName: product.name,
        amount: type === 'sale' ? product.price * quantity : 0,
        type,
        quantity,
        date: new Date().toISOString()
      });
      setTransactionConfig(null);
      setTransactionQty(1);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      setShowDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!window.confirm('Delete this transaction record?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', transactionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${transactionId}`);
    }
  };

  const handleSeedInventory = async () => {
    if (!window.confirm('Import initial static inventory to database?')) return;
    setLoading(true);
    try {
      for (const product of STATIC_PRODUCTS) {
        const { id, ...data } = product;
        await setDoc(doc(db, 'products', id), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      alert('Inventory seeded successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalIncome = transactions
    .filter(t => t.type === 'sale')
    .reduce((sum, t) => sum + t.amount, 0);

  const itemRevenue = transactions
    .filter(t => t.type === 'sale' && t.productId !== 'subscription' && t.productId !== 'subscription_renewal')
    .reduce((sum, t) => sum + t.amount, 0);

  const subscriptionRevenue = transactions
    .filter(t => t.type === 'sale' && (t.productId === 'subscription' || t.productId === 'subscription_renewal'))
    .reduce((sum, t) => sum + t.amount, 0);

  const categories = ['All', 'Supplements', 'Equipment', 'Apparel', 'Accessories'];

  return (
    <Layout isAdmin>
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
            Shop <span className="text-primary">Admin</span>
          </h1>
          <p className="text-zinc-500 font-headline uppercase tracking-[0.2em] text-sm italic">Global Inventory & Revenue Control</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView(view === 'inventory' ? 'history' : 'inventory')}
            className="bg-zinc-900 text-white font-black px-6 py-3 uppercase tracking-tighter font-headline text-sm flex items-center gap-2 active:scale-95 transition-all border border-zinc-800"
          >
            {view === 'inventory' ? <History className="w-4 h-4" /> : <Package className="w-4 h-4" />}
            {view === 'inventory' ? 'View History' : 'View Inventory'}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-white text-black font-black px-6 py-3 uppercase tracking-tighter font-headline text-sm flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </header>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-2 bg-zinc-900 p-6 border-t-4 border-primary flex flex-col justify-between">
          <span className="text-zinc-500 font-headline uppercase font-bold tracking-widest text-[10px]">Total Revenue</span>
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-primary text-5xl font-black font-headline leading-none">${totalIncome.toLocaleString()}</span>
            <div className="flex gap-4 mt-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-zinc-600 font-headline uppercase">Items</span>
                <span className="text-white font-headline font-bold text-xs">${itemRevenue.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-zinc-600 font-headline uppercase">Subscriptions</span>
                <span className="text-white font-headline font-bold text-xs">${subscriptionRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 p-6 border-t-4 border-zinc-800">
          <span className="text-zinc-500 font-headline uppercase font-bold tracking-widest text-[10px]">Items Sold</span>
          <div className="text-white text-3xl font-black font-headline mt-2">
            {transactions.filter(t => t.type === 'sale' && t.productId !== 'subscription' && t.productId !== 'subscription_renewal').reduce((sum, t) => sum + t.quantity, 0)}
          </div>
        </div>
      </div>

      {view === 'inventory' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Seed Banner */}
          {products.length === STATIC_PRODUCTS.length && products[0].id === STATIC_PRODUCTS[0].id && (
            <div className="bg-primary/10 border border-primary/20 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-primary font-headline text-xs font-bold uppercase tracking-widest">
                Running on static demo data. Import to database to enable inventory management.
              </p>
              <button 
                onClick={handleSeedInventory}
                className="bg-primary text-black font-headline font-black text-[10px] uppercase px-4 py-2 hover:bg-white transition-all"
              >
                Seed Database
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900 p-4 border border-zinc-800">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="SEARCH BY NAME OR SKU..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border-none focus:ring-1 focus:ring-primary text-white font-headline text-xs uppercase py-3 pl-12 pr-4"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 font-headline font-black text-[10px] uppercase tracking-widest transition-all border-2 whitespace-nowrap",
                    selectedCategory === cat ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-zinc-900 border-l-4 border-primary p-6 group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-24 h-24 bg-black border border-zinc-800 overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                
                <h3 className="font-headline text-xl font-bold uppercase text-white mb-1 truncate">{product.name}</h3>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-mono">SKU: {product.sku}</p>
                    <p className={cn(
                      "text-[10px] font-headline font-bold uppercase mt-1",
                      product.stock <= 5 ? "text-red-500 animate-pulse" : "text-zinc-400"
                    )}>
                      STOCKED: {product.stock} UNITS {product.stock === 0 && "(OUT OF STOCK)"}
                    </p>
                  </div>
                  <p className="text-primary font-black font-headline text-lg">${product.price.toFixed(2)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      setTransactionConfig({ product, type: 'sale' });
                      setTransactionQty(1);
                    }}
                    disabled={product.stock <= 0}
                    className="bg-primary text-black font-headline font-black text-[10px] uppercase py-3 hover:bg-white transition-all flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={product.stock <= 0 ? "No remaining items to sell" : "Record item sale"}
                  >
                    <DollarSign className="w-3 h-3" />
                    Record Sale
                  </button>
                  <button 
                    onClick={() => {
                      setTransactionConfig({ product, type: 'restock' });
                      setTransactionQty(1);
                    }}
                    className="bg-zinc-800 text-white font-headline font-black text-[10px] uppercase py-3 hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1"
                    title="Add units to stock"
                  >
                    <Package className="w-3 h-3" />
                    Restock
                  </button>
                </div>

                <button 
                  onClick={() => setShowDeleteConfirm(product.id)}
                  className="absolute top-2 right-2 p-2 text-zinc-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border-t-4 border-primary animate-in fade-in duration-500">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="font-headline text-2xl font-black uppercase text-white">Transaction History</h2>
          </div>
          
          {/* Mobile Layout (cards) */}
          <div className="block md:hidden divide-y divide-zinc-800">
            {transactions.map((t) => (
              <div key={t.id} className="p-4 space-y-2 hover:bg-zinc-800/20 transition-colors relative group">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs leading-tight">{t.productName}</h4>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">
                      {new Date(t.date).toLocaleString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteTransaction(t.id)}
                    className="p-1 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase flex items-center gap-1",
                    t.type === 'sale' ? "text-green-500" : "text-blue-500"
                  )}>
                    {t.type === 'sale' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {t.type} (x{t.quantity})
                  </span>
                  <span className="font-mono text-primary font-bold text-xs">
                    {t.amount > 0 ? `$${t.amount.toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="p-8 text-center text-zinc-600 font-headline uppercase text-xs">No active transactions</p>
            )}
          </div>

          {/* Desktop Layout (table) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left font-headline">
              <thead>
                <tr className="bg-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                  <th className="px-8 py-4">Timestamp</th>
                  <th className="px-8 py-4">Item</th>
                  <th className="px-8 py-4">Type</th>
                  <th className="px-8 py-4 text-right">Qty</th>
                  <th className="px-8 py-4 text-right">Revenue</th>
                  <th className="px-8 py-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-8 py-4 text-[10px] text-zinc-500 font-mono">
                      {new Date(t.date).toLocaleString()}
                    </td>
                    <td className="px-8 py-4 font-bold text-white uppercase text-xs">
                      {t.productName}
                    </td>
                    <td className="px-8 py-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase flex items-center gap-1",
                        t.type === 'sale' ? "text-green-500" : "text-blue-500"
                      )}>
                        {t.type === 'sale' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right font-mono text-white">{t.quantity}</td>
                    <td className="px-8 py-4 text-right font-mono text-primary font-bold">
                      {t.amount > 0 ? `$${t.amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="text-zinc-600 hover:text-red-500 transition-all md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 w-full max-w-2xl border-t-8 border-primary p-5 md:p-8 relative my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="font-headline font-black uppercase text-2xl text-white mb-6">New Inventory Entry</h3>
            
            <form onSubmit={handleAddProduct} className="space-y-6 pb-6">
              <div className="flex flex-col items-center gap-4 mb-4 p-4 bg-black/40 border border-zinc-800">
                <div className="w-24 h-24 bg-black border-2 border-dashed border-zinc-800 flex items-center justify-center relative group overflow-hidden">
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-zinc-800" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin"></div>
                      <span className="text-[8px] font-headline font-black text-primary uppercase">Uploading...</span>
                    </div>
                  )}
                </div>
                <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 text-[10px] font-headline font-black uppercase tracking-widest transition-colors">
                  <Upload className="w-4 h-4 inline-block mr-2" />
                  {formData.image ? 'Change Image' : 'Upload Product Image'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Product Name</label>
                  <input 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3 uppercase" 
                    placeholder="E.G. WHEY ISOLATE 2KG" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">SKU Identifier</label>
                  <input 
                    required 
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3 uppercase" 
                    placeholder="E.G. SUPP-WHEY-001" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Price ($)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({...formData, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                    className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Initial Stock Quantity</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    value={formData.stock || ''}
                    onChange={(e) => setFormData({...formData, stock: e.target.value === '' ? 0 : Number(e.target.value)})}
                    className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3" 
                    placeholder="E.G. 100"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3 uppercase"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={uploading}
                className="w-full bg-primary text-black font-headline font-black text-xl uppercase py-4 hover:bg-white transition-all shadow-lg"
              >
                Commit to Inventory
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Transaction Modal */}
      {transactionConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border-t-8 border-primary p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="font-headline font-black text-2xl text-white mb-2 uppercase tracking-tighter">
              {transactionConfig.type === 'sale' ? 'Record Sale' : 'Restock Item'}
            </h3>
            <p className="text-zinc-500 font-headline text-[10px] uppercase tracking-widest mb-6">
              {transactionConfig.product.name}
            </p>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Quantity</label>
                <input 
                  type="number"
                  min="1"
                  value={transactionQty || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setTransactionQty(0);
                    } else {
                      const num = parseInt(val, 10);
                      setTransactionQty(isNaN(num) ? 0 : num);
                    }
                  }}
                  className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3 text-xl"
                />
                {transactionConfig.type === 'sale' && (
                  <p className="text-[10px] text-zinc-500 font-headline uppercase mt-1">
                    Total Revenue: <span className="text-primary font-bold">${(transactionConfig.product.price * (transactionQty || 0)).toFixed(2)}</span>
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setTransactionConfig(null)}
                  className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleTransaction}
                  className="bg-primary text-black font-headline font-black py-4 uppercase text-xs hover:bg-white transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border-t-8 border-red-500 p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="font-headline font-black text-2xl text-white mb-4 uppercase tracking-tighter">Confirm Termination</h3>
            <p className="text-zinc-400 font-headline text-sm mb-8 uppercase tracking-widest leading-relaxed">
              Are you sure you want to permanently remove this product from the inventory? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteProduct(showDeleteConfirm)}
                className="bg-red-500 text-white font-headline font-black py-4 uppercase text-xs hover:bg-red-600 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
