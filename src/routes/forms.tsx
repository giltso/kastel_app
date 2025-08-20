import { createFileRoute } from "@tanstack/react-router";
import { Authenticated } from "convex/react";
import { FileText, Plus, Clock, Users, Settings } from "lucide-react";

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
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h3 className="card-title">Recent Forms</h3>
                <div className="not-prose">
                  <div className="p-8 text-center opacity-70">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No forms created yet.</p>
                    <p className="text-sm">Create your first form to start collecting data.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h3 className="card-title">Form Analytics</h3>
                <div className="not-prose">
                  <div className="stats stats-vertical w-full">
                    <div className="stat">
                      <div className="stat-title">Total Forms</div>
                      <div className="stat-value">0</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Active Forms</div>
                      <div className="stat-value">0</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Responses</div>
                      <div className="stat-value">0</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Authenticated>
  );
}