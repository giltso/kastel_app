# Color Picker System

📍 **Navigation:**
- **Parent**: [../architecture.md](../architecture.md)
- **Status**: [../status.md](../status.md)

**Purpose**: Custom colors for shifts, courses, categories for visual organization.

**Status**: Basic shift color picker exists, needs improvement

---

## Current State

Shift creation modal has basic HTML color input (`<input type="color">`).

**Problems**:
- Full color spectrum overwhelming
- No presets/palette
- Inconsistent colors across similar shifts
- No contrast checking (text may be unreadable)

---

## Desired State

Custom color picker component with:
- Predefined palette (10-12 colors)
- Color names/labels
- Recent colors
- Custom color option (advanced)
- Accessibility warnings (contrast too low)

---

## Open Questions

### Scope
- Where used? (shifts, courses, tool categories, requests, other?)
- Color presets? (save favorite color schemes)
- Default colors? (auto-assign based on type/category)
- Batch operations? (change all morning shifts to blue)

### Palette
- How many preset colors? (12, 16, 20?)
- Which colors? (daisyUI theme colors, custom palette, both?)
- Custom colors allowed? (or palette-only for consistency)
- Color themes? (entire calendar color scheme)

### Accessibility
- Contrast checking? (warn if text unreadable on background)
- Color blindness support? (use patterns/icons in addition to color)
- Text color auto-calculate? (white on dark, black on light)

### Storage
- Store as hex? (#rrggbb format)
- Store as daisyUI color names? (primary, secondary, accent)
- Default color per type? (operational shifts always blue unless customized)

---

## Minimal Implementation

**Component**:
- Grid of 12 preset colors
- Click to select
- Current selection highlighted
- "Custom" button for full picker (optional)

**Colors** (suggested):
Blue, Green, Yellow, Red, Purple, Pink, Indigo, Teal, Orange, Gray, Lime, Cyan

**Integration**:
- Shift creation/edit modal (replace existing)
- Course creation/edit modal (add)
- Future: Tool categories, request types

---

## Advanced Features (Future)

- Color presets (save/load color schemes)
- Batch color assignment
- Color themes (predefined schemes)
- Analytics (most used colors)
- Import/export

---

**Next Steps**: Design palette, build component, replace existing shift color input.
