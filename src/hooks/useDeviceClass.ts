import { useEffect, useState } from 'react';
import {
  applyDeviceClass,
  applyOrientation,
  detectDeviceClass,
  readOrientation,
  type DeviceClass,
} from '../lib/device';

function syncDom(device: DeviceClass) {
  applyDeviceClass(device);
  applyOrientation(readOrientation());
}

/**
 * Keeps `data-device` / `data-orientation` on <html> in sync.
 * Does not flip desktop ↔ phone just because the window was resized.
 */
export function useDeviceClass(): DeviceClass {
  const [device, setDevice] = useState<DeviceClass>(() => {
    const d = detectDeviceClass();
    syncDom(d);
    return d;
  });

  useEffect(() => {
    const refresh = () => {
      const next = detectDeviceClass();
      setDevice((prev) => (prev === next ? prev : next));
      syncDom(next);
    };

    refresh();
    window.addEventListener('orientationchange', refresh);
    // Resize only re-reads orientation for tablets; device class from screen/UA.
    const onResize = () => applyOrientation(readOrientation());
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('orientationchange', refresh);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return device;
}

/** True when the fixed MobileDock should be shown. */
export function useNeedsMobileDock(device: DeviceClass): boolean {
  const [portrait, setPortrait] = useState(
    () => readOrientation() === 'portrait',
  );

  useEffect(() => {
    const update = () => setPortrait(readOrientation() === 'portrait');
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (device === 'phone') return true;
  if (device === 'tablet' && portrait) return true;
  return false;
}
