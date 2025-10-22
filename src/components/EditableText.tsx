import { useState, useRef, useEffect, ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useEditMode } from '@/contexts/EditModeContext';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { cn } from '@/lib/utils';

interface EditableTextProps {
  contentKey: string;          // "home.aboutUs", "luz.helpText"
  namespace?: string;          // "ui_content" (default)
  children: ReactNode;         // The actual text content
  className?: string;          // Pass-through styling
  as?: 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span'; // HTML element type
  multiline?: boolean;         // Use textarea (multi-line) vs input (single-line)
  needsTranslation?: boolean;  // Show "Needs Translation" badge
}

export const EditableText = ({
  contentKey,
  namespace: _namespace = "ui_content",
  children,
  className,
  as: Component = 'div',
  multiline = false,
  needsTranslation = false,
}: EditableTextProps) => {
  const { editMode } = useEditMode();
  const { currentLanguage } = useLanguage();
  const { hasManagerTag } = usePermissionsV2();
  const saveContent = useMutation(api.ui_content.saveUIContent);

  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Extract text from children
  const currentText = typeof children === 'string' ? children : (children?.toString() ?? '');

  // Only show edit capabilities if: edit mode ON + user is manager
  const canEdit = editMode && hasManagerTag;

  // Handle double-click to start editing
  const handleDoubleClick = () => {
    if (!canEdit) return;
    setEditedValue(currentText);
    setIsEditing(true);
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle save (click outside)
  const handleSave = async () => {
    // Don't allow empty content
    if (editedValue.trim().length === 0) {
      setEditedValue(currentText);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Always save, even if content didn't change
      // Backend will clear "needs translation" flag if no change
      await saveContent({
        key: contentKey,
        content: editedValue.trim(),
        language: currentLanguage,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      // Revert to original value on error
      setEditedValue(currentText);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel (Escape key)
  const handleCancel = () => {
    setEditedValue(currentText);
    setIsEditing(false);
  };

  // Handle key presses
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
  };

  // If editing, show input/textarea
  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';

    return (
      <InputComponent
        ref={inputRef as any}
        value={editedValue}
        onChange={(e) => setEditedValue(e.target.value)}
        onBlur={() => void handleSave()}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full",
          multiline ? "textarea textarea-bordered min-h-[100px]" : "input input-bordered",
          className
        )}
        disabled={isSaving}
        placeholder="Enter content..."
      />
    );
  }

  // Not editing - show regular text with pencil icon on hover
  // Use block display for block-level elements (p, div, h1, h2, h3, h4), inline-block for span
  const isBlockElement = Component === 'p' || Component === 'div' || Component === 'h1' || Component === 'h2' || Component === 'h3' || Component === 'h4';

  return (
    <Component
      className={cn(
        "relative group",
        isBlockElement ? "block" : "inline-block",
        canEdit && "cursor-pointer hover:bg-base-200/50 transition-colors rounded px-2 -mx-2",
        className
      )}
      onDoubleClick={handleDoubleClick}
    >
      {children}
      {needsTranslation && editMode && (
        <span className="badge badge-warning badge-sm ml-2 text-xs font-normal align-middle">
          Needs Translation
        </span>
      )}
      {canEdit && (
        <Pencil
          className="absolute top-1 right-1 w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none"
          aria-hidden="true"
        />
      )}
    </Component>
  );
};
