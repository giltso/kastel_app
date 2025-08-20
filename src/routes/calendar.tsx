import { createFileRoute } from "@tanstack/react-router";
import { Authenticated } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { api } from "../../convex/_generated/api";

const eventsQueryOptions = convexQuery(api.events.listEvents, {});

export const Route = createFileRoute("/calendar")({
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(eventsQueryOptions),
  component: CalendarPage,
});

function CalendarPage() {
  const today = new Date();
  const currentMonth = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Authenticated>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="opacity-80">View and interact with scheduled events</p>
          </div>
          <div className="not-prose flex gap-2">
            <button className="btn btn-outline">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{currentMonth}</h2>
              <div className="not-prose flex gap-2">
                <button className="btn btn-sm btn-ghost">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="btn btn-sm btn-ghost">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="not-prose">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center font-medium opacity-70">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }, (_, i) => {
                  const date = new Date(today.getFullYear(), today.getMonth(), i - 6);
                  const isCurrentMonth = date.getMonth() === today.getMonth();
                  const isToday = date.toDateString() === today.toDateString();
                  
                  return (
                    <div
                      key={i}
                      className={`
                        min-h-24 p-2 border border-base-300 rounded
                        ${isCurrentMonth ? 'bg-base-100' : 'bg-base-300 opacity-50'}
                        ${isToday ? 'ring-2 ring-primary' : ''}
                        hover:bg-base-200 cursor-pointer transition-colors
                      `}
                    >
                      <div className="text-sm font-medium mb-1">
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 p-4 bg-base-100 rounded-lg text-center opacity-70">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No events scheduled yet.</p>
              <p className="text-sm">Events you create will appear on the calendar.</p>
            </div>
          </div>
        </div>
      </div>
    </Authenticated>
  );
}