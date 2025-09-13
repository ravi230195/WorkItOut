/**
 * Safe area detection and setup utilities for mobile devices
 */

export function setupSafeAreaSupport() {
  // Add CSS custom properties fallback for older devices
  document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 0px)');
  document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom, 0px)');
  document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left, 0px)');
  document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right, 0px)');
}

export function detectAndApplySafeArea() {
  // Test if CSS env() is supported
  const testElement = document.createElement('div');
  testElement.style.paddingBottom = 'env(safe-area-inset-bottom, 999px)';
  document.body.appendChild(testElement);
  
  const computedStyle = window.getComputedStyle(testElement);
  const isSupported = computedStyle.paddingBottom !== '999px';
  
  document.body.removeChild(testElement);
  
  // Add data attribute for debugging
  document.documentElement.setAttribute('data-safe-area-supported', isSupported.toString());
  
  // Manual detection for iPhone models (fallback)
  if (!isSupported) {
    applyManualSafeArea();
  }
}

function applyManualSafeArea() {
  const isIPhone = /iPhone/i.test(navigator.userAgent);
  // `navigator.standalone` is a non-standard iOS Safari property
  const isStandalone = (window.navigator as any).standalone === true;
  const isFullscreen = window.matchMedia('(display-mode: standalone)').matches;
  
  if (isIPhone && (isStandalone || isFullscreen)) {
    // Apply manual safe area for known iPhone models
    const screenHeight = window.screen.height;
    let bottomInset = '0px';
    let topInset = '0px';
    
    // iPhone X and newer models
    if (screenHeight >= 812) {
      bottomInset = '34px';
      topInset = '44px';
    }
    
    document.documentElement.style.setProperty('--manual-safe-area-top', topInset);
    document.documentElement.style.setProperty('--manual-safe-area-bottom', bottomInset);
    document.documentElement.setAttribute('data-manual-safe-area', 'true');
  }
}