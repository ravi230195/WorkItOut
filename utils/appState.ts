import { App } from '@capacitor/app';
import { useEffect, useRef } from 'react';
import { localCache } from './cache/localCache';
import { logger } from './logging';

interface Saver<T = unknown> {
  key: string;
  save: () => T;
  restore: (value: T) => void;
}

const savers: Saver[] = [];

export function registerAppStateSaver<T>(
  key: string,
  save: () => T,
  restore: (value: T) => void
) {
  logger.debug(`[APP-STATE] Registering state saver for key: ${key}`);
  savers.push({ key, save, restore: restore as (value: unknown) => void });
  logger.debug(`[APP-STATE] Total savers registered: ${savers.length}`);

  return () => {
    const i = savers.findIndex(
      (s) => s.key === key && s.save === save && s.restore === restore
    );
    if (i >= 0) {
      savers.splice(i, 1);
      logger.debug(
        `[APP-STATE] Unregistered state saver for key: ${key}. Remaining savers: ${savers.length}`
      );
    } else {
      logger.debug(
        `[APP-STATE] State saver not found for unregistration: ${key}`
      );
    }
  };
}

function handleStateChange(isActive: boolean) {
  logger.debug(
    `[APP-STATE] App state changed - isActive: ${isActive}, total savers: ${savers.length}`
  );

  if (!isActive) {
    logger.debug(
      `[APP-STATE] App becoming inactive - saving state for ${savers.length} savers`
    );
    savers.forEach(({ key, save }) => {
      try {
        logger.debug(`[APP-STATE] Saving state for key: ${key}`);
        const data = save();
        localCache.set(`appstate:${key}`, data);
        logger.debug(
          `[APP-STATE] Successfully saved state for key: ${key}`,
          data
        );
      } catch (error) {
        logger.debug(
          `[APP-STATE] Failed to save state for key: ${key}`,
          error
        );
      }
    });
    logger.debug(`[APP-STATE] Completed saving all states`);
  } else {
    logger.debug(
      `[APP-STATE] App becoming active - restoring state for ${savers.length} savers`
    );
    savers.forEach(({ key, restore }) => {
      const data = localCache.get(`appstate:${key}`, Number.MAX_SAFE_INTEGER);
      if (data !== null) {
        try {
          logger.debug(`[APP-STATE] Restoring state for key: ${key}`, data);
          restore(data);
          logger.debug(`[APP-STATE] Successfully restored state for key: ${key}`);
        } catch (error) {
          logger.debug(
            `[APP-STATE] Failed to restore state for key: ${key}`,
            error
          );
        } finally {
          localCache.remove(`appstate:${key}`);
          logger.debug(`[APP-STATE] Removed cached state for key: ${key}`);
        }
      } else {
        logger.debug(`[APP-STATE] No cached state found for key: ${key}`);
      }
    });
    logger.debug(`[APP-STATE] Completed restoring all states`);
  }
}

export function useAppStateSaver<T>(key: string, data: T, setData: (value: T) => void) {
  const ref = useRef(data);
  useEffect(() => {
    logger.debug(
      `[APP-STATE] useAppStateSaver - data updated for key: ${key}`,
      data
    );
    ref.current = data;
  }, [data, key]);
  useEffect(() => {
    logger.debug(
      `[APP-STATE] useAppStateSaver - setting up state saver for key: ${key}`
    );
    const cacheKey = `appstate:${key}`;
    const cached = localCache.get(cacheKey, Number.MAX_SAFE_INTEGER);
    if (cached !== null) {
      try {
        logger.debug(
          `[APP-STATE] Restoring cached state for key: ${key} on mount`,
          cached
        );
        setData(cached);
        logger.debug(
          `[APP-STATE] Successfully restored cached state for key: ${key} on mount`
        );
      } catch (error) {
        logger.debug(
          `[APP-STATE] Failed to restore cached state for key: ${key} on mount`,
          error
        );
      } finally {
        localCache.remove(cacheKey);
        logger.debug(
          `[APP-STATE] Removed cached state for key: ${key} on mount`
        );
      }
    } else {
      logger.debug(
        `[APP-STATE] No cached state found for key: ${key} on mount`
      );
    }
    return registerAppStateSaver(key, () => ref.current, setData);
  }, [key, setData]);
}

logger.debug(`[APP-STATE] Setting up app state change listeners`);

App.addListener('appStateChange', ({ isActive }) => {
  logger.debug(
    `[APP-STATE] Capacitor app state change event - isActive: ${isActive}`
  );
  handleStateChange(isActive);
});

if (typeof document !== 'undefined') {
  logger.debug(
    `[APP-STATE] Setting up document visibility change listener`
  );
  document.addEventListener('visibilitychange', () => {
    const isVisible = document.visibilityState === 'visible';
    logger.debug(
      `[APP-STATE] Document visibility change event - isVisible: ${isVisible}`
    );
    handleStateChange(isVisible);
  });
} else {
  logger.debug(
    `[APP-STATE] Document not available - skipping visibility change listener`
  );
}
