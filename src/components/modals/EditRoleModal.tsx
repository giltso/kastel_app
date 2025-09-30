import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { X, Shield, UserPlus, UserMinus } from "lucide-react";

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    _id: Id<"users">;
    name: string;
    email?: string;
    effectiveRole: {
      isStaff: boolean;
      workerTag: boolean;
      managerTag: boolean;
      instructorTag: boolean;
      toolHandlerTag: boolean;
      rentalApprovedTag: boolean;
    };
  };
  onSuccess?: () => void;
}

export function EditRoleModal({ isOpen, onClose, user, onSuccess }: EditRoleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for role toggles
  const [roles, setRoles] = useState({
    workerTag: user.effectiveRole.workerTag,
    managerTag: user.effectiveRole.managerTag,
    instructorTag: user.effectiveRole.instructorTag,
    toolHandlerTag: user.effectiveRole.toolHandlerTag,
    rentalApprovedTag: user.effectiveRole.rentalApprovedTag,
  });

  const updateUserRole = useMutation(api.users_v2.updateUserRole);
  const promoteToStaff = useMutation(api.users_v2.promoteToStaff);
  const demoteToCustomer = useMutation(api.users_v2.demoteToCustomer);

  const handleToggle = (role: keyof typeof roles) => {
    setRoles(prev => {
      const newRoles = { ...prev, [role]: !prev[role] };

      // Validation: Manager requires Worker
      if (role === 'managerTag' && newRoles.managerTag && !newRoles.workerTag) {
        setError("Manager tag requires Worker tag");
        return prev;
      }

      // If disabling worker, also disable manager
      if (role === 'workerTag' && !newRoles.workerTag && newRoles.managerTag) {
        newRoles.managerTag = false;
      }

      setError(null);
      return newRoles;
    });
  };

  const handleSaveRoles = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate manager requires worker
      if (roles.managerTag && !roles.workerTag) {
        setError("Manager tag requires Worker tag");
        setIsSubmitting(false);
        return;
      }

      await updateUserRole({
        userId: user._id,
        workerTag: roles.workerTag,
        managerTag: roles.managerTag,
        instructorTag: roles.instructorTag,
        toolHandlerTag: roles.toolHandlerTag,
        rentalApprovedTag: roles.rentalApprovedTag,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update roles");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromoteToStaff = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await promoteToStaff({
        userId: user._id,
        workerTag: roles.workerTag,
        managerTag: roles.managerTag,
        instructorTag: roles.instructorTag,
        toolHandlerTag: roles.toolHandlerTag,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote to staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoteToCustomer = async () => {
    if (!confirm(`Are you sure you want to demote ${user.name} to customer? All staff tags will be removed.`)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await demoteToCustomer({ userId: user._id });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to demote to customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isStaff = user.effectiveRole.isStaff;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Edit Roles - {user.name}
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-base-200 rounded-lg">
          <div className="text-sm">
            <div className="font-medium">{user.name}</div>
            {user.email && <div className="text-base-content/70">{user.email}</div>}
            <div className="mt-2">
              <span className={`badge ${isStaff ? 'badge-primary' : 'badge-warning'}`}>
                {isStaff ? 'Staff Member' : 'Customer'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Role Toggles */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-sm">Role Tags</h4>

          {/* Staff Tags (only for staff members) */}
          {isStaff && (
            <>
              <label className="flex items-center justify-between p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300">
                <div>
                  <div className="font-medium">Worker Tag</div>
                  <div className="text-xs text-base-content/70">Access to LUZ system and shift management</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={roles.workerTag}
                  onChange={() => handleToggle('workerTag')}
                  disabled={isSubmitting}
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300">
                <div>
                  <div className="font-medium">Manager Tag</div>
                  <div className="text-xs text-base-content/70">Role management and shift approval (requires Worker)</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={roles.managerTag}
                  onChange={() => handleToggle('managerTag')}
                  disabled={isSubmitting || !roles.workerTag}
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300">
                <div>
                  <div className="font-medium">Instructor Tag</div>
                  <div className="text-xs text-base-content/70">Course management and educational content</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-info"
                  checked={roles.instructorTag}
                  onChange={() => handleToggle('instructorTag')}
                  disabled={isSubmitting}
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300">
                <div>
                  <div className="font-medium">Tool Handler Tag</div>
                  <div className="text-xs text-base-content/70">Tool inventory and rental processing</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-warning"
                  checked={roles.toolHandlerTag}
                  onChange={() => handleToggle('toolHandlerTag')}
                  disabled={isSubmitting}
                />
              </label>
            </>
          )}

          {/* Customer Tags (only for customers) */}
          {!isStaff && (
            <label className="flex items-center justify-between p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300">
              <div>
                <div className="font-medium">Rental Approved</div>
                <div className="text-xs text-base-content/70">Can request and rent tools</div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-success"
                checked={roles.rentalApprovedTag}
                onChange={() => handleToggle('rentalApprovedTag')}
                disabled={isSubmitting}
              />
            </label>
          )}
        </div>

        {/* Actions */}
        <div className="modal-action flex-col sm:flex-row gap-2">
          {/* Staff/Customer Toggle Button */}
          {isStaff ? (
            <button
              className="btn btn-error btn-outline gap-2"
              onClick={handleDemoteToCustomer}
              disabled={isSubmitting}
            >
              <UserMinus className="w-4 h-4" />
              Remove from Staff
            </button>
          ) : (
            <button
              className="btn btn-primary btn-outline gap-2"
              onClick={handlePromoteToStaff}
              disabled={isSubmitting}
            >
              <UserPlus className="w-4 h-4" />
              Add to Staff
            </button>
          )}

          <div className="flex-1" />

          {/* Save/Cancel */}
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveRoles}
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="loading loading-spinner" /> : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Modal backdrop */}
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
