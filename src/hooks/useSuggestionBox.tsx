import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

interface SuggestionBoxContextType {
  isOpen: boolean;
  openSuggestionBox: () => void;
  closeSuggestionBox: () => void;
  currentLocation: string;
  pageContext: string;
}

const SuggestionBoxContext = createContext<SuggestionBoxContextType | undefined>(undefined);

export function useSuggestionBox() {
  const context = useContext(SuggestionBoxContext);
  if (!context) {
    throw new Error("useSuggestionBox must be used within a SuggestionBoxProvider");
  }
  return context;
}

interface SuggestionBoxProviderProps {
  children: ReactNode;
}

export function SuggestionBoxProvider({ children }: SuggestionBoxProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Auto-detect current location and context
  const currentLocation = `${window.location.origin}${location.pathname}${location.search}`;
  
  // Generate page context based on current route
  const getPageContext = (): string => {
    const pathname = location.pathname;
    
    // Map routes to user-friendly descriptions
    const routeDescriptions: Record<string, string> = {
      "/": "Home page",
      "/calendar": "Calendar view with events and scheduling",
      "/events": "Events list and management page",
      "/tools": "Tool rental system",
      "/courses": "Course catalog and enrollment",
      "/forms": "Forms and submissions",
    };

    let context = routeDescriptions[pathname] || `Page: ${pathname}`;
    
    // Add search parameters context if they exist
    if (location.search) {
      const searchParams = new URLSearchParams(location.search);
      const params = Array.from(searchParams.entries())
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      context += ` (Filters: ${params})`;
    }

    // Add hash context if it exists
    if (location.hash) {
      context += ` (Section: ${location.hash})`;
    }

    return context;
  };

  const pageContext = getPageContext();

  const openSuggestionBox = () => setIsOpen(true);
  const closeSuggestionBox = () => setIsOpen(false);

  // Close suggestion box when navigating to different pages
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const value: SuggestionBoxContextType = {
    isOpen,
    openSuggestionBox,
    closeSuggestionBox,
    currentLocation,
    pageContext,
  };

  return (
    <SuggestionBoxContext.Provider value={value}>
      {children}
    </SuggestionBoxContext.Provider>
  );
}