import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertTriangle, Home } from "lucide-react";

export const Route = createFileRoute("/unauthorized")({
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  useEffect(() => {
    // Redirect to home after 5 seconds
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <AlertTriangle className="w-16 h-16 mx-auto text-warning mb-4" />
          <h1 className="text-4xl font-bold text-error mb-2">Oops!</h1>
          <p className="text-xl opacity-80">You reached a wrong page</p>
        </div>

        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <p className="mb-4">
              You don't have permission to access this page. 
              You'll be redirected to the home page in a few seconds.
            </p>
            
            <div className="not-prose">
              <Link to="/" className="btn btn-primary">
                <Home className="w-4 h-4" />
                Go to Home
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm opacity-60">
          Redirecting automatically in 5 seconds...
        </div>
      </div>
    </div>
  );
}