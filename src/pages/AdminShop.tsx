import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { PRODUCTS as STATIC_PRODUCTS } from '@/constants';
import { TrendingUp, Plus, MoreVertical, Search, Trash2, Upload, X, Filter, History, DollarSign, Package, ArrowUpRight, ArrowDownRight, Pencil, Bell, CheckCircle2 } from 'lucide-react';
import { db, collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, getDocs, auth, where, OperationType, handleFirestoreError, storage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, orderBy, limit } from '@/firebase';
import { Product, Transaction, Member } from '@/types';
import { addCashMovement, isSalePaid, salePaidAt, formatMoney, round2, PaymentMethod } from '@/lib/payments';
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newMinStock, setNewMinStock] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editMinStock, setEditMinStock] = useState('');

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setEditPrice(String(product.price));
    setEditMinStock(typeof product.minStock === 'number' ? String(product.minStock) : '');
  };

  // Saves price and low-stock alert level (blank alert level = no alerts for this product)
  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    const price = Number(editPrice);
    if (!(price >= 0)) { alert('Enter a valid price.'); return; }
    const minStock = editMinStock.trim() === '' ? null : Number(editMinStock);
    if (minStock !== null && !(minStock >= 0)) { alert('Enter a valid alert level.'); return; }
    try {
      await updateDoc(doc(db, 'products', editingProduct.id), { price, minStock });
      setEditingProduct(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${editingProduct.id}`);
    }
  };

  // Puts a low-stock alert in the admin's bell right away (the morning summary repeats it)
  const raiseLowStockAlert = async (product: Product, stock: number) => {
    const uid = auth.currentUser?.uid;
    if (!uid || typeof product.minStock !== 'number' || stock > product.minStock) return;
    const ref = doc(db, 'notifications', `low_stock_${product.id}_${uid}`);
    if ((await getDoc(ref)).exists()) return;
    await setDoc(ref, {
      userId: uid,
      title: 'Low stock',
      message: `${product.name} is down to ${stock} unit${stock === 1 ? '' : 's'}. Time to restock.`,
      type: 'warning',
      read: false,
      createdAt: new Date().toISOString(),
      url: '/admin/shop'
    });
  };
  const [transactionDeleteConfirm, setTransactionDeleteConfirm] = useState<string | null>(null);
  const [transactionConfig, setTransactionConfig] = useState<{ product: Product, type: 'sale' | 'restock' } | null>(null);
  const [transactionQty, setTransactionQty] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [saleMemberId, setSaleMemberId] = useState('');
  const [saleMemberSearch, setSaleMemberSearch] = useState('');
  const [salePayment, setSalePayment] = useState<PaymentMethod | 'later'>('cash');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'unpaid'>('all');
  const [markPaid, setMarkPaid] = useState<Transaction | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState<PaymentMethod>('cash');

  // Members, for "sold to"
  useEffect(() => {
    return onSnapshot(query(collection(db, 'users'), where('role', '==', 'user')), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Member[];
      setMembers(list.filter(m => m.status !== 'inactive').sort((a, b) => a.name.localeCompare(b.name)));
    }, () => setMembers([]));
  }, []);

  const openTransaction = (product: Product, type: 'sale' | 'restock') => {
    setTransactionConfig({ product, type });
    setTransactionQty(1);
    setSaleMemberId('');
    setSaleMemberSearch('');
    setSalePayment('cash');
  };

  // Receives payment for an item that was sold on credit
  const handleMarkPaid = async () => {
    if (!markPaid) return;
    try {
      const paidAt = new Date().toISOString();
      await updateDoc(doc(db, 'transactions', markPaid.id), { paid: true, paidAt, paymentMethod: markPaidMethod });
      if (markPaidMethod === 'cash') {
        await addCashMovement({
          direction: 'in', amount: markPaid.amount, currency: 'USD', category: 'Item sale',
          note: `${markPaid.productName} ×${markPaid.quantity} (paid later)`,
          memberId: markPaid.memberId, memberName: markPaid.memberName, transactionId: markPaid.id,
        });
      }
      setMarkPaid(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${markPaid.id}`);
    }
  };

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
    const transactionsQuery = query(collection(db, transactionsPath), orderBy('date', 'desc'), limit(500));
    
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
        ...(newMinStock.trim() !== '' ? { minStock: Number(newMinStock) } : {}),
        image: formData.image || `https://picsum.photos/seed/${formData.name}/800/600`,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'products'), productData);
      setShowAddModal(false);
      setFormData({ name: '', price: 0, stock: 0, category: 'Supplements', sku: '', image: '' });
      setNewMinStock('');
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
      
      const date = new Date().toISOString();
      const amount = type === 'sale' ? round2(product.price * quantity) : 0;
      const buyer = members.find(m => m.id === saleMemberId);
      const saleFields = type === 'sale' ? {
        ...(buyer ? { memberId: buyer.id, memberName: buyer.name } : { memberName: 'Walk-in' }),
        ...(salePayment === 'later'
          ? { paid: false }
          : { paid: true, paidAt: date, paymentMethod: salePayment }),
      } : {};
      const ref = await addDoc(collection(db, 'transactions'), {
        productId: product.id,
        productName: product.name,
        amount,
        type,
        quantity,
        date,
        ...saleFields
      });
      if (type === 'sale' && salePayment === 'cash' && amount > 0) {
        await addCashMovement({
          direction: 'in', amount, currency: 'USD', category: 'Item sale',
          note: `${product.name} ×${quantity}`,
          memberId: buyer?.id, memberName: buyer?.name ?? 'Walk-in', transactionId: ref.id,
        });
      }
      if (type === 'sale') await raiseLowStockAlert(product, newStock).catch(() => {});
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
    if (!window.confirm('Delete this transaction record? Any cash it put in the caisse will be voided.')) return;
    try {
      await deleteDoc(doc(db, 'transactions', transactionId));
      // Keep the caisse correct: void the cash entry that came from this sale
      const linked = await getDocs(query(collection(db, 'cash_movements'), where('transactionId', '==', transactionId)));
      await Promise.all(linked.docs.map(d => updateDoc(d.ref, { voided: true, voidedAt: new Date().toISOString(), voidReason: 'Sale deleted' })));
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

  const visibleTransactions = historyFilter === 'unpaid'
    ? transactions.filter(t => t.type === 'sale' && !isSalePaid(t))
    : transactions;

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
            onClick={() => { setView(view === 'inventory' ? 'history' : 'inventory'); setHistoryFilter('all'); }}
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
        <button onClick={() => { setView('history'); setHistoryFilter('unpaid'); }} className="text-left bg-zinc-900 p-6 border-t-4 border-red-500">
          <span className="text-zinc-500 font-headline uppercase font-bold tracking-widest text-[10px]">Unpaid Items</span>
          <div className="text-red-400 text-3xl font-black font-headline mt-2">
            {formatMoney(transactions.filter(t => t.type === 'sale' && !isSalePaid(t)).reduce((s, t) => s + t.amount, 0))}
          </div>
          <span className="text-[10px] text-zinc-600 font-headline uppercase">{transactions.filter(t => t.type === 'sale' && !isSalePaid(t)).length} sale(s) not paid</span>
        </button>
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
                      typeof product.minStock === 'number' && product.stock <= product.minStock ? "text-red-500 animate-pulse" : "text-zinc-400"
                    )}>
                      STOCKED: {product.stock} UNITS {product.stock === 0 && "(OUT OF STOCK)"}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-headline uppercase mt-1 flex items-center gap-1">
                      <Bell className="w-3 h-3" />
                      {typeof product.minStock === 'number' ? `Alert at ${product.minStock} or less` : 'No stock alert'}
                    </p>
                  </div>
                  <p className="text-primary font-black font-headline text-lg">${product.price.toFixed(2)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => openTransaction(product, 'sale')}
                    disabled={product.stock <= 0}
                    className="bg-primary text-black font-headline font-black text-[10px] uppercase py-3 hover:bg-white transition-all flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={product.stock <= 0 ? "No remaining items to sell" : "Record item sale"}
                  >
                    <DollarSign className="w-3 h-3" />
                    Record Sale
                  </button>
                  <button 
                    onClick={() => openTransaction(product, 'restock')}
                    className="bg-zinc-800 text-white font-headline font-black text-[10px] uppercase py-3 hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1"
                    title="Add units to stock"
                  >
                    <Package className="w-3 h-3" />
                    Restock
                  </button>
                </div>

                <button 
                  onClick={() => openEdit(product)}
                  className="absolute top-2 right-10 p-2 text-zinc-600 hover:text-primary transition-colors"
                  title="Edit price and stock alert"
                >
                  <Pencil className="w-4 h-4" />
                </button>
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
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="font-headline text-2xl font-black uppercase text-white">Transaction History</h2>
            <div className="flex gap-2">
              {([['all', 'All'], ['unpaid', 'Unpaid Only']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setHistoryFilter(v)}
                  className={cn("px-4 py-2 font-headline font-black text-[10px] uppercase tracking-widest border-2",
                    historyFilter === v ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500")}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Layout (cards) */}
          <div className="block md:hidden divide-y divide-zinc-800">
            {visibleTransactions.map((t) => (
              <div key={t.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-white uppercase text-xs leading-tight">{t.productName} {t.type === 'sale' && t.category !== 'Subscription' && `×${t.quantity}`}</h4>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">{new Date(t.date).toLocaleString()}</p>
                    {t.type === 'sale' && <p className="text-[10px] text-zinc-400 font-headline uppercase mt-1">To: {t.memberName || '—'}</p>}
                  </div>
                  <span className={cn("font-mono font-bold text-xs whitespace-nowrap", t.type === 'sale' && !isSalePaid(t) ? "text-red-400" : "text-primary")}>
                    {t.amount > 0 ? formatMoney(t.amount) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <PaymentCell t={t} />
                  <div className="flex items-center gap-2">
                    {t.type === 'sale' && !isSalePaid(t) && (
                      <button onClick={() => { setMarkPaid(t); setMarkPaidMethod('cash'); }} className="bg-white text-black font-headline font-black text-[10px] uppercase px-3 py-1">Mark Paid</button>
                    )}
                    <button onClick={() => handleDeleteTransaction(t.id)} className="p-1 text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {visibleTransactions.length === 0 && (
              <p className="p-8 text-center text-zinc-600 font-headline uppercase text-xs">No transactions</p>
            )}
          </div>

          {/* Desktop Layout (table) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left font-headline">
              <thead>
                <tr className="bg-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                  <th className="px-6 py-4">Sold On</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Sold To</th>
                  <th className="px-6 py-4 text-right">Qty</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {visibleTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4 text-[10px] text-zinc-500 font-mono whitespace-nowrap">{new Date(t.date).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-white uppercase text-xs">
                      {t.productName}
                      {t.type === 'restock' && <span className="ml-2 text-blue-500 text-[10px]">RESTOCK</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-300 uppercase">{t.type === 'sale' ? (t.memberName || '—') : '—'}</td>
                    <td className="px-6 py-4 text-right font-mono text-white">{t.quantity}</td>
                    <td className={cn("px-6 py-4 text-right font-mono font-bold", t.type === 'sale' && !isSalePaid(t) ? "text-red-400" : "text-primary")}>
                      {t.amount > 0 ? formatMoney(t.amount) : '—'}
                    </td>
                    <td className="px-6 py-4"><PaymentCell t={t} /></td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {t.type === 'sale' && !isSalePaid(t) && (
                        <button onClick={() => { setMarkPaid(t); setMarkPaidMethod('cash'); }} className="bg-white text-black font-headline font-black text-[10px] uppercase px-3 py-1 mr-3 hover:bg-primary">Mark Paid</button>
                      )}
                      <button onClick={() => handleDeleteTransaction(t.id)} className="text-zinc-600 hover:text-red-500 transition-all md:opacity-0 md:group-hover:opacity-100">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {markPaid && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border-t-8 border-primary p-8 max-w-md w-full">
            <h3 className="font-headline font-black text-2xl text-white mb-1 uppercase tracking-tighter">Receive Payment</h3>
            <p className="text-zinc-500 font-headline text-[10px] uppercase tracking-widest mb-6">
              {markPaid.productName} ×{markPaid.quantity} · {markPaid.memberName} · {formatMoney(markPaid.amount)}
            </p>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'card'] as const).map(m => (
                  <button key={m} onClick={() => setMarkPaidMethod(m)}
                    className={cn("py-3 font-headline font-black uppercase text-xs border-2",
                      markPaidMethod === m ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500")}>
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 font-headline uppercase">Payment date will be recorded as today.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setMarkPaid(null)} className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700">Cancel</button>
                <button onClick={handleMarkPaid} className="bg-primary text-black font-headline font-black py-4 uppercase text-xs hover:bg-white">Confirm Paid</button>
              </div>
            </div>
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
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Alert Me When Stock Reaches</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3 placeholder:text-zinc-700" 
                    placeholder="NO ALERT"
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
                    Total: <span className="text-primary font-bold">${(transactionConfig.product.price * (transactionQty || 0)).toFixed(2)}</span>
                  </p>
                )}
              </div>

              {transactionConfig.type === 'sale' && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Sold To</label>
                    <input value={saleMemberSearch} onChange={(e) => { setSaleMemberSearch(e.target.value); setSaleMemberId(''); }}
                      placeholder="Search member (empty = walk-in)" className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3" />
                    {saleMemberSearch && !saleMemberId && (
                      <div className="max-h-40 overflow-y-auto border border-zinc-800 divide-y divide-zinc-800">
                        {members.filter(m => m.name.toLowerCase().includes(saleMemberSearch.toLowerCase()) || m.phone?.includes(saleMemberSearch)).slice(0, 8).map(m => (
                          <button key={m.id} onClick={() => { setSaleMemberId(m.id); setSaleMemberSearch(m.name); }}
                            className="w-full text-left px-3 py-2 font-headline text-xs uppercase text-white hover:bg-zinc-800">
                            {m.name} {m.phone && <span className="text-zinc-500">· {m.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 font-headline uppercase">
                      {saleMemberId ? 'Member selected' : 'Walk-in customer'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Payment</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([['cash', 'Cash'], ['card', 'Card'], ['later', 'Pay Later']] as const).map(([v, label]) => (
                        <button key={v} onClick={() => setSalePayment(v)}
                          disabled={v === 'later' && !saleMemberId}
                          className={cn("py-3 font-headline font-black uppercase text-[10px] border-2 transition-all disabled:opacity-30",
                            salePayment === v ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500")}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {!saleMemberId && <p className="text-[10px] text-zinc-600 font-headline uppercase">Pay later needs a member</p>}
                  </div>
                </>
              )}
              
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

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border-t-8 border-primary p-8 max-w-md w-full">
            <h3 className="font-headline font-black text-2xl text-white mb-1 uppercase tracking-tighter">Edit Product</h3>
            <p className="text-zinc-500 font-headline text-[10px] uppercase tracking-widest mb-6">{editingProduct.name} · {editingProduct.sku}</p>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Price ($)</label>
                <input type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                  className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Alert me when stock reaches</label>
                <input type="number" min="0" step="1" value={editMinStock} onChange={(e) => setEditMinStock(e.target.value)} placeholder="No alert"
                  className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3 placeholder:text-zinc-700" />
                <p className="text-[10px] text-zinc-600 font-headline uppercase">Leave empty for no low-stock alert</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setEditingProduct(null)} className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700 transition-all">Cancel</button>
                <button onClick={handleSaveProduct} className="bg-primary text-black font-headline font-black py-4 uppercase text-xs hover:bg-white transition-all">Save</button>
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

// Payment status for a history row: paid date + method, or "Not paid"
function PaymentCell({ t }: { t: Transaction }) {
  if (t.type !== 'sale') return <span className="text-zinc-600 text-[10px]">—</span>;
  if (!isSalePaid(t)) return <span className="text-red-400 font-black text-[10px] uppercase">Not paid</span>;
  return (
    <span className="text-green-400 font-black text-[10px] uppercase flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Paid {new Date(salePaidAt(t)!).toLocaleDateString()}{t.paymentMethod ? ` · ${t.paymentMethod}` : ''}
    </span>
  );
}
