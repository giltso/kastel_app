import { createFileRoute, Link } from "@tanstack/react-router";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { KastelLogo } from "@/components/KastelLogo";
import { useLanguage } from "@/hooks/useLanguage";
import { EditableText } from "@/components/EditableText";
import { useEditableContent } from "@/hooks/useEditableContent";

export const Route = createFileRoute("/")({
  component: V2HomePage,
});

function V2HomePage() {
  const {
    user,
    hasPermission,
    isLoading,
    isGuest,
    isStaff,
    isCustomer
  } = usePermissionsV2();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Guest (Unauthenticated) Interface
  if (isGuest) {
    return <GuestHomePage />;
  }

  // Staff home page - same as customer page (can access when needed, e.g., for content editing)
  if (isStaff) {
    return (
      <>
        <EnsureUserV2 />
        <CustomerHomePage user={user} hasPermission={hasPermission as any} />
      </>
    );
  }

  // Customer home page
  if (isCustomer) {
    return (
      <>
        <EnsureUserV2 />
        <CustomerHomePage user={user} hasPermission={hasPermission as any} />
      </>
    );
  }

  // Fallback
  return null;
}

// Guest (Unauthenticated) Home Page
function GuestHomePage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="hero bg-base-200 rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <div className="flex justify-center mb-6">
              <KastelLogo size={120} className="drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-bold">{t("common:home.welcome")}</h1>
            <p className="py-6 text-lg">
              {t("common:home.welcomeDescription")}
            </p>
            <div className="not-prose space-x-4">
              <Link to="/tools" className="btn btn-primary">
                {t("common:home.browseTools")}
              </Link>
              <Link to="/educational" className="btn btn-secondary">
                {t("common:home.viewCourses")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Service Preview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🔧 {t("common:home.toolRentalTitle")}</h2>
            <p>{t("common:home.toolRentalDescription")}</p>
            <div className="card-actions justify-center">
              <Link to="/tools" className="btn btn-primary btn-sm">{t("common:home.browseTools")}</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">📚 {t("common:home.educationalTitle")}</h2>
            <p>{t("common:home.educationalDescription")}</p>
            <div className="card-actions justify-center">
              <Link to="/educational" className="btn btn-secondary btn-sm">{t("common:home.viewCourses")}</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🏪 {t("common:home.aboutUsTitle")}</h2>
            {(() => {
              const { text, needsTranslation } = useEditableContent("home.aboutUs");
              return (
                <EditableText contentKey="home.aboutUs" as="p" needsTranslation={needsTranslation}>
                  {text}
                </EditableText>
              );
            })()}
            <div className="card-actions justify-center">
              <button className="btn btn-accent btn-sm" disabled>{t("common:home.learnMore")}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{t("common:home.storeInformation")}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">{t("common:home.hours")}</h3>
              <p>{t("common:home.mondayFriday")}</p>
              <p>{t("common:home.saturday")}</p>
              <p>{t("common:home.sunday")}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">{t("common:home.contact")}</h3>
              <p>📞 (555) 123-4567</p>
              <p>📧 info@kastelhardware.com</p>
              <p>📍 123 Main Street, Hardware City</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Staff Home Page (LUZ System)
function StaffHomePage({ user, hasPermission }: { user: any, hasPermission: (p: string) => boolean }) {
  const effective = user?.effectiveRole;
  const { t } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto">
      {/* LUZ Header */}
      <div className="hero bg-primary text-primary-content rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <div className="flex justify-center mb-4">
              <KastelLogo size={80} className="drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold">{t("common:staff.luzTitle")}</h1>
            <p className="py-4">{t("common:staff.luzWelcome", { name: user?.name })}</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <div className="badge badge-primary">{t("roles:tags.staff")}</div>
              {effective?.workerTag && <div className="badge badge-info">{t("roles:tags.worker")}</div>}
              {effective?.instructorTag && <div className="badge badge-secondary">{t("roles:tags.instructor")}</div>}
              {effective?.toolHandlerTag && <div className="badge badge-accent">{t("roles:tags.toolHandler")}</div>}
              {effective?.managerTag && <div className="badge badge-warning">{t("roles:tags.manager")}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* LUZ Interface Layout - Future 70/30 split */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Overview Section (Future: 30% width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">📊 {t("common:staff.todayOverview")}</h2>
              <div className="space-y-3">
                <div className="p-3 rounded bg-info/10 border border-info/20">
                  <div className="font-medium text-sm">{t("common:staff.shiftManagement")}</div>
                  <div className="text-xs opacity-70">{t("common:staff.comingSoonV2")}</div>
                </div>
                <div className="p-3 rounded bg-warning/10 border border-warning/20">
                  <div className="font-medium text-sm">{t("common:staff.toolRentals")}</div>
                  <div className="text-xs opacity-70">
                    <Link to="/tools" className="link">{t("common:staff.viewCurrentRentals")}</Link>
                  </div>
                </div>
                <div className="p-3 rounded bg-secondary/10 border border-secondary/20">
                  <div className="font-medium text-sm">{t("common:staff.courses")}</div>
                  <div className="text-xs opacity-70">
                    <Link to="/educational" className="link">{t("common:staff.manageCourses")}</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">🎯 {t("common:staff.quickActions")}</h2>
              <div className="space-y-2">
                {hasPermission("request_tool_rentals") && (
                  <Link to="/tools" className="btn btn-primary btn-sm w-full justify-start">
                    🔧 {t("common:staff.manageTools")}
                  </Link>
                )}
                {hasPermission("manage_courses") && (
                  <Link to="/educational" className="btn btn-secondary btn-sm w-full justify-start">
                    📚 {t("common:staff.courses")}
                  </Link>
                )}
                {hasPermission("access_worker_portal") && (
                  <Link to="/luz" className="btn btn-accent btn-sm w-full justify-start">
                    📅 {t("common:staff.fullCalendarView")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Section (Future: 70% width) */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl h-96">
            <div className="card-body">
              <h2 className="card-title">📅 {t("common:staff.calendarTimeline")}</h2>
              <div className="flex-1 flex items-center justify-center bg-base-200 rounded-lg">
                <div className="text-center space-y-4">
                  <div className="text-6xl">🚧</div>
                  <div>
                    <h3 className="text-xl font-bold">{t("common:staff.v2CalendarComingSoon")}</h3>
                    <p className="text-sm opacity-70 mt-2" dangerouslySetInnerHTML={{ __html: t("common:staff.v2CalendarDescription") }} />
                  </div>
                  <div className="not-prose">
                    <Link to="/luz" className="btn btn-primary btn-sm">
                      {t("common:staff.viewLuzCalendar")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Development Info */}
      <div className="mt-8 p-4 rounded bg-info/10 border border-info/20">
        <h3 className="font-semibold mb-2">🔨 {t("common:staff.developmentStatus")}</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>{t("common:staff.phase1")}</strong> {t("common:staff.phase1Text")} ✅
          </div>
          <div>
            <strong>{t("common:staff.phase2")}</strong> {t("common:staff.phase2Text")} 🚧
          </div>
          <div>
            <strong>{t("common:staff.phase3")}</strong> {t("common:staff.phase3Text")} 📋
          </div>
        </div>
      </div>
    </div>
  );
}

// Customer Home Page
function CustomerHomePage({ user, hasPermission }: { user: any, hasPermission: (p: string) => boolean }) {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="hero bg-base-200 rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <div className="flex justify-center mb-6">
              <KastelLogo size={120} className="drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-bold">{t("common:home.welcome")}</h1>
            <p className="py-6 text-lg">
              {t("common:home.welcomeDescription")}
            </p>
            <div className="not-prose space-x-4">
              <Link to="/tools" className="btn btn-primary">
                {t("common:home.browseTools")}
              </Link>
              <Link to="/educational" className="btn btn-secondary">
                {t("common:home.viewCourses")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Service Preview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🔧 {t("common:home.toolRentalTitle")}</h2>
            <p>{t("common:home.toolRentalDescription")}</p>
            <div className="card-actions justify-center">
              <Link to="/tools" className="btn btn-primary btn-sm">{t("common:home.browseTools")}</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">📚 {t("common:home.educationalTitle")}</h2>
            <p>{t("common:home.educationalDescription")}</p>
            <div className="card-actions justify-center">
              <Link to="/educational" className="btn btn-secondary btn-sm">{t("common:home.viewCourses")}</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🏪 {t("common:home.aboutUsTitle")}</h2>
            {(() => {
              const { text, needsTranslation } = useEditableContent("home.aboutUs");
              return (
                <EditableText contentKey="home.aboutUs" as="p" needsTranslation={needsTranslation}>
                  {text}
                </EditableText>
              );
            })()}
            <div className="card-actions justify-center">
              <button className="btn btn-accent btn-sm" disabled>{t("common:home.learnMore")}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{t("common:home.storeInformation")}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">{t("common:home.hours")}</h3>
              <p>{t("common:home.mondayFriday")}</p>
              <p>{t("common:home.saturday")}</p>
              <p>{t("common:home.sunday")}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">{t("common:home.contact")}</h3>
              <p>📞 (555) 123-4567</p>
              <p>📧 info@kastelhardware.com</p>
              <p>📍 123 Main Street, Hardware City</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
