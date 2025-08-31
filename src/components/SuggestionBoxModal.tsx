import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { X, MessageSquare, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";

// Form validation schema
const suggestionSchema = z.object({
  problem: z.string().min(1, "Please describe what problem you're experiencing"),
  solution: z.string().min(1, "Please describe your suggested solution"),
});

interface SuggestionBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Auto-populated context
  currentLocation?: string;
  pageContext?: string;
}

export function SuggestionBoxModal({ 
  isOpen, 
  onClose, 
  currentLocation = "",
  pageContext = ""
}: SuggestionBoxModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const createSuggestion = useMutation(api.suggestions.createSuggestion);

  const form = useForm({
    defaultValues: {
      problem: "",
      solution: "",
    },
    validators: {
      onChange: suggestionSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        await createSuggestion({
          location: currentLocation,
          pageContext: pageContext,
          problem: value.problem,
          solution: value.solution,
        });

        setSubmitSuccess(true);
        setTimeout(() => {
          onClose();
          form.reset();
          setSubmitSuccess(false);
          setIsSubmitting(false);
        }, 2000); // Close modal after 2 seconds
      } catch (error) {
        console.error("Failed to submit suggestion:", error);
        setIsSubmitting(false);
      }
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSubmitSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, form]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold">Suggestion Box</h3>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-success mb-2">
              Thank you for your suggestion!
            </h4>
            <p className="text-base-content/70">
              Your feedback has been submitted and will be reviewed by our development team.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            {/* Current Context Display */}
            <div className="bg-base-200 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm uppercase tracking-wide text-base-content/70">
                Current Context
              </h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Location:</span>{" "}
                  <span className="font-mono text-xs bg-base-300 px-2 py-1 rounded">
                    {currentLocation || "Unknown page"}
                  </span>
                </div>
                {pageContext && (
                  <div>
                    <span className="font-medium">Page Context:</span>{" "}
                    <span className="text-base-content/80">{pageContext}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Problem Description Field */}
            <form.Field
              name="problem"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      What problem are you experiencing?
                    </span>
                  </label>
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="textarea textarea-bordered w-full h-24 resize-none"
                    placeholder="Describe the issue you're facing or what could be improved..."
                    disabled={isSubmitting}
                  />
                  {!field.state.meta.isValid && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors.map(e => e.message).join(", ")}
                      </span>
                    </label>
                  )}
                </div>
              )}
            />

            {/* Solution Description Field */}
            <form.Field
              name="solution"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-accent" />
                      What's your suggested solution?
                    </span>
                  </label>
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="textarea textarea-bordered w-full h-24 resize-none"
                    placeholder="How would you like to see this improved or fixed..."
                    disabled={isSubmitting}
                  />
                  {!field.state.meta.isValid && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors.map(e => e.message).join(", ")}
                      </span>
                    </label>
                  )}
                </div>
              )}
            />

            {/* Submit Button */}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!form.state.canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Submit Suggestion
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}