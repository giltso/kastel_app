import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth as useClerkAuth,
  useUser,
} from "@clerk/clerk-react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
  Authenticated,
  ConvexReactClient,
  Unauthenticated,
  useMutation,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { RoleEmulator } from "@/components/RoleEmulator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserRoleDebug } from "@/components/UserRoleDebug";
import { KastelLogo } from "@/components/KastelLogo";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
}>()({
  component: RootComponent,
});

function NavigationLinks({ onLinkClick }: { onLinkClick: () => void }) {
  const { checkPermission } = usePermissionsV2();
  
  return (
    <>
      <Link
        to="/"
        className="btn btn-ghost"
        activeProps={{
          className: "btn btn-ghost btn-active",
        }}
        onClick={onLinkClick}
      >
        Home
      </Link>
      {checkPermission("access_worker_portal") && (
        <Link
          to="/calendar"
          className="btn btn-ghost"
          activeProps={{
            className: "btn btn-ghost btn-active",
          }}
          onClick={onLinkClick}
        >
          LUZ
        </Link>
      )}
      {checkPermission("request_tool_rentals") && (
        <Link
          to="/tools"
          className="btn btn-ghost"
          activeProps={{
            className: "btn btn-ghost btn-active",
          }}
          onClick={onLinkClick}
        >
          Tool Rental
        </Link>
      )}
      {checkPermission("browse_courses") && (
        <Link
          to="/courses"
          className="btn btn-ghost"
          activeProps={{
            className: "btn btn-ghost btn-active",
          }}
          onClick={onLinkClick}
        >
          Courses
        </Link>
      )}
      {checkPermission("access_worker_portal") && (
        <Link
          to="/forms"
          className="btn btn-ghost"
          activeProps={{
            className: "btn btn-ghost btn-active",
          }}
          onClick={onLinkClick}
        >
          Forms
        </Link>
      )}
      {checkPermission("access_worker_portal") && (
        <Link
          to="/pro-help"
          className="btn btn-ghost"
          activeProps={{
            className: "btn btn-ghost btn-active",
          }}
          onClick={onLinkClick}
        >
          Pro Help
        </Link>
      )}
    </>
  );
}

function MobileNavigationLinks({ onLinkClick }: { onLinkClick: () => void }) {
  const { checkPermission } = usePermissionsV2();
  
  return (
    <>
      <li>
        <Link
          to="/"
          onClick={onLinkClick}
          activeProps={{
            className: "active",
          }}
          className="flex items-center p-2"
        >
          Home
        </Link>
      </li>
      {checkPermission("access_worker_portal") && (
        <li>
          <Link
            to="/calendar"
            onClick={onLinkClick}
            activeProps={{
              className: "active",
            }}
            className="flex items-center p-2"
          >
            LUZ
          </Link>
        </li>
      )}
      {checkPermission("request_tool_rentals") && (
        <li>
          <Link
            to="/tools"
            onClick={onLinkClick}
            activeProps={{
              className: "active",
            }}
            className="flex items-center p-2"
          >
            Tool Rental
          </Link>
        </li>
      )}
      {checkPermission("browse_courses") && (
        <li>
          <Link
            to="/courses"
            onClick={onLinkClick}
            activeProps={{
              className: "active",
            }}
            className="flex items-center p-2"
          >
            Courses
          </Link>
        </li>
      )}
      {checkPermission("access_worker_portal") && (
        <li>
          <Link
            to="/forms"
            onClick={onLinkClick}
            activeProps={{
              className: "active",
            }}
            className="flex items-center p-2"
          >
            Forms
          </Link>
        </li>
      )}
      {checkPermission("access_worker_portal") && (
        <li>
          <Link
            to="/pro-help"
            onClick={onLinkClick}
            activeProps={{
              className: "active",
            }}
            className="flex items-center p-2"
          >
            Pro Help
          </Link>
        </li>
      )}
    </>
  );
}

function RootComponent() {
  const { queryClient, convexClient: convex } = Route.useRouteContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen flex flex-col">
            <Authenticated>
              <EnsureUser />
              {/* Mobile sidebar drawer */}
              <div className="drawer min-h-screen">
                <input
                  id="drawer-toggle"
                  type="checkbox"
                  className="drawer-toggle"
                  checked={isSidebarOpen}
                  onChange={toggleSidebar}
                />
                <div className="drawer-content flex flex-col h-full">
                  {/* Navbar */}
                  <header className="navbar bg-base-100 shadow-sm border-b border-base-300 px-4">
                    <div className="navbar-start">
                      <label
                        htmlFor="drawer-toggle"
                        className="btn btn-square btn-ghost drawer-button lg:hidden mr-2"
                      >
                        <Menu className="w-5 h-5" />
                      </label>
                      <Link
                        to="/"
                        className="btn btn-ghost normal-case text-xl flex items-center gap-2"
                      >
                        <KastelLogo size={32} />
                        Kastel
                      </Link>
                    </div>
                    <div className="navbar-center hidden lg:flex">
                      <nav className="flex">
                        <NavigationLinks onLinkClick={() => setIsSidebarOpen(false)} />
                      </nav>
                    </div>
                    <div className="navbar-end gap-2">
                      <UserRoleDebug />
                      <ThemeToggle />
                      <RoleEmulator />
                      <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            userButtonAvatarBox: "w-8 h-8",
                          }
                        }}
                      />
                    </div>
                  </header>
                  {/* Main content */}
                  <main className="flex-1 p-4 prose prose-invert max-w-none">
                    <Outlet />
                  </main>
                  <footer className="footer footer-center p-4 text-base-content">
                    <p>© {new Date().getFullYear()} Kastel</p>
                  </footer>
                </div>
                {/* Sidebar content for mobile */}
                <div className="drawer-side z-10">
                  <label
                    htmlFor="drawer-toggle"
                    aria-label="close sidebar"
                    className="drawer-overlay"
                  ></label>
                  <div className="menu p-4 w-64 min-h-full bg-base-200 text-base-content flex flex-col">
                    <div className="flex-1">
                      <div className="menu-title mb-4">Menu</div>
                      <ul className="space-y-2">
                        <MobileNavigationLinks onLinkClick={() => setIsSidebarOpen(false)} />
                      </ul>
                    </div>
                    <div className="mt-auto py-4 border-t border-base-300 flex flex-col gap-2 items-center">
                      <UserRoleDebug />
                      <ThemeToggle />
                      <RoleEmulator />
                      <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            userButtonAvatarBox: "w-8 h-8",
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Authenticated>
            <Unauthenticated>
              <header className="navbar bg-base-100 shadow-sm border-b border-base-300">
                <div className="flex justify-between w-full px-4">
                  <div className="navbar-start">
                    <h1 className="font-semibold flex items-center gap-2">
                      <KastelLogo size={28} />
                      Kastel
                    </h1>
                  </div>
                  <div className="navbar-end">
                    <SignInButton mode="modal">
                      <button className="btn btn-primary btn-sm">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="btn btn-ghost btn-sm ml-2">
                        Sign up
                      </button>
                    </SignUpButton>
                  </div>
                </div>
              </header>
              <main className="flex-1 container mx-auto p-4 prose prose-invert max-w-none">
                <Outlet />
              </main>
              <footer className="footer footer-center p-4 text-base-content">
                <p>© {new Date().getFullYear()} Kastel</p>
              </footer>
            </Unauthenticated>
          </div>
          {import.meta.env.DEV && <TanStackRouterDevtools />}
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function EnsureUser() {
  const { isLoaded, isSignedIn, user } = useUser();
  const ensureUser = useMutation(api.users_v2.ensureUser);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      void ensureUser();
    }
  }, [isLoaded, isSignedIn, user, ensureUser]);

  return null;
}

