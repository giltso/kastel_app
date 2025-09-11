import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus, Target, Search, User, Check, X, UserPlus } from "lucide-react";
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
} from '@dnd-kit/modifiers';
import { api } from "../../convex/_generated/api";
import { CreateEventModal } from "@/components/CreateEventModal";
import { EditEventModal } from "@/components/EditEventModal";
import { ShiftAssignmentModal } from "@/components/ShiftAssignmentModal";
import { ShiftDetailsModal } from "@/components/ShiftDetailsModal";
import { ShiftSwitchModal } from "@/components/ShiftSwitchModal";
import { ShiftModificationModal } from "@/components/ShiftModificationModal";
import { usePermissions } from "@/hooks/usePermissions";
import type { Doc } from "../../convex/_generated/dataModel";

const calendarQueryOptions = (startDate: string, endDate: string, view: "day" | "week" | "month") => 
  convexQuery(api.calendar_unified.getUnifiedCalendarData, {
    startDate,
    endDate,
    view,
    filters: {
      showEvents: true,
      showShifts: true,
      showTools: true,
      showPendingOnly: false
    }
  });

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

type ViewType = "day" | "week" | "month";

// Draggable Event Component with Resize Handles
function DraggableEvent({ event, style, canEdit, onClick, className, setIsResizing, setResizeStartPos, isCurrentlyResizing, onNestedClick, getItemColor, onApprove, bulkMode, isSelected, onToggleSelection }: {
  event: any;
  style?: React.CSSProperties;
  canEdit: boolean;
  onClick: (e: React.MouseEvent) => void;
  className: string;
  setIsResizing: (resizing: {event: any, type: 'start' | 'end'} | null) => void;
  setResizeStartPos: (pos: {x: number, y: number} | null) => void;
  isCurrentlyResizing?: boolean;
  onNestedClick?: (item: any) => void;
  getItemColor: (item: any, isNestedInShift?: boolean) => string;
  onApprove?: (item: any, approve: boolean) => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event._id,
    data: event,
    disabled: !canEdit, // Allow dragging shifts for managers
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

  // Special rendering for shifts with nested events
  if (event.type === 'shift') {
    const {
      isOver,
      setNodeRef: setDropNodeRef,
    } = useDroppable({
      id: `shift-${event._id}`,
      data: { 
        type: 'shift',
        shift: event,
        date: event.startDate || new Date().toISOString().split('T')[0]
      },
    });

    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          setDropNodeRef(node);
        }}
        style={{ ...style, ...dragStyle }}
        className={`${className} relative transition-all duration-200 shadow-lg hover:shadow-xl
          border-2 border-solid ${
          isOver && !isCurrentlyResizing ? 'border-primary/90 shadow-primary/40 scale-[1.02]' : // Highlight when event is dragged over
          event.status === 'bad' ? 'border-error/70 shadow-error/20' :
          event.status === 'close' ? 'border-warning/70 shadow-warning/20' :
          event.status === 'good' ? 'border-success/70 shadow-success/20' :
          event.status === 'warning' ? 'border-warning/70 shadow-warning/20' :
          'border-info/70 shadow-info/20'
        } rounded-lg overflow-hidden cursor-pointer backdrop-blur-sm bg-base-100/80
        ${isOver && !isCurrentlyResizing ? 'bg-primary/10' : ''}`}
        title={`${event.title} (${event.startTime} - ${event.endTime}) - ${event.currentWorkers}/${event.requiredWorkers} workers`}
        onClick={onClick}
      >
        {/* Enhanced shift background with container visual cues */}
        <div className="absolute inset-0 bg-gradient-to-br from-current/10 via-current/5 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-1 bg-current/30" />
        <div className="absolute inset-y-0 left-0 w-1 bg-current/30" />
        
        {/* Shift header with worker info */}
        <div className={`px-2 py-1 text-xs font-medium bg-current/20 text-base-content border-b border-current/30`}>
          <div className="flex items-center justify-between">
            <span className="truncate">{event.title}</span>
            <span className={`badge badge-xs ${
              event.status === 'bad' ? 'badge-error' :
              event.status === 'close' ? 'badge-warning' :
              event.status === 'good' ? 'badge-success' :
              event.status === 'warning' ? 'badge-warning' :
              'badge-info'
            }`}>
              {event.currentWorkers}/{event.requiredWorkers}
            </span>
          </div>
          
          {/* Worker avatars/names */}
          {event.assignments && event.assignments.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="flex -space-x-1">
                {event.assignments.slice(0, 3).map((assignment: any) => (
                  <div 
                    key={assignment.workerId} 
                    className="w-4 h-4 rounded-full bg-primary text-primary-content text-xs flex items-center justify-center border border-base-100 font-medium"
                    title={assignment.worker?.name || 'Unknown'}
                  >
                    {(assignment.worker?.name || '?').charAt(0).toUpperCase()}
                  </div>
                ))}
                {event.assignments.length > 3 && (
                  <div className="w-4 h-4 rounded-full bg-base-300 text-xs flex items-center justify-center border border-base-100 font-medium">
                    +{event.assignments.length - 3}
                  </div>
                )}
              </div>
              {event.assignments.length <= 2 && (
                <span className="text-xs opacity-60 ml-1">
                  {event.assignments.map((a: any) => a.worker?.name).filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          )}
          
          {/* No workers assigned indicator */}
          {(!event.assignments || event.assignments.length === 0) && (
            <div className="text-xs opacity-60 mt-1 italic">
              No workers assigned
            </div>
          )}
        </div>
        
        {/* Enhanced nested events container with improved visual hierarchy */}
        <div className="p-2 space-y-1 bg-base-100/20 backdrop-blur-sm">
          {event.nestedEvents && event.nestedEvents.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-base-content/70">
                <div className="w-3 h-px bg-current/40" />
                <span>Scheduled Activities ({event.nestedEvents.length})</span>
                <div className="flex-1 h-px bg-current/20" />
              </div>
              {event.nestedEvents.map((nestedEvent: any, index: number) => (
                <div
                  key={nestedEvent._id}
                  className={`relative group transition-all duration-200 hover:shadow-md hover:scale-[1.02]`}
                  style={{ marginLeft: `${Math.min(index * 6, 18)}px` }} // Enhanced progressive indentation
                >
                  {/* Connection line to show nesting hierarchy */}
                  <div className="absolute -left-3 top-1/2 w-2 h-px bg-current/30 transform -translate-y-1/2" />
                  {index > 0 && (
                    <div className="absolute -left-3 -top-2 w-px h-4 bg-current/20" />
                  )}
                  
                  <div
                    className={`text-xs px-3 py-2 rounded-md ${getItemColor(nestedEvent, true)} text-white/95 truncate 
                      border border-white/30 shadow-sm backdrop-blur-sm
                      hover:border-white/50 transition-all duration-200 cursor-pointer
                      ${isCurrentlyResizing ? 'pointer-events-none' : ''}`}
                    title={`${nestedEvent.title} (${nestedEvent.startTime} - ${nestedEvent.endTime})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNestedClick?.(nestedEvent);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{nestedEvent.title}</span>
                      <span className="text-xs opacity-75 whitespace-nowrap">
                        {nestedEvent.startTime}-{nestedEvent.endTime}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-xs px-3 py-2 text-base-content/50 italic text-center bg-base-100/10 rounded-md border border-dashed border-current/20">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-current/20" />
                <span>No scheduled activities</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...dragStyle }}
      className={`${className} ${canEdit ? 'hover:shadow-lg' : ''} ${isCurrentlyResizing ? 'ring-2 ring-white/40 shadow-xl' : ''} relative group transition-all duration-200 border border-transparent hover:border-white/20`}
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
      
      <div className={`${
        event.type === 'tool_rental' ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
      } leading-tight font-medium ${canEdit ? 'cursor-move' : 'cursor-pointer'}`}>
        <div className="flex items-center gap-2">
          {/* Bulk selection checkbox */}
          {bulkMode && event.canApprove && event.pendingApproval && (
            <input
              type="checkbox"
              className="checkbox checkbox-xs flex-shrink-0"
              checked={isSelected || false}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelection?.(event.id);
              }}
            />
          )}
          
          <div className="flex-1 truncate">
            {event.type === 'tool_rental' ? (
              <span className="flex items-center gap-1">
                🔧 <span className="truncate">{event.toolRentalData?.toolName || event.title}</span>
              </span>
            ) : (
              <>
                {event.title}
                {event.startDate !== event.endDate && (
                  <span className="ml-1 opacity-70">...</span>
                )}
              </>
            )}
          </div>
          
          {/* Inline Approval Buttons for Managers */}
          {event.canApprove && event.pendingApproval && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                className="btn btn-xs btn-success opacity-90 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove?.(event, true);
                }}
                title="Approve"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                className="btn btn-xs btn-error opacity-90 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove?.(event, false);
                }}
                title="Reject"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {/* Status indicator for pending items */}
          {event.pendingApproval && !event.canApprove && (
            <div className="badge badge-xs badge-warning flex-shrink-0" title="Pending Approval">
              ⏳
            </div>
          )}
        </div>
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
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState<{
    shift: any;
    date: Date;
  } | null>(null);
  
  // Shift details modal state (comprehensive shift modal with editing)
  const [isShiftDetailsModalOpen, setIsShiftDetailsModalOpen] = useState(false);
  const [shiftDetailsData, setShiftDetailsData] = useState<{
    shift: any;
    date: Date;
  } | null>(null);
  
  // Shift switch modal state
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [switchAssignmentData, setSwitchAssignmentData] = useState<any>(null);
  
  // Shift modification modal state
  const [isShiftModificationModalOpen, setIsShiftModificationModalOpen] = useState(false);
  const [pendingShiftModification, setPendingShiftModification] = useState<{
    shift: any;
    newDate?: string;
    newStartTime?: string;
    newEndTime?: string;
    modificationType: 'drag' | 'edit' | 'time_change';
  } | null>(null);
  
  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    showEvents: true,
    showShifts: true,
    showToolRentals: true,
  });
  const [dateFilter, setDateFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("all");
  
  // @dnd-kit state management
  const [activeEvent, setActiveEvent] = useState<any | null>(null);
  const [isResizing, setIsResizing] = useState<{event: any, type: 'start' | 'end'} | null>(null);
  const [, setResizeStartPos] = useState<{x: number, y: number} | null>(null);
  const [resizePreviewTime, setResizePreviewTime] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{targetDate: Date, targetTime: string} | null>(null);
  const [resizePreviewDate, setResizePreviewDate] = useState<{targetDate: Date, type: 'start' | 'end'} | null>(null);
  
  // Bulk operations state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Calculate date range based on current view
  const getDateRange = () => {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    
    if (viewType === "month") {
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
    } else if (viewType === "week") {
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek);
      endDate.setDate(startDate.getDate() + 6);
    }
    // For day view, use current date
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };
  
  const dateRange = getDateRange();
  const { data: queryResult } = useSuspenseQuery(
    calendarQueryOptions(dateRange.startDate, dateRange.endDate, viewType)
  );
  
  const calendarItems = queryResult?.items || [];
  const calendarSummary = queryResult?.summary || { totalItems: 0, pendingApprovals: 0, itemTypes: { events: 0, shifts: 0, toolRentals: 0 } };
  const updateEvent = useMutation(api.events.updateEvent);
  const createShiftReplacement = useMutation(api.events.createShiftReplacement);
  const nestEventInShift = useMutation(api.events.nestEventInShift);
  const unnestEventFromShift = useMutation(api.events.unnestEventFromShift);
  
  // Approval workflow mutations
  const approveCalendarItem = useMutation(api.calendar_unified.approveCalendarItem);
  const bulkApproveCalendarItems = useMutation(api.calendar_unified.bulkApproveCalendarItems);
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

  // Handle resize mouse events with multi-day support
  useEffect(() => {
    let lastUpdateTime = 0;
    const throttleDelay = 100; // Throttle updates to every 100ms
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && viewType === 'day') {
        e.preventDefault();
        
        const now = Date.now();
        if (now - lastUpdateTime < throttleDelay) return;
        lastUpdateTime = now;
        
        // Check for cross-day resize (similar to cross-day drag logic)
        const calendarCard = document.querySelector('.card.bg-base-200');
        if (!calendarCard) return;
        
        const cardRect = calendarCard.getBoundingClientRect();
        const relativeX = e.clientX - cardRect.left;
        const cardWidth = cardRect.width;
        const deadZone = 80;
        
        let targetDate = new Date(currentDate);
        let isMultiDay = false;
        
        if (relativeX < deadZone && relativeX > 0) {
          // Resizing to previous day
          targetDate.setDate(targetDate.getDate() - 1);
          isMultiDay = true;
          setResizePreviewDate({ targetDate: new Date(targetDate), type: isResizing.type });
        } else if (relativeX > cardWidth - deadZone && relativeX < cardWidth) {
          // Resizing to next day  
          targetDate.setDate(targetDate.getDate() + 1);
          isMultiDay = true;
          setResizePreviewDate({ targetDate: new Date(targetDate), type: isResizing.type });
        } else {
          // Normal resize within same day
          setResizePreviewDate(null);
          
          // Find the calendar container to calculate relative position
          const calendarContainer = document.querySelector('[data-calendar-container]');
          if (!calendarContainer) return;
          
          const rect = calendarContainer.getBoundingClientRect();
          const relativeY = e.clientY - rect.top;
          
          // Account for any spacing between hour rows (space-y-1 = 4px gap)
          const hourRowHeight = 52;
          const hourIndex = Math.floor(relativeY / hourRowHeight);
          const pixelsIntoHour = relativeY % hourRowHeight;
          
          // Calculate minutes based on position within the hour slot
          const minutesIntoHour = Math.round((pixelsIntoHour / 48) * 60);
          
          // Snap to 15-minute intervals
          const snappedMinutes = Math.min(45, Math.max(0, Math.round(minutesIntoHour / 15) * 15));
          const targetHour = Math.max(0, Math.min(23, hourIndex));
          
          const newTime = `${String(targetHour).padStart(2, '0')}:${String(snappedMinutes).padStart(2, '0')}`;
          
          // Show preview time and update if different from current
          setResizePreviewTime(newTime);
          const currentTime = isResizing.type === 'start' ? isResizing.event.startTime : isResizing.event.endTime;
          if (newTime !== currentTime) {
            void handleEventResizeToTime(isResizing.event, isResizing.type, newTime);
          }
        }
        
        // Handle multi-day resize
        if (isMultiDay) {
          const calendarContainer = document.querySelector('[data-calendar-container]');
          if (calendarContainer) {
            const containerRect = calendarContainer.getBoundingClientRect();
            const relativeY = Math.max(0, e.clientY - containerRect.top);
            const hourRowHeight = 52;
            const hourIndex = Math.max(0, Math.min(23, Math.floor(relativeY / hourRowHeight)));
            const minutesIntoHour = Math.round(((relativeY % hourRowHeight) / hourRowHeight) * 60);
            const snappedMinutes = Math.min(45, Math.max(0, Math.round(minutesIntoHour / 15) * 15));
            const targetTime = `${String(hourIndex).padStart(2, '0')}:${String(snappedMinutes).padStart(2, '0')}`;
            
            // Update event with new date and time
            const targetDateString = targetDate.toISOString().split('T')[0];
            void handleEventResizeToTime(isResizing.event, isResizing.type, targetTime, targetDateString);
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(null);
        setResizeStartPos(null);
        setResizePreviewTime(null);
        setResizePreviewDate(null);
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
  }, [isResizing, viewType, currentDate]);

  // Handle cross-day dragging (only in day view)
  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (activeEvent && !isResizing && viewType === 'day') {
        // Find the calendar card container
        const calendarCard = document.querySelector('.card.bg-base-200');
        if (!calendarCard) return;
        
        const cardRect = calendarCard.getBoundingClientRect();
        const relativeX = e.clientX - cardRect.left;
        const cardWidth = cardRect.width;
        const deadZone = 80; // 80px from card edges
        
        if (relativeX < deadZone && relativeX > 0) {
          // Dragging to previous day (left side of calendar)
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          
          // Calculate time based on Y position within calendar
          const calendarContainer = document.querySelector('[data-calendar-container]');
          if (calendarContainer) {
            const containerRect = calendarContainer.getBoundingClientRect();
            const relativeY = Math.max(0, e.clientY - containerRect.top);
            const hourRowHeight = 52;
            const hourIndex = Math.max(0, Math.min(23, Math.floor(relativeY / hourRowHeight)));
            const minutesIntoHour = Math.round(((relativeY % hourRowHeight) / hourRowHeight) * 60);
            const snappedMinutes = Math.min(45, Math.max(0, Math.round(minutesIntoHour / 15) * 15));
            const targetTime = `${String(hourIndex).padStart(2, '0')}:${String(snappedMinutes).padStart(2, '0')}`;
            
            setDragPreview({ targetDate: prevDate, targetTime });
          }
        } else if (relativeX > cardWidth - deadZone && relativeX < cardWidth) {
          // Dragging to next day (right side of calendar)
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          
          // Calculate time based on Y position within calendar
          const calendarContainer = document.querySelector('[data-calendar-container]');
          if (calendarContainer) {
            const containerRect = calendarContainer.getBoundingClientRect();
            const relativeY = Math.max(0, e.clientY - containerRect.top);
            const hourRowHeight = 52;
            const hourIndex = Math.max(0, Math.min(23, Math.floor(relativeY / hourRowHeight)));
            const minutesIntoHour = Math.round(((relativeY % hourRowHeight) / hourRowHeight) * 60);
            const snappedMinutes = Math.min(45, Math.max(0, Math.round(minutesIntoHour / 15) * 15));
            const targetTime = `${String(hourIndex).padStart(2, '0')}:${String(snappedMinutes).padStart(2, '0')}`;
            
            setDragPreview({ targetDate: nextDate, targetTime });
          }
        } else {
          setDragPreview(null);
        }
      }
    };

    if (activeEvent && !isResizing && viewType === 'day') {
      document.addEventListener('mousemove', handleDragMove);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
      };
    }
  }, [activeEvent, isResizing, currentDate, viewType]);

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
      
      // Handle dropping an event onto a shift container (drag-in)
      if (dropTarget?.type === 'shift' && draggedEvent.type !== 'shift') {
        void handleEventToShiftDrop(draggedEvent, dropTarget);
      }
      // Handle dropping an event onto a calendar cell (potentially drag-out)
      else if (dropTarget?.date) {
        void handleEventDrop(dropTarget.date, dropTarget.hour, draggedEvent);
      }
    } else if (dragPreview && active.data.current) {
      // Handle cross-day drag
      void handleEventDrop(dragPreview.targetDate, undefined, active.data.current, dragPreview.targetTime);
      
      // Navigate to the target date if it's different from current date
      if (dragPreview.targetDate.toDateString() !== currentDate.toDateString()) {
        setCurrentDate(new Date(dragPreview.targetDate));
      }
    }
    
    setActiveEvent(null);
    setDragPreview(null);
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setHours(0, 0, 0, 0); // Ensure consistent time
    
    switch (viewType) {
      case "day":
        newDate.setDate(newDate.getDate() - 1);
        break;
      case "week":
        // Navigate to previous full week (7 days back)
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
    newDate.setHours(0, 0, 0, 0); // Ensure consistent time
    
    switch (viewType) {
      case "day":
        newDate.setDate(newDate.getDate() + 1);
        break;
      case "week":
        // Navigate to next full week (7 days forward)
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

  const canEditItem = (item: any) => {
    if (item.type === 'shift') {
      // For shifts, only managers can edit the shift definition itself
      // Workers can sign up/assign themselves (handled separately)
      return effectiveRole === "manager" || effectiveRole === "dev";
    }
    // For events, original logic applies
    return effectiveRole === "manager" || effectiveRole === "dev" || 
           item.createdBy?._id === user?._id || item.assignedTo?._id === user?._id;
  };

  const getItemsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const allItems = calendarItems.filter(item => {
      // Check if item spans this date (start <= date <= end)
      return item.startDate <= dateString && item.endDate >= dateString;
    });

    // Apply type filters
    let filteredItems = allItems.filter(item => {
      if (item.type === 'shift' && !filters.showShifts) return false;
      if (item.type === 'tool_rental' && !filters.showToolRentals) return false;
      if (item.type === 'event' && !filters.showEvents) return false;
      return true;
    });

    // Apply creator filter
    if (creatorFilter === "me" && user) {
      filteredItems = filteredItems.filter(item => 
        item.createdBy?._id === user._id ||
        item.participants?.some((p: any) => p._id === user._id)
      );
    }

    // Apply weighted fuzzy search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      
      filteredItems = filteredItems.filter(item => {
        // Calculate weighted search score
        let score = 0;
        
        // Name of activity (highest weight: 4)
        const title = (item.toolRentalData?.toolName || item.title || '').toLowerCase();
        if (title.includes(searchLower)) score += 4;
        
        // Creator name (weight: 3)
        const creatorName = (item.createdBy?.name || '').toLowerCase();
        if (creatorName.includes(searchLower)) score += 3;
        
        // Type of activity (weight: 2)
        const type = (item.type || '').toLowerCase();
        if (type.includes(searchLower)) score += 2;
        
        // Participants (weight: 2)
        const participantMatch = item.participants?.some((p: any) => 
          (p.name || '').toLowerCase().includes(searchLower)
        );
        if (participantMatch) score += 2;
        
        // Description (weight: 1)
        const description = (item.description || '').toLowerCase();
        if (description.includes(searchLower)) score += 1;
        
        // Tool category for tool rentals (weight: 1)
        if (item.toolRentalData?.toolCategory) {
          const category = item.toolRentalData.toolCategory.toLowerCase();
          if (category.includes(searchLower)) score += 1;
        }
        
        return score > 0;
      });
    }

    return filteredItems;
  };

  // Calculate concurrent items and their positioning
  const getItemsWithPositioning = (items: any[]) => {
    if (!items.length) return [];
    
    // Group items by their start time to detect concurrency
    const itemGroups: Map<string, any[]> = new Map();
    
    items.forEach(item => {
      const startKey = `${item.startTime}-${item.endTime}`;
      if (!itemGroups.has(startKey)) {
        itemGroups.set(startKey, []);
      }
      itemGroups.get(startKey)!.push(item);
    });
    
    // Calculate positioning for each item
    const positionedItems: any[] = [];
    let concurrentGroups: any[][] = [];
    
    // First pass: find overlapping groups
    items.forEach(item => {
      const [startHour, startMinute] = item.startTime.split(':').map(Number);
      const [endHour, endMinute] = item.endTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      // Find which group this item belongs to
      let foundGroup = false;
      for (const group of concurrentGroups) {
        const hasOverlap = group.some(groupItem => {
          const [gStartHour, gStartMinute] = groupItem.startTime.split(':').map(Number);
          const [gEndHour, gEndMinute] = groupItem.endTime.split(':').map(Number);
          const gStartTotalMinutes = gStartHour * 60 + gStartMinute;
          const gEndTotalMinutes = gEndHour * 60 + gEndMinute;
          
          // Check if items overlap
          return (startTotalMinutes < gEndTotalMinutes) && (endTotalMinutes > gStartTotalMinutes);
        });
        
        if (hasOverlap) {
          group.push(item);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        concurrentGroups.push([item]);
      }
    });
    
    // Second pass: calculate positions within each group
    concurrentGroups.forEach(group => {
      const groupSize = group.length;
      group.forEach((item, index) => {
        const [startHour, startMinute] = item.startTime.split(':').map(Number);
        const [endHour, endMinute] = item.endTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const durationMinutes = endTotalMinutes - startTotalMinutes;
        const startHourSlot = Math.floor(startTotalMinutes / 60);
        
        // Calculate width and left position for concurrent items
        const width = Math.floor(100 / groupSize);
        const leftPercent = (index * width);
        
        const heightPx = Math.max(24, (durationMinutes / 60) * 48);
        
        positionedItems.push({
          ...item,
          startHourSlot,
          position: {
            left: index,
            width: 1,
            totalColumns: groupSize
          },
          style: {
            height: `${heightPx}px`,
            left: `${leftPercent}%`,
            width: `${width - 1}%`, // Small gap between concurrent items
            position: 'absolute' as const,
            zIndex: item.type === 'shift' ? 5 + index : 10 + index // Shifts lower z-index
          }
        });
      });
    });
    
    return positionedItems;
  };

  // Calculate item positioning and size based on start/end times
  const getItemStyle = (item: any, currentHour: number, allItems: any[], date: Date) => {
    const [startHour, startMinute] = item.startTime.split(':').map(Number);
    const [endHour, endMinute] = item.endTime.split(':').map(Number);
    
    // Calculate total duration in minutes
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    
    // Calculate position relative to the current hour slot (48px height)
    const currentHourMinutes = currentHour * 60;
    const offsetFromHour = Math.max(0, startTotalMinutes - currentHourMinutes);
    const topPercent = (offsetFromHour / 60) * 100;
    
    const startHourSlot = Math.floor(startTotalMinutes / 60);
    
    // If this is not the starting hour, don't render the item
    if (currentHour !== startHourSlot) {
      return null;
    }
    
    // Get positioned items for this date
    const positionedItems = getItemsWithPositioning(allItems);
    const positionedItem = positionedItems.find(pi => pi._id === item._id);
    
    if (!positionedItem) {
      return null;
    }
    
    // For shifts in week view, calculate height to span multiple hours
    let height = positionedItem.style.height;
    if (item.type === 'shift' && durationMinutes > 60) {
      // Calculate height based on duration - each hour slot is approximately 48px
      const hourSlotHeight = 48;
      const heightInPixels = (durationMinutes / 60) * hourSlotHeight;
      height = `${heightInPixels}px`;
    }
    
    return {
      ...positionedItem.style,
      top: `${topPercent}%`,
      height: height,
      zIndex: item.type === 'shift' ? 30 : positionedItem.style.zIndex, // Higher z-index for shifts to appear above hour slot backgrounds
    };
  };

  const handleRequestShiftSwitch = (assignment: any) => {
    setSwitchAssignmentData(assignment);
    setIsSwitchModalOpen(true);
  };

  const handleItemClick = (item: any) => {
    if (item.type === 'shift') {
      // For shifts, open comprehensive shift details modal
      console.log('Clicked shift:', item);
      
      // Find the date for this shift - use item's date or current view date
      const shiftDate = item.startDate ? new Date(item.startDate) : currentDate;
      
      setShiftDetailsData({
        shift: item,
        date: shiftDate
      });
      setIsShiftDetailsModalOpen(true);
      return;
    }
    
    if (item.type === 'tool_rental') {
      // For tool rentals, show tool rental details modal
      console.log('Clicked tool rental:', item);
      // TODO: Open tool rental modal with rental details, status, and management options
      alert(`Tool Rental: ${item.toolRentalData?.toolName}\nStatus: ${item.toolRentalData?.status}\nDaily Rate: $${item.toolRentalData?.dailyRate}`);
      return;
    }
    
    // For regular events, only allow editing if user has permission
    if (canEditItem(item)) {
      // Close create modal if open before opening edit modal
      setIsCreateModalOpen(false);
      setPrefilledEventData({});
      setEditingEvent(item);
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

  const getItemColor = (item: any, isNestedInShift = false) => {
    if (item.type === 'shift') {
      // Shift-specific styling with semi-transparent background
      if (item.status === 'bad') return "bg-error/40 border-error/60";
      if (item.status === 'close') return "bg-warning/40 border-warning/60";
      if (item.status === 'good') return "bg-success/40 border-success/60";
      if (item.status === 'warning') return "bg-warning/40 border-warning/60";
      return "bg-neutral/40 border-neutral/60";
    }
    if (item.type === 'tool_rental') {
      // Tool rental styling - compact accent colors based on status
      const baseOpacity = isNestedInShift ? '/80' : '/60';
      const borderOpacity = isNestedInShift ? '/90' : '/80';
      if (item.toolRentalData?.status === 'pending') return `bg-warning${baseOpacity} border-warning${borderOpacity}`;
      if (item.toolRentalData?.status === 'approved') return `bg-info${baseOpacity} border-info${borderOpacity}`;
      if (item.toolRentalData?.status === 'active') return `bg-success${baseOpacity} border-success${borderOpacity}`;
      if (item.toolRentalData?.status === 'returned') return `bg-accent/40 border-accent${borderOpacity}`;
      if (item.toolRentalData?.status === 'overdue') return `bg-error${baseOpacity} border-error${borderOpacity}`;
      return `bg-accent${baseOpacity} border-accent${borderOpacity}`;
    }
    // For regular events, use appropriate opacity based on nesting
    const statusColor = getStatusColor(item.status);
    if (isNestedInShift) {
      // Make nested events more prominent within shifts
      return statusColor.replace('bg-', 'bg-').replace(/\/\d+/, '/90');
    }
    return statusColor;
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

  // Approval workflow handlers
  const handleApproveCalendarItem = async (item: any, approve: boolean, reason?: string) => {
    try {
      await approveCalendarItem({
        itemId: item.id,
        itemType: item.type === 'tool_rental' ? 'tool_rental' : 'event',
        approve,
        reason
      });
      
      // Show success feedback
      console.log(`${item.type} ${approve ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error('Failed to process approval:', error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} ${item.type}. You may not have permission.`);
    }
  };

  const handleBulkApprove = async (items: any[], approve: boolean) => {
    try {
      const bulkItems = items.map(item => ({
        itemId: item.id,
        itemType: item.type === 'tool_rental' ? 'tool_rental' as const : 'event' as const
      }));
      
      await bulkApproveCalendarItems({
        items: bulkItems,
        approve
      });
      
      console.log(`Bulk ${approve ? 'approval' : 'rejection'} completed for ${items.length} items`);
      // Clear selection after successful bulk operation
      setSelectedItems(new Set());
      setBulkMode(false);
    } catch (error) {
      console.error('Bulk approval failed:', error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} selected items.`);
    }
  };

  // Bulk operations helpers
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAllPendingItems = () => {
    const pendingItems = calendarItems.filter(item => item.pendingApproval && item.canApprove);
    setSelectedItems(new Set(pendingItems.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setBulkMode(false);
  };

  const getSelectedItemsData = () => {
    return calendarItems.filter(item => selectedItems.has(item.id));
  };

  const handleEventDrop = async (date: Date, hour?: number, draggedEvent?: any, customTime?: string) => {
    if (draggedEvent) {
      const dateString = date.toISOString().split('T')[0];
      const startTime = customTime || (hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : draggedEvent.startTime);
      
      // Special handling for shift dragging - show confirmation modal
      if (draggedEvent.type === 'shift') {
        // Calculate duration and new end time
        const [originalStartHour, originalStartMinute] = draggedEvent.startTime.split(':').map(Number);
        const [originalEndHour, originalEndMinute] = draggedEvent.endTime.split(':').map(Number);
        const durationMinutes = (originalEndHour * 60 + originalEndMinute) - (originalStartHour * 60 + originalStartMinute);
        
        const newStartMinutes = (hour !== undefined ? hour * 60 : originalStartHour * 60 + originalStartMinute);
        const newEndMinutes = newStartMinutes + durationMinutes;
        const newEndHour = Math.floor(newEndMinutes / 60);
        const newEndMinute = newEndMinutes % 60;
        const newEndTime = `${String(newEndHour).padStart(2, '0')}:${String(newEndMinute).padStart(2, '0')}`;
        
        setPendingShiftModification({
          shift: draggedEvent,
          newDate: dateString,
          newStartTime: startTime,
          newEndTime: newEndTime,
          modificationType: 'drag'
        });
        setIsShiftModificationModalOpen(true);
        return;
      }
      
      // Check if this is a nested event being dragged out of a shift (drag-out)
      const wasNested = calendarItems.some((item: any) => 
        item.type === 'shift' && 
        item.nestedEvents?.some((nested: any) => nested._id === draggedEvent._id)
      );

      if (wasNested) {
        // This is an event being dragged out of a shift - unnest it
        try {
          await unnestEventFromShift({
            eventId: draggedEvent._id,
            date: dateString,
          });
        } catch (error) {
          console.error("Failed to unnest event from shift:", error);
          if (error instanceof Error) {
            alert(`Failed to remove event from shift: ${error.message}`);
          } else {
            alert("Failed to remove event from shift. Please try again.");
          }
          return;
        }
      }

      try {
        
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

  const handleShiftModificationConfirm = async () => {
    if (!pendingShiftModification) return;
    
    const { shift, newDate, newStartTime, newEndTime } = pendingShiftModification;
    
    try {
      await createShiftReplacement({
        parentShiftId: shift._id,
        date: newDate!,
        startTime: newStartTime,
        endTime: newEndTime,
        title: shift.title,
        description: shift.description,
        requiredWorkers: shift.requiredWorkers,
        maxWorkers: shift.maxWorkers,
      });
    } catch (error) {
      console.error("Failed to create shift exception:", error);
      alert("Failed to create shift exception. Please try again.");
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const handleEventToShiftDrop = async (draggedEvent: any, dropTarget: any) => {
    const { shift, date } = dropTarget;
    
    try {
      await nestEventInShift({
        eventId: draggedEvent._id,
        shiftId: shift._id,
        date: date,
      });
    } catch (error) {
      console.error("Failed to nest event in shift:", error);
      if (error instanceof Error) {
        alert(`Failed to add event to shift: ${error.message}`);
      } else {
        alert("Failed to add event to shift. Please try again.");
      }
    }
  };

  const handleEventResizeToTime = async (event: any, resizeType: 'start' | 'end', newTime: string, newDate?: string) => {
    try {
      let newStartTime = event.startTime;
      let newEndTime = event.endTime;
      let newStartDate = event.startDate;
      let newEndDate = event.endDate;
      
      if (resizeType === 'start') {
        newStartTime = newTime;
        if (newDate) {
          newStartDate = newDate;
          // If start date becomes after end date, adjust end date
          if (new Date(newDate) > new Date(event.endDate)) {
            newEndDate = newDate;
          }
        } else {
          // Same day resize - ensure start is before end
          const [startHour, startMinute] = newTime.split(':').map(Number);
          const [endHour, endMinute] = event.endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          
          if (startMinutes >= endMinutes - 15) {
            return; // Don't allow invalid times
          }
        }
      } else {
        newEndTime = newTime;
        if (newDate) {
          newEndDate = newDate;
          // If end date becomes before start date, adjust start date
          if (new Date(newDate) < new Date(event.startDate)) {
            newStartDate = newDate;
          }
        } else {
          // Same day resize - ensure end is after start
          const [startHour, startMinute] = event.startTime.split(':').map(Number);
          const [endHour, endMinute] = newTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          
          if (endMinutes <= startMinutes + 15) {
            return; // Don't allow invalid times
          }
        }
      }
      
      // Only update if something actually changed
      if (newStartTime !== event.startTime || newEndTime !== event.endTime || 
          newStartDate !== event.startDate || newEndDate !== event.endDate) {
        await updateEvent({
          eventId: event._id,
          title: event.title,
          description: event.description,
          startDate: newStartDate,
          endDate: newEndDate,
          startTime: newStartTime,
          endTime: newEndTime,
          type: event.type,
          isRecurring: newStartDate !== newEndDate ? false : event.isRecurring, // Multi-day events can't recur
        });
      }
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

    // Get all items for the month for the event area
    const monthItems = days.flatMap(date => getItemsForDate(date));
    const sortedMonthItems = [...monthItems].sort((a, b) => {
      const aTime = parseInt(a.startTime.replace(':', ''));
      const bTime = parseInt(b.startTime.replace(':', ''));
      return aTime - bTime;
    });

    return (
      <div className="grid grid-cols-12 gap-6">
        {/* Event Area - Left Side (30%) */}
        <div className="col-span-4">
          {renderEventArea(sortedMonthItems, 'month')}
        </div>
        
        {/* Calendar Column - Right Side (70%) */}
        <div className="col-span-8">
        {/* Month View Header - Planning Focus */}
        <div className="mb-4 card bg-base-200 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Month Planning Overview
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success/60"></div>
                  <span className="text-xs opacity-70">Shifts Staffed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning/60"></div>
                  <span className="text-xs opacity-70">Needs Staff</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/60"></div>
                  <span className="text-xs opacity-70">Courses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent/60"></div>
                  <span className="text-xs opacity-70">Tools</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Week headers with Monday first */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-2 text-center font-medium opacity-70">
              {day}
            </div>
          ))}
        </div>

        {/* Enhanced month grid for planning */}
        <div className="grid grid-cols-7 gap-2">
          {days.slice(0, 35).map((date, i) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === today.toDateString();
            const dayItems = getItemsForDate(date);
            
            // Categorize items for quick overview
            const shifts = dayItems.filter(item => item.type === 'shift');
            const courses = dayItems.filter(item => item.type === 'course'); // TODO: Add course integration
            const tools = dayItems.filter(item => item.type === 'tool_rental');
            const events = dayItems.filter(item => !['shift', 'course', 'tool_rental'].includes(item.type));
            
            // Calculate shift status for the day
            const shiftStatus = shifts.length > 0 
              ? shifts.some(s => s.status === 'bad') ? 'error'
              : shifts.some(s => s.status === 'close') ? 'warning' 
              : shifts.some(s => s.status === 'good') ? 'success'
              : shifts.some(s => s.status === 'warning') ? 'warning'
              : 'info' : null;
          
            return (
              <DroppableTimeSlot
                key={i}
                date={date}
                className={`
                  min-h-28 p-2 border rounded transition-all duration-200 select-none cursor-pointer
                  ${isCurrentMonth ? (
                    shiftStatus === 'error' ? 'bg-error/10 border-error/30' :
                    shiftStatus === 'warning' ? 'bg-warning/10 border-warning/30' :
                    shiftStatus === 'success' ? 'bg-success/10 border-success/30' :
                    shifts.length > 0 ? 'bg-info/10 border-info/30' :
                    'bg-base-100 border-base-300'
                  ) : 'bg-base-300/30 opacity-50 border-base-300/50'}
                  ${isToday ? 'ring-2 ring-primary shadow-lg' : ''}
                  hover:opacity-90 hover:shadow-sm
                `}
                onClick={() => {
                  // Navigate to day view for this date
                  setCurrentDate(new Date(date));
                  setViewType("day");
                }}
              >
                {/* Date header */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
                    {date.getDate()}
                  </div>
                  {/* Quick status indicators */}
                  <div className="flex gap-1">
                    {shifts.length > 0 && (
                      <div className={`w-2 h-2 rounded-full ${
                        shiftStatus === 'error' ? 'bg-error' :
                        shiftStatus === 'warning' ? 'bg-warning' :
                        shiftStatus === 'success' ? 'bg-success' : 'bg-info'
                      }`} title={`${shifts.length} shifts`} />
                    )}
                    {courses.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-primary" title={`${courses.length} courses`} />
                    )}
                    {tools.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-accent" title={`${tools.length} tool rentals`} />
                    )}
                  </div>
                </div>

                {/* Cursory overview of activities */}
                <div className="space-y-1">
                  {/* Shift overview */}
                  {shifts.length > 0 && (
                    <div className={`text-xs px-1 py-0.5 rounded ${
                      shiftStatus === 'error' ? 'bg-error/20 text-error' :
                      shiftStatus === 'warning' ? 'bg-warning/20 text-warning' :
                      shiftStatus === 'success' ? 'bg-success/20 text-success' : 'bg-info/20 text-info'
                    }`}>
                      {shifts.length === 1 ? '1 shift' : `${shifts.length} shifts`}
                      {shifts.length === 1 && (
                        <span className="opacity-70 ml-1">
                          {shifts[0].currentWorkers || 0}/{shifts[0].requiredWorkers || 0}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Course overview */}
                  {courses.length > 0 && (
                    <div className="text-xs px-1 py-0.5 rounded bg-primary/20 text-primary">
                      {courses.length === 1 ? '1 course' : `${courses.length} courses`}
                    </div>
                  )}
                  
                  {/* Tool overview */}
                  {tools.length > 0 && (
                    <div className="text-xs px-1 py-0.5 rounded bg-accent/20 text-accent">
                      {tools.length === 1 ? '1 tool' : `${tools.length} tools`}
                    </div>
                  )}
                  
                  {/* Other events (condensed) */}
                  {events.length > 0 && (
                    <div className="text-xs opacity-60">
                      {events.length > 2 ? `${events.length} events` : events.map(e => e.title).join(', ')}
                    </div>
                  )}
                  
                  {/* Show total if multiple categories */}
                  {dayItems.length > 4 && (
                    <div className="text-xs opacity-40 mt-1">
                      {dayItems.length} total
                    </div>
                  )}
                </div>
              </DroppableTimeSlot>
            );
          })}
        </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    // Get current week dates based on currentDate (Monday-first consecutive week)
    const startOfWeek = new Date(currentDate);
    // Calculate days since Monday (getDay() returns 0=Sunday, 1=Monday, etc.)
    const daysSinceMonday = (currentDate.getDay() + 6) % 7;
    startOfWeek.setDate(currentDate.getDate() - daysSinceMonday);
    // Ensure we're at midnight to avoid timezone issues
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0); // Ensure consistent time
      return date;
    });

    // Get all items for the week for the event area
    const weekItems = weekDates.flatMap(date => getItemsForDate(date));
    const sortedWeekItems = [...weekItems].sort((a, b) => {
      const aTime = parseInt(a.startTime.replace(':', ''));
      const bTime = parseInt(b.startTime.replace(':', ''));
      return aTime - bTime;
    });

    return (
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-6">
          {/* Event Area - Left Side (30%) */}
          <div className="col-span-4">
            {renderEventArea(sortedWeekItems, 'week')}
          </div>
          
          {/* Calendar Column - Right Side (70%) */}
          <div className="col-span-8">
        {/* Week View Header - Shift Focus */}
        <div className="mb-4 card bg-base-200 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Week Shift Schedule
              </h3>
              {effectiveRole === "worker" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70">Your shifts:</span>
                  <div className="badge badge-primary badge-sm">
                    {/* TODO: Count user's shifts this week */}5
                  </div>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      // Find user's assignments for this week and let them pick one to switch
                      const userAssignments = calendarItems
                        .filter((item: any) => item.type === 'shift' && item.assignments?.some((a: any) => a.workerId === user?._id))
                        .map((shift: any) => shift.assignments?.find((a: any) => a.workerId === user?._id))
                        .filter(Boolean);
                      
                      if (userAssignments.length === 0) {
                        alert("You don't have any shift assignments this week to switch.");
                        return;
                      }
                      
                      if (userAssignments.length === 1) {
                        // If only one assignment, use it directly
                        handleRequestShiftSwitch(userAssignments[0]);
                      } else {
                        // Multiple assignments - for now just use the first one
                        // TODO: Add a picker modal for multiple assignments
                        handleRequestShiftSwitch(userAssignments[0]);
                      }
                    }}
                  >
                    Request Switch
                  </button>
                </div>
              )}
            </div>
            
            {/* Week Summary Bar */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDates.map((date, i) => {
                const dayItems = getItemsForDate(date);
                const dayShifts = dayItems.filter(item => item.type === 'shift');
                const shiftStatus = dayShifts.length > 0 
                  ? dayShifts.some(s => s.status === 'bad') ? 'error'
                  : dayShifts.some(s => s.status === 'close') ? 'warning'
                  : dayShifts.some(s => s.status === 'good') ? 'success'
                  : dayShifts.some(s => s.status === 'warning') ? 'warning'
                  : 'info' : 'neutral';
                
                return (
                  <div key={i} className={`p-2 rounded text-center text-xs border ${
                    date.toDateString() === today.toDateString() ? 'ring-2 ring-primary' : ''
                  }`}>
                    <div className="font-medium opacity-70">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                    </div>
                    <div className={`text-sm font-bold ${date.toDateString() === today.toDateString() ? 'text-primary' : ''}`}>
                      {date.getDate()}
                    </div>
                    <div className={`badge badge-xs mt-1 ${
                      shiftStatus === 'error' ? 'badge-error' :
                      shiftStatus === 'warning' ? 'badge-warning' :
                      shiftStatus === 'success' ? 'badge-success' :
                      shiftStatus === 'info' ? 'badge-info' : 'badge-neutral'
                    }`}>
                      {dayShifts.length}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enhanced Week Grid Header */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="p-2 text-center">
            <div className="text-xs font-medium opacity-70">Time</div>
            <div className="text-xs opacity-50">Shift Status</div>
          </div>
          {weekDates.map((date, i) => (
            <div key={i} className="p-2 text-center">
              <div className="font-medium opacity-70">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </div>
              <div className={`text-sm ${date.toDateString() === today.toDateString() ? 'font-bold text-primary' : ''}`}>
                {date.getDate()}
              </div>
              {/* Shift availability indicator */}
              <div className="text-xs opacity-50 mt-1">
                {getItemsForDate(date).filter(item => item.type === 'shift').length > 0 ? 'Shifts' : 'Open'}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1" data-calendar-container>
          {Array.from({ length: 19 }, (_, hourIndex) => {
            const hour = hourIndex + 5; // Start at 5 AM, end at 11 PM
            return (
              <div key={hour} className="grid grid-cols-8 gap-2">
              <div className="p-2 text-sm opacity-70 text-right flex flex-col items-end">
                <div className="font-medium">
                  {hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                {/* Show shift population status for this hour */}
                <div className="text-xs opacity-50">
                  {/* TODO: Calculate total workers needed vs assigned across all shifts this hour */}
                  {Math.floor(Math.random() * 8) + 1}/8
                </div>
              </div>
              {weekDates.map((date, dayIndex) => {
                const dayItems = getItemsForDate(date);
                // Only show items that start in this hour
                const hourItems = dayItems.filter(item => {
                  const startHour = parseInt(item.startTime.split(':')[0]);
                  return hour === startHour;
                });
                
                // Get shift items for this hour (including ongoing ones)
                const allHourItems = dayItems.filter(item => {
                  const [startHour, startMinute] = item.startTime.split(':').map(Number);
                  const [endHour, endMinute] = item.endTime.split(':').map(Number);
                  const startTotalMinutes = startHour * 60 + startMinute;
                  const endTotalMinutes = endHour * 60 + endMinute;
                  const currentHourMinutes = hour * 60;
                  
                  // Check if this hour falls within the item's time range
                  return currentHourMinutes >= startTotalMinutes && currentHourMinutes < endTotalMinutes;
                });
                
                const shiftsInHour = allHourItems.filter(item => item.type === 'shift');
                const hasActiveShift = shiftsInHour.length > 0;
                
                // Calculate shift population for background color
                const shiftPopulationStatus = hasActiveShift 
                  ? shiftsInHour.some(s => s.status === 'bad') ? 'bg-error/10 border-error/30'
                  : shiftsInHour.some(s => s.status === 'close') ? 'bg-warning/10 border-warning/30'
                  : shiftsInHour.some(s => s.status === 'good') ? 'bg-success/10 border-success/30'
                  : shiftsInHour.some(s => s.status === 'warning') ? 'bg-warning/10 border-warning/30'
                  : 'bg-info/10 border-info/30'
                  : 'bg-base-100 border-base-300';

                return (
                  <DroppableTimeSlot
                    key={dayIndex}
                    date={date}
                    hour={hour}
                    className={`min-h-12 p-1 border rounded hover:bg-base-200/80 cursor-pointer transition-colors relative select-none ${shiftPopulationStatus}`}
                    onClick={() => handleEmptySpaceClick(date, hour)}
                  >
                    {/* Show shift capacity background */}
                    {hasActiveShift && (
                      <div className="absolute inset-0 pointer-events-none">
                        {shiftsInHour.map((shift, idx) => (
                          <div
                            key={shift._id}
                            className={`absolute inset-0 opacity-20 rounded ${
                              shift.status === 'bad' ? 'bg-error' :
                              shift.status === 'close' ? 'bg-warning' :
                              shift.status === 'good' ? 'bg-success' :
                              shift.status === 'warning' ? 'bg-warning' :
                              'bg-info'
                            }`}
                            style={{
                              left: `${idx * 2}px`,
                              top: `${idx * 2}px`,
                              right: `${idx * 2}px`,
                              bottom: `${idx * 2}px`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Show shift population indicator with worker names */}
                    {hasActiveShift && (
                      <div className="absolute top-1 right-1 z-10 space-y-1">
                        {shiftsInHour.map((shift) => {
                          const workerNames = shift.assignments?.map((a: any) => a.worker?.name?.split(' ')[0]).filter(Boolean) || [];
                          const tooltipText = `${shift.title}: ${shift.currentWorkers || 0}/${shift.requiredWorkers || 0} workers${workerNames.length > 0 ? `\nAssigned: ${workerNames.join(', ')}` : ''}`;
                          
                          return (
                            <div key={shift._id} className="space-y-0.5">
                              <div
                                className={`badge badge-xs ${
                                  shift.status === 'bad' ? 'badge-error' :
                                  shift.status === 'close' ? 'badge-warning' :
                                  shift.status === 'good' ? 'badge-success' :
                                  shift.status === 'warning' ? 'badge-warning' :
                                  'badge-info'
                                }`}
                                title={tooltipText}
                              >
                                {shift.currentWorkers || 0}/{shift.requiredWorkers || 0}
                              </div>
                              {/* Mini worker indicator for week view */}
                              {workerNames.length > 0 && (
                                <div className="flex -space-x-0.5">
                                  {workerNames.slice(0, 2).map((name: string, idx: number) => (
                                    <div 
                                      key={idx}
                                      className="w-2 h-2 rounded-full bg-primary/80 text-[7px] flex items-center justify-center border border-white"
                                      title={name}
                                    />
                                  ))}
                                  {workerNames.length > 2 && (
                                    <div className="w-2 h-2 rounded-full bg-base-300 text-[6px] flex items-center justify-center border border-white font-bold">
                                      •
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Render draggable events on top */}
                    {hourItems.map((item) => {
                      const itemStyle = getItemStyle(item, hour, dayItems, date);
                      if (!itemStyle) return null;
                      
                      return (
                        <DraggableEvent
                          key={item._id}
                          event={item}
                          style={itemStyle}
                          canEdit={canEditItem(item)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                          className={`text-xs p-1 rounded font-medium z-20 relative ${
                            item.type === 'shift' 
                              ? 'text-base-content bg-base-100/80 border-2 border-current' 
                              : 'text-white'
                          } ${item.type !== 'shift' ? getItemColor(item) : ''} ${selectedItems.has(item.id) ? 'ring-2 ring-primary' : ''} truncate hover:opacity-90 shadow-sm`}
                          setIsResizing={setIsResizing}
                          setResizeStartPos={setResizeStartPos}
                          onNestedClick={handleItemClick}
                          getItemColor={getItemColor}
                          onApprove={handleApproveCalendarItem}
                          bulkMode={bulkMode}
                          isSelected={selectedItems.has(item.id)}
                          onToggleSelection={toggleItemSelection}
                        />
                      );
                    })}
                  </DroppableTimeSlot>
                );
              })}
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </div>
    );
  };

  // Shared event area component for month/week views
  const renderEventArea = (items: any[], viewType: 'month' | 'week') => {
    return (
      <div className="sticky top-4 space-y-4">
        {/* Manager Approval Panel - Only shown to managers */}
        {effectiveRole === "manager" && (
          <div className="card bg-warning/10 border border-warning/20 shadow-sm">
            <div className="card-body">
              <h3 className="card-title text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-warning" />
                Pending Approvals ({viewType})
                <div className="badge badge-warning badge-sm">
                  {items.filter(item => item.status === 'pending_approval').length}
                </div>
              </h3>
              
              {items.filter(item => item.status === 'pending_approval').length === 0 ? (
                <div className="text-center py-4 opacity-60">
                  <Target className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {items.filter(item => item.status === 'pending_approval').map((item) => (
                    <div key={item._id} className="bg-base-100 rounded p-2 border border-warning/30">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-xs">{item.title}</h4>
                        <div className="badge badge-warning badge-xs">pending</div>
                      </div>
                      <div className="text-xs opacity-70 mb-2">
                        {item.startTime} - {item.endTime}
                      </div>
                      <div className="flex gap-1">
                        <button className="btn btn-success btn-xs">Approve</button>
                        <button className="btn btn-error btn-xs">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Schedule Panel */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {viewType === 'month' ? 'Monthly Overview' : 'Weekly Overview'}
              <div className="badge badge-primary badge-sm">{items.length}</div>
            </h3>
            
            {items.length === 0 ? (
              <div className="text-center py-8 opacity-60">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No items scheduled</p>
                <p className="text-xs">Click on the calendar to create one</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {items.slice(0, 20).map((item) => (
                  <div 
                    key={item._id}
                    className={`card shadow-sm hover:shadow-md transition-shadow cursor-pointer ${item.type === 'shift' ? 'bg-gradient-to-r from-base-100/80 to-base-100/60 border-l-4 border-l-primary/60' : 'bg-base-100'}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="card-body p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm leading-tight">{item.title}</h4>
                          <div className="text-xs opacity-70 mt-0.5 flex items-center gap-2">
                            <span>{item.startTime} - {item.endTime}</span>
                            {item.date && (
                              <span className="badge badge-xs badge-ghost">
                                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className={`badge badge-xs ${getStatusColor(item.status).replace('bg-', 'badge-')}`}>
                            {item.status.replace('_', ' ')}
                          </div>
                          <div className="badge badge-xs badge-outline">
                            {item.type}
                          </div>
                        </div>
                      </div>

                      {item.participants && item.participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="text-xs opacity-50">Staff:</div>
                          <div className="flex -space-x-1">
                            {item.participants.slice(0, 3).map((participant: any) => (
                              <div 
                                key={participant._id} 
                                className="w-4 h-4 rounded-full bg-primary text-primary-content text-[10px] flex items-center justify-center border border-base-100 font-medium"
                                title={participant.name}
                              >
                                {participant.name?.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {item.participants.length > 3 && (
                              <div className="w-4 h-4 rounded-full bg-base-300 text-[10px] flex items-center justify-center border border-base-100 font-medium">
                                +{item.participants.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {items.length > 20 && (
                  <div className="text-center text-xs opacity-50 py-2">
                    ... and {items.length - 20} more items
                  </div>
                )}
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
    );
  };

  const renderDayView = () => {
    const currentDateItems = getItemsForDate(currentDate);
    
    // DEBUG: Log data to console
    console.log('Debug - Day View Data:', {
      currentDate: currentDate.toISOString().split('T')[0],
      allCalendarItems: calendarItems.length,
      calendarItemTypes: calendarItems.map(item => ({ type: item.type, title: item.title })),
      currentDateItems: currentDateItems.length,
      currentDateItemTypes: currentDateItems.map(item => ({ type: item.type, title: item.title })),
      shifts: currentDateItems.filter(item => item.type === 'shift'),
      filters: filters
    });
    
    // Sort items by start time for the sidebar
    const sortedItems = [...currentDateItems].sort((a, b) => {
      const aTime = parseInt(a.startTime.replace(':', ''));
      const bTime = parseInt(b.startTime.replace(':', ''));
      return aTime - bTime;
    });

    // Use positioned items for side-by-side display of concurrent items
    const positionedItems = getItemsWithPositioning(currentDateItems);
    
    // DEBUG: Log positioning data and store in window for inspection
    const debugData = {
      positionedItems: positionedItems,
      positionedItemsLength: positionedItems.length,
      positionsAssigned: positionedItems.map(item => ({ 
        id: item.id, 
        title: item.title,
        position: item.position,
        startTime: item.startTime,
        endTime: item.endTime
      }))
    };
    console.log('Debug - Positioning Details:', debugData);
    
    // Store in window for browser inspection
    (window as any).debugPositionedItems = positionedItems;
    (window as any).debugPositionsAssigned = debugData.positionsAssigned;

    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-2 text-center font-medium mb-6">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        
        <div className="grid grid-cols-12 gap-6">
          {/* Day View Operational Sidebar - Move to LEFT side */}
          <div className="col-span-4">
            <div className="sticky top-4 space-y-4">
              {/* Current Shift Workers Panel */}
              <div className="card bg-info/10 border border-info/20 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-info" />
                    Workers on Shift
                    <div className="badge badge-info badge-sm">
                      {sortedItems.filter(item => item.type === 'shift' && item.assignments?.length > 0).length}
                    </div>
                  </h3>
                  
                  {sortedItems.filter(item => item.type === 'shift').length === 0 ? (
                    <div className="text-center py-4 opacity-60">
                      <User className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No shifts today</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-32 overflow-y-auto">
                      {sortedItems.filter(item => item.type === 'shift').map((shift: any) => (
                        <div key={shift._id} className="bg-base-100 rounded p-2 border border-info/30">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-xs">{shift.title}</h4>
                            <div className={`badge badge-xs ${
                              (shift.currentWorkers || 0) === 0 ? 'badge-neutral' :
                              (shift.currentWorkers || 0) < (shift.requiredWorkers || 1) ? 'badge-error' :
                              (shift.currentWorkers || 0) === (shift.requiredWorkers || 1) ? 'badge-warning' :
                              'badge-success'
                            }`}>
                              {shift.currentWorkers || 0}/{shift.requiredWorkers || 0}
                            </div>
                          </div>
                          <div className="text-xs opacity-70 mb-2">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          {shift.assignments && shift.assignments.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {shift.assignments.map((assignment: any) => (
                                  <div key={assignment.workerId} className="flex items-center gap-1">
                                    <span className="badge badge-primary badge-xs">
                                      {assignment.worker?.name?.split(' ')[0] || 'Unknown'}
                                    </span>
                                    {/* Show switch button if this is the current user's assignment */}
                                    {assignment.workerId === user?._id && effectiveRole === "worker" && (
                                      <button 
                                        className="btn btn-xs btn-ghost opacity-60 hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRequestShiftSwitch(assignment);
                                        }}
                                        title="Request to switch this shift with another worker"
                                      >
                                        ↔
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-error italic">No workers assigned</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Manager Approval Panel - Only shown to managers */}
              {effectiveRole === "manager" && (
                <div className="card bg-warning/10 border border-warning/20 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-warning" />
                      Pending Approvals
                      <div className="badge badge-warning badge-sm">
                        {sortedItems.filter(item => item.status === 'pending_approval').length}
                      </div>
                    </h3>
                    
                    {sortedItems.filter(item => item.status === 'pending_approval').length === 0 ? (
                      <div className="text-center py-4 opacity-60">
                        <Target className="w-6 h-6 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No pending approvals</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {sortedItems.filter(item => item.status === 'pending_approval').map((item) => (
                          <div key={item._id} className="bg-base-100 rounded p-2 border border-warning/30">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-medium text-xs">{item.title}</h4>
                              <div className="badge badge-warning badge-xs">pending</div>
                            </div>
                            <div className="text-xs opacity-70 mb-2">
                              {item.startTime} - {item.endTime}
                            </div>
                            <div className="flex gap-1">
                              <button className="btn btn-success btn-xs">Approve</button>
                              <button className="btn btn-error btn-xs">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Today's Operations Panel */}
              <div className="card bg-success/10 border border-success/20 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-success" />
                    Today's Operations
                    <div className="badge badge-success badge-sm">
                      {sortedItems.length}
                    </div>
                  </h3>
                  
                  {sortedItems.length === 0 ? (
                    <div className="text-center py-4 opacity-60">
                      <Calendar className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No operations today</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sortedItems.map((item) => (
                        <div
                          key={item._id}
                          className="bg-base-100 rounded p-2 border border-success/30 cursor-pointer hover:border-success/50 transition-colors"
                          onClick={() => handleItemClick(item)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-xs">{item.title}</h4>
                            <div className="flex items-center gap-1">
                              <div className="text-xs opacity-70">
                                {item.startTime} - {item.endTime}
                              </div>
                              {item.type === 'shift' && (
                                <div className={`badge badge-xs ${
                                  (item.currentWorkers || 0) === 0 ? 'badge-neutral' :
                                  (item.currentWorkers || 0) < (item.requiredWorkers || 1) ? 'badge-error' :
                                  (item.currentWorkers || 0) === (item.requiredWorkers || 1) ? 'badge-warning' :
                                  'badge-success'
                                }`}>
                                  {item.currentWorkers || 0}/{item.requiredWorkers || 0}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`badge badge-xs ${
                              item.status === 'approved' ? 'badge-success' :
                              item.status === 'pending_approval' ? 'badge-warning' :
                              item.status === 'cancelled' ? 'badge-error' : 'badge-info'
                            }`}>
                              {item.status || 'active'}
                            </div>
                            <div className="badge badge-xs badge-outline">
                              {item.type}
                            </div>
                          </div>
                          <p className="text-xs opacity-60 mt-1">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button 
                    className="btn btn-sm btn-primary w-full mt-3"
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
          
          {/* Calendar Column - Move to RIGHT side and limit to 5 AM - 11 PM */}
          <div className="col-span-8">
            {/* Day Calendar Grid - Continuous Display */}
            <div className="grid grid-cols-12 gap-2">
              {/* Time Column */}
              <div className="col-span-2 space-y-1">
                {Array.from({ length: 19 }, (_, hourIndex) => {
                  const hour = hourIndex + 5;
                  return (
                    <div key={hour} className="h-16 p-2 text-sm opacity-70 text-right flex flex-col items-end justify-center">
                      <div className="font-medium">
                        {hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Day Column with Continuous Items */}
              <div className="col-span-10 relative">
                {/* Time Slot Grid Lines */}
                <div className="absolute inset-0 space-y-1">
                  {Array.from({ length: 19 }, (_, hourIndex) => {
                    const hour = hourIndex + 5;
                    return (
                      <DroppableTimeSlot
                        key={hour}
                        date={currentDate}
                        hour={hour}
                        className="h-16 border border-base-300 rounded hover:bg-base-200/50 cursor-pointer transition-colors"
                        onClick={() => handleEmptySpaceClick(currentDate, hour)}
                      />
                    );
                  })}
                </div>
                
                {/* Continuous Item Display */}
                <div className="absolute inset-0 pointer-events-none">
                  {positionedItems.map((item) => {
                    if (!item.position) return null;
                    
                    const [startHour, startMinute] = item.startTime.split(':').map(Number);
                    const [endHour, endMinute] = item.endTime.split(':').map(Number);
                    
                    // Calculate position within 5 AM - 11 PM range (19 hours total)
                    const startMinutes = (startHour - 5) * 60 + startMinute;
                    const endMinutes = (endHour - 5) * 60 + endMinute;
                    const totalMinutes = 19 * 60; // 19 hours
                    
                    // Skip items outside our time range
                    if (startHour < 5 || startHour > 23) return null;
                    
                    const top = Math.max(0, (startMinutes / totalMinutes) * 100);
                    const height = Math.min(100 - top, ((endMinutes - Math.max(0, startMinutes)) / totalMinutes) * 100);
                    const left = (item.position.left / item.position.totalColumns) * 100;
                    const width = (item.position.width / item.position.totalColumns) * 100;
                    
                    return (
                      <div
                        key={item.id}
                        className="absolute pointer-events-auto"
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                      >
                        <DraggableEvent
                          event={item}
                          style={{}}
                          canEdit={canEditItem(item)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                          className={`h-full text-xs p-1 rounded font-medium z-20 relative overflow-hidden ${
                            item.type === 'shift' 
                              ? 'text-base-content border-2' 
                              : 'text-white'
                          } ${getItemColor(item)} ${selectedItems.has(item.id) ? 'ring-2 ring-primary' : ''} hover:opacity-90 shadow-sm`}
                          setIsResizing={setIsResizing}
                          setResizeStartPos={setResizeStartPos}
                          onNestedClick={handleItemClick}
                          getItemColor={getItemColor}
                          onApprove={handleApproveCalendarItem}
                          bulkMode={bulkMode}
                          isSelected={selectedItems.has(item.id)}
                          onToggleSelection={toggleItemSelection}
                        >
                          <div className="text-xs font-medium truncate">{item.title}</div>
                          <div className="text-xs opacity-80">
                            {item.startTime} - {item.endTime}
                          </div>
                          {item.type === 'shift' && (
                            <div className="flex items-center gap-1 mt-1">
                              {effectiveRole === "manager" && (
                                <UserPlus className="w-3 h-3 opacity-60" />
                              )}
                              <div 
                                className={`badge badge-xs ${
                                  (item.currentWorkers || 0) === 0 ? 'badge-neutral' :
                                  (item.currentWorkers || 0) < (item.requiredWorkers || 1) ? 'badge-error' :
                                  (item.currentWorkers || 0) === (item.requiredWorkers || 1) ? 'badge-warning' :
                                  'badge-success'
                                }`}
                              >
                                {item.currentWorkers || 0}/{item.requiredWorkers || 0}
                              </div>
                            </div>
                          )}
                        </DraggableEvent>
                      </div>
                    );
                  })}
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
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">LUZ</h1>
          <p className="opacity-80">Operational Schedule & Resource Management</p>
        </div>

        {/* Advanced Filter & Search Controls */}
        <div className="card bg-base-200 shadow-sm mb-4">
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filter & Search Calendar
            </h3>
            <div className="not-prose grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
              <div>
                <label className="label">
                  <span className="label-text">Search Activities</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 opacity-60" />
                  <input
                    type="text"
                    placeholder="Search by name, creator, type..."
                    className="input input-bordered w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text">Activity Types</span>
                </label>
                <div className="space-y-2">
                  <label className="cursor-pointer label p-0">
                    <input 
                      type="checkbox" 
                      className="toggle toggle-primary toggle-sm"
                      checked={filters.showEvents}
                      onChange={() => setFilters(prev => ({ ...prev, showEvents: !prev.showEvents }))}
                    />
                    <span className="label-text ml-2">Events</span>
                  </label>
                  <label className="cursor-pointer label p-0">
                    <input 
                      type="checkbox" 
                      className="toggle toggle-secondary toggle-sm"
                      checked={filters.showShifts}
                      onChange={() => setFilters(prev => ({ ...prev, showShifts: !prev.showShifts }))}
                    />
                    <span className="label-text ml-2">Shifts</span>
                  </label>
                  <label className="cursor-pointer label p-0">
                    <input 
                      type="checkbox" 
                      className="toggle toggle-accent toggle-sm"
                      checked={filters.showToolRentals}
                      onChange={() => setFilters(prev => ({ ...prev, showToolRentals: !prev.showToolRentals }))}
                    />
                    <span className="label-text ml-2">Tools</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text">Date Range</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value) {
                      setCurrentDate(new Date(e.target.value));
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text">Creator</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                >
                  <option value="all">All Creators</option>
                  {/* TODO: Populate with actual creators from data */}
                  <option value="me">My Activities</option>
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
                      setDateFilter("");
                      setCreatorFilter("all");
                      setFilters({ showEvents: true, showShifts: true, showToolRentals: true });
                    }}
                  >
                    Clear Filters
                  </button>
                  <button
                    className="btn btn-outline btn-sm w-full"
                    onClick={goToToday}
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="grid grid-cols-3 items-center mb-2 gap-4">
          {/* View Toggle - Left */}
          <div className="not-prose justify-self-start">
            <div className="join">
              <button 
                className={`join-item btn btn-lg ${viewType === "day" ? "btn-active" : "btn-outline"}`}
                onClick={() => setViewType("day")}
              >
                Day
              </button>
              <button 
                className={`join-item btn btn-lg ${viewType === "week" ? "btn-active" : "btn-outline"}`}
                onClick={() => setViewType("week")}
              >
                Week
              </button>
              <button 
                className={`join-item btn btn-lg ${viewType === "month" ? "btn-active" : "btn-outline"}`}
                onClick={() => setViewType("month")}
              >
                Month
              </button>
            </div>
          </div>
          
          {/* Title - Center */}
          <div className="justify-self-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold leading-tight">{currentMonth}</h2>
              {/* Pending Approvals & Bulk Operations for Managers */}
              {hasPermission("manage_events") && (
                <div className="mt-1 space-y-2">
                  {/* Pending Approvals Indicator */}
                  {calendarSummary.pendingApprovals > 0 && (
                    <div>
                      <div className="badge badge-warning gap-1 text-xs">
                        <span>⏳</span>
                        {calendarSummary.pendingApprovals} pending approval{calendarSummary.pendingApprovals !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                  
                  {/* Bulk Operations Panel */}
                  {calendarSummary.pendingApprovals > 0 && (
                    <div className="flex gap-2 items-center text-xs">
                      {!bulkMode ? (
                        <button 
                          className="btn btn-xs btn-outline"
                          onClick={() => setBulkMode(true)}
                        >
                          Bulk Select
                        </button>
                      ) : (
                        <div className="flex gap-2 items-center bg-base-200 px-3 py-1 rounded-full">
                          <span className="text-xs font-medium">
                            {selectedItems.size} selected
                          </span>
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={selectAllPendingItems}
                          >
                            Select All
                          </button>
                          {selectedItems.size > 0 && (
                            <>
                              <button
                                className="btn btn-xs btn-success"
                                onClick={() => handleBulkApprove(getSelectedItemsData(), true)}
                              >
                                <Check className="w-3 h-3" />
                                Approve ({selectedItems.size})
                              </button>
                              <button
                                className="btn btn-xs btn-error"
                                onClick={() => handleBulkApprove(getSelectedItemsData(), false)}
                              >
                                <X className="w-3 h-3" />
                                Reject ({selectedItems.size})
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={clearSelection}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Navigation - Right */}
          <div className="not-prose flex gap-2 items-center justify-self-end">
            <button 
              className="btn btn-lg btn-outline"
              onClick={navigatePrevious}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              className="btn btn-lg btn-primary"
              onClick={goToToday}
              title="Go to today"
            >
              <Target className="w-5 h-5" />
              Today
            </button>
            <button 
              className="btn btn-lg btn-outline"
              onClick={navigateNext}
            >
              <ChevronRight className="w-5 h-5" />
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
          
          <div className="card bg-base-200 shadow-sm relative">
            {/* Cross-day drag/resize zones - positioned relative to calendar card */}
            {((activeEvent && !isResizing) || (isResizing && resizePreviewDate)) && viewType === 'day' && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className={`absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-primary/30 to-primary/10 border-r-2 border-primary/60 transition-all duration-200 backdrop-blur-sm ${
                  (dragPreview?.targetDate.getTime() === new Date(currentDate.getTime() - 24*60*60*1000).getTime() || 
                   resizePreviewDate?.targetDate.getTime() === new Date(currentDate.getTime() - 24*60*60*1000).getTime()) 
                   ? 'opacity-100 shadow-lg' : 'opacity-60'
                }`}>
                  <div className="flex flex-col items-center justify-center h-full text-primary font-medium px-1">
                    <ChevronLeft className="w-6 h-6 mb-2" />
                    <div className="text-xs text-center font-semibold">
                      {isResizing ? (resizePreviewDate?.type === 'start' ? 'Start' : 'End') : 'Move'}
                    </div>
                    <div className="text-xs text-center font-semibold">
                      Prev Day
                    </div>
                    {(dragPreview?.targetDate.getTime() === new Date(currentDate.getTime() - 24*60*60*1000).getTime() || 
                      resizePreviewDate?.targetDate.getTime() === new Date(currentDate.getTime() - 24*60*60*1000).getTime()) && (
                      <div className="text-xs mt-2 text-center bg-primary/20 rounded px-1 py-1">
                        <div className="font-medium text-xs">
                          {(dragPreview?.targetDate || resizePreviewDate?.targetDate)?.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                        </div>
                        <div className="font-bold text-xs">{dragPreview?.targetTime || resizePreviewTime}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-primary/30 to-primary/10 border-l-2 border-primary/60 transition-all duration-200 backdrop-blur-sm ${
                  (dragPreview?.targetDate.getTime() === new Date(currentDate.getTime() + 24*60*60*1000).getTime() || 
                   resizePreviewDate?.targetDate.getTime() === new Date(currentDate.getTime() + 24*60*60*1000).getTime()) 
                   ? 'opacity-100 shadow-lg' : 'opacity-60'
                }`}>
                  <div className="flex flex-col items-center justify-center h-full text-primary font-medium px-1">
                    <ChevronRight className="w-6 h-6 mb-2" />
                    <div className="text-xs text-center font-semibold">
                      {isResizing ? (resizePreviewDate?.type === 'start' ? 'Start' : 'End') : 'Move'}
                    </div>
                    <div className="text-xs text-center font-semibold">
                      Next Day
                    </div>
                    {(dragPreview?.targetDate.getTime() === new Date(currentDate.getTime() + 24*60*60*1000).getTime() || 
                      resizePreviewDate?.targetDate.getTime() === new Date(currentDate.getTime() + 24*60*60*1000).getTime()) && (
                      <div className="text-xs mt-2 text-center bg-primary/20 rounded px-1 py-1">
                        <div className="font-medium text-xs">
                          {(dragPreview?.targetDate || resizePreviewDate?.targetDate)?.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                        </div>
                        <div className="font-bold text-xs">{dragPreview?.targetTime || resizePreviewTime}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="card-body">

              <div className="not-prose">
                {renderCalendarView()}
              </div>

              {calendarItems.length === 0 && (
                <div className="mt-6 p-4 bg-base-100 rounded-lg text-center opacity-70">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No events or shifts scheduled yet.</p>
                  <p className="text-sm">Events and shifts will appear on the calendar.</p>
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

          {assignmentData && (
            <ShiftAssignmentModal 
              isOpen={isAssignmentModalOpen}
              onClose={() => {
                setIsAssignmentModalOpen(false);
                setAssignmentData(null);
              }}
              shift={assignmentData.shift}
              date={assignmentData.date}
              currentUser={user}
            />
          )}

          {shiftDetailsData && (
            <ShiftDetailsModal 
              isOpen={isShiftDetailsModalOpen}
              onClose={() => {
                setIsShiftDetailsModalOpen(false);
                setShiftDetailsData(null);
              }}
              shift={shiftDetailsData.shift}
              date={shiftDetailsData.date}
              currentUser={user}
            />
          )}
          
          {switchAssignmentData && (
            <ShiftSwitchModal 
              isOpen={isSwitchModalOpen}
              onClose={() => {
                setIsSwitchModalOpen(false);
                setSwitchAssignmentData(null);
              }}
              assignment={switchAssignmentData}
              currentUser={user}
            />
          )}

          <ShiftModificationModal
            isOpen={isShiftModificationModalOpen}
            onClose={() => {
              setIsShiftModificationModalOpen(false);
              setPendingShiftModification(null);
            }}
            onConfirm={handleShiftModificationConfirm}
            shift={pendingShiftModification?.shift}
            modificationType={pendingShiftModification?.modificationType || 'drag'}
            newDate={pendingShiftModification?.newDate}
            newStartTime={pendingShiftModification?.newStartTime}
            newEndTime={pendingShiftModification?.newEndTime}
          />
        </div>
      )}
    </Authenticated>
  );
}