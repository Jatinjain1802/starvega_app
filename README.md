# Starvega PG Management

Single role-based mobile app for owners, managers and residents.

## Stack
React Native CLI (JavaScript/JSX), Node.js, Express, PostgreSQL, Prisma, Redux Toolkit, Axios, React Navigation, JWT with refresh tokens, Firebase Cloud Messaging, Razorpay and Docker. No TypeScript or Expo.

## Development phases
1. Project foundation
2. Authentication and tenant authorization
3. PGs, rooms, beds, residents and managers
4. Role dashboards
5. Rent, payments and receipts
6. Complaints and safety escalation
7. Announcements and notifications
8. Expenses and maintenance
9. Advanced operations and reporting
10. Production readiness

Never commit secrets or resident data. All server endpoints must enforce role and PG access independently of the mobile UI.

Status: initial foundation; application modules are not yet implemented.
