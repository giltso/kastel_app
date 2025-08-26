import { createFileRoute } from "@tanstack/react-router";
import { Authenticated } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus, Target } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { CreateEventModal } from "@/components/CreateEventModal";
import { EditEventModal } from "@/components/EditEventModal";
import type { Doc } from "../../convex/_generated/dataModel";

const eventsQueryOptions = convexQuery(api.events.listEvents, {});

export const Route = createFileRoute("/calendar")({
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(eventsQueryOptions),
  component: CalendarPage,
});

type ViewType = "day" | "week" | "month";

function CalendarPage() {
  const [viewType, setViewType] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [prefilledEventData, setPrefilledEventData] = useState<{
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  }>({});
  const [editingEvent, setEditingEvent] = useState<(Doc<"events"> & {
    createdBy: Doc<"users"> | null;
    approvedBy: Doc<"users"> | null;
    assignedTo: Doc<"users"> | null;
    participants: Doc<"users">[];
  }) | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{date: Date, hour?: number} | null>(null);
  const [dragEnd, setDragEnd] = useState<{date: Date, hour?: number} | null>(null);
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  const today = new Date();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Add global mouse up handler to end dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case "day":
        newDate.setDate(newDate.getDate() - 1);
        break;
      case "week":
        newDate.setDate(newDate.getDate() - 7);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case "day":
        newDate.setDate(newDate.getDate() + 1);
        break;
      case "week":
        newDate.setDate(newDate.getDate() + 7);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    return events.filter(event => {
      // Check if event spans this date (start <= date <= end)
      return event.startDate <= dateString && event.endDate >= dateString;
    });
  };

  // Calculate event positioning and size based on start/end times
  const getEventStyle = (event: any, currentHour: number) => {
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    
    // Calculate total duration in minutes
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    
    // Calculate position relative to the current hour slot (48px height)
    const currentHourMinutes = currentHour * 60;
    const offsetFromHour = Math.max(0, startTotalMinutes - currentHourMinutes);
    const topPercent = (offsetFromHour / 60) * 100; // Percentage within the hour
    
    // Calculate height as percentage of total slots the event spans
    const endHourSlot = Math.floor(endTotalMinutes / 60);
    const startHourSlot = Math.floor(startTotalMinutes / 60);
    const spanningHours = endHourSlot - startHourSlot + 1;
    
    // If this is not the starting hour, don't render the event
    if (currentHour !== startHourSlot) {
      return null;
    }
    
    // Calculate the height - each hour slot is 48px (min-h-12)
    const heightPx = Math.max(24, (durationMinutes / 60) * 48); // Minimum 24px height
    
    return {
      top: `${topPercent}%`,
      height: `${heightPx}px`,
      left: '4px',
      right: '4px',
      position: 'absolute' as const,
      zIndex: 10
    };
  };

  const handleEventClick = (event: any) => {
    setEditingEvent(event);
  };

  const handleEmptySpaceClick = (date: Date, hour?: number) => {
    if (!isDragging) {
      // Set default values for new event based on clicked date/time
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const startTime = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : "09:00";
      const endTime = hour !== undefined ? `${String(hour + 1).padStart(2, '0')}:00` : "17:00";
      
      setPrefilledEventData({
        startDate: dateString,
        endDate: dateString,
        startTime: startTime,
        endTime: endTime,
      });
      setIsCreateModalOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-primary";
      case "pending_approval":
        return "bg-warning";
      case "in_progress":
        return "bg-info";
      case "completed":
        return "bg-success";
      case "cancelled":
        return "bg-error";
      default:
        return "bg-neutral";
    }
  };

  const handleDragStart = (date: Date, hour?: number) => {
    setIsDragging(true);
    setDragStart({ date, hour });
    setDragEnd({ date, hour });
  };

  const handleDragMove = (date: Date, hour?: number) => {
    if (isDragging) {
      setDragEnd({ date, hour });
    }
  };

  const handleDragEnd = () => {
    if (isDragging && dragStart && dragEnd) {
      // Calculate event details from drag selection
      let startDate = dragStart.date;
      let endDate = dragEnd.date;
      let startTime = "09:00";
      let endTime = "17:00";

      // For day/week views, use hour information
      if (dragStart.hour !== undefined && dragEnd.hour !== undefined) {
        const startHour = Math.min(dragStart.hour, dragEnd.hour);
        const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1; // End hour is exclusive
        startTime = String(startHour).padStart(2, '0') + ":00";
        endTime = String(endHour).padStart(2, '0') + ":00";
      }

      // For month view, if dragging across dates
      if (startDate > endDate) {
        [startDate, endDate] = [endDate, startDate];
      }

      // Set pre-filled data and open modal
      setPrefilledEventData({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startTime: startTime,
        endTime: endTime,
      });
      setIsCreateModalOpen(true);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isDragSelected = (date: Date, hour?: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;

    if (hour !== undefined && dragStart.hour !== undefined && dragEnd.hour !== undefined) {
      // For time-based views (day/week)
      const startHour = Math.min(dragStart.hour, dragEnd.hour);
      const endHour = Math.max(dragStart.hour, dragEnd.hour);
      
      const dateMatches = date.toDateString() === dragStart.date.toDateString() ||
                         date.toDateString() === dragEnd.date.toDateString() ||
                         (date.getTime() >= Math.min(dragStart.date.getTime(), dragEnd.date.getTime()) && 
                          date.getTime() <= Math.max(dragStart.date.getTime(), dragEnd.date.getTime()));
      
      return dateMatches && hour >= startHour && hour <= endHour;
    } else {
      // For month view
      const startDate = dragStart.date;
      const endDate = dragEnd.date;
      return date.getTime() >= Math.min(startDate.getTime(), endDate.getTime()) && 
             date.getTime() <= Math.max(startDate.getTime(), endDate.getTime());
    }
  };

  const renderCalendarView = () => {
    switch (viewType) {
      case "day":
        return renderDayView();
      case "week":
        return renderWeekView();
      case "month":
      default:
        return renderMonthView();
    }
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const _lastDayOfMonth = new Date(year, month + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
    
    const days = [];
    const currentDateForComparison = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateForComparison));
      currentDateForComparison.setDate(currentDateForComparison.getDate() + 1);
    }

    return (
      <>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center font-medium opacity-70">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.slice(0, 35).map((date, i) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === today.toDateString();
            const dayEvents = getEventsForDate(date);
          
            return (
              <div
                key={i}
                className={`
                  min-h-24 p-2 border border-base-300 rounded
                  ${isCurrentMonth ? 'bg-base-100' : 'bg-base-300 opacity-50'}
                  ${isToday ? 'ring-2 ring-primary' : ''}
                  ${isDragSelected(date) ? 'bg-primary/20 border-primary' : ''}
                  hover:bg-base-200 cursor-pointer transition-colors select-none
                `}
                onClick={() => handleEmptySpaceClick(date)}
                onMouseDown={() => handleDragStart(date)}
                onMouseEnter={() => handleDragMove(date)}
                onMouseUp={handleDragEnd}
              >
                <div className="text-sm font-medium mb-1">
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event._id}
                      className={`text-xs p-1 rounded text-white ${getStatusColor(event.status)} truncate cursor-pointer hover:opacity-80`}
                      title={`${event.title} (${event.startTime} - ${event.endTime})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      {event.title}
                      {event.startDate !== event.endDate && (
                        <span className="ml-1 opacity-70">...</span>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs opacity-60">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderWeekView = () => {
    // Get current week dates based on currentDate
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    return (
      <>
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="p-2"></div> {/* Time column header */}
          {weekDates.map((date, i) => (
            <div key={i} className="p-2 text-center">
              <div className="font-medium opacity-70">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
              </div>
              <div className={`text-sm ${date.toDateString() === today.toDateString() ? 'font-bold text-primary' : ''}`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="grid grid-cols-8 gap-2">
              <div className="p-2 text-sm opacity-70 text-right">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDates.map((date, dayIndex) => {
                const dayEvents = getEventsForDate(date);
                // Only show events that start in this hour
                const hourEvents = dayEvents.filter(event => {
                  const startHour = parseInt(event.startTime.split(':')[0]);
                  return hour === startHour;
                });

                return (
                  <div
                    key={dayIndex}
                    className={`
                      min-h-12 p-1 border border-base-300 rounded bg-base-100 hover:bg-base-200 cursor-pointer transition-colors relative select-none
                      ${isDragSelected(date, hour) ? 'bg-primary/20 border-primary' : ''}
                    `}
                    onClick={() => handleEmptySpaceClick(date, hour)}
                    onMouseDown={() => handleDragStart(date, hour)}
                    onMouseEnter={() => handleDragMove(date, hour)}
                    onMouseUp={handleDragEnd}
                  >
                    {hourEvents.map((event) => {
                      const eventStyle = getEventStyle(event, hour);
                      if (!eventStyle) return null;
                      
                      return (
                        <div
                          key={event._id}
                          style={eventStyle}
                          className={`text-xs p-1 rounded text-white ${getStatusColor(event.status)} truncate cursor-pointer hover:opacity-80`}
                          title={`${event.title} (${event.startTime} - ${event.endTime})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          {event.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderDayView = () => {
    const currentDateEvents = getEventsForDate(currentDate);

    return (
      <div className="space-y-1">
        <div className="p-2 text-center font-medium mb-4">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        
        {Array.from({ length: 24 }, (_, hour) => {
          // Only show events that start in this hour
          const hourEvents = currentDateEvents.filter(event => {
            const startHour = parseInt(event.startTime.split(':')[0]);
            return hour === startHour;
          });

          return (
            <div key={hour} className="grid grid-cols-2 gap-2">
              <div className="p-2 text-sm opacity-70 text-right">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              <div 
                className={`
                  min-h-12 p-2 border border-base-300 rounded bg-base-100 hover:bg-base-200 cursor-pointer transition-colors relative select-none
                  ${isDragSelected(currentDate, hour) ? 'bg-primary/20 border-primary' : ''}
                `}
                onClick={() => handleEmptySpaceClick(currentDate, hour)}
                onMouseDown={() => handleDragStart(currentDate, hour)}
                onMouseEnter={() => handleDragMove(currentDate, hour)}
                onMouseUp={handleDragEnd}
              >
                {hourEvents.map((event) => {
                  const eventStyle = getEventStyle(event, hour);
                  if (!eventStyle) return null;
                  
                  return (
                    <div
                      key={event._id}
                      style={eventStyle}
                      className={`text-xs p-1 rounded text-white ${getStatusColor(event.status)} truncate cursor-pointer hover:opacity-80`}
                      title={`${event.title} (${event.startTime} - ${event.endTime})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      {event.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
            <button 
              className="btn btn-primary"
              onClick={() => {
                setPrefilledEventData({});
                setIsCreateModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{currentMonth}</h2>
              <div className="not-prose flex gap-4 items-center">
                {/* View Toggle */}
                <div className="join">
                  <button 
                    className={`join-item btn btn-sm ${viewType === "day" ? "btn-active" : "btn-ghost"}`}
                    onClick={() => setViewType("day")}
                  >
                    Day
                  </button>
                  <button 
                    className={`join-item btn btn-sm ${viewType === "week" ? "btn-active" : "btn-ghost"}`}
                    onClick={() => setViewType("week")}
                  >
                    Week
                  </button>
                  <button 
                    className={`join-item btn btn-sm ${viewType === "month" ? "btn-active" : "btn-ghost"}`}
                    onClick={() => setViewType("month")}
                  >
                    Month
                  </button>
                </div>

                {/* Navigation */}
                <div className="flex gap-2">
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={navigatePrevious}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={goToToday}
                    title="Go to today"
                  >
                    <Target className="w-4 h-4" />
                    Today
                  </button>
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={navigateNext}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="not-prose">
              {renderCalendarView()}
            </div>

            {events.length === 0 && (
              <div className="mt-6 p-4 bg-base-100 rounded-lg text-center opacity-70">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No events scheduled yet.</p>
                <p className="text-sm">Events you create will appear on the calendar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Event Modal */}
        <CreateEventModal 
          isOpen={isCreateModalOpen} 
          onClose={() => {
            setIsCreateModalOpen(false);
            setPrefilledEventData({});
          }}
          prefilledData={prefilledEventData}
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