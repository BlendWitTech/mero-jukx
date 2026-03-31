# Manual Testing Checklist
> These tests CANNOT be automated — they require real payment sandbox accounts, real emails, real browser interactions, or physical device testing.
> Work through this list before launch. Check each box as you verify it.

---

## Section 1 — Multi-Tenant Data Isolation
> **Why manual:** Requires two separate browser sessions / incognito windows simultaneously.

### Setup (do this first)
- [ ] Open two browser windows — normal + incognito
- [ ] Register **Organization A** (e.g. "Blendwit Test A") with owner `orgA@test.com`
- [ ] Register **Organization B** (e.g. "Blendwit Test B") with owner `orgB@test.com`
- [ ] In Org A: create sample data in every subscribed app (a client in CRM, a product in Inventory, an employee in HR, a task in Board, an invoice in Accounting)

### Cross-Org Isolation Checks
- [ ] Login as Org B → go to CRM → confirm zero clients, leads, deals visible
- [ ] Login as Org B → go to Inventory → confirm zero products, stock, warehouses
- [ ] Login as Org B → go to Accounting → confirm zero invoices, accounts, journal entries
- [ ] Login as Org B → go to HR → confirm zero employees, payroll records
- [ ] Login as Org B → go to Board → confirm zero workspaces, tasks
- [ ] Login as Org B → go to Khata → confirm zero customers, invoices
- [ ] Login as Org B → go to Chat → confirm cannot see Org A's messages

### Attack Attempts (try to manually access Org A data as Org B)
- [ ] Copy an Org A client ID from the URL → paste into Org B session URL → should get 404
- [ ] Copy an Org A employee ID → try to open it as Org B → should get 404
- [ ] Copy an Org A invoice ID → try to open it as Org B → should get 404
- [ ] Try passing Org A's `organization_id` header manually in Postman with Org B's token → should be blocked

### Branch Isolation (if branches are set up)
- [ ] Create Branch 1 and Branch 2 in Org A
- [ ] Confirm Branch 1 user cannot see Branch 2 data (if branches are scoped)

---

## Section 2 — Payment Gateways
> **Why manual:** Requires real sandbox accounts, payment forms, and redirect flows. Cannot be fully mocked.

### eSewa (Nepal) — Sandbox
- [ ] Go to Billing → select a paid plan → choose eSewa
- [ ] Complete payment using eSewa test credentials:
  - eSewa ID: `9806800001` (or `9806800002`, `9806800003`, `9806800004`, `9806800005`)
  - Password: `Nepal@123`
  - Token: `123456`
- [ ] After redirect back → verify subscription status updated in Billing page
- [ ] Verify payment record created in DB (check admin or billing history)
- [ ] Test payment failure: use wrong credentials → verify friendly error shown, subscription NOT changed
- [ ] Test cancelling mid-flow (close browser tab) → verify no partial subscription

### Khalti (Nepal) — Sandbox
- [ ] Go to Billing → choose Khalti
- [ ] Complete payment using Khalti test credentials
- [ ] Verify redirect back to success page
- [ ] Verify subscription status updated

### Stripe — Test Mode
- [ ] Go to Billing → choose Stripe/Card
- [ ] Use test card: `4242 4242 4242 4242` | Expiry: any future date | CVV: `123`
- [ ] Verify payment success, subscription upgraded
- [ ] Use declined card: `4000 0000 0000 0002` → verify error shown clearly
- [ ] Use 3D Secure card: `4000 0027 6000 3184` → verify 3DS challenge appears and completes

### Subscription Flow
- [ ] Subscribe to an app → verify it appears in App Marketplace as Active
- [ ] Cancel subscription → verify app shows as cancelled / expiring
- [ ] Verify auto-renewal toggle works (enable, disable, re-enable)
- [ ] Try to subscribe to the same app twice → verify only one subscription created

### Invoice Generation
- [ ] After successful payment → go to Billing → download invoice PDF
- [ ] Verify invoice PDF contains correct amount, org name, date

---

## Section 3 — Email Flows
> **Why manual:** Requires a real mailbox to verify emails are received, formatted correctly, and links work.

### Setup
- [ ] Use a real email address (not a test alias) for these checks
- [ ] Check spam folder if emails don't arrive within 2 minutes

### Registration & Verification
- [ ] Register a new org → verify welcome/verification email received within 2 min
- [ ] Verify email subject line is correct (not generic "undefined" or "test")
- [ ] Click verification link → verify redirects to correct page and marks email as verified
- [ ] Click verification link again (second time) → verify "already verified" or graceful error
- [ ] Request resend verification → verify new email arrives, old link still works or is invalidated

### Password Reset
- [ ] Click "Forgot Password" → enter real email → verify reset email received
- [ ] Click reset link → verify lands on reset password page
- [ ] Reset password → verify can login with new password
- [ ] Try reset link again (after use) → verify "link expired or already used" error
- [ ] Request reset for non-existent email → verify no error leaked ("if account exists, email sent")

### Invitation Emails
- [ ] Invite a team member via email → verify invitation email received
- [ ] Verify invitation email has correct org name and sender name
- [ ] Click invitation link → verify lands on accept page with org name shown
- [ ] Accept invitation → verify account created and logged in
- [ ] Try to use same invitation link after accepting → verify "already used" error

### Subscription Emails
- [ ] Subscribe to a plan → verify subscription confirmation email received
- [ ] Cancel subscription → verify cancellation confirmation email received

---

## Section 4 — MFA / 2FA
> **Why manual:** Requires a real authenticator app (Google Authenticator or Authy) on a phone.

- [ ] Go to Profile → Security → Enable 2FA
- [ ] Scan QR code with Google Authenticator or Authy on your phone
- [ ] Enter the 6-digit TOTP code → verify 2FA enabled successfully
- [ ] Logout → login again → verify 2FA code is requested at login
- [ ] Enter correct TOTP code → verify login succeeds
- [ ] Enter wrong TOTP code → verify login blocked with clear error
- [ ] Enter expired TOTP code (wait 31+ seconds) → verify rejected
- [ ] Use one of the backup codes → verify login succeeds
- [ ] Try to use same backup code again → verify rejected ("already used")
- [ ] Disable 2FA → logout → login → verify 2FA no longer required
- [ ] Re-enable 2FA → scan new QR → verify old QR code no longer works

---

## Section 5 — Real-Time Chat & WebRTC Calls
> **Why manual:** Requires two live browser sessions; WebSockets and WebRTC cannot be properly tested with HTTP tests.

### Chat
- [ ] Open two browser tabs with two different users in the same org
- [ ] Send a message from User A → verify it appears in real-time for User B (no page refresh)
- [ ] Send a message from User B → verify User A sees it in real-time
- [ ] Upload a file in chat → verify file appears and is downloadable
- [ ] Add a reaction (emoji) to a message → verify both users see the reaction
- [ ] Delete a message → verify it disappears for both users
- [ ] Archive a chat → verify it moves to archived section
- [ ] Create a group chat with 3 users → verify all 3 receive messages in real-time

### WebRTC Voice/Video Call
- [ ] Start a call from User A to User B
- [ ] Accept the call on User B's browser
- [ ] Verify audio is working both ways (or video if enabled)
- [ ] End the call → verify both UIs return to normal state
- [ ] Start a call → decline it → verify declined state shown to caller
- [ ] Start a call → let it ring without answering → verify timeout/missed call

### Admin Chat (Support)
- [ ] As a regular user: open admin chat → send a message
- [ ] As system admin: verify message appears in admin chat dashboard
- [ ] Reply as admin → verify user receives the reply in real-time

---

## Section 6 — File Uploads
> **Why manual:** Requires actual file upload interactions and download verification.

- [ ] Upload a profile photo → verify it appears on profile page
- [ ] Upload an organization logo → verify it appears in org branding
- [ ] Upload a file in chat → verify it is downloadable after upload
- [ ] Attach a file to a ticket → verify attachment is downloadable
- [ ] Upload a file over the 5MB limit → verify clear error message shown
- [ ] Upload an unsupported file type (if restricted) → verify rejection
- [ ] In Mero CMS: upload media files (images, PDF) → verify they appear in Media Library
- [ ] In Mero Accounting: import a bank statement CSV → verify rows are parsed correctly

---

## Section 7 — Nepal Localization
> **Why manual:** Requires visual verification of dates, numbers, currency formatting in the UI.

### Nepali Calendar (Bikram Sambat)
- [ ] Open any date picker in Mero Accounting → switch to BS calendar
- [ ] Verify BS dates display correctly (e.g., 2082 Chaitra)
- [ ] Select a BS date → verify it converts to correct AD date in the backend
- [ ] In Mero HR: set employee joining date using BS calendar → verify stored correctly
- [ ] Verify Nepal fiscal year (Shrawan–Ashadh) shown correctly in Accounting year-end

### Currency & Tax
- [ ] Create an invoice for NPR 10,000 + 13% VAT → verify NPR 1,300 VAT shown
- [ ] Verify NPR symbol (रू or NPR) displayed correctly throughout the app
- [ ] Create a purchase invoice with TDS → verify TDS amount deducted

### PAN / VAT Validation
- [ ] Enter an invalid PAN number (less than 9 digits) → verify error shown
- [ ] Enter a valid 9-digit PAN → verify accepted
- [ ] Enter invalid VAT number → verify rejected

---

## Section 8 — PDF Generation
> **Why manual:** PDFs must be visually inspected for layout, fonts, and data accuracy.

- [ ] Generate a payslip PDF from HR Payroll → open it, verify all fields present (name, salary, deductions, net)
- [ ] Generate an invoice PDF from Mero Accounting → verify customer name, items, totals, VAT are correct
- [ ] Generate an invoice PDF from Mero CRM → verify correct layout
- [ ] Generate a billing invoice PDF from Billing page → verify it opens and contains correct data
- [ ] Print a cheque from Mero Accounting Cheques → verify cheque layout is correct for standard cheque paper
- [ ] Generate TDS certificate (Annex) from Accounting → verify values match posted transactions

---

## Section 9 — Browser & Device Compatibility
> **Why manual:** Automated tests run in one browser; real users use many.

### Desktop Browsers
- [ ] Chrome (latest) — run through core user journey (login → dashboard → open an app → create a record)
- [ ] Firefox (latest) — same core journey
- [ ] Edge (latest) — same core journey
- [ ] Safari (if available on Mac) — same core journey

### Mobile / Responsive
- [ ] Open Chrome on Android phone → login → verify dashboard is usable
- [ ] Open Safari on iPhone → login → verify dashboard is usable
- [ ] Verify sidebar collapses correctly on mobile viewport
- [ ] Verify modals/dialogs don't overflow on small screens
- [ ] Verify tables scroll horizontally on mobile (not clipped)

---

## Section 10 — Admin Controls
> **Why manual:** Admin impersonation and system-wide operations need visual confirmation.

- [ ] Login as system admin → verify platform-wide dashboard loads (total orgs, users, MRR)
- [ ] Impersonate an org user → verify you see their dashboard as them
- [ ] Exit impersonation → verify you return to admin account
- [ ] Send a broadcast message to all orgs → verify it appears as announcement
- [ ] Toggle maintenance mode ON → verify regular users see maintenance page
- [ ] Toggle maintenance mode OFF → verify regular access restored
- [ ] View audit logs for all orgs (platform-level) → verify entries show correctly

---

## Sign-Off Tracker

| Section | Tester | Date | Pass/Fail | Notes |
|---------|--------|------|-----------|-------|
| 1. Multi-Tenant Isolation | | | | |
| 2. Payment Gateways | | | | |
| 3. Email Flows | | | | |
| 4. MFA / 2FA | | | | |
| 5. Real-Time Chat & Calls | | | | |
| 6. File Uploads | | | | |
| 7. Nepal Localization | | | | |
| 8. PDF Generation | | | | |
| 9. Browser Compatibility | | | | |
| 10. Admin Controls | | | | |

---

*All 10 sections must have Pass status before production launch.*
