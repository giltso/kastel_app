import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { SuggestionBoxModal } from "./SuggestionBoxModal";

export function SuggestionBoxTrigger() {
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

  return (
    <>
      <button
        className="btn btn-ghost btn-sm tooltip tooltip-left"
        data-tip="Send feedback or suggest improvements"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      <SuggestionBoxModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentLocation={currentLocation}
        pageContext={pageContext}
      />
    </>
  );
}