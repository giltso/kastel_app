import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated } from "convex/react";
import { 
  Plus, 
  Users, 
  Clock, 
  Calendar,
  RefreshCw,
  UserPlus 
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { usePermissions } from "../hooks/usePermissions";
import { CreateShiftModal } from "../components/CreateShiftModal";
import { ShiftCard } from "../components/ShiftCard";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/shifts")({
  component: ShiftsPage,
});

function ShiftsPage() {
  const { user, effectiveRole, hasPermission } = usePermissions();
  const isOperational = hasPermission("access_worker_portal");
  const canManageShifts = hasPermission("manage_events"); // Using existing permission
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const shifts = useQuery(api.shifts.listShifts);
  const shiftAssignments = useQuery(api.shifts.getShiftAssignments, { date: selectedDate });
  const swapRequests = useQuery(api.shifts.getMySwapRequests);
  
  const assignWorkerToShift = useMutation(api.shifts.assignWorkerToShift);

  const handleSelfAssign = async (shiftId: Id<"shifts">) => {
    if (!user) return;
    
    try {
      await assignWorkerToShift({
        shiftId,
        workerId: user._id,
        date: selectedDate,
      });
    } catch (error) {
      console.error("Failed to join shift:", error);
      if (error instanceof Error) {
        alert(`Failed to join shift: ${error.message}`);
      } else {
        alert("Failed to join shift. Please try again.");
      }
    }
  };

  const handleAssignWorker = (shiftId: Id<"shifts">) => {
    // TODO: Open worker selection modal for managers
    console.log("Assign worker to shift:", shiftId);
  };

  return (
    <Authenticated>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isOperational ? "Shift Management" : "Available Shifts"}
          </h1>
          <p className="text-base-content/70">
            {isOperational 
              ? "Manage daily shifts and worker assignments"
              : "View and join available shifts"
            }
          </p>
        </div>

        {/* Date Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  View Date
                </span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input input-bordered"
              />
            </div>
            
            {/* Quick date buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="btn btn-sm btn-outline"
              >
                Today
              </button>
              <button 
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow.toISOString().split('T')[0]);
                }}
                className="btn btn-sm btn-outline"
              >
                Tomorrow
              </button>
            </div>
          </div>
        </div>

        {/* Manager Controls */}
        {canManageShifts && (
          <div className="flex justify-between items-center mb-6 p-4 bg-base-200 rounded-lg">
            <div>
              <h2 className="font-semibold">Manager Controls</h2>
              <p className="text-sm opacity-70">Create and manage shifts</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Create Shift
            </button>
          </div>
        )}

        {/* Pending Swap Requests */}
        {swapRequests && swapRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Pending Shift Swaps</h2>
            <div className="grid gap-4">
              {swapRequests.map((swap) => (
                <div key={swap._id} className="card bg-base-200 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          {swap.isMyRequest ? "Your Swap Request" : "Swap Request"}
                        </h3>
                        <p className="text-sm opacity-70">
                          {swap.shift1?.name} ↔ {swap.shift2?.name}
                        </p>
                        {swap.reason && (
                          <p className="text-sm mt-1">Reason: {swap.reason}</p>
                        )}
                      </div>
                      
                      {!swap.isMyRequest && (
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-success">
                            Accept
                          </button>
                          <button className="btn btn-sm btn-error">
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shifts Grid */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Shifts for {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
              })}
            </h2>
            <div className="flex items-center gap-2 text-sm opacity-70">
              <RefreshCw className="w-4 h-4" />
              <span>Updates automatically</span>
            </div>
          </div>

          {!shifts ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto opacity-30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Shifts Available</h3>
              <p className="text-base-content/70 mb-4">
                {canManageShifts 
                  ? "Create your first shift to get started with shift management."
                  : "No shifts have been created yet."
                }
              </p>
              {canManageShifts && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  Create First Shift
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shifts.map((shift) => {
                // Check if this shift runs on the selected day
                const selectedDayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                const runsOnSelectedDay = shift.recurringDays.includes(selectedDayOfWeek);
                
                if (!runsOnSelectedDay) return null;

                return (
                  <ShiftCard
                    key={shift._id}
                    shift={shift}
                    canManage={canManageShifts}
                    canSelfAssign={isOperational && effectiveRole !== "manager"} // Workers can self-assign
                    onAssignWorker={handleAssignWorker}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {shifts && shifts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 p-6 bg-base-200 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {shifts.filter(s => s.status === "good").length}
              </div>
              <div className="text-sm opacity-70">Fully Staffed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {shifts.filter(s => s.status === "close").length}
              </div>
              <div className="text-sm opacity-70">Almost Full</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-error">
                {shifts.filter(s => s.status === "bad").length}
              </div>
              <div className="text-sm opacity-70">Need Workers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {shifts.filter(s => s.isOverpopulated).length}
              </div>
              <div className="text-sm opacity-70">Overstaffed</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateShiftModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </Authenticated>
  );
}