# Browser Text Editing Feature - Design Document

📍 **Navigation:**
- **Parent**: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Current project status
- **Technical Guidelines**: [../CLAUDE.md](../CLAUDE.md) - Coding standards

**Purpose**: Complete implementation plan for in-browser text editing system allowing managers to edit UI content (banners, help text, instructions) with multilingual support and translation tracking.

**Status**: Design complete, implementation pending

**Created**: October 20, 2025
**Branch**: `feature/browser-text-editing`

---

## Overview

Allow managers to edit UI content directly in the browser using inline editing. Edits save to Convex database per language with automatic "needs translation" flags for other languages.

### Key Goals
- ✅ Edit "permanent" UI elements (not business data like shift names)
- ✅ Inline editing (no modals) with double-click activation
- ✅ Language-aware: editing Hebrew doesn't affect English (separate storage)
- ✅ Translation tracking: flag other languages as "outdated" when one language is edited
- ✅ Single source of truth: prevent conflicts between files and database
- ✅ Manager permissions only

### User Workflow
1. Manager clicks "Edit Mode" toggle in header (ON/OFF)
2. Pencil icons appear on hover over editable text (visual indicator)
3. Double-click text to activate editing
4. Text becomes input field (with border)
5. Edit content
6. Click outside input → Auto-saves to database
7. Press Escape → Cancels edit
8. Changes sync instantly to all users (Convex real-time)
9. Other languages automatically flagged "needs translation"

---

## Architecture

### 1. Database Schema

**New Table: `ui_content`**
```typescript
ui_content: defineTable({
  key: v.string(),                    // "home.welcomeBanner", "luz.helpText"
  namespace: v.string(),              // "ui_content" (for organization)

  // Multilingual content fields
  content_en: v.optional(v.string()),
  content_he: v.optional(v.string()),
  content_ru: v.optional(v.string()),
  content_fr: v.optional(v.string()),

  // Translation tracking (which languages are outdated)
  needsTranslation_en: v.optional(v.boolean()),
  needsTranslation_he: v.optional(v.boolean()),
  needsTranslation_ru: v.optional(v.boolean()),
  needsTranslation_fr: v.optional(v.boolean()),

  // Audit trail
  lastEditedBy: v.id("users"),        // Who made the last edit
  lastEditedAt: v.number(),           // Timestamp
  lastEditedLanguage: v.string(),     // "he", "en", "ru", "fr"
})
.index("by_key", ["key"])
.index("by_namespace", ["namespace"])
```

**Design Rationale**:
- Database storage follows industry standard (Contentful, Sanity, Strapi all use DB)
- Separate field per language allows independent editing
- Translation flags enable tracking which languages are outdated
- Audit trail for accountability

---

### 2. Translation File Structure

**New Namespace: `ui_content.json`**

**Purpose**: Serves as **default/fallback** values only. Database overrides when content is edited.

**File**: `public/locales/{lang}/ui_content.json`

**English Example** (`public/locales/en/ui_content.json`):
```json
{
  "home": {
    "welcomeBanner": "Welcome to Kastel Hardware Store!",
    "aboutSection": "We are your trusted partner for professional tools and building materials.",
    "servicesInfo": "Browse our tool rental catalog, enroll in professional courses, and manage your account."
  },
  "luz": {
    "helpText": "Click on a shift to view details or request an assignment",
    "emptyState": "No shifts scheduled for this period",
    "infoBanner": "All shift assignments require manager approval"
  },
  "tools": {
    "rentalInstructions": "Select a tool to view details and rental availability",
    "approvalNote": "Rental requests require staff approval"
  },
  "courses": {
    "enrollmentInstructions": "Browse available courses and submit enrollment requests",
    "capacityInfo": "Enrollment is subject to course capacity limits"
  },
  "roles": {
    "managementInfo": "Manage user roles and permissions from this interface",
    "permissionNote": "Role changes take effect immediately"
  }
}
```

**Hebrew Example** (`public/locales/he/ui_content.json`):
```json
{
  "home": {
    "welcomeBanner": "ברוכים הבאים לקסטל חומרי בניין!",
    "aboutSection": "אנחנו השותף המהימן שלך לכלים מקצועיים וחומרי בניין.",
    "servicesInfo": "עיין בקטלוג השכרת הכלים, הירשם לקורסים מקצועיים, וניהל את חשבונך."
  },
  "luz": {
    "helpText": "לחץ על משמרת כדי לצפות בפרטים או לבקש שיבוץ",
    "emptyState": "אין משמרות מתוכננות לתקופה זו",
    "infoBanner": "כל שיבוצי המשמרות דורשים אישור מנהל"
  }
}
```

**Russian & French**: Create empty structure files (will be populated as content is translated)

---

### 3. Migration Strategy

**Problem**: Prevent conflicting sources (same text in both files and database)

**Solution**: Single source of truth principle

**Rule**: Each piece of text lives in ONE place:
- **Editable content** → Lives in `ui_content.json` (can be overridden by database)
- **Static content** → Lives in `common.json`, `shifts.json`, etc. (never editable)

**Migration Process**:

1. **Create** `public/locales/{lang}/ui_content.json` with initial editable content
2. **Remove** migrated content from other files (e.g., delete from `common.json` to prevent conflicts)
3. **Update** components to use `<EditableText>` wrapper for migrated content
4. **Database** starts empty (only populated when someone makes an edit)

**Example Migration**:

**Before**:
```json
// public/locales/he/common.json
{
  "home": {
    "welcomeBanner": "ברוכים הבאים לקסטל"
  },
  "actions": {
    "save": "שמירה"  ← This stays (button label, not editable)
  }
}
```

**After**:
```json
// public/locales/he/ui_content.json (NEW FILE)
{
  "home": {
    "welcomeBanner": "ברוכים הבאים לקסטל"  ← Moved here
  }
}

// public/locales/he/common.json (UPDATED)
{
  "home": {},  ← Removed to prevent conflict
  "actions": {
    "save": "שמירה"  ← Remains (static content)
  }
}
```

**Code Distinction**:
```tsx
// Static content (never editable) - uses t()
<button>{t('common:actions.save')}</button>

// Editable content - uses EditableText wrapper
<EditableText contentKey="home.welcomeBanner">
  {useEditableContent("home.welcomeBanner").text}
</EditableText>
```

**Result**: Clear separation in code between static and editable text. No conflicts.

---

## Component Architecture

### 1. Edit Mode Context

**File**: `src/contexts/EditModeContext.tsx`

**Purpose**: Global state for edit mode toggle (ON/OFF)

```typescript
interface EditModeContextType {
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
}

export const EditModeContext = createContext<EditModeContextType>({
  editMode: false,
  setEditMode: () => {},
});

export const EditModeProvider = ({ children }) => {
  const [editMode, setEditMode] = useState(false);

  // Could add useEffect to reset on unmount if needed

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => useContext(EditModeContext);
```

**Persistence Behavior**:
- ✅ Stays ON across page navigation (state persists in React context)
- ✅ Resets to OFF when site is closed (default state is `false`)
- ❌ Not saved to localStorage (avoids confusion if non-managers open the app)

**Integration**: Wrap app root with `<EditModeProvider>` in `src/main.tsx` or `src/routes/__root.tsx`

---

### 2. Header Component Update

**File**: `src/components/Header.tsx`

**Purpose**: Add edit mode toggle button (manager-only)

```tsx
import { useEditMode } from '@/contexts/EditModeContext';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';

// Inside Header component:
const { hasManagerTag } = usePermissionsV2();
const { editMode, setEditMode } = useEditMode();

// In the header UI (near user menu or navigation):
{hasManagerTag && (
  <button
    onClick={() => setEditMode(!editMode)}
    className={cn(
      "btn btn-sm",
      editMode ? "btn-primary" : "btn-ghost"
    )}
    aria-label={editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
  >
    {editMode ? (
      <>
        <Check className="w-4 h-4 mr-1" />
        Exit Edit Mode
      </>
    ) : (
      <>
        <Edit className="w-4 h-4 mr-1" />
        Edit Mode
      </>
    )}
  </button>
)}
```

**Visual Design**:
- When OFF: Ghost button (subtle, doesn't distract)
- When ON: Primary button (clear visual indicator that edit mode is active)
- Shows different icon based on state (Edit icon when OFF, Check icon when ON)

---

### 3. EditableText Component (Wrapper)

**File**: `src/components/EditableText.tsx`

**Purpose**: Wrapper that makes text editable with inline editing

**Props**:
```typescript
interface EditableTextProps {
  contentKey: string;          // "home.welcomeBanner", "luz.helpText"
  namespace?: string;          // "ui_content" (default)
  children: ReactNode;         // The actual text content
  className?: string;          // Pass-through styling (for banner, heading, etc.)
  as?: 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'span'; // HTML element type
  multiline?: boolean;         // Use textarea (multi-line) vs input (single-line)
}
```

**Features**:
- Shows pencil icon on hover (only when edit mode is ON)
- Double-click text to activate editing
- Text converts to `<input>` or `<textarea>` with border
- Click outside → Auto-save
- Press Escape → Cancel edit (revert to original)
- RTL-aware (works correctly in Hebrew)
- Optimistic updates (instant UI feedback while saving)

**Visual States**:

**State 1: Not Editing (Edit Mode OFF)**
```
ברוכים הבאים לקסטל חומרי בניין
(no pencil icon, no interaction)
```

**State 2: Not Editing (Edit Mode ON)**
```
ברוכים הבאים לקסטל חומרי בניין  ✏️
                                   ↑ appears on hover
```

**State 3: Editing (After Double-Click)**
```
┌───────────────────────────────────────┐
│ ברוכים הבאים לקסטל חומרי בניין │      │  ← Input with border
└───────────────────────────────────────┘
Click outside to save | Esc to cancel
```

**Component Implementation** (simplified):
```tsx
export const EditableText = ({
  contentKey,
  namespace = "ui_content",
  children,
  className,
  as: Component = 'div',
  multiline = false,
}: EditableTextProps) => {
  const { editMode } = useEditMode();
  const { currentLanguage } = useLanguage();
  const { hasManagerTag } = usePermissionsV2();
  const saveContent = useMutation(api.ui_content.saveUIContent);

  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { text } = useEditableContent(contentKey);

  // Only show edit capabilities if: edit mode ON + user is manager
  const canEdit = editMode && hasManagerTag;

  // Handle double-click to start editing
  const handleDoubleClick = () => {
    if (!canEdit) return;
    setEditedValue(text);
    setIsEditing(true);
  };

  // Handle save (click outside)
  const handleSave = async () => {
    if (editedValue === text) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await saveContent({
        key: contentKey,
        content: editedValue,
        language: currentLanguage,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      // Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel (Escape key)
  const handleCancel = () => {
    setEditedValue(text);
    setIsEditing(false);
  };

  // If editing, show input/textarea
  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';

    return (
      <InputComponent
        value={editedValue}
        onChange={(e) => setEditedValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Escape') handleCancel();
          if (e.key === 'Enter' && !multiline) handleSave();
        }}
        className={cn(
          "input input-bordered w-full",
          multiline && "textarea",
          className
        )}
        autoFocus
        disabled={isSaving}
      />
    );
  }

  // Not editing - show regular text with pencil icon on hover
  return (
    <Component
      className={cn(
        "relative group",
        canEdit && "cursor-pointer hover:bg-base-200",
        className
      )}
      onDoubleClick={handleDoubleClick}
    >
      {children}
      {canEdit && (
        <Pencil className="absolute top-2 right-2 w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </Component>
  );
};
```

---

### 4. Custom Hook: useEditableContent

**File**: `src/hooks/useEditableContent.ts`

**Purpose**: Load content from database (if edited) or translation file (fallback)

```typescript
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from './useLanguage';
import { api } from '../../convex/_generated/api';

export const useEditableContent = (contentKey: string, namespace = 'ui_content') => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();

  // Query database for custom override
  const override = useQuery(api.ui_content.getUIContent, {
    key: contentKey,
    language: currentLanguage,
  });

  // Fallback to translation file
  const defaultText = t(`${namespace}:${contentKey}`);

  // Priority: Database override > Translation file default
  return {
    text: override?.text || defaultText,
    needsTranslation: override?.needsTranslation || false,
    isOverridden: !!override?.text,
    isLoading: override === undefined,
  };
};
```

**Usage in Components**:
```tsx
const { text, needsTranslation, isLoading } = useEditableContent("home.welcomeBanner");

if (isLoading) return <div>Loading...</div>;

return (
  <EditableText contentKey="home.welcomeBanner">
    {text}
    {needsTranslation && (
      <span className="badge badge-warning ml-2">Translation Outdated</span>
    )}
  </EditableText>
);
```

---

### 5. Backend Functions

**File**: `convex/ui_content.ts`

#### Mutation: Save Edited Content

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Helper to get current user (reuse from users_v2.ts)
import { getCurrentUser } from "./users_v2";

export const saveUIContent = mutation({
  args: {
    key: v.string(),        // "home.welcomeBanner"
    content: v.string(),    // Edited text
    language: v.string(),   // "he", "en", "ru", "fr"
  },
  handler: async (ctx, args) => {
    // 1. Verify manager permissions
    const user = await getCurrentUser(ctx);
    if (!user?.managerTag) {
      throw new ConvexError("Only managers can edit content");
    }

    // 2. Validate language
    const validLanguages = ["en", "he", "ru", "fr"];
    if (!validLanguages.includes(args.language)) {
      throw new ConvexError(`Invalid language: ${args.language}`);
    }

    // 3. Get existing entry or prepare for new one
    const existing = await ctx.db
      .query("ui_content")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    // 4. Build update object
    const updates: any = {
      [`content_${args.language}`]: args.content,
      lastEditedBy: user._id,
      lastEditedAt: Date.now(),
      lastEditedLanguage: args.language,
      // Clear "needs translation" flag for the edited language
      [`needsTranslation_${args.language}`]: false,
    };

    // 5. Mark OTHER languages as needing translation
    validLanguages.forEach(lang => {
      if (lang !== args.language) {
        updates[`needsTranslation_${lang}`] = true;
      }
    });

    // 6. Save to database
    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return { success: true, updated: true };
    } else {
      await ctx.db.insert("ui_content", {
        key: args.key,
        namespace: "ui_content",
        ...updates,
      });
      return { success: true, updated: false };
    }
  },
});
```

#### Query: Get Content for Key/Language

```typescript
export const getUIContent = query({
  args: {
    key: v.string(),
    language: v.string()
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("ui_content")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    // If no database entry, component will fall back to translation file
    if (!content) return null;

    return {
      text: content[`content_${args.language}`],
      needsTranslation: content[`needsTranslation_${args.language}`] || false,
      lastEditedAt: content.lastEditedAt,
      lastEditedBy: content.lastEditedBy,
    };
  },
});
```

#### Query: Get All UI Content (Admin/Debug)

```typescript
export const getAllUIContent = query({
  handler: async (ctx) => {
    // Get current user for permission check
    const user = await getCurrentUser(ctx);
    if (!user?.managerTag) {
      throw new ConvexError("Only managers can view all content");
    }

    return await ctx.db.query("ui_content").collect();
  },
});
```

---

## Implementation Phases

### Phase 1: Infrastructure (3 hours)

**Goal**: Set up database, backend, and translation files

**Files to Create**:
- `convex/ui_content.ts` - Backend mutations and queries
- `public/locales/en/ui_content.json` - English defaults
- `public/locales/he/ui_content.json` - Hebrew defaults
- `public/locales/ru/ui_content.json` - Empty structure
- `public/locales/fr/ui_content.json` - Empty structure
- `src/contexts/EditModeContext.tsx` - Edit mode state provider
- `src/hooks/useEditableContent.ts` - Content loading hook

**Files to Modify**:
- `convex/schema.ts` - Add `ui_content` table definition
- Selected translation files - Remove migrated content to prevent conflicts

**Tasks**:
1. Define `ui_content` table schema in `convex/schema.ts`
2. Create `convex/ui_content.ts` with mutations and queries
3. Add permission checks (manager-only)
4. Create `public/locales/{lang}/ui_content.json` files with initial content
5. Identify content to migrate from existing files
6. Move content to `ui_content.json` and remove from old files (prevent conflicts)
7. Create `EditModeContext` provider
8. Create `useEditableContent` hook
9. Wrap app root with `<EditModeProvider>`

**Deliverables**:
- ✅ Database table deployed
- ✅ Backend functions working
- ✅ Translation files created with defaults
- ✅ No conflicting content sources
- ✅ Edit mode context available globally

---

### Phase 2: UI Components (4 hours)

**Goal**: Build EditableText component and edit mode toggle

**Files to Create**:
- `src/components/EditableText.tsx` - Main wrapper component

**Files to Modify**:
- `src/components/Header.tsx` - Add edit mode toggle button

**Tasks**:
1. Build `EditableText` component skeleton
2. Implement state management (isEditing, editedValue)
3. Implement double-click to edit activation
4. Implement input/textarea rendering during edit mode
5. Implement click-outside to save functionality
6. Implement Escape key to cancel
7. Add pencil icon with hover-only visibility
8. Style input/textarea (border, focus states)
9. Add loading/saving states
10. Handle RTL layouts (Hebrew)
11. Add optimistic UI updates
12. Add edit mode toggle button to Header
13. Style toggle button (ghost/primary states)
14. Add manager permission check for toggle visibility

**Deliverables**:
- ✅ `EditableText` component working with all interactions
- ✅ Edit mode toggle in header (manager-only)
- ✅ Pencil icons appear on hover in edit mode
- ✅ Double-click activates editing
- ✅ Click outside saves, Escape cancels
- ✅ RTL support working

---

### Phase 3: Integration (2 hours)

**Goal**: Wrap target UI elements throughout the app

**Files to Modify**:
- `src/routes/index.tsx` - Home page content
- `src/routes/luz.tsx` - LUZ help text, info banners
- `src/routes/tools.tsx` - Tool instructions, approval notes
- `src/routes/educational.tsx` - Course enrollment instructions
- `src/routes/roles.tsx` - Role management info text

**Tasks**:
1. Audit all pages to identify editable text locations
2. Wrap each editable element with `<EditableText>`
3. Replace `{t('...')}` with `{useEditableContent('...').text}`
4. Test each wrapped element:
   - Toggle edit mode ON
   - Verify pencil icon appears on hover
   - Double-click to edit
   - Modify text
   - Click outside to save
   - Verify database update
   - Verify real-time sync in another browser tab
5. Test translation flags:
   - Edit Hebrew version
   - Verify English flagged as "needs translation"
   - Switch to English
   - Edit English version
   - Verify flag cleared

**Deliverables**:
- ✅ All target UI elements wrapped with `<EditableText>`
- ✅ Edit flow working on all pages
- ✅ Database saving correctly
- ✅ Translation flags working
- ✅ Real-time updates working

---

### Phase 4: Testing & Polish (2 hours)

**Goal**: Comprehensive testing and UX improvements

**Testing Checklist**:
- [ ] **Permissions**:
  - [ ] Manager can toggle edit mode ON/OFF
  - [ ] Non-managers don't see edit mode toggle
  - [ ] Non-managers can't edit even if they force edit mode (backend check)
- [ ] **Visual Indicators**:
  - [ ] Pencil icons only appear when edit mode is ON
  - [ ] Pencil icons only appear on hover
  - [ ] Editing state shows clear visual distinction (border)
- [ ] **Interaction Flow**:
  - [ ] Double-click activates editing
  - [ ] Click outside saves changes
  - [ ] Escape cancels edit and reverts text
  - [ ] Enter saves (for single-line inputs)
- [ ] **Data Persistence**:
  - [ ] Changes save to database
  - [ ] Database override takes precedence over file default
  - [ ] Other languages flagged "needs translation"
  - [ ] Flag cleared when that language is edited
- [ ] **State Management**:
  - [ ] Edit mode persists across page navigation
  - [ ] Edit mode resets to OFF when closing site
  - [ ] Multiple managers can edit simultaneously (no conflicts)
- [ ] **Localization**:
  - [ ] RTL layout works correctly (Hebrew)
  - [ ] Editing Hebrew doesn't affect English text
  - [ ] Switching languages shows correct content
- [ ] **Performance**:
  - [ ] Optimistic updates provide instant feedback
  - [ ] No lag when toggling edit mode
  - [ ] No lag when hovering (pencil icon appears smoothly)

**Polish Tasks**:
1. Add loading spinner during save
2. Add success feedback (toast notification or subtle flash)
3. Error handling:
   - Permission denied
   - Network errors
   - Empty content validation
4. Keyboard shortcuts documentation (in tooltip?)
5. Character limit indicators (if needed)
6. Prevent saving empty content
7. Add visual feedback for "needs translation" badge
8. Improve hover states and transitions
9. Test on mobile (touch devices)
10. Accessibility audit (keyboard navigation, screen readers)

**Deliverables**:
- ✅ All tests passing
- ✅ Error handling robust
- ✅ UX polished and smooth
- ✅ Accessibility compliant
- ✅ Documentation updated

---

## Example Usage Patterns

### Pattern 1: Simple Banner

**Before** (static):
```tsx
<div className="alert alert-info">
  <p>{t('common:luz.helpText')}</p>
</div>
```

**After** (editable):
```tsx
<EditableText
  contentKey="luz.helpText"
  className="alert alert-info"
  as="p"
>
  {useEditableContent("luz.helpText").text}
</EditableText>
```

---

### Pattern 2: Multi-line Description

**Before**:
```tsx
<div className="prose">
  <p>{t('common:home.aboutSection')}</p>
</div>
```

**After**:
```tsx
<EditableText
  contentKey="home.aboutSection"
  className="prose"
  as="p"
  multiline  {/* Use textarea for multi-line */}
>
  {useEditableContent("home.aboutSection").text}
</EditableText>
```

---

### Pattern 3: Heading with Translation Status

**Before**:
```tsx
<h2 className="text-2xl font-bold">
  {t('common:courses.enrollmentTitle')}
</h2>
```

**After**:
```tsx
const { text, needsTranslation } = useEditableContent("courses.enrollmentTitle");

<EditableText
  contentKey="courses.enrollmentTitle"
  as="h2"
  className="text-2xl font-bold"
>
  {text}
  {needsTranslation && editMode && (
    <span className="badge badge-warning ml-2 text-sm font-normal">
      Translation Outdated
    </span>
  )}
</EditableText>
```

---

### Pattern 4: Inline Help Text

**Before**:
```tsx
<span className="text-sm text-gray-500">
  {t('common:tools.approvalNote')}
</span>
```

**After**:
```tsx
<EditableText
  contentKey="tools.approvalNote"
  as="span"
  className="text-sm text-gray-500"
>
  {useEditableContent("tools.approvalNote").text}
</EditableText>
```

---

## Migration Checklist

### Content to Migrate

**Home Page** (`src/routes/index.tsx`):
- [ ] Welcome banner/heading
- [ ] About section description
- [ ] Services overview text
- [ ] Info alerts/banners

**LUZ Page** (`src/routes/luz.tsx`):
- [ ] Help text: "Click on a shift to view details..."
- [ ] Empty state message: "No shifts scheduled..."
- [ ] Info banner: "All assignments require approval..."
- [ ] View switcher labels (if not in common.json already)

**Tools Page** (`src/routes/tools.tsx`):
- [ ] Rental instructions
- [ ] Approval workflow description
- [ ] Availability notes
- [ ] Customer info banners

**Courses Page** (`src/routes/educational.tsx`):
- [ ] Enrollment instructions
- [ ] Capacity information
- [ ] Session info text
- [ ] Help text for course creation

**Roles Page** (`src/routes/roles.tsx`):
- [ ] Role management description
- [ ] Permission notes
- [ ] Info banners about tag system

### Migration Process Per Item

For each piece of content:

1. **Identify**: Find the current location (e.g., `common:home.welcomeBanner`)
2. **Create**: Add to `ui_content.json`:
   ```json
   "home": {
     "welcomeBanner": "Welcome text here"
   }
   ```
3. **Remove**: Delete from old file (`common.json`)
4. **Update Code**:
   ```tsx
   // Old:
   {t('common:home.welcomeBanner')}

   // New:
   <EditableText contentKey="home.welcomeBanner">
     {useEditableContent("home.welcomeBanner").text}
   </EditableText>
   ```
5. **Test**: Verify it displays correctly and is editable

---

## File Structure Summary

```
convex/
  schema.ts                  # UPDATE: Add ui_content table
  ui_content.ts              # NEW: Backend mutations/queries

src/
  components/
    EditableText.tsx         # NEW: Wrapper component
    Header.tsx               # UPDATE: Add edit mode toggle
  contexts/
    EditModeContext.tsx      # NEW: Global edit mode state
  hooks/
    useEditableContent.ts    # NEW: Content loading hook
  routes/
    index.tsx                # UPDATE: Wrap editable content
    luz.tsx                  # UPDATE: Wrap editable content
    tools.tsx                # UPDATE: Wrap editable content
    educational.tsx          # UPDATE: Wrap editable content
    roles.tsx                # UPDATE: Wrap editable content

public/locales/
  en/
    ui_content.json          # NEW: Editable content defaults
    common.json              # UPDATE: Remove migrated content
  he/
    ui_content.json          # NEW: Hebrew defaults
    common.json              # UPDATE: Remove migrated content
  ru/
    ui_content.json          # NEW: Empty structure
  fr/
    ui_content.json          # NEW: Empty structure
```

---

## Design Decisions Summary

### Core Decisions
1. ✅ **Database storage** (follows Contentful/Sanity/Strapi industry standard)
2. ✅ **Inline editing** (no modal, edit directly in place)
3. ✅ **Double-click activation** (pencil is visual indicator only)
4. ✅ **Click outside to save** (auto-save behavior)
5. ✅ **Escape to cancel** (easy undo)
6. ✅ **Input with border** visual style (clear editing state)

### Content Management
7. ✅ **Single source of truth**: Content lives in `ui_content.json` OR old files, never both
8. ✅ **Migration required**: Move editable content from old files to `ui_content.json`
9. ✅ **Code clarity**: `<EditableText>` = editable, `{t(...)}` = static

### Permissions & Workflow
10. ✅ **Manager permissions** only (no translator tag for now)
11. ✅ **Auto-approve** edits (no review workflow)
12. ✅ **Global edit mode** toggle (persists across pages, resets on site close)

### Multilingual Support
13. ✅ **Separate fields per language** (`content_he`, `content_en`, etc.)
14. ✅ **Translation flags** (auto-flag other languages as outdated when one is edited)
15. ✅ **Keep old translations** (don't break UI while waiting for translations)

---

## Estimated Timeline

**Phase 1 (Infrastructure)**: 3 hours
- Database schema
- Backend functions
- Translation files
- Migration
- Context providers

**Phase 2 (Components)**: 4 hours
- EditableText component
- Edit mode toggle
- All interaction states
- Visual styling

**Phase 3 (Integration)**: 2 hours
- Wrap all target elements
- Test each page
- Verify data flow

**Phase 4 (Testing/Polish)**: 2 hours
- Comprehensive testing
- Error handling
- UX improvements
- Accessibility

**Total**: ~11 hours for complete implementation

---

## Future Enhancements (Post-MVP)

### Translation Management Dashboard
- View all editable content in a table
- Filter by language, status, "needs translation" flag
- Bulk approve/reject (if approval workflow added)
- Export to JSON for professional translators
- Import translated JSON back into database
- Diff view (original vs edited)

### Advanced Features
- Version history (track all edits over time)
- Rollback capability (restore previous version)
- Batch edit mode (edit multiple items at once)
- Translation memory (suggest similar translations)
- Character limits and validation rules
- Rich text editing (formatting, links, etc.)
- Image/media upload support

### Analytics
- Track which content gets edited most
- Track translation lag (how long content stays "needs translation")
- User activity logs (who edits what)

---

## Questions & Answers Log

### Q1: Why database storage instead of editing files directly?
**A**: Industry standard (Contentful, Sanity, Strapi all use DB). Benefits:
- Real-time sync across all users
- Audit trail (who edited what, when)
- No git conflicts
- Easier to implement versioning/rollback
- Better performance for queries

### Q2: Won't this create conflicts with translation files?
**A**: No, because we use **single source of truth** principle:
- Editable content lives in `ui_content.json` (with DB overrides)
- Static content lives in `common.json`, etc.
- Never duplicate content between files
- Code makes it clear: `<EditableText>` vs `{t(...)}`

### Q3: What happens to translation files when content is edited?
**A**: Translation files serve as **defaults/fallbacks** only:
- If database has a value → use database
- If database is empty → use file default
- Editing creates/updates database entry
- Files remain unchanged (version controlled)

### Q4: How do we prevent editing business data (shift names, tools)?
**A**: Only wrap UI content with `<EditableText>`:
- ✅ Info banners, help text, instructions
- ❌ Shift names, tool descriptions, course titles
- Clear separation: UI content vs business data

### Q5: What if we want to edit in all languages at once?
**A**: Not supported in MVP (edit one language at a time). Future enhancement: multi-language editor where you can see all languages side-by-side and edit them together.

---

## References

### Industry Research
- Contentful, Sanity, Strapi all use database storage for editable content
- Git-based CMS (like Crafter CMS) use files, but have complex merge workflows
- Hybrid approach (DB for content, files for defaults) is common pattern

### Related Documentation
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Current implementation status
- [CLAUDE.md](../CLAUDE.md) - i18n implementation guidelines
- [REDESIGN_V2.md](REDESIGN_V2.md) - Permission system (managerTag)

### Technology Stack
- **Convex**: Real-time database with reactive queries
- **i18next**: Translation framework (already implemented)
- **React**: Component-based UI
- **TypeScript**: Type-safe implementation

---

## Status

**Design**: ✅ Complete
**Implementation**: ⏳ Pending
**Testing**: ⏳ Pending
**Deployment**: ⏳ Pending

**Next Steps**: Begin Phase 1 implementation when ready
