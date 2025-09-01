import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { ProProfileModal } from "@/components/ProProfileModal";
import { useState } from "react";
import { 
  User, 
  Edit3, 
  Search, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  Award,
  Plus
} from "lucide-react";

export const Route = createFileRoute("/pro-help")({
  component: ProHelpPage,
});

function ProHelpPage() {
  const { hasPermission, effectiveRole } = usePermissions();

  if (!hasPermission("access_pro_help")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don't have permission to access Pro Help.</p>
        </div>
      </div>
    );
  }

  const isPro = effectiveRole === "pro";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Professional Services</h1>
        <p className="text-lg opacity-80">
          {isPro 
            ? "Manage your professional profile and connect with customers" 
            : "Find skilled professionals for your projects"
          }
        </p>
      </div>

      {isPro ? <ProDashboard /> : <ProSearch />}
    </div>
  );
}

function ProDashboard() {
  const { hasPermission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const myProfile = useQuery(api.proProfiles.getMyProfile);

  const openCreateModal = () => {
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = () => {
    setModalMode("edit");
    setModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Profile Management Section - Always at top for pros */}
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">
              <User className="w-6 h-6 text-primary" />
              Your Professional Profile
            </h2>
            {myProfile && hasPermission("edit_pro_profile") && (
              <button className="btn btn-primary btn-sm gap-2" onClick={openEditModal}>
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
          
          {myProfile ? (
            /* Existing Profile Display */
            <div className="bg-base-100 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-16">
                    <span className="text-2xl">{myProfile.user?.name.charAt(0) || "P"}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{myProfile.title}</h3>
                  <p className="text-sm opacity-70 mb-2">{myProfile.user?.name}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {myProfile.specialties.map((specialty, index) => (
                      <span key={index} className="badge badge-primary badge-sm">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  {myProfile.hourlyRate && (
                    <div className="text-lg font-bold">${myProfile.hourlyRate}/hr</div>
                  )}
                  <div className={`badge badge-sm ${myProfile.isActive ? "badge-success" : "badge-warning"}`}>
                    {myProfile.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
              
              <p className="mb-4">{myProfile.description}</p>
              
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {myProfile.experience && (
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span>{myProfile.experience} experience</span>
                  </div>
                )}
                {myProfile.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>{myProfile.contactPhone}</span>
                  </div>
                )}
                {myProfile.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>{myProfile.contactEmail}</span>
                  </div>
                )}
                {myProfile.availability && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{myProfile.availability}</span>
                  </div>
                )}
              </div>
              
              {myProfile.certifications && myProfile.certifications.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Certifications:</h4>
                  <div className="flex flex-wrap gap-2">
                    {myProfile.certifications.map((cert, index) => (
                      <span key={index} className="badge badge-outline badge-sm">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Create Profile Prompt */
            <div className="bg-base-100 rounded-lg p-6">
              <div className="text-center py-8">
                <User className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Create Your Profile</h3>
                <p className="opacity-70 mb-4">
                  Set up your professional profile to start advertising your services
                </p>
                {hasPermission("create_pro_profile") && (
                  <button className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <Plus className="w-4 h-4" />
                    Create Profile
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ProProfileModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        mode={modalMode} 
      />

      {/* Course Creation Section - If pro has course permissions */}
      {hasPermission("create_courses") && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title">
              <Award className="w-6 h-6 text-primary" />
              Course Management
            </h3>
            <p className="opacity-70 mb-4">
              As a professional, you can create and manage educational courses
            </p>
            <div className="card-actions">
              <button className="btn btn-outline btn-sm gap-2">
                <Plus className="w-4 h-4" />
                Create Course
              </button>
              <button className="btn btn-ghost btn-sm">
                View My Courses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const allProfiles = useQuery(api.proProfiles.getActiveProfiles, { limit: 10 });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      // For now, do a simple client-side filter
      const filtered = allProfiles?.filter((profile) =>
        profile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.specialties.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
      ) || [];
      setSearchResults(filtered);
    } else {
      setSearchResults(null);
    }
  };

  const displayProfiles = searchResults || allProfiles || [];

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-4 mb-4">
            <Search className="w-6 h-6 text-primary" />
            <h2 className="card-title">Find Professional Services</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Search by service type</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g., Plumbing, Electrical, Carpentry" 
                className="input input-bordered w-full" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Location</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter location" 
                className="input input-bordered w-full" 
                disabled
              />
            </div>
          </div>
          
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary gap-2" onClick={handleSearch}>
              <Search className="w-4 h-4" />
              Search Professionals
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div>
        {searchResults !== null && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              Search Results ({searchResults.length} found)
            </h3>
            {searchResults.length === 0 && (
              <p className="text-sm opacity-70">No professionals found matching your search.</p>
            )}
          </div>
        )}
        
        {displayProfiles.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Professionals Yet</h3>
            <p className="opacity-70">
              No professional profiles are available at the moment.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProfiles.map((profile) => (
              <ProCard key={profile._id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProCard({ profile }: { profile: any }) {
  const initials = profile.user?.name
    ? profile.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : "P";

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <div className="flex items-center gap-3 mb-3">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-12">
              <span className="text-lg">{initials}</span>
            </div>
          </div>
          <div>
            <h3 className="font-bold">{profile.user?.name || "Professional"}</h3>
            <p className="text-sm opacity-70">{profile.title}</p>
          </div>
        </div>
        
        <p className="text-sm mb-3">
          {profile.description.length > 120 
            ? `${profile.description.substring(0, 120)}...` 
            : profile.description}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {profile.specialties.slice(0, 3).map((specialty: string, index: number) => (
            <span key={index} className="badge badge-primary badge-xs">
              {specialty}
            </span>
          ))}
          {profile.specialties.length > 3 && (
            <span className="badge badge-outline badge-xs">
              +{profile.specialties.length - 3}
            </span>
          )}
        </div>
        
        <div className="space-y-2 text-sm">
          {profile.experience && (
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <span>{profile.experience}</span>
            </div>
          )}
          {profile.hourlyRate && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>${profile.hourlyRate}/hour</span>
            </div>
          )}
          {profile.availability && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{profile.availability}</span>
            </div>
          )}
        </div>
        
        <div className="card-actions justify-end mt-4">
          {profile.contactPhone && (
            <button className="btn btn-outline btn-sm gap-2">
              <Phone className="w-4 h-4" />
              Contact
            </button>
          )}
          <button className="btn btn-primary btn-sm">
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}