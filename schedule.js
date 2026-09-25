/**
 * JB6 duty schedule — shared by index.html (browser) and build-calendars.js (Node).
 *
 * Everything is derived from residents.json:
 *   - each unit has its own rotation (units rotate in parallel, independently)
 *   - week N of the rotation: trash = group N % n, dishwasher = group (N + floor(n/2)) % n
 *     so a group never has both duties in the same week and they're spread apart.
 *
 * Dates are handled as whole "day numbers" (days since 1970-01-01, UTC) so the result
 * is identical whatever timezone the browser or build machine is in.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JB6 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DAY_MS = 864e5;

  // ── Day helpers ────────────────────────────────
  function parseDay(ymd) {
    const [y, m, d] = String(ymd).split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
  }
  function localToday(now = new Date()) {
    return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
  }
  function dayToDate(day) { return new Date(day * DAY_MS); } // read with getUTC* only
  function dayToYMD(day) { return dayToDate(day).toISOString().slice(0, 10); }
  function weekday(day) { return (dayToDate(day).getUTCDay() + 6) % 7; } // 0 = Mon … 6 = Sun
  function mondayOf(day) { return day - weekday(day); }
  function fmtDay(day, opts) {
    return dayToDate(day).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
  }

  // ── Duties ─────────────────────────────────────
  // Trash tasks: the window when the bags go OUT, all inside the Mon–Sun duty week.
  // Calendar events span the whole window (midnight is written as 23:59).
  const TRASH_TASKS = [
    { key: 'mon', offset: 0, start: [18, 0], end: [23, 59], icon: '🔵⚪',
      label: 'Blue (PMC) + White bags out', when: 'Monday, 6pm–midnight' },
    { key: 'thu', offset: 3, start: [18, 0], end: [23, 59], icon: '🟡⚪',
      label: 'White + Yellow (paper) bags out', when: 'Thursday, 6pm–midnight' },
    { key: 'fri', offset: 4, start: [6, 0], end: [12, 0], icon: '🟠',
      label: 'Orange bags out', when: 'Friday, 6am–noon' },
    { key: 'glass', offset: 6, start: [18, 0], end: [23, 59], icon: '🟩',
      label: 'Glass out', when: 'Sunday, 6pm–midnight' },
  ];
  const DISH_RULE = 'Empty the dishwasher every morning before 10:00 and keep salt & rinse aid topped up';

  const COLORS = {
    yellow: { bg: '#fff3c4', fg: '#7a5d00', head: '#6b5500' },
    blue:   { bg: '#d8e8fb', fg: '#1d4f8f', head: '#1d4f8f' },
    purple: { bg: '#ecdcf7', fg: '#6a2f8f', head: '#5c2a7c' },
    red:    { bg: '#fadcdc', fg: '#9b2626', head: '#8a2222' },
    green:  { bg: '#dcefd5', fg: '#2d6a1e', head: '#2d5016' },
    orange: { bg: '#fde3cc', fg: '#9a4a0a', head: '#8f4308' },
    teal:   { bg: '#d4efec', fg: '#16675f', head: '#155e57' },
    pink:   { bg: '#fadcec', fg: '#962c63', head: '#83245a' },
    grey:   { bg: '#e6e6e0', fg: '#4a4a44', head: '#4a4a44' },
    brown:  { bg: '#eee0d0', fg: '#6b4524', head: '#5e3c1f' },
  };
  const COLOR_ORDER = Object.keys(COLORS);

  // ── Model ──────────────────────────────────────
  function buildModel(config) {
    const rotation = config.rotation || {};
    const start = mondayOf(parseDay(rotation.start || '2026-09-28'));
    const end = parseDay(rotation.end || '2027-12-31');
    const units = (config.units || []).map((u, ui) => {
      const unitId = `U${ui + 1}`;
      const unitName = u.name || `Unit ${ui + 1}`;
      const groups = (u.groups || []).map((g, gi) => {
        const colorName = COLORS[g.color] ? g.color : COLOR_ORDER[gi % COLOR_ORDER.length];
        return {
          id: `${unitId}-G${gi + 1}`,
          unitId, unitName,
          num: gi + 1,
          name: `${unitName} · Group ${gi + 1}`,
          short: `${unitId} · G${gi + 1}`,
          color: COLORS[colorName],
          members: (g.members || []).map(m => ({ room: String(m.room), name: (m.name || '').trim() || '(empty room)' })),
        };
      });
      return { id: unitId, name: unitName, ambassador: u.ambassador || '', groups };
    });
    return {
      house: config.house || 'Jardin Botanique 6',
      start, end, units,
      groups: units.flatMap(u => u.groups),
    };
  }

  // Monday of every duty week in the rotation (a week is included if its Monday is <= end)
  function weeks(model) {
    const out = [];
    for (let mon = model.start; mon <= model.end; mon += 7) out.push(mon);
    return out;
  }

  function inRotation(model, day) {
    const mon = mondayOf(day);
    return mon >= model.start && mon <= model.end;
  }

  // [{ unit, trash, dish }] for the week containing `day`, or [] outside the rotation
  function dutiesForWeek(model, day) {
    if (!inRotation(model, day)) return [];
    const w = (mondayOf(day) - model.start) / 7;
    return model.units.filter(u => u.groups.length).map(u => {
      const n = u.groups.length;
      return { unit: u, trash: u.groups[w % n], dish: u.groups[(w + Math.floor(n / 2)) % n] };
    });
  }

  // Trash tasks falling on a given day
  function trashTasksOn(day) {
    return TRASH_TASKS.filter(t => t.offset === weekday(day));
  }

  // ── iCalendar ──────────────────────────────────
  const VTIMEZONE = [
    'BEGIN:VTIMEZONE', 'TZID:Europe/Brussels',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST',
    'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET',
    'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE',
  ];

  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  // Fold lines to <= 75 octets without splitting a UTF-8 character (RFC 5545 §3.1)
  function fold(line) {
    const enc = new TextEncoder();
    const parts = [];
    let cur = '', bytes = 0, limit = 75;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > limit) { parts.push(cur); cur = ''; bytes = 0; limit = 74; }
      cur += ch; bytes += b;
    }
    parts.push(cur);
    return parts.join('\r\n ');
  }
  const pad = n => String(n).padStart(2, '0');
  const icsDate = day => dayToYMD(day).replace(/-/g, '');
  const icsDateTime = (day, [h, m]) => `${icsDate(day)}T${pad(h)}${pad(m)}00`;
  function icsStamp(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); }

  function groupIcs(model, groupId, { now = new Date() } = {}) {
    const group = model.groups.find(g => g.id === groupId);
    if (!group) throw new Error(`Unknown group ${groupId}`);
    const stamp = icsStamp(now);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JB6//Duty schedule//EN', 'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${icsEscape(`JB6 Duties — ${group.name}`)}`,
      'X-WR-TIMEZONE:Europe/Brussels',
      'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H',
      ...VTIMEZONE,
    ];
    const event = (uid, props, summary, desc, alarm) => {
      lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, ...props,
        `SUMMARY:${icsEscape(summary)}`, `DESCRIPTION:${icsEscape(desc)}`,
        `LOCATION:${icsEscape(`${model.house}, Brussels`)}`, 'TRANSP:TRANSPARENT');
      if (alarm) lines.push('BEGIN:VALARM', `TRIGGER:${alarm}`, 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM');
      lines.push('END:VEVENT');
    };

    for (const mon of weeks(model)) {
      const duty = dutiesForWeek(model, mon).find(d => d.unit.id === group.unitId);
      if (!duty) continue;
      const ymd = dayToYMD(mon);
      if (duty.trash.id === groupId) {
        for (const t of TRASH_TASKS) {
          const day = mon + t.offset;
          event(`${groupId}-${ymd}-trash-${t.key}@jb6`,
            [`DTSTART;TZID=Europe/Brussels:${icsDateTime(day, t.start)}`,
             `DTEND;TZID=Europe/Brussels:${icsDateTime(day, t.end)}`],
            `${t.icon} ${t.label} — ${group.short}`,
            `Trash week for ${group.name}: ${t.when}.`,
            '-PT0M');
        }
      }
      if (duty.dish.id === groupId) {
        event(`${groupId}-${ymd}-dishwasher@jb6`,
          [`DTSTART;VALUE=DATE:${icsDate(mon)}`, `DTEND;VALUE=DATE:${icsDate(mon + 7)}`],
          `🍽️ Dishwasher week — ${group.short}`,
          `Dishwasher week for ${group.name}. ${DISH_RULE}.`,
          'PT8H');
      }
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  function icsFileName(groupId) { return `jb6-${groupId.toLowerCase()}.ics`; }

  return {
    parseDay, localToday, dayToDate, dayToYMD, weekday, mondayOf, fmtDay,
    TRASH_TASKS, DISH_RULE, COLORS,
    buildModel, weeks, inRotation, dutiesForWeek, trashTasksOn,
    groupIcs, icsFileName,
  };
});
