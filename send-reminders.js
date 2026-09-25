#!/usr/bin/env node
/**
 * Jardin Botanique 6 — Weekly Duty Check
 *
 * This script reads residents.json and prints the current duty assignments.
 * There is no email sending, no GitHub secret requirement, and no runtime storage.
 */

const fs = require('fs');
const path = require('path');

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'residents.json'), 'utf8')
);

const refMonday = new Date(config.referenceMonday || '2025-02-09');

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekIndex(monday) {
  return Math.round((monday - refMonday) / (7 * 24 * 3600 * 1000));
}

function groupForWeek(weekIndexValue) {
  const groups = Array.isArray(config.groups) ? config.groups : [];
  if (!groups.length) return null;
  const idx = ((weekIndexValue % groups.length) + groups.length) % groups.length;
  return groups[idx];
}

function formatMember(member) {
  return member && member.name ? member.name : `Room ${member && member.room ? member.room : '?'}`;
}

function main() {
  const thisMonday = getMondayOfWeek();
  const wi = weekIndex(thisMonday);
  const trashGroup = groupForWeek(wi);
  const dishGroup = groupForWeek(wi + 1);

  console.log(`\n🏡 ${config.house} — Weekly Duty Check`);
  console.log(`📅 Week of ${thisMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  console.log(`👥 Unit Ambassadors: ${config.units.map(unit => `${unit.name}: ${unit.ambassador && unit.ambassador.name ? unit.ambassador.name : 'TBD'}`).join(' | ')}`);

  if (trashGroup) {
    console.log(`🗑️ Trash duty: ${trashGroup.name}`);
    console.log(`   ${trashGroup.members.map(formatMember).join(' • ')}`);
  } else {
    console.log('🗑️ Trash duty: n/a');
  }

  if (dishGroup) {
    console.log(`🍽️ Dishwasher duty: ${dishGroup.name}`);
    console.log(`   ${dishGroup.members.map(formatMember).join(' • ')}`);
  } else {
    console.log('🍽️ Dishwasher duty: n/a');
  }

  console.log('\n✅ No email sending. Repo data is the source of truth.\n');
}

main();
