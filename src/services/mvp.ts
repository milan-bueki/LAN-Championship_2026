import type {
  Discipline,
  MatchStats,
  Player,
  StatValue,
  TeamId,
  TournamentState,
} from '../data/tournament'

export interface StatField {
  key: string
  label: string
  type: 'number' | 'text' | 'boolean'
  required: boolean
  step?: number
  min?: number
  max?: number
}

export interface DisciplineMvpResult {
  playerId: string
  playerName: string
  team: TeamId
  score: number | null
  metricScores: Record<string, number | null>
  rank: number | null
  points: number
  complete: boolean
  provisional: boolean
}

export const warcraftMetricOptions = [
  { key: 'unitsKilled', label: 'Units Killed' },
  { key: 'heroesKilled', label: 'Heroes Killed' },
  { key: 'experience', label: 'Experience Gained' },
  { key: 'resourcesCollected', label: 'Resources Collected (Gold + Lumber)' },
  { key: 'buildingsRazed', label: 'Buildings Razed' },
] as const

const integer = (key: string, label: string, required = true): StatField => ({
  key, label, type: 'number', required, step: 1, min: 0,
})
const decimal = (key: string, label: string, required = true): StatField => ({
  key, label, type: 'number', required, step: 0.1, min: 0,
})
const text = (key: string, label: string, required = false): StatField => ({
  key, label, type: 'text', required,
})
const checkbox = (key: string, label: string): StatField => ({
  key, label, type: 'boolean', required: true,
})

export function getDisciplineFields(discipline: Discipline): StatField[] {
  switch (discipline.id) {
    case 'lol':
      return [
        text('champion', 'Champion'),
        integer('kills', 'Kills'),
        integer('deaths', 'Deaths'),
        integer('assists', 'Assists'),
        integer('championDamage', 'Damage to Champions'),
        integer('damageMitigated', 'Damage Mitigated', false),
        integer('healingShielding', 'Healing / Shielding', false),
      ]
    case 'warcraft3':
      return [
        integer('unitsKilled', 'Units Killed'),
        integer('heroesKilled', 'Heroes Killed'),
        integer('experience', 'Experience Gained'),
        integer('gold', 'Gold Collected'),
        integer('lumber', 'Lumber Collected'),
        integer('buildingsRazed', 'Buildings Razed'),
      ]
    case 'peak':
      return [
        integer('highestCheckpoint', 'Highest Checkpoint'),
        checkbox('summitReached', 'Reached Summit'),
      ]
    case 'hood-war':
      return [
        integer('kills', 'Kills'),
        integer('deaths', 'Deaths'),
        integer('ingameScore', 'Ingame Score', false),
      ]
    case 'rocket-league':
      return [
        integer('goals', 'Goals'),
        integer('assists', 'Assists'),
        integer('saves', 'Saves'),
        integer('shots', 'Shots'),
        integer('ingameScore', 'Ingame Score'),
      ]
    default:
      return discipline.metrics.map((label) => decimal(customMetricKey(label), label))
  }
}

export function getDisciplineDetailFields(discipline: Discipline): StatField[] {
  if (discipline.id === 'lol') {
    return [
      integer('durationMinutes', 'Match duration — minutes'),
      { ...integer('durationSeconds', 'Match duration — seconds'), max: 59 },
    ]
  }
  return []
}

export function getTeamStatFields(discipline: Discipline): StatField[] {
  if (discipline.id !== 'peak') return []
  return [
    checkbox('summitReached', 'Team reached summit'),
    integer('expeditionMinutes', 'Expedition time — minutes'),
    { ...integer('expeditionSeconds', 'Expedition time — seconds'), max: 59 },
    integer('highestCheckpoint', 'Team highest checkpoint'),
  ]
}

export function customMetricKey(label: string) {
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `custom-${slug || 'metric'}`
}

export function getMatchCount(discipline: Discipline) {
  return Math.max(1, Math.min(9, discipline.bestOf || 1))
}

export function getPlayedMatchIds(discipline: Discipline, matchStats: MatchStats): string[] {
  const scoreCount = discipline.series.A + discipline.series.B
  const recordedCount = Object.keys(matchStats[discipline.id] ?? {}).reduce((max, id) => {
    const number = Number(id)
    return Number.isInteger(number) && number > max ? number : max
  }, 0)
  const count = Math.min(getMatchCount(discipline), Math.max(1, scoreCount || recordedCount))
  return Array.from({ length: count }, (_, index) => String(index + 1))
}

function isValidValue(value: StatValue | undefined, field: StatField) {
  if (field.type === 'boolean') return typeof value === 'boolean'
  if (field.type === 'text') return !field.required || (typeof value === 'string' && value.trim().length > 0)
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= (field.min ?? 0)
    && (field.step !== 1 || Number.isInteger(value))
    && (field.max === undefined || value <= field.max)
}

function isWarcraftMetricEnabled(discipline: Discipline, key: string) {
  return !discipline.disabledMetrics?.includes(key)
}

export function getMissingDisciplineInputs(discipline: Discipline, players: Player[], state: TournamentState): string[] {
  const missing: string[] = []
  if (discipline.id === 'warcraft3' && metricsFor(discipline).length === 0) {
    missing.push('Enable at least one Warcraft III metric to score the discipline')
  }
  if (discipline.id === 'mystery-game') {
    if (discipline.metrics.length === 0) missing.push('Configure at least one numeric MVP metric for the Mystery Game')
    const totalWeight = discipline.metrics.reduce((sum, label) => sum + Math.max(0, discipline.metricWeights?.[customMetricKey(label)] ?? 1), 0)
    if (discipline.metrics.length > 0 && totalWeight === 0) missing.push('Set a positive weight for at least one Mystery Game metric')
  }
  const fields = getDisciplineFields(discipline).filter((field) => {
    if (discipline.id === 'warcraft3') {
      const metricKey = field.key === 'gold' || field.key === 'lumber'
        ? 'resourcesCollected'
        : field.key === 'experience' ? 'experience' : field.key
      return isWarcraftMetricEnabled(discipline, metricKey)
    }
    return field.required
  })
  const matches = getPlayedMatchIds(discipline, state.matchStats)

  for (const matchId of matches) {
    for (const player of players) {
      const values = state.matchStats[discipline.id]?.[matchId]?.[player.id] ?? {}
      for (const field of fields) {
        if (!isValidValue(values[field.key], field)) {
          missing.push(`Match ${matchId} — ${player.name}: ${field.label}`)
        }
      }
    }

    for (const field of getDisciplineDetailFields(discipline)) {
      const value = state.matchDetails[discipline.id]?.[matchId]?.[field.key]
      if (!isValidValue(value, field)) missing.push(`Match ${matchId}: ${field.label}`)
    }
    if (discipline.id === 'lol') {
      const duration = state.matchDetails.lol?.[matchId]
      const minutes = duration?.durationMinutes
      const seconds = duration?.durationSeconds
      if (typeof minutes === 'number' && typeof seconds === 'number' && minutes + seconds / 60 <= 0) {
        missing.push(`Match ${matchId}: Match duration must be greater than zero`)
      }
    }

    if (discipline.id === 'peak') {
      for (const team of ['A', 'B'] as const) {
        const values = state.teamMatchStats[discipline.id]?.[matchId]?.[team] ?? {}
        for (const field of getTeamStatFields(discipline)) {
          if (!isValidValue(values[field.key], field)) {
            missing.push(`Match ${matchId} — Team ${team}: ${field.label}`)
          }
        }
        if (
          typeof values.expeditionMinutes === 'number'
          && typeof values.expeditionSeconds === 'number'
          && values.expeditionMinutes + values.expeditionSeconds / 60 <= 0
        ) {
          missing.push(`Match ${matchId} — Team ${team}: expedition duration must be greater than zero`)
        }
      }
    }
  }
  if (discipline.id === 'lol') {
    for (const player of players) {
      const hasMitigatedForSeries = matches.every((matchId) => (
        typeof state.matchStats.lol?.[matchId]?.[player.id]?.damageMitigated === 'number'
      ))
      const hasHealingForSeries = matches.every((matchId) => (
        typeof state.matchStats.lol?.[matchId]?.[player.id]?.healingShielding === 'number'
      ))
      if (!hasMitigatedForSeries && !hasHealingForSeries) {
        missing.push(`Match series — ${player.name}: enter Damage Mitigated or Healing / Shielding in every played match`)
      }
    }
  }
  return missing
}

export function isDisciplineDataComplete(discipline: Discipline, players: Player[], state: TournamentState) {
  return getMissingDisciplineInputs(discipline, players, state).length === 0
}

function numberAt(
  stats: MatchStats,
  disciplineId: string,
  matchId: string,
  playerId: string,
  key: string,
): number | undefined {
  const value = stats[disciplineId]?.[matchId]?.[playerId]?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function allMatchIds(discipline: Discipline, state: TournamentState) {
  return getPlayedMatchIds(discipline, state.matchStats)
}

function average(items: number[]) {
  return items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : undefined
}

export function calculateRawDisciplineMetrics(discipline: Discipline, players: Player[], state: TournamentState) {
  const matchIds = allMatchIds(discipline, state)
  const output = new Map<string, Record<string, number | undefined>>()
  for (const player of players) output.set(player.id, {})

  if (discipline.id === 'lol') {
    const completeDuration = matchIds.every((matchId) => (
      typeof state.matchDetails.lol?.[matchId]?.durationMinutes === 'number'
      && typeof state.matchDetails.lol?.[matchId]?.durationSeconds === 'number'
    ))
    const minutes = matchIds.reduce((sum, matchId) => {
      const entry = state.matchDetails.lol?.[matchId]
      const mins = entry?.durationMinutes
      const secs = entry?.durationSeconds
      return sum + (typeof mins === 'number' ? mins : 0) + (typeof secs === 'number' ? secs / 60 : 0)
    }, 0)
    const teamKills = new Map<TeamId, number>([['A', 0], ['B', 0]])
    const teamKillsComplete = new Map<TeamId, boolean>()
    for (const team of ['A', 'B'] as const) {
      teamKillsComplete.set(team, players.filter((player) => player.team === team).every((player) => (
        matchIds.every((matchId) => numberAt(state.matchStats, 'lol', matchId, player.id, 'kills') !== undefined)
      )))
    }
    for (const player of players) {
      const kills = matchIds.reduce((sum, matchId) => sum + (numberAt(state.matchStats, 'lol', matchId, player.id, 'kills') ?? 0), 0)
      teamKills.set(player.team, (teamKills.get(player.team) ?? 0) + kills)
    }
    for (const player of players) {
      const totals = (key: string) => matchIds.reduce((sum, matchId) => sum + (numberAt(state.matchStats, 'lol', matchId, player.id, key) ?? 0), 0)
      const hasEvery = (key: string) => matchIds.every((matchId) => numberAt(state.matchStats, 'lol', matchId, player.id, key) !== undefined)
      const kills = totals('kills')
      const deaths = totals('deaths')
      const assists = totals('assists')
      const mitigated = totals('damageMitigated')
      const healing = totals('healingShielding')
      output.get(player.id)!.kda = ['kills', 'deaths', 'assists'].every(hasEvery)
        ? (kills + assists) / Math.max(1, deaths)
        : undefined
      const teamKillCount = teamKills.get(player.team) ?? 0
      output.get(player.id)!.killParticipation = ['kills', 'assists'].every(hasEvery) && teamKillsComplete.get(player.team)
        ? teamKillCount > 0 ? ((kills + assists) / teamKillCount) * 100 : 0
        : undefined
      output.get(player.id)!.championDamagePerMinute = completeDuration && minutes > 0 && hasEvery('championDamage')
        ? totals('championDamage') / minutes
        : undefined
      output.get(player.id)!.damageMitigatedPerMinute = completeDuration && minutes > 0 && hasEvery('damageMitigated') ? mitigated / minutes : undefined
      output.get(player.id)!.healingShieldingPerMinute = completeDuration && minutes > 0 && hasEvery('healingShielding') ? healing / minutes : undefined
    }
  } else if (discipline.id === 'warcraft3') {
    for (const player of players) {
      const seriesAverage = (key: string) => average(matchIds.flatMap((id) => {
        const value = numberAt(state.matchStats, 'warcraft3', id, player.id, key)
        return value === undefined ? [] : [value]
      }))
      output.get(player.id)!.unitsKilled = seriesAverage('unitsKilled')
      output.get(player.id)!.heroesKilled = seriesAverage('heroesKilled')
      output.get(player.id)!.experienceGained = seriesAverage('experience')
      output.get(player.id)!.resourcesCollected = average(matchIds.flatMap((id) => {
        const gold = numberAt(state.matchStats, 'warcraft3', id, player.id, 'gold')
        const lumber = numberAt(state.matchStats, 'warcraft3', id, player.id, 'lumber')
        return gold === undefined || lumber === undefined ? [] : [gold + lumber]
      }))
      output.get(player.id)!.buildingsRazed = seriesAverage('buildingsRazed')
    }
  } else if (discipline.id === 'peak') {
    for (const player of players) {
      const values = matchIds.map((id) => state.matchStats.peak?.[id]?.[player.id]).filter((item) => item !== undefined)
      const summit = values.some((entry) => entry?.summitReached === true)
      const checkpoints = values.flatMap((entry) => typeof entry?.highestCheckpoint === 'number' ? [entry.highestCheckpoint] : [])
      output.get(player.id)!.peakProgress = summit ? Number.MAX_SAFE_INTEGER : checkpoints.length ? Math.max(...checkpoints) : undefined
    }
  } else if (discipline.id === 'hood-war') {
    for (const player of players) {
      const kills = matchIds.reduce((sum, id) => sum + (numberAt(state.matchStats, 'hood-war', id, player.id, 'kills') ?? 0), 0)
      const deaths = matchIds.reduce((sum, id) => sum + (numberAt(state.matchStats, 'hood-war', id, player.id, 'deaths') ?? 0), 0)
      const completeKills = matchIds.every((id) => numberAt(state.matchStats, 'hood-war', id, player.id, 'kills') !== undefined)
      const completeDeaths = matchIds.every((id) => numberAt(state.matchStats, 'hood-war', id, player.id, 'deaths') !== undefined)
      output.get(player.id)!.kills = average(matchIds.flatMap((id) => {
        const value = numberAt(state.matchStats, 'hood-war', id, player.id, 'kills')
        return value === undefined ? [] : [value]
      }))
      output.get(player.id)!.kdRatio = completeKills && completeDeaths ? kills / Math.max(1, deaths) : undefined
    }
  } else if (discipline.id === 'rocket-league') {
    for (const player of players) {
      for (const key of ['goals', 'assists', 'saves', 'shots', 'ingameScore']) {
        output.get(player.id)![key] = average(matchIds.flatMap((id) => {
          const value = numberAt(state.matchStats, 'rocket-league', id, player.id, key)
          return value === undefined ? [] : [value]
        }))
      }
    }
  } else {
    for (const player of players) {
      for (const field of getDisciplineFields(discipline)) {
        output.get(player.id)![field.key] = average(matchIds.flatMap((id) => {
          const value = numberAt(state.matchStats, discipline.id, id, player.id, field.key)
          return value === undefined ? [] : [value]
        }))
      }
    }
  }
  return output
}

interface ScoredMetric {
  key: string
  weight: number
  lowerIsBetter?: boolean
  source?: (metrics: Record<string, number | undefined>) => number | undefined
}

function metricsFor(discipline: Discipline): ScoredMetric[] {
  switch (discipline.id) {
    case 'lol':
      return [
        { key: 'KDA', weight: 30, source: (m) => m.kda },
        { key: 'Kill Participation', weight: 25, source: (m) => m.killParticipation },
        { key: 'Damage per Minute', weight: 25, source: (m) => m.championDamagePerMinute },
        {
          key: 'Defensive Performance', weight: 20,
          source: (m) => Math.max(m.defensiveMitigatedScore ?? -1, m.defensiveHealingScore ?? -1) < 0
            ? undefined
            : Math.max(m.defensiveMitigatedScore ?? -1, m.defensiveHealingScore ?? -1),
        },
      ]
    case 'warcraft3':
      return ([
        { key: 'Units Killed', weight: 35, source: (m) => m.unitsKilled },
        { key: 'Heroes Killed', weight: 25, source: (m) => m.heroesKilled },
        { key: 'Experience Gained', weight: 20, source: (m) => m.experienceGained },
        { key: 'Resources Collected', weight: 10, source: (m) => m.resourcesCollected },
        { key: 'Buildings Razed', weight: 10, source: (m) => m.buildingsRazed },
      ] as ScoredMetric[]).filter((metric) => {
        const key = ({
        'Units Killed': 'unitsKilled',
        'Heroes Killed': 'heroesKilled',
        'Experience Gained': 'experience',
        'Resources Collected': 'resourcesCollected',
        'Buildings Razed': 'buildingsRazed',
        } as Record<string, string>)[metric.key]
        return isWarcraftMetricEnabled(discipline, key)
      })
    case 'peak':
      return [{ key: 'Peak Progress', weight: 100, source: (m) => m.peakProgress }]
    case 'hood-war':
      return [
        { key: 'Kills', weight: 60, source: (m) => m.kills },
        { key: 'K/D Ratio', weight: 40, source: (m) => m.kdRatio },
      ]
    case 'rocket-league':
      return [
        { key: 'Goals', weight: 30, source: (m) => m.goals },
        { key: 'Assists', weight: 25, source: (m) => m.assists },
        { key: 'Saves', weight: 25, source: (m) => m.saves },
        { key: 'Shots', weight: 10, source: (m) => m.shots },
        { key: 'Ingame Score', weight: 10, source: (m) => m.ingameScore },
      ]
    default:
      return discipline.metrics.map((label) => ({
        key: label,
        weight: Math.max(0, discipline.metricWeights?.[customMetricKey(label)] ?? 1),
        lowerIsBetter: discipline.lowerIsBetterMetrics?.includes(customMetricKey(label)),
        source: (m) => m[customMetricKey(label)],
      }))
  }
}

export function getDisciplineMvpWeights(discipline: Discipline) {
  const metrics = metricsFor(discipline)
  const total = metrics.reduce((sum, metric) => sum + metric.weight, 0)
  return Object.fromEntries(metrics.map((metric) => [
    metric.key,
    total > 0 ? (metric.weight / total) * 100 : 0,
  ]))
}

function normalize(values: Array<number | undefined>, lowerIsBetter = false) {
  const defined = values.filter((value): value is number => value !== undefined && Number.isFinite(value))
  if (!defined.length) return values.map(() => null)
  const min = Math.min(...defined)
  const max = Math.max(...defined)
  return values.map((value) => {
    if (value === undefined || !Number.isFinite(value)) return null
    if (min === max) return 100
    return lowerIsBetter
      ? (100 * (max - value)) / (max - min)
      : (100 * (value - min)) / (max - min)
  })
}

export function calculateDisciplineMvp(discipline: Discipline, players: Player[], state: TournamentState): DisciplineMvpResult[] {
  const rawMetrics = calculateRawDisciplineMetrics(discipline, players, state)
  const metrics = metricsFor(discipline)
  const normalizedByMetric = new Map<string, Array<number | null>>()

  if (discipline.id === 'lol') {
    const mitigated = normalize(players.map((player) => rawMetrics.get(player.id)?.damageMitigatedPerMinute))
    const healing = normalize(players.map((player) => rawMetrics.get(player.id)?.healingShieldingPerMinute))
    players.forEach((player, index) => {
      const raw = rawMetrics.get(player.id)!
      raw.defensiveMitigatedScore = mitigated[index] ?? undefined
      raw.defensiveHealingScore = healing[index] ?? undefined
    })
  }

  for (const metric of metrics) {
    const values = players.map((player) => metric.source?.(rawMetrics.get(player.id) ?? {}))
    if (discipline.id === 'lol' && metric.key === 'Defensive Performance') {
      normalizedByMetric.set(metric.key, players.map((player) => {
        const raw = rawMetrics.get(player.id)
        const scores = [raw?.defensiveMitigatedScore, raw?.defensiveHealingScore]
          .filter((value): value is number => value !== undefined)
        return scores.length ? Math.max(...scores) : null
      }))
    } else {
      normalizedByMetric.set(metric.key, normalize(values, metric.lowerIsBetter))
    }
  }

  const complete = isDisciplineDataComplete(discipline, players, state)
  const results: DisciplineMvpResult[] = players.map((player, index) => {
    const metricScores: Record<string, number | null> = {}
    let weighted = 0
    let availableWeight = 0
    for (const metric of metrics) {
      const score = normalizedByMetric.get(metric.key)?.[index] ?? null
      metricScores[metric.key] = score
      if (score !== null && metric.weight > 0) {
        weighted += score * metric.weight
        availableWeight += metric.weight
      }
    }
    return {
      playerId: player.id,
      playerName: player.name,
      team: player.team,
      score: availableWeight ? weighted / availableWeight : null,
      metricScores,
      rank: null,
      points: 0,
      complete,
      provisional: !discipline.completed || !complete,
    }
  })

  const scored = results.filter((result): result is DisciplineMvpResult & { score: number } => result.score !== null)
    .sort((left, right) => (right.score - left.score) || left.playerId.localeCompare(right.playerId))
  const placementPoints = [8, 7, 6, 5, 4, 3, 2, 1]
  let cursor = 0
  while (cursor < scored.length) {
    let nextCursor = cursor + 1
    while (nextCursor < scored.length && Math.abs(scored[nextCursor].score - scored[cursor].score) < 0.0001) nextCursor += 1
    const groupSize = nextCursor - cursor
    const groupPoints = placementPoints.slice(cursor, nextCursor).reduce((sum, value) => sum + value, 0) / groupSize
    for (let index = cursor; index < nextCursor; index += 1) {
      scored[index].rank = cursor + 1
      if (complete && discipline.completed) scored[index].points = Number(groupPoints.toFixed(2))
    }
    cursor = nextCursor
  }
  return results.map((result) => scored.find((entry) => entry.playerId === result.playerId) ?? result)
}

export function calculateMvpLeaderBoard(players: Player[], disciplines: Discipline[], state: TournamentState) {
  const pointsByPlayer = new Map(players.map((player) => [player.id, 0]))
  const breakdownByPlayer = new Map(players.map((player) => [player.id, [] as Array<{ disciplineId: string; points: number; score: number | null; complete: boolean } >]))
  for (const discipline of disciplines.filter((item) => item.active)) {
    const results = calculateDisciplineMvp(discipline, players, state)
    for (const result of results) {
      pointsByPlayer.set(result.playerId, (pointsByPlayer.get(result.playerId) ?? 0) + result.points)
      breakdownByPlayer.get(result.playerId)?.push({
        disciplineId: discipline.id,
        points: result.points,
        score: result.score,
        complete: result.complete,
      })
    }
  }
  return [...players].map((player) => ({
    ...player,
    mvpPoints: pointsByPlayer.get(player.id) ?? 0,
    breakdown: breakdownByPlayer.get(player.id) ?? [],
  })).sort((left, right) => right.mvpPoints - left.mvpPoints || left.id.localeCompare(right.id))
}

export function getPlayerMvpBreakdown(playerId: string, disciplines: Discipline[], players: Player[], state: TournamentState) {
  return disciplines.filter((discipline) => discipline.active).map((discipline) => {
    const result = calculateDisciplineMvp(discipline, players, state).find((entry) => entry.playerId === playerId)
    return {
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      points: result?.points ?? 0,
      score: result?.score ?? null,
      complete: result?.complete ?? false,
      provisional: result?.provisional ?? true,
      metricScores: result?.metricScores ?? {},
      metricWeights: getDisciplineMvpWeights(discipline),
    }
  })
}

export function derivePlayerSummaries(players: Player[], disciplines: Discipline[], state: TournamentState) {
  const leaderboard = calculateMvpLeaderBoard(players, disciplines, state)
  return players.map((player) => {
    const row = leaderboard.find((entry) => entry.id === player.id)
    const gamesPlayed = Object.values(state.matchStats).reduce((total, matches) => (
      total + Object.values(matches).filter((byPlayer) => Object.keys(byPlayer[player.id] ?? {}).length > 0).length
    ), 0)
    return {
      ...player,
      mvpPoints: row?.mvpPoints ?? 0,
      gamesPlayed,
      disciplinesWon: disciplines.filter((discipline) => discipline.completed && discipline.winner === player.team).length,
    }
  })
}

export function withDerivedPlayerData(state: TournamentState): TournamentState {
  return { ...state, players: derivePlayerSummaries(state.players, state.disciplines, state) }
}

export function setMatchValue(
  state: TournamentState,
  disciplineId: string,
  matchId: string,
  playerId: string,
  key: string,
  value: StatValue | undefined,
): TournamentState {
  const nextMatch = { ...(state.matchStats[disciplineId]?.[matchId] ?? {}) }
  const nextPlayer = { ...(nextMatch[playerId] ?? {}) }
  if (value === undefined || value === '') delete nextPlayer[key]
  else nextPlayer[key] = value
  nextMatch[playerId] = nextPlayer
  return {
    ...state,
    matchStats: {
      ...state.matchStats,
      [disciplineId]: {
        ...(state.matchStats[disciplineId] ?? {}),
        [matchId]: nextMatch,
      },
    },
  }
}

export function setMatchDetailValue(
  state: TournamentState,
  disciplineId: string,
  matchId: string,
  key: string,
  value: StatValue | undefined,
): TournamentState {
  const nextMatch = { ...(state.matchDetails[disciplineId]?.[matchId] ?? {}) }
  if (value === undefined || value === '') delete nextMatch[key]
  else nextMatch[key] = value
  return {
    ...state,
    matchDetails: {
      ...state.matchDetails,
      [disciplineId]: {
        ...(state.matchDetails[disciplineId] ?? {}),
        [matchId]: nextMatch,
      },
    },
  }
}

export function setTeamMatchValue(
  state: TournamentState,
  disciplineId: string,
  matchId: string,
  team: TeamId,
  key: string,
  value: StatValue | undefined,
): TournamentState {
  const byTeam = { ...(state.teamMatchStats[disciplineId]?.[matchId] ?? { A: {}, B: {} }) }
  const teamValues = { ...(byTeam[team] ?? {}) }
  if (value === undefined || value === '') delete teamValues[key]
  else teamValues[key] = value
  byTeam[team] = teamValues
  return {
    ...state,
    teamMatchStats: {
      ...state.teamMatchStats,
      [disciplineId]: {
        ...(state.teamMatchStats[disciplineId] ?? {}),
        [matchId]: byTeam,
      },
    },
  }
}

export function getMatchEntry(state: TournamentState, disciplineId: string, matchId: string, playerId: string) {
  return state.matchStats[disciplineId]?.[matchId]?.[playerId] ?? {}
}

export function statDisplayValue(value: StatValue | undefined) {
  if (value === undefined || value === null || value === '') return ''
  return String(value)
}

export function readNumber(value: string, integerOnly = false, max?: number) {
  if (value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number)
    && number >= 0
    && (!integerOnly || Number.isInteger(number))
    && (max === undefined || number <= max)
    ? number
    : undefined
}

export function getPeakTeamValues(state: TournamentState, matchId: string, team: TeamId) {
  return state.teamMatchStats.peak?.[matchId]?.[team] ?? {}
}

export function getOptionalWarcraftFields(discipline: Discipline) {
  return getDisciplineFields(discipline).filter((field) => field.key !== 'gold' && field.key !== 'lumber')
}
