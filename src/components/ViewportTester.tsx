import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667, label: "Mobile", icon: Smartphone },
  tablet: { width: 768, height: 1024, label: "Tablet", icon: Tablet },
  desktop: { width: 1200, height: 800, label: "Desktop", icon: Monitor },
  reset: { width: 0, height: 0, label: "Reset", icon: Monitor },
};

export function ViewportTester() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSize, setCurrentSize] = useState<keyof typeof VIEWPORT_SIZES | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleViewportChange = (sizeKey: keyof typeof VIEWPORT_SIZES) => {
    const size = VIEWPORT_SIZES[sizeKey];

    if (sizeKey === "reset") {
      // Reset to full size
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.margin = "";
      document.body.style.overflow = "";
      setCurrentSize(null);
    } else {
      // Set viewport size
      document.body.style.width = `${size.width}px`;
      document.body.style.height = `${size.height}px`;
      document.body.style.margin = "0 auto";
      document.body.style.overflow = "auto";
      setCurrentSize(sizeKey);
    }

    setIsOpen(false);
  };

  const Icon = currentSize ? VIEWPORT_SIZES[currentSize].icon : Monitor;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm gap-2"
        title="Test Viewport Sizes (Dev Only)"
        type="button"
      >
        <Icon className="w-4 h-4" />
        {currentSize && (
          <span className="text-xs hidden sm:inline">
            {VIEWPORT_SIZES[currentSize].label}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 p-2">
          <div className="text-xs font-semibold text-base-content/60 px-3 py-2">
            Viewport Tester
          </div>
          <ul className="menu menu-sm p-0">
            {Object.entries(VIEWPORT_SIZES).map(([key, size]) => {
              const Icon = size.icon;
              const isActive = currentSize === key;

              return (
                <li key={key}>
                  <button
                    onClick={() => handleViewportChange(key as keyof typeof VIEWPORT_SIZES)}
                    className={`flex items-center justify-between ${isActive ? "active" : ""}`}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {size.label}
                    </span>
                    {key !== "reset" && (
                      <span className="text-xs text-base-content/50">
                        {size.width}×{size.height}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="text-xs text-base-content/50 px-3 py-2 border-t border-base-300 mt-2">
            Dev tool - not in production
          </div>
        </div>
      )}
    </div>
  );
}
