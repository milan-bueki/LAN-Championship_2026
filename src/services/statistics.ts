import type { Discipline, Player, TeamId } from '../data/tournament'

export function getPlayerLeaderboard(players: Player[]) {
  return [...players].sort((left, right) => right.mvpPoints - left.mvpPoints)
}

export function getPlayerStats(player: Player, disciplines: Discipline[]) {
  const matchHistory = disciplines
    .filter((discipline) => discipline.active && discipline.winner)
    .map((discipline) => ({
      name: discipline.name,
      result: discipline.winner === player.team ? 'Win' : 'Loss',
      score: `${discipline.series[player.team]} : ${discipline.series[player.team === 'A' ? 'B' : 'A']}`,
    }))

  return {
    totalMatches: player.gamesPlayed,
    disciplinesWon: player.disciplinesWon,
    mvpPoints: player.mvpPoints,
    matchHistory,
  }
}

export function getTeamSummary(disciplines: Discipline[]) {
  return disciplines.reduce(
    (acc, discipline) => {
      if (!discipline.active) {
        return acc
      }

      if (discipline.winner === 'A') {
        acc.A += 1
      }

      if (discipline.winner === 'B') {
        acc.B += 1
      }

      return acc
    },
    { A: 0, B: 0 },
  )
}

export function getPlayerMvpRank(playerId: string, players: Player[]) {
  const ordered = getPlayerLeaderboard(players)
  return ordered.findIndex((player) => player.id === playerId) + 1
}

export function getTeamColors(team: TeamId, theme: { teamA: string; teamB: string }) {
  return team === 'A' ? theme.teamA : theme.teamB
}
