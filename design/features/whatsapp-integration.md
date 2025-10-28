# WhatsApp Integration

📍 **Navigation:**
- **Parent**: [../architecture.md](../architecture.md)
- **Status**: [../status.md](../status.md)

**Purpose**: Staff communicate with customers via WhatsApp from app.

**Status**: Not implemented - learning/integration phase

---

## Concept

Staff can message customers without leaving the app. Used for confirmations, reminders, updates.

**Two Approaches**:
1. **Click-to-WhatsApp links** (`wa.me/{phone}`) - Simple, free, no API needed
2. **WhatsApp Business API** - Full integration, message tracking, costs money

---

## Learning Phase

### WhatsApp Business API
- **Documentation**: developers.facebook.com/docs/whatsapp
- **Requirements**: Business verification, message template approval
- **Pricing**: Per-message costs (varies by country)
- **Features**: Two-way messaging, delivery receipts, rich media

### Click-to-WhatsApp
- **Format**: `https://wa.me/972501234567?text=Hello`
- **Requirements**: None
- **Pricing**: Free
- **Features**: One-way (opens WhatsApp app), no tracking

---

## Open Questions

### Integration Approach
- Start with click-to-WhatsApp or go straight to API?
- Message tracking needed? (important enough to justify API cost?)
- Two-way messaging needed? (customers replying via WhatsApp)
- Bulk messaging needed? (course announcements to all students)

### Use Cases
- Which events trigger WhatsApp messages? (shift assignments, rental approvals, course updates, all?)
- Message templates? (pre-defined text with placeholders)
- Staff can send custom messages? (free text or templates only)
- Language support? (Hebrew messages, English fallback)

### Technical
- Phone number format? (international format, validation)
- Message character limits? (WhatsApp supports 4,096 chars)
- Store phone numbers where? (users table, separate contacts table)
- Message history tracking? (log all messages sent)

---

## Minimal Implementation (Click-to-WhatsApp)

1. Add phone field to users table
2. Create `WhatsAppButton` component
3. Generate `wa.me` links with pre-filled messages
4. Add button to: user profiles, shift modals, rental modals, course modals

---

## API Integration (Future)

1. Apply for WhatsApp Business API
2. Submit message templates for approval
3. Integrate API endpoints
4. Add message tracking database table
5. Build two-way messaging UI

---

## Integration Points

- Notifications system: Send via WhatsApp instead of/in addition to email
- Request tab: Staff message customer about request
- Shifts/tools/courses: Send confirmations/reminders

---

**Next Steps**: Research API costs, decide on approach, test click-to-WhatsApp first.
