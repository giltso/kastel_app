import { SignInButton } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Calendar, FileText, Settings, Wrench, Hammer, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="text-center">
      <div className="not-prose flex justify-center mb-6">
        <Wrench className="w-20 h-20 text-primary" />
      </div>
      <h1>Welcome to Kastel</h1>
      <p className="text-lg opacity-80">Your hardware shop management solution</p>

      <Unauthenticated>
        <div className="mt-8">
          <p className="mb-6">
            Manage your work scheduling, tool rentals, customer orders, and forms all in one place.
          </p>
          <div className="not-prose mt-4">
            <SignInButton mode="modal">
              <button className="btn btn-primary btn-lg">Get Started</button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <DashboardPreview />
      </Authenticated>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="mt-8">
      <h2>Welcome back!</h2>
      <p className="mb-8">Access your tools and manage your hardware shop operations</p>
      
      <div className="not-prose grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <Link to="/events" className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body items-center text-center">
            <Calendar className="w-12 h-12 text-primary mb-2" />
            <h3 className="card-title">Events</h3>
            <p>Create and manage work scheduling events</p>
          </div>
        </Link>

        <Link to="/calendar" className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body items-center text-center">
            <Settings className="w-12 h-12 text-primary mb-2" />
            <h3 className="card-title">Calendar</h3>
            <p>View and interact with scheduled events</p>
          </div>
        </Link>

        <Link to="/tools" className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body items-center text-center">
            <Hammer className="w-12 h-12 text-primary mb-2" />
            <h3 className="card-title">Tool Rental</h3>
            <p>Manage tool inventory and rentals</p>
          </div>
        </Link>

        <Link to="/courses" className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body items-center text-center">
            <GraduationCap className="w-12 h-12 text-primary mb-2" />
            <h3 className="card-title">Courses</h3>
            <p>Educational courses and training</p>
          </div>
        </Link>

        <Link to="/forms" className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body items-center text-center">
            <FileText className="w-12 h-12 text-primary mb-2" />
            <h3 className="card-title">Forms</h3>
            <p>Create and manage work forms</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
