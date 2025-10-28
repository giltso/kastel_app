# Notifications System

📍 **Navigation:**
- **Parent**: [../architecture.md](../architecture.md)
- **Status**: [../status.md](../status.md)

**Purpose**: Alert users to important events (in-app, email, SMS).

**Status**: Not implemented - planning phase

---

## Problem

Users must manually check pages for updates. No proactive alerts for:
- Shift assignments approved/rejected
- Rental requests approved/denied
- Course enrollments processed
- Request status changes

---

## Channels

**In-App** (Priority 1):
- Bell icon in header with unread count
- Dropdown shows recent notifications
- Free, no external dependencies

**Email** (Priority 2):
- For events when user not active
- Permanent record
- Uses SendGrid or similar

**SMS** (Priority 3):
- Urgent time-sensitive only (shift starting soon, rental overdue)
- Costs money per message
- Uses Twilio or similar

---

## Open Questions

### Scope
- Which events need notifications? (all status changes, or critical only?)
- User preferences? (enable/disable per type, choose channels)
- Notification grouping? (batch similar notifications, or individual?)
- Quiet hours? (no SMS at night)

### Channels
- Email service? (SendGrid, AWS SES, Resend, other?)
- SMS service? (Twilio, AWS SNS, other?)
- Push notifications? (browser push, future mobile app)

### Storage
- Store all notifications in database? (for history)
- Retention period? (delete after 30 days, or keep forever)
- Mark as read/unread?
- Delete notifications?

### Delivery
- Retry failed emails/SMS? (how many times, backoff strategy)
- Rate limiting? (max X notifications per hour to prevent spam)
- Batch sends? (queue and send in batches)

---

## Minimal Implementation (In-App Only)

**Database**:
- `notifications` table: userId, type, title, message, actionUrl, isRead, createdAt

**UI**:
- Bell icon component in header
- Notification dropdown
- Mark as read

**Backend**:
- Create notification function (called from mutations)
- Mark as read mutation
- Get user notifications query

---

## Email/SMS (Future)

**Database**:
- `user_notification_preferences` table: email/SMS toggles per event type

**Integration**:
- SendGrid API for email
- Twilio API for SMS
- Queue system for async sending

---

## Integration Points

- Shifts: Assignment approved/rejected, shift cancelled
- Tools: Rental approved/denied, rental overdue
- Courses: Enrollment approved/rejected, session reminder
- Requests: Status changes

---

**Next Steps**: Start with in-app only, add email/SMS later based on user feedback.
