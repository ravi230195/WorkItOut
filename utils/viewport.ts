/**
 * Viewport meta tag setup utilities for mobile devices
 */

export function setupViewportMeta() {
  let viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.setAttribute('name', 'viewport');
    document.head.appendChild(viewportMeta);
  }
  
  // Set viewport with safe area support
  const viewportContent = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
  if (viewportMeta.getAttribute('content') !== viewportContent) {
    viewportMeta.setAttribute('content', viewportContent);
  }
}