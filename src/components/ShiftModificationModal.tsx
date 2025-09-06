import { useState } from "react";
import { X, AlertTriangle, Clock, Calendar, Users } from "lucide-react";

interface ShiftModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shift: any;
  modificationType: 'drag' | 'edit' | 'time_change';
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
}

export function ShiftModificationModal({
  isOpen,
  onClose,
  onConfirm,
  shift,
  modificationType,
  newDate,
  newStartTime,
  newEndTime
}: ShiftModificationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to modify shift:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const getModificationText = () => {
    switch (modificationType) {
      case 'drag':
        return `Moving this shift will create a non-recurring shift instance for ${newDate || 'the selected date'}.`;
      case 'time_change':
        return `Changing the shift time will create a non-recurring shift instance with new times.`;
      case 'edit':
        return `Editing this shift will create a non-recurring shift instance that overrides the recurring pattern.`;
      default:
        return `This modification will create a non-recurring shift instance.`;
    }
  };

  if (!isOpen || !shift) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Modify Recurring Shift
          </h3>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={isConfirming}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="space-y-4">
          <div className="alert alert-warning">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <h4 className="font-semibold">This will create a shift exception</h4>
              <p className="text-sm">
                {getModificationText()}
              </p>
            </div>
          </div>

          {/* Current Shift Info */}
          <div className="bg-base-200 rounded-lg p-3">
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              Current Shift: {shift.title || shift.name}
            </h4>
            <div className="text-sm space-y-1 opacity-70">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {shift.startTime} - {shift.endTime}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Recurring: {shift.recurringDays?.join(', ') || 'Unknown pattern'}
              </div>
            </div>
          </div>

          {/* New Values Preview */}
          {(newDate || newStartTime || newEndTime) && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <h4 className="font-medium text-primary mb-2">New Values:</h4>
              <div className="text-sm space-y-1">
                {newDate && (
                  <div>Date: {new Date(newDate).toLocaleDateString()}</div>
                )}
                {newStartTime && newEndTime && (
                  <div>Time: {newStartTime} - {newEndTime}</div>
                )}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="text-sm opacity-70">
            <p>
              <strong>What this means:</strong> A new non-recurring shift will be created for this specific date/time, 
              and the original recurring shift will remain unchanged for all other dates.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-action">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isConfirming}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-warning"
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creating Exception...
              </>
            ) : (
              'Create Shift Exception'
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose} disabled={isConfirming}>close</button>
      </form>
    </div>
  );
}