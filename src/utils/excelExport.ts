/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { InventoryItem, ActivityLog } from '../types';

/**
 * Exports current inventory list to an Excel (.xlsx) file with beautiful Persian columns.
 */
export function exportInventoryToExcel(items: InventoryItem[], filename = 'موجودی-انبار-آذرشمس.xlsx') {
  const data = items.map((item, index) => {
    const totalBuying = item.quantity * item.buyingPrice;
    const totalSelling = item.quantity * item.sellingPrice;
    const unitProfit = item.sellingPrice - item.buyingPrice;
    const totalProfit = item.quantity * unitProfit;
    
    return {
      'ردیف': index + 1,
      'نام جنس': item.name,
      'تعداد موجودی': item.quantity,
      'قیمت خرید (تومان)': item.buyingPrice,
      'مجموع سرمایه خرید (تومان)': totalBuying,
      'قیمت فروش (تومان)': item.sellingPrice,
      'مجموع ارزش فروش (تومان)': totalSelling,
      'سود کل متصور (تومان)': totalProfit,
      'تاریخ آخرین خرید': item.buyingDate,
      'محل خرید': item.purchaseLocation,
      'کد بارکد': item.barcode || 'پوچ / ندارد'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Custom columns width to make Excel readable immediately
  worksheet['!cols'] = [
    { wch: 6 },  // ردیف
    { wch: 25 }, // نام جنس
    { wch: 15 }, // تعداد موجودی
    { wch: 18 }, // قیمت خرید
    { wch: 22 }, // مجموع سرمایه خرید
    { wch: 18 }, // قیمت فروش
    { wch: 22 }, // مجموع ارزش فروش
    { wch: 20 }, // سود کل متصور
    { wch: 16 }, // تاریخ آخرین خرید
    { wch: 20 }, // محل خرید
    { wch: 20 }  // کد بارکد
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'موجودی کل انبار');
  
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports daily activity logs and audit trail to Excel file.
 */
export function exportLogsToExcel(logs: ActivityLog[], selectedDate: string, filename = `گزارش-فعالیت-روزارنه-انبار-${selectedDate.replace(/\//g, '-')}.xlsx`) {
  const data = logs.map((log, index) => {
    let actionTypePersian = '';
    switch (log.type) {
      case 'add': actionTypePersian = 'ثبت کالای جدید'; break;
      case 'increase': actionTypePersian = 'افزایش موجودی / خرید'; break;
      case 'decrease': actionTypePersian = 'کاهش موجودی / فروش یا خروج'; break;
      case 'edit': actionTypePersian = 'ویرایش مشخصات'; break;
      case 'delete': actionTypePersian = 'حذف کالا'; break;
    }

    return {
      'ردیف': index + 1,
      'تاریخ خورشیدی': log.date,
      'نام جنس': log.itemName,
      'نوع عملیات': actionTypePersian,
      'تغییر تعداد': log.quantityChange === 0 ? '-' : log.quantityChange,
      'توضیحات و جزئیات': log.description
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  worksheet['!cols'] = [
    { wch: 6 },  // ردیف
    { wch: 15 }, // تاریخ
    { wch: 25 }, // نام جنس
    { wch: 20 }, // نوع عملیات
    { wch: 12 }, // تغییر تعداد
    { wch: 35 }  // توضیحات
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'تغییرات روزانه');
  
  XLSX.writeFile(workbook, filename);
}
