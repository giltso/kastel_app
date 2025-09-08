import { createFileRoute } from "@tanstack/react-router";
import { Authenticated } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FileText, Plus, Clock, Users, Settings, Calendar } from "lucide-react";
import { api } from "../../convex/_generated/api";

const formsQueryOptions = convexQuery(api.forms.listForms, {});

export const Route = createFileRoute("/forms")({
  component: FormsPage,
});

function FormsPage() {
  return (
    <Authenticated>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Forms</h1>
            <p className="opacity-80">Create and manage work forms for your team</p>
          </div>
          <div className="not-prose">
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Create Form
            </button>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">Form Templates</h3>
              <div className="not-prose grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <button className="btn btn-outline h-auto flex-col p-4">
                  <Clock className="w-8 h-8 mb-2" />
                  <div>
                    <div className="font-medium">Work Hours</div>
                    <div className="text-sm opacity-70">Daily/Weekly/Monthly</div>
                  </div>
                </button>
                <button className="btn btn-outline h-auto flex-col p-4">
                  <Users className="w-8 h-8 mb-2" />
                  <div>
                    <div className="font-medium">Team Report</div>
                    <div className="text-sm opacity-70">Team performance tracking</div>
                  </div>
                </button>
                <button className="btn btn-outline h-auto flex-col p-4">
                  <Settings className="w-8 h-8 mb-2" />
                  <div>
                    <div className="font-medium">Custom Form</div>
                    <div className="text-sm opacity-70">Build from scratch</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormsList />
            <FormsAnalytics />
          </div>
        </div>
      </div>
    </Authenticated>
  );
}

function FormsList() {
  const { data: forms } = useSuspenseQuery(formsQueryOptions);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "work_hours":
        return "badge-primary";
      case "team_report":
        return "badge-secondary";
      case "custom":
        return "badge-accent";
      default:
        return "badge-neutral";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "work_hours":
        return <Clock className="w-4 h-4" />;
      case "team_report":
        return <Users className="w-4 h-4" />;
      case "custom":
        return <Settings className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h3 className="card-title">Active Forms</h3>
        <div className="not-prose">
          {forms.length === 0 ? (
            <div className="p-8 text-center opacity-70">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No forms created yet.</p>
              <p className="text-sm">Create your first form to start collecting data.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <div key={form._id} className="card bg-base-100 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(form.type)}
                          <h4 className="font-semibold">{form.title}</h4>
                          <span className={`badge badge-sm ${getTypeColor(form.type)}`}>
                            {form.type.replace('_', ' ')}
                          </span>
                        </div>
                        {form.description && (
                          <p className="text-sm opacity-70 mb-2">{form.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm opacity-70">
                          <span>{form.fields.length} fields</span>
                          <span>Created by: {form.creator?.name}</span>
                          <span>
                            {new Date(form._creationTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-ghost">View</button>
                        <button className="btn btn-sm btn-ghost">Edit</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormsAnalytics() {
  const { data: forms } = useSuspenseQuery(formsQueryOptions);

  const activeForms = forms.filter(form => form.isActive).length;
  const totalForms = forms.length;

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h3 className="card-title">Form Analytics</h3>
        <div className="not-prose">
          <div className="stats stats-vertical w-full">
            <div className="stat">
              <div className="stat-title">Total Forms</div>
              <div className="stat-value">{totalForms}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Active Forms</div>
              <div className="stat-value">{activeForms}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Form Types</div>
              <div className="stat-value text-sm">
                {forms.length > 0 ? (
                  <div className="space-y-1">
                    {Array.from(new Set(forms.map(f => f.type))).map(type => (
                      <div key={type} className="flex justify-between">
                        <span>{type.replace('_', ' ')}</span>
                        <span>{forms.filter(f => f.type === type).length}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  "0"
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}