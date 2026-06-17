/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { 
  Package, 
  PlusCircle, 
  FileText, 
  Search, 
  Barcode, 
  Trash2, 
  Edit3, 
  Plus, 
  Minus, 
  Download, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  Import, 
  X, 
  Check,
  CheckCircle2,
  Volume2,
  VolumeX,
  Database,
  Receipt,
  Printer,
  Coins,
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

import { InventoryItem, ActivityLog, Invoice, InvoiceItem } from './types';
import { 
  getCurrentShamsiDate, 
  formatPrice, 
  playAudioBeep, 
  toPersianDigits,
  fetchLiveShamsiDate
} from './utils/dateUtils';
import { exportInventoryToExcel, exportLogsToExcel } from './utils/excelExport';
import BarcodeScanner from './components/BarcodeScanner';

// Default mock data to populate on first load so the app looks complete and friendly immediately
const DEFAULT_ITEMS: InventoryItem[] = [
  {
    id: "item-1",
    name: "لوله گالوانیزه ۱/۲ اینچ آذر",
    quantity: 45,
    buyingPrice: 165000,
    sellingPrice: 210000,
    buyingDate: "1405/03/10",
    purchaseLocation: "بازار آهن شادآباد",
    barcode: "6260123456789",
    minStock: 10,
    description: "لوله فلزی مقاوم جهت گازکشی ساختمان"
  },
  {
    id: "item-2",
    name: "شیر توپی برنجی سنگین آذرشمس",
    quantity: 4,
    buyingPrice: 380000,
    sellingPrice: 470000,
    buyingDate: "1405/03/12",
    purchaseLocation: "فروشگاه مرکزی طالقانی",
    barcode: "6269876543210",
    minStock: 5,
    description: "شیر فلکه با بدنه ضخیم و ضد رسوب"
  },
  {
    id: "item-3",
    name: "اتصالات زانویی ۹۰ درجه پی‌وی‌سی",
    quantity: 120,
    buyingPrice: 42000,
    sellingPrice: 58000,
    buyingDate: "1405/03/14",
    purchaseLocation: "فروشگاه حسن‌آباد تهران",
    barcode: "6261112223334",
    minStock: 25,
    description: "مناسب لوله کشی فاضلاب ساختمان"
  }
];

const DEFAULT_LOGS: ActivityLog[] = [
  {
    id: "log-1",
    itemId: "item-1",
    itemName: "لوله گالوانیزه ۱/۲ اینچ آذر",
    type: "add",
    quantityChange: 45,
    date: "1405/03/10",
    timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    description: "ثبت اولیه کالا در سیستم انبارداری"
  },
  {
    id: "log-2",
    itemId: "item-2",
    itemName: "شیر توپی برنجی سنگین آذرشمس",
    type: "add",
    quantityChange: 4,
    date: "1405/03/12",
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    description: "خرید مستقیم از نماینده توزیع طالقانی"
  },
  {
    id: "log-3",
    itemId: "item-3",
    itemName: "اتصالات زانویی ۹۰ درجه پی‌وی‌سی",
    type: "increase",
    quantityChange: 20,
    date: "1405/03/15",
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    description: "افزایش موجودی کالا - خرید تکمیلی"
  }
];

export default function App() {
  // --- Persistent States ---
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const cached = localStorage.getItem('azarshams_inventory');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse cached inventory", e);
      }
    }
    return DEFAULT_ITEMS;
  });

  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    const cached = localStorage.getItem('azarshams_logs');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse cached logs", e);
      }
    }
    return DEFAULT_LOGS;
  });

  // Sound feedback preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const cached = localStorage.getItem('azarshams_sound');
    return cached !== 'false';
  });

  // --- UI States ---
  const [currentTab, setCurrentTab] = useState<'list' | 'add' | 'reports' | 'invoices'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- Invoice-specific states ---
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const cached = localStorage.getItem('azarshams_invoices');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse cached invoices", e);
      }
    }
    return [
      {
        id: "inv-mock-1",
        invoiceNumber: "F-1405-001",
        buyerName: "آقای علیرضا کریمی",
        buyerPhone: "۰۹۱۲۳۴۵۶۷۸۹",
        buyerAddress: "تهران، میدان تجریش، پاساژ قائم",
        buyerNationalId: "۰۰۱۱۲۲۳۳۴۴",
        sellerName: "انبار آذرشمس",
        sellerPhone: "+۹۸-۲۱-۵۵۶۶۷۷۸۸",
        sellerAddress: "تهران، بازار آهن شادآباد، مجتمع تجاری آذرشمس، پلاک ۱۱۰",
        sellerEconomicId: "۴۱۱۱۲۲۳۳۴۴۵۵",
        date: "1405/03/15",
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        discount: 15000,
        taxRate: 9,
        totalAmountBeforeTaxAndDiscount: 470000,
        taxAmount: 40950,
        finalPayable: 495950,
        description: "فروش نقدی - تحویل فوری کالا به باربری شادآباد",
        items: [
          {
            id: "invitem-1",
            itemId: "item-2",
            name: "شیر توپی برنجی سنگین آذرشمس",
            quantity: 1,
            unitPrice: 470000,
            totalPrice: 470000
          }
        ]
      }
    ];
  });

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<boolean>(false);
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceBuyerName, setInvoiceBuyerName] = useState<string>('');
  const [invoiceBuyerPhone, setInvoiceBuyerPhone] = useState<string>('');
  const [invoiceBuyerAddress, setInvoiceBuyerAddress] = useState<string>('');
  const [invoiceBuyerNationalId, setInvoiceBuyerNationalId] = useState<string>('');
  // Persistent Custom Store Profiles
  const [storeName, setStoreName] = useState<string>(() => {
    return localStorage.getItem('azarshams_store_name') || 'انبار آذرشمس';
  });
  const [storePhone, setStorePhone] = useState<string>(() => {
    return localStorage.getItem('azarshams_store_phone') || '۰۲۱-۵۵۶۶۷۷۸۸';
  });
  const [storeAddress, setStoreAddress] = useState<string>(() => {
    return localStorage.getItem('azarshams_store_address') || 'تهران، بازار آهن شادآباد، مجتمع تجاری آذرشمس، پلاک ۱۱۰';
  });
  const [storeEconomicId, setStoreEconomicId] = useState<string>(() => {
    return localStorage.getItem('azarshams_store_economic_id') || '۴۱۱۱۲۲۳۳۴۴۵۵';
  });
  const [showStoreSettings, setShowStoreSettings] = useState<boolean>(false);

  const [invoiceSellerName, setInvoiceSellerName] = useState<string>(() => {
    return localStorage.getItem('azarshams_store_name') || 'انبار آذرشمس';
  });
  const [invoiceSellerPhone, setInvoiceSellerPhone] = useState<string>(() => {
    return localStorage.getItem('azarshams_store_phone') || '۰۲۱-۵۵۶۶۷۷۸۸';
  });
  const [invoiceSellerAddress, setInvoiceSellerAddress] = useState<string>(() => {
    return localStorage.getItem('azarshams_store_address') || 'تهران، بازار آهن شادآباد، مجتمع تجاری آذرشمس، پلاک ۱۱۰';
  });
  const [invoiceSellerEconomicId, setInvoiceSellerEconomicId] = useState<string>(() => {
    return localStorage.getItem('azarshams_store_economic_id') || '۴۱۱۱۲۲۳۳۴۴۵۵';
  });
  const [invoiceDate, setInvoiceDate] = useState<string>(getCurrentShamsiDate());
  const [invoiceYear, setInvoiceYear] = useState<string>('1405');
  const [invoiceMonth, setInvoiceMonth] = useState<string>('03');
  const [invoiceDay, setInvoiceDay] = useState<string>('26');

  // Automatically keep invoiceDate in sync with the live year/month/day selectors
  useEffect(() => {
    setInvoiceDate(`${invoiceYear}/${invoiceMonth}/${invoiceDay}`);
  }, [invoiceYear, invoiceMonth, invoiceDay]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState<number | ''>('');
  const [invoiceTaxRate, setInvoiceTaxRate] = useState<number>(9);
  const [invoiceDescription, setInvoiceDescription] = useState<string>('');
  const [deductFromStock, setDeductFromStock] = useState<boolean>(true);

  // Invoice creator form search item
  const [invoiceItemSearchQuery, setInvoiceItemSearchQuery] = useState<string>('');
  const [invoiceSelectedProduct, setInvoiceSelectedProduct] = useState<InventoryItem | null>(null);
  const [invoiceProductQty, setInvoiceProductQty] = useState<number>(1);
  const [invoiceProductPrice, setInvoiceProductPrice] = useState<number | ''>('');
  
  // Barcode scanner states
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [scannerTarget, setScannerTarget] = useState<'search' | 'form'>('search');

  // Quick action/adjust stock modal state (For elderly rapid stock adjustment on scan or tap)
  const [quickAdjustItem, setQuickAdjustItem] = useState<InventoryItem | null>(null);
  const [quickQtyChange, setQuickQtyChange] = useState<number>(1);
  const [quickActionType, setQuickActionType] = useState<'in' | 'out'>('in');
  const [quickDetails, setQuickDetails] = useState<string>('');

  // Form states for Add / Edit
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<number>(0);
  const [formBuyingPrice, setFormBuyingPrice] = useState<number | ''>('');
  const [formSellingPrice, setFormSellingPrice] = useState<number | ''>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formMinStock, setFormMinStock] = useState<number>(5);
  const [formDescription, setFormDescription] = useState<string>('');
  
  // Custom solar year/month/day selectors for simple Persian Date picker
  const [formYear, setFormYear] = useState<string>('1405');
  const [formMonth, setFormMonth] = useState<string>('03');
  const [formDay, setFormDay] = useState<string>('26');

  // Daily Report filter date (Defaults to current Persian date)
  const [reportDateYear, setReportDateYear] = useState<string>('1405');
  const [reportDateMonth, setReportDateMonth] = useState<string>('03');
  const [reportDateDay, setReportDateDay] = useState<string>('26');

  // User notification / alert banner
  const [alertBanner, setAlertBanner] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // --- Effects ---
  // Save items to localStorage when changed
  useEffect(() => {
    localStorage.setItem('azarshams_inventory', JSON.stringify(items));
  }, [items]);

  // Save logs to localStorage when changed
  useEffect(() => {
    localStorage.setItem('azarshams_logs', JSON.stringify(logs));
  }, [logs]);

  // Save invoices to localStorage when changed
  useEffect(() => {
    localStorage.setItem('azarshams_invoices', JSON.stringify(invoices));
  }, [invoices]);

  // Save sound setting to localStorage
  useEffect(() => {
    localStorage.setItem('azarshams_sound', String(soundEnabled));
  }, [soundEnabled]);

  // Keep Shamsi date selectors updated with current date on mount helper
  useEffect(() => {
    // 1. Instantly apply highly accurate local Jalali calculation
    const todayLocal = getCurrentShamsiDate(); // "yyyy/mm/dd"
    const partsLocal = todayLocal.split('/');
    if (partsLocal.length === 3) {
      setFormYear('1405');
      setFormMonth(partsLocal[1]);
      setFormDay(partsLocal[2]);

      setReportDateYear('1405');
      setReportDateMonth(partsLocal[1]);
      setReportDateDay(partsLocal[2]);

      setInvoiceYear('1405');
      setInvoiceMonth(partsLocal[1]);
      setInvoiceDay(partsLocal[2]);
    }

    // 2. Perform live network clock synchronization silently in the background
    async function syncTimeLive() {
      try {
        const todayLive = await fetchLiveShamsiDate();
        const partsLive = todayLive.split('/');
        if (partsLive.length === 3) {
          setFormYear('1405');
          setFormMonth(partsLive[1]);
          setFormDay(partsLive[2]);

          setReportDateYear('1405');
          setReportDateMonth(partsLive[1]);
          setReportDateDay(partsLive[2]);

          setInvoiceYear('1405');
          setInvoiceMonth(partsLive[1]);
          setInvoiceDay(partsLive[2]);
        }
      } catch (err) {
        console.error("Failed to run syncTimeLive:", err);
      }
    }
    syncTimeLive();
  }, []);

  // Set timeout for success banner
  useEffect(() => {
    if (alertBanner) {
      const timer = setTimeout(() => {
        setAlertBanner(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertBanner]);

  // --- Utility Sound Helper ---
  const triggerBeep = (type: 'success' | 'click' | 'error' | 'delete') => {
    if (soundEnabled) {
      playAudioBeep(type);
    }
  };

  // --- Business Logic handlers ---

  // Display top notifications
  const showNotification = (message: string, type: 'success' | 'info' | 'error') => {
    setAlertBanner({ message, type });
  };

  // Handle Barcode Scan output
  const handleBarcodeScanned = (barcode: string) => {
    triggerBeep('success');
    const trimmed = barcode.trim();
    
    if (scannerTarget === 'search') {
      // Find item with scanned barcode
      const foundItem = items.find(item => item.barcode === trimmed);
      if (foundItem) {
        // Open quick action modal for instant stock increase/decrease
        showNotification(`جنس با بارکد ${trimmed} در انبار پیدا شد!`, 'success');
        setQuickAdjustItem(foundItem);
        setQuickQtyChange(1);
        setQuickActionType('in');
        setQuickDetails('افزایش موجودی با اسکن بارکد');
      } else {
        // Offered to register as a new item
        triggerBeep('error');
        showNotification(`بارکد ${trimmed} یافت نشد. می‌توانید آن را به عنوان جنس جدید ثبت کنید.`, 'info');
        // Pre-fill the add form with this barcode and navigate
        setFormName('');
        setFormQuantity(1);
        setFormBuyingPrice('');
        setFormSellingPrice('');
        setFormLocation('');
        setFormBarcode(trimmed);
        setFormMinStock(5);
        setFormDescription('');
        setEditingItem(null);
        setCurrentTab('add');
      }
    } else if (scannerTarget === 'form') {
      // Pre-fill barcode input field in the creation/edit form
      setFormBarcode(trimmed);
      showNotification(`بارکد اسکن شده ثبت شد: ${trimmed}`, 'success');
    }
  };

  // Trigger barcode scanner
  const openScanner = (target: 'search' | 'form') => {
    triggerBeep('click');
    setScannerTarget(target);
    setScannerOpen(true);
  };

  // Trigger quick adjust stock on list items
  const executeQuickStockAdjust = () => {
    if (!quickAdjustItem) return;
    
    if (quickQtyChange <= 0) {
      triggerBeep('error');
      alert("لطفاً تعداد تغییر را بیشتر از صفر وارد فرمایید.");
      return;
    }

    const todayDateStr = getCurrentShamsiDate();
    let changeValue = quickQtyChange;
    let newQty = quickAdjustItem.quantity;
    let logType: 'increase' | 'decrease' = 'increase';
    let detailMsg = quickDetails;

    if (quickActionType === 'in') {
      newQty += changeValue;
      logType = 'increase';
      if (!detailMsg) detailMsg = `افزایش موجودی کالا (ورود به انبار)`;
    } else {
      if (quickAdjustItem.quantity < changeValue) {
        triggerBeep('error');
        showNotification(`خطا: موجودی انبار (${toPersianDigits(quickAdjustItem.quantity)}) کمتر از تعداد درخواستی فروش است.`, 'error');
        return;
      }
      newQty -= changeValue;
      changeValue = -changeValue; // Negative value for decrement logic
      logType = 'decrease';
      if (!detailMsg) detailMsg = `کاهش موجودی کالا (خروج از انبار / فروش)`;
    }

    // Update state
    setItems(prev => prev.map(item => {
      if (item.id === quickAdjustItem.id) {
        return { ...item, quantity: newQty };
      }
      return item;
    }));

    // Register log
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemId: quickAdjustItem.id,
      itemName: quickAdjustItem.name,
      type: logType,
      quantityChange: changeValue,
      date: todayDateStr,
      timestamp: Date.now(),
      description: detailMsg
    };

    setLogs(prev => [newLog, ...prev]);
    triggerBeep('success');
    showNotification(`موجودی کالا با موفقیت تغییر کرد. موجودی جدید: ${toPersianDigits(newQty)} عدد`, 'success');
    setQuickAdjustItem(null);
  };

  // Save Add/Edit item Form
  const saveItemForm = (e: FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      triggerBeep('error');
      alert("لطفاً نام جنس را وارد کنید.");
      return;
    }

    if (formBuyingPrice === '' || formBuyingPrice < 0) {
      triggerBeep('error');
      alert("لطفاً قیمت خرید معتبر وارد کنید.");
      return;
    }

    if (formSellingPrice === '' || formSellingPrice < 0) {
      triggerBeep('error');
      alert("لطفاً قیمت فروش معتبر وارد کنید.");
      return;
    }

    const formattedDate = `${formYear}/${formMonth}/${formDay}`;
    const todayDateStr = getCurrentShamsiDate();

    if (editingItem) {
      // --- EDITING ITEM LOGIC ---
      const qtyDiff = formQuantity - editingItem.quantity;
      
      const updatedItem: InventoryItem = {
        ...editingItem,
        name: formName.trim(),
        quantity: formQuantity,
        buyingPrice: Number(formBuyingPrice),
        sellingPrice: Number(formSellingPrice),
        buyingDate: formattedDate,
        purchaseLocation: formLocation.trim() || 'نامشخص',
        barcode: formBarcode.trim(),
        minStock: Number(formMinStock),
        description: formDescription.trim()
      };

      setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));

      // Record logs if editing attributes
      let logDesc = `ویرایش مشخصات کالا در کلون انبار.`;
      let logType: 'edit' | 'increase' | 'decrease' = 'edit';
      
      if (qtyDiff !== 0) {
        logDesc += ` موجودی از ${editingItem.quantity} تغییر یافت به ${formQuantity}`;
        logType = qtyDiff > 0 ? 'increase' : 'decrease';
      }

      const editLog: ActivityLog = {
        id: `log-${Date.now()}`,
        itemId: editingItem.id,
        itemName: formName.trim(),
        type: logType,
        quantityChange: qtyDiff,
        date: todayDateStr,
        timestamp: Date.now(),
        description: logDesc
      };

      setLogs(prev => [editLog, ...prev]);
      showNotification(`کالای «${formName}» با موفقیت ویرایش شد.`, 'success');
      triggerBeep('success');
    } else {
      // --- ADD NEW ITEM LOGIC ---
      // Check for barcode duplicate to avoid confusion
      if (formBarcode.trim()) {
        const dupItem = items.find(i => i.barcode === formBarcode.trim());
        if (dupItem) {
          triggerBeep('error');
          if (confirm(`بارکد وارد شده متعلق به کالا «${dupItem.name}» در انبار می‌باشد. آیا می‌خواهید به جای افزودن کالای تکراری، موجودی همین کالا را اضافه کنید؟`)) {
            setQuickAdjustItem(dupItem);
            setQuickQtyChange(1);
            setQuickActionType('in');
            setQuickDetails('افزایش موجودی پس از اسکن مجدد');
            setCurrentTab('list');
            return;
          }
        }
      }

      const newItemId = `item-${Date.now()}`;
      const newItem: InventoryItem = {
        id: newItemId,
        name: formName.trim(),
        quantity: Math.max(0, formQuantity),
        buyingPrice: Number(formBuyingPrice),
        sellingPrice: Number(formSellingPrice),
        buyingDate: formattedDate,
        purchaseLocation: formLocation.trim() || 'بازار همکاران',
        barcode: formBarcode.trim(),
        minStock: Number(formMinStock),
        description: formDescription.trim() || 'توضیحات کلی کالا'
      };

      setItems(prev => [...prev, newItem]);

      // Record transaction
      const addLog: ActivityLog = {
        id: `log-${Date.now()}`,
        itemId: newItemId,
        itemName: formName.trim(),
        type: 'add',
        quantityChange: newItem.quantity,
        date: todayDateStr,
        timestamp: Date.now(),
        description: `ثبت کالای جدید در انبار با موجودی اولیه ${newItem.quantity}`
      };

      setLogs(prev => [addLog, ...prev]);
      showNotification(`کالای جدید «${formName}» با موفقیت در انبار ثبت شد.`, 'success');
      triggerBeep('success');
    }

    // Reset Form
    resetFormFields();
    setCurrentTab('list');
  };

  const resetFormFields = () => {
    setEditingItem(null);
    setFormName('');
    setFormQuantity(0);
    setFormBuyingPrice('');
    setFormSellingPrice('');
    setFormLocation('');
    setFormBarcode('');
    setFormMinStock(5);
    setFormDescription('');
    
    // Set date back to Shamsi Today
    const parts = getCurrentShamsiDate().split('/');
    if (parts.length === 3) {
      setFormYear(parts[0]);
      setFormMonth(parts[1]);
      setFormDay(parts[2]);
    }
  };

  const startEditItem = (item: InventoryItem) => {
    triggerBeep('click');
    setEditingItem(item);
    setFormName(item.name);
    setFormQuantity(item.quantity);
    setFormBuyingPrice(item.buyingPrice);
    setFormSellingPrice(item.sellingPrice);
    setFormLocation(item.purchaseLocation);
    setFormBarcode(item.barcode);
    setFormMinStock(item.minStock);
    setFormDescription(item.description || '');

    // Parse item date
    const parts = item.buyingDate.split('/');
    if (parts.length === 3) {
      setFormYear(parts[0]);
      setFormMonth(parts[1]);
      setFormDay(parts[2]);
    }

    setCurrentTab('add');
  };

  const deleteItem = (item: InventoryItem) => {
    triggerBeep('delete');
    
    const confirmMessage = `آیا از حذف کامل جنس «${item.name}» از لیست با تمامی مشخصات مطمئن هستید؟ این عمل غیرقابل بازگشت است.`;
    if (window.confirm(confirmMessage)) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      
      const deleteLog: ActivityLog = {
        id: `log-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        type: 'delete',
        quantityChange: -item.quantity,
        date: getCurrentShamsiDate(),
        timestamp: Date.now(),
        description: `حذف دائم جنس با نام "${item.name}" و تعداد ${item.quantity} عدد از انبار آذرشمس`
      };

      setLogs(prev => [deleteLog, ...prev]);
      showNotification(`کالای «${item.name}» با موفقیت حذف شد.`, 'success');
      triggerBeep('success');
    }
  };

  // Delete transaction log
  const deleteLogItem = (logId: string) => {
    triggerBeep('delete');
    if (confirm("آیا از حذف این رکورد گزارش مطمئن هستید؟")) {
      setLogs(prev => prev.filter(log => log.id !== logId));
      showNotification("رکورد گزارش با موفقیت حذف شد.", "success");
    }
  };

  // --- INVOICE MANAGEMENT HANDLERS ---
  const resetInvoiceForm = () => {
    const today = getCurrentShamsiDate();
    const cleanDateNumber = today.replace(/\//g, '');
    const randSuffix = Math.floor(Math.random() * 900) + 100;
    const computedInvoiceNumber = `F-${cleanDateNumber}-${invoices.length + 1}-${randSuffix}`;

    setInvoiceId('');
    setInvoiceNumber(computedInvoiceNumber);
    setInvoiceBuyerName('');
    setInvoiceBuyerPhone('');
    setInvoiceBuyerAddress('');
    setInvoiceBuyerNationalId('');
    setInvoiceSellerName(storeName);
    setInvoiceSellerPhone(storePhone);
    setInvoiceSellerAddress(storeAddress);
    setInvoiceSellerEconomicId(storeEconomicId);
    
    // Set default invoice date to 1405
    setInvoiceDate(today);
    const parts = today.split('/');
    if (parts.length === 3) {
      setInvoiceYear('1405');
      setInvoiceMonth(parts[1]);
      setInvoiceDay(parts[2]);
    } else {
      setInvoiceYear('1405');
      setInvoiceMonth('03');
      setInvoiceDay('26');
    }
    
    setInvoiceItems([]);
    setInvoiceDiscount('');
    setInvoiceTaxRate(9);
    setInvoiceDescription('');
    setDeductFromStock(true);

    // Reset picker
    setInvoiceItemSearchQuery('');
    setInvoiceSelectedProduct(null);
    setInvoiceProductQty(1);
    setInvoiceProductPrice('');
  };

  const startCreateInvoice = () => {
    triggerBeep('click');
    resetInvoiceForm();
    setViewingInvoice(null);
    setIsCreatingInvoice(true);
  };

  const selectProductForInvoiceCreator = (item: InventoryItem) => {
    triggerBeep('click');
    setInvoiceSelectedProduct(item);
    setInvoiceProductQty(1);
    setInvoiceProductPrice(item.sellingPrice);
    setInvoiceItemSearchQuery(''); // clear secondary search
  };

  const addProductToInvoiceDraft = () => {
    if (!invoiceSelectedProduct) {
      triggerBeep('error');
      alert("لطفاً ابتدا یک محصول را جستجو و انتخاب کنید.");
      return;
    }
    if (invoiceProductQty <= 0) {
      triggerBeep('error');
      alert("تعداد کالا باید حداقل یک عدد باشد.");
      return;
    }
    if (invoiceProductPrice === '' || Number(invoiceProductPrice) < 0) {
      triggerBeep('error');
      alert("قیمت واحد نامعتبر است.");
      return;
    }

    // Check if item already exists in current list
    const isDuplicate = invoiceItems.some(x => x.itemId === invoiceSelectedProduct.id);
    if (isDuplicate) {
      if (!confirm("این کالا هم‌اکنون در فاکتور وجود دارد. آیا می‌خواهید دوباره آن را با تعداد جدید اضافه کنید؟")) {
        return;
      }
    }

    const priceNum = Number(invoiceProductPrice);
    const lineItem: InvoiceItem = {
      id: `inv-line-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemId: invoiceSelectedProduct.id,
      name: invoiceSelectedProduct.name,
      quantity: invoiceProductQty,
      unitPrice: priceNum,
      totalPrice: invoiceProductQty * priceNum
    };

    setInvoiceItems(prev => [...prev, lineItem]);
    triggerBeep('success');

    // Reset picker
    setInvoiceSelectedProduct(null);
    setInvoiceProductQty(1);
    setInvoiceProductPrice('');
    setInvoiceItemSearchQuery('');
    showNotification(`جنس مربوطه با موفقیت به پیش‌نویس فاکتور اضافه شد.`, 'info');
  };

  const removeProductFromInvoiceDraft = (lineId: string) => {
    triggerBeep('delete');
    setInvoiceItems(prev => prev.filter(x => x.id !== lineId));
  };

  const saveInvoice = (e: FormEvent) => {
    e.preventDefault();

    if (!invoiceBuyerName.trim()) {
      triggerBeep('error');
      alert("لطفاً نام خریدار یا مشتری را وارد کنید.");
      return;
    }

    if (invoiceItems.length === 0) {
      triggerBeep('error');
      alert("لطفاً حداقل یک قلم کالا به فاکتور اضافه کنید.");
      return;
    }

    const totalBefore = invoiceItems.reduce((acc, x) => acc + x.totalPrice, 0);
    const discountVal = Number(invoiceDiscount) || 0;
    const afterDiscount = Math.max(0, totalBefore - discountVal);
    const calculatedTax = Math.round(afterDiscount * (invoiceTaxRate / 100));
    const finalVal = afterDiscount + calculatedTax;

    const formattedInvoice: Invoice = {
      id: invoiceId || `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim() || `F-${getCurrentShamsiDate().replace(/\//g, '')}-${invoices.length + 1}`,
      buyerName: invoiceBuyerName.trim(),
      buyerPhone: invoiceBuyerPhone.trim(),
      buyerAddress: invoiceBuyerAddress.trim(),
      buyerNationalId: invoiceBuyerNationalId.replace(/[^0-9]/g, ''),
      sellerName: invoiceSellerName.trim() || 'انبار آذرشمس',
      sellerPhone: invoiceSellerPhone.trim(),
      sellerAddress: invoiceSellerAddress.trim(),
      sellerEconomicId: invoiceSellerEconomicId.trim(),
      date: invoiceDate || getCurrentShamsiDate(),
      timestamp: Date.now(),
      items: invoiceItems,
      discount: discountVal,
      taxRate: invoiceTaxRate,
      totalAmountBeforeTaxAndDiscount: totalBefore,
      taxAmount: calculatedTax,
      finalPayable: finalVal,
      description: invoiceDescription.trim()
    };

    // Auto-deduct stock if checked (Only for creating brand new invoice)
    if (deductFromStock && !invoiceId) {
      let logList: ActivityLog[] = [];
      const updatedItems = items.map(invItem => {
        const matchingLine = invoiceItems.find(li => li.itemId === invItem.id);
        if (matchingLine) {
          const newQty = Math.max(0, invItem.quantity - matchingLine.quantity);

          // Add decrease action log for each item
          const subLog: ActivityLog = {
            id: `log-inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            itemId: invItem.id,
            itemName: invItem.name,
            type: 'decrease',
            quantityChange: -matchingLine.quantity,
            date: getCurrentShamsiDate(),
            timestamp: Date.now(),
            description: `کسر خودکار بابت صدور فاکتور شماره ${formattedInvoice.invoiceNumber}`
          };
          logList.push(subLog);

          return { ...invItem, quantity: newQty };
        }
        return invItem;
      });

      setItems(updatedItems);
      if (logList.length > 0) {
        setLogs(prev => [...logList, ...prev]);
      }
    }

    if (invoiceId) {
      // Edit
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? formattedInvoice : inv));
      showNotification(`فاکتور شماره «${formattedInvoice.invoiceNumber}» با موفقیت ویرایش شد.`, 'success');
    } else {
      // Create new
      setInvoices(prev => [formattedInvoice, ...prev]);
      showNotification(`فاکتور فروش شماره «${formattedInvoice.invoiceNumber}» با موفقیت صادر و ثبت شد.`, 'success');
    }

    triggerBeep('success');
    setViewingInvoice(formattedInvoice); // view it to let them inspect or print!
    setIsCreatingInvoice(false);
  };

  const startEditInvoice = (inv: Invoice) => {
    triggerBeep('click');
    setInvoiceId(inv.id);
    setInvoiceNumber(inv.invoiceNumber);
    setInvoiceBuyerName(inv.buyerName);
    setInvoiceBuyerPhone(inv.buyerPhone || '');
    setInvoiceBuyerAddress(inv.buyerAddress || '');
    setInvoiceBuyerNationalId(inv.buyerNationalId || '');
    setInvoiceSellerName(inv.sellerName);
    setInvoiceSellerPhone(inv.sellerPhone || '');
    setInvoiceSellerAddress(inv.sellerAddress || '');
    setInvoiceSellerEconomicId(inv.sellerEconomicId || '');
    setInvoiceDate(inv.date);
    const parts = inv.date.split('/');
    if (parts.length === 3) {
      setInvoiceYear(parts[0]);
      setInvoiceMonth(parts[1]);
      setInvoiceDay(parts[2]);
    }
    setInvoiceItems(inv.items);
    setInvoiceDiscount(inv.discount === 0 ? '' : inv.discount);
    setInvoiceTaxRate(inv.taxRate);
    setInvoiceDescription(inv.description || '');
    setDeductFromStock(false); // disable dynamic deduction on edits to prevent duplication

    // Reset picker
    setInvoiceItemSearchQuery('');
    setInvoiceSelectedProduct(null);
    setInvoiceProductQty(1);
    setInvoiceProductPrice('');

    setViewingInvoice(null);
    setIsCreatingInvoice(true);
  };

  const deleteInvoiceRecord = (id: string) => {
    triggerBeep('delete');
    if (confirm("آیا مطمئن هستید که می‌خواهید این فاکتور را برای همیشه حذف کنید؟ این عمل برای دفاتر مالی غیرقابل بازگشت است.")) {
      setInvoices(prev => prev.filter(x => x.id !== id));
      showNotification("فاکتور فروش مربوطه با موفقیت حذف شد.", "success");
      if (viewingInvoice && viewingInvoice.id === id) {
        setViewingInvoice(null);
      }
    }
  };

  // --- Filtering / Daily Reports queries ---

  // Search filter
  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.purchaseLocation.toLowerCase().includes(q) ||
      item.barcode.includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  // Calculate stats
  const totalItemsCount = items.length;
  const totalStockCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalBuyingWorth = items.reduce((acc, i) => acc + (i.quantity * i.buyingPrice), 0);
  const totalSellingWorth = items.reduce((acc, i) => acc + (i.quantity * i.sellingPrice), 0);
  const totalPotentialMarginProfit = totalSellingWorth - totalBuyingWorth;

  // Selected date for daily logs & reporting
  const targetReportDateStr = `${reportDateYear}/${reportDateMonth}/${reportDateDay}`;
  const todaysLogs = logs.filter(log => log.date === targetReportDateStr);

  const todaysCapitalAdded = todaysLogs
    .filter(l => l.type === 'add' || l.type === 'increase')
    .reduce((acc, log) => {
      const matchItem = items.find(i => i.id === log.itemId);
      const buyingPrice = matchItem ? matchItem.buyingPrice : 0;
      return acc + (log.quantityChange * buyingPrice);
    }, 0);

  const todaysRevenuePotential = todaysLogs
    .filter(l => l.type === 'add' || l.type === 'increase')
    .reduce((acc, log) => {
      const matchItem = items.find(i => i.id === log.itemId);
      const sellingPrice = matchItem ? matchItem.sellingPrice : 0;
      return acc + (log.quantityChange * sellingPrice);
    }, 0);

  const todaysStockAddedCount = todaysLogs
    .filter(l => l.type === 'add' || l.type === 'increase')
    .reduce((acc, log) => acc + log.quantityChange, 0);

  const todaysStockRemovedCount = todaysLogs
    .filter(l => l.type === 'decrease')
    .reduce((acc, log) => acc + Math.abs(log.quantityChange), 0);

  // Backup & Restore via JSON Files
  const downloadBackupJSON = () => {
    triggerBeep('click');
    const backupData = {
      items,
      logs,
      version: "1.0",
      exportTime: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `پشتیبان-انبار-آذرشمس-${getCurrentShamsiDate().replace(/\//g, '-')}.json`);
    dlAnchorElem.click();
    showNotification("فایل پشتیبان انبار دریافت کالا با موفقیت دانلود شد.", "success");
  };

  const handleJSONImport = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.items && Array.isArray(parsed.items)) {
            if (confirm(`آیا مطمئن هستید که می‌خواهید اطلاعات کاربری جدید را بارگزاری نمایید؟ این فایل شامل ${toPersianDigits(parsed.items.length)} عدد کالا است.`)) {
              setItems(parsed.items);
              if (parsed.logs && Array.isArray(parsed.logs)) {
                setLogs(parsed.logs);
              }
              triggerBeep('success');
              showNotification("بازیابی نسخه پشتیبان کامل با موفقیت انجام شد.", "success");
            }
          } else {
            throw new Error("ساختار فایل نامعتبر است");
          }
        } catch (error) {
          triggerBeep('error');
          alert("خطا در خواندن فایل پشتیبان. مطمئن شوید فایل انتخاب شده معتبر و مربوط به انبار آذرشمس است.");
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800 font-sans pb-16 relative">
      
      {/* --- Top Sticky Accent Banner / App Brand --- */}
      <header className="bg-white text-slate-900 shadow-md py-6 px-6 md:px-8 rounded-3xl border-b-4 border-sky-200 mb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="bg-sky-500 p-4 rounded-3xl shadow-lg ring-4 ring-sky-100 animate-bounce">
              <Package className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-sky-900" id="app-title-azarshams">
                سیستم انبارداری آذرشمس
              </h1>
              <p className="text-sky-600 mt-1 md:text-lg font-bold opacity-90">
                طراحی ساده، فونت درشت و کاربری آسان برای خدمات باسرعت انبار
              </p>
            </div>
          </div>

          {/* Quick interactive parameters for seniors */}
          <div className="flex items-center gap-3">
            {/* Offline Local Storage badge */}
            <div className="bg-emerald-500 text-white px-5 py-3 rounded-2xl flex items-center gap-2.5 font-bold shadow-md border-b-4 border-emerald-700">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-200 animate-ping" />
              <span className="text-md">فعال و بدون نیاز به اینترنت</span>
            </div>
          </div>

        </div>
      </header>

      {/* --- Notification Banner Container --- */}
      {alertBanner && (
        <div className="max-w-4xl mx-auto mt-4 px-4">
          <div className={`p-5 rounded-2xl flex items-center justify-between shadow-xl transition-all duration-300 ${
            alertBanner.type === 'success' 
              ? 'bg-emerald-100 border-r-8 border-emerald-600 text-emerald-950 font-bold' 
              : alertBanner.type === 'error'
              ? 'bg-rose-100 border-r-8 border-rose-600 text-rose-950 font-bold'
              : 'bg-sky-100 border-r-8 border-sky-600 text-sky-950 font-bold'
          }`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-8 h-8 ${alertBanner.type === 'success' ? 'text-emerald-700' : alertBanner.type === 'error' ? 'text-rose-700' : 'text-sky-700'}`} />
              <span className="text-lg md:text-xl">{alertBanner.message}</span>
            </div>
            <button onClick={() => setAlertBanner(null)} className="p-1 hover:bg-black/10 rounded-full">
              <X className="w-6 h-6 text-slate-700" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 mt-6">

        {/* --- GIANT TOUCHABLE NAVIGATION TABS --- */}
        <section id="app-tabs" className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          
          <button
            id="tab-btn-list"
            onClick={() => { triggerBeep('click'); setCurrentTab('list'); }}
            className={`py-6 px-3 md:px-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all border-4 shadow-xl text-center cursor-pointer ${
              currentTab === 'list'
                ? 'bg-sky-600 text-white border-sky-400 scale-[1.03] font-black'
                : 'bg-white text-slate-700 hover:bg-sky-50 border-white font-bold'
            }`}
          >
            <Package className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-lg md:text-2xl font-black">📦 لیست کل اجناس</span>
            <span className={`text-xs md:text-sm px-3 py-1 rounded-full ${currentTab === 'list' ? 'bg-sky-500 text-white font-bold' : 'bg-slate-100 text-slate-500 font-bold'}`}>
              {toPersianDigits(items.length)} کالا در انبار
            </span>
          </button>

          <button
            id="tab-btn-add"
            onClick={() => { triggerBeep('click'); resetFormFields(); setCurrentTab('add'); }}
            className={`py-6 px-3 md:px-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all border-4 shadow-xl text-center cursor-pointer ${
              currentTab === 'add'
                ? 'bg-sky-600 text-white border-sky-400 scale-[1.03] font-black'
                : 'bg-white text-slate-700 hover:bg-sky-50 border-white font-bold'
            }`}
          >
            <PlusCircle className="w-10 h-10 md:w-12 md:h-12 text-teal-500" />
            <span className="text-lg md:text-2xl font-black">➕ ثبت جنس جدید</span>
            <span className="text-xs md:text-sm text-slate-400 font-bold">بدون نیاز به نوشتن زیاد</span>
          </button>

          <button
            id="tab-btn-reports"
            onClick={() => { triggerBeep('click'); setCurrentTab('reports'); }}
            className={`py-6 px-3 md:px-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all border-4 shadow-xl text-center cursor-pointer ${
              currentTab === 'reports'
                ? 'bg-sky-600 text-white border-sky-400 scale-[1.03] font-black'
                : 'bg-white text-slate-700 hover:bg-sky-50 border-white font-bold'
            }`}
          >
            <FileText className="w-10 h-10 md:w-12 md:h-12 text-amber-500" />
            <span className="text-lg md:text-2xl font-black">📊 گزارش روزانه انبار</span>
            <span className="text-xs md:text-sm text-slate-400 font-bold">دریافت اکسل و ارقام</span>
          </button>

          <button
            id="tab-btn-invoices"
            onClick={() => { triggerBeep('click'); setCurrentTab('invoices'); }}
            className={`py-6 px-3 md:px-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all border-4 shadow-xl text-center cursor-pointer ${
              currentTab === 'invoices'
                ? 'bg-sky-600 text-white border-sky-400 scale-[1.03] font-black'
                : 'bg-white text-slate-700 hover:bg-sky-50 border-white font-bold'
            }`}
          >
            <Receipt className="w-10 h-10 md:w-12 md:h-12 text-indigo-500" />
            <span className="text-lg md:text-2xl font-black">🧾 فاکتورهای فروش</span>
            <span className={`text-xs md:text-sm px-3 py-1 rounded-full ${currentTab === 'invoices' ? 'bg-sky-500 text-white font-bold' : 'bg-slate-100 text-slate-500 font-bold'}`}>
              {toPersianDigits(invoices.length)} فاکتور صادرشده
            </span>
          </button>

        </section>

        {/* ==================== TAB 1: INVENTORY & SEARCH ==================== */}
        {currentTab === 'list' && (
          <div className="space-y-6">
            
            {/* Quick search/scan controls */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-sky-100 flex flex-col lg:flex-row gap-6 items-center justify-between">
              
              {/* Search with large fonts */}
              <div className="w-full lg:flex-1 relative">
                <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <Search className="w-7 h-7 text-sky-500" />
                </span>
                <input
                  id="search-input-field"
                  type="text"
                  placeholder="جستجو در نام جنس، محل خرید یا بارکد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-14 pl-6 py-5 rounded-2xl bg-sky-50/50 border-2 border-sky-100 text-xl font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-0 transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { triggerBeep('click'); setSearchQuery(''); }}
                    className="absolute inset-y-0 left-4 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-7 h-7" />
                  </button>
                )}
              </div>

              {/* GIANT REDESIGNED BARCODE SCANNING SPEED ACTION */}
              <button
                id="search-scan-barcode-big-btn"
                onClick={() => openScanner('search')}
                className="w-full lg:w-auto bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black px-8 py-5 rounded-2xl flex items-center justify-center gap-4 text-xl md:text-2xl shadow-lg border-b-4 border-amber-700 cursor-pointer text-center transition-all"
              >
                <Barcode className="w-9 h-9" />
                <span>📷 اسکن سریع بارکد کالا</span>
              </button>
            </div>

            {/* Quick stats grid for elderly reassurance */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-sky-500 flex items-center justify-between transition-transform hover:scale-[1.01]">
                <div>
                  <p className="text-slate-500 text-lg font-bold">کل تنوع کالاها</p>
                  <p className="text-3xl font-black mt-2 text-sky-900">{toPersianDigits(totalItemsCount)} <span className="text-sm font-bold text-slate-500">نوع جنس</span></p>
                </div>
                <div className="bg-sky-50 p-4 rounded-2xl shadow-inner">
                  <Package className="w-10 h-10 text-sky-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-emerald-500 flex items-center justify-between transition-transform hover:scale-[1.01]">
                <div>
                  <p className="text-slate-500 text-lg font-bold">مجموع تعداد کل موجودی</p>
                  <p className="text-3xl font-black mt-2 text-emerald-950">{toPersianDigits(totalStockCount)} <span className="text-sm font-bold text-slate-500">عدد</span></p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl shadow-inner">
                  <TrendingUp className="w-10 h-10 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-amber-500 flex items-center justify-between transition-transform hover:scale-[1.01]">
                <div>
                  <p className="text-slate-500 text-lg font-bold">کل سرمایه خوابیده (تهیه)</p>
                  <p className="text-2xl font-black mt-2 text-amber-950 text-amber-700">{formatPrice(totalBuyingWorth)}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl shadow-inner">
                  <Database className="w-10 h-10 text-amber-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-lg border-b-8 border-purple-500 flex items-center justify-between transition-transform hover:scale-[1.01]">
                <div>
                  <p className="text-slate-500 text-lg font-bold">ارزش فروش کل تخمینی</p>
                  <p className="text-2xl font-black mt-2 text-purple-950 text-purple-700">{formatPrice(totalSellingWorth)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl shadow-inner">
                  <TrendingUp className="w-10 h-10 text-purple-600" />
                </div>
              </div>

            </div>

            {/* Inventory listing */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-white">
              
              <div className="p-6 bg-sky-50/50 border-b border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
                  <span>لیست کالاهای موجود در انبار آذرشمس</span>
                  <span className="text-sm text-sky-850 font-bold bg-sky-100 px-3 py-1 rounded-full">
                    {toPersianDigits(filteredItems.length)} ردیف یافت شد
                  </span>
                </h3>
                
                {/* Excel export action */}
                <button
                  id="export-inventory-excel-btn"
                  onClick={() => {
                    triggerBeep('click');
                    exportInventoryToExcel(items);
                    showNotification("گزارش اکسل کل انبار با موفقیت ایجاد و دانلود شد.", "success");
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-6 py-4 rounded-2xl flex items-center justify-center gap-3 text-lg shadow-md border-b-4 border-emerald-700 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
                >
                  <Download className="w-6 h-6" />
                  <span>دانلود فایل اکسل موجودی انبار Excel</span>
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <div className="text-center py-20 px-6 space-y-4">
                  <Package className="w-20 h-20 text-slate-300 mx-auto" />
                  <p className="text-2xl font-bold text-slate-500">هیچ کالا یا جنسی یافت نشد.</p>
                  <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                    میتوانید عبارت جستجو را تغییر دهید یا با زدن دکمه «ثبت جنس جدید» اولین جنس خود را در انبار تعریف فرمایید.
                  </p>
                </div>
              ) : (
                <div id="inventory-list-container">
                  {/* --- DESKTOP VIEW: High-density Table --- */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-sky-50/50 text-sky-900 border-b-2 border-sky-100 text-lg font-black">
                          <th className="py-5 px-6">نام جنس / کالا</th>
                          <th className="py-5 px-6 text-center font-black">تعداد موجودی</th>
                          <th className="py-5 px-6 font-black">قیمت خرید (تومن)</th>
                          <th className="py-5 px-6 font-black">قیمت فروش (تومن)</th>
                          <th className="py-5 px-6 font-black">محل و تاریخ خرید</th>
                          <th className="py-5 px-6 text-center font-black">اقدام سریع و مدیریت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredItems.map((item) => {
                          const isLowStock = item.quantity <= item.minStock;
                          const totalUnitProfit = item.sellingPrice - item.buyingPrice;
                          
                          return (
                            <tr 
                              key={item.id} 
                              className={`hover:bg-sky-50/50 transition-colors ${
                                isLowStock ? 'bg-amber-50/60' : ''
                              }`}
                            >
                              
                              {/* Item details */}
                              <td className="py-5 px-6">
                                <div className="space-y-1">
                                  <span className="text-xl font-black text-slate-900 block">
                                    {item.name}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                    {item.barcode ? (
                                      <span className="bg-sky-50 text-sky-900 border border-sky-100 px-2.5 py-1 rounded-md font-mono flex items-center gap-1 font-bold">
                                        <Barcode className="w-4 h-4" />
                                        {toPersianDigits(item.barcode)}
                                      </span>
                                    ) : (
                                      <span className="text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md font-bold">بدون بارکد</span>
                                    )}
                                    
                                    {item.description && (
                                      <span className="text-slate-400 font-bold truncate max-w-[200px]">
                                        {item.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Stock and Quick adjust triggers */}
                              <td className="py-5 px-6 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className={`text-2xl font-black px-5 py-2 rounded-2xl ${
                                    item.quantity === 0 
                                      ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300 shadow-md' 
                                      : isLowStock 
                                      ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300 shadow-md' 
                                      : 'bg-emerald-100 text-emerald-800 shadow-sm'
                                  }`}>
                                    {toPersianDigits(item.quantity)} عدد
                                  </span>
                                  
                                  {isLowStock && (
                                    <span className="text-amber-700 text-xs font-black mt-1.5 flex items-center gap-1">
                                      <AlertTriangle className="w-4 h-4" />
                                      موجودی رو به کاهش (حداقل {toPersianDigits(item.minStock)})
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Prices */}
                              <td className="py-5 px-6 font-bold text-lg text-slate-800">
                                {formatPrice(item.buyingPrice)}
                              </td>

                              <td className="py-5 px-6 font-bold text-lg text-indigo-900">
                                <div className="space-y-1">
                                  <div className="font-extrabold">{formatPrice(item.sellingPrice)}</div>
                                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full block w-max font-bold border border-emerald-100">
                                    سود تک‌فروشی: {formatPrice(totalUnitProfit)}
                                  </span>
                                </div>
                              </td>

                              {/* Purchase Info */}
                              <td className="py-5 px-6 text-sm text-slate-600">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-slate-800 font-bold">
                                    <MapPin className="w-4 h-4 text-sky-500" />
                                    <span>{item.purchaseLocation}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-500 font-mono font-bold">
                                    <Calendar className="w-4 h-4 text-sky-500" />
                                    <span>{toPersianDigits(item.buyingDate)}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Action layout specifically made huge and visual for elders */}
                              <td className="py-5 px-6">
                                <div className="flex items-center justify-center gap-2">
                                  
                                  {/* Quick incremental button (+ / -) */}
                                  <button
                                    id={`quick-adjust-btn-${item.id}`}
                                    onClick={() => {
                                      triggerBeep('click');
                                      setQuickAdjustItem(item);
                                      setQuickQtyChange(1);
                                      setQuickActionType('in');
                                      setQuickDetails('افزایش موجودی کالا');
                                    }}
                                    className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold p-3.5 rounded-2xl flex items-center justify-center gap-2 transition shadow-md border-b-4 border-sky-700 active:scale-90 cursor-pointer"
                                    title="افزایش / کاهش فوری تعداد"
                                  >
                                    <Plus className="w-5.5 h-5.5" />
                                    <Minus className="w-5.5 h-5.5" />
                                    <span className="text-md hidden lg:inline">تغییر فوری تعداد</span>
                                  </button>

                                  {/* Edit Button */}
                                  <button
                                    id={`edit-item-btn-${item.id}`}
                                    onClick={() => startEditItem(item)}
                                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold p-3 rounded-2xl flex items-center justify-center transition border-b-4 border-amber-300 active:scale-90 cursor-pointer"
                                    title="ویرایش مشخصات"
                                  >
                                    <Edit3 className="w-6 h-6" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    id={`delete-item-btn-${item.id}`}
                                    onClick={() => deleteItem(item)}
                                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold p-3 rounded-2xl flex items-center justify-center transition border-b-4 border-rose-300 active:scale-90 cursor-pointer"
                                    title="حذف کامل"
                                  >
                                    <Trash2 className="w-6 h-6" />
                                  </button>

                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* --- MOBILE VIEW: Elegant scroll-free individual cards --- */}
                  <div className="block md:hidden space-y-4 px-1 py-3">
                    {filteredItems.map((item) => {
                      const isLowStock = item.quantity <= item.minStock;
                      const totalUnitProfit = item.sellingPrice - item.buyingPrice;
                      
                      return (
                        <div 
                          key={`mob-${item.id}`}
                          className={`bg-white rounded-3xl p-5 shadow-lg border-2 transition-all space-y-4 relative ${
                            isLowStock 
                              ? 'border-amber-400 bg-amber-50/30' 
                              : 'border-slate-100'
                          }`}
                        >
                          {/* Low stock alert badge */}
                          {isLowStock && (
                            <div className="absolute top-0 left-4 bg-amber-500 text-white text-xs px-3 py-1 font-black rounded-b-xl flex items-center gap-1 shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>رو به کاهش</span>
                            </div>
                          )}

                          {/* Item Name & Stock Qty display */}
                          <div className="flex items-start justify-between gap-3 pt-2">
                            <div className="space-y-1">
                              <h4 className="text-xl font-black text-slate-900 leading-tight">
                                {item.name}
                              </h4>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {item.barcode ? (
                                  <span className="bg-sky-50 text-sky-900 border border-sky-100 px-2 py-0.5 rounded-lg font-mono text-xs flex items-center gap-1 font-bold">
                                    <Barcode className="w-3.5 h-3.5 text-sky-600" />
                                    {toPersianDigits(item.barcode)}
                                  </span>
                                ) : (
                                  <span className="text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg text-xs font-bold">
                                    بدون بارکد
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-left flex-shrink-0">
                              <span className={`text-[22px] font-black px-4 py-2 rounded-2xl inline-block shadow-sm ${
                                item.quantity === 0 
                                  ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-200' 
                                  : isLowStock 
                                  ? 'bg-amber-100 text-amber-850 ring-2 ring-amber-200' 
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {toPersianDigits(item.quantity)} عدد
                              </span>
                              {isLowStock && (
                                <p className="text-amber-800 text-[11px] font-bold mt-1 text-center">
                                  حداقل {toPersianDigits(item.minStock)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Item description */}
                          {item.description && (
                            <p className="text-slate-500 text-sm font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              {item.description}
                            </p>
                          )}

                          {/* Detailed Pricing row */}
                          <div className="bg-sky-50/40 p-4 rounded-2xl border border-sky-100 grid grid-cols-3 gap-1 text-center">
                            <div>
                              <span className="text-slate-500 text-[11px] font-bold block">خرید تک (تومن)</span>
                              <span className="text-slate-800 text-md font-black block mt-1">
                                {formatPrice(item.buyingPrice)}
                              </span>
                            </div>
                            <div className="border-x border-sky-100/80">
                              <span className="text-sky-600 text-[11px] font-bold block font-bold">فروش تک (تومن)</span>
                              <span className="text-sky-950 text-md font-black block mt-1">
                                {formatPrice(item.sellingPrice)}
                              </span>
                            </div>
                            <div>
                              <span className="text-emerald-605 text-emerald-600 text-[11px] font-bold block">سود تک‌فروشی</span>
                              <span className="text-emerald-700 text-[13px] font-black block mt-1 bg-emerald-50 rounded-lg py-0.5">
                                {formatPrice(totalUnitProfit)}
                              </span>
                            </div>
                          </div>

                          {/* Supplier & Date of Purchase */}
                          <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-t border-slate-100 pt-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-sky-500" />
                              <span>خرید از: {item.purchaseLocation || 'نامشخص'}</span>
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-4 h-4 text-sky-500" />
                              <span>{toPersianDigits(item.buyingDate)}</span>
                            </span>
                          </div>

                          {/* Massive buttons deck */}
                          <div className="grid grid-cols-4 gap-3 pt-1">
                            <button
                              id={`mob-quick-adjust-btn-${item.id}`}
                              onClick={() => {
                                triggerBeep('click');
                                setQuickAdjustItem(item);
                                setQuickQtyChange(1);
                                setQuickActionType('in');
                                setQuickDetails('افزایش موجودی کالا');
                              }}
                              className="col-span-2 bg-sky-500 hover:bg-sky-600 text-white font-extrabold py-4 px-2 rounded-2xl flex items-center justify-center gap-1.5 text-md shadow border-b-4 border-sky-700 active:scale-95 cursor-pointer text-center"
                            >
                              <Plus className="w-5 h-5" />
                              <Minus className="w-5 h-5" />
                              <span>تغییر تعداد</span>
                            </button>

                            <button
                              id={`mob-edit-item-btn-${item.id}`}
                              onClick={() => startEditItem(item)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-4 px-2 rounded-2xl flex items-center justify-center gap-1.5 text-md border-b-4 border-amber-300 active:scale-95 cursor-pointer"
                            >
                              <Edit3 className="w-5 h-5" />
                              <span>ویرایش</span>
                            </button>

                            <button
                              id={`mob-delete-item-btn-${item.id}`}
                              onClick={() => deleteItem(item)}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold py-4 px-2 rounded-2xl flex items-center justify-center gap-1.5 text-md border-b-4 border-rose-300 active:scale-95 cursor-pointer"
                            >
                              <Trash2 className="w-5 h-5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Backup/restore module showing simple visual instruction */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-right">
                <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2 justify-center md:justify-start">
                  <Database className="w-6 h-6 text-indigo-500" />
                  <span>پشتیبان‌گیری کامل از داده‌های انبارداری آذرشمس</span>
                </h4>
                <p className="text-slate-500 text-sm">
                  جهت جلوگیری از پاک شدن ناگهانی اطلاعات، می‌توانید نسخه پشتیبان دانلود کرده و روی گوشی دیگر نیز بازیابی کنید.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 justify-center">
                
                {/* Download Backup */}
                <button
                  id="backup-download-btn"
                  onClick={downloadBackupJSON}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center gap-2.5 text-md transition border-b-4 border-indigo-800 active:scale-95 cursor-pointer"
                >
                  <Download className="w-5 h-5 text-indigo-200" />
                  <span>دریافت فایل پشتیبان انبار زدن</span>
                </button>

                {/* File input simulator */}
                <label className="bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 text-slate-700 font-extrabold py-3 px-6 rounded-2xl flex items-center gap-2.5 text-md cursor-pointer transition active:scale-95">
                  <Import className="w-5 h-5 text-slate-500" />
                  <span>بازیابی فایل پشتیبان</span>
                  <input
                    id="backup-upload-file-input"
                    type="file"
                    accept=".json"
                    onChange={handleJSONImport}
                    className="hidden"
                  />
                </label>

              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 2: REGISTER / EDIT ITEM ==================== */}
        {currentTab === 'add' && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-white max-w-4xl mx-auto">
            
            {/* Header Form */}
            <div className="bg-sky-100/50 p-6 md:p-8 border-b-4 border-sky-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900">
                  {editingItem ? `ویرایش مشخصات جنس: ${editingItem.name}` : 'ثبت جنس جدید در سیستم انبارداری'}
                </h3>
                <p className="text-slate-500 mt-1 md:text-lg font-bold">
                  تمام اطلاعات را به زبان ساده در زیر بنویسید. برای بارکد، می‌توانید راحت با دوربین عکس بگیرید.
                </p>
              </div>
              <button
                id="cancel-add-tab-header-btn"
                onClick={() => { triggerBeep('click'); resetFormFields(); setCurrentTab('list'); }}
                className="bg-slate-200 hover:bg-slate-300 p-2.5 rounded-2xl text-slate-600 cursor-pointer"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Core Form Body */}
            <form onSubmit={saveItemForm} className="p-6 md:p-8 space-y-6">
              
              {/* Row 1: Item barcode Scanning (First element to encourage speed) */}
              <div className="bg-sky-50/50 p-5 rounded-2xl border-2 border-sky-100 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <label htmlFor="form-barcode-input" className="block text-xl font-black text-slate-900">
                      کد بارکد کالا کالا (اختیاری)
                    </label>
                    <p className="text-slate-500 text-sm font-bold">
                      کد روی جعبه محصول را بنویسید یا دکمه روشن کردن دوربین را برای اسکن سریع فشار دهید.
                    </p>
                  </div>
                  
                  {/* BIG CAMERA SCAN TRIGGER */}
                  <button
                    id="form-open-scanner-btn"
                    type="button"
                    onClick={() => openScanner('form')}
                    className="bg-sky-600 hover:bg-sky-750 hover:bg-sky-700 text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition border-b-4 border-sky-800 active:scale-95 cursor-pointer text-lg"
                  >
                    <Barcode className="w-6 h-6 text-sky-200" />
                    <span>📷 روشن کردن اسکنر با دوربین گوشی</span>
                  </button>
                </div>

                <input
                  id="form-barcode-input"
                  type="text"
                  placeholder="مثال: 6260123456789"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 py-4 px-5 rounded-xl font-mono text-xl font-bold tracking-widest text-slate-900 focus:border-sky-500 focus:ring-0"
                />
              </div>

              {/* Row 2: Basic details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Name */}
                <div className="space-y-2">
                  <label htmlFor="form-name-input" className="block text-xl font-black text-slate-900">
                    نام جنس / کالا <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-name-input"
                    type="text"
                    required
                    placeholder="مثال: لوله‌ گالوانیزه رده ۴۰"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-5 rounded-xl text-xl font-bold text-slate-900 focus:border-sky-500 focus:ring-0"
                  />
                  <span className="text-sm text-slate-400 block">نامی بنویسید که برای جستجوهای بعدی آسان باشد.</span>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <label htmlFor="form-qty-input" className="block text-xl font-black text-slate-900">
                    تعداد موجودی فعلی <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      id="form-qty-dec-btn"
                      type="button"
                      onClick={() => { triggerBeep('click'); setFormQuantity(prev => Math.max(0, prev - 1)); }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 p-4 rounded-xl border border-slate-300 font-bold text-2xl"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    
                    <input
                      id="form-qty-input"
                      type="number"
                      required
                      min="0"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="flex-1 bg-slate-50 border-2 border-slate-200 py-4 px-5 rounded-xl text-center text-2xl font-black text-slate-900 focus:border-sky-500 focus:ring-0"
                    />

                    <button
                      id="form-qty-inc-btn"
                      type="button"
                      onClick={() => { triggerBeep('click'); setFormQuantity(prev => prev + 1); }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 p-4 rounded-xl border border-slate-300 font-bold text-2xl"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  <span className="text-sm text-slate-400 block text-center">تعداد موجود اولیه در قفسه انبار</span>
                </div>

              </div>

              {/* Row 3: Money elements  */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Price Buy */}
                <div className="space-y-2">
                  <label htmlFor="form-buying-price-input" className="block text-xl font-black text-slate-900">
                    가격 / قیمت خرید هر کالا (به تومان) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-buying-price-input"
                    type="number"
                    required
                    min="0"
                    placeholder="مثال: 120000"
                    value={formBuyingPrice}
                    onChange={(e) => setFormBuyingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-5 rounded-xl text-xl font-bold text-slate-950 focus:border-sky-500 focus:ring-0"
                  />
                  {formBuyingPrice !== '' && (
                    <span className="text-lg bg-emerald-50 text-emerald-800 py-1 px-3 rounded-lg block w-max font-bold">
                      مبلغ خرید کالا: {formatPrice(formBuyingPrice)}
                    </span>
                  )}
                </div>

                {/* Price Sell */}
                <div className="space-y-2">
                  <label htmlFor="form-selling-price-input" className="block text-xl font-black text-slate-900">
                    قیمت فروش هر کالا (تک‌فروشی به تومان) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-selling-price-input"
                    type="number"
                    required
                    min="0"
                    placeholder="مثال: 150000"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-5 rounded-xl text-xl font-bold text-slate-950 focus:border-sky-500 focus:ring-0"
                  />
                  {formSellingPrice !== '' && (
                    <span className="text-lg bg-indigo-50 text-indigo-800 py-1 px-3 rounded-lg block w-max font-bold">
                      مبلغ فروش کالا: {formatPrice(formSellingPrice)}
                    </span>
                  )}
                </div>

              </div>

              {/* Row 4: Custom Shamsi Date Selectors instead of bad pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Buying Date Shamsi Selectors */}
                <div className="space-y-2">
                  <label className="block text-xl font-black text-slate-900">
                    تاریخ خرید کالا
                  </label>
                  
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* Day selector */}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 font-bold">روز خرید</span>
                      <select
                        id="form-date-day-select"
                        value={formDay}
                        onChange={(e) => { triggerBeep('click'); setFormDay(e.target.value); }}
                        className="w-full bg-slate-50 border-2 border-slate-200 py-3.5 px-3 rounded-xl text-lg font-bold text-slate-900"
                      >
                        {Array.from({ length: 31 }, (_, i) => {
                          const val = String(i + 1).padStart(2, '0');
                          return <option key={val} value={val}>{toPersianDigits(val)}</option>;
                        })}
                      </select>
                    </div>

                    {/* Month selector */}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 font-bold">ماه خرید</span>
                      <select
                        id="form-date-month-select"
                        value={formMonth}
                        onChange={(e) => { triggerBeep('click'); setFormMonth(e.target.value); }}
                        className="w-full bg-slate-50 border-2 border-slate-200 py-3.5 px-3 rounded-xl text-lg font-bold text-slate-900"
                      >
                        {[
                          { id: '01', name: 'فروردین' },
                          { id: '02', name: 'اردیبهشت' },
                          { id: '03', name: 'خرداد' },
                          { id: '04', name: 'تیر' },
                          { id: '05', name: 'مرداد' },
                          { id: '06', name: 'شهریور' },
                          { id: '07', name: 'مهر' },
                          { id: '08', name: 'آبان' },
                          { id: '09', name: 'آذر' },
                          { id: '10', name: 'دی' },
                          { id: '11', name: 'بهمن' },
                          { id: '12', name: 'اسفند' },
                        ].map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Year selector */}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 font-bold">سال خرید</span>
                      <select
                        id="form-date-year-select"
                        value={formYear}
                        onChange={(e) => { triggerBeep('click'); setFormYear(e.target.value); }}
                        className="w-full bg-slate-50 border-2 border-slate-200 py-3.5 px-3 rounded-xl text-lg font-bold text-slate-900"
                      >
                        {['1405', '1406', '1407', '1408', '1409', '1410'].map(yr => (
                          <option key={yr} value={yr}>{toPersianDigits(yr)}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                </div>

                {/* Purchase Location */}
                <div className="space-y-2">
                  <label htmlFor="form-location-input" className="block text-xl font-black text-slate-900">
                    محل خرید / تهیه‌کننده دایمی
                  </label>
                  <input
                    id="form-location-input"
                    type="text"
                    placeholder="مثال: بازار آهن شادآباد دژ"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-5 rounded-xl text-xl font-bold text-slate-900 focus:border-sky-500 focus:ring-0"
                  />
                  <span className="text-sm text-slate-400 block">مکانی که جنس‌ها را از آن تهیه فرموده‌اید.</span>
                </div>

              </div>

              {/* Row 5: Minimum Stock Warning Limit & Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Min Stock warning */}
                <div className="space-y-2">
                  <label htmlFor="form-minstock-input" className="block text-xl font-black text-slate-900">
                    حداقل موجودی هشدار کم کالا
                  </label>
                  <input
                    id="form-minstock-input"
                    type="number"
                    min="1"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Math.max(1, parseInt(e.target.value, 10) || 5))}
                    className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-5 rounded-xl text-xl font-bold text-slate-900 focus:border-sky-500 focus:ring-0"
                  />
                  <span className="text-sm text-slate-400 block">اگر موجودی کالا کمتر از این شد، در لیست کالاها زرد رنگ می‌شود تا متوجه شوید کالا تمام شده.</span>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label htmlFor="form-desc-input" className="block text-xl font-black text-slate-900">
                    توضیحات اختیاری کالا
                  </label>
                  <textarea
                    id="form-desc-input"
                    placeholder="مثال: لوله شماره ۲، مناسب انبار اصلی پشت..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-5 rounded-xl text-xl font-bold text-slate-900 focus:border-sky-500 focus:ring-0"
                  />
                </div>

              </div>

              {/* Action Buttons for Save Form */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                
                <button
                  id="form-submit-btn"
                  type="submit"
                  className="w-full sm:flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 px-8 rounded-2xl text-2xl shadow-xl hover:shadow-emerald-500/20 transition-all border-b-4 border-emerald-700 flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Check className="w-8 h-8" />
                  <span>{editingItem ? "✓ ذخیره تغییرات ویرایش شده کالا" : "✓ ثبت کالا در انبار آذرشمس"}</span>
                </button>

                <button
                  id="form-cancel-btn"
                  type="button"
                  onClick={() => { triggerBeep('click'); resetFormFields(); setCurrentTab('list'); }}
                  className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold py-5 px-10 rounded-2xl text-xl cursor-pointer"
                >
                  انصراف و بازگشت
                </button>

              </div>

            </form>

          </div>
        )}

        {/* ==================== TAB 3: DAILY REPORTING & LOGS ==================== */}
        {currentTab === 'reports' && (
          <div className="space-y-6">
            
            {/* Report Picker with massive buttons */}
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="w-8 h-8 text-amber-500" />
                    <span>انتخاب تاریخ بررسی روزانه انبار</span>
                  </h3>
                  <p className="text-slate-500 mt-1">
                    جهت دریافت آمار تعداد و کارهای ضبط شده برای یک تاریخ خاص، آن تاریخ را مشخص فرمایید.
                  </p>
                </div>

                {/* Date Selection Box */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border-2 border-slate-200">
                  
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-bold mb-1">روز</span>
                    <select
                      id="report-date-day-select"
                      value={reportDateDay}
                      onChange={(e) => { triggerBeep('click'); setReportDateDay(e.target.value); }}
                      className="bg-white border-2 border-slate-200 py-3 px-4 rounded-xl font-bold text-lg text-slate-800"
                    >
                      {Array.from({ length: 31 }, (_, i) => {
                        const val = String(i + 1).padStart(2, '0');
                        return <option key={val} value={val}>{toPersianDigits(val)}</option>;
                      })}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-bold mb-1">ماه</span>
                    <select
                      id="report-date-month-select"
                      value={reportDateMonth}
                      onChange={(e) => { triggerBeep('click'); setReportDateMonth(e.target.value); }}
                      className="bg-white border-2 border-slate-200 py-3 px-4 rounded-xl font-bold text-lg text-slate-800"
                    >
                      {[
                        { id: '01', name: 'فروردین' },
                        { id: '02', name: 'اردیبهشت' },
                        { id: '03', name: 'خرداد' },
                        { id: '04', name: 'تیر' },
                        { id: '05', name: 'مرداد' },
                        { id: '06', name: 'شهریور' },
                        { id: '07', name: 'مهر' },
                        { id: '08', name: 'آبان' },
                        { id: '09', name: 'آذر' },
                        { id: '10', name: 'دی' },
                        { id: '11', name: 'بهمن' },
                        { id: '12', name: 'اسفند' },
                      ].map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-bold mb-1">سال</span>
                    <select
                      id="report-date-year-select"
                      value={reportDateYear}
                      onChange={(e) => { triggerBeep('click'); setReportDateYear(e.target.value); }}
                      className="bg-white border-2 border-slate-200 py-3 px-4 rounded-xl font-bold text-lg text-slate-800"
                    >
                      {['1405', '1406', '1407', '1408', '1409', '1410'].map(yr => (
                        <option key={yr} value={yr}>{toPersianDigits(yr)}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

            </div>

            {/* Selected Date Summary Metrics bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 space-y-2">
                <span className="text-slate-500 font-bold text-md block">کارهای انجام شده در تاريخ</span>
                <span className="text-2xl font-black text-slate-900 block font-mono">
                  {toPersianDigits(targetReportDateStr)}
                </span>
                <span className="text-sm bg-sky-50 text-sky-800 px-3 py-1 rounded-full font-bold block w-max">
                  {toPersianDigits(todaysLogs.length)} عملیات ثبت‌شده
                </span>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 space-y-2">
                <span className="text-slate-500 font-bold text-md block">کالاهای جدید اضافه شده</span>
                <span className="text-3xl font-black text-emerald-600 block">
                  +{toPersianDigits(todaysStockAddedCount)} عدد
                </span>
                <span className="text-sm text-slate-400 block">
                  ارزش تقریبی ورودی: {formatPrice(todaysCapitalAdded)}
                </span>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 space-y-2">
                <span className="text-slate-500 font-bold text-md block">کالاها فروخته/خارج شده</span>
                <span className="text-3xl font-black text-rose-600 block">
                  -{toPersianDigits(todaysStockRemovedCount)} عدد
                </span>
                <span className="text-sm text-slate-400 block">
                  ارزش تقریبی خروجی: {formatPrice(todaysLogs.filter(l => l.type === 'decrease').reduce((acc, log) => {
                    const matchItem = items.find(i => i.id === log.itemId);
                    const sellingPrice = matchItem ? matchItem.sellingPrice : 0;
                    return acc + (Math.abs(log.quantityChange) * sellingPrice);
                  }, 0))}
                </span>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 space-y-2">
                <span className="text-slate-500 font-bold text-md block">سود متصور تراکنش‌های امروز</span>
                <span className="text-3xl font-black text-violet-750 text-indigo-700 block">
                  {formatPrice(todaysLogs.reduce((acc, log) => {
                    const matchItem = items.find(i => i.id === log.itemId);
                    if (!matchItem) return acc;
                    const unitProfit = matchItem.sellingPrice - matchItem.buyingPrice;
                    const countChange = Math.abs(log.quantityChange);
                    
                    if (log.type === 'decrease') {
                      return acc + (countChange * unitProfit); // Actual realized profit on sales
                    }
                    return acc;
                  }, 0))}
                </span>
                <span className="text-sm text-slate-400 block">محاسبه بر مبنای خرید و فروش</span>
              </div>

            </div>

            {/* Logs List & Reports Export sheet and table container */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
              
              <div className="p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900">
                    دفترچه تراکنش‌ها و فعالیت روز {toPersianDigits(targetReportDateStr)}
                  </h3>
                  <p className="text-slate-500 text-sm">هرگونه اضافه و کم کردن انبار در این قسمت بایگانی شده است.</p>
                </div>
                
                {todaysLogs.length > 0 && (
                  <button
                    id="export-day-logs-excel-btn"
                    onClick={() => {
                      triggerBeep('click');
                      exportLogsToExcel(todaysLogs, targetReportDateStr);
                      showNotification(`گزارش اکسل برای تاریخ ${targetReportDateStr} آماده شد.`, "success");
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-md shadow-lg border-b-4 border-amber-700 transition active:scale-95 cursor-pointer"
                  >
                    <Download className="w-5 h-5 text-amber-100" />
                    <span>خروجی اکسل این روز Excel</span>
                  </button>
                )}
              </div>

              {todaysLogs.length === 0 ? (
                <div className="text-center py-20 px-6 space-y-4">
                  <FileText className="w-20 h-20 text-slate-300 mx-auto" />
                  <p className="text-2xl font-bold text-slate-400">تراکنشی برای این روز ثبت نشده است.</p>
                  <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                    با بازگشت به لیست کالاها و ثبت یا تغییر موجودی هر کالا، کارهای شما به صورت خودکار این‌جا اضافه خواهد شد.
                  </p>
                </div>
              ) : (
                <div id="logs-list-container">
                  {/* --- DESKTOP VIEW: High-density logs table --- */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-md font-bold">
                          <th className="py-4 px-6">ساعت ثبت کالا</th>
                          <th className="py-4 px-6">نام کالای جابجا شده</th>
                          <th className="py-4 px-6">نوع عملیات انجام‌شده</th>
                          <th className="py-4 px-6 text-center">تغییر موجودی (عدد)</th>
                          <th className="py-4 px-6">توضیحات انباردار</th>
                          <th className="py-4 px-6 text-center">اقدام</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-lg">
                        {todaysLogs.map((log) => {
                          const timeStr = new Date(log.timestamp).toLocaleTimeString('fa-IR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              
                              {/* Timestamp */}
                              <td className="py-4 px-6 font-mono font-medium text-slate-500">
                                {toPersianDigits(timeStr)}
                              </td>

                              {/* Item Name */}
                              <td className="py-4 px-6 font-bold text-slate-900">
                                {log.itemName}
                              </td>

                              {/* Operation Type badge */}
                              <td className="py-4 px-6">
                                {log.type === 'add' ? (
                                  <span className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1.5 rounded-full text-sm">
                                    📦 ثبت بار اول کالا
                                  </span>
                                ) : log.type === 'increase' ? (
                                  <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-full text-sm">
                                    ➕ ورود کالا / خرید جدید
                                  </span>
                                ) : log.type === 'decrease' ? (
                                  <span className="bg-rose-100 text-rose-800 font-bold px-3 py-1.5 rounded-full text-sm">
                                    ➖ خروج کالا / فروش رفتن
                                  </span>
                                ) : log.type === 'edit' ? (
                                  <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded-full text-sm">
                                    ✏️ ویرایش کلی اطلاعات
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded-full text-sm">
                                    🗑️ حذف کالا
                                  </span>
                                )}
                              </td>

                              {/* Count difference */}
                              <td className="py-4 px-6 text-center">
                                {log.quantityChange > 0 ? (
                                  <span className="text-emerald-600 font-black text-xl">
                                    +{toPersianDigits(log.quantityChange)}
                                  </span>
                                ) : log.quantityChange < 0 ? (
                                  <span className="text-rose-600 font-black text-xl">
                                    {toPersianDigits(log.quantityChange)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>

                              {/* Details text */}
                              <td className="py-4 px-6 text-slate-600 text-sm">
                                {log.description}
                              </td>

                              {/* Admin erase trace action */}
                              <td className="py-4 px-6 text-center">
                                <button
                                  id={`delete-log-btn-${log.id}`}
                                  onClick={() => deleteLogItem(log.id)}
                                  className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                                  title="حذف گزارش"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* --- MOBILE VIEW: Scroll-free visual transaction feed --- */}
                  <div className="block md:hidden space-y-4 px-1 py-3 text-right">
                    {todaysLogs.map((log) => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div 
                          key={`log-mob-${log.id}`}
                          className="bg-white rounded-2xl p-4 shadow-md border border-slate-150 space-y-3 relative"
                        >
                          {/* Time & Erase Button in card header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <span className="text-slate-500 font-mono text-sm font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                              🕒 ساعت {toPersianDigits(timeStr)}
                            </span>
                            
                            <button
                              id={`delete-log-mob-btn-${log.id}`}
                              onClick={() => deleteLogItem(log.id)}
                              className="text-rose-450 text-rose-500 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 cursor-pointer flex items-center gap-1 text-xs"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>حذف فعالیت</span>
                            </button>
                          </div>

                          {/* Item Name and delta quantity */}
                          <div className="flex items-start justify-between gap-2.5">
                            <p className="text-md font-extrabold text-slate-900 leading-snug">
                              {log.itemName}
                            </p>

                            <div className="flex-shrink-0 text-left">
                              {log.quantityChange > 0 ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-xl font-black text-[15px] block">
                                  +{toPersianDigits(log.quantityChange)}
                                </span>
                              ) : log.quantityChange < 0 ? (
                                <span className="bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1 rounded-xl font-black text-[15px] block font-mono">
                                  {toPersianDigits(log.quantityChange)}
                                </span>
                              ) : (
                                <span className="bg-slate-55 bg-slate-50 text-slate-500 border border-slate-100 px-3 py-1 rounded-xl font-bold text-xs block">بدون تغییر</span>
                              )}
                            </div>
                          </div>

                          {/* Action badge & Desc */}
                          <div className="space-y-2">
                            <div>
                              {log.type === 'add' ? (
                                <span className="bg-indigo-100 text-indigo-800 font-extrabold px-3 py-1.5 rounded-lg text-xs inline-block">
                                  📦 ثبت بار اول کالا
                                </span>
                              ) : log.type === 'increase' ? (
                                <span className="bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1.5 rounded-lg text-xs inline-block">
                                  ➕ ورود کالا / خرید جدید
                                </span>
                              ) : log.type === 'decrease' ? (
                                <span className="bg-rose-100 text-rose-800 font-extrabold px-3 py-1.5 rounded-lg text-xs inline-block">
                                  ➖ خروج کالا / فروش رفتن
                                </span>
                              ) : log.type === 'edit' ? (
                                <span className="bg-amber-100 text-amber-800 font-extrabold px-3 py-1.5 rounded-lg text-xs inline-block">
                                  ✏️ ویرایش اطلاعات
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-700 font-extrabold px-3 py-1.5 rounded-lg text-xs inline-block">
                                  🗑️ حذف کالا
                                </span>
                              )}
                            </div>

                            {log.description && (
                              <p className="text-slate-500 text-xs font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                {log.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* ==================== TAB 4: INVOICE GENERATOR ==================== */}
        {currentTab === 'invoices' && (
          <div className="space-y-6">
            
            {/* VIEW 1: Formal Invoice Viewer/Printer component override */}
            {viewingInvoice && (
              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border-4 border-indigo-200 space-y-8 animate-in fade-in duration-200 printable-invoice-wrapper">
                {/* Visual Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 print:hidden text-right">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-xl font-extrabold text-slate-800">پیش‌نمایش رسمی فاکتور فروش</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        triggerBeep('click');
                        try {
                          window.focus();
                          setTimeout(() => {
                            window.print();
                          }, 150);
                        } catch (err) {
                          console.error("Print error details: ", err);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3.5 rounded-xl flex items-center gap-2.5 shadow-md border-b-4 border-indigo-800 cursor-pointer text-md transition-all active:scale-[0.98]"
                    >
                      <Printer className="w-5 h-5" />
                      <span>چاپ رسمی فاکتور</span>
                    </button>
                    <button
                      onClick={() => { triggerBeep('click'); startEditInvoice(viewingInvoice); }}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-3.5 rounded-xl flex items-center gap-2 border-b-4 border-amber-700 cursor-pointer text-md transition-all active:scale-[0.98]"
                    >
                      <Edit3 className="w-5 h-5" />
                      <span>ویرایش مجدد</span>
                    </button>
                    <button
                      onClick={() => { triggerBeep('click'); setViewingInvoice(null); }}
                      className="bg-slate-600 hover:bg-slate-700 text-white font-bold px-5 py-3.5 rounded-xl flex items-center gap-2 border-b-4 border-slate-800 cursor-pointer text-md transition-all active:scale-[0.98]"
                    >
                      <span>بازگشت به لیست فاکتورها</span>
                    </button>
                  </div>
                </div>

                {/* THE ACTUAL FORMAL COMPLIANT INVOICE TEMPLATE */}
                <div className="border border-slate-300 p-6 md:p-8 rounded-xl bg-white shadow-inner max-w-5xl mx-auto space-y-6 text-slate-900 border-t-8 border-t-indigo-600 text-right text-base leading-relaxed print:border-none print:p-0 print:shadow-none print-invoice-box">
                  
                  {/* Print Custom Header */}
                  <div className="flex flex-row print:flex-row items-center justify-between border-b pb-4 print:pb-2 gap-4 print:gap-2">
                    <div className="text-right space-y-1 print:space-y-0.5">
                      <h2 className="text-2xl md:text-3xl font-black text-indigo-900 print:text-xl">فاکتور رسمی فروش کالا</h2>
                      <p className="text-sm md:text-md text-slate-500 font-bold print:text-xs">{viewingInvoice.sellerName}</p>
                    </div>
                    {/* Invoice Meta details */}
                    <div className="bg-slate-50 px-4 md:px-5 py-2.5 md:py-3.5 rounded-xl border border-slate-200 text-sm md:text-md space-y-1 w-48 md:w-64 print:py-1 print:px-3 print:w-48">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold print:text-xs">شماره فاکتور:</span>
                        <span className="font-mono font-black text-indigo-950 print:text-xs">{toPersianDigits(viewingInvoice.invoiceNumber)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold print:text-xs">تاریخ صدور:</span>
                        <span className="font-bold print:text-xs">{toPersianDigits(viewingInvoice.date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Seller vs Buyer */}
                  <div className="grid grid-cols-2 print:grid-cols-2 gap-4 md:gap-6 border-b pb-4 print:pb-2">
                    {/* Seller details */}
                    <div className="bg-sky-50/40 p-3 md:p-4 rounded-xl border border-sky-100 space-y-1 md:space-y-2 print:p-2.5">
                      <div className="bg-sky-100 px-2 py-0.5 rounded-lg text-sky-900 text-xs md:text-sm font-black inline-block print:text-[10px]">مشخصات فروشنده</div>
                      <div className="text-sm md:text-md font-extrabold text-slate-900 print:text-xs">{viewingInvoice.sellerName}</div>
                      {viewingInvoice.sellerPhone && (
                        <div className="text-xs text-slate-600 font-bold print:text-[10px]">تلفن: {toPersianDigits(viewingInvoice.sellerPhone)}</div>
                      )}
                      {viewingInvoice.sellerEconomicId && (
                        <div className="text-xs text-slate-600 font-bold print:text-[10px]">کد اقتصادی/شناسه ملی: {toPersianDigits(viewingInvoice.sellerEconomicId)}</div>
                      )}
                      {viewingInvoice.sellerAddress && (
                        <div className="text-xs text-slate-600 font-bold leading-tight print:text-[9px]">آدرس انبار: {viewingInvoice.sellerAddress}</div>
                      )}
                    </div>

                    {/* Buyer details */}
                    <div className="bg-emerald-50/40 p-3 md:p-4 rounded-xl border border-emerald-100 space-y-1 md:space-y-2 print:p-2.5">
                      <div className="bg-emerald-100 px-2 py-0.5 rounded-lg text-emerald-900 text-xs md:text-sm font-black inline-block print:text-[10px]">مشخصات خریدار / مشتری</div>
                      <div className="text-sm md:text-md font-extrabold text-slate-900 print:text-xs">{viewingInvoice.buyerName}</div>
                      {viewingInvoice.buyerPhone && (
                        <div className="text-xs text-slate-600 font-bold print:text-[10px]">تلفن خریدار: {toPersianDigits(viewingInvoice.buyerPhone)}</div>
                      )}
                      {viewingInvoice.buyerNationalId && (
                        <div className="text-xs text-slate-600 font-bold print:text-[10px]">کد ملی خریدار: {toPersianDigits(viewingInvoice.buyerNationalId)}</div>
                      )}
                      {viewingInvoice.buyerAddress && (
                        <div className="text-xs text-slate-600 font-bold leading-tight print:text-[9px]">نشانی خریدار: {viewingInvoice.buyerAddress}</div>
                      )}
                    </div>
                  </div>

                  {/* Items List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 text-sm text-right">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 text-center">
                          <th className="py-3 px-3 border border-slate-300 w-12 text-center">ردیف</th>
                          <th className="py-3 px-4 border border-slate-300 text-right">عنوان کالا</th>
                          <th className="py-3 px-4 border border-slate-300 w-24 text-center">مقدار (عدد)</th>
                          <th className="py-3 px-4 border border-slate-300 w-44 text-center">قیمت واحد (تومان)</th>
                          <th className="py-3 px-4 border border-slate-300 w-48 text-center">جمع کل (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {viewingInvoice.items.map((line, idx) => (
                          <tr key={line.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 border border-slate-300 text-center font-bold">
                              {toPersianDigits(idx + 1)}
                            </td>
                            <td className="py-3 px-4 border border-slate-300 font-bold text-slate-900">
                              {line.name}
                            </td>
                            <td className="py-3 px-4 border border-slate-300 text-center font-bold text-indigo-900">
                              {toPersianDigits(line.quantity)}
                            </td>
                            <td className="py-3 px-4 border border-slate-300 text-center font-bold font-mono">
                              {toPersianDigits(line.unitPrice.toLocaleString('en-US'))}
                            </td>
                            <td className="py-3 px-4 border border-slate-300 text-center font-black font-mono text-slate-900 bg-slate-50/10">
                              {toPersianDigits(line.totalPrice.toLocaleString('en-US'))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Math Summary and Signatures */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 space-y-4">
                      {viewingInvoice.description && (
                        <div className="text-xs text-slate-600 leading-relaxed font-bold">
                          <span className="text-slate-800 font-black block mb-1">توضیحات و شرایط فروش:</span>
                          {viewingInvoice.description}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-center text-xs font-black text-slate-500 pt-8">
                        <div>
                          <p className="border-b pb-8 border-dashed border-slate-300">مهر و امضای مدیر انبار / فروشنده</p>
                        </div>
                        <div>
                          <p className="border-b pb-8 border-dashed border-slate-300">امضا و تایید دریافت کالا (خریدار)</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between text-slate-600 font-bold text-sm">
                        <span>جمع کل اقلام خالص:</span>
                        <span className="font-mono text-slate-800">{formatPrice(viewingInvoice.totalAmountBeforeTaxAndDiscount)}</span>
                      </div>
                      
                      {viewingInvoice.discount > 0 && (
                        <div className="flex justify-between text-rose-700 font-bold text-sm">
                          <span>تخفیف نقدی فاکتور:</span>
                          <span className="font-mono">-{formatPrice(viewingInvoice.discount)}</span>
                        </div>
                      )}

                      {viewingInvoice.taxRate > 0 && (
                        <div className="flex justify-between text-slate-600 font-bold text-sm border-b pb-2">
                          <span>مالیات بر ارزش افزوده ({toPersianDigits(viewingInvoice.taxRate)}٪):</span>
                          <span className="font-mono text-slate-800">+{formatPrice(viewingInvoice.taxAmount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-indigo-950 font-black text-lg pt-1 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        <span>مبلغ نهایی فاکتور:</span>
                        <span className="font-mono font-black text-indigo-900">{formatPrice(viewingInvoice.finalPayable)}</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="text-right text-md font-bold text-slate-600 bg-amber-50 p-4 rounded-2xl border-2 border-dashed border-amber-200 print:hidden space-y-1.5 shadow-sm">
                  <p className="font-extrabold text-amber-950">💡 راهنمای ثبت فاکتور و حل مشکل چاپ:</p>
                  <p className="text-sm font-semibold">۱. با زدن دکمه <strong className="text-indigo-800">«چاپ رسمی فاکتور»</strong>، کادر پرینت کالا باز می‌شود.</p>
                  <p className="text-sm font-semibold">۲. در صورتی که دکمه چاپ در پیش‌نمایش به دلیل محدودیت فنی یا امنیتی مرورگر (لایه Iframe) کار نکرد، کافیست روی دکمه <strong className="text-sky-700">«Open in new tab»</strong> در نوار بالای همین پیش‌نمایش کلیک کنید تا سامانه در پنجره‌ای مستقل و کامل باز شود؛ در این صورت چاپ و خروجی PDF بدون کوچکترین محدودیت به درستی کار خواهد کرد.</p>
                </div>

              </div>
            )}

            {/* VIEW 2: Create / Edit Form */}
            {!viewingInvoice && isCreatingInvoice && (
              <form onSubmit={saveInvoice} className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border-4 border-indigo-200 space-y-8 animate-in fade-in duration-200">
                
                {/* Creation Header */}
                <div className="flex items-center justify-between border-b pb-4 text-right">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-8 h-8 text-indigo-600" />
                    <h3 className="text-2xl font-black text-slate-900">
                      {invoiceId ? `ویرایش فاکتور فروش شماره ${toPersianDigits(invoiceNumber)}` : 'صدور و ثبت فاکتور فروش مشتریان'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => { triggerBeep('click'); setIsCreatingInvoice(false); }}
                    className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-right">
                  
                  {/* Customer and Seller metadata */}
                  <div className="space-y-6">
                    
                    {/* Buyer inputs */}
                    <div className="bg-sky-50/50 p-6 rounded-2xl border-2 border-sky-100 space-y-4">
                      <div className="flex items-center gap-2 border-b border-sky-100 pb-2 mb-2">
                        <span className="w-2.5 h-2.5 bg-sky-500 rounded-full" />
                        <h4 className="text-lg font-black text-sky-900">مشخصات مشتری / خریدار فاکتور</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2">
                          <label className="block text-md font-bold text-slate-700">نام خریدار / شرکت خریدار <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            placeholder="مثلا: شرکت بتن سدید یا جنای آقای کرمی"
                            value={invoiceBuyerName}
                            onChange={(e) => setInvoiceBuyerName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:bg-white"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-md font-bold text-slate-700">شماره موبایل / تلفن مشتری</label>
                          <input
                            type="text"
                            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                            value={invoiceBuyerPhone}
                            onChange={(e) => setInvoiceBuyerPhone(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-mono text-center text-slate-950 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-md font-bold text-slate-700">شناسه ملی / کد اقتصادی خریدار</label>
                          <input
                            type="text"
                            placeholder="۰۰۱۲۳۴۵۶۷۸"
                            value={invoiceBuyerNationalId}
                            onChange={(e) => setInvoiceBuyerNationalId(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-mono text-center text-slate-950 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5 col-span-2">
                          <label className="block text-md font-bold text-slate-700">نشانی مشتری جهت حمل بار</label>
                          <input
                            type="text"
                            placeholder="مثلا: تهران، میدان ونک، مجتمع تجاری پلاک ۴۰"
                            value={invoiceBuyerAddress}
                            onChange={(e) => setInvoiceBuyerAddress(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seller details prefilled with 'انبار آذرشمس' */}
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                        <span className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                        <h4 className="text-lg font-black text-slate-800">مشخصات ثبت شده فروشنده (پیش‌فرض)</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2">
                          <label className="block text-md font-bold text-slate-700">نام فروشگاه عرضه کننده</label>
                          <input
                            type="text"
                            value={invoiceSellerName}
                            onChange={(e) => setInvoiceSellerName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-md font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-md font-bold text-slate-700">تلفن فروشنده</label>
                          <input
                            type="text"
                            value={invoiceSellerPhone}
                            onChange={(e) => setInvoiceSellerPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-md font-mono text-center text-slate-900"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-md font-bold text-slate-700">شماره ثبت قانونی فروشگاه</label>
                          <input
                            type="text"
                            value={invoiceSellerEconomicId}
                            onChange={(e) => setInvoiceSellerEconomicId(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-md font-mono text-center text-slate-900"
                          />
                        </div>

                        <div className="space-y-1.5 col-span-2">
                          <label className="block text-md font-bold text-slate-700">آدرس انبار / دفتر مرکزی</label>
                          <input
                            type="text"
                            value={invoiceSellerAddress}
                            onChange={(e) => setInvoiceSellerAddress(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-md font-medium text-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Stock Search section */}
                  <div className="space-y-6">
                    
                    <div className="bg-indigo-50/50 p-6 rounded-2xl border-2 border-indigo-100 space-y-4">
                      
                      <div className="flex items-center gap-2 border-b border-indigo-100 pb-2 mb-2">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                        <h4 className="text-lg font-black text-indigo-900">جستجوی محصول در انبار و الحاق به لیست فاکتور</h4>
                      </div>

                      {/* Live search input */}
                      <div className="space-y-2">
                        <label className="block text-md font-bold text-indigo-900 font-black">نام کالا یا بارکد را وارد کنید:</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="مثلاً: شیر توپی، لوله..."
                            value={invoiceItemSearchQuery}
                            onChange={(e) => setInvoiceItemSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl text-lg font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                          />
                          {invoiceItemSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setInvoiceItemSearchQuery('')}
                              className="absolute inset-y-0 left-3 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Live suggestion list */}
                      {invoiceItemSearchQuery.trim() !== '' && (
                        <div className="bg-white border-2 border-indigo-150 rounded-xl max-h-56 overflow-y-auto divide-y shadow-lg">
                          {items.filter(it => 
                            it.name.toLowerCase().includes(invoiceItemSearchQuery.toLowerCase()) ||
                            it.barcode.includes(invoiceItemSearchQuery) ||
                            it.purchaseLocation.toLowerCase().includes(invoiceItemSearchQuery.toLowerCase())
                          ).length === 0 ? (
                            <p className="p-3.5 text-center text-slate-500 font-bold">هیچ کالایی یافت نشد.</p>
                          ) : (
                            items.filter(it => 
                              it.name.toLowerCase().includes(invoiceItemSearchQuery.toLowerCase()) ||
                              it.barcode.includes(invoiceItemSearchQuery) ||
                              it.purchaseLocation.toLowerCase().includes(invoiceItemSearchQuery.toLowerCase())
                            ).map(it => (
                              <button
                                type="button"
                                key={`search-pick-li-${it.id}`}
                                onClick={() => selectProductForInvoiceCreator(it)}
                                className="w-full text-right p-3.5 hover:bg-slate-50 text-slate-900 font-bold text-sm block transition-colors border-none"
                              >
                                {it.name} <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full mr-1.5 font-bold">موجودی انبار: {toPersianDigits(it.quantity)}</span> <span className="text-xs text-indigo-700 font-mono font-black ml-2">قیمت: {formatPrice(it.sellingPrice)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {/* Picked item editor card */}
                      {invoiceSelectedProduct ? (
                        <div className="p-4 bg-white border border-indigo-200 rounded-xl space-y-4 animate-in fade-in duration-200 text-right">
                          <div className="text-md text-slate-800 font-bold">
                            <span className="text-xs text-indigo-600 block font-black">جنس برگزیده از لیست انبار شما:</span>
                            <span className="text-lg font-black text-indigo-950 leading-snug">{invoiceSelectedProduct.name}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            
                            {/* Quantity selection */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-black text-slate-600">تعداد کالا برای فاکتور:</label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setInvoiceProductQty(prev => Math.max(1, prev - 1))}
                                  className="bg-slate-200 font-extrabold w-10 h-10 rounded-lg text-lg flex items-center justify-center cursor-pointer hover:bg-indigo-150"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={invoiceSelectedProduct.quantity}
                                  value={invoiceProductQty}
                                  onChange={(e) => setInvoiceProductQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  className="w-full text-center py-2 text-md font-bold border rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => setInvoiceProductQty(prev => prev + 1)}
                                  className="bg-slate-200 font-extrabold w-10 h-10 rounded-lg text-lg flex items-center justify-center cursor-pointer hover:bg-indigo-150"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs font-semibold text-slate-500 text-center block mt-1">حداکثر موجودی برای جابجایی: {toPersianDigits(invoiceSelectedProduct.quantity)} عدد</span>
                            </div>

                            {/* Cost customization */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-black text-slate-600">قیمت فروش واحد مقتضی فاکتور جدید (تومان):</label>
                              <input
                                type="number"
                                value={invoiceProductPrice}
                                onChange={(e) => setInvoiceProductPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-3 py-2 text-md font-mono font-bold text-slate-900 border rounded-lg focus:border-indigo-500 focus:outline-none"
                              />
                              <span className="text-xs font-bold text-emerald-600 text-center block mt-1">قیمت فروش پیش‌فرض کالا انبار: {formatPrice(invoiceSelectedProduct.sellingPrice)}</span>
                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={addProductToInvoiceDraft}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl border-b-4 border-indigo-800 shadow-md flex items-center justify-center gap-2 cursor-pointer transition text-md active:scale-95 m-0"
                          >
                            <Plus className="w-5 h-5 text-white" />
                            <span>➕ افزودن این کالا به جدول فاکتور رسمی</span>
                          </button>

                        </div>
                      ) : (
                        <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-md leading-relaxed">
                          👈 نام یا بارکد محصولِ داخل انبار را جستجو کرده و با کلیک بر روی آن، تعداد و قیمت دلخواه را ثبت کنید.
                        </div>
                      )}

                    </div>

                    <div className="grid grid-cols-2 gap-4 text-right">
                      
                      <div className="space-y-1.5">
                        <label className="block text-md font-bold text-slate-700">تاریخ فاکتور</label>
                        <div className="grid grid-cols-3 gap-2">
                          
                          {/* Day selector */}
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-400 font-bold">روز</span>
                            <select
                              id="invoice-date-day-select"
                              value={invoiceDay}
                              onChange={(e) => { triggerBeep('click'); setInvoiceDay(e.target.value); }}
                              className="w-full bg-slate-50 border-2 border-slate-200 py-2.5 px-1 md:px-2 rounded-xl text-md font-black text-slate-900 focus:border-indigo-500 focus:outline-none"
                            >
                              {Array.from({ length: 31 }, (_, i) => {
                                const val = String(i + 1).padStart(2, '0');
                                return <option key={val} value={val}>{toPersianDigits(val)}</option>;
                              })}
                            </select>
                          </div>

                          {/* Month selector */}
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-400 font-bold">ماه</span>
                            <select
                              id="invoice-date-month-select"
                              value={invoiceMonth}
                              onChange={(e) => { triggerBeep('click'); setInvoiceMonth(e.target.value); }}
                              className="w-full bg-slate-50 border-2 border-slate-200 py-2.5 px-1 md:px-2 rounded-xl text-md font-black text-slate-900 focus:border-indigo-500 focus:outline-none"
                            >
                              {[
                                { id: '01', name: 'فروردین' },
                                { id: '02', name: 'اردیبهشت' },
                                { id: '03', name: 'خرداد' },
                                { id: '04', name: 'تیر' },
                                { id: '05', name: 'مرداد' },
                                { id: '06', name: 'شهریور' },
                                { id: '07', name: 'مهر' },
                                { id: '08', name: 'آبان' },
                                { id: '09', name: 'آذر' },
                                { id: '10', name: 'دی' },
                                { id: '11', name: 'بهمن' },
                                { id: '12', name: 'اسفند' },
                              ].map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Year selector */}
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-400 font-bold">سال</span>
                            <select
                              id="invoice-date-year-select"
                              value={invoiceYear}
                              onChange={(e) => { triggerBeep('click'); setInvoiceYear(e.target.value); }}
                              className="w-full bg-slate-50 border-2 border-slate-200 py-2.5 px-1 md:px-2 rounded-xl text-md font-black text-slate-900 focus:border-indigo-500 focus:outline-none"
                            >
                              {['1405', '1406', '1407', '1408', '1409', '1410'].map(yr => (
                                <option key={yr} value={yr}>{toPersianDigits(yr)}</option>
                              ))}
                            </select>
                          </div>

                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-md font-bold text-slate-700">شماره ثبت انحصاری فاکتور</label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-mono text-center text-slate-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                    </div>

                  </div>

                </div>

                {/* Table of products added to invoice */}
                <div className="space-y-4 text-right">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <span className="w-3 h-3 bg-indigo-600 rounded-full" />
                    <h4 className="text-xl font-black text-slate-900">جدول موقت پیش‌نویس اقلام فاکتور ({toPersianDigits(invoiceItems.length)} قلم کالا)</h4>
                  </div>

                  {invoiceItems.length === 0 ? (
                    <div className="text-center p-8 border-4 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-lg">
                      لیست اقلام آماده ثبت برای مشتری خالی است. از پنل بالا برای جستجو استفاده کنید.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full border-collapse text-sm text-right">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-black border-b">
                            <th className="py-4 px-4 w-12 text-center">ردیف</th>
                            <th className="py-4 px-4">عنوان محصول</th>
                            <th className="py-4 px-4 text-center">تعداد (عدد)</th>
                            <th className="py-4 px-4 text-center">بهای واحد (تومان)</th>
                            <th className="py-4 px-4 text-center">بهای کل (تومان)</th>
                            <th className="py-4 px-4 text-center w-24">اقدام</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-md">
                          {invoiceItems.map((it, idx) => (
                            <tr key={it.id} className="hover:bg-slate-50/50">
                              <td className="py-4 px-4 text-center font-bold">{toPersianDigits(idx + 1)}</td>
                              <td className="py-4 px-4 font-black text-slate-900">{it.name}</td>
                              <td className="py-4 px-4 text-indigo-900 font-bold text-center text-lg">{toPersianDigits(it.quantity)}</td>
                              <td className="py-4 px-4 text-center font-bold font-mono">{toPersianDigits(it.unitPrice.toLocaleString('en-US'))}</td>
                              <td className="py-4 px-4 text-center font-black font-mono text-slate-900">{toPersianDigits(it.totalPrice.toLocaleString('en-US'))}</td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeProductFromInvoiceDraft(it.id)}
                                  className="text-rose-500 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 cursor-pointer"
                                  title="حذف جنس"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Math breakdown, tax discounts, stock reduction check */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t items-start text-right">
                  
                  {/* Descriptions */}
                  <div className="space-y-1.5 col-span-1 lg:col-span-2">
                    <label className="block text-md font-bold text-slate-700">توضیحات تکمیلی فاکتور فروش (ملاحظات باربری، چک‌ها یا تخفیفات ویژه):</label>
                    <textarea
                      placeholder="اینجا بنویسید (مثلاً: نحوه تسویه به صورت چک بانکی ۴۵ روزه به عهده آقای کریمی می‌باشد...)"
                      value={invoiceDescription}
                      onChange={(e) => setInvoiceDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-md font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 border-b pb-2">
                      <span>جمع خالص کالاها:</span>
                      <span className="font-mono font-bold text-slate-950">
                        {invoiceItems.length > 0 ? formatPrice(invoiceItems.reduce((acc, x) => acc + x.totalPrice, 0)) : '۰ تومان'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-600">میزان کل تخفیف نقدی مشتری (تومان):</label>
                      <input
                        type="number"
                        placeholder="مثلا ۱۰۰۰۰ تومان"
                        value={invoiceDiscount}
                        onChange={(e) => setInvoiceDiscount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 text-md font-mono font-bold border rounded-lg focus:outline-none text-rose-700 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-600">درصد اعمال مالیات بر ارزش افزوده (VAT):</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={invoiceTaxRate}
                          onChange={(e) => setInvoiceTaxRate(Math.max(0, Number(e.target.value) || 0))}
                          className="w-20 px-3 py-2 text-md font-mono text-center font-bold border rounded-lg focus:outline-none bg-white"
                        />
                        <span className="text-sm font-bold text-slate-500">درصد مالیات (پیش‌فرض ۹٪)</span>
                      </div>
                    </div>

                    {/* Checkbox for dynamic depletion of warehouse quantities */}
                    {!invoiceId && (
                      <label className="flex items-start gap-2.5 p-2 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deductFromStock}
                          onChange={(e) => setDeductFromStock(e.target.checked)}
                          className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-0 mt-0.5 cursor-pointer"
                        />
                        <span className="text-xs font-black text-indigo-950 leading-snug">
                          ✔️ کسر اتوماتیک از تعداد موجودی اجناس فعلی انبار پس از نهایی‌سازی فاکتور
                        </span>
                      </label>
                    )}

                    <div className="border-t pt-3 flex justify-between items-center text-lg font-black text-indigo-950">
                      <span>مبلغ قابل پرداخت نهایی:</span>
                      <span className="font-mono text-indigo-900">
                        {formatPrice(
                          (() => {
                            const before = invoiceItems.reduce((acc, x) => acc + x.totalPrice, 0);
                            const discountVal = Number(invoiceDiscount) || 0;
                            const afterDiscount = Math.max(0, before - discountVal);
                            const calculatedTax = Math.round(afterDiscount * (invoiceTaxRate / 100));
                            return afterDiscount + calculatedTax;
                          })()
                        )}
                      </span>
                    </div>

                  </div>

                </div>

                {/* Final Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-t pt-6">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-5 rounded-2xl border-b-4 border-indigo-800 shadow-xl transition cursor-pointer flex items-center justify-center gap-3 text-xl active:scale-[0.98] m-0"
                  >
                    <Check className="w-7 h-7" />
                    <span>💾 ثبت و صادر کردن این فاکتور</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { triggerBeep('click'); setIsCreatingInvoice(false); }}
                    className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-8 py-5 rounded-2xl transition cursor-pointer text-lg text-center"
                  >
                    <span>❌ لغو و بازگردانی پیش‌نویس</span>
                  </button>
                </div>

              </form>
            )}

            {/* VIEW 3: Main list of historical Invoices */}
            {!viewingInvoice && !isCreatingInvoice && (
              <div className="space-y-6">
                
                {/* Search / Filter header info */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-4 border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-right">
                    <h3 className="text-2xl font-black text-indigo-950">🧾 فاکتورهای فروش صادر شده</h3>
                    <p className="text-md text-slate-500 font-bold">مدیریت مالی مشتریان، صادر کردن قبض کالا، چاپ رسمی فاکتور و پیگیری موجودی انبار</p>
                  </div>

                  <button
                    id="new-invoice-action-btn"
                    onClick={startCreateInvoice}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-5.5 rounded-3xl shadow-xl flex items-center justify-center gap-2.5 cursor-pointer border-b-4 border-indigo-800 transition active:scale-[0.98] text-xl m-0"
                  >
                    <Plus className="w-7 h-7" />
                    <span>➕ صدور فاکتور رسمی جدید</span>
                  </button>
                </div>

                {/* Store Settings Collapsible Card */}
                <div className="bg-white rounded-3xl shadow-lg border-4 border-indigo-100 overflow-hidden text-right">
                  <button
                    type="button"
                    onClick={() => { triggerBeep('click'); setShowStoreSettings(!showStoreSettings); }}
                    className="w-full flex items-center justify-between p-5 md:p-6 bg-slate-50 border-b-2 border-slate-100 cursor-pointer hover:bg-indigo-50/50 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-700">
                        <Settings className="w-7 h-7" />
                      </div>
                      <div className="text-right">
                        <span className="text-lg md:text-xl font-black text-indigo-950 block">⚙️ تنظیمات مشخصات دائمی فروشگاه (حق چاپ فاکتور)</span>
                        <span className="text-xs text-slate-500 font-bold block mt-0.5">ثبت یکبار نام فروشگاه، شماره تلفن و آدرس رسمی شما برای ظاهر شدن در تمام فاکتورها</span>
                      </div>
                    </div>
                    <div>
                      {showStoreSettings ? (
                        <ChevronUp className="w-7 h-7 text-indigo-600" />
                      ) : (
                        <ChevronDown className="w-7 h-7 text-indigo-600" />
                      )}
                    </div>
                  </button>

                  {showStoreSettings && (
                    <div className="p-6 space-y-5 bg-white text-right animate-in fade-in slide-in-from-top-4 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        <div className="space-y-1.5 md:col-span-1">
                          <label className="block text-md font-bold text-slate-700">نام فروشگاه شما / نام فروشنده:</label>
                          <input
                            type="text"
                            placeholder="مثلاً: ابزارآلات کرمی، فروشگاه برادران حسینی"
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-250 bg-slate-50/50 focus:bg-white focus:border-indigo-500 text-lg font-bold text-slate-900 rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-1">
                          <label className="block text-md font-bold text-slate-700">تلفن تماس فروشگاه تان:</label>
                          <input
                            type="text"
                            placeholder="مثلاً: ۰۲۱-۵۵۶۶۷۷۸۸"
                            value={storePhone}
                            onChange={(e) => setStorePhone(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-250 bg-slate-50/50 focus:bg-white focus:border-indigo-500 text-lg font-bold text-slate-900 rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-1">
                          <label className="block text-md font-bold text-slate-700">شماره ثبت قانونی / کد اقتصادی فروشگاه:</label>
                          <input
                            type="text"
                            placeholder="مثلاً: ۴۱۱۱۲۲۳۳۴۴۵۵"
                            value={storeEconomicId}
                            onChange={(e) => setStoreEconomicId(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-250 bg-slate-50/50 focus:bg-white focus:border-indigo-500 text-lg font-bold text-slate-900 rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="block text-md font-bold text-slate-700">نشانی دقیق محل کار یا فروشگاه شما:</label>
                          <textarea
                            rows={2}
                            placeholder="مثلاً: تهران، بازار آهن شادآباد، مجتمع تجاری آذرشمس، پلاک ۱۱۰"
                            value={storeAddress}
                            onChange={(e) => setStoreAddress(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-250 bg-slate-50/50 focus:bg-white focus:border-indigo-500 text-lg font-bold text-slate-900 rounded-xl focus:outline-none resize-none leading-relaxed"
                          />
                        </div>

                      </div>

                      <div className="flex justify-start border-t pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            triggerBeep('success');
                            localStorage.setItem('azarshams_store_name', storeName);
                            localStorage.setItem('azarshams_store_phone', storePhone);
                            localStorage.setItem('azarshams_store_economic_id', storeEconomicId);
                            localStorage.setItem('azarshams_store_address', storeAddress);
                            
                            // Immediately update draft defaults so everything starts prefilled correctly
                            setInvoiceSellerName(storeName);
                            setInvoiceSellerPhone(storePhone);
                            setInvoiceSellerEconomicId(storeEconomicId);
                            setInvoiceSellerAddress(storeAddress);
                            
                            showNotification("مشخصات دائمی فروشگاه شما با موفقیت در مرورگر ثبت شد. از این پس فاکتورها با همین مشخصات صادر می‌شوند.", "success");
                            setShowStoreSettings(false);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg border-b-4 border-indigo-800 transition active:scale-[0.98] text-lg cursor-pointer"
                        >
                          💾 ذخیره نهایی مشخصات فروشگاه من
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search bar specifically for invoices list by customer or invoice-number */}
                {invoices.length === 0 ? (
                  <div className="bg-white p-14 rounded-3xl text-center border-4 border-indigo-100 shadow-xl space-y-4">
                    <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                      <Receipt className="w-12 h-12 text-indigo-400" />
                    </div>
                    <h4 className="text-2xl font-black text-slate-700">هیچ فاکتور فروشی صادر نشده است</h4>
                    <p className="text-slate-400 max-w-lg mx-auto font-bold text-md leading-relaxed">
                      تاکنون هیچ فاکتور فروش رسمی برای مشتریان محترم صادر نکردید. با کلیک بر روی کلید بنفش بالا، اولین فاکتور فروش تان را با جستجوی مستقیم کالاها از انبار بسازید.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
                    {invoices.map(inv => {
                      const totalQty = inv.items.reduce((acc, x) => acc + x.quantity, 0);
                      return (
                        <div
                          key={`invcard-${inv.id}`}
                          className="bg-white rounded-3xl p-6 shadow-lg border-2 border-slate-150 hover:border-indigo-300 transition-all space-y-4 relative"
                        >
                          <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-2xl border mb-3">
                            <span className="font-mono text-xs font-black text-indigo-900 bg-indigo-100 px-3 py-1 rounded-xl">
                              {toPersianDigits(inv.invoiceNumber)}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              🕒 {toPersianDigits(inv.date)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-xs text-slate-400 font-bold block">نام خریدار / مشتری تان:</span>
                            <p className="text-lg font-black text-slate-900 truncate">
                              {inv.buyerName}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 bg-slate-50/50 p-3 rounded-xl border">
                            <div>
                              <span>نوع اجناس: </span>
                              <span className="text-indigo-900 font-black">{toPersianDigits(inv.items.length)} ردیف</span>
                            </div>
                            <div>
                              <span>تعداد کل اجناس: </span>
                              <span className="text-indigo-900 font-black">{toPersianDigits(totalQty)} عدد</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t pt-3.5">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">مبلغ دریافتنی نهایی فاکتور:</span>
                              <span className="font-mono font-black text-indigo-950 text-md">{formatPrice(inv.finalPayable)}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => { triggerBeep('click'); setViewingInvoice(inv); }}
                                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-center border-none"
                                title="مشاهده رسمی و چاپ"
                              >
                                <Printer className="w-5 h-5 animate-pulse" />
                              </button>
                              
                              <button
                                onClick={() => { triggerBeep('click'); startEditInvoice(inv); }}
                                className="bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-center border-none"
                                title="ویرایش جزئیات"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>

                              <button
                                onClick={() => deleteInvoiceRecord(inv.id)}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-center border-none"
                                title="حذف دائم"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* ==================== BARCODE SCANNER CAMERA OVERLAY MODAL ==================== */}
      {scannerOpen && (
        <BarcodeScanner
          onScanSuccess={handleBarcodeScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* ==================== ELDERLY QUICK QUANTITY ADJUSTMENT DIALOG ==================== */}
      {quickAdjustItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border-4 border-sky-600 animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="bg-sky-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8" />
                <h3 className="text-2xl font-black">تغییر سریع موجودی کالا</h3>
              </div>
              <button 
                id="close-quickmodal-header-btn"
                onClick={() => { triggerBeep('click'); setQuickAdjustItem(null); }}
                className="p-1 hover:bg-sky-700 rounded-full transition cursor-pointer"
              >
                <X className="w-8 h-8 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6">
              
              {/* Product Info Name and Barcodes display */}
              <div className="text-center bg-slate-50 p-5 rounded-2xl border-2 border-slate-100">
                <span className="text-slate-400 text-sm font-bold">نام جنس انتخابی شما:</span>
                <h4 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 mb-2">
                  {quickAdjustItem.name}
                </h4>
                <div className="flex items-center justify-center gap-4 text-md text-slate-500 font-bold mt-2">
                  <span className="bg-sky-50 text-sky-800 px-3 py-1 rounded-xl">
                    موجودی فعلی در انبار: {toPersianDigits(quickAdjustItem.quantity)} عدد
                  </span>
                  {quickAdjustItem.barcode && (
                    <span className="bg-slate-200 px-3 py-1 rounded-xl font-mono">
                      بارکد کالا کالا: {toPersianDigits(quickAdjustItem.barcode)}
                    </span>
                  )}
                </div>
              </div>

              {/* ACTION TOGGLE: IN / OUT */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Increase option */}
                <button
                  id="quickmodal-action-in-btn"
                  type="button"
                  onClick={() => { triggerBeep('click'); setQuickActionType('in'); }}
                  className={`py-5 px-5 rounded-2xl font-black text-xl md:text-2xl flex flex-col items-center gap-2 cursor-pointer transition ${
                    quickActionType === 'in'
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-300 shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <PlusCircle className="w-9 h-9" />
                  <span>➕ جنس وارد انبار شد (خریدم)</span>
                </button>

                {/* Decrease option */}
                <button
                  id="quickmodal-action-out-btn"
                  type="button"
                  onClick={() => { triggerBeep('click'); setQuickActionType('out'); }}
                  className={`py-5 px-5 rounded-2xl font-black text-xl md:text-2xl flex flex-col items-center gap-2 cursor-pointer transition ${
                    quickActionType === 'out'
                      ? 'bg-rose-600 text-white ring-4 ring-rose-300 shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Minus className="w-9 h-9" />
                  <span>➖ جنس خارج شد (فروختم)</span>
                </button>

              </div>

              {/* QUANTITY PICKER - GIANT BUTTONS FOR ELDERLY */}
              <div className="space-y-3">
                <label className="block text-xl font-black text-slate-800 text-center">
                  تعداد جابجایی جنس چیست؟
                </label>
                
                <div className="flex items-center justify-between gap-4 max-w-sm mx-auto">
                  
                  {/* Minus button */}
                  <button
                    id="quickmodal-qty-dec-btn"
                    onClick={() => {
                      triggerBeep('click');
                      setQuickQtyChange(prev => Math.max(1, prev - 1));
                    }}
                    className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold w-14 h-14 md:w-16 md:h-16 rounded-2xl text-4xl shadow-md border-b-4 border-sky-700 active:scale-90 cursor-pointer flex items-center justify-center m-0"
                  >
                    -
                  </button>

                  {/* Quantity input value centered */}
                  <input
                    id="quickmodal-qty-input"
                    type="number"
                    min="1"
                    value={quickQtyChange}
                    onChange={(e) => setQuickQtyChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 md:w-28 text-center text-3xl font-black text-slate-900 border-2 border-slate-300 rounded-2xl py-3 focus:outline-none"
                  />

                  {/* Plus button */}
                  <button
                    id="quickmodal-qty-inc-btn"
                    onClick={() => {
                      triggerBeep('click');
                      setQuickQtyChange(prev => prev + 1);
                    }}
                    className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold w-14 h-14 md:w-16 md:h-16 rounded-2xl text-4xl shadow-md border-b-4 border-sky-700 active:scale-90 cursor-pointer flex items-center justify-center m-0"
                  >
                    +
                  </button>

                </div>
              </div>

              {/* Extra log text details */}
              <div className="space-y-2">
                <label htmlFor="quickmodal-detail-input" className="block text-lg font-black text-slate-800">
                  توضیح کوتاه یا جزئیات (اختیاری)
                </label>
                <input
                  id="quickmodal-detail-input"
                  type="text"
                  placeholder="مثال: فاکتور خرید بازار طفر یا مشتری فلانی"
                  value={quickDetails}
                  onChange={(e) => setQuickDetails(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 py-3.5 px-4 rounded-xl text-lg text-slate-800"
                />
              </div>

            </div>

            {/* Modal actions footer with giant primary CTA */}
            <div className="bg-slate-50 p-5 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              
              <button
                id="quickmodal-confirm-btn"
                onClick={executeQuickStockAdjust}
                className={`w-full sm:flex-1 text-white font-black py-5 px-6 rounded-2xl text-xl md:text-2xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-3 ${
                  quickActionType === 'in' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-8 h-8" />
                <span>ثبت نهایی تراکنش انبار</span>
              </button>

              <button
                id="quickmodal-cancel-btn"
                onClick={() => { triggerBeep('click'); setQuickAdjustItem(null); }}
                className="w-full sm:w-auto bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-5 px-8 rounded-2xl text-lg cursor-pointer"
              >
                انصراف
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Elegant minimalist bottom brand logo */}
      <footer className="w-full text-center mt-12 mb-6">
        <p className="text-slate-400 font-bold text-md tracking-wider flex items-center justify-center gap-2">
          <span>انبار آذرشمس</span>
          <span>•</span>
          <span>نسخه ساده ویژه تبلت و موبایل اندروید</span>
        </p>
      </footer>

    </div>
  );
}
