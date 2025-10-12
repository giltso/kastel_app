import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { X, Shield, UserPlus, UserMinus } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

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
  const { t } = useLanguage();
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
        setError(t("roles:messages.managerRequiresWorker"));
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
        setError(t("roles:messages.managerRequiresWorker"));
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
      setError(err instanceof Error ? err.message : t("roles:messages.failedToUpdate"));
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
      setError(err instanceof Error ? err.message : t("roles:messages.failedToPromote"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoteToCustomer = async () => {
    if (!confirm(t("roles:modal.demoteConfirm", { name: user.name }))) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await demoteToCustomer({ userId: user._id });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("roles:messages.failedToDemote"));
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
            {t("roles:modal.editRolesTitle")} - {user.name}
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
                {isStaff ? t("roles:modal.staffMember") : t("roles:tags.customer")}
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
          <h4 className="font-semibold text-sm">{t("roles:modal.roleTags")}</h4>

          {/* Staff Tags (only for staff members) */}
          {isStaff && (
            <>
              <label className="flex items-center justify-between p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300">
                <div>
                  <div className="font-medium">{t("roles:tags.worker")}</div>
                  <div className="text-xs text-base-content/70">{t("roles:descriptions.workerTag")}</div>
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
                  <div className="font-medium">{t("roles:tags.manager")}</div>
                  <div className="text-xs text-base-content/70">{t("roles:descriptions.managerTag")}</div>
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
                  <div className="font-medium">{t("roles:tags.instructor")}</div>
                  <div className="text-xs text-base-content/70">{t("roles:descriptions.instructorTag")}</div>
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
                  <div className="font-medium">{t("roles:tags.toolHandler")}</div>
                  <div className="text-xs text-base-content/70">{t("roles:descriptions.toolHandlerTag")}</div>
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
                <div className="font-medium">{t("roles:tags.rentalApproved")}</div>
                <div className="text-xs text-base-content/70">{t("roles:descriptions.rentalApprovedTag")}</div>
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
              {t("roles:actions.removeFromStaff")}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-outline gap-2"
              onClick={handlePromoteToStaff}
              disabled={isSubmitting}
            >
              <UserPlus className="w-4 h-4" />
              {t("roles:actions.addToStaff")}
            </button>
          )}

          <div className="flex-1" />

          {/* Save/Cancel */}
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t("common:actions.cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveRoles}
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="loading loading-spinner" /> : t("roles:actions.saveChanges")}
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
