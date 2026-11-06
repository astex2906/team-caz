CarePath – Patient Journey Navigator

Healthcare made easier, one step at a time.

CarePath is a front-end prototype for PS3, “The Missing Link: Patient Journey & Healthcare Access Navigator”, built for Hack the Constraint (CodeNex Club, SRMIST, 5–6 November 2026).

It helps patients find suitable healthcare services, book appointments, and prepare the documents needed to confirm them. It is an administrative navigation tool only. It does not diagnose, recommend treatment, or make clinical decisions.

Live demo: https://astex2906.github.io/carepath/

Features
Explainable facility ranking by service, language, wheelchair access, slot availability, and distance. Each result lists its reasons and warnings.
Slot booking with a re-check at the moment of booking, so a slot taken by someone else is never double-booked.
Duplicate-request protection using request IDs, so a retry returns the original booking.
Document checklists. A booking stays Pending until every required document is uploaded, then becomes Confirmed automatically.
Journey tracker that shows the next action.
Help desk escalation for conflicting or missing information, so a human agent resolves it rather than the system guessing.
Accessibility and language: English and Tamil interface, adjustable text size, labelled controls, keyboard support, and visible focus outlines.
How it works
Patient flow
Sign up with name, age, mobile number, email, and preferred language.
Find Care: choose a service, language, time window, and whether wheelchair access is needed. Facilities are ranked with reasons.
Book a slot: open View and book slots, pick a time, and confirm.
Upload documents in the Documents tab. The booking is Pending until they are all present.
Track progress in the Journey tab, and use the Help Desk tab for anything unclear.
Booking logic

Each booking request goes through a single queue, so requests are processed one at a time:

A request arrives with a unique requestId.
If a booking with that ID already exists, it is returned (duplicate protection).
The slot is checked again. If it is taken, the request fails with SLOT_TAKEN.
The booking is saved. Its status is Confirmed only if no issues remain, otherwise Pending.
Confirmation rules

A booking is confirmed only when:

every required document for the service is uploaded, and
any accessibility requirement is confirmed by the facility.

Unknown accessibility is treated as a gap, not as yes or no.

Reference data

Facilities, services, slots, and required documents are synthetic and defined in script.js:

4 facilities across different zones, with different languages, accessibility status, and opening hours.
5 services: Cardiology, Orthopaedics, General Medicine, Paediatrics, and Dermatology.
Slots: four times a day (09:00, 10:30, 14:00, 15:30) for seven days, Sundays closed.

Riverside Heart Institute has two conflicting opening-hours records, which is intentional for demonstrating C02.

Project structure
carepath/
├── index.html   # Page structure: landing page, sign-up, app tabs
├── style.css    # Styling, colours, responsive layout
├── script.js    # Logic: validation, ranking, booking queue, documents, journey
└── README.md
Running locally

No installation is needed.

Clone or download the repository.
Open the folder in VS Code.
Right-click index.html and choose Open with Live Server (or open the file directly in a browser).
Demo walkthrough
Sign up with any test details. Use fictional data only.
In Find Care, search for Cardiology with wheelchair access checked. Riverside shows warnings for accessibility and conflicting hours.
Open a facility, pick a slot, and book it. It shows as Pending.
In Documents, upload a Government ID and a GP referral letter. The booking becomes Confirmed.
In Appointments, run Two patients, same slot to show the concurrency control, then Duplicate submission to show duplicate protection.
Limitations

This is a prototype, and it has deliberate limits:

Data is stored per browser. Bookings and documents do not sync across devices or users.
Concurrency is simulated inside one browser tab. It does not protect against real simultaneous users.
No real authentication. Local data can be edited through browser developer tools.
Reference data is fixed and synthetic. There is no admin interface.
Uploaded files are not stored. Only file names are kept.
Tamil text and landing-page copy have not been reviewed by a native speaker or an accessibility specialist.
