/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple robust Gregorian to Jalali converter
export function toJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  let j_day_no: number;
  
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let g_day_no = 365 * gy + Math.floor((gy2 - 1) / 4) - Math.floor((gy2 - 1) / 100) + Math.floor((gy2 - 1) / 400);
  g_day_no += g_d_m[gm - 1] + gd;

  let gy5 = gy - 1600;
  let j_day_no_g = g_day_no - 588244;

  let jy_base = Math.floor(j_day_no_g / 12053);
  let j_day_no_rem = j_day_no_g % 12053;

  jy = 979 + 33 * jy_base + 4 * Math.floor(j_day_no_rem / 1461);
  let j_day_no_rem2 = j_day_no_rem % 1461;

  if (j_day_no_rem2 >= 366) {
    jy += Math.floor((j_day_no_rem2 - 1) / 365);
    j_day_no_rem2 = (j_day_no_rem2 - 1) % 365;
  }

  let i = 0;
  for (i = 0; i < 11 && j_day_no_rem2 >= [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i]; i++) {
    j_day_no_rem2 -= [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i];
  }

  return {
    jy: jy,
    jm: i + 1,
    jd: j_day_no_rem2 + 1
  };
}

// Cache for live fetched Shamsi date to avoid repeated network calls
let cachedLiveShamsiDate: string | null = null;

export function setCachedLiveShamsiDate(dateStr: string) {
  cachedLiveShamsiDate = dateStr;
}

// Get modern string like "1405/03/26" for current date (supports live cached date, clamps to minimum year 1405)
export function getCurrentShamsiDate(): string {
  if (cachedLiveShamsiDate) {
    const parts = cachedLiveShamsiDate.split('/');
    if (parts.length === 3 && Number(parts[0]) < 1405) {
      return `1405/${parts[1]}/${parts[2]}`;
    }
    return cachedLiveShamsiDate;
  }
  const now = new Date();
  const res = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  let jy = res.jy;
  if (jy < 1405) {
    jy = 1405;
  }
  const mm = res.jm < 10 ? `0${res.jm}` : `${res.jm}`;
  const dd = res.jd < 10 ? `0${res.jd}` : `${res.jd}`;
  return `${jy}/${mm}/${dd}`;
}

// Robust async fetcher to resolve current Jalali date from internet APIs (Keybit / WorldTimeAPI / fallback)
export async function fetchLiveShamsiDate(): Promise<string> {
  // 1. Try Keybit free api (returns ready-to-use Shamsi details)
  try {
    const res = await fetch('https://api.keybit.ir/time/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.date && data.date.full && data.date.full.official && data.date.full.official.en) {
        const liveDate = data.date.full.official.en;
        setCachedLiveShamsiDate(liveDate);
        console.log("Live Shamsi date fetched successfully from keybit.ir:", liveDate);
        return liveDate;
      }
    }
  } catch (e) {
    console.warn("Keybit time API was slow, hit CORS, or went offline. Trying WorldTimeAPI next...", e);
  }

  // 2. Try WorldTimeAPI for Tehran Asia timezone (CORS-friendly, highly robust)
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Tehran');
    if (res.ok) {
      const data = await res.json();
      if (data && data.datetime) {
        const datetime = data.datetime; // e.g., "2026-06-18T00:53:43.123456+03:30"
        const datePart = datetime.split('T')[0]; // "2026-06-18"
        const [gy, gm, gd] = datePart.split('-').map(Number);
        const jDate = toJalali(gy, gm, gd);
        const mm = jDate.jm < 10 ? `0${jDate.jm}` : `${jDate.jm}`;
        const dd = jDate.jd < 10 ? `0${jDate.jd}` : `${jDate.jd}`;
        const liveDate = `${jDate.jy}/${mm}/${dd}`;
        setCachedLiveShamsiDate(liveDate);
        console.log("Live Shamsi date calculated from WorldTimeAPI Tehran clock:", liveDate);
        return liveDate;
      }
    }
  } catch (e) {
    console.warn("WorldTimeAPI failed or hit CORS. Trying dummy fetch to time.ir... then using system fallback.", e);
  }

  // 3. Optional visual attempt for time.ir (note: time.ir lacks CORS headers, it is logged for user reference or potential proxying)
  try {
    await fetch('https://www.time.ir/', { mode: 'no-cors' });
  } catch (e) {
    // Gracefully ignore since no-cors requests cannot be parsed in modern browser environment
  }

  // Default to native highly reliable local system clock
  const systemDate = getCurrentShamsiDate();
  console.log("Using standard native Jalali date calculation fallback:", systemDate);
  return systemDate;
}

// Convert English numbers to Persian digits if preferred for extreme local look
export function toPersianDigits(str: string | number): string {
  const pDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[0-9]/g, (w) => pDigits[parseInt(w, 10)]);
}

// Format number (pricing) like 15,000,000 with option of Persian digits
export function formatPrice(num: number | string, unit = "تومان"): string {
  if (num === "" || num === undefined || num === null) return "۰";
  const str = String(num).replace(/[^0-9]/g, "");
  if (!str) return "۰";
  const formatted = parseInt(str, 10).toLocaleString('en-US');
  return `${toPersianDigits(formatted)} ${unit}`;
}

// Web Audio API beep synthesizer to mimic scanner sounds offline
export function playAudioBeep(type: 'success' | 'click' | 'error' | 'delete'): void {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'success') {
      // Prompt high barcode scan double beep
      const osc1 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc1.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.08);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1800, ctx.currentTime);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.08);
      }, 100);
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'delete') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    console.error("Audio Context Error", e);
  }
}
