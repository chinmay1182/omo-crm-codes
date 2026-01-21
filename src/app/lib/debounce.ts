/**
 * Debounce utility to prevent rapid successive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Create a rate-limited version of an async function
 */
export function rateLimit<T extends (...args: any[]) => Promise<any>>(
  func: T,
  minInterval: number
): T {
  let lastCall = 0;
  let pending: Promise<any> | null = null;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (pending) {
      return pending;
    }
    
    if (now - lastCall < minInterval) {
      return Promise.resolve();
    }
    
    lastCall = now;
    pending = func(...args).finally(() => {
      pending = null;
    });
    
    return pending;
  }) as T;
}