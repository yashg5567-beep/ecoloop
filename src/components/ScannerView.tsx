import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  AlertTriangle,
  FlaskConical,
  Search,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { WasteScanResult } from '../types/waste';
import { analyzeWasteWithGemini } from '../services/geminiService';
import { DEMO_SCAN_ITEMS } from '../services/demoData';

interface ScannerViewProps {
  demoMode: boolean;
  onEnableDemoMode: () => void;
  onScanComplete: (
    result: WasteScanResult,
    inputType: 'image' | 'text' | 'demo',
    isDemo: boolean
  ) => void;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ScannerView: React.FC<ScannerViewProps> = ({
  demoMode,
  onEnableDemoMode,
  onScanComplete,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [itemNameInput, setItemNameInput] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Camera state
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [previewUrl, cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    setValidationError(null);
    setCameraModalOpen(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Camera access is not supported in this browser environment. Please upload a photo file or type the item name below.'
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        'Camera permission was denied or no camera was found. You can upload an image file (JPEG, PNG, WebP) or type the item name below.'
      );
    }
  };

  useEffect(() => {
    if (cameraModalOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraModalOpen, cameraStream]);

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64Part = dataUrl.split(',')[1];

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(dataUrl);
    setImageBase64(base64Part);
    setImageMimeType('image/jpeg');
    setFileName('camera-capture.jpg');
    setValidationError(null);
    setApiError(null);
    stopCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    setApiError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size === 0) {
      setValidationError(
        'That file looks empty (0 bytes). Pick a valid JPEG, PNG, or WebP photo.'
      );
      e.target.value = '';
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setValidationError(
        `Unsupported file format (${
          file.type || 'unknown'
        }). Please upload a JPEG, PNG, or WebP image.`
      );
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setValidationError(
        `This photo is ${sizeMb} MB (max is 5 MB). Try a slightly smaller image.`
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      const base64 = resultStr.split(',')[1];
      if (!base64) {
        setValidationError('Could not read the image file. Please try another photo.');
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setImageBase64(base64);
      setImageMimeType(file.type);
      setFileName(file.name);
    };
    reader.onerror = () => {
      setValidationError('Failed to read the selected file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageBase64(null);
    setImageMimeType(null);
    setFileName(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);
    setApiError(null);

    if (!imageBase64 && !itemNameInput.trim()) {
      setValidationError(
        'Drop a photo or type the item name below so we can inspect it.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const inputType: 'image' | 'text' = imageBase64 ? 'image' : 'text';
      const { result } = await analyzeWasteWithGemini({
        imageBase64: imageBase64 || undefined,
        mimeType: imageMimeType || undefined,
        itemName: itemNameInput.trim() || undefined,
      });

      // Discard in-memory image buffer immediately after analysis completes
      handleRemoveImage();
      setItemNameInput('');

      onScanComplete(result, inputType, false);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'AI analysis failed. Please retry or click "Try demo mode" below.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoItem = (key: string) => {
    const sample = DEMO_SCAN_ITEMS[key];
    if (!sample) return;
    handleRemoveImage();
    onScanComplete(sample, 'demo', true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#10B981] dark:text-[#C6F432] flex items-center gap-2">
          <span>📸 AI Waste &amp; E-Waste Scanner</span>
          <span aria-hidden="true">·</span>
          <span>Safety-First Verdict</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-black text-stone-950 dark:text-white">
          Got mystery trash? Let&apos;s scan it.
        </h1>
        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300">
          Snap a photo (JPEG, PNG, WebP up to 5 MB) or type what you&apos;ve got. Your photo stays
          in memory only and gets wiped right after the scan.
        </p>
      </div>

      {/* Main Scanner Form Card */}
      <form
        onSubmit={handleAnalyze}
        className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-8 space-y-6 shadow-sm"
      >
        {/* Image Upload / Preview Zone */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
              1. Snap or Upload a Pic (Optional if typing below)
            </label>
            <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
              JPEG · PNG · WebP · Max 5 MB
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="waste-image-input"
          />

          {!previewUrl ? (
            <div className="border-2 border-dashed border-stone-300 dark:border-emerald-800 rounded-[24px] p-7 sm:p-9 bg-[#F7F8F5] dark:bg-[#0F1A14]/60 text-center space-y-4">
              <div className="w-14 h-14 rounded-[20px] bg-[#22C55E]/15 text-[#10B981] dark:text-[#C6F432] flex items-center justify-center mx-auto text-2xl">
                📸
              </div>
              <div className="space-y-1">
                <p className="text-base font-display font-extrabold text-stone-950 dark:text-white">
                  Drop your waste or e-waste photo here
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Text inside images is treated as untrusted data and can never override safety
                  checks.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-sm font-display font-extrabold flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Choose Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-white dark:bg-emerald-950 hover:bg-stone-100 dark:hover:bg-emerald-900 text-stone-900 dark:text-white border border-stone-300 dark:border-emerald-800 text-sm font-display font-bold flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Camera className="w-4 h-4 text-[#10B981] dark:text-[#C6F432]" />
                  <span>Open Camera</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-stone-200 dark:border-emerald-800 rounded-[24px] p-4 bg-[#F7F8F5] dark:bg-[#0F1A14]/70 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Image Preview with Playful Sweeping Scan Laser when Analyzing */}
                <div className="relative w-full sm:w-56 h-56 rounded-[20px] overflow-hidden border border-stone-200 dark:border-emerald-800 bg-black shrink-0">
                  <img
                    src={previewUrl}
                    alt="Selected waste item preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {isLoading && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-emerald-950/35 pointer-events-none"
                    >
                      <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-[#C6F432] to-transparent shadow-[0_0_16px_#C6F432] animate-scan-sweep" />
                      <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-[11px] font-mono text-[#C6F432] text-center">
                        SCANNING MATERIALS &amp; HAZARDS...
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 text-left w-full">
                  <div>
                    <div className="text-xs font-mono text-[#10B981] dark:text-[#C6F432] uppercase font-bold">
                      Ready to inspect
                    </div>
                    <div className="text-base font-display font-extrabold text-stone-950 dark:text-white truncate">
                      {fileName || 'Captured photo'}
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Held in volatile browser memory only—automatically wiped right after the scan
                    finishes.
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-emerald-950 hover:bg-stone-100 border border-stone-300 dark:border-emerald-800 text-xs font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Swap Photo</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleRemoveImage}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-emerald-950 hover:bg-red-50 border border-stone-300 dark:border-emerald-800 text-xs font-bold text-[#FF6B5E] flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Typed Item Fallback / Additional Context */}
        <div className="space-y-2 pt-2 border-t border-stone-200/80 dark:border-emerald-900/60">
          <label
            htmlFor="item-name-input"
            className="block text-sm font-display font-extrabold text-stone-950 dark:text-white"
          >
            2. Or Type the Item Name (No Camera? No Problem)
          </label>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Try typing: “swollen power bank”, “broken electric kettle”, “pizza box”, “old charger”.
          </p>
          <div className="relative">
            <input
              id="item-name-input"
              type="text"
              maxLength={140}
              value={itemNameInput}
              onChange={(e) => setItemNameInput(e.target.value)}
              placeholder="e.g., Swollen lithium-ion power bank, clear PET water bottle, old motherboard..."
              className="w-full min-h-[50px] pl-10 pr-4 py-2.5 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-2 focus:outline-[#22C55E]"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Skeleton Loader Preview while Analyzing */}
        {isLoading && (
          <div className="p-5 rounded-[24px] bg-stone-100/80 dark:bg-emerald-950/50 border border-stone-200 dark:border-emerald-800/80 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-emerald-500/30 rounded-lg" />
              <div className="h-4 w-24 bg-stone-300 dark:bg-emerald-800 rounded-lg" />
            </div>
            <div className="h-6 w-3/4 bg-stone-300 dark:bg-emerald-800 rounded-xl" />
            <div className="h-16 w-full bg-stone-200 dark:bg-emerald-900/60 rounded-2xl" />
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div
            role="alert"
            className="p-4 rounded-[22px] bg-[#FFD84D]/25 border border-amber-400 text-stone-950 dark:text-white text-sm flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-[#FFD84D] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-display font-bold">Hold up—quick check</div>
              <p className="text-xs sm:text-sm">{validationError}</p>
            </div>
          </div>
        )}

        {/* API / Quota Error Banner with Retry & Try Demo Mode Button */}
        {apiError && (
          <div
            role="alert"
            className="p-5 rounded-[24px] bg-[#FF6B5E]/15 border-2 border-[#FF6B5E] text-stone-950 dark:text-white space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#FF6B5E] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-display font-extrabold">
                  Live AI Scanner Couldn&apos;t Connect
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">{apiError}</p>
                <p className="text-xs opacity-80">
                  We never fake AI results behind your back. Retry below or tap &quot;Try demo
                  mode&quot; to test with verified sample scans.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={isLoading}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-emerald-950 text-stone-900 dark:text-white border border-stone-300 dark:border-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Live Scan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onEnableDemoMode();
                  handleSelectDemoItem('battery_pack');
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#FFD84D] hover:bg-amber-300 text-[#0F1A14] text-xs font-extrabold flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Try demo mode</span>
              </button>
            </div>
          </div>
        )}

        {/* Submit CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10B981] dark:text-[#C6F432] shrink-0" />
            <span>
              Material % are labeled approximate estimates; battery hazards come first.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="min-h-[52px] px-8 py-3 rounded-[22px] bg-[#22C55E] hover:bg-[#10B981] disabled:opacity-60 text-[#0F1A14] font-display font-black text-base flex items-center justify-center gap-2.5 transition-transform active:scale-95 whitespace-nowrap shrink-0 shadow-md shadow-[#22C55E]/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Scanning Item...</span>
              </>
            ) : (
              <span>Run Circularity Scan ⚡</span>
            )}
          </button>
        </div>
      </form>

      {/* Instant Sample Scans Section */}
      <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
              ⚡ Instant Sample Scans (Labeled Demo Data)
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Tap any card to test the swipeable verdict deck, hazard alerts, and calculators:
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-800 dark:text-[#FFD84D]">
            Demo data
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => handleSelectDemoItem('battery_pack')}
            className="min-h-[64px] p-4 rounded-[22px] border border-stone-200 dark:border-emerald-800/80 hover:border-[#FF6B5E] bg-[#F7F8F5] dark:bg-[#0F1A14]/60 text-left transition-all active:scale-[0.99] space-y-1"
          >
            <div className="text-xs text-[#FF6B5E] font-mono font-bold">
              🔋 Demo data · Battery (High Hazard)
            </div>
            <div className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
              Swollen Lithium-Ion Power Bank
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Triggers critical red/coral thermal runaway warning &amp; safe isolation guide.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectDemoItem('ewaste_board')}
            className="min-h-[64px] p-4 rounded-[22px] border border-stone-200 dark:border-emerald-800/80 hover:border-[#10B981] bg-[#F7F8F5] dark:bg-[#0F1A14]/60 text-left transition-all active:scale-[0.99] space-y-1"
          >
            <div className="text-xs text-[#10B981] dark:text-[#C6F432] font-mono font-bold">
              💻 Demo data · E-Waste Component
            </div>
            <div className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
              Desktop Motherboard &amp; Cooling Fan
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Shows modular fan salvage vs. formal PCB metal recovery &amp; coin-cell precaution.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectDemoItem('pet_bottle')}
            className="min-h-[64px] p-4 rounded-[22px] border border-stone-200 dark:border-emerald-800/80 hover:border-[#10B981] bg-[#F7F8F5] dark:bg-[#0F1A14]/60 text-left transition-all active:scale-[0.99] space-y-1"
          >
            <div className="text-xs text-[#10B981] dark:text-[#C6F432] font-mono font-bold">
              ♻️ Demo data · Rigid Plastic (PET #1)
            </div>
            <div className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
              Clear PET Beverage Bottle (1 Liter)
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              High-recyclability prep steps + 5-minute DIY balcony drip-planter hack.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectDemoItem('cardboard_box')}
            className="min-h-[64px] p-4 rounded-[22px] border border-stone-200 dark:border-emerald-800/80 hover:border-[#3B82F6] bg-[#F7F8F5] dark:bg-[#0F1A14]/60 text-left transition-all active:scale-[0.99] space-y-1"
          >
            <div className="text-xs text-blue-600 dark:text-sky-400 font-mono font-bold">
              📦 Demo data · Paper &amp; Cardboard
            </div>
            <div className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
              Corrugated Cardboard Shipping Box
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Prioritizes direct storage/shipping reuse before dry fiber recycling.
            </p>
          </button>
        </div>
      </section>

      {/* Camera Capture Modal */}
      {cameraModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-modal-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-[#14241B] border border-stone-200 dark:border-emerald-800 rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="camera-modal-title"
                className="text-lg font-display font-extrabold text-stone-950 dark:text-white"
              >
                📸 Snap Waste Item Photo
              </h3>
              <button
                type="button"
                onClick={stopCamera}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-stone-100 dark:bg-emerald-950 flex items-center justify-center text-stone-700 dark:text-stone-200"
                aria-label="Close camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300">
              Camera access is used only to capture a single frame for waste analysis. It is never
              saved on any server.
            </p>

            {cameraError ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-2">
                <p className="font-bold">Camera Unavailable</p>
                <p>{cameraError}</p>
              </div>
            ) : (
              <div className="rounded-[22px] overflow-hidden bg-stone-900 aspect-4/3 flex items-center justify-center relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={stopCamera}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-100 dark:bg-emerald-950 text-stone-800 dark:text-stone-200 text-sm font-bold"
              >
                Cancel
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-sm font-display font-extrabold flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
