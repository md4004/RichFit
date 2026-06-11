/**
 * TACTICAL ANDROID INTEGRATION FRAMEWORK
 * Orchestating native Android WebView / Chrome capabilities for elite fitness compliance.
 */

// Native Wake Lock storage
let wakeLockInstance: any = null;

/**
 * Checks if the current terminal is running on an Android OS device
 */
export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Android Native Vibration (Haptic Feedback) Protocol
 */
export function triggerHaptic(pattern: number | number[] = 15): boolean {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Respect user setting from localStore if disabled
      const hapticMode = localStorage.getItem('android_haptic_mode') || 'TACTICAL';
      if (hapticMode === 'OFF') return false;
      
      const multiplier = hapticMode === 'LITE' ? 0.6 : hapticMode === 'MAX' ? 1.8 : 1.0;
      
      if (Array.isArray(pattern)) {
        const adjustedPattern = pattern.map(val => Math.round(val * multiplier));
        return navigator.vibrate(adjustedPattern);
      } else {
        return navigator.vibrate(Math.round(pattern * multiplier));
      }
    } catch (e) {
      console.warn("Haptic trigger suppressed by OS framework:", e);
    }
  }
  return false;
}

/**
 * Request Screen Wake Lock (Keep screen awake during long gym workout sets)
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (wakeLockInstance) return true;
      wakeLockInstance = await (navigator as any).wakeLock.request('screen');
      console.log('🛡️ TACTICAL WAKE LOCK ACTIVATED: Screen is held awake.');
      
      // Auto-release listener (e.g., if page gets minimized)
      wakeLockInstance.addEventListener('release', () => {
        console.log('🔓 Wake Lock released by hardware.');
        wakeLockInstance = null;
      });
      return true;
    } catch (e) {
      console.warn("Wake Lock request rejected by Android framework:", e);
    }
  }
  return false;
}

/**
 * Release existing Wake Lock to save battery
 */
export async function releaseScreenWakeLock(): Promise<boolean> {
  if (wakeLockInstance) {
    try {
      await wakeLockInstance.release();
      wakeLockInstance = null;
      console.log('🔓 TACTICAL WAKE LOCK DEACTIVATED: Battery saving restored.');
      return true;
    } catch (e) {
      console.error("Failed to release Wake Lock:", e);
    }
  }
  return false;
}

/**
 * Android Badge Registry: Sets notification / active badge count on home screen launcher
 */
export function setAndroidAppBadge(count: number): boolean {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      (navigator as any).setAppBadge(count);
      return true;
    } catch (e) {
      console.warn("App badge rejected by launcher:", e);
    }
  }
  return false;
}

/**
 * Clears notification / active badge count on home screen launcher
 */
export function clearAndroidAppBadge(): boolean {
  if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
    try {
      (navigator as any).clearAppBadge();
      return true;
    } catch (e) {
      console.warn("App badge clear rejected by launcher:", e);
    }
  }
  return false;
}

/**
 * Android Native Share API integration: Launch Android Share Panel
 */
export async function nativeAndroidShare(title: string, text: string, url?: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        title,
        text,
        url: url || window.location.origin
      });
      triggerHaptic(30); // Confirmation tap
      return true;
    } catch (e) {
      // Suppress showing error when aborted by user
      if ((e as Error).name !== 'AbortError') {
        console.warn("Native share failure:", e);
      }
    }
  }
  return false;
}
