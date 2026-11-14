export type TeamId = 'A' | 'B'

export interface Player {
  id: string
  name: string
  team: TeamId
  gamesPlayed: number
  disciplinesWon: number
  mvpPoints: number
}

export interface Discipline {
  id: string
  name: string
  description: string
  mode: string
  bestOf: number
  active: boolean
  series: Record<TeamId, number>
  winner: TeamId | null
  completed: boolean
  metrics: string[]
  mvpWeight: number
  metricWeights?: Record<string, number>
  disabledMetrics?: string[]
  lowerIsBetterMetrics?: string[]
}

export interface ThemeConfig {
  teamA: string
  teamB: string
  accent: string
  background: string
}

export type MetricValues = Record<string, number>
export type DisciplineStats = Record<string, Record<string, MetricValues>>
export type StatValue = number | string | boolean
export type MatchPlayerStats = Record<string, Record<string, StatValue>>
export type MatchStats = Record<string, Record<string, MatchPlayerStats>>
export type MatchDetails = Record<string, Record<string, Record<string, StatValue>>>
export type TeamMatchStats = Record<string, Record<string, Record<TeamId, Record<string, StatValue>>>>

export interface TournamentState {
  version: number
  theme: ThemeConfig
  disciplines: Discipline[]
  players: Player[]
  disciplineStats: DisciplineStats
  matchStats: MatchStats
  matchDetails: MatchDetails
  teamMatchStats: TeamMatchStats
  tiebreakWinner: TeamId | null
  tiebreakLocked: boolean
}

export const teams = {
  A: {
    id: 'A',
    name: 'JaySóns Feggit Bande',
    shortName: 'Team A',
    accent: '#3ba7ff',
  },
  B: {
    id: 'B',
    name: 'Markings Coole Buben Truppe',
    shortName: 'Team B',
    accent: '#ff8a4c',
  },
} as const

export const players: Player[] = [
  { id: 'jay', name: 'Jay', team: 'A', gamesPlayed: 6, disciplinesWon: 2, mvpPoints: 34 },
  { id: 'marvin', name: 'Marvin', team: 'A', gamesPlayed: 5, disciplinesWon: 1, mvpPoints: 28 },
  { id: 'buhnings', name: 'Bühnings', team: 'A', gamesPlayed: 4, disciplinesWon: 1, mvpPoints: 23 },
  { id: 'merlin', name: 'Merlin', team: 'A', gamesPlayed: 7, disciplinesWon: 2, mvpPoints: 31 },
  { id: 'marcings', name: 'Marcings', team: 'B', gamesPlayed: 6, disciplinesWon: 2, mvpPoints: 30 },
  { id: 'basti', name: 'Basti', team: 'B', gamesPlayed: 5, disciplinesWon: 1, mvpPoints: 24 },
  { id: 'florian', name: 'Florian', team: 'B', gamesPlayed: 4, disciplinesWon: 2, mvpPoints: 27 },
  { id: 'philip', name: 'Philip', team: 'B', gamesPlayed: 6, disciplinesWon: 1, mvpPoints: 20 },
]

export const initialTournamentState: TournamentState = {
  version: 2,
  theme: {
    teamA: '#3ba7ff',
    teamB: '#ff8a4c',
    accent: '#f7d662',
    background: '#0f172a',
  },
  disciplineStats: {},
  matchStats: {},
  matchDetails: {},
  teamMatchStats: {},
  tiebreakWinner: null,
  tiebreakLocked: true,
  disciplines: [
    {
      id: 'lol',
      name: 'League of Legends',
      description: "Best-of-9 ARAM. Record each player's scoreboard stats after every match.",
      mode: 'Best of 9',
      bestOf: 9,
      active: true,
      series: { A: 3, B: 1 },
      winner: null,
      completed: false,
      metrics: ['KDA', 'Kill Participation', 'Champion Damage per Minute', 'Damage Mitigated / Healing & Shielding'],
      mvpWeight: 24,
    },
    {
      id: 'warcraft3',
      name: 'Warcraft III',
      description: 'Best-of-3, macro control and relentless map pressure.',
      mode: 'Best of 3',
      bestOf: 3,
      active: true,
      series: { A: 2, B: 1 },
      winner: 'A',
      completed: true,
      metrics: ['Units Killed', 'Heroes Killed', 'Experience Gained', 'Resources Collected', 'Buildings Razed'],
      mvpWeight: 20,
    },
    {
      id: 'peak',
      name: 'PEAK Teamrennen',
      description: 'Team race format with precision route decisions and endurance.',
      mode: 'Team race',
      bestOf: 1,
      active: true,
      series: { A: 1, B: 0 },
      winner: 'A',
      completed: true,
      metrics: ['Highest Checkpoint', 'Summit Reached'],
      mvpWeight: 18,
    },
    {
      id: 'hood-war',
      name: 'Hood Warfare 2',
      description: 'Best-of-5 Team Deathmatch. Record player kills and deaths after each match.',
      mode: 'Best of 5',
      bestOf: 5,
      active: true,
      series: { A: 0, B: 3 },
      winner: 'B',
      completed: true,
      metrics: ['Kills', 'K/D Ratio', 'Ingame Score (not scored)'],
      mvpWeight: 26,
    },
    {
      id: 'rocket-league',
      name: 'Rocket League',
      description: 'Best-of-5, aerial rhythm and finish control.',
      mode: 'Best of 5',
      bestOf: 5,
      active: true,
      series: { A: 2, B: 3 },
      winner: 'B',
      completed: true,
      metrics: ['Goals', 'Assists', 'Saves', 'Shots', 'Ingame Score'],
      mvpWeight: 22,
    },
    {
      id: 'mystery-game',
      name: 'Mystery Game – Coming Soon',
      description: 'Future competitive game placeholder ready for admin configuration.',
      mode: 'Pending configuration',
      bestOf: 1,
      active: false,
      series: { A: 0, B: 0 },
      winner: null,
      completed: false,
      metrics: ['Custom metrics', 'MVP weighting', 'Match rules', 'Victory conditions'],
      mvpWeight: 25,
    },
  ],
  players,
}
