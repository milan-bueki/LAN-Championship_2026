import { initialTournamentState, type Discipline, type TournamentState } from '../data/tournament'
import { withDerivedPlayerData } from './mvp'

const STORAGE_KEY = 'lan-championship-2026-state'
const STORAGE_SCHEMA_VERSION = 2

export function normalizeTournamentData(parsed: Partial<TournamentState>): TournamentState {
  if (parsed.version !== 1 && parsed.version !== STORAGE_SCHEMA_VERSION) {
    throw new Error('Unsupported tournament export version.')
  }
  if (!Array.isArray(parsed.disciplines) || !Array.isArray(parsed.players)) {
    throw new Error('The tournament export is missing players or disciplines.')
  }
  const savedDisciplines = new Map((parsed.disciplines ?? []).map((discipline) => [discipline.id, discipline]))
  const disciplines = initialTournamentState.disciplines.map((defaults) => {
    const saved = savedDisciplines.get(defaults.id)
    if (!saved) return defaults
    const preserveLegacySettings = parsed.version !== STORAGE_SCHEMA_VERSION
    return {
      ...defaults,
      ...saved,
      metrics: preserveLegacySettings && defaults.id !== 'mystery-game' ? defaults.metrics : saved.metrics ?? defaults.metrics,
      series: { ...defaults.series, ...saved.series },
    } satisfies Discipline
  })

  return {
    ...initialTournamentState,
    ...parsed,
    version: STORAGE_SCHEMA_VERSION,
    theme: { ...initialTournamentState.theme, ...parsed.theme },
    disciplines,
    players: parsed.players?.length ? parsed.players : initialTournamentState.players,
    disciplineStats: parsed.disciplineStats ?? initialTournamentState.disciplineStats,
    matchStats: parsed.matchStats ?? initialTournamentState.matchStats,
    matchDetails: parsed.matchDetails ?? initialTournamentState.matchDetails,
    teamMatchStats: parsed.teamMatchStats ?? initialTournamentState.teamMatchStats,
  }
}

export function loadTournament(): TournamentState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return withDerivedPlayerData(initialTournamentState)
  }

  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Saved tournament data is not a JSON object; existing LocalStorage data was left untouched.')
  }
  return withDerivedPlayerData(normalizeTournamentData(parsed as Partial<TournamentState>))
}

export function saveTournament(state: TournamentState) {
  const normalized = normalizeTournamentData(state)
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...normalized,
      players: normalized.players.map((player) => ({ ...player, mvpPoints: 0 })),
      version: STORAGE_SCHEMA_VERSION,
    }),
  )
}
