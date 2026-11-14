# LAN Championship 2026

Frontend-only tournament tracker built with React, TypeScript, and Vite. Results and raw match statistics are stored in the browser's LocalStorage; no account or backend is needed.

## Run locally

```sh
npm install
npm run dev
```

## Enter match statistics

Open **Stats** in the regular navigation, choose a discipline and match, then enter the scoreboard values for each player. Values save automatically. Empty fields remain missing rather than being treated as zero. Match results are recorded separately on the overview; MVP points are awarded only after a discipline is complete and all required statistics have been entered.

- **League of Legends (ARAM):** Champion (optional), kills, deaths, assists, champion damage, and either damage mitigated or healing/shielding for the series. Enter match duration once per match. Team kills and kill participation are calculated automatically.
- **Warcraft III:** units killed, heroes killed, experience, gold, lumber, and buildings razed. Resources are calculated from gold plus lumber and series values are averaged. Disable any unavailable metric at the bottom of its Stats panel.
- **PEAK:** each player's highest checkpoint and summit result, plus each team's summit result, expedition duration, and highest checkpoint. The team time is not used for individual MVP scores.
- **Hood Warfare 2:** kills and deaths are scored; ingame score is optional and is recorded but not scored.
- **Rocket League:** goals, assists, saves, shots, and ingame score; series values are averaged.
- **Mystery Game:** remains inactive until enabled in Admin. Configure numeric metric names, relative weights, and whether lower values are better there; no source-code change is required.

Metric scores are normalized across the eight players. The configured metric weights combine into a score from 0 to 100. Final placement awards up to 8 MVP points per completed discipline; ties share the points for their occupied places. Incomplete or ongoing disciplines may show provisional scores but do not add MVP points.

## Data and validation

- Raw per-match, player, match-detail, and team statistics are saved to LocalStorage.
- Admin's **Export JSON** / **Import JSON** preserve the full tournament state. Existing schema-v1 data is migrated without discarding legacy statistics or match results.
- The Stats page's **Export CSV** downloads the recorded match statistics.
- Run `npm test` for scoring and persistence tests, and `npm run build` for type-checking and the production build.
