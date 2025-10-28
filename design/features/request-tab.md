# Request Tab

📍 **Navigation:**
- **Parent**: [../architecture.md](../architecture.md)
- **Status**: [../status.md](../status.md)

**Purpose**: Customer request and order management system.

**Status**: Not implemented - planning phase

---

## Concept

Customers submit requests for services not covered by tools/courses/shifts. Staff reviews and processes requests.

**Examples**: Custom orders, special services, pickup scheduling, material requests.

---

## Basic Flow

1. Customer fills request form (category, description, urgency)
2. Request enters pending queue
3. Staff reviews and processes (approve/reject/fulfill)
4. Customer notified of status changes

---

## Open Questions

### Scope
- What request categories? (tools, services, materials, custom, other?)
- Should requests have pricing/quotes?
- File attachments needed? (photos, documents)
- Integration with existing systems? (create shift from request, create rental from request)

### Workflow
- Who can process requests? (all staff, managers only, category-specific?)
- Approval workflow? (single-step, multi-step, auto-approve certain types)
- Assignment system? (requests assigned to specific staff members?)
- Priority/urgency levels? (how many, how handled)

### Features
- Request templates for common items?
- Automated routing based on category?
- Customer request history tracking?
- Request expiration/auto-close?

---

## Database (Rough)

**requests table**:
- Customer, staff, category, title, description
- Status, priority, timestamps
- Notes, rejection reason

**Indexes**: By status, customer, staff, category

---

## UI (Rough)

**Customer**: Request form, my requests list

**Staff**: Request queue, filter/sort, details modal, action buttons

---

## Integration Points

- WhatsApp: Message customer from request
- Notifications: Status change alerts
- LUZ: Create event from approved request

---

**Next Steps**: Define categories, workflow, permissions before implementation.
