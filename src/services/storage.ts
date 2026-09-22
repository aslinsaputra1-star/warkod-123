import {
  Product,
  Transaction,
  Customer,
  Expense,
  StockMutation,
  StoreSettings,
  SyncState,
  CategoryItem,
  WarungUser,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_TRANSACTIONS,
  INITIAL_STOCK_MUTATIONS,
  INITIAL_CATEGORIES,
  INITIAL_USERS,
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'wkb_pos_products',
  CATEGORIES: 'wkb_pos_categories',
  USERS: 'wkb_pos_users',
  AUTH_USER: 'wkb_pos_auth_user',
  TRANSACTIONS: 'wkb_pos_transactions',
  CUSTOMERS: 'wkb_pos_customers',
  EXPENSES: 'wkb_pos_expenses',
  STOCK_MUTATIONS: 'wkb_pos_stock_mutations',
  SETTINGS: 'wkb_pos_settings',
  SYNC_STATE: 'wkb_pos_sync_state',
  OFFLINE_QUEUE: 'wkb_pos_offline_queue',
};

function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return fallback;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
}

export class StorageService {
  // PRODUCTS
  static getProducts(): Product[] {
    return safeGetItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  static saveProducts(products: Product[]): void {
    safeSetItem(STORAGE_KEYS.PRODUCTS, products);
  }

  static addProduct(product: Product): Product[] {
    const products = this.getProducts();
    const updated = [product, ...products];
    this.saveProducts(updated);
    return updated;
  }

  static updateProduct(product: Product): Product[] {
    const products = this.getProducts();
    const updated = products.map((p) => (p.id === product.id ? product : p));
    this.saveProducts(updated);
    return updated;
  }

  static deleteProduct(productId: string): Product[] {
    const products = this.getProducts();
    const updated = products.filter((p) => p.id !== productId);
    this.saveProducts(updated);
    return updated;
  }

  // CATEGORIES
  static getCategories(): CategoryItem[] {
    return safeGetItem<CategoryItem[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  static saveCategories(categories: CategoryItem[]): void {
    safeSetItem(STORAGE_KEYS.CATEGORIES, categories);
  }

  static addCategory(category: CategoryItem): CategoryItem[] {
    const categories = this.getCategories();
    const updated = [...categories, category];
    this.saveCategories(updated);
    return updated;
  }

  static updateCategory(category: CategoryItem): CategoryItem[] {
    const categories = this.getCategories();
    const updated = categories.map((c) => (c.id === category.id ? category : c));
    this.saveCategories(updated);
    return updated;
  }

  static deleteCategory(categoryId: string): CategoryItem[] {
    const categories = this.getCategories();
    const updated = categories.filter((c) => c.id !== categoryId);
    this.saveCategories(updated);
    return updated;
  }

  // USERS & AUTH
  static getUsers(): WarungUser[] {
    const users = safeGetItem<WarungUser[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    // If the saved array is missing Rayyan or key initial roles, merge initial users
    const hasRayyan = users.some((u) => u.email === 'rayyanarasid549@gmail.com' || u.id === 'USR-RAYYAN');
    const hasOwner = users.some((u) => u.role === 'Owner' || u.username === 'owner');
    const hasStaff = users.some((u) => u.role === 'Staff');
    const hasCustomer = users.some((u) => u.role === 'Customer');
    if (!hasRayyan || !hasOwner || !hasStaff || !hasCustomer) {
      const merged = [...users];
      INITIAL_USERS.forEach((initUser) => {
        if (!merged.some((m) => m.id === initUser.id || (initUser.email && m.email === initUser.email))) {
          merged.unshift(initUser);
        }
      });
      safeSetItem(STORAGE_KEYS.USERS, merged);
      return merged;
    }
    return users;
  }

  static saveUsers(users: WarungUser[]): void {
    safeSetItem(STORAGE_KEYS.USERS, users);
  }

  static getAuthUser(): WarungUser | null {
    return safeGetItem<WarungUser | null>(STORAGE_KEYS.AUTH_USER, null);
  }

  static setAuthUser(user: WarungUser | null): void {
    if (user) {
      safeSetItem(STORAGE_KEYS.AUTH_USER, user);
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      } catch (e) {
        console.error('Error removing auth user:', e);
      }
    }
  }

  static logout(): void {
    this.setAuthUser(null);
  }

  static addUser(user: WarungUser): WarungUser[] {
    const users = this.getUsers();
    const existingIndex = users.findIndex(
      (u) => u.id === user.id || (user.email && u.email?.toLowerCase() === user.email.toLowerCase())
    );
    let updated: WarungUser[];
    if (existingIndex >= 0) {
      updated = users.map((u, i) => (i === existingIndex ? { ...u, ...user } : u));
    } else {
      updated = [user, ...users];
    }
    this.saveUsers(updated);
    return updated;
  }

  static updateUser(user: WarungUser): WarungUser[] {
    const users = this.getUsers();
    const updated = users.map((u) => (u.id === user.id ? user : u));
    this.saveUsers(updated);
    return updated;
  }

  static deleteUser(userId: string): WarungUser[] {
    const users = this.getUsers();
    const updated = users.filter((u) => u.id !== userId);
    this.saveUsers(updated);
    return updated;
  }

  // TRANSACTIONS & INVOICE NUMBER GENERATION
  static getTransactions(): Transaction[] {
    return safeGetItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  }

  static saveTransactions(transactions: Transaction[]): void {
    safeSetItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  }

  static generateInvoiceNumber(prefix = 'WKB'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const transactions = this.getTransactions();
    const todayPrefix = `${prefix}-${dateStr}-`;
    
    // Find highest sequence for today
    let maxSeq = 0;
    transactions.forEach((tx) => {
      if (tx.id_transaksi && tx.id_transaksi.startsWith(todayPrefix)) {
        const seqPart = tx.id_transaksi.replace(todayPrefix, '');
        const num = parseInt(seqPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${todayPrefix}${nextSeq}`;
  }

  static completeTransaction(transaction: Transaction): {
    transactions: Transaction[];
    products: Product[];
    customers: Customer[];
  } {
    // 1. Save Transaction
    const transactions = [transaction, ...this.getTransactions()];
    this.saveTransactions(transactions);

    // 2. Reduce Stock & Record Mutations
    const products = this.getProducts();
    const mutations = this.getStockMutations();
    const nowStr = `${transaction.tanggal} ${transaction.jam}`;

    const updatedProducts = products.map((prod) => {
      const purchased = transaction.items.find(
        (item) => item.id_produk === prod.id || item.nama_produk === prod.nama
      );
      if (purchased) {
        const qty = purchased.qty;
        const newStock = Math.max(0, prod.stok - qty);

        mutations.unshift({
          id: 'STK-' + Math.random().toString(36).substring(2, 9),
          tanggal: nowStr,
          id_produk: prod.id,
          nama_produk: prod.nama,
          jenis: 'out',
          qty: qty,
          stok_sebelum: prod.stok,
          stok_sesudah: newStock,
          keterangan: `Penjualan kasir invoice ${transaction.id_transaksi}`,
        });

        return {
          ...prod,
          stok: newStock,
          updated_at: new Date().toISOString(),
        };
      }
      return prod;
    });

    this.saveProducts(updatedProducts);
    this.saveStockMutations(mutations);

    // 3. Update Customer Record
    const customers = this.getCustomers();
    let updatedCustomers = [...customers];
    if (transaction.nama_pelanggan && transaction.nama_pelanggan.trim() !== '' && transaction.nama_pelanggan !== 'Pelanggan Umum') {
      const existingIdx = customers.findIndex(
        (c) =>
          (transaction.no_whatsapp && transaction.no_whatsapp !== '-' && c.no_whatsapp === transaction.no_whatsapp) ||
          c.nama.toLowerCase() === transaction.nama_pelanggan.toLowerCase()
      );

      if (existingIdx >= 0) {
        const exist = customers[existingIdx];
        updatedCustomers[existingIdx] = {
          ...exist,
          total_transaksi: exist.total_transaksi + 1,
          total_belanja: exist.total_belanja + transaction.total,
          last_order: new Date().toISOString(),
          no_whatsapp: (transaction.no_whatsapp && transaction.no_whatsapp !== '-') ? transaction.no_whatsapp : exist.no_whatsapp,
        };
      } else {
        updatedCustomers.unshift({
          id: 'CUST-' + Math.random().toString(36).substring(2, 7),
          nama: transaction.nama_pelanggan,
          no_whatsapp: transaction.no_whatsapp || '-',
          total_transaksi: 1,
          total_belanja: transaction.total,
          last_order: new Date().toISOString(),
        });
      }
      this.saveCustomers(updatedCustomers);
    }

    // 4. Queue for offline sync
    this.addToOfflineQueue({ type: 'transaction', data: transaction });

    return { transactions, products: updatedProducts, customers: updatedCustomers };
  }

  // STOCK MUTATIONS
  static getStockMutations(): StockMutation[] {
    return safeGetItem<StockMutation[]>(STORAGE_KEYS.STOCK_MUTATIONS, INITIAL_STOCK_MUTATIONS);
  }

  static saveStockMutations(mutations: StockMutation[]): void {
    safeSetItem(STORAGE_KEYS.STOCK_MUTATIONS, mutations);
  }

  static recordStockAdjustment(
    productId: string,
    jenis: 'in' | 'out' | 'adjustment',
    qty: number,
    keterangan: string
  ): { products: Product[]; mutations: StockMutation[] } {
    const products = this.getProducts();
    const mutations = this.getStockMutations();
    const product = products.find((p) => p.id === productId);

    if (!product) return { products, mutations };

    let newStock = product.stok;
    if (jenis === 'in') {
      newStock += qty;
    } else if (jenis === 'out') {
      newStock = Math.max(0, newStock - qty);
    } else if (jenis === 'adjustment') {
      newStock = Math.max(0, qty); // set direct to new stock
    }

    const updatedProduct = {
      ...product,
      stok: newStock,
      updated_at: new Date().toISOString(),
    };

    const newMutation: StockMutation = {
      id: 'STK-' + Math.random().toString(36).substring(2, 9),
      tanggal: new Date().toISOString().replace('T', ' ').substring(0, 19),
      id_produk: product.id,
      nama_produk: product.nama,
      jenis,
      qty: jenis === 'adjustment' ? Math.abs(newStock - product.stok) : qty,
      stok_sebelum: product.stok,
      stok_sesudah: newStock,
      keterangan: keterangan || (jenis === 'in' ? 'Stok Masuk' : jenis === 'out' ? 'Stok Keluar' : 'Penyesuaian Stok Fisik'),
    };

    const updatedProducts = products.map((p) => (p.id === productId ? updatedProduct : p));
    const updatedMutations = [newMutation, ...mutations];

    this.saveProducts(updatedProducts);
    this.saveStockMutations(updatedMutations);

    return { products: updatedProducts, mutations: updatedMutations };
  }

  // CUSTOMERS
  static getCustomers(): Customer[] {
    return safeGetItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  static saveCustomers(customers: Customer[]): void {
    safeSetItem(STORAGE_KEYS.CUSTOMERS, customers);
  }

  // EXPENSES
  static getExpenses(): Expense[] {
    return safeGetItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  }

  static saveExpenses(expenses: Expense[]): void {
    safeSetItem(STORAGE_KEYS.EXPENSES, expenses);
  }

  static addExpense(expense: Expense): Expense[] {
    const expenses = [expense, ...this.getExpenses()];
    this.saveExpenses(expenses);
    this.addToOfflineQueue({ type: 'expense', data: expense });
    return expenses;
  }

  static deleteExpense(id: string): Expense[] {
    const expenses = this.getExpenses().filter((e) => e.id !== id);
    this.saveExpenses(expenses);
    return expenses;
  }

  // SETTINGS
  static getSettings(): StoreSettings {
    const settings = safeGetItem<StoreSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    if (!settings.logoUrl || settings.logoUrl.trim() === '') {
      settings.logoUrl = '/icon.svg';
    }
    return settings;
  }

  static saveSettings(settings: StoreSettings): void {
    if (!settings.logoUrl || settings.logoUrl.trim() === '') {
      settings.logoUrl = '/icon.svg';
    }
    safeSetItem(STORAGE_KEYS.SETTINGS, settings);
  }

  // SYNC STATE & OFFLINE QUEUE
  static getSyncState(): SyncState {
    return safeGetItem<SyncState>(STORAGE_KEYS.SYNC_STATE, {
      lastSync: null,
      isOnline: navigator.onLine,
      isSyncing: false,
      syncedCount: 0,
      error: null,
    });
  }

  static saveSyncState(state: SyncState): void {
    safeSetItem(STORAGE_KEYS.SYNC_STATE, state);
  }

  static getOfflineQueue(): Array<{ type: string; data: any; timestamp: string }> {
    return safeGetItem<Array<{ type: string; data: any; timestamp: string }>>(
      STORAGE_KEYS.OFFLINE_QUEUE,
      []
    );
  }

  static addToOfflineQueue(item: { type: string; data: any }): void {
    const queue = this.getOfflineQueue();
    queue.push({ ...item, timestamp: new Date().toISOString() });
    safeSetItem(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  }

  static clearOfflineQueue(): void {
    safeSetItem(STORAGE_KEYS.OFFLINE_QUEUE, []);
  }

  // BACKUP & RESTORE
  static exportAllData(): string {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      store: this.getSettings().storeName,
      products: this.getProducts(),
      transactions: this.getTransactions(),
      customers: this.getCustomers(),
      expenses: this.getExpenses(),
      stockMutations: this.getStockMutations(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.STOCK_MUTATIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SYNC_STATE);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
  }
}
