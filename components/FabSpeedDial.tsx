import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

export interface FabAction {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
}

type CssLength = number | string;

interface FabSpeedDialProps {
  actions: FabAction[];
  onOpenChange?: (open: boolean) => void;
  /**
   * Width of the glowing backdrop. Accepts any valid CSS length (defaults to auto width).
   */
  backdropWidth?: CssLength;
  /**
   * Extra width added on top of the computed/auto width. Accepts any CSS length.
   */
  backdropWidthOffset?: CssLength;
  /**
   * Height of the glowing backdrop. Accepts any valid CSS length (defaults to auto height).
   */
  backdropHeight?: CssLength;
  /**
   * Extra height added on top of the computed/auto height. Accepts any CSS length.
   */
  backdropHeightOffset?: CssLength;
  /**
   * Milliseconds for the backdrop fade animation (defaults to 400ms).
   */
  backdropFadeDuration?: number;
}

const DEFAULT_FADE_DURATION = 400;

const toCssLength = (value: CssLength) =>
  typeof value === "number" ? `${value}px` : value;

const addOffset = (
  base: CssLength | undefined,
  offset: CssLength | undefined
): string | undefined => {
  if (base === undefined && offset === undefined) {
    return undefined;
  }

  const baseCss = base !== undefined ? toCssLength(base) : undefined;
  const offsetCss = offset !== undefined ? toCssLength(offset) : undefined;

  if (!offsetCss || offsetCss === "0" || offsetCss === "0px") {
    return baseCss;
  }

  if (!baseCss || baseCss === "0" || baseCss === "0px") {
    return offsetCss;
  }

  const disallowedForCalc = ["auto", "fit-content", "max-content", "min-content"];
  if (typeof baseCss === "string" && disallowedForCalc.includes(baseCss)) {
    return baseCss;
  }

  return `calc(${baseCss} + ${offsetCss})`;
};

export default function FabSpeedDial({
  actions,
  onOpenChange,
  backdropWidth,
  backdropWidthOffset,
  backdropHeight,
  backdropHeightOffset,
  backdropFadeDuration = DEFAULT_FADE_DURATION,
}: FabSpeedDialProps) {
  const [open, setOpen] = useState(false);
  const [showBackdrop, setShowBackdrop] = useState(false);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const [autoBackdropSize, setAutoBackdropSize] = useState({
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    if (!open || !dialRef.current) {
      return;
    }

    const measure = () => {
      const element = dialRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      setAutoBackdropSize({
        width: rect.width,
        height: rect.height,
      });
    };

    let frame: number | null = null;
    const scheduleMeasure = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(() => {
        measure();
        frame = null;
      });
    };

    measure();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleMeasure())
        : null;

    const dialEl = dialRef.current;
    if (observer && dialEl) {
      observer.observe(dialEl);
    }

    const handleResize = () => scheduleMeasure();

    window.addEventListener("resize", handleResize);

    return () => {
      if (observer && dialEl) {
        observer.unobserve(dialEl);
        observer.disconnect();
      }
      window.removeEventListener("resize", handleResize);
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [open]);

  const baseBackdropWidth: CssLength | undefined =
    backdropWidth === undefined
      ? autoBackdropSize.width > 0
        ? autoBackdropSize.width
        : undefined
      : backdropWidth;
  const baseBackdropHeight: CssLength | undefined =
    backdropHeight === undefined
      ? autoBackdropSize.height > 0
        ? autoBackdropSize.height
        : undefined
      : backdropHeight;

  const computedBackdropWidth = addOffset(
    baseBackdropWidth,
    backdropWidthOffset
  );
  const computedBackdropHeight = addOffset(
    baseBackdropHeight,
    backdropHeightOffset
  );

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (open) {
      setShowBackdrop(true);
    } else if (showBackdrop) {
      timeout = setTimeout(() => setShowBackdrop(false), backdropFadeDuration);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [open, showBackdrop, backdropFadeDuration]);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      onOpenChange?.(next);
      return next;
    });
  };

  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  return (
    <div className="fixed right-4 bottom-20 z-40">
      <div
        className={`flex flex-col items-end ${open ? "gap-4" : ""}`}
      >
        <div ref={dialRef} className="relative">
          {showBackdrop && (
            <div
              className={`pointer-events-none absolute right-0 bottom-0 translate-x-6 rounded-[36px] bg-white/90 shadow-xl blur-lg transition-all ease-out -z-10 transform ${
                open ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{
                width: computedBackdropWidth,
                height: computedBackdropHeight,
                transitionDuration: `${backdropFadeDuration}ms`,
              }}
            />
          )}

          {open && (
            <div className="flex flex-col items-end gap-4 z-10">
              {actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    close();
                    action.onPress();
                  }}
                  className="flex items-center gap-3"
                >
                  <span
                    className="uppercase whitespace-nowrap text-black text-xl font-bold tracking-wide"
                    style={{ textShadow: "0 2px 2px rgba(0,0,0,0.3)" }}
                  >
                    {action.label}
                  </span>
                  {action.icon && (
                    <span className="w-12 h-12 rounded-full bg-primary text-black shadow flex items-center justify-center">
                      {action.icon}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          aria-label="Speed dial"
          aria-expanded={open}
          className="
            relative z-20 w-16 h-16 rounded-full bg-primary text-black
            shadow-lg flex items-center justify-center
            transition-transform
          "
        >
          <Plus className={`w-6 h-6 transition-transform ${open ? "rotate-45" : ""}`} />
        </button>
      </div>
    </div>
  );
}

