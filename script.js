'use strict';

/* =========================================================
   CarePath – Patient Journey Navigator (demo)
   Synthetic data only. Administrative navigation, not medical advice.
   ========================================================= */

/* ---------- Storage keys ---------- */
const KEYS = {
    user: 'carepath.user',
    bookings: 'carepath.bookings',
    docs: 'carepath.docs',
    tickets: 'carepath.tickets',
    font: 'carepath.fontSize',
    lang: 'carepath.uiLang'
};

/* ---------- Synthetic reference data (stands in for organiser-supplied data) ---------- */
const LANG_NAMES = { en: 'English', ta: 'Tamil', hi: 'Hindi' };

const DEPARTMENTS = {
    cardiology: { en: 'Cardiology', ta: 'இதயவியல்', docs: ['Government ID', 'GP referral letter'] },
    orthopaedics: { en: 'Orthopaedics', ta: 'எலும்பியல்', docs: ['Government ID', 'GP referral letter', 'Previous X-ray reports'] },
    general: { en: 'General Medicine', ta: 'பொது மருத்துவம்', docs: ['Government ID'] },
    paediatrics: { en: 'Paediatrics', ta: 'குழந்தை நலம்', docs: ['Government ID', 'Guardian ID'] },
    dermatology: { en: 'Dermatology', ta: 'தோல் மருத்துவம்', docs: ['Government ID'] }
};

const ALL_DOCS = [...new Set(Object.values(DEPARTMENTS).flatMap(d => d.docs))];

const FACILITIES = [
    {
        id: 'f1', name: 'Sunrise Medical Centre', zone: 'North Zone', distanceKm: 3.2,
        departments: ['cardiology', 'general', 'dermatology'], languages: ['en', 'ta', 'hi'],
        wheelchair: true, hours: ['Mon–Sat 09:00–17:00']
    },
    {
        id: 'f2', name: 'Green Valley Hospital', zone: 'South Zone', distanceKm: 1.8,
        departments: ['cardiology', 'orthopaedics', 'paediatrics'], languages: ['en', 'ta'],
        wheelchair: true, hours: ['Mon–Sat 08:30–18:00']
    },
    {
        id: 'f3', name: 'CityCare Clinic', zone: 'Central Zone', distanceKm: 7.5,
        departments: ['general', 'paediatrics', 'dermatology'], languages: ['en', 'hi'],
        wheelchair: false, hours: ['Mon–Sat 10:00–20:00']
    },
    {
        id: 'f4', name: 'Riverside Heart Institute', zone: 'West Zone', distanceKm: 4.6,
        departments: ['cardiology', 'orthopaedics'], languages: ['en', 'ta'],
        wheelchair: null,  // C12: accessibility not confirmed in organiser data
        hours: ['Mon–Fri 09:00–13:00', 'Mon–Sat 09:00–17:00']
    }  // C02: conflicting records
];

const SLOT_TIMES = ['09:00', '10:30', '14:00', '15:30'];
const SLOT_DAYS = 7;
const MAX_SCORE = 80;
const FONT_STEPS = [14, 15, 16, 17, 18, 20];

/* ---------- Translations (UI labels; dynamic text is English) ---------- */
const I18N = {
    en: {
        tagline: 'Healthcare made easier, one step at a time.',
        logout: 'Log out',
        loginTitle: 'Create your CarePath profile',
        loginSub: 'Used only to match services and confirm bookings. Stored on this device.',
        name: 'Full name', age: 'Age', mobile: 'Mobile number', email: 'Email ID',
        prefLang: 'Preferred language', continue: 'Continue',
        tabFind: 'Find Care', tabAppts: 'Appointments', tabDocs: 'Documents',
        tabJourney: 'Journey', tabHelp: 'Help Desk',
        service: 'Service', language: 'Language', withinDays: 'Within',
        wheelchair: 'Needs wheelchair access', search: 'Search',
        helpTitle: 'Get human help', topic: 'Topic', message: 'Message',
        submitTicket: 'Send request'
    },
    ta: {
        tagline: 'ஒவ்வொரு அடியிலும் மருத்துவம் எளிதாக.',
        logout: 'வெளியேறு',
        loginTitle: 'உங்கள் CarePath சுயவிவரத்தை உருவாக்குங்கள்',
        loginSub: 'சேவைகளைப் பொருத்தவும் சந்திப்புகளை உறுதிசெய்யவும் மட்டுமே பயன்படும். இந்த சாதனத்தில் சேமிக்கப்படும்.',
        name: 'முழு பெயர்', age: 'வயது', mobile: 'கைபேசி எண்', email: 'மின்னஞ்சல் முகவரி',
        prefLang: 'விருப்ப மொழி', continue: 'தொடரவும்',
        tabFind: 'மருத்துவமனை தேடு', tabAppts: 'சந்திப்புகள்', tabDocs: 'ஆவணங்கள்',
        tabJourney: 'பயணம்', tabHelp: 'உதவி மையம்',
        service: 'சேவை', language: 'மொழி', withinDays: 'எத்தனை நாட்களுக்குள்',
        wheelchair: 'சக்கர நாற்காலி அணுகல் தேவை', search: 'தேடு',
        helpTitle: 'மனித உதவி பெறுங்கள்', topic: 'தலைப்பு', message: 'விவரம்',
        submitTicket: 'கோரிக்கையை அனுப்பு'
    }
};

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const store = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch {
            return fallback;
        }
    },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const uid = prefix => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatDate = dk => new Date(dk + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const maskMobile = m => (m ? '•••••• ' + m.slice(-4) : '');
const facilityById = id => FACILITIES.find(f => f.id === id);
const t = key => (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
const deptName = key => DEPARTMENTS[key][state.lang] || DEPARTMENTS[key].en;
const isProfileComplete = u => !!(u && u.name && u.age && u.mobile && u.email);
const sortBookings = (a, b) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time);

/* ---------- State ---------- */
const state = { user: null, lang: 'en' };
let lastSearch = { dept: 'cardiology', language: 'en', needWheelchair: false, withinDays: 3 };
let pickerSlots = {};

/* ---------- Simulated server queue (C09) ----------
   Requests are processed one at a time. In production this is a PostgreSQL transaction
   with a unique constraint on active slot_id, so two requests cannot both win a slot. */
let serverChain = Promise.resolve();
function enqueue(task) {
    const run = serverChain.then(() => new Promise(resolve => setTimeout(() => resolve(task()), 250)));
    serverChain = run.catch(() => { });
    return run;
}

/* ---------- Validation (C04) ---------- */
function validateProfile(f) {
    const errors = {};
    if (!/^[\p{L}][\p{L} .'-]{1,59}$/u.test(f.name)) errors.name = 'Enter your full name (letters only, 2–60 characters).';
    const age = Number(f.age);
    if (f.age === '' || !Number.isInteger(age) || age < 1 || age > 120) errors.age = 'Enter a valid age (1–120).';
    if (!/^[6-9]\d{9}$/.test(f.mobile)) errors.mobile = 'Enter a valid 10-digit mobile number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.email = 'Enter a valid email address.';
    return errors;
}

/* ---------- Slots & bookings ---------- */
function allSlots(facility, dept) {
    const out = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < SLOT_DAYS; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (d.getDay() === 0) continue; // closed Sundays
        const dk = dateKey(d);
        SLOT_TIMES.forEach(time => out.push({
            id: `${facility.id}|${dept}|${dk}|${time}`,
            facilityId: facility.id, dept, dateKey: dk, dayOffset: i, time
        }));
    }
    return out;
}

const activeBookings = () => store.get(KEYS.bookings, []).filter(b => b.status !== 'cancelled');
const bookingForSlot = slotId => activeBookings().find(b => b.slotId === slotId);
const getDocs = () => store.get(KEYS.docs, {});

function docsMissingFor(dept) {
    const docs = getDocs();
    return DEPARTMENTS[dept].docs.filter(name => docs[name]?.status !== 'uploaded');
}

// C12: a booking is only confirmed when every decision-critical item is present
function bookingIssues(dept, facility, needWheelchair) {
    const issues = docsMissingFor(dept).map(d => `Upload ${d} to confirm this booking`);
    if (needWheelchair && facility.wheelchair === null) issues.push('Wheelchair access is not confirmed by the facility');
    if (needWheelchair && facility.wheelchair === false) issues.push('Facility is not wheelchair accessible');
    return issues;
}

// Server-side booking logic (runs inside the queue)
function serverBookSlot({ requestId, slot, needWheelchair }) {
    const bookings = store.get(KEYS.bookings, []);

    // C09 idempotency: a retry with the same request ID returns the original result
    const duplicate = bookings.find(b => b.requestId === requestId);
    if (duplicate) return { ok: true, booking: duplicate, duplicate: true };

    if (!isProfileComplete(state.user)) return { ok: false, code: 'PROFILE_INCOMPLETE' };

    // C09: the slot is checked again at the moment of booking
    if (bookings.some(b => b.slotId === slot.id && b.status !== 'cancelled')) {
        return { ok: false, code: 'SLOT_TAKEN' };
    }

    const facility = facilityById(slot.facilityId);
    const issues = bookingIssues(slot.dept, facility, needWheelchair);
    const booking = {
        id: uid('bk'), requestId,
        slotId: slot.id, facilityId: slot.facilityId, dept: slot.dept,
        dateKey: slot.dateKey, time: slot.time,
        needWheelchair: !!needWheelchair,
        status: issues.length ? 'pending' : 'confirmed',
        issues, patientId: state.user.id, createdAt: new Date().toISOString()
    };
    bookings.push(booking);
    store.set(KEYS.bookings, bookings);
    return { ok: true, booking };
}

function refreshBookingStatuses() {
    const bookings = store.get(KEYS.bookings, []);
    let changed = false;
    bookings.forEach(b => {
        if (b.status === 'cancelled') return;
        const issues = bookingIssues(b.dept, facilityById(b.facilityId), b.needWheelchair);
        const status = issues.length ? 'pending' : 'confirmed';
        if (b.status !== status || JSON.stringify(b.issues) !== JSON.stringify(issues)) {
            b.status = status;
            b.issues = issues;
            changed = true;
        }
    });
    if (changed) store.set(KEYS.bookings, bookings);
}

/* ---------- Recommendation engine (rule-based, explainable) ---------- */
function rankFacilities({ dept, language, needWheelchair, withinDays }) {
    return FACILITIES
        .filter(f => f.departments.includes(dept))
        .map(f => {
            const reasons = [];
            const warnings = [];
            let score = 0;

            // Language match (+20)
            if (f.languages.includes(language)) {
                score += 20;
                reasons.push(`${LANG_NAMES[language]} support listed`);
            } else {
                warnings.push(`${LANG_NAMES[language]} support not listed. Confirm when you call.`);
            }

            // Accessibility (+20, penalty if not accessible)
            if (needWheelchair) {
                if (f.wheelchair === true) {
                    score += 20;
                    reasons.push('Wheelchair accessible');
                } else if (f.wheelchair === null) {
                    warnings.push('Wheelchair access not confirmed by the facility');
                } else {
                    score -= 20;
                    warnings.push('Not wheelchair accessible');
                }
            }

            // Timing (+25)
            const free = allSlots(f, dept).filter(s => !bookingForSlot(s.id) && s.dayOffset <= withinDays - 1);
            if (free.length) {
                score += 25;
                reasons.push(`Slot free ${formatDate(free[0].dateKey)} at ${free[0].time}`);
            } else {
                warnings.push(`No free slot within ${withinDays} day${withinDays > 1 ? 's' : ''}`);
            }

            // Distance (up to +15)
            score += Math.max(0, 15 - f.distanceKm * 1.5);
            reasons.push(`${f.distanceKm} km away (${f.zone})`);

            // C02: conflicting records lower confidence
            if (f.hours.length > 1) {
                score -= 5;
                warnings.push('Conflicting opening hours in records. Verify with the help desk.');
            }

            const match = Math.max(0, Math.min(100, Math.round((score / MAX_SCORE) * 100)));
            return { facility: f, free, match, reasons, warnings };
        })
        .sort((a, b) => b.match - a.match);
}

/* ---------- Journey logic ---------- */
function journeyState() {
    const active = activeBookings().sort(sortBookings);
    const next = active[0];
    const steps = [
        { label: 'Profile created', done: isProfileComplete(state.user), hint: 'Complete your profile to book.' },
        { label: 'Service and facility chosen', done: !!next, hint: 'Use Find Care to pick a service and slot.' },
        {
            label: 'Required documents uploaded',
            done: !!next && docsMissingFor(next.dept).length === 0,
            hint: next ? `Upload: ${docsMissingFor(next.dept).join(', ')}` : 'Choose a booking first.'
        },
        {
            label: 'Appointment confirmed',
            done: !!next && next.status === 'confirmed',
            hint: 'Resolve the items listed under Appointments.'
        },
        { label: 'Attend and follow up', done: false, hint: 'Check follow-up reminders after your visit.' }
    ];
    const current = steps.find(s => !s.done);
    return { steps, current, next };
}

/* ---------- Rendering ---------- */
function renderAll() {
    if (!state.user) return;
    renderHeader();
    renderFindResults();
    renderBookings();
    renderDocs();
    renderJourney();
    renderTickets();
}

function renderHeader() {
    const u = state.user;
    $('#greeting').textContent = `Hello, ${u.name.split(' ')[0]}`;
    $('#profileSummary').textContent = `Age ${u.age} · Mobile ${maskMobile(u.mobile)} · ${u.email}`;
    const { current } = journeyState();
    $('#nextStepText').textContent = current ? `Next step: ${current.hint}` : 'All journey steps complete.';
}

function renderFindResults() {
    const results = rankFacilities(lastSearch);
    $('#findHint').textContent =
        `${results.length} facilities offer ${deptName(lastSearch.dept)}. Ranked by match. Each card lists its reasons.`;

    $('#findResults').innerHTML = results.length ? results.map(({ facility: f, free, match, reasons, warnings }) => {
        const next = free[0];
        return `
      <article class="card facility">
        <div class="card-head">
          <div>
            <h3>${esc(f.name)}</h3>
            <p class="muted small">${esc(f.zone)} · ${f.distanceKm} km · Languages: ${f.languages.map(l => LANG_NAMES[l]).join(', ')}</p>
            <p class="muted small">Hours: ${esc(f.hours.join(' | '))}</p>
          </div>
          <div class="match"><span>${match}%</span><small>match</small></div>
        </div>
        <div class="meter" aria-hidden="true"><span style="width:${match}%"></span></div>
        <ul class="reasons">${reasons.map(r => `<li class="ok">✓ ${esc(r)}</li>`).join('')}</ul>
        ${warnings.length ? `<ul class="reasons">${warnings.map(w => `<li class="warn">⚠ ${esc(w)}</li>`).join('')}</ul>` : ''}
        <div class="card-foot">
          <span class="muted small">${next ? `Next free slot: ${formatDate(next.dateKey)} ${next.time}` : 'No free slot in this window'}</span>
          <button class="btn primary small" type="button" data-action="view-slots"
            data-facility="${f.id}" data-dept="${lastSearch.dept}">View slots</button>
        </div>
      </article>`;
    }).join('') : `<div class="empty">No facility offers this service.</div>`;
}

function renderBookings() {
    const list = activeBookings().sort(sortBookings);
    $('#bookingsList').innerHTML = list.length ? list.map(b => {
        const f = facilityById(b.facilityId);
        const pending = b.status === 'pending';
        return `
      <article class="card booking ${pending ? 'is-pending' : 'is-confirmed'}">
        <div class="card-head">
          <div>
            <h3>${esc(deptName(b.dept))} · ${esc(f.name)}</h3>
            <p class="muted small">${formatDate(b.dateKey)} at ${b.time}</p>
          </div>
          <span class="pill ${pending ? 'pill-warn' : 'pill-ok'}">${pending ? 'Pending' : 'Confirmed'}</span>
        </div>
        ${pending ? `
          <div class="notice warn small">
            <strong>Not yet confirmed:</strong>
            <ul>${b.issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
          </div>` : ''}
        <div class="actions">
          ${pending ? `<button class="btn ghost small" type="button" data-action="escalate" data-id="${b.id}">Ask help desk</button>` : ''}
          <button class="btn ghost small" type="button" data-action="cancel" data-id="${b.id}">Cancel</button>
        </div>
      </article>`;
    }).join('') : `<div class="empty" style="grid-column:1/-1">No appointments yet. Use Find Care to book a slot.</div>`;
}

function renderDocs() {
    const docs = getDocs();
    $('#docsList').innerHTML = ALL_DOCS.map(name => {
        const uploaded = docs[name]?.status === 'uploaded';
        const depts = Object.keys(DEPARTMENTS).filter(k => DEPARTMENTS[k].docs.includes(name)).map(deptName);
        return `
      <article class="card">
        <div class="card-head">
          <div>
            <h3>${esc(name)}</h3>
            <p class="muted small">Needed for: ${esc(depts.join(', '))}</p>
          </div>
          <span class="pill ${uploaded ? 'pill-ok' : 'pill-warn'}">${uploaded ? 'Uploaded' : 'Missing'}</span>
        </div>
        ${uploaded ? `<p class="muted small">File: ${esc(docs[name].fileName)}</p>` : ''}
        <div class="actions">
          <label class="btn primary small">
            ${uploaded ? 'Replace' : 'Upload'}
            <input type="file" hidden data-doc="${esc(name)}" accept=".pdf,.jpg,.jpeg,.png">
          </label>
          ${uploaded ? `<button class="btn ghost small" type="button" data-action="remove-doc" data-doc="${esc(name)}">Remove</button>` : ''}
        </div>
      </article>`;
    }).join('');
}

function renderJourney() {
    const { steps, current, next } = journeyState();
    $('#journeySteps').innerHTML = steps.map((s, i) => {
        const cls = s.done ? 'done' : (s === current ? 'current' : '');
        return `
      <li class="step ${cls}">
        <span class="dot">${s.done ? '✓' : i + 1}</span>
        <div>
          <strong>${esc(s.label)}</strong>
          <p class="muted small">${esc(s.done ? 'Completed' : s.hint)}</p>
        </div>
      </li>`;
    }).join('');

    $('#nextBooking').innerHTML = next
        ? `<p><strong>${esc(deptName(next.dept))}</strong> at ${esc(facilityById(next.facilityId).name)}</p>
       <p class="muted">${formatDate(next.dateKey)} at ${next.time}</p>
       <span class="pill ${next.status === 'confirmed' ? 'pill-ok' : 'pill-warn'}">${next.status === 'confirmed' ? 'Confirmed' : 'Pending'}</span>`
        : `<p class="muted">No appointment scheduled yet.</p>`;
}

function renderTickets() {
    const tickets = store.get(KEYS.tickets, []);
    $('#ticketsList').innerHTML = tickets.length
        ? tickets.map(tk => `
        <li class="ticket">
          <div>
            <strong>${esc(tk.topic)}</strong>
            <p class="muted small">${esc(tk.message)}</p>
          </div>
          <span class="pill pill-info">${esc(tk.status)}</span>
        </li>`).join('')
        : `<li class="empty">No requests yet.</li>`;
}

/* ---------- Slot picker & booking ---------- */
function openSlotPicker(facilityId, dept) {
    const f = facilityById(facilityId);
    const slots = allSlots(f, dept);
    pickerSlots = {};
    slots.forEach(s => { pickerSlots[s.id] = s; });

    $('#modalTitle').textContent = `${f.name} · ${deptName(dept)}`;
    $('#modalSub').innerHTML = `Select a time. Booking is confirmed only when required details are complete.` +
        (f.hours.length > 1 ? ` <span class="warn-text">Opening hours conflict in records. Verify with the help desk.</span>` : '');

    const groups = {};
    slots.forEach(s => { (groups[s.dateKey] ||= []).push(s); });

    $('#slotList').innerHTML = Object.entries(groups).map(([dk, list]) => `
    <div class="slot-day">
      <h4>${formatDate(dk)}</h4>
      <div class="slot-row">
        ${list.map(s => {
        const taken = !!bookingForSlot(s.id);
        return `<button class="slot" type="button" data-slot="${s.id}" ${taken ? 'disabled' : ''}>
                    ${s.time}${taken ? ' · Booked' : ''}
                  </button>`;
    }).join('')}
      </div>
    </div>`).join('');

    $('#modal').hidden = false;
    $('#modalClose').focus();
}

function closeModal() {
    $('#modal').hidden = true;
    $('#slotList').innerHTML = '';
}

async function bookFromPicker(slot, btn) {
    if (!slot) return;
    btn.disabled = true;
    btn.classList.add('busy');

    const outcome = await enqueue(() => serverBookSlot({
        requestId: uid('req'), slot, needWheelchair: lastSearch.needWheelchair
    }));

    if (outcome.ok) {
        closeModal();
        const b = outcome.booking;
        if (b.status === 'pending') toast(`Booked as pending. ${b.issues[0]}.`, 'warn');
        else toast('Appointment confirmed.', 'success');
        switchTab('appointments');
        renderAll();
    } else if (outcome.code === 'SLOT_TAKEN') {
        toast('This slot was just booked by someone else. Please choose another.', 'error');
        openSlotPicker(slot.facilityId, slot.dept);
        renderFindResults();
    } else if (outcome.code === 'PROFILE_INCOMPLETE') {
        closeModal();
        toast('Complete your profile before booking.', 'error');
        showAuth();
    }
}

function cancelBooking(id) {
    if (!confirm('Cancel this appointment? The slot will be released.')) return;
    const bookings = store.get(KEYS.bookings, []);
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    b.status = 'cancelled';
    store.set(KEYS.bookings, bookings);
    toast('Appointment cancelled. The slot has been released.', 'info');
    renderAll();
}

/* ---------- Concurrency demos (C09) ---------- */
function firstFreeSlot() {
    for (const f of FACILITIES) {
        for (const dept of f.departments) {
            const slot = allSlots(f, dept).find(s => !bookingForSlot(s.id));
            if (slot) return slot;
        }
    }
    return null;
}

async function simulateRace() {
    const slot = firstFreeSlot();
    if (!slot) return toast('No free slot available for the test.', 'error');
    const [a, b] = await Promise.all([
        enqueue(() => serverBookSlot({ requestId: uid('req'), slot, needWheelchair: false })),
        enqueue(() => serverBookSlot({ requestId: uid('req'), slot, needWheelchair: false }))
    ]);
    renderAll();
    toast(`Request A: ${a.ok ? 'booked' : a.code}. Request B: ${b.ok ? 'booked' : b.code}. Only one request can hold a slot.`, 'info');
}

async function simulateDuplicate() {
    const slot = firstFreeSlot();
    if (!slot) return toast('No free slot available for the test.', 'error');
    const requestId = uid('req');
    await enqueue(() => serverBookSlot({ requestId, slot, needWheelchair: false }));
    const retry = await enqueue(() => serverBookSlot({ requestId, slot, needWheelchair: false }));
    renderAll();
    toast(`Retry with the same request ID returned the original booking (duplicate: ${!!retry.duplicate}).`, 'info');
}

/* ---------- Documents (C12) ---------- */
function handleUpload(input) {
    const file = input.files[0];
    const name = input.dataset.doc;
    if (!file) return;
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
        toast('Please upload a PDF, JPG or PNG file.', 'error');
        input.value = '';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        toast('File must be under 5 MB.', 'error');
        input.value = '';
        return;
    }
    const docs = getDocs();
    docs[name] = { status: 'uploaded', fileName: file.name, updated: new Date().toISOString() };
    store.set(KEYS.docs, docs);
    refreshBookingStatuses();
    toast(`${name} saved. Bookings have been re-checked.`, 'success');
    renderAll();
}

function removeDoc(name) {
    const docs = getDocs();
    delete docs[name];
    store.set(KEYS.docs, docs);
    refreshBookingStatuses();
    toast(`${name} removed.`, 'info');
    renderAll();
}

/* ---------- Help desk escalation ---------- */
function createTicket(topic, message, bookingId = null) {
    const tickets = store.get(KEYS.tickets, []);
    tickets.unshift({
        id: uid('tk'), topic, message, bookingId,
        status: 'Queued for a human agent', createdAt: new Date().toISOString()
    });
    store.set(KEYS.tickets, tickets);
}

function escalateBooking(id) {
    const b = activeBookings().find(x => x.id === id);
    if (!b) return;
    createTicket('Missing information', `Pending booking ${b.id}: ${b.issues.join('; ')}`, b.id);
    toast('Sent to a human help-desk agent.', 'success');
    switchTab('help');
    renderAll();
}

function handleTicket(e) {
    e.preventDefault();
    const topic = $('#tTopic').value;
    const message = $('#tMessage').value.trim();
    if (message.length < 10) {
        toast('Please describe your request in at least 10 characters.', 'error');
        return;
    }
    createTicket(topic, message);
    $('#ticketForm').reset();
    renderTickets();
    toast('Request sent to a human help-desk agent.', 'success');
}

/* ---------- Auth ---------- */
function handleLogin(e) {
    e.preventDefault();
    const form = {
        name: $('#fName').value.trim(),
        age: $('#fAge').value.trim(),
        mobile: $('#fMobile').value.trim(),
        email: $('#fEmail').value.trim(),
        lang: $('#fLang').value
    };
    const errors = validateProfile(form);
    ['name', 'age', 'mobile', 'email'].forEach(k => {
        $('#err' + cap(k)).textContent = errors[k] || '';
        $('#f' + cap(k)).setAttribute('aria-invalid', errors[k] ? 'true' : 'false');
    });
    const firstError = Object.keys(errors)[0];
    if (firstError) {
        $('#f' + cap(firstError)).focus();
        return;
    }

    state.user = {
        id: uid('pt'), name: form.name, age: Number(form.age),
        mobile: form.mobile, email: form.email, lang: form.lang,
        createdAt: new Date().toISOString()
    };
    store.set(KEYS.user, state.user);
    lastSearch.language = form.lang;
    if (['en', 'ta'].includes(form.lang)) setUILang(form.lang, false);

    showApp();
    toast(`Welcome, ${state.user.name.split(' ')[0]}.`, 'success');
}

function logout() {
    store.set(KEYS.user, null);
    state.user = null;
    showAuth();
    toast('You have been logged out. Bookings stay on this device.', 'info');
}

function showAuth() {
    $('#authView').hidden = false;
    $('#appView').hidden = true;
    $('#logoutBtn').hidden = true;
}

function showApp() {
    $('#authView').hidden = true;
    $('#appView').hidden = false;
    $('#logoutBtn').hidden = false;
    syncSearchForm();
    renderAll();
}

/* ---------- Search form ---------- */
function syncSearchForm() {
    $('#sService').value = lastSearch.dept;
    $('#sLang').value = lastSearch.language;
    $('#sDays').value = String(lastSearch.withinDays);
    $('#sWheel').checked = lastSearch.needWheelchair;
}

function readSearchForm() {
    lastSearch = {
        dept: $('#sService').value,
        language: $('#sLang').value,
        needWheelchair: $('#sWheel').checked,
        withinDays: Number($('#sDays').value)
    };
}

/* ---------- Tabs ---------- */
function switchTab(name) {
    $$('.tab').forEach(b => {
        const on = b.dataset.tab === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
    });
    $$('.panel').forEach(p => { p.hidden = p.id !== 'panel-' + name; });
}

/* ---------- Language & font size (C06, C08) ---------- */
function applyI18n() {
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.documentElement.lang = state.lang;
}

function populateSelects() {
    const svc = $('#sService');
    const lg = $('#sLang');
    const svcVal = svc.value || lastSearch.dept;
    const lgVal = lg.value || lastSearch.language;
    svc.innerHTML = Object.keys(DEPARTMENTS).map(k => `<option value="${k}">${esc(deptName(k))}</option>`).join('');
    lg.innerHTML = Object.entries(LANG_NAMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    svc.value = svcVal;
    lg.value = lgVal;
}

function setUILang(code, rerender = true) {
    state.lang = I18N[code] ? code : 'en';
    $('#langSelect').value = state.lang;
    store.set(KEYS.lang, state.lang);
    applyI18n();
    populateSelects();
    if (rerender && state.user) renderAll();
}

function applyFont(size) {
    document.documentElement.style.fontSize = size + 'px';
    store.set(KEYS.font, size);
}

function changeFont(dir) {
    const current = store.get(KEYS.font, 16);
    const idx = Math.min(FONT_STEPS.length - 1, Math.max(0, FONT_STEPS.indexOf(current) + dir));
    applyFont(FONT_STEPS[idx]);
}

/* ---------- Toasts & connectivity ---------- */
function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('leave'), 4000);
    setTimeout(() => el.remove(), 4500);
}

function updateOnline() {
    $('#offlineBanner').hidden = navigator.onLine;
}

/* ---------- Events ---------- */
function handleActions(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.dataset.action) {
        case 'view-slots': openSlotPicker(btn.dataset.facility, btn.dataset.dept); break;
        case 'cancel': cancelBooking(btn.dataset.id); break;
        case 'escalate': escalateBooking(btn.dataset.id); break;
        case 'remove-doc': removeDoc(btn.dataset.doc); break;
    }
}

function bindEvents() {
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#logoutBtn').addEventListener('click', logout);
    $('#langSelect').addEventListener('change', e => setUILang(e.target.value));
    $('#fontUp').addEventListener('click', () => changeFont(1));
    $('#fontDown').addEventListener('click', () => changeFont(-1));

    $$('.tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

    $('#searchForm').addEventListener('submit', e => {
        e.preventDefault();
        readSearchForm();
        renderFindResults();
    });

    $('#ticketForm').addEventListener('submit', handleTicket);
    $('#simRaceBtn').addEventListener('click', simulateRace);
    $('#simDupBtn').addEventListener('click', simulateDuplicate);

    $('#modalClose').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
    $('#slotList').addEventListener('click', e => {
        const btn = e.target.closest('[data-slot]');
        if (btn && !btn.disabled) bookFromPicker(pickerSlots[btn.dataset.slot], btn);
    });

    document.addEventListener('click', handleActions);
    document.addEventListener('change', e => {
        if (e.target.matches('input[type="file"][data-doc]')) handleUpload(e.target);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    });

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
}

/* ---------- Init ---------- */
function init() {
    setUILang(store.get(KEYS.lang, 'en'), false);
    applyFont(store.get(KEYS.font, 16));
    populateSelects();
    bindEvents();
    updateOnline();

    state.user = store.get(KEYS.user, null);
    if (isProfileComplete(state.user)) {
        lastSearch.language = state.user.lang;
        showApp();
    } else {
        showAuth();
    }
}

document.addEventListener('DOMContentLoaded', init);