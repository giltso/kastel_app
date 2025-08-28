import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus, Target } from "lucide-react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  restrictToWindowEdges,
  restrictToFirstScrollableAncestor,
} from '@dnd-kit/modifiers';
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

// Draggable Event Component with Resize Handles
function DraggableEvent({ event, style, canEdit, onClick, className, setIsResizing, setResizeStartPos }: {
  event: any;
  style?: React.CSSProperties;
  canEdit: boolean;
  onClick: (e: React.MouseEvent) => void;
  className: string;
  setIsResizing: (resizing: {event: any, type: 'start' | 'end'} | null) => void;
  setResizeStartPos: (pos: {x: number, y: number} | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event._id,
    data: event,
    disabled: !canEdit,
  });

  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleResizeStart = (e: React.MouseEvent, type: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing({ event, type });
    setResizeStartPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...dragStyle }}
      className={`${className} ${canEdit ? 'hover:shadow-lg' : ''} relative group transition-all duration-200 border border-transparent hover:border-white/20`}
      title={`${event.title} (${event.startTime} - ${event.endTime})`}
      onClick={onClick}
      {...(canEdit ? listeners : {})}
      {...(canEdit ? attributes : {})}
    >
      {/* Top resize handle */}
      {canEdit && (
        <div
          className="absolute -top-1 left-0 right-0 h-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={{ cursor: 'ns-resize' }}
          onMouseDown={(e) => handleResizeStart(e, 'start')}
        >
          <div className="h-0.5 bg-white/40 rounded-full mx-2 mt-0.5"></div>
        </div>
      )}
      
      <div className={`px-2 py-1 text-xs leading-tight font-medium ${canEdit ? 'cursor-move' : 'cursor-pointer'}`}>
        {event.title}
        {event.startDate !== event.endDate && (
          <span className="ml-1 opacity-70">...</span>
        )}
      </div>
      
      {/* Bottom resize handle */}
      {canEdit && (
        <div
          className="absolute -bottom-1 left-0 right-0 h-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={{ cursor: 'ns-resize' }}
          onMouseDown={(e) => handleResizeStart(e, 'end')}
        >
          <div className="h-0.5 bg-white/40 rounded-full mx-2 mb-0.5"></div>
        </div>
      )}
    </div>
  );
}

// Droppable Time Slot Component
function DroppableTimeSlot({ date, hour, className, onClick, children }: {
  date: Date;
  hour?: number;
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${date.toISOString()}-${hour ?? 'allday'}`,
    data: { date, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'bg-primary/10 border-primary' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

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
  
  // @dnd-kit state management
  const [activeEvent, setActiveEvent] = useState<any | null>(null);
  const [isResizing, setIsResizing] = useState<{event: any, type: 'start' | 'end'} | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{x: number, y: number} | null>(null);
  
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  const updateEvent = useMutation(api.events.updateEvent);
  const today = new Date();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // @dnd-kit sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8, // 8px of movement required to start drag
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 100,
      tolerance: 8,
    },
  });
  
  const sensors = useSensors(mouseSensor, touchSensor);

  // Check authorization and redirect if necessary
  useEffect(() => {
    if (!isLoading && !hasPermission("access_worker_portal")) {
      void navigate({ to: "/unauthorized" });
    }
  }, [hasPermission, isLoading, navigate]);

  // Handle resize mouse events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && resizeStartPos) {
        e.preventDefault();
        // Calculate time change based on mouse movement (more sensitive)
        const deltaY = e.clientY - resizeStartPos.y;
        const minutesChange = Math.round(deltaY / 2); // 2px per minute for finer control
        
        if (Math.abs(minutesChange) >= 15) { // Snap to 15-minute intervals
          const hoursChange = minutesChange / 60;
          void handleEventResize(isResizing.event, isResizing.type, hoursChange);
          setResizeStartPos({ x: e.clientX, y: e.clientY });
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(null);
        setResizeStartPos(null);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resizeStartPos]);

  // @dnd-kit drag handlers
  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveEvent(active.data.current);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (over && active.data.current) {
      const draggedEvent = active.data.current;
      const dropTarget = over.data.current;
      
      if (dropTarget?.date) {
        void handleEventDrop(dropTarget.date, dropTarget.hour, draggedEvent);
      }
    }
    
    setActiveEvent(null);
  };

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

  // Empty space click handler for creating new events
  const handleEmptySpaceClick = (date: Date, hour?: number) => {
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
  };


  const handleEventDrop = async (date: Date, hour?: number, draggedEvent?: any) => {
    if (draggedEvent) {
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
    }
  };

  const handleEventResize = async (event: any, resizeType: 'start' | 'end', hoursChange: number) => {
    try {
      const [startHour, startMinute] = event.startTime.split(':').map(Number);
      const [endHour, endMinute] = event.endTime.split(':').map(Number);
      
      let newStartMinutes = startHour * 60 + startMinute;
      let newEndMinutes = endHour * 60 + endMinute;
      
      if (resizeType === 'start') {
        newStartMinutes += hoursChange * 60;
        // Clamp to valid range and ensure it's before end time
        newStartMinutes = Math.max(0, Math.min(newStartMinutes, newEndMinutes - 15));
      } else {
        newEndMinutes += hoursChange * 60;
        // Clamp to valid range and ensure it's after start time
        newEndMinutes = Math.max(newStartMinutes + 15, Math.min(1439, newEndMinutes)); // 1439 = 23:59
      }
      
      const newStartHour = Math.floor(newStartMinutes / 60);
      const newStartMin = newStartMinutes % 60;
      const newEndHour = Math.floor(newEndMinutes / 60);
      const newEndMin = newEndMinutes % 60;
      
      const newStartTime = `${String(newStartHour).padStart(2, '0')}:${String(newStartMin).padStart(2, '0')}`;
      const newEndTime = `${String(newEndHour).padStart(2, '0')}:${String(newEndMin).padStart(2, '0')}`;
      
      await updateEvent({
        eventId: event._id,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: newStartTime,
        endTime: newEndTime,
        type: event.type,
        isRecurring: event.isRecurring,
      });
    } catch (error) {
      console.error("Failed to resize event:", error);
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
              <DroppableTimeSlot
                key={i}
                date={date}
                className={`
                  min-h-24 p-2 border border-base-300 rounded
                  ${isCurrentMonth ? 'bg-base-100' : 'bg-base-300 opacity-50'}
                  ${isToday ? 'ring-2 ring-primary' : ''}
                  hover:bg-base-200 cursor-pointer transition-colors select-none
                `}
                onClick={() => handleEmptySpaceClick(date)}
              >
                <div className="text-sm font-medium mb-1">
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <DraggableEvent
                      key={event._id}
                      event={event}
                      canEdit={canEditEvent(event)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      className={`text-xs p-1 rounded text-white ${getStatusColor(event.status)} truncate hover:opacity-80`}
                      setIsResizing={setIsResizing}
                      setResizeStartPos={setResizeStartPos}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs opacity-60">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </DroppableTimeSlot>
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
      <div className="max-w-6xl mx-auto">
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
                  <DroppableTimeSlot
                    key={dayIndex}
                    date={date}
                    hour={hour}
                    className="min-h-12 p-1 border border-base-300 rounded bg-base-100 hover:bg-base-200 cursor-pointer transition-colors relative select-none"
                    onClick={() => handleEmptySpaceClick(date, hour)}
                  >
                    {hourEvents.map((event) => {
                      const eventStyle = getEventStyle(event, hour, dayEvents, date);
                      if (!eventStyle) return null;
                      
                      return (
                        <DraggableEvent
                          key={event._id}
                          event={event}
                          style={eventStyle}
                          canEdit={canEditEvent(event)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          className={`text-xs p-1 rounded text-white ${getStatusColor(event.status)} truncate hover:opacity-80`}
                          setIsResizing={setIsResizing}
                          setResizeStartPos={setResizeStartPos}
                        />
                      );
                    })}
                  </DroppableTimeSlot>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const currentDateEvents = getEventsForDate(currentDate);
    
    // Sort events by start time for the sidebar
    const sortedEvents = [...currentDateEvents].sort((a, b) => {
      const aTime = parseInt(a.startTime.replace(':', ''));
      const bTime = parseInt(b.startTime.replace(':', ''));
      return aTime - bTime;
    });

    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-2 text-center font-medium mb-6">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        
        <div className="grid grid-cols-12 gap-6">
          {/* Calendar Column */}
          <div className="col-span-8">
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
                    <DroppableTimeSlot
                      date={currentDate}
                      hour={hour}
                      className="col-span-10 min-h-12 p-2 border border-base-300 rounded bg-base-100 hover:bg-base-200 cursor-pointer transition-colors relative select-none"
                      onClick={() => handleEmptySpaceClick(currentDate, hour)}
                    >
                      {hourEvents.map((event) => {
                        const eventStyle = getEventStyle(event, hour, currentDateEvents, currentDate);
                        if (!eventStyle) return null;
                        
                        return (
                          <DraggableEvent
                            key={event._id}
                            event={event}
                            style={eventStyle}
                            canEdit={canEditEvent(event)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            className={`text-xs p-1 rounded text-white ${getStatusColor(event.status)} truncate hover:opacity-80`}
                            setIsResizing={setIsResizing}
                            setResizeStartPos={setResizeStartPos}
                          />
                        );
                      })}
                    </DroppableTimeSlot>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Events Sidebar */}
          <div className="col-span-4">
            <div className="sticky top-4">
              <div className="card bg-base-200 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Today's Events
                    <div className="badge badge-primary badge-sm">{sortedEvents.length}</div>
                  </h3>
                  
                  {sortedEvents.length === 0 ? (
                    <div className="text-center py-8 opacity-60">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No events scheduled</p>
                      <p className="text-xs">Click on the calendar to create one</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {sortedEvents.map((event) => (
                        <div 
                          key={event._id}
                          className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="card-body p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm leading-tight">{event.title}</h4>
                                <div className="text-xs opacity-70 mt-1">
                                  {event.startTime} - {event.endTime}
                                </div>
                                {event.description && (
                                  <p className="text-xs opacity-60 mt-2 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className={`badge badge-xs ${getStatusColor(event.status).replace('bg-', 'badge-')}`}>
                                  {event.status.replace('_', ' ')}
                                </div>
                                <div className="badge badge-xs badge-outline">
                                  {event.type}
                                </div>
                              </div>
                            </div>
                            
                            {event.participants && event.participants.length > 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                <div className="text-xs opacity-50">Participants:</div>
                                <div className="flex -space-x-1">
                                  {event.participants.slice(0, 3).map((participant: any) => (
                                    <div 
                                      key={participant._id} 
                                      className="w-4 h-4 rounded-full bg-primary text-primary-content text-xs flex items-center justify-center border border-base-100"
                                      title={participant.name}
                                    >
                                      {participant.name?.charAt(0).toUpperCase()}
                                    </div>
                                  ))}
                                  {event.participants.length > 3 && (
                                    <div className="w-4 h-4 rounded-full bg-base-300 text-xs flex items-center justify-center border border-base-100">
                                      +{event.participants.length - 3}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="card-actions justify-end mt-4">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setEditingEvent(null);
                        setPrefilledEventData({
                          startDate: currentDate.toISOString().split('T')[0],
                          endDate: currentDate.toISOString().split('T')[0],
                          startTime: "09:00",
                          endTime: "17:00",
                        });
                        setIsCreateModalOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      New Event
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Authenticated>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : !hasPermission("access_worker_portal") ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : (
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
        <div className="grid grid-cols-3 items-center mb-6 gap-4">
          {/* View Toggle - Left */}
          <div className="not-prose justify-self-start">
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
          
          {/* Title - Center */}
          <div className="justify-self-center">
            <h2 className="text-2xl font-bold text-center leading-tight">{currentMonth}</h2>
          </div>
          
          {/* Navigation - Right */}
          <div className="not-prose flex gap-2 items-center justify-self-end">
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
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

          <DragOverlay>
            {activeEvent ? (
              <div className={`text-xs px-3 py-2 rounded-lg text-white ${getStatusColor(activeEvent.status)} opacity-95 shadow-2xl border border-white/30 backdrop-blur-sm font-medium`}>
                {activeEvent.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

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
      )}
    </Authenticated>
  );
}