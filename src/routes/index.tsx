import { SignInButton } from "@clerk/clerk-react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  Calendar, 
  FileText, 
  Settings, 
  Wrench, 
  Hammer, 
  GraduationCap, 
  Clock, 
  Phone, 
  MapPin, 
  Mail,
  Users,
  ArrowRight,
  Star,
  Shield
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <Unauthenticated>
        {/* Hero Section */}
        <div className="hero bg-gradient-to-br from-primary/10 to-accent/10 py-20">
          <div className="hero-content text-center">
            <div className="max-w-4xl">
              <div className="not-prose flex justify-center mb-6">
                <Wrench className="w-20 h-20 text-primary" />
              </div>
              <h1 className="text-5xl font-bold">Welcome to Kastel Hardware</h1>
              <p className="text-xl opacity-80 py-6">
                Your trusted partner for tools, education, and professional services
              </p>
              
              <div className="not-prose">
                <SignInButton mode="modal">
                  <button className="btn btn-primary btn-lg gap-2">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <PublicHomePage />
        </div>
      </Unauthenticated>
      
      <Authenticated>
        <OperationalUserRedirect />
      </Authenticated>
    </div>
  );
}

function OperationalUserRedirect() {
  const { hasPermission, isLoading } = usePermissions();
  
  // Show loading while permissions are being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }
  
  // If user has worker portal access (worker, manager, dev), redirect to Calendar
  if (hasPermission("access_worker_portal")) {
    return <Navigate to="/calendar" replace />;
  }
  
  // For customers/guests, show the guest homepage content
  return (
    <div className="container mx-auto px-4 py-12">
      <PublicHomePage />
    </div>
  );
}

// Public Home Page for Guests/Customers
function PublicHomePage() {
  return (
    <div className="space-y-16">
      {/* Work Hours Section */}
      <section className="text-center">
        <h2 className="text-3xl font-bold mb-8">Store Hours & Contact</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Work Hours */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title justify-center">
                <Clock className="w-6 h-6 text-primary" />
                Business Hours
              </h3>
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="font-medium">7:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-medium">8:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="font-medium">Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title justify-center">
                <Phone className="w-6 h-6 text-primary" />
                Contact Us
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-accent" />
                  <span>(555) 123-TOOL</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-accent" />
                  <span>info@kastelhardware.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-accent" />
                  <span>123 Hardware St, Tool City</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Tool Rental Preview */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <Hammer className="w-6 h-6 text-primary" />
                Tool Rental
              </h3>
              <p>Professional-grade tools for every project</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>• Power Tools</span>
                  <span className="badge badge-primary">Available</span>
                </div>
                <div className="flex justify-between">
                  <span>• Heavy Equipment</span>
                  <span className="badge badge-primary">Available</span>
                </div>
                <div className="flex justify-between">
                  <span>• Hand Tools</span>
                  <span className="badge badge-primary">Available</span>
                </div>
              </div>
              <div className="card-actions">
                <Link to="/tools" className="btn btn-primary btn-sm">
                  Browse Tools <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Educational Courses Preview */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <GraduationCap className="w-6 h-6 text-primary" />
                Training & Education
              </h3>
              <p>Learn from certified professionals</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>• Safety Training</span>
                  <span className="badge badge-secondary">Next Week</span>
                </div>
                <div className="flex justify-between">
                  <span>• Tool Operation</span>
                  <span className="badge badge-secondary">Available</span>
                </div>
                <div className="flex justify-between">
                  <span>• Maintenance</span>
                  <span className="badge badge-secondary">Monthly</span>
                </div>
              </div>
              <div className="card-actions">
                <Link to="/courses" className="btn btn-primary btn-sm">
                  View Courses <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Hired Help Services */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <Users className="w-6 h-6 text-primary" />
                Professional Services
              </h3>
              <p>Expert help when you need it most</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>• Installation</span>
                  <span className="badge badge-accent">Coming Soon</span>
                </div>
                <div className="flex justify-between">
                  <span>• Repairs</span>
                  <span className="badge badge-accent">Coming Soon</span>
                </div>
                <div className="flex justify-between">
                  <span>• Consultation</span>
                  <span className="badge badge-accent">Coming Soon</span>
                </div>
              </div>
              <div className="card-actions">
                <button className="btn btn-outline btn-sm" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-base-200 rounded-xl p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold">Why Choose Kastel Hardware?</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h4 className="font-bold">Trusted & Reliable</h4>
            <p className="text-sm opacity-70">Over 20 years serving our community</p>
          </div>
          <div className="text-center">
            <Star className="w-12 h-12 text-primary mx-auto mb-4" />
            <h4 className="font-bold">Quality Equipment</h4>
            <p className="text-sm opacity-70">Professional-grade tools you can depend on</p>
          </div>
          <div className="text-center">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h4 className="font-bold">Expert Support</h4>
            <p className="text-sm opacity-70">Knowledgeable staff ready to help</p>
          </div>
        </div>
      </section>
    </div>
  );
}

