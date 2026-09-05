declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor('#0F1115');
      tg.setBackgroundColor('#0F1115');
    } catch {
      // ignore
    }
  }
}

export function isHapticEnabled(): boolean {
  const stored = localStorage.getItem('kitobxon_haptic');
  return stored !== 'false';
}

export function setHapticEnabled(enabled: boolean): void {
  localStorage.setItem('kitobxon_haptic', enabled ? 'true' : 'false');
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  if (!isHapticEnabled()) return;
  const tg = getTelegramWebApp();
  if (tg && tg.HapticFeedback) {
    if (type === 'success' || type === 'warning' || type === 'error') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  }
}

export function getInitData(): string {
  const tg = getTelegramWebApp();
  return tg?.initData || '';
}

export function openExternalUrl(url: string) {
  const tg = getTelegramWebApp();
  if (tg && tg.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

export function openTelegramChat(url: string) {
  const tg = getTelegramWebApp();
  if (tg && tg.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}
