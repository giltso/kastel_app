import { createFileRoute } from "@tanstack/react-router";
import { Authenticated } from "convex/react";
import { Calendar, Plus, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/events")({
  component: EventsPage,
});

function EventsPage() {
  return (
    <Authenticated>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="opacity-80">Create and manage work scheduling events</p>
          </div>
          <div className="not-prose">
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">Quick Actions</h3>
              <div className="not-prose grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <button className="btn btn-outline">
                  <Clock className="w-4 h-4" />
                  Schedule Work
                </button>
                <button className="btn btn-outline">
                  <Users className="w-4 h-4" />
                  Team Event
                </button>
                <button className="btn btn-outline">
                  <Calendar className="w-4 h-4" />
                  Recurring Task
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">Recent Events</h3>
              <div className="not-prose">
                <div className="p-8 text-center opacity-70">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No events created yet.</p>
                  <p className="text-sm">Create your first event to get started with scheduling.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Authenticated>
  );
}