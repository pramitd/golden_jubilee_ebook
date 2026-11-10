import {useCallback, useEffect, useState} from 'react';

function getFsElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export async function requestFs(el) {
  if (!el) throw new Error('no element');
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (!req) throw new Error('unsupported');
  return req.call(el);
}

export async function exitFs() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (exit) return exit.call(document);
}

export function useFullscreen(targetRef) {
  const [nativeFs, setNativeFs] = useState(false);

  useEffect(() => {
    const sync = () => {
      const active = getFsElement();
      setNativeFs(!!targetRef?.current && active === targetRef.current);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, [targetRef]);

  const enter = useCallback(async () => {
    if (!targetRef?.current) throw new Error('no element');
    await requestFs(targetRef.current);
  }, [targetRef]);

  const exit = useCallback(async () => {
    await exitFs();
  }, []);

  const toggle = useCallback(async () => {
    if (nativeFs) await exit();
    else await enter();
  }, [nativeFs, enter, exit]);

  return {nativeFs, enter, exit, toggle};
}
