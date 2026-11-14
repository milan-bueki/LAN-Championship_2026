import type { Discipline, TeamId } from '../data/tournament'

export function requiredWins(bestOf: number) {
  return Math.max(1, Math.ceil(bestOf / 2))
}

export function getDisciplineState(discipline: Discipline) {
  if (!discipline.active) {
    return 'Disabled'
  }

  if (discipline.winner && discipline.completed) {
    return 'Completed'
  }

  if (discipline.series.A > 0 || discipline.series.B > 0) {
    return 'Running'
  }

  return 'Waiting'
}

export function getTeamWins(disciplines: Discipline[]) {
  return disciplines.reduce(
    (acc, discipline) => {
      if (!discipline.active || !discipline.winner) {
        return acc
      }

      if (discipline.winner === 'A') {
        acc.A += 1
      } else {
        acc.B += 1
      }

      return acc
    },
    { A: 0, B: 0 },
  )
}

export function getChampionshipState(disciplines: Discipline[]) {
  const active = disciplines.filter((discipline) => discipline.active)
  const activeCount = active.length

  if (activeCount === 0) {
    return {
      status: 'not-started',
      label: 'Turnier noch nicht begonnen',
      winner: null,
    }
  }

  const wins = getTeamWins(active)
  const completedCount = active.filter((discipline) => discipline.completed).length

  if (wins.A >= 4 || wins.B >= 4) {
    return {
      status: 'theoretical',
      label: 'Ein Team steht rechnerisch bereits als Sieger fest',
      winner: wins.A >= wins.B ? 'A' : 'B',
    }
  }

  if (completedCount === activeCount) {
    if (wins.A === wins.B && activeCount === 6) {
      return {
        status: 'tiebreak',
        label: 'Tiebreak erforderlich',
        winner: null,
      }
    }

    return {
      status: 'final',
      label: 'Turnier endgültig entschieden',
      winner: wins.A === wins.B ? null : wins.A > wins.B ? 'A' : 'B',
    }
  }

  if (wins.A >= 3 || wins.B >= 3) {
    return {
      status: 'running',
      label: 'Turnier läuft',
      winner: null,
    }
  }

  return {
    status: 'running',
    label: 'Turnier läuft',
    winner: null,
  }
}

export function getDisciplineWinner(discipline: Discipline): TeamId | null {
  const threshold = requiredWins(discipline.bestOf)
  const { A, B } = discipline.series

  if (A >= threshold && A > B) {
    return 'A'
  }

  if (B >= threshold && B > A) {
    return 'B'
  }

  return null
}

export function updateDisciplineSeries(
  discipline: Discipline,
  team: TeamId,
  value: number,
): Discipline {
  const nextSeries = {
    ...discipline.series,
    [team]: Math.max(0, Math.min(discipline.bestOf, discipline.series[team] + value)),
  }

  const threshold = requiredWins(discipline.bestOf)
  const winner = nextSeries.A >= threshold && nextSeries.A > nextSeries.B ? 'A' : nextSeries.B >= threshold && nextSeries.B > nextSeries.A ? 'B' : null

  return {
    ...discipline,
    series: nextSeries,
    winner,
    completed: Boolean(winner),
  }
}
