import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Calendar, Plus, CheckCircle, Circle, AlertCircle, Repeat, Search, Filter, Trash2, Edit, Eye, EyeOff, Check, X } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { CreateEventModal } from "@/components/CreateEventModal";
import { EditEventModal } from "@/components/EditEventModal";
import { usePermissions, useCanApproveEvents } from "@/hooks/usePermissions";
import type { Id, Doc } from "../../convex/_generated/dataModel";

const eventsQueryOptions = convexQuery(api.events.listEvents, {});

export const Route = createFileRoute("/events")({
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(eventsQueryOptions),
  component: EventsPage,
});

function EventsPage() {
  const { hasPermission, isLoading } = usePermissions();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<(Doc<"events"> & {
    createdBy: Doc<"users"> | null;
    approvedBy: Doc<"users"> | null;
    assignedTo: Doc<"users"> | null;
    participants: Doc<"users">[];
  }) | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // Check authorization and redirect if necessary
  useEffect(() => {
    if (!isLoading && !hasPermission("access_worker_portal")) {
      void navigate({ to: "/unauthorized" });
    }
  }, [hasPermission, isLoading, navigate]);

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  // Don't render content if user doesn't have permission (will be redirected)
  if (!hasPermission("access_worker_portal")) {
    return null;
  }

  return (
    <Authenticated>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="opacity-80">Create and manage work scheduling events</p>
          </div>
          <div className="not-prose">
            <button 
              className="btn btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter & Search Events
              </h3>
              <div className="not-prose grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="label">
                    <span className="label-text">Search Events</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 opacity-60" />
                    <input
                      type="text"
                      placeholder="Search by title or description..."
                      className="input input-bordered w-full pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Event Type</span>
                  </label>
                  <select 
                    className="select select-bordered w-full"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="work">Work</option>
                    <option value="meeting">Meeting</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="team">Team</option>
                    <option value="educational">Educational</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Status</span>
                  </label>
                  <select 
                    className="select select-bordered w-full"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Actions</span>
                  </label>
                  <div className="space-y-2">
                    <button
                      className="btn btn-ghost btn-sm w-full"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterType("all");
                        setFilterStatus("all");
                      }}
                    >
                      Clear Filters
                    </button>
                    <button
                      className="btn btn-outline btn-sm w-full"
                      onClick={() => setBulkMode(!bulkMode)}
                    >
                      {bulkMode ? 'Exit' : 'Bulk Actions'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <EventsList 
            searchTerm={searchTerm}
            filterType={filterType}
            filterStatus={filterStatus}
            showPastEvents={showPastEvents}
            onTogglePastEvents={() => setShowPastEvents(!showPastEvents)}
            onEditEvent={setEditingEvent}
            bulkMode={bulkMode}
            selectedEvents={selectedEvents}
            onToggleEventSelection={(eventId) => {
              setSelectedEvents(prev => 
                prev.includes(eventId) 
                  ? prev.filter(id => id !== eventId)
                  : [...prev, eventId]
              );
            }}
            onSelectAllEvents={(eventIds) => setSelectedEvents(eventIds)}
            onClearSelection={() => setSelectedEvents([])}
          />
        </div>

        {/* Create Event Modal */}
        <CreateEventModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
        
        {/* Edit Event Modal */}
        {editingEvent && (
          <EditEventModal 
            isOpen={!!editingEvent} 
            onClose={() => setEditingEvent(null)} 
            event={editingEvent}
          />
        )}
      </div>
    </Authenticated>
  );
}

interface EventsListProps {
  searchTerm: string;
  filterType: string;
  filterStatus: string;
  showPastEvents: boolean;
  onTogglePastEvents: () => void;
  onEditEvent: (event: Doc<"events"> & {
    createdBy: Doc<"users"> | null;
    approvedBy: Doc<"users"> | null;
    assignedTo: Doc<"users"> | null;
    participants: Doc<"users">[];
  }) => void;
  bulkMode: boolean;
  selectedEvents: string[];
  onToggleEventSelection: (eventId: string) => void;
  onSelectAllEvents: (eventIds: string[]) => void;
  onClearSelection: () => void;
}

function EventsList({ searchTerm, filterType, filterStatus, showPastEvents, onTogglePastEvents, onEditEvent, bulkMode, selectedEvents, onToggleEventSelection, onSelectAllEvents, onClearSelection }: EventsListProps) {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  const { user, effectiveRole } = usePermissions();
  const canApprove = useCanApproveEvents();
  const deleteEvent = useMutation(api.events.deleteEvent);
  const updateEventStatus = useMutation(api.events.updateEventStatus);
  const approveEvent = useMutation(api.events.approveEvent);

  // Filter events based on search, filters, and date
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const filteredEvents = events.filter(event => {
    // Search filter - include creator and participant names
    const matchesSearch = searchTerm === "" || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.createdBy?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.assignedTo?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.participants?.some(p => p?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || event.type === filterType;
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    
    // Date filter - hide past events by default
    const isPastEvent = event.endDate < today;
    const matchesDateFilter = showPastEvents || !isPastEvent;
    
    return matchesSearch && matchesType && matchesStatus && matchesDateFilter;
  });

  const handleDeleteEvent = async (eventId: Id<"events">) => {
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      try {
        await deleteEvent({ eventId });
      } catch (error) {
        alert("Failed to delete event. You may not have permission to delete this event.");
        console.error("Delete failed:", error);
      }
    }
  };

  const handleToggleEventStatus = async (eventId: Id<"events">, currentStatus: string) => {
    try {
      let newStatus: "in_progress" | "completed" | "cancelled";
      
      // Cycle through status: approved -> in_progress -> completed
      if (currentStatus === "approved") {
        newStatus = "in_progress";
      } else if (currentStatus === "in_progress") {
        newStatus = "completed";
      } else {
        // If completed, reset to in_progress
        newStatus = "in_progress";
      }
      
      await updateEventStatus({ eventId, status: newStatus });
    } catch (error) {
      alert("Failed to update event status. You may not have permission to update this event.");
      console.error("Status update failed:", error);
    }
  };

  const handleApproveEvent = async (eventId: Id<"events">, approved: boolean) => {
    try {
      await approveEvent({ eventId, approved });
    } catch (error) {
      alert(`Failed to ${approved ? 'approve' : 'reject'} event. You may not have permission to approve events.`);
      console.error("Approval failed:", error);
    }
  };

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

  const handleBulkApprove = async () => {
    if (confirm(`Are you sure you want to approve ${selectedEvents.length} selected events?`)) {
      try {
        for (const eventId of selectedEvents) {
          await approveEvent({ eventId: eventId as Id<"events">, approved: true });
        }
        onClearSelection();
      } catch (error) {
        alert("Failed to approve some events. You may not have permission.");
        console.error("Bulk approve failed:", error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedEvents.length} selected events? This action cannot be undone.`)) {
      try {
        for (const eventId of selectedEvents) {
          await deleteEvent({ eventId: eventId as Id<"events"> });
        }
        onClearSelection();
      } catch (error) {
        alert("Failed to delete some events. You may not have permission.");
        console.error("Bulk delete failed:", error);
      }
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="card-title">Events</h3>
          <div className="not-prose">
            <button
              className="btn btn-sm btn-ghost"
              onClick={onTogglePastEvents}
            >
              {showPastEvents ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPastEvents ? 'Hide Past' : 'Show Past'}
            </button>
          </div>
        </div>
        
        {/* Bulk Actions UI */}
        {bulkMode && (
          <div className="mb-4 p-3 bg-base-100 rounded-lg border">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-medium">
                {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''} selected
              </span>
              <button 
                className="btn btn-xs btn-ghost"
                onClick={() => onSelectAllEvents(filteredEvents.map(e => e._id))}
              >
                Select All ({filteredEvents.length})
              </button>
              <button 
                className="btn btn-xs btn-ghost"
                onClick={onClearSelection}
              >
                Clear All
              </button>
            </div>
            {selectedEvents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {canApprove && (
                  <button 
                    className="btn btn-xs btn-success"
                    onClick={() => handleBulkApprove()}
                  >
                    Approve Selected ({selectedEvents.length})
                  </button>
                )}
                <button 
                  className="btn btn-xs btn-error"
                  onClick={() => handleBulkDelete()}
                >
                  Delete Selected ({selectedEvents.length})
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="not-prose">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center opacity-70">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              {events.length === 0 ? (
                <>
                  <p>No events created yet.</p>
                  <p className="text-sm">Create your first event to get started with scheduling.</p>
                </>
              ) : (
                <>
                  <p>No events match your current filters.</p>
                  <p className="text-sm">Try adjusting your search or filter criteria.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event._id} className="card bg-base-100 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Bulk selection checkbox */}
                        {bulkMode && (
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary mt-1"
                            checked={selectedEvents.includes(event._id)}
                            onChange={() => onToggleEventSelection(event._id)}
                          />
                        )}
                        <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {/* Status toggle checkbox - only for managers or event creators */}
                            {["approved", "in_progress", "completed"].includes(event.status) && 
                             (effectiveRole === "manager" || effectiveRole === "dev" || event.createdBy?._id === user?._id || event.assignedTo?._id === user?._id) && (
                              <button
                                className="btn btn-circle btn-xs btn-ghost p-0"
                                onClick={() => handleToggleEventStatus(event._id, event.status)}
                                title={`Mark as ${event.status === "approved" ? "in progress" : event.status === "in_progress" ? "completed" : "in progress"}`}
                              >
                                {getStatusIcon(event.status)}
                              </button>
                            )}
                            {!["approved", "in_progress", "completed"].includes(event.status) && (
                              <div>{getStatusIcon(event.status)}</div>
                            )}
                          </div>
                          <h4 className="font-semibold">{event.title}</h4>
                          <span className={`badge badge-sm ${getTypeColor(event.type)}`}>
                            {event.type}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm opacity-70 mb-2">{event.description}</p>
                        )}
                        <div className="flex flex-col gap-1 text-sm opacity-70">
                          <div className="flex items-center gap-4">
                            <span>
                              {event.startDate} at {event.startTime}
                              {event.startDate !== event.endDate && ` - ${event.endDate}`} at {event.endTime}
                            </span>
                            {event.isRecurring && (
                              <span className="badge badge-sm badge-accent">
                                <Repeat className="w-3 h-3 mr-1" />
                                Weekly
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            {event.assignedTo && (
                              <span>Assigned to: {event.assignedTo.name}</span>
                            )}
                            <span>Created by: {event.createdBy?.name}</span>
                            {event.participants && event.participants.length > 0 && (
                              <span>Participants: {event.participants.map(p => p?.name).filter(Boolean).join(', ')}</span>
                            )}
                          </div>
                          {event.isRecurring && event.recurringDays && (
                            <div className="text-xs">
                              Repeats on: {event.recurringDays.map(d => 
                                d.charAt(0).toUpperCase() + d.slice(1)
                              ).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {/* Show approve/reject buttons only to managers for pending events */}
                        {event.status === "pending_approval" && canApprove && (
                          <>
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => handleApproveEvent(event._id, true)}
                              title="Approve event"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </button>
                            <button 
                              className="btn btn-sm btn-error"
                              onClick={() => handleApproveEvent(event._id, false)}
                              title="Reject event"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        
                        {/* Only show edit/delete if user is manager OR it's their own event */}
                        {(effectiveRole === "manager" || effectiveRole === "dev" || event.createdBy?._id === user?._id) && (
                          <>
                            <button 
                              className="btn btn-sm btn-ghost"
                              onClick={() => onEditEvent({
                                ...event,
                                approvedBy: event.approvedBy?._id || null
                              })}
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            {(effectiveRole === "manager" || effectiveRole === "dev") && (
                              <button 
                                className="btn btn-sm btn-ghost text-error hover:bg-error hover:text-error-content"
                                onClick={() => handleDeleteEvent(event._id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
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