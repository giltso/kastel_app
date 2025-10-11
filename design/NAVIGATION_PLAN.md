# Documentation Navigation Plan

**Status**: ⏳ TEMPORARY FILE - Navigation system ready for implementation in CLAUDE.md
**Date**: Current Session
**Purpose**: Define navigation shortcuts and internal linking system for design documentation

---

## 📚 Document Hierarchy

```
CLAUDE.md (Technical Guidelines)
    └── PROJECT_OVERVIEW.md (Project State & Status)
        └── REDESIGN_V2.md (Main V2 Architecture)
            ├── SHIFT_REDESIGN.md (Shift System Philosophy & Schema)
            │   ├── SHIFTS_IMPLEMENTATION.md (Code Implementation Details)
            │   └── LUZ_CALENDAR_REDESIGN.md (LUZ Interface Specifications)
            └── [Other Feature Docs]
```

---

## 🔗 Navigation Shortcuts for CLAUDE.md

### Quick Access Commands
*Add to CLAUDE.md for fast navigation during sessions*

```markdown
## Documentation Quick Navigation

### Core Documentation
- **CLAUDE.md** (this file): Technical guidelines, coding standards, workflows
- **PROJECT_OVERVIEW.md**: Current project status, implementation progress, priority tasks
- **session_history.md**: Historical development context, last 2 sessions for continuity

### Design Documentation Hierarchy
- **REDESIGN_V2.md**: Main V2 architecture, role system, high-level design
  - **SHIFT_REDESIGN.md**: Population-based shift philosophy, database schema
    - **SHIFTS_IMPLEMENTATION.md**: Modal system, backend integration, code details
    - **LUZ_CALENDAR_REDESIGN.md**: Complete LUZ interface specifications

### Navigation Commands
- **Session Start**: Read PROJECT_OVERVIEW.md + session_history.md (last 2 sessions) + relevant feature docs
- **Feature Work**: Read parent design docs → child implementation docs → code files
- **Session End**: Update PROJECT_OVERVIEW.md + session_history.md + feature docs

### Document Purposes
| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| CLAUDE.md | Technical standards & workflows | When patterns change |
| PROJECT_OVERVIEW.md | Current status & priorities | After major milestones |
| session_history.md | Development history | End of each session |
| REDESIGN_V2.md | V2 architecture & roles | During design changes |
| Feature docs | Specific system designs | During feature development |
```

---

## 📋 Internal Linking Standards

### Link Format Rules
1. **Relative Paths**: Use `[Link Text](FILENAME.md)` for same-directory links
2. **Section Links**: Use `[Link Text](FILENAME.md#section-heading)` for specific sections
3. **Code Links**: Use `[Link Text](../path/to/file.ts)` for code references
4. **Always Use Descriptive Text**: Never use "click here" or generic text

### Standard Link Patterns

#### Parent-to-Child Links
```markdown
**Complete details in [CHILD_DOC.md](CHILD_DOC.md)**

**High-Level Summary:**
- Key point 1
- Key point 2

👉 **See [CHILD_DOC.md](CHILD_DOC.md) for:**
- Detailed specifications
- Implementation examples
- Advanced features
```

#### Child-to-Parent Links
```markdown
**Parent Design Documents**: [PARENT.md](PARENT.md) → **CURRENT.md** (you are here)

**Navigation Guide:**
- **Architecture Overview**: See [PARENT.md](PARENT.md#section) for high-level context
- **Related Systems**: See [SIBLING.md](SIBLING.md) for related features
```

#### Code-to-Doc Links
```markdown
**Implementation documented in [DESIGN_DOC.md](../../design/DESIGN_DOC.md)**

**Schema reference**: See [convex/schema.ts](../convex/schema.ts) for current implementation
```

---

## 🎯 Navigation Additions by Document

### CLAUDE.md (Already Added)
- Session Workflow section with documentation reading protocol
- Documentation Standards section referencing this guide
- Clear hierarchy explanation

### PROJECT_OVERVIEW.md (Needs Addition)
Add navigation section at top:
```markdown
## 📍 Navigation

**Design Documentation**: See [REDESIGN_V2.md](REDESIGN_V2.md) for complete V2 architecture
**Implementation Status**: This document tracks current progress (update after major milestones)
**Session History**: See [session_history.md](session_history.md) for development timeline
**Technical Guidelines**: See [../CLAUDE.md](../CLAUDE.md) for coding standards
```

### REDESIGN_V2.md (Needs Addition)
Add navigation at top (similar pattern already implemented):
```markdown
**Parent**: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) → **REDESIGN_V2.md** (you are here)

**Child Documents**:
- **Shift System**: [SHIFT_REDESIGN.md](SHIFT_REDESIGN.md) - Population-based architecture
- **LUZ Interface**: [LUZ_CALENDAR_REDESIGN.md](LUZ_CALENDAR_REDESIGN.md) - UI specifications
- **Implementation**: [SHIFTS_IMPLEMENTATION.md](SHIFTS_IMPLEMENTATION.md) - Code details
```

### SHIFT_REDESIGN.md (Needs Addition)
```markdown
**Parent**: [REDESIGN_V2.md](REDESIGN_V2.md) → **SHIFT_REDESIGN.md** (you are here)

**Related Documents**:
- **LUZ Interface**: [LUZ_CALENDAR_REDESIGN.md](LUZ_CALENDAR_REDESIGN.md)
- **Implementation**: [SHIFTS_IMPLEMENTATION.md](SHIFTS_IMPLEMENTATION.md)
- **Schema**: [convex/schema.ts](../convex/schema.ts)
```

### SHIFTS_IMPLEMENTATION.md (Needs Addition)
```markdown
**Parent Design**: [SHIFT_REDESIGN.md](SHIFT_REDESIGN.md) → **SHIFTS_IMPLEMENTATION.md** (you are here)

**Related**:
- **Architecture**: [REDESIGN_V2.md](REDESIGN_V2.md) for role system
- **LUZ Interface**: [LUZ_CALENDAR_REDESIGN.md](LUZ_CALENDAR_REDESIGN.md) for UI context
```

### LUZ_CALENDAR_REDESIGN.md (Already Added)
✅ Navigation section already implemented in this session

---

## 🚀 Implementation Checklist

### Phase 1: Update CLAUDE.md
- [ ] Add "Documentation Quick Navigation" section
- [ ] Add document hierarchy visualization
- [ ] Add navigation commands for session workflow
- [ ] Add document purpose table

### Phase 2: Update Design Documents
- [ ] Add navigation to PROJECT_OVERVIEW.md
- [ ] Add navigation to REDESIGN_V2.md
- [ ] Add navigation to SHIFT_REDESIGN.md
- [ ] Add navigation to SHIFTS_IMPLEMENTATION.md
- [x] LUZ_CALENDAR_REDESIGN.md (already done)

### Phase 3: Update Code Files
- [ ] Add design doc references to key implementation files:
  - `/src/routes/luz.tsx` → Link to LUZ_CALENDAR_REDESIGN.md
  - `/convex/shifts.ts` → Link to SHIFT_REDESIGN.md
  - `/convex/shift_assignments.ts` → Link to SHIFT_REDESIGN.md

### Phase 4: Validation
- [ ] Verify all links work correctly
- [ ] Check that navigation pattern is consistent
- [ ] Ensure bidirectional linking (parent↔child)
- [ ] Test navigation flow from CLAUDE.md → Code

---

## 📝 Style Guidelines

### Navigation Block Placement
- **Top of Document**: Always place navigation immediately after title and status
- **Before Main Content**: Navigation comes before any content sections
- **After Metadata**: Place after status/date/context metadata

### Navigation Block Structure
```markdown
# Document Title

**Parent/Hierarchy Info** (if applicable)
**Status/Context Info**
**Related Documents** (if applicable)

---

📍 **Navigation Guide:** (optional, for complex docs)
- Bullet point links to key related sections/docs

---

[Main Content Starts Here]
```

### Link Text Best Practices
- ✅ "See [SHIFT_REDESIGN.md](SHIFT_REDESIGN.md) for database schema"
- ✅ "Complete details in [LUZ_CALENDAR_REDESIGN.md](LUZ_CALENDAR_REDESIGN.md)"
- ❌ "Click [here](SHIFT_REDESIGN.md) for more info"
- ❌ "See [this doc](SHIFT_REDESIGN.md)"

---

## 🎯 Success Criteria

Navigation system is successful when:
1. ✅ Any developer can find related docs in <30 seconds
2. ✅ Document hierarchy is clear from any starting point
3. ✅ Bidirectional links work (parent↔child)
4. ✅ All design decisions traceable to code implementation
5. ✅ Session workflow includes documentation reading protocol

---

**Next Step**: Implement this navigation plan across all documents listed in Phase 2-3 checklist.
