import { describe, expect, it } from 'vitest'
import { initialTournamentState, type Discipline, type StatValue, type TournamentState } from '../data/tournament'
import {
  calculateDisciplineMvp,
  calculateRawDisciplineMetrics,
  customMetricKey,
  getDisciplineMvpWeights,
  isDisciplineDataComplete,
  setMatchValue,
} from './mvp'

function stateFor(disciplineId: string, series = { A: 0, B: 0 }, completed = true) {
  const state = structuredClone(initialTournamentState)
  state.disciplines = state.disciplines.map((discipline) => discipline.id === disciplineId
    ? { ...discipline, active: true, series, completed, winner: completed ? 'A' : null }
    : { ...discipline, active: false })
  return state
}

function setPlayerMatchValue(
  state: TournamentState,
  disciplineId: string,
  matchId: string,
  playerId: string,
  key: string,
  value: StatValue,
) {
  state.matchStats[disciplineId] ??= {}
  state.matchStats[disciplineId][matchId] ??= {}
  state.matchStats[disciplineId][matchId][playerId] ??= {}
  state.matchStats[disciplineId][matchId][playerId][key] = value
}

function fillRocketLeague(state: TournamentState, matches: number, identical = false) {
  for (let match = 1; match <= matches; match += 1) {
    state.players.forEach((player, index) => {
      const base = identical ? 2 : index + match
      for (const [key, value] of Object.entries({
        goals: base,
        assists: base,
        saves: base,
        shots: base,
        ingameScore: base * 10,
      })) setPlayerMatchValue(state, 'rocket-league', String(match), player.id, key, value)
    })
  }
}

describe('MVP statistics and ranking', () => {
  it('calculates ARAM KDA, team-kill participation, damage per minute, and defensive normalization', () => {
    const state = stateFor('lol', { A: 0, B: 0 })
    const matchId = '1'
    state.matchDetails.lol = { [matchId]: { durationMinutes: 10, durationSeconds: 0 } }
    state.players.forEach((player, index) => {
      const values = player.id === 'jay'
        ? { kills: 4, deaths: 2, assists: 6, championDamage: 6000, damageMitigated: 5000 }
        : { kills: 1, deaths: 2, assists: 1, championDamage: 3000, healingShielding: 1000 + index }
      for (const [key, value] of Object.entries(values)) setPlayerMatchValue(state, 'lol', matchId, player.id, key, value)
    })

    const raw = calculateRawDisciplineMetrics(state.disciplines.find((entry) => entry.id === 'lol')!, state.players, state)
    expect(raw.get('jay')?.kda).toBe(5)
    expect(raw.get('jay')?.killParticipation).toBeCloseTo(100 * 10 / 7)
    expect(raw.get('jay')?.championDamagePerMinute).toBe(600)
    expect(isDisciplineDataComplete(state.disciplines.find((entry) => entry.id === 'lol')!, state.players, state)).toBe(true)

    const result = calculateDisciplineMvp(state.disciplines.find((entry) => entry.id === 'lol')!, state.players, state)
    expect(result.find((entry) => entry.playerId === 'jay')?.metricScores['Defensive Performance']).toBe(100)
  })

  it('averages Warcraft III metrics over the played matches and derives resources from gold plus lumber', () => {
    const state = stateFor('warcraft3', { A: 2, B: 1 })
    for (let match = 1; match <= 3; match += 1) {
      state.players.forEach((player, index) => {
        const values = {
          unitsKilled: index + match * 10,
          heroesKilled: index + match,
          experience: index + match * 100,
          gold: index + match * 1000,
          lumber: index + match * 100,
          buildingsRazed: index + match,
        }
        for (const [key, value] of Object.entries(values)) setPlayerMatchValue(state, 'warcraft3', String(match), player.id, key, value)
      })
    }

    const raw = calculateRawDisciplineMetrics(state.disciplines.find((entry) => entry.id === 'warcraft3')!, state.players, state)
    expect(raw.get('jay')?.unitsKilled).toBe(20)
    expect(raw.get('jay')?.resourcesCollected).toBe(2200)
    expect(isDisciplineDataComplete(state.disciplines.find((entry) => entry.id === 'warcraft3')!, state.players, state)).toBe(true)
  })

  it('gives PEAK players identical scores and averaged rank points for a genuine tie', () => {
    const state = stateFor('peak', { A: 1, B: 0 })
    state.matchStats.peak = { '1': {} }
    for (const player of state.players) {
      setPlayerMatchValue(state, 'peak', '1', player.id, 'highestCheckpoint', 5)
      setPlayerMatchValue(state, 'peak', '1', player.id, 'summitReached', false)
    }
    state.teamMatchStats.peak = {
      '1': {
        A: { summitReached: false, expeditionMinutes: 20, expeditionSeconds: 0, highestCheckpoint: 5 },
        B: { summitReached: false, expeditionMinutes: 20, expeditionSeconds: 0, highestCheckpoint: 5 },
      },
    }
    const discipline = state.disciplines.find((entry) => entry.id === 'peak')!
    const results = calculateDisciplineMvp(discipline, state.players, state)
    expect(results.every((result) => result.score === 100)).toBe(true)
    expect(results.every((result) => result.rank === 1)).toBe(true)
    expect(results.every((result) => result.points === 4.5)).toBe(true)
  })

  it('uses aggregate K/D for Hood Warfare and does not score the optional ingame score', () => {
    const state = stateFor('hood-war', { A: 2, B: 1 })
    for (let match = 1; match <= 3; match += 1) {
      state.players.forEach((player, index) => {
        setPlayerMatchValue(state, 'hood-war', String(match), player.id, 'kills', index + match)
        setPlayerMatchValue(state, 'hood-war', String(match), player.id, 'deaths', 2)
        setPlayerMatchValue(state, 'hood-war', String(match), player.id, 'ingameScore', 900 - index)
      })
    }
    const raw = calculateRawDisciplineMetrics(state.disciplines.find((entry) => entry.id === 'hood-war')!, state.players, state)
    expect(raw.get('jay')?.kdRatio).toBe(1)
    const result = calculateDisciplineMvp(state.disciplines.find((entry) => entry.id === 'hood-war')!, state.players, state)
    expect(Object.keys(result[0].metricScores)).toEqual(['Kills', 'K/D Ratio'])
  })

  it('averages Rocket League series values and awards no points while any required stat is missing', () => {
    const state = stateFor('rocket-league', { A: 2, B: 1 })
    fillRocketLeague(state, 3)
    const raw = calculateRawDisciplineMetrics(state.disciplines.find((entry) => entry.id === 'rocket-league')!, state.players, state)
    expect(raw.get('jay')?.goals).toBe(2)

    const missingState = stateFor('rocket-league', { A: 0, B: 0 }, false)
    const missingDiscipline = missingState.disciplines.find((entry) => entry.id === 'rocket-league')!
    const missingResults = calculateDisciplineMvp(missingDiscipline, missingState.players, missingState)
    expect(isDisciplineDataComplete(missingDiscipline, missingState.players, missingState)).toBe(false)
    expect(missingResults.every((result) => result.points === 0)).toBe(true)
    expect(missingResults.every((result) => result.score === null)).toBe(true)

    const provisionalState = stateFor('rocket-league', { A: 0, B: 0 }, false)
    fillRocketLeague(provisionalState, 1)
    const provisional = calculateDisciplineMvp(
      provisionalState.disciplines.find((entry) => entry.id === 'rocket-league')!,
      provisionalState.players,
      provisionalState,
    )
    expect(provisional.every((result) => result.complete)).toBe(true)
    expect(provisional.every((result) => result.points === 0)).toBe(true)
  })

  it('normalizes identical performance to 100 and splits tied MVP points without increasing the discipline total', () => {
    const state = stateFor('rocket-league', { A: 1, B: 0 })
    fillRocketLeague(state, 1, true)
    const discipline = state.disciplines.find((entry) => entry.id === 'rocket-league') as Discipline
    const results = calculateDisciplineMvp(discipline, state.players, state)
    expect(results.every((result) => result.score === 100)).toBe(true)
    expect(results.every((result) => result.rank === 1 && result.points === 4.5)).toBe(true)
    expect(results.reduce((sum, result) => sum + result.points, 0)).toBe(36)
    expect(Object.values(getDisciplineMvpWeights(discipline)).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(100)
  })

  it('updates a corrected match entry and skips the next rank after a tie', () => {
    const state = stateFor('rocket-league', { A: 1, B: 0 })
    fillRocketLeague(state, 1)
    const first = state.players[0]
    let prepared = state
    for (const [index, player] of state.players.entries()) {
      const value = index < 2 ? 10 : 0
      for (const key of ['goals', 'assists', 'saves', 'shots', 'ingameScore']) {
        prepared = setMatchValue(prepared, 'rocket-league', '1', player.id, key, key === 'ingameScore' ? value * 10 : value)
      }
    }

    const discipline = state.disciplines.find((entry) => entry.id === 'rocket-league')!
    const corrected = setMatchValue(prepared, 'rocket-league', '1', first.id, 'goals', 20)
    const correctedRaw = calculateRawDisciplineMetrics(discipline, state.players, corrected)
    expect(correctedRaw.get(first.id)?.goals).toBe(20)
    expect(prepared.matchStats['rocket-league']?.['1']?.[first.id]?.goals).not.toBe(20)

    const tiedState = setMatchValue(corrected, 'rocket-league', '1', first.id, 'goals', 10)
    const results = calculateDisciplineMvp(discipline, state.players, tiedState)
    const tied = results.filter((result) => result.rank === 1)
    const next = results.filter((result) => result.rank === 3)
    expect(tied).toHaveLength(2)
    expect(tied[0].points).toBe(tied[1].points)
    expect(next).toHaveLength(6)
    expect(next.every((result) => result.rank === 3)).toBe(true)
  })

  it('treats a zero-kill ARAM match as zero kill participation instead of dividing by zero', () => {
    const state = stateFor('lol', { A: 0, B: 0 })
    state.matchDetails.lol = { '1': { durationMinutes: 1, durationSeconds: 0 } }
    for (const player of state.players) {
      for (const key of ['kills', 'deaths', 'assists', 'championDamage', 'damageMitigated']) {
        setPlayerMatchValue(state, 'lol', '1', player.id, key, 0)
      }
    }
    const raw = calculateRawDisciplineMetrics(state.disciplines.find((entry) => entry.id === 'lol')!, state.players, state)
    expect(raw.get('jay')?.killParticipation).toBe(0)
  })

  it('supports configurable Mystery Game metrics, weights, and lower-is-better scoring', () => {
    const state = stateFor('mystery-game', { A: 1, B: 0 })
    const discipline = state.disciplines.find((entry) => entry.id === 'mystery-game')!
    discipline.metrics = ['Round Wins', 'Penalties']
    discipline.metricWeights = {
      [customMetricKey('Round Wins')]: 3,
      [customMetricKey('Penalties')]: 1,
    }
    discipline.lowerIsBetterMetrics = [customMetricKey('Penalties')]
    state.players.forEach((player, index) => {
      setPlayerMatchValue(state, 'mystery-game', '1', player.id, customMetricKey('Round Wins'), 8 - index)
      setPlayerMatchValue(state, 'mystery-game', '1', player.id, customMetricKey('Penalties'), index)
    })

    expect(isDisciplineDataComplete(discipline, state.players, state)).toBe(true)
    expect(getDisciplineMvpWeights(discipline)).toEqual({ 'Round Wins': 75, Penalties: 25 })
    const results = calculateDisciplineMvp(discipline, state.players, state)
    expect(results.find((entry) => entry.playerId === 'jay')?.points).toBe(8)
  })
})
