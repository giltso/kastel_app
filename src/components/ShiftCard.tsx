import { useState } from "react";
import { useMutation } from "convex/react";
import { 
  Users, 
  Clock, 
  Calendar, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  UserPlus
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ShiftCardProps {
  shift: {
    _id: Id<"shifts">;
    name: string;
    description?: string;
    startTime: string;
    endTime: string;
    recurringDays: string[];
    requiredWorkers: number;
    maxWorkers?: number;
    currentWorkers: number;
    status: "bad" | "close" | "good" | "warning";
    spotsAvailable: number;
    isOverpopulated: boolean;
    color?: string;
  };
  canManage: boolean;
  canSelfAssign: boolean;
  isUserAssigned?: boolean;
  userAssignmentId?: Id<"shift_assignments">;
  onSelfAssign?: (shiftId: Id<"shifts">) => void;
  onSelfUnassign?: (assignmentId: Id<"shift_assignments">) => void;
  onAssignWorker?: (shiftId: Id<"shifts">) => void;
}

export function ShiftCard({ 
  shift, 
  canManage, 
  canSelfAssign, 
  isUserAssigned, 
  userAssignmentId, 
  onSelfAssign, 
  onSelfUnassign, 
  onAssignWorker 
}: ShiftCardProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const assignWorkerToShift = useMutation(api.shifts.assignWorkerToShift);

  const handleSelfAssign = async () => {
    setIsAssigning(true);
    try {
      if (onSelfAssign) {
        onSelfAssign(shift._id);
      }
    } catch (error) {
      console.error("Failed to assign to shift:", error);
      alert("Failed to join shift. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSelfUnassign = async () => {
    if (!userAssignmentId || !onSelfUnassign) return;
    
    setIsAssigning(true);
    try {
      onSelfUnassign(userAssignmentId);
    } catch (error) {
      console.error("Failed to leave shift:", error);
      alert("Failed to leave shift. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusIcon = () => {
    switch (shift.status) {
      case "bad":
        return <AlertTriangle className="w-4 h-4 text-error" />;
      case "close":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case "good":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusMessage = () => {
    switch (shift.status) {
      case "bad":
        return `Needs ${shift.spotsAvailable} more workers`;
      case "close":
        return "Almost full - 1 spot left";
      case "good":
        return "Fully staffed";
      case "warning":
        return shift.isOverpopulated ? "Overstaffed" : "Above capacity";
    }
  };

  const getStatusBadgeClass = () => {
    switch (shift.status) {
      case "bad":
        return "badge-error";
      case "close":
        return "badge-warning";
      case "good":
        return "badge-success";
      case "warning":
        return "badge-warning";
    }
  };

  const formatDays = (days: string[]) => {
    const dayAbbreviations: Record<string, string> = {
      monday: "Mon",
      tuesday: "Tue", 
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };
    
    return days.map(day => dayAbbreviations[day] || day).join(", ");
  };

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        {/* Header with color indicator */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: shift.color || "#3B82F6" }}
            ></div>
            <div>
              <h3 className="font-bold text-lg">{shift.name}</h3>
              {shift.description && (
                <p className="text-sm opacity-70">{shift.description}</p>
              )}
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`badge badge-sm ${getStatusBadgeClass()}`}>
              {getStatusMessage()}
            </span>
          </div>
        </div>

        {/* Shift details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 opacity-70" />
            <span>{shift.startTime} - {shift.endTime}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 opacity-70" />
            <span>{formatDays(shift.recurringDays)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 opacity-70" />
            <span>
              {shift.currentWorkers} / {shift.requiredWorkers} workers
              {shift.maxWorkers && ` (max: ${shift.maxWorkers})`}
            </span>
          </div>

          {/* Golden time indicator */}
          {shift.isOverpopulated && (
            <div className="flex items-center gap-2 text-sm text-warning">
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
              <span>Golden time available</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="card-actions justify-end mt-4">
          {canSelfAssign && (
            <>
              {isUserAssigned ? (
                // Show unassign button if user is already assigned
                <button
                  onClick={handleSelfUnassign}
                  disabled={isAssigning}
                  className="btn btn-sm btn-warning"
                >
                  {isAssigning ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 rotate-45" />
                      Leave Shift
                    </>
                  )}
                </button>
              ) : (
                // Show join button if user is not assigned and there are spots available
                shift.spotsAvailable > 0 && (
                  <button
                    onClick={handleSelfAssign}
                    disabled={isAssigning}
                    className="btn btn-sm btn-primary"
                  >
                    {isAssigning ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Join Shift
                      </>
                    )}
                  </button>
                )
              )}
            </>
          )}
          
          {canManage && (
            <button
              onClick={() => onAssignWorker && onAssignWorker(shift._id)}
              className="btn btn-sm btn-outline"
            >
              <Plus className="w-4 h-4" />
              Assign Worker
            </button>
          )}
        </div>
      </div>
    </div>
  );
}