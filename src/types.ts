/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  buyingPrice: number; // قیمت خرید
  sellingPrice: number; // قیمت فروش
  buyingDate: string; // تاریخ خرید (Solar Hijri format: e.g. "1405/03/26")
  purchaseLocation: string; // محل خرید
  barcode: string; // بارکد محصول
  minStock: number; // حداقل موجودی برای هشدار
  description?: string; // توضیحات اختیاری
}

export interface ActivityLog {
  id: string;
  itemId: string;
  itemName: string;
  type: 'increase' | 'decrease' | 'add' | 'edit' | 'delete';
  quantityChange: number;
  date: string; // تاریخ خورشیدی ثبت (مثلا "1405/03/26")
  timestamp: number; // زمان دقیق (timestamp)
  description: string;
}

export interface DailyReport {
  date: string; // تاریخ مورد گزارش
  totalItemsRegistered: number;
  totalQuantityAdded: number;
  totalBuyingCost: number; // مجموع هزینه خرید امروز
  totalPotentialRevenue: number; // مجموع ارزش فروش امروز
  logs: ActivityLog[];
}

export interface InvoiceItem {
  id: string;
  itemId: string; // reference to original item if available
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // شماره فاکتور (e.g., "F-1405-0001")
  buyerName: string; // خریدار
  buyerPhone?: string; // تلفن خریدار
  buyerAddress?: string; // آدرس خریدار
  buyerNationalId?: string; // شماره ملی / کد اقتصادی خریدار
  sellerName: string; // فروشنده (می‌تواند پیش‌فرض انبار آذرشمس باشد)
  sellerPhone?: string;
  sellerAddress?: string;
  sellerEconomicId?: string;
  date: string; // تاریخ فاکتور (e.g. "1405/03/26")
  timestamp: number;
  items: InvoiceItem[];
  discount: number; // تخفیف (تومان)
  taxRate: number; // درصد مالیات (مثلا ۹ درصد)
  totalAmountBeforeTaxAndDiscount: number;
  taxAmount: number;
  finalPayable: number;
  description?: string;
}

