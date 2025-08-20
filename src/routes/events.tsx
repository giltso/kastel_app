import { createFileRoute } from "@tanstack/react-router";
import { Authenticated } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Calendar, Plus, Clock, Users, CheckCircle, Circle, AlertCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";

const eventsQueryOptions = convexQuery(api.events.listEvents, {});

export const Route = createFileRoute("/events")({
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(eventsQueryOptions),
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

          <EventsList />
        </div>
      </div>
    </Authenticated>
  );
}

function EventsList() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "in_progress":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case "cancelled":
        return <Circle className="w-4 h-4 text-error" />;
      default:
        return <Circle className="w-4 h-4 text-base-content opacity-70" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "work":
        return "badge-primary";
      case "meeting":
        return "badge-secondary";
      case "maintenance":
        return "badge-accent";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h3 className="card-title">Recent Events</h3>
        <div className="not-prose">
          {events.length === 0 ? (
            <div className="p-8 text-center opacity-70">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No events created yet.</p>
              <p className="text-sm">Create your first event to get started with scheduling.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event._id} className="card bg-base-100 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(event.status)}
                          <h4 className="font-semibold">{event.title}</h4>
                          <span className={`badge badge-sm ${getTypeColor(event.type)}`}>
                            {event.type}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm opacity-70 mb-2">{event.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm opacity-70">
                          <span>
                            {new Date(event.startTime).toLocaleDateString()} at{" "}
                            {new Date(event.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {event.assignee && (
                            <span>Assigned to: {event.assignee.name}</span>
                          )}
                          <span>Created by: {event.creator?.name}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-ghost">Edit</button>
                        <button className="btn btn-sm btn-ghost">Delete</button>
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