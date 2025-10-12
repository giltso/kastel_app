import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import "./index.css";
import "./i18n/config"; // Initialize i18n

import { routeTree } from "./routeTree.gen";

// Create clients outside of components to avoid recreating them on re-renders
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
      staleTime: Infinity,
    },
  },
});
convexQueryClient.connect(queryClient);

const router = createRouter({ 
  routeTree,
  context: {
    queryClient,
    convexClient: convex,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><span className="loading loading-spinner loading-lg"></span></div>}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>,
);
