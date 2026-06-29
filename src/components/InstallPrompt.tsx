import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|chrome/i.test(navigator.userAgent);

    if (ios && isSafari) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem('pwa-dismissed', String(Date.now()));
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-white rounded-2xl shadow-lg border border-stone-100 p-4 flex items-start gap-3">
      <div className="text-2xl shrink-0 mt-0.5">✿</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-800">Add to Home Screen</p>
        {isIOS ? (
          <p className="text-xs text-stone-500 mt-0.5">
            Tap the <span className="font-medium text-stone-700">Share</span> button in Safari, then select{' '}
            <span className="font-medium text-stone-700">Add to Home Screen</span>.
          </p>
        ) : (
          <p className="text-xs text-stone-500 mt-0.5">
            Install Succseed for quick access, just like a native app.
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {!isIOS && (
          <button
            onClick={install}
            className="text-xs bg-leaf-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-leaf-700 transition-colors"
          >
            Install
          </button>
        )}
        <button onClick={dismiss} className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1">
          Dismiss
        </button>
      </div>
    </div>
  );
}
