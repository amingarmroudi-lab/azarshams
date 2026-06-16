/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, XCircle, AlertCircle } from 'lucide-react';
import { playAudioBeep, toPersianDigits } from '../utils/dateUtils';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScanSuccess, onClose }: BarcodeScannerProps) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const regionId = "azarshams-scanner-region";

  // Request cameras list on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment') ||
            device.label.toLowerCase().includes('عقب')
          );
          setActiveCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setErrorMsg("هیچ دوربینی روی دستگاه شما پیدا نشد. لطفاً از تایپ دستی استفاده کنید.");
        }
      })
      .catch((err) => {
        console.error("خطا در دریافت دوربین‌ها", err);
        setErrorMsg("مجوز دسترسی به دوربین داده نشد. برای اسکنر، باید اجازه استفاده از دوربین را بدهید.");
      });

    return () => {
      // Clean up on unmount
      cleanupScanner();
    };
  }, []);

  // Handle active camera change or starting scan
  useEffect(() => {
    if (activeCameraId && !isScanning && !errorMsg) {
      startScanner(activeCameraId);
    }
  }, [activeCameraId, isScanning, errorMsg]);

  const cleanupScanner = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
    }
    qrCodeInstanceRef.current = null;
    setIsScanning(false);
  };

  const startScanner = async (cameraId: string) => {
    await cleanupScanner();
    
    try {
      const html5QrCode = new Html5Qrcode(regionId);
      qrCodeInstanceRef.current = html5QrCode;
      setIsScanning(true);
      setErrorMsg("");

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            // Appropriate square for barcode scanning (wide rectangle or square)
            const minSize = Math.min(width, height);
            const size = Math.floor(minSize * 0.7);
            return { width: size, height: Math.floor(size * 0.6) }; // wide rectangle is great for barcodes
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          playAudioBeep('success');
          onScanSuccess(decodedText);
          cleanupScanner().then(() => {
            onClose();
          });
        },
        () => {
          // Failure callback is too noisy, ignore it
        }
      );
    } catch (err: any) {
      console.error("شروع اسکنر با خطا مواجه شد", err);
      setErrorMsg("خطا در راه اندازی دوربین. ممکن است برنامه‌ای دیگر در حال استفاده از دوربین باشد.");
      setIsScanning(false);
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCameraId(cameras[nextIndex].id);
  };

  return (
    <div id="scanner-modal" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-4 font-sans text-white">
      <div className="w-full max-w-md bg-slate-900 border-2 border-sky-500 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-sky-950 p-5 flex items-center justify-between border-b border-sky-900">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-sky-400" />
            <span className="text-xl md:text-2xl font-bold">اسکن بارکد کالا</span>
          </div>
          <button 
            id="close-scanner-header-btn"
            onClick={() => { playAudioBeep('click'); onClose(); }}
            className="p-1 rounded-full hover:bg-slate-800 transition active:scale-90"
          >
            <XCircle className="w-9 h-9 text-rose-400" />
          </button>
        </div>

        {/* Content Viewport */}
        <div className="relative p-6 flex-1 flex flex-col items-center justify-center min-h-[300px] bg-slate-950">
          {errorMsg ? (
            <div className="text-center p-6 space-y-4">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
              <p className="text-lg font-medium text-amber-300 leading-relaxed">{errorMsg}</p>
              <div className="pt-2 text-sm text-slate-400">
                می‌توانید به راحتی بارکد را با دکمه‌های بزرگ تایپ کنید.
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center">
              {/* Target guidelines */}
              <div className="absolute inset-0 border-2 border-dashed border-sky-400/20 pointer-events-none rounded-xl m-8 flex items-center justify-center">
                <div className="w-[70%] h-[40%] rounded-lg border-4 border-sky-400/80 bg-transparent flex items-center justify-center">
                  <span className="text-xs bg-sky-950/80 text-sky-300 px-3 py-1.5 rounded-full font-bold">
                    بارکد را در این کادر قرار دهید
                  </span>
                </div>
              </div>
              
              {/* html5-qrcode renderer element */}
              <div 
                id={regionId} 
                className="w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden bg-black"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-900 p-5 flex flex-col gap-4 border-t border-slate-800">
          {cameras.length > 1 && !errorMsg && (
            <button
              id="switch-camera-btn"
              onClick={() => { playAudioBeep('click'); switchCamera(); }}
              className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-400 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-lg border border-sky-900/40"
            >
              <RefreshCw className="w-6 h-6" />
              <span>تغییر دوربین ({toPersianDigits(cameras.length)} دوربین یافت شد)</span>
            </button>
          )}

          <button
            id="cancel-scanner-footer-btn"
            onClick={() => { playAudioBeep('click'); onClose(); }}
            className="w-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold py-5 px-6 rounded-2xl text-xl transition-all shadow-lg flex items-center justify-center"
          >
            <span>بستن اسکنر</span>
          </button>
        </div>
      </div>
    </div>
  );
}
