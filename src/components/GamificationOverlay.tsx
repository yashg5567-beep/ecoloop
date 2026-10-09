import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Download,
  Share2,
  Check,
  ShieldCheck,
  Sparkles,
  Flame,
} from 'lucide-react';

/**
 * Animated count-up hook that respects prefers-reduced-motion.
 */
export function useCountUp(target: number, durationMs = 280): number {
  const [displayVal, setDisplayVal] = useState<number>(target);
  const prevTargetRef = useRef<number>(target);

  useEffect(() => {
    const startVal = prevTargetRef.current;
    prevTargetRef.current = target;

    if (startVal === target) {
      setDisplayVal(target);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplayVal(target);
      return;
    }

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * eased);
      setDisplayVal(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return displayVal;
}

/**
 * Short, celebratory confetti burst when an action is marked completed.
 * Automatically disabled if user prefers-reduced-motion.
 */
export const ConfettiBurst: React.FC<{ triggerKey: number }> = ({ triggerKey }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState<boolean>(false);

  useEffect(() => {
    if (!triggerKey) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    setActive(true);
    const timer = setTimeout(() => setActive(false), 1600);
    return () => clearTimeout(timer);
  }, [triggerKey]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#C6F432', '#10B981', '#22C55E', '#FFD84D', '#FF6B5E', '#38BDF8'];
    const particles = Array.from({ length: 55 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 180,
      y: canvas.height * 0.55,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 5,
      size: Math.random() * 7 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.25,
    }));

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.42; // gravity
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      });
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
};

/**
 * 3-Screen Swipeable & Skippable Onboarding ("Scan it", "Sort it", "Earn it")
 */
export const OnboardingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (!isOpen) return null;

  const slides = [
    {
      stepLabel: '01 / 03 · SCAN IT',
      emoji: '📸',
      accentBg: 'from-[#10B981] to-[#059669]',
      badgeText: 'Zero Stored Photos',
      title: 'Scan it. Spot hazards in a blink.',
      description:
        'Snap a photo of any mystery trash, tangled cable, or swollen battery—or just type its name. We flag spicy lithium-ion hazards first and break down approximate materials honestly.',
    },
    {
      stepLabel: '02 / 03 · SORT IT',
      emoji: '♻️',
      accentBg: 'from-[#3B82F6] to-[#1D4ED8]',
      badgeText: 'Repair · Reuse · Recycle',
      title: 'Sort it. Find its best next life.',
      description:
        'Get a clear verdict: DIY reuse hacks, safe repair steps, or verified OpenStreetMap drop-off spots near you—without ever sending your location to the AI.',
    },
    {
      stepLabel: '03 / 03 · EARN IT',
      emoji: '⚡',
      accentBg: 'from-[#0F1A14] to-[#143323]',
      badgeText: 'Wrapped-Style Impact',
      title: 'Earn it. Flex your Circularity Wrapped.',
      description:
        'Mark real actions done to stack EcoPoints, close your daily ring, unlock badges like Battery Guardian & Plastic Slayer, and share your 9:16 Impact Story.',
    },
  ];

  const current = slides[step];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX < -45 && step < slides.length - 1) {
      setStep(step + 1);
    } else if (deltaX > 45 && step > 0) {
      setStep(step - 1);
    }
    setTouchStartX(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="bg-[#F7F8F5] dark:bg-[#13221A] border border-stone-200 dark:border-emerald-900/80 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl transition-transform duration-200"
      >
        {/* Top Visual Banner */}
        <div
          className={`bg-gradient-to-br ${current.accentBg} p-7 text-white relative flex flex-col justify-between min-h-[210px]`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#C6F432]">
              {current.stepLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-3 py-1 rounded-xl bg-black/25 hover:bg-black/40 text-xs font-semibold text-white transition-colors"
            >
              Skip
            </button>
          </div>

          <div className="my-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-[22px] bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-4xl shadow-inner">
              <span role="img" aria-label={current.title}>
                {current.emoji}
              </span>
            </div>
            <div>
              <div className="text-xs font-mono uppercase text-[#FFD84D] font-semibold">
                {current.badgeText}
              </div>
              <div className="text-lg font-display font-extrabold leading-tight mt-0.5">
                Waste Less. Recover More.
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="space-y-2">
            <h2
              id="onboarding-title"
              className="text-2xl font-display font-extrabold text-stone-950 dark:text-white leading-tight"
            >
              {current.title}
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Privacy Assurance Box */}
          <div className="p-3.5 rounded-[20px] bg-emerald-500/10 border border-emerald-500/25 text-xs text-stone-700 dark:text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#C6F432] shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Promise:</strong> Photos are analyzed in memory and immediately
              discarded. Your location is only used with permission for OpenStreetMap and never sent
              to the AI.
            </span>
          </div>

          {/* Step Indicators & Controls */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setStep(i)}
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    step === i
                      ? 'w-7 bg-[#10B981] dark:bg-[#C6F432]'
                      : 'w-2.5 bg-stone-300 dark:bg-emerald-800'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="min-h-[44px] min-w-[44px] rounded-2xl bg-stone-200/80 dark:bg-emerald-900/60 text-stone-800 dark:text-white flex items-center justify-center"
                  aria-label="Previous slide"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {step < slides.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-stone-950 font-bold text-sm flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] text-[#0F1A14] font-extrabold text-sm flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
                >
                  <span>Let&apos;s Roll</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 9:16 Instagram-Story Style Shareable & Downloadable "Impact Card" Modal
 */
export const ImpactStoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  levelName: string;
  totalPoints: number;
  completedCount: number;
  estimatedSavingsKgCO2e: number;
  streakDays: number;
  topBadges: string[];
  demoMode: boolean;
}> = ({
  isOpen,
  onClose,
  levelName,
  totalPoints,
  completedCount,
  estimatedSavingsKgCO2e,
  streakDays,
  topBadges,
  demoMode,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyOrShare = async () => {
    const text =
      `🌱 MY ECONOM WRAPPED ${demoMode ? '(DEMO DATA)' : ''}\n` +
      `⚡ Rank: ${levelName} (${totalPoints} EcoPoints)\n` +
      `♻️ Items Sorted & Verified: ${completedCount}\n` +
      `🌍 Est. Potential Savings: ~${estimatedSavingsKgCO2e.toFixed(2)} kg CO2e (not measured)\n` +
      `🔥 Streak: ${streakDays}d\n` +
      `Waste Less. Recover More. #Econom`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Econom Impact Card', text });
        return;
      } catch {
        // fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleDownloadStoryPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient (#0F1A14 -> #0c2e1f)
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, '#0F1A14');
    grad.addColorStop(0.55, '#132A1E');
    grad.addColorStop(1, '#09140E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative Lime Glow Circle
    ctx.fillStyle = 'rgba(198, 244, 50, 0.12)';
    ctx.beginPath();
    ctx.arc(880, 320, 360, 0, Math.PI * 2);
    ctx.fill();

    // Header Tag
    ctx.fillStyle = '#C6F432';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(
      `ECONOM CIRCULARITY WRAPPED ${demoMode ? '· DEMO DATA' : ''}`,
      96,
      160
    );

    // Main Headline
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 88px sans-serif';
    ctx.fillText('Waste Less.', 96, 290);
    ctx.fillStyle = '#22C55E';
    ctx.fillText('Recover More.', 96, 395);

    // Rank Box
    ctx.fillStyle = '#183526';
    ctx.beginPath();
    ctx.roundRect(96, 480, 888, 280, 44);
    ctx.fill();

    ctx.fillStyle = '#A7F3D0';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('CURRENT CIRCULARITY RANK', 150, 560);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 72px sans-serif';
    ctx.fillText(levelName, 150, 655);

    ctx.fillStyle = '#FFD84D';
    ctx.font = 'bold 38px monospace';
    ctx.fillText(`🔥 ${streakDays} DAY STREAK`, 150, 720);

    // Stat Box 1: EcoPoints
    ctx.fillStyle = '#C6F432';
    ctx.beginPath();
    ctx.roundRect(96, 810, 424, 340, 44);
    ctx.fill();

    ctx.fillStyle = '#0F1A14';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('ECOPOINTS EARNED', 140, 895);
    ctx.font = '900 96px monospace';
    ctx.fillText(`${totalPoints}`, 140, 1020);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('In-app recognition only', 140, 1095);

    // Stat Box 2: Items Sorted
    ctx.fillStyle = '#183526';
    ctx.beginPath();
    ctx.roundRect(560, 810, 424, 340, 44);
    ctx.fill();

    ctx.fillStyle = '#A7F3D0';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('VERIFIED LOOPS', 604, 895);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 96px monospace';
    ctx.fillText(`${completedCount}`, 604, 1020);
    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Items sorted & completed', 604, 1095);

    // Stat Box 3: Estimated Impact
    ctx.fillStyle = '#183526';
    ctx.beginPath();
    ctx.roundRect(96, 1200, 888, 330, 44);
    ctx.fill();

    ctx.fillStyle = '#C6F432';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('ESTIMATED POTENTIAL SAVINGS (NOT MEASURED)', 150, 1285);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 92px monospace';
    ctx.fillText(`~${estimatedSavingsKgCO2e.toFixed(2)} kg CO2e`, 150, 1410);

    ctx.fillStyle = '#A7F3D0';
    ctx.font = '26px sans-serif';
    ctx.fillText(
      'Calculated from published reference factors. Regional grid savings vary.',
      150,
      1480
    );

    // Footer
    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('Econom · Smart Waste & E-Waste Circularity Agent', 96, 1780);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `econom-impact-story-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="impact-story-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="max-w-sm w-full space-y-4 my-auto">
        {/* Top Close Row */}
        <div className="flex items-center justify-between text-white px-1">
          <span id="impact-story-title" className="text-sm font-display font-bold">
            9:16 Impact Story Card
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
            aria-label="Close Impact Card"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 9:16 Story Aspect Card */}
        <div className="aspect-[9/16] w-full rounded-[28px] bg-gradient-to-br from-[#0F1A14] via-[#132A1E] to-[#09140E] border-2 border-[#22C55E]/40 p-6 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#C6F432]">
              <span>ECONOM WRAPPED</span>
              {demoMode && (
                <span className="bg-[#FFD84D] text-[#0F1A14] font-bold px-2 py-0.5 rounded-md">
                  DEMO DATA
                </span>
              )}
            </div>
            <h3 className="text-3xl font-display font-black leading-none tracking-tight">
              Waste Less.
              <span className="block text-[#22C55E]">Recover More.</span>
            </h3>
          </div>

          {/* Center Stats */}
          <div className="space-y-3 my-auto py-3 relative z-10">
            <div className="p-4 rounded-[22px] bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
              <div className="text-[10px] font-mono uppercase text-emerald-300">
                CURRENT RANK
              </div>
              <div className="text-2xl font-display font-extrabold text-white">
                {levelName}
              </div>
              <div className="text-xs font-mono text-[#FFD84D] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-[#FFD84D]" />
                <span>{streakDays}d active streak</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-[22px] bg-[#C6F432] text-[#0F1A14] space-y-0.5">
                <div className="text-[10px] font-mono font-bold uppercase">ECOPOINTS</div>
                <div className="text-3xl font-mono font-black tabular-nums">{totalPoints}</div>
                <div className="text-[10px] font-medium opacity-80">In-app reward</div>
              </div>

              <div className="p-4 rounded-[22px] bg-white/10 border border-white/15 space-y-0.5">
                <div className="text-[10px] font-mono uppercase text-emerald-300">
                  ITEMS SORTED
                </div>
                <div className="text-3xl font-mono font-black tabular-nums text-white">
                  {completedCount}
                </div>
                <div className="text-[10px] text-emerald-200">Verified loops</div>
              </div>
            </div>

            <div className="p-4 rounded-[22px] bg-emerald-950/90 border border-emerald-700/70 space-y-1">
              <div className="text-[10px] font-mono uppercase text-[#C6F432]">
                ESTIMATED POTENTIAL SAVINGS
              </div>
              <div className="text-2xl font-mono font-black tabular-nums text-white">
                ~{estimatedSavingsKgCO2e.toFixed(2)} kg CO2e
              </div>
              <div className="text-[10px] text-emerald-300 leading-snug">
                Estimated potential savings (not measured). Regional savings vary.
              </div>
            </div>

            {topBadges.length > 0 && (
              <div className="text-xs text-emerald-200 font-medium">
                Unlocked: <strong className="text-white">{topBadges.join(' · ')}</strong>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-emerald-300/90 flex items-center justify-between pt-2 border-t border-white/10 relative z-10">
            <span>Econom Circularity Agent</span>
            <span>#WasteLessRecoverMore</span>
          </div>
        </div>

        {/* Download / Share Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownloadStoryPng}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] text-[#0F1A14] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download 9:16 PNG</span>
          </button>

          <button
            type="button"
            onClick={handleCopyOrShare}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/20 transition-transform active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-[#C6F432]" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Share Story'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
