import React, { useState, useEffect, useCallback } from 'react';
import {
  StoreSettings,
  ActiveTab,
  Product,
  Transaction,
  Customer,
  Expense,
  StockMutation,
  SyncState,
  UserRole,
  WarungUser,
  CategoryItem,
} from './types';
import { StorageService } from './services/storage';
import { GoogleSheetsSyncService } from './services/googleSheetsSync';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { POSView } from './components/POS/POSView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { WhatsAppOrderView } from './components/WhatsApp/WhatsAppOrderView';
import { ProductsView } from './components/Products/ProductsView';
import { StockView } from './components/Stock/StockView';
import { ReportsView } from './components/Reports/ReportsView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { CustomersView } from './components/Customers/CustomersView';
import { SettingsView } from './components/Settings/SettingsView';
import { LogoEditorModal } from './components/Settings/LogoEditorModal';
import { AIBotView } from './components/AIBot/AIBotView';
import { AIBotDrawer } from './components/AIBot/AIBotDrawer';
import { ReceiptModal } from './components/POS/ReceiptModal';
import { QRCodeOrderManagerView } from './components/QRCodeOrder/QRCodeOrderManagerView';
import { CustomerOrderView } from './components/CustomerOrder/CustomerOrderView';
import { PublicMenuCustomerView } from './components/PublicMenu/PublicMenuCustomerView';
import { PublicMenuManagerView } from './components/PublicMenu/PublicMenuManagerView';
import { CategoriesView } from './components/Categories/CategoriesView';
import { UsersManagementView } from './components/Users/UsersManagementView';
import { OrdersManagementView } from './components/Orders/OrdersManagementView';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LoginModal } from './components/Auth/LoginModal';
import { LoginView } from './components/Auth/LoginView';
import { UserProfileModal } from './components/Auth/UserProfileModal';
import { hasTabAccess, normalizeRole, ROLE_CONFIGS, getTabLabel } from './utils/rbac';
import { CheckCircle2, AlertCircle, Info, X, Bot, Sparkles, Bell, ArrowRight } from 'lucide-react';
import {
  saveOrderToFirebase,
  subscribeToFirebaseOrders,
  updateFirebaseOrderStatus,
  deleteOrderFromFirebase,
  syncProductsToFirebase,
  deleteProductFromFirebase,
  subscribeToFirebaseProducts,
  syncCategoriesToFirebase,
  deleteCategoryFromFirebase,
  subscribeToFirebaseCategories,
  saveExpenseToFirebase,
  deleteExpenseFromFirebase,
  subscribeToFirebaseExpenses,
  saveCustomerToFirebase,
  deleteCustomerFromFirebase,
  subscribeToFirebaseCustomers,
  saveSettingsToFirebase,
  subscribeToFirebaseSettings,
  subscribeToAuthState,
} from './services/firebase';
import { formatRupiah } from './utils/formatters';

// Audio notification chime for incoming customer orders
function playOrderChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880.0, now + 0.14); // A5
    osc2.frequency.setValueAtTime(587.33, now);
    osc2.frequency.setValueAtTime(880.0, now + 0.14);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [isLogoEditorOpen, setIsLogoEditorOpen] = useState(false);

  // Customer Self-Order Mode (from QR Code camera scan)
  const [isCustomerMode, setIsCustomerMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      // If URL explicitly requests public menu, do not trigger QR standee customer mode
      if (search.includes('menu=') || search.includes('mode=public') || search.includes('order=menu')) {
        return false;
      }
      return (
        search.includes('order=') ||
        search.includes('mode=order') ||
        search.includes('scan=')
      );
    }
    return false;
  });

  // Public Online Web Menu Mode (from social media link / public menu URL)
  const [isPublicMenuMode, setIsPublicMenuMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      return (
        search.includes('menu=public') ||
        search.includes('menu=online') ||
        search.includes('mode=public') ||
        search.includes('order=menu')
      );
    }
    return false;
  });

  const [customerOrderType, setCustomerOrderType] = useState<'Takeaway' | 'Delivery'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('order=delivery') || search.includes('scan=delivery')) {
        return 'Delivery';
      }
    }
    return 'Takeaway';
  });

  // Core Data States
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [categories, setCategories] = useState<CategoryItem[]>(() => StorageService.getCategories());
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    StorageService.getTransactions()
  );
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [expenses, setExpenses] = useState<Expense[]>(() => StorageService.getExpenses());
  const [mutations, setMutations] = useState<StockMutation[]>(() =>
    StorageService.getStockMutations()
  );
  const [settings, setSettings] = useState<StoreSettings>(() => StorageService.getSettings());

  // User Authentication State & RBAC
  const [currentUser, setCurrentUser] = useState<WarungUser | null>(() => {
    const saved = StorageService.getAuthUser();
    if (saved) return saved;
    const users = StorageService.getUsers();
    return users[0] || null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync & Connection State
  const [syncState, setSyncState] = useState<SyncState>(() => StorageService.getSyncState());
  const [isSyncing, setIsSyncing] = useState(false);

  // Global Receipt Modal (e.g. from Dashboard / Reports)
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  // Incoming QR Order Alert Banner for Cashier
  const [newOrderAlert, setNewOrderAlert] = useState<Transaction | null>(null);

  // Global Toast Alert
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ message, type });
      setTimeout(() => {
        setToast((current) => (current?.message === message ? null : current));
      }, 4000);
    },
    []
  );

  // Real-time Cloud Database Synchronization across all devices (Firebase Firestore)
  useEffect(() => {
    // 1. Subscribe to Products Catalog in real-time
    const unsubscribeProducts = subscribeToFirebaseProducts((remoteProducts) => {
      if (remoteProducts && remoteProducts.length > 0) {
        setProducts(remoteProducts);
        StorageService.saveProducts(remoteProducts);
      } else {
        const local = StorageService.getProducts();
        if (local.length > 0) {
          syncProductsToFirebase(local).catch(() => {});
        }
      }
    });

    // 2. Subscribe to Categories in real-time
    const unsubscribeCategories = subscribeToFirebaseCategories((remoteCategories) => {
      if (remoteCategories && remoteCategories.length > 0) {
        setCategories(remoteCategories);
        StorageService.saveCategories(remoteCategories);
      } else {
        const local = StorageService.getCategories();
        if (local.length > 0) {
          syncCategoriesToFirebase(local).catch(() => {});
        }
      }
    });

    // 3. Subscribe to Orders in real-time
    const unsubscribeOrders = subscribeToFirebaseOrders((incomingOrders) => {
      if (!incomingOrders || incomingOrders.length === 0) {
        const localOrders = StorageService.getTransactions();
        if (localOrders.length > 0) {
          localOrders.forEach((order) => {
            saveOrderToFirebase(order).catch(() => {});
          });
        }
        return;
      }

      setTransactions((prevTxList) => {
        if (prevTxList.length > 0) {
          const existingIds = new Set(prevTxList.map((t) => t.id_transaksi));
          const newOrders = incomingOrders.filter((io) => !existingIds.has(io.id_transaksi));
          if (newOrders.length > 0) {
            playOrderChime();
            const latestOrder = newOrders[0];
            setNewOrderAlert(latestOrder);
            showToast(
              `🔔 PESANAN BARU DARI QR! ${latestOrder.nama_pelanggan} (${latestOrder.tipe_pesanan || 'Takeaway'}) - Total: ${formatRupiah(latestOrder.total)}`,
              'success'
            );
          }
        }
        StorageService.saveTransactions(incomingOrders);
        return incomingOrders;
      });
    });

    // 4. Subscribe to Expenses in real-time
    const unsubscribeExpenses = subscribeToFirebaseExpenses((remoteExpenses) => {
      if (remoteExpenses && remoteExpenses.length > 0) {
        setExpenses(remoteExpenses);
        StorageService.saveExpenses(remoteExpenses);
      } else {
        const local = StorageService.getExpenses();
        if (local.length > 0) {
          local.forEach((exp) => saveExpenseToFirebase(exp).catch(() => {}));
        }
      }
    });

    // 5. Subscribe to Customers in real-time
    const unsubscribeCustomers = subscribeToFirebaseCustomers((remoteCustomers) => {
      if (remoteCustomers && remoteCustomers.length > 0) {
        setCustomers(remoteCustomers);
        StorageService.saveCustomers(remoteCustomers);
      } else {
        const local = StorageService.getCustomers();
        if (local.length > 0) {
          local.forEach((cust) => saveCustomerToFirebase(cust).catch(() => {}));
        }
      }
    });

    // 6. Subscribe to Store Settings in real-time
    const unsubscribeSettings = subscribeToFirebaseSettings((remoteSettings) => {
      if (remoteSettings && Object.keys(remoteSettings).length > 0) {
        setSettings((prev) => {
          const merged = { ...prev, ...remoteSettings };
          StorageService.saveSettings(merged);
          return merged;
        });
      } else {
        const local = StorageService.getSettings();
        if (local) {
          saveSettingsToFirebase(local).catch(() => {});
        }
      }
    });

    // 7. Subscribe to Auth State
    const unsubAuth = subscribeToAuthState((user) => {
      if (user) {
        console.log('Firebase user session ready:', user.uid);
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
      unsubscribeOrders();
      unsubscribeExpenses();
      unsubscribeCustomers();
      unsubscribeSettings();
      unsubAuth();
    };
  }, []);

  // Cross-Tab / Window Synchronization (Local Device consistency)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wkb_pos_settings') {
        const freshSettings = StorageService.getSettings();
        setSettings(freshSettings);
      } else if (e.key === 'wkb_pos_products') {
        setProducts(StorageService.getProducts());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Theme Handling
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: true }));
      showToast('Koneksi internet kembali aktif! Sistem siap sinkronisasi.', 'success');
    };
    const handleOffline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: false }));
      showToast('Mode offline aktif. Transaksi tersimpan aman di HP/komputer.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Toggle Theme
  const handleToggleTheme = () => {
    const newTheme: 'dark' | 'light' = settings.theme === 'dark' ? 'light' : 'dark';
    const updated: StoreSettings = { ...settings, theme: newTheme };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  // Switch Role (Owner / Admin / Kasir / Staff / Customer)
  const handleRoleChange = (role: UserRole) => {
    const updatedSettings = { ...settings, role };
    setSettings(updatedSettings);
    StorageService.saveSettings(updatedSettings);

    const users = StorageService.getUsers();
    const matchedUser = users.find((u) => u.role === role);
    if (matchedUser) {
      setCurrentUser(matchedUser);
      StorageService.setAuthUser(matchedUser);
      showToast(`Beralih ke sesi akun ${matchedUser.nama} (${role})`, 'success');
    } else if (currentUser) {
      const updatedUser: WarungUser = { ...currentUser, role };
      setCurrentUser(updatedUser);
      StorageService.setAuthUser(updatedUser);
      showToast(`Peran akun dialihkan ke ${role}`, 'success');
    }

    // Auto-redirect if current active tab is not accessible by this role
    if (!hasTabAccess(role, activeTab)) {
      const norm = normalizeRole(role);
      const def = ROLE_CONFIGS[norm].defaultTab;
      setActiveTab(def);
    }
  };

  const handleLoginSuccess = (user: WarungUser) => {
    setCurrentUser(user);
    StorageService.setAuthUser(user);
    setSettings((prev) => {
      const updated = { ...prev, role: user.role };
      StorageService.saveSettings(updated);
      return updated;
    });
    showToast(`Selamat datang, ${user.nama}! (${user.role})`, 'success');

    // Auto-navigate to allowed tab if restricted
    if (!hasTabAccess(user.role, activeTab)) {
      const norm = normalizeRole(user.role);
      const def = ROLE_CONFIGS[norm].defaultTab;
      setActiveTab(def);
    }
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
    showToast('Anda telah keluar dari akun', 'info');
    setIsLoginModalOpen(true);
  };

  const handleUpdateCurrentUser = (updatedUser: WarungUser) => {
    setCurrentUser(updatedUser);
    StorageService.setAuthUser(updatedUser);
  };

  // Google Sheets Cloud Sync Handler
  const handleSync = async () => {
    const scriptUrl = settings.googleSheetsUrl || settings.googleAppsScriptUrl;
    if (!scriptUrl || !scriptUrl.startsWith('http')) {
      showToast(
        'URL Google Apps Script belum diisi di Pengaturan. Silakan lengkapi di tab Pengaturan.',
        'error'
      );
      return;
    }

    if (!navigator.onLine) {
      showToast('Tidak ada koneksi internet untuk melakukan sinkronisasi.', 'error');
      return;
    }

    setIsSyncing(true);
    setSyncState((prev) => ({ ...prev, isSyncing: true }));

    const res = await GoogleSheetsSyncService.syncAllData({
      scriptUrl,
      products,
      transactions,
      customers,
      expenses,
      stockMutations: mutations,
      settings,
    });

    setIsSyncing(false);
    setSyncState((prev) => ({
      ...prev,
      isSyncing: false,
      lastSync: res.lastSyncTime || prev.lastSync,
      error: res.success ? null : res.message,
    }));

    if (res.success) {
      const nowFormatted = new Date().toLocaleTimeString('id-ID');
      const updatedSettings = {
        ...settings,
        isGoogleSheetsConnected: true,
        lastSyncTime: nowFormatted,
      };
      setSettings(updatedSettings);
      StorageService.saveSettings(updatedSettings);
      showToast('Sinkronisasi ke Google Sheets berhasil!', 'success');
    } else {
      showToast(`Gagal sinkronisasi: ${res.message}`, 'error');
    }
  };

  // Transaction Completed in POS View
  const handleTransactionCompleted = (newTx: Transaction) => {
    // Save to Firebase Firestore (CHECKOUT -> FIREBASE)
    saveOrderToFirebase(newTx).catch((err) => {
      console.warn('Firebase save warning:', err);
    });

    // Re-read products and mutations as they were modified by completeTransaction
    const updatedProds = StorageService.getProducts();
    const updatedCusts = StorageService.getCustomers();
    setProducts(updatedProds);
    setMutations(StorageService.getStockMutations());
    setTransactions(StorageService.getTransactions());
    setCustomers(updatedCusts);

    // Sync updated stock to Firebase so other devices immediately reflect decreased stock
    syncProductsToFirebase(updatedProds).catch(() => {});

    // Sync customer update to Firebase if applicable
    if (newTx.nama_pelanggan) {
      const cust = updatedCusts.find((c) => c.nama === newTx.nama_pelanggan);
      if (cust) {
        saveCustomerToFirebase(cust).catch(() => {});
      }
    }

    // Trigger auto-sync if enabled and connected
    const scriptUrl = settings.googleSheetsUrl || settings.googleAppsScriptUrl;
    if (settings.autoSync && scriptUrl && navigator.onLine) {
      handleSync();
    }
  };

  // Transaction Update (Status, details, etc.)
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const current = StorageService.getTransactions();
    const updated = current.map((t) => (t.id_transaksi === updatedTx.id_transaksi ? updatedTx : t));
    StorageService.saveTransactions(updated);
    setTransactions(updated);

    // Sync status change to Firebase Firestore (KASIR UPDATE STATUS -> FIREBASE -> CUSTOMER LIVE)
    updateFirebaseOrderStatus(
      updatedTx.id_transaksi,
      updatedTx.status as 'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan',
      updatedTx
    ).catch((err) => {
      console.warn('Firebase status update error:', err);
    });
  };

  // Product CRUD
  const handleAddProduct = (prod: Product) => {
    const updated = StorageService.addProduct(prod);
    setProducts(updated);
    syncProductsToFirebase(updated).catch(() => {});
  };

  const handleUpdateProduct = (prod: Product) => {
    const updated = StorageService.updateProduct(prod);
    setProducts(updated);
    syncProductsToFirebase(updated).catch(() => {});
  };

  const handleDeleteProduct = (id: string) => {
    const updated = StorageService.deleteProduct(id);
    setProducts(updated);
    deleteProductFromFirebase(id).catch(() => {});
    syncProductsToFirebase(updated).catch(() => {});
  };

  const handleImportProducts = (prods: Product[]) => {
    StorageService.saveProducts(prods);
    setProducts(prods);
    syncProductsToFirebase(prods).catch(() => {});
  };

  // Stock Updated
  const handleStockUpdated = (prods: Product[], muts: StockMutation[]) => {
    setProducts(prods);
    setMutations(muts);
    syncProductsToFirebase(prods).catch(() => {});
  };

  // Categories CRUD
  const handleAddCategory = (cat: CategoryItem) => {
    const updated = StorageService.addCategory(cat);
    setCategories(updated);
    syncCategoriesToFirebase(updated).catch(() => {});
  };

  const handleUpdateCategory = (cat: CategoryItem) => {
    const updated = StorageService.updateCategory(cat);
    setCategories(updated);
    syncCategoriesToFirebase(updated).catch(() => {});
  };

  const handleDeleteCategory = (id: string) => {
    const updated = StorageService.deleteCategory(id);
    setCategories(updated);
    deleteCategoryFromFirebase(id).catch(() => {});
  };

  // Expenses CRUD
  const handleAddExpense = (expense: Expense) => {
    const updated = StorageService.addExpense(expense);
    setExpenses(updated);
    saveExpenseToFirebase(expense).catch(() => {});
  };

  const handleDeleteExpense = (id: string) => {
    const updated = StorageService.deleteExpense(id);
    setExpenses(updated);
    deleteExpenseFromFirebase(id).catch(() => {});
  };

  // Customers CRUD
  const handleAddCustomer = (cust: Customer) => {
    const updated = [cust, ...customers];
    StorageService.saveCustomers(updated);
    setCustomers(updated);
    saveCustomerToFirebase(cust).catch(() => {});
  };

  const handleUpdateCustomer = (cust: Customer) => {
    const updated = customers.map((c) => (c.id === cust.id ? cust : c));
    StorageService.saveCustomers(updated);
    setCustomers(updated);
    saveCustomerToFirebase(cust).catch(() => {});
  };

  const handleDeleteCustomer = (id: string) => {
    const updated = customers.filter((c) => c.id !== id);
    StorageService.saveCustomers(updated);
    setCustomers(updated);
    deleteCustomerFromFirebase(id).catch(() => {});
  };

  // Save Settings
  const handleSaveSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    saveSettingsToFirebase(newSettings).catch(() => {});
  };

  // Reset to initial demo data
  const handleResetData = () => {
    StorageService.resetToDefault();
    setProducts(StorageService.getProducts());
    setTransactions(StorageService.getTransactions());
    setCustomers(StorageService.getCustomers());
    setExpenses(StorageService.getExpenses());
    setMutations(StorageService.getStockMutations());
    setSettings(StorageService.getSettings());
  };

  // Low Stock Count for Badge
  const lowStockCount = products.filter((p) => p.stok <= p.stok_minimum).length;

  // Render Public Online Web Menu Mode (from bio link or shared WhatsApp link)
  if (isPublicMenuMode) {
    return (
      <PublicMenuCustomerView
        products={products}
        settings={settings}
        onOpenPOS={() => {
          setIsPublicMenuMode(false);
          setActiveTab('pos');
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
        onOrderCreated={(newTx) => {
          setTransactions((prev) => [newTx, ...prev]);
          setProducts(StorageService.getProducts());
        }}
        showToast={showToast}
      />
    );
  }

  // Render Customer Self-Order Mode directly when scanned via QR Code
  if (isCustomerMode) {
    return (
      <CustomerOrderView
        products={products}
        settings={settings}
        initialOrderType={customerOrderType}
        onBackToApp={() => {
          setIsCustomerMode(false);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
        onOrderCreated={(newTx) => {
          setTransactions((prev) => [newTx, ...prev]);
          setProducts(StorageService.getProducts());
        }}
        showToast={showToast}
      />
    );
  }

  const effectiveRole = currentUser ? currentUser.role : settings.role;
  const isTabAuthorized = hasTabAccess(effectiveRole, activeTab);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col antialiased selection:bg-amber-500 selection:text-black">
      {/* Top Application Header */}
      <Header
        settings={settings}
        syncState={syncState}
        onSync={handleSync}
        onToggleTheme={handleToggleTheme}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onNavigateToLogin={() => setActiveTab('login')}
        onLogout={handleLogout}
        onChangeRole={handleRoleChange}
        onRoleChange={handleRoleChange}
        onOpenAIBot={() => setIsAIDrawerOpen(true)}
        onOpenLogoEditor={() => setIsLogoEditorOpen(true)}
      />

      {/* Realtime Order Alert Banner for Cashier (FIREBASE -> KASIR MENERIMA PESANAN) */}
      {newOrderAlert && (
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white px-4 py-2.5 shadow-xl flex items-center justify-between gap-3 shrink-0 z-40 border-b border-orange-400/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-bounce">
              <Bell className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white text-stone-950 px-2 py-0.5 rounded-md">
                  Pesanan Baru Masuk dari QR
                </span>
                <span className="font-extrabold text-xs truncate">
                  {newOrderAlert.nama_pelanggan} ({newOrderAlert.tipe_pesanan})
                </span>
              </div>
              <p className="text-[11px] text-white/90 truncate">
                {newOrderAlert.id_transaksi} • {newOrderAlert.items.length} Menu •{' '}
                <span className="font-black text-amber-200">
                  {formatRupiah(newOrderAlert.total)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab('orders');
                setNewOrderAlert(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-stone-950 hover:bg-stone-100 rounded-xl font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              <span>Buka Pesanan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setNewOrderAlert(null)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area + Responsive Navigation Shell */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <Navigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onTabChange={setActiveTab}
          role={effectiveRole}
          lowStockCount={lowStockCount}
          currentUser={currentUser}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenLogoEditor={() => setIsLogoEditorOpen(true)}
          logoUrl={settings.logoUrl}
          storeName={settings.storeName}
        />

        {/* Dynamic Views Viewport */}
        <main className="flex-1 flex flex-col overflow-y-auto min-h-0 bg-stone-950 pb-24 lg:pb-6">
          {!isTabAuthorized ? (
            <ProtectedRoute
              currentUser={currentUser}
              currentTab={activeTab}
              activeTab={activeTab}
              userRole={effectiveRole}
              tabLabel={getTabLabel(activeTab)}
              onOpenLogin={() => setActiveTab('login')}
              onSwitchAccount={() => setActiveTab('login')}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onNavigate={setActiveTab}
            />
          ) : (
            <>
              {activeTab === 'pos' && (
                <POSView
                  products={products}
                  settings={settings}
                  onTransactionCompleted={handleTransactionCompleted}
                  showToast={showToast}
                />
              )}

          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              products={products}
              onNavigate={setActiveTab}
              onSelectTransaction={setReceiptTx}
            />
          )}

          {(activeTab === 'orders' || activeTab === 'whatsapp_order') && (
            <OrdersManagementView
              transactions={transactions}
              products={products}
              settings={settings}
              onUpdateTransaction={handleUpdateTransaction}
              onPrintReceipt={setReceiptTx}
              showToast={showToast}
              onNavigateToQR={() => setActiveTab('qrcode_order')}
            />
          )}

          {activeTab === 'qrcode_order' && (
            <QRCodeOrderManagerView
              settings={settings}
              onOpenCustomerView={(type) => {
                setCustomerOrderType(type);
                setIsCustomerMode(true);
              }}
              showToast={showToast}
            />
          )}

          {activeTab === 'public_menu' && (
            <PublicMenuManagerView
              products={products}
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onOpenCustomerView={() => {
                setIsPublicMenuMode(true);
              }}
              showToast={showToast}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onImportProducts={handleImportProducts}
              showToast={showToast}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesView
              categories={categories}
              products={products}
              onNavigateToProducts={() => setActiveTab('products')}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              showToast={showToast}
            />
          )}

          {activeTab === 'stock' && (
            <StockView
              products={products}
              mutations={mutations}
              settings={settings}
              onStockUpdated={handleStockUpdated}
              showToast={showToast}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              transactions={transactions}
              products={products}
              expenses={expenses}
              onSelectTransaction={setReceiptTx}
              showToast={showToast}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              settings={settings}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              showToast={showToast}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              transactions={transactions}
              settings={settings}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              showToast={showToast}
            />
          )}

          {activeTab === 'users' && (
            <UsersManagementView
              settings={settings}
              onUpdateSettings={handleSaveSettings}
              showToast={showToast}
            />
          )}

          {activeTab === 'ai_bot' && (
            <AIBotView
              products={products}
              transactions={transactions}
              settings={settings}
              onNavigate={setActiveTab}
              showToast={showToast}
            />
          )}

          {activeTab === 'login' && (
            <LoginView
              currentUser={currentUser}
              settings={settings}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              onNavigate={setActiveTab}
              showToast={showToast}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              products={products}
              onSaveSettings={handleSaveSettings}
              onSyncNow={handleSync}
              isSyncing={isSyncing}
              onResetData={handleResetData}
              showToast={showToast}
            />
          )}
            </>
          )}
        </main>
      </div>

      {/* Floating KobraBot AI Launcher Button (Quick Access anywhere) */}
      <button
        id="btn-floating-kobra-bot"
        onClick={() => setIsAIDrawerOpen(true)}
        title="Tanya Asisten AI KobraBot"
        className="fixed bottom-18 lg:bottom-6 right-4 sm:right-6 z-40 p-3 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 text-stone-950 font-extrabold shadow-xl shadow-amber-950/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border-2 border-stone-900 group cursor-pointer"
      >
        <Bot className="w-5 h-5 text-stone-950 animate-bounce" />
        <span className="hidden sm:inline text-xs tracking-wide">Tanya KobraBot</span>
        <Sparkles className="w-3.5 h-3.5 text-stone-950" />
      </button>

      {/* AI Bot Quick Slide-over Drawer */}
      <AIBotDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        products={products}
        transactions={transactions}
        settings={settings}
        onNavigateToFull={() => setActiveTab('ai_bot')}
        showToast={showToast}
      />

      {/* Quick Logo Editor Modal */}
      <LogoEditorModal
        isOpen={isLogoEditorOpen}
        onClose={() => setIsLogoEditorOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        showToast={showToast}
      />

      {/* Global Receipt Modal Popup (when clicked from Dashboard or Reports) */}
      {receiptTx && (
        <ReceiptModal
          transaction={receiptTx}
          settings={settings}
          onClose={() => setReceiptTx(null)}
          onNewTransaction={() => {
            setReceiptTx(null);
            setActiveTab('pos');
          }}
        />
      )}

      {/* RBAC Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        settings={settings}
        showToast={showToast}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* RBAC User Profile & Role Permissions Matrix Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          settings={settings}
          showToast={showToast}
          onUpdateUser={handleUpdateCurrentUser}
          onSwitchUser={handleLoginSuccess}
          onLogout={handleLogout}
          onOpenLogin={() => {
            setIsProfileModalOpen(false);
            setActiveTab('login');
          }}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-200">
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
                : 'bg-stone-900/95 border-amber-500/40 text-stone-100'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
