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
