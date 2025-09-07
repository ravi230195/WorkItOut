export const isHardDeleteEnabled = (): boolean => {
  // Check localStorage override
  if (typeof localStorage !== 'undefined') {
    const val = localStorage.getItem('USE_HARD_DELETE');
    if (val !== null) {
      return val === 'true';
    }
  }
  // Check environment variable
  if (typeof process !== 'undefined' && (process as any).env?.USE_HARD_DELETE) {
    const envVal = String((process as any).env.USE_HARD_DELETE).toLowerCase();
    return envVal === 'true' || envVal === '1';
  }
  // Default: soft delete
  return false;
};
