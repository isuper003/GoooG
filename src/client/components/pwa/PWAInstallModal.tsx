import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isIOS: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
}

export default function PWAInstallModal({
  isOpen,
  onClose,
  onInstall,
  isIOS,
  isInstallable,
  isInstalled,
}: PWAInstallModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Dialog Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md rounded-2xl bg-[#090d14] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] p-6 z-10 flex flex-col gap-5 overflow-hidden"
          >
            {/* Header Ambient Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative w-12 h-12 rounded-xl bg-[#04060a] border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-500/10 overflow-hidden">
                  <img src="/icon.svg" alt="GoooG Logo" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white tracking-tight">
                    تثبيت تطبيق GoooG
                  </h3>
                  <p className="text-xs text-white/50 font-mono">Progressive Web App</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            {isInstalled ? (
              <div className="py-4 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl">
                  ✓
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-white">التطبيق مثبت بالفعل!</h4>
                  <p className="text-xs text-white/60">
                    يمكنك تشغيله مباشرة من شاشتك الرئيسية كتطبيق مستقل بدون متصفح.
                  </p>
                </div>
              </div>
            ) : isIOS ? (
              /* iOS Safari Instructions */
              <div className="space-y-3.5 py-1">
                <p className="text-xs text-white/70 leading-relaxed">
                  على نظام <span className="font-semibold text-cyan-300">iOS (iPhone/iPad)</span>، يمكنك
                  تثبيت التطبيق على الشاشة الرئيسية عبر متصفح Safari بثلاث خطوات بسيطة:
                </p>

                <div className="space-y-2.5 bg-black/40 border border-white/[0.06] rounded-xl p-3.5 text-xs text-white/80">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-white/10 text-cyan-400 font-mono font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>
                      اضغط على زر <strong className="text-white">المشاركة</strong> (
                      <span className="inline-block text-cyan-300 text-sm mx-0.5">⎋ / Share</span>) في شريط سفاري.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-white/10 text-cyan-400 font-mono font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span>
                      مرر للأسفل واختر <strong className="text-white">إضافة إلى الشاشة الرئيسية</strong> (
                      <span className="text-cyan-300 font-mono">+ Add to Home Screen</span>).
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-white/10 text-cyan-400 font-mono font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>
                      اضغط على <strong className="text-white">إضافة (Add)</strong> في أعلى الزاوية.
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-white/40 font-mono">
                  ✨ سيفتح التطبيق بعدها بملء الشاشة وبسرعة فائقة بدون شريط العناوين.
                </p>
              </div>
            ) : isInstallable ? (
              /* Android / Chrome One-Click Install */
              <div className="space-y-4 py-1">
                <p className="text-xs text-white/70 leading-relaxed">
                  احصل على تجربة سلسة وسريعة بدون أشرطة المتصفح، مع إمكانية الوصول الفوري لكل أقسام الموقع واللعبة من شاشتك الرئيسية.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
                    <span className="text-base">🚀</span>
                    <span className="text-white/80 font-medium">تشغيل فوري</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
                    <span className="text-base">📱</span>
                    <span className="text-white/80 font-medium">ملء الشاشة</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onInstall();
                    onClose();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <span>📲</span>
                  <span>تثبيت التطبيق الآن</span>
                </button>
              </div>
            ) : (
              /* Fallback for other browsers */
              <div className="space-y-3 py-2 text-xs text-white/70">
                <p>
                  لتثبيت التطبيق يدوياً من متصفحك الحالي:
                </p>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1.5 font-mono text-[11px] text-white/80">
                  <div>1. افتح قائمة خيارات المتصفح (⋮ أو ⚙️).</div>
                  <div>2. اختر <strong>"تثبيت التطبيق"</strong> أو <strong>"Install app"</strong> أو <strong>"Add to Home Screen"</strong>.</div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-white/40">
              <span>GoooG Studio Engine</span>
              <button
                type="button"
                onClick={onClose}
                className="hover:text-white/80 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
