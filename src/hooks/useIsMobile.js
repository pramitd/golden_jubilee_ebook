import {useEffect, useState} from 'react';
import {COARSE_MAX_WIDTH, MOBILE_MQ} from '../constants.js';

export function detectMobile() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia(MOBILE_MQ).matches) return true;
  const coarse = window.matchMedia('(pointer:coarse)').matches;
  return coarse && window.innerWidth <= COARSE_MAX_WIDTH;
}

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => detectMobile());
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setMobile(detectMobile());
    sync();
    mq.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);
  return mobile;
}
