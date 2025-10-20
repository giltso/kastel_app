import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { X } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import type { Id } from "../../../convex/_generated/dataModel";
import { useLanguage } from "@/hooks/useLanguage";

interface CreateManualRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const manualRentalSchema = z.object({
  toolId: z.string().min(1, "Please select a tool"),
  nonUserRenterName: z.string().min(1, "Renter name is required"),
  nonUserRenterContact: z.string().min(1, "Contact information is required"),
  rentalStartDate: z.string().min(1, "Start date is required"),
  rentalEndDate: z.string().min(1, "End date is required"),
  notes: z.string().optional(),
});

export function CreateManualRentalModal({ isOpen, onClose }: CreateManualRentalModalProps) {
  const { t } = useLanguage();
  const tools = useQuery(api.tools.listTools);
  const createManualRental = useMutation(api.tools.createManualRental);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      toolId: "",
      nonUserRenterName: "",
      nonUserRenterContact: "",
      rentalStartDate: "",
      rentalEndDate: "",
      notes: "",
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await createManualRental({
          toolId: value.toolId as Id<"tools">,
          nonUserRenterName: value.nonUserRenterName,
          nonUserRenterContact: value.nonUserRenterContact,
          rentalStartDate: value.rentalStartDate,
          rentalEndDate: value.rentalEndDate,
          notes: value.notes || undefined,
        });
        form.reset();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create manual rental");
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  // Filter only available tools
  const availableTools = tools?.filter(tool => tool.isAvailable) || [];

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('tools:rental.createManualRental')}</h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="alert alert-info mb-4">
          <div className="text-sm">
            <p className="font-semibold">{t('tools:rental.manualRentalTitle')}</p>
            <p className="mt-1">
              {t('tools:rental.manualRentalDescription')}
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          {/* Tool Selection */}
          <form.Field name="toolId">
            {(field) => (
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">{t('tools:fields.tool')} *</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!availableTools.length}
                >
                  <option value="">
                    {availableTools.length === 0 ? t('tools:noAvailableTools') : t('tools:selectTool')}
                  </option>
                  {availableTools.map((tool) => (
                    <option key={tool._id} value={tool._id}>
                      {tool.name} - ${tool.rentalPricePerDay}/day
                      {tool.brand && ` (${tool.brand})`}
                    </option>
                  ))}
                </select>
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors.map((e: any) => e.message).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          {/* Renter Name */}
          <form.Field name="nonUserRenterName">
            {(field) => (
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">{t('tools:rental.customerName')} *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder={t('tools:rental.enterCustomerName')}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors.map((e: any) => e.message).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          {/* Contact Information */}
          <form.Field name="nonUserRenterContact">
            {(field) => (
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">{t('tools:rental.contactInformation')} *</span>
                  <span className="label-text-alt">{t('tools:rental.phoneOrEmail')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder={t('tools:rental.contactPlaceholder')}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors.map((e: any) => e.message).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          {/* Rental Dates */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <form.Field name="rentalStartDate">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">{t('tools:rental.startDate')} *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {!field.state.meta.isValid && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors.map((e: any) => e.message).join(", ")}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="rentalEndDate">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">{t('tools:rental.endDate')} *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {!field.state.meta.isValid && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors.map((e: any) => e.message).join(", ")}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Notes */}
          <form.Field name="notes">
            {(field) => (
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">{t('tools:rental.notes')}</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-24"
                  placeholder={t('tools:rental.notesPlaceholder')}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          {/* Action Buttons */}
          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              className="btn"
              disabled={isSubmitting}
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!form.state.canSubmit || isSubmitting}
            >
              {isSubmitting ? t('tools:rental.creating') : t('tools:rental.createRental')}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="button">close</button>
      </form>
    </dialog>
  );
}
