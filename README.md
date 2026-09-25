# 🌿 Jardin Botanique 6 — House Dashboard

Live dashboard + weekly duty schedule for the JB6 house: https://mehdikazemnia.github.io/JB6

## Updating residents

Edit **`residents.json`** (the pencil icon on GitHub is enough) and commit. Everything else follows:
the website, the reminders and the subscribable calendar feeds are rebuilt automatically by
GitHub Actions within a minute or two.

- **Someone moves in/out:** change the `name` of that room.
- **Ambassador changes:** change the unit's `ambassador`.
- **Extend the schedule:** change `rotation.end`.

Groups are rotated in the order they appear, so avoid reordering, adding or removing groups
mid-rotation unless you mean to reshuffle the schedule. Group colors can be any of
`yellow, blue, purple, red, green, orange, teal, pink, grey, brown`.

## How the rotation works

Each unit rotates on its own, in parallel, one duty week = Monday to Sunday, starting on `rotation.start`.
In week *N* of a unit with *n* groups, trash goes to group `N mod n` and the dishwasher to group
`(N + ⌊n/2⌋) mod n`, so a group never has both duties in the same week. The logic lives in
[`schedule.js`](./schedule.js) and is shared by the page and the calendar build.

## Files

| File | Purpose |
| --- | --- |
| `residents.json` | The only file you normally edit |
| `index.html` | The dashboard |
| `schedule.js` | Rotation + calendar (.ics) generation |
| `build-calendars.js` | Writes `calendars/*.ics` (run by the workflow; `node build-calendars.js` locally) |
| `.github/workflows/pages.yml` | Builds and publishes the site on every push to `main` |

**One-time setup:** in the repo on GitHub, *Settings → Pages → Build and deployment → Source* must be **GitHub Actions**.

**Local preview:** the page loads `residents.json` with `fetch`, which browsers block for `file://` pages.
Run `npx serve .` (or `python -m http.server`) in this folder and open the printed URL.

---

## License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

You are free to view, use, and adapt this code for personal or community purposes.
Commercial use of this software is prohibited under the terms of the PolyForm Noncommercial License.

See the [LICENSE](./LICENSE) file for full terms.
