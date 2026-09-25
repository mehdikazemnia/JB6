#!/usr/bin/env node
/**
 * Generates one subscribable calendar per group into calendars/ from residents.json.
 * Runs automatically in GitHub Actions on every push (see .github/workflows/pages.yml),
 * so editing residents.json on GitHub is enough to update every calendar feed.
 *
 *   node build-calendars.js
 */
const fs = require('fs');
const path = require('path');
const JB6 = require('./schedule.js');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'residents.json'), 'utf8'));
const model = JB6.buildModel(config);
const outDir = path.join(__dirname, 'calendars');
fs.mkdirSync(outDir, { recursive: true });

for (const group of model.groups) {
  const file = path.join(outDir, JB6.icsFileName(group.id));
  fs.writeFileSync(file, JB6.groupIcs(model, group.id));
  console.log(`${group.name.padEnd(18)} ${group.members.map(m => m.name).join(', ')}  →  calendars/${path.basename(file)}`);
}

const today = JB6.localToday();
const shown = Math.max(JB6.mondayOf(today), model.start);
console.log(`\nRotation ${JB6.dayToYMD(model.start)} → ${JB6.dayToYMD(model.end)}. Week of ${JB6.dayToYMD(shown)}:`);
for (const d of JB6.dutiesForWeek(model, shown)) {
  console.log(`  ${d.unit.name}: trash ${d.trash.short}, dishwasher ${d.dish.short}`);
}
