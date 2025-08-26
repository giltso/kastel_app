import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus, Target } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { CreateEventModal } from "@/components/CreateEventModal";
import { EditEventModal } from "@/components/EditEventModal";
import { usePermissions } from "@/hooks/usePermissions";
import type { Doc } from "../../convex/_generated/dataModel";

const eventsQueryOptions = convexQuery(api.events.listEvents, {});

export const Route = createFileRoute("/calendar")({
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(eventsQueryOptions),
  component: CalendarPage,
});

type ViewType = "day" | "week" | "month";

function CalendarPage() {
  const { user, effectiveRole, hasPermission, isLoading } = usePermissions();
  const navigate = useNavigate();
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
  const [draggedEvent, setDraggedEvent] = useState<any | null>(null);
  const [eventDragging, setEventDragging] = useState(false);
  const [resizing, setResizing] = useState<{event: any, type: 'start' | 'end'} | null>(null);
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  const updateEvent = useMutation(api.events.updateEvent);
  const today = new Date();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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

  // Add global mouse up handler to end dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
      if (eventDragging) {
        setEventDragging(false);
        setDraggedEvent(null);
      }
      if (resizing) {
        setResizing(null);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, eventDragging, resizing]);

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

  const canEditEvent = (event: any) => {
    return effectiveRole === "manager" || effectiveRole === "tester" || 
           event.createdBy?._id === user?._id || event.assignedTo?._id === user?._id;
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    return events.filter(event => {
      // Check if event spans this date (start <= date <= end)
      return event.startDate <= dateString && event.endDate >= dateString;
    });
  };

  // Calculate concurrent events and their positioning
  const getEventsWithPositioning = (events: any[], date: Date) => {
    if (!events.length) return [];
    
    // Group events by their start time to detect concurrency
    const eventGroups: Map<string, any[]> = new Map();
    
    events.forEach(event => {
      const startKey = `${event.startTime}-${event.endTime}`;
      if (!eventGroups.has(startKey)) {
        eventGroups.set(startKey, []);
      }
      eventGroups.get(startKey)!.push(event);
    });
    
    // Calculate positioning for each event
    const positionedEvents = [];
    let concurrentGroups: any[][] = [];
    
    // First pass: find overlapping groups
    events.forEach(event => {
      const [startHour, startMinute] = event.startTime.split(':').map(Number);
      const [endHour, endMinute] = event.endTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      // Find which group this event belongs to
      let foundGroup = false;
      for (const group of concurrentGroups) {
        const hasOverlap = group.some(groupEvent => {
          const [gStartHour, gStartMinute] = groupEvent.startTime.split(':').map(Number);
          const [gEndHour, gEndMinute] = groupEvent.endTime.split(':').map(Number);
          const gStartTotalMinutes = gStartHour * 60 + gStartMinute;
          const gEndTotalMinutes = gEndHour * 60 + gEndMinute;
          
          // Check if events overlap
          return (startTotalMinutes < gEndTotalMinutes) && (endTotalMinutes > gStartTotalMinutes);
        });
        
        if (hasOverlap) {
          group.push(event);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        concurrentGroups.push([event]);
      }
    });
    
    // Second pass: calculate positions within each group
    concurrentGroups.forEach(group => {
      const groupSize = group.length;
      group.forEach((event, index) => {
        const [startHour, startMinute] = event.startTime.split(':').map(Number);
        const [endHour, endMinute] = event.endTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const durationMinutes = endTotalMinutes - startTotalMinutes;
        const startHourSlot = Math.floor(startTotalMinutes / 60);
        
        // Calculate width and left position for concurrent events
        const width = Math.floor(100 / groupSize);
        const leftPercent = (index * width);
        
        const heightPx = Math.max(24, (durationMinutes / 60) * 48);
        
        positionedEvents.push({
          ...event,
          startHourSlot,
          style: {
            height: `${heightPx}px`,
            left: `${leftPercent}%`,
            width: `${width - 1}%`, // Small gap between concurrent events
            position: 'absolute' as const,
            zIndex: 10 + index
          }
        });
      });
    });
    
    return positionedEvents;
  };

  // Calculate event positioning and size based on start/end times
  const getEventStyle = (event: any, currentHour: number, allEvents: any[], date: Date) => {
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    
    // Calculate total duration in minutes
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    
    // Calculate position relative to the current hour slot (48px height)
    const currentHourMinutes = currentHour * 60;
    const offsetFromHour = Math.max(0, startTotalMinutes - currentHourMinutes);
    const topPercent = (offsetFromHour / 60) * 100;
    
    const startHourSlot = Math.floor(startTotalMinutes / 60);
    
    // If this is not the starting hour, don't render the event
    if (currentHour !== startHourSlot) {
      return null;
    }
    
    // Get positioned events for this date
    const positionedEvents = getEventsWithPositioning(allEvents, date);
    const positionedEvent = positionedEvents.find(pe => pe._id === event._id);
    
    if (!positionedEvent) {
      return null;
    }
    
    return {
      ...positionedEvent.style,
      top: `${topPercent}%`,
    };
  };

  const handleEventClick = (event: any) => {
    // Only allow editing if user has permission
    if (canEditEvent(event)) {
      // Close create modal if open before opening edit modal
      setIsCreateModalOpen(false);
      setPrefilledEventData({});
      setEditingEvent(event);
    }
  };

  const handleEmptySpaceClick = (date: Date, hour?: number) => {
    if (!isDragging) {
      // Close edit modal if open before opening create modal
      setEditingEvent(null);
      
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

  // Event drag handlers
  const handleEventDragStart = (event: any, e: React.DragEvent) => {
    // Only allow dragging if user has permission to edit the event
    if (!canEditEvent(event)) {
      e.preventDefault();
      return;
    }
    
    e.stopPropagation();
    setEventDragging(true);
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event._id);
  };

  const handleEventDragOver = (date: Date, hour?: number) => {
    if (eventDragging && draggedEvent) {
      // Visual feedback can be added here
    }
  };

  const handleEventDragEnd = () => {
    setEventDragging(false);
    setDraggedEvent(null);
  };

  // Resize handlers
  const handleResizeStart = (event: any, resizeType: 'start' | 'end', e: React.DragEvent) => {
    // Only allow resizing if user has permission to edit the event
    if (!canEditEvent(event)) {
      e.preventDefault();
      return;
    }
    
    e.stopPropagation();
    setResizing({ event, type: resizeType });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `resize-${resizeType}-${event._id}`);
  };

  const handleResizeDrop = async (date: Date, hour?: number) => {
    if (resizing) {
      try {
        const { event, type } = resizing;
        const dateString = date.toISOString().split('T')[0];
        const newHour = hour !== undefined ? hour : 9; // Default to 9 AM if no hour
        
        let newStartTime = event.startTime;
        let newEndTime = event.endTime;
        let newStartDate = event.startDate;
        let newEndDate = event.endDate;

        if (type === 'start') {
          // Resizing start time
          newStartTime = `${String(newHour).padStart(2, '0')}:00`;
          newStartDate = dateString;
          
          // Validate that start is before end
          const startDateTime = new Date(`${newStartDate}T${newStartTime}`);
          const endDateTime = new Date(`${event.endDate}T${event.endTime}`);
          if (startDateTime >= endDateTime) {
            alert("Start time must be before end time");
            return;
          }
        } else {
          // Resizing end time  
          newEndTime = `${String(newHour + 1).padStart(2, '0')}:00`; // End hour is exclusive
          newEndDate = dateString;
          
          // Validate that end is after start
          const startDateTime = new Date(`${event.startDate}T${event.startTime}`);
          const endDateTime = new Date(`${newEndDate}T${newEndTime}`);
          if (endDateTime <= startDateTime) {
            alert("End time must be after start time");
            return;
          }
        }

        // Update the event
        await updateEvent({
          eventId: event._id,
          title: event.title,
          description: event.description,
          startDate: newStartDate,
          endDate: newEndDate,
          startTime: newStartTime,
          endTime: newEndTime,
          type: event.type,
          isRecurring: false, // Reset recurring when resized
        });
      } catch (error) {
        console.error("Failed to resize event:", error);
        alert("Failed to resize event. Please try again.");
      }
      
      setResizing(null);
    }
  };

  const handleEventDrop = async (date: Date, hour?: number) => {
    if (eventDragging && draggedEvent) {
      try {
        const dateString = date.toISOString().split('T')[0];
        const startTime = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : draggedEvent.startTime;
        
        // Calculate duration of the original event
        const [originalStartHour, originalStartMinute] = draggedEvent.startTime.split(':').map(Number);
        const [originalEndHour, originalEndMinute] = draggedEvent.endTime.split(':').map(Number);
        const durationMinutes = (originalEndHour * 60 + originalEndMinute) - (originalStartHour * 60 + originalStartMinute);
        
        // Calculate new end time based on duration
        const newStartMinutes = (hour !== undefined ? hour * 60 : originalStartHour * 60 + originalStartMinute);
        const newEndMinutes = newStartMinutes + durationMinutes;
        const newEndHour = Math.floor(newEndMinutes / 60);
        const newEndMinute = newEndMinutes % 60;
        const endTime = `${String(newEndHour).padStart(2, '0')}:${String(newEndMinute).padStart(2, '0')}`;

        // Update the event with new date and time
        await updateEvent({
          eventId: draggedEvent._id,
          title: draggedEvent.title,
          description: draggedEvent.description,
          startDate: dateString,
          endDate: dateString, // For now, keep it as a single day event
          startTime: startTime,
          endTime: endTime,
          type: draggedEvent.type,
          isRecurring: false, // Reset recurring when moved
        });
      } catch (error) {
        console.error("Failed to move event:", error);
        alert("Failed to move event. Please try again.");
      }
      
      setEventDragging(false);
      setDraggedEvent(null);
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
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleEventDragOver(date, hour);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (resizing) {
                        handleResizeDrop(date, hour);
                      } else {
                        handleEventDrop(date, hour);
                      }
                    }}
                  >
                    {hourEvents.map((event) => {
                      const eventStyle = getEventStyle(event, hour, dayEvents, date);
                      if (!eventStyle) return null;
                      
                      return (
                        <div
                          key={event._id}
                          style={eventStyle}
                          className={`text-xs p-1 rounded text-white ${getStatusColor(event.status)} truncate ${canEditEvent(event) ? 'cursor-move' : 'cursor-pointer'} hover:opacity-80 ${draggedEvent?._id === event._id ? 'opacity-50' : ''} relative group`}
                          title={`${event.title} (${event.startTime} - ${event.endTime})`}
                          draggable={canEditEvent(event)}
                          onDragStart={(e) => handleEventDragStart(event, e)}
                          onDragEnd={handleEventDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          {/* Start resize handle - only for users who can edit */}
                          {canEditEvent(event) && (
                            <div
                              className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-t"
                              draggable
                              onDragStart={(e) => handleResizeStart(event, 'start', e)}
                              title="Drag to change start time"
                            />
                          )}
                          
                          {event.title}
                          
                          {/* End resize handle - only for users who can edit */}
                          {canEditEvent(event) && (
                            <div
                              className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-b"
                              draggable
                              onDragStart={(e) => handleResizeStart(event, 'end', e)}
                              title="Drag to change end time"
                            />
                          )}
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
      <div className="max-w-4xl mx-auto">
        <div className="p-2 text-center font-medium mb-4">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        
        <div className="space-y-1">
          {Array.from({ length: 24 }, (_, hour) => {
            // Only show events that start in this hour
            const hourEvents = currentDateEvents.filter(event => {
              const startHour = parseInt(event.startTime.split(':')[0]);
              return hour === startHour;
            });

            return (
              <div key={hour} className="grid grid-cols-12 gap-2">
                <div className="col-span-2 p-2 text-sm opacity-70 text-right">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div 
                  className={`
                    col-span-10 min-h-12 p-2 border border-base-300 rounded bg-base-100 hover:bg-base-200 cursor-pointer transition-colors relative select-none
                    ${isDragSelected(currentDate, hour) ? 'bg-primary/20 border-primary' : ''}
                  `}
                  onClick={() => handleEmptySpaceClick(currentDate, hour)}
                  onMouseDown={() => handleDragStart(currentDate, hour)}
                  onMouseEnter={() => handleDragMove(currentDate, hour)}
                  onMouseUp={handleDragEnd}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleEventDragOver(currentDate, hour);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (resizing) {
                      handleResizeDrop(currentDate, hour);
                    } else {
                      handleEventDrop(currentDate, hour);
                    }
                  }}
                >
                  {hourEvents.map((event) => {
                    const eventStyle = getEventStyle(event, hour, currentDateEvents, currentDate);
                    if (!eventStyle) return null;
                    
                    return (
                      <div
                        key={event._id}
                        style={eventStyle}
                        className={`text-xs p-1 rounded text-white ${getStatusColor(event.status)} truncate ${canEditEvent(event) ? 'cursor-move' : 'cursor-pointer'} hover:opacity-80 ${draggedEvent?._id === event._id ? 'opacity-50' : ''} relative group`}
                        title={`${event.title} (${event.startTime} - ${event.endTime})`}
                        draggable={canEditEvent(event)}
                        onDragStart={(e) => handleEventDragStart(event, e)}
                        onDragEnd={handleEventDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                      >
                        {/* Start resize handle - only for users who can edit */}
                        {canEditEvent(event) && (
                          <div
                            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-t"
                            draggable
                            onDragStart={(e) => handleResizeStart(event, 'start', e)}
                            title="Drag to change start time"
                          />
                        )}
                        
                        {event.title}
                        
                        {/* End resize handle - only for users who can edit */}
                        {canEditEvent(event) && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-b"
                            draggable
                            onDragStart={(e) => handleResizeStart(event, 'end', e)}
                            title="Drag to change end time"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Authenticated>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
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
                // Close edit modal if open before opening create modal
                setEditingEvent(null);
                setPrefilledEventData({});
                setIsCreateModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">{currentMonth}</h2>
            {/* View Toggle moved to left side */}
            <div className="not-prose">
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
            </div>
          </div>
          <div className="not-prose flex gap-2 items-center">
            {/* Navigation buttons on right side */}
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

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">

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