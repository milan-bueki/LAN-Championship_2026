// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { initialTournamentState } from '../data/tournament'
import { loadTournament, normalizeTournamentData, saveTournament } from './storage'

const storageKey = 'lan-championship-2026-state'

describe('tournament persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists and restores match-level raw statistics', () => {
    const state = structuredClone(initialTournamentState)
    state.matchStats['rocket-league'] = {
      '1': {
        jay: { goals: 2, assists: 1, saves: 0, shots: 4, ingameScore: 312 },
      },
    }
    state.matchDetails.lol = { '1': { durationMinutes: 24, durationSeconds: 30 } }
    state.teamMatchStats.peak = {
      '1': {
        A: { summitReached: true, expeditionMinutes: 35, expeditionSeconds: 0, highestCheckpoint: 8 },
        B: { summitReached: false, expeditionMinutes: 35, expeditionSeconds: 0, highestCheckpoint: 6 },
      },
    }

    saveTournament(state)
    const restored = loadTournament()
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')
    expect(restored.matchStats['rocket-league']?.['1']?.jay?.goals).toBe(2)
    expect(restored.matchDetails.lol?.['1']?.durationSeconds).toBe(30)
    expect(restored.teamMatchStats.peak?.['1']?.A?.summitReached).toBe(true)
    expect(stored.players.every((player: { mvpPoints: number }) => player.mvpPoints === 0)).toBe(true)
  })

  it('migrates schema v1 without discarding existing tournament or legacy statistic data', () => {
    const legacy = {
      version: 1,
      theme: { ...initialTournamentState.theme, teamA: '#123456' },
      disciplines: initialTournamentState.disciplines.map((discipline) => ({
        ...discipline,
        series: discipline.id === 'lol' ? { A: 4, B: 2 } : discipline.series,
      })),
      players: initialTournamentState.players,
      disciplineStats: { lol: { jay: { Kills: 12 } } },
      tiebreakWinner: null,
      tiebreakLocked: true,
    }
    window.localStorage.setItem(storageKey, JSON.stringify(legacy))

    const migrated = loadTournament()
    expect(migrated.version).toBe(2)
    expect(migrated.theme.teamA).toBe('#123456')
    expect(migrated.disciplines.find((discipline) => discipline.id === 'lol')?.series).toEqual({ A: 4, B: 2 })
    expect(migrated.disciplineStats.lol?.jay?.Kills).toBe(12)
    expect(migrated.matchStats).toEqual({})
  })

  it('normalizes imported schema v2 exports while preserving raw stats and custom metrics', () => {
    const exported = structuredClone(initialTournamentState)
    const mystery = exported.disciplines.find((discipline) => discipline.id === 'mystery-game')!
    mystery.metrics = ['Round Wins', 'Penalties']
    mystery.metricWeights = { 'custom-round-wins': 3, 'custom-penalties': 1 }
    mystery.lowerIsBetterMetrics = ['custom-penalties']
    exported.matchStats['mystery-game'] = { '1': { jay: { 'custom-round-wins': 4 } } }

    const imported = normalizeTournamentData(JSON.parse(JSON.stringify(exported)))
    expect(imported.disciplines.find((discipline) => discipline.id === 'mystery-game')?.metrics).toEqual(['Round Wins', 'Penalties'])
    expect(imported.disciplines.find((discipline) => discipline.id === 'mystery-game')?.lowerIsBetterMetrics).toEqual(['custom-penalties'])
    expect(imported.matchStats['mystery-game']?.['1']?.jay?.['custom-round-wins']).toBe(4)
  })

  it('surfaces corrupt saved JSON without replacing the existing LocalStorage value', () => {
    window.localStorage.setItem(storageKey, '{invalid')
    expect(() => loadTournament()).toThrow()
    expect(window.localStorage.getItem(storageKey)).toBe('{invalid')
  })
})
