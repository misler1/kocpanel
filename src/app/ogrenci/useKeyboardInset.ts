'use client';

import { useEffect, useState } from 'react';

/**
 * Telefonda klavye açıldığında alttan açılan pencerenin klavyenin altında kalmaması için:
 * klavyenin kapladığı yükseklik (alt boşluk) ve görünen alanın yüksekliği döner.
 */
export function useKeyboardInset() {
  const [state, setState] = useState<{ inset: number; height: number | null }>({ inset: 0, height: null });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setState({ inset, height: Math.round(vv.height) });
      // Odaktaki kutu görünür kalsın
      const el = document.activeElement as HTMLElement | null;
      if (inset > 0 && el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        requestAnimationFrame(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      }
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return state;
}
