import { useEffect, useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import { ArrowRight, BarChart3, Flame, Gamepad2, Settings, ShieldCheck, Star, Swords, Trophy, Users } from 'lucide-react'
import { NavLink, Route, Routes, useParams } from 'react-router-dom'
import { ResponsiveContainer, Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { teams, type Discipline, type Player, type StatValue, type TeamId, type TournamentState } from './data/tournament'
import { loadTournament, normalizeTournamentData, saveTournament } from './services/storage'
import { getChampionshipState, getDisciplineState, getDisciplineWinner, requiredWins, updateDisciplineSeries } from './services/scoring'
import { getPlayerLeaderboard, getPlayerMvpRank, getPlayerStats, getTeamColors, getTeamSummary } from './services/statistics'
import {
  calculateDisciplineMvp,
  customMetricKey,
  getDisciplineDetailFields,
  getDisciplineFields as getStatFields,
  getMatchCount,
  getDisciplineMvpWeights,
  getMissingDisciplineInputs,
  getPeakTeamValues,
  getPlayerMvpBreakdown,
  getTeamStatFields,
  isDisciplineDataComplete,
  readNumber,
  setMatchDetailValue,
  setMatchValue,
  setTeamMatchValue,
  statDisplayValue,
  withDerivedPlayerData,
  warcraftMetricOptions,
} from './services/mvp'

const navItems = [
  { to: '/', label: 'Overview', icon: Trophy },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/players', label: 'Players', icon: BarChart3 },
  { to: '/stats', label: 'Stats', icon: Star },
  { to: '/admin', label: 'Admin', icon: Settings },
]

function App() {
  const [tournament, setTournament] = useState<TournamentState>(() => loadTournament())
  const displayTournament = useMemo(() => withDerivedPlayerData(tournament), [tournament])

  useEffect(() => {
    saveTournament(tournament)
  }, [tournament])

  const championshipState = useMemo(
    () => getChampionshipState(tournament.disciplines),
    [tournament.disciplines],
  )

  const teamWins = useMemo(() => getTeamSummary(tournament.disciplines), [tournament.disciplines])

  const activeDisciplines = tournament.disciplines.filter((discipline) => discipline.active)

  const updateDisciplineSeriesValue = (disciplineId: string, team: TeamId, change: number) => {
    setTournament((previous) => ({
      ...previous,
      disciplines: previous.disciplines.map((discipline) => {
        if (discipline.id !== disciplineId || !discipline.active) {
          return discipline
        }

        const next = updateDisciplineSeries(discipline, team, change)
        return { ...next, winner: getDisciplineWinner(next) }
      }),
    }))
  }

  const setMysteryGameDetails = (field: 'name' | 'description' | 'mode' | 'active', value: string | boolean) => {
    setTournament((previous) => ({
      ...previous,
      disciplines: previous.disciplines.map((discipline) => {
        if (discipline.id !== 'mystery-game') {
          return discipline
        }

        return { ...discipline, [field]: value }
      }),
    }))
  }

  const updatePlayerMatchValue = (disciplineId: string, matchId: string, playerId: string, key: string, value: StatValue | undefined) => {
    setTournament((previous) => setMatchValue(previous, disciplineId, matchId, playerId, key, value))
  }

  const updateMatchDetail = (disciplineId: string, matchId: string, key: string, value: StatValue | undefined) => {
    setTournament((previous) => setMatchDetailValue(previous, disciplineId, matchId, key, value))
  }

  const updateTeamMatchValue = (disciplineId: string, matchId: string, team: TeamId, key: string, value: StatValue | undefined) => {
    setTournament((previous) => setTeamMatchValue(previous, disciplineId, matchId, team, key, value))
  }

  const toggleDisciplineMetric = (disciplineId: string, metric: string) => {
    setTournament((previous) => ({
      ...previous,
      disciplines: previous.disciplines.map((discipline) => {
        if (discipline.id !== disciplineId) return discipline
        const disabled = new Set(discipline.disabledMetrics ?? [])
        if (disabled.has(metric)) disabled.delete(metric)
        else disabled.add(metric)
        return { ...discipline, disabledMetrics: [...disabled] }
      }),
    }))
  }

  const setMysteryMetrics = (metrics: string[]) => {
    const seen = new Set<string>()
    const uniqueMetrics = metrics.filter((metric) => {
      const key = customMetricKey(metric)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setTournament((previous) => ({
      ...previous,
      disciplines: previous.disciplines.map((discipline) => discipline.id === 'mystery-game'
        ? {
          ...discipline,
          metrics: uniqueMetrics,
          metricWeights: Object.fromEntries(uniqueMetrics.map((metric) => [
            customMetricKey(metric),
            discipline.metricWeights?.[customMetricKey(metric)] ?? 1,
          ])),
        }
        : discipline),
    }))
  }

  const setMysteryMetricWeight = (metricKey: string, weight: number) => {
    setTournament((previous) => ({
      ...previous,
      disciplines: previous.disciplines.map((discipline) => discipline.id === 'mystery-game'
        ? { ...discipline, metricWeights: { ...discipline.metricWeights, [metricKey]: weight } }
        : discipline),
    }))
  }

  const setMysteryMetricDirection = (metricKey: string, lowerIsBetter: boolean) => {
    setTournament((previous) => ({
      ...previous,
      disciplines: previous.disciplines.map((discipline) => {
        if (discipline.id !== 'mystery-game') return discipline
        const directions = new Set(discipline.lowerIsBetterMetrics ?? [])
        if (lowerIsBetter) directions.add(metricKey)
        else directions.delete(metricKey)
        return { ...discipline, lowerIsBetterMetrics: [...directions] }
      }),
    }))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mb-6 rounded-2xl border border-slate-800/90 bg-slate-950/85 px-4 py-4 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-teamA to-teamB p-2.5">
                <Gamepad2 className="h-6 w-6 text-slate-950" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Private LAN</p>
                <h1 className="text-xl font-black tracking-tight text-white">LAN Championship 2026</h1>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                      isActive
                        ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200'
                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<OverviewPage championshipState={championshipState} teamWins={teamWins} tournament={displayTournament} activeDisciplines={activeDisciplines} updateDisciplineSeriesValue={updateDisciplineSeriesValue} />} />
            <Route path="/teams" element={<TeamsPage tournament={displayTournament} />} />
            <Route path="/players" element={<PlayersPage players={displayTournament.players} />} />
            <Route path="/players/:playerId" element={<PlayerDetailPage tournament={displayTournament} />} />
            <Route path="/stats" element={<StatsPage
              tournament={tournament}
              onPlayerValueChange={updatePlayerMatchValue}
              onMatchDetailChange={updateMatchDetail}
              onTeamValueChange={updateTeamMatchValue}
              onDisableMetric={toggleDisciplineMetric}
            />} />
            <Route path="/admin" element={<AdminPage
              tournament={tournament}
              setMysteryGameDetails={setMysteryGameDetails}
              setMysteryMetrics={setMysteryMetrics}
              setMysteryMetricWeight={setMysteryMetricWeight}
              setMysteryMetricDirection={setMysteryMetricDirection}
              setTournament={setTournament}
            />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function OverviewPage({ championshipState, teamWins, tournament, activeDisciplines, updateDisciplineSeriesValue }: {
  championshipState: ReturnType<typeof getChampionshipState>
  teamWins: { A: number; B: number }
  tournament: TournamentState
  activeDisciplines: Discipline[]
  updateDisciplineSeriesValue: (disciplineId: string, team: TeamId, change: number) => void
}) {
  const totalDisciplineWinsA = teamWins.A
  const totalDisciplineWinsB = teamWins.B
  const details = [{ label: 'Disziplinen', value: String(activeDisciplines.length) }, { label: 'Siegpunkte', value: `${totalDisciplineWinsA}:${totalDisciplineWinsB}` }, { label: 'Status', value: championshipState.label }]

  return (
    <>
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-glow">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Championship overview</p>
              <h2 className="mt-2 text-3xl font-black text-white">Tournament board</h2>
            </div>
            <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
              {championshipState.label}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {details.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-3 text-2xl font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(['A', 'B'] as TeamId[]).map((team) => (
              <div key={team} className="rounded-2xl border border-slate-800 p-4" style={{ background: `linear-gradient(135deg, ${team === 'A' ? tournament.theme.teamA : tournament.theme.teamB}22, rgba(15,23,42,0.9))` }}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{team === 'A' ? 'Team A' : 'Team B'}</p>
                    <h3 className="mt-1 text-xl font-bold text-white">{team === 'A' ? teams.A.name : teams.B.name}</h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-xl font-black" style={{ backgroundColor: `${team === 'A' ? tournament.theme.teamA : tournament.theme.teamB}33`, color: team === 'A' ? tournament.theme.teamA : tournament.theme.teamB }}>
                    {teamWins[team]}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <ShieldCheck className="h-4 w-4" />
                  {team === 'A' ? 'JaySóns Feggit Bande' : 'Markings Coole Buben Truppe'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">MVP race</p>
          <div className="mt-5 space-y-4">
            {getPlayerLeaderboard(tournament.players).slice(0, 4).map((player, index) => (
              <div key={player.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-300">#{index + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">{player.name}</span>
                    <span className="text-sm text-amber-300">{player.mvpPoints} pts</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    {player.team === 'A' ? 'Team A' : 'Team B'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {activeDisciplines.map((discipline) => {
          const seriesWinner = getDisciplineWinner(discipline)
          const status = getDisciplineState(discipline)
          const required = requiredWins(discipline.bestOf)

          return (
            <article key={discipline.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-slate-700 bg-slate-950 p-2">
                      <Swords className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{discipline.mode}</p>
                      <h3 className="text-2xl font-black text-white">{discipline.name}</h3>
                    </div>
                  </div>
                  <p className="max-w-2xl text-sm text-slate-400">{discipline.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-300">{status}</span>
                  {seriesWinner && (
                    <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ borderColor: `${seriesWinner === 'A' ? tournament.theme.teamA : tournament.theme.teamB}55`, color: seriesWinner === 'A' ? tournament.theme.teamA : tournament.theme.teamB }}>
                      Winner: {seriesWinner === 'A' ? 'Team A' : 'Team B'}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Series</p>
                    <div className="mt-2 flex items-center gap-3 text-3xl font-black text-white">
                      <span style={{ color: tournament.theme.teamA }}>{discipline.series.A}</span>
                      <span className="text-slate-500">:</span>
                      <span style={{ color: tournament.theme.teamB }}>{discipline.series.B}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateDisciplineSeriesValue(discipline.id, 'A', -1)} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500">
                      -1 Team A
                    </button>
                    <button type="button" onClick={() => updateDisciplineSeriesValue(discipline.id, 'A', 1)} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500">
                      +1 Team A
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateDisciplineSeriesValue(discipline.id, 'B', -1)} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500">
                      -1 Team B
                    </button>
                    <button type="button" onClick={() => updateDisciplineSeriesValue(discipline.id, 'B', 1)} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500">
                      +1 Team B
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Required wins</p>
                  <p className="mt-2 text-2xl font-black text-white">{required}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">MVP points available</p>
                  <p className="mt-2 text-2xl font-black text-white">{discipline.completed ? '8 max' : 'Provisional'}</p>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Flame className="h-5 w-5 text-orange-400" />
            <h3 className="text-xl font-black text-white">Flammkuchen Tiebreak</h3>
          </div>

          <div className={`rounded-2xl border p-4 ${tournament.tiebreakLocked ? 'border-slate-700 bg-slate-950/60 text-slate-400' : 'border-amber-500/40 bg-amber-500/10 text-amber-100'}`}>
            <p className="text-xs uppercase tracking-[0.25em]">{tournament.tiebreakLocked ? 'Locked' : 'Unlocked'}</p>
            <p className="mt-2 text-lg font-semibold">{tournament.tiebreakLocked ? 'Tiebreak unavailable until all active disciplines are resolved.' : 'Admin can select the winning side for the final tiebreak.'}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-cyan-300" />
            <h3 className="text-xl font-black text-white">Discipline momentum</h3>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeDisciplines.map((discipline) => ({ name: discipline.name, TeamA: discipline.series.A, TeamB: discipline.series.B })) }>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="TeamA" stroke={tournament.theme.teamA} strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="TeamB" stroke={tournament.theme.teamB} strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </>
  )
}

function TeamsPage({ tournament }: { tournament: TournamentState }) {
  const standings = ['A', 'B'] as TeamId[]

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Team standings</p>
        <h2 className="mt-2 text-3xl font-black text-white">Championship table</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {standings.map((team) => {
          const playersForTeam = tournament.players.filter((player) => player.team === team)
          const teamColor = getTeamColors(team, tournament.theme)
          const totalWins = getTeamSummary(tournament.disciplines)[team]

          return (
            <div key={team} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">{team === 'A' ? 'Team A' : 'Team B'}</p>
                  <h3 className="mt-2 text-2xl font-black text-white" style={{ color: teamColor }}>{team === 'A' ? teams.A.name : teams.B.name}</h3>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-lg font-black text-white">{totalWins}</div>
              </div>

              <div className="space-y-3">
                {playersForTeam.map((player) => (
                  <div key={player.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div>
                      <p className="font-semibold text-white">{player.name}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{player.disciplinesWon} disciplines won</p>
                    </div>
                    <NavLink to={`/players/${player.id}`} className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white">
                      Profile <ArrowRight className="h-3.5 w-3.5" />
                    </NavLink>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function PlayersPage({ players }: { players: Player[] }) {
  const leaderboard = getPlayerLeaderboard(players)

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ranking</p>
        <h2 className="mt-2 text-3xl font-black text-white">MVP leaderboard</h2>
      </div>

      <div className="space-y-3">
        {leaderboard.map((player, index) => (
          <div key={player.id} className="flex items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-lg font-black text-amber-300">#{index + 1}</div>
            <div className="flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{player.name}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{player.team === 'A' ? teams.A.name : teams.B.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">{player.mvpPoints} points</span>
                  <NavLink to={`/players/${player.id}`} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white">
                    Open profile
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PlayerDetailPage({ tournament }: { tournament: TournamentState }) {
  const { playerId } = useParams()
  const player = tournament.players.find((entry) => entry.id === playerId)

  if (!player) {
    return <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white">Player not found.</div>
  }

  const stats = getPlayerStats(player, tournament.disciplines)
  const rank = getPlayerMvpRank(player.id, tournament.players)
  const breakdown = getPlayerMvpBreakdown(player.id, tournament.disciplines, tournament.players, tournament)

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Player profile</p>
            <h2 className="mt-2 text-3xl font-black text-white">{player.name}</h2>
            <p className="mt-2 text-slate-300">{player.team === 'A' ? teams.A.name : teams.B.name}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200">
            <div className="text-[10px] uppercase tracking-[0.2em]">MVP rank</div>
            <div className="text-3xl font-black">#{rank}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Matches played', value: stats.totalMatches },
          { label: 'Disciplines won', value: stats.disciplinesWon },
          { label: 'MVP Points', value: stats.mvpPoints },
          { label: 'Team', value: player.team === 'A' ? 'Team A' : 'Team B' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-cyan-300" />
            <h3 className="text-xl font-black text-white">Match history</h3>
          </div>

          <div className="space-y-3">
            {stats.matchHistory.map((match) => (
              <div key={match.name} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div>
                  <p className="font-semibold text-white">{match.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{match.result}</p>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-semibold text-slate-200">{match.score}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-amber-300" />
            <h3 className="text-xl font-black text-white">MVP score breakdown</h3>
          </div>

          <div className="space-y-3">
            {breakdown.map((entry) => {
              const value = entry.score ?? 0
              return (
                <div key={entry.disciplineId} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                    <span>{entry.disciplineName}</span>
                    <span>{entry.points ? `${entry.points} MVP pts` : entry.score === null ? 'No data' : 'Provisional'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-400" style={{ width: `${Math.min(100, value)}%` }} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                    {Object.entries(entry.metricScores).map(([metric, score]) => (
                      <p key={metric} className="flex justify-between gap-2 text-[11px] text-slate-400">
                        <span>{metric} ({entry.metricWeights[metric]?.toFixed(0) ?? 0}%)</span><span>{score === null ? '—' : `${score.toFixed(1)}%`}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-cyan-300" />
              <h3 className="text-xl font-black text-white">Recorded match stats</h3>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {tournament.disciplines.filter((discipline) => discipline.active).map((discipline) => {
                const matches = tournament.matchStats[discipline.id] ?? {}
                const fields = getStatFields(discipline)
                const entries = Object.entries(matches).filter(([, byPlayer]) => byPlayer[player.id])
                return (
                  <div key={discipline.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <h4 className="mb-2 font-semibold text-white">{discipline.name}</h4>
                    {entries.length === 0 ? <p className="text-xs text-slate-500">No match stats entered.</p> : (
                      <div className="space-y-2">
                        {entries.map(([matchId, byPlayer]) => (
                          <div key={matchId} className="border-t border-slate-800 pt-2">
                            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">Match {matchId}</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {fields.map((field) => {
                                const value = byPlayer[player.id][field.key]
                                if (value === undefined || value === '') return null
                                return <p key={field.key} className="flex justify-between gap-2 text-xs text-slate-400"><span>{field.label}</span><span className="text-slate-200">{String(value)}</span></p>
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
        </div>
      </div>
    </section>
  )
}

function StatsPage({
  tournament,
  onPlayerValueChange,
  onMatchDetailChange,
  onTeamValueChange,
  onDisableMetric,
}: {
  tournament: TournamentState
  onPlayerValueChange: (disciplineId: string, matchId: string, playerId: string, key: string, value: StatValue | undefined) => void
  onMatchDetailChange: (disciplineId: string, matchId: string, key: string, value: StatValue | undefined) => void
  onTeamValueChange: (disciplineId: string, matchId: string, team: TeamId, key: string, value: StatValue | undefined) => void
  onDisableMetric: (disciplineId: string, metric: string) => void
}) {
  const disciplines = tournament.disciplines.filter((discipline) => discipline.active)
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({})

  const exportCsv = () => {
    const rows: string[][] = [['Discipline', 'Match', 'Team', 'Player', 'Statistic', 'Value']]
    for (const discipline of tournament.disciplines) {
      for (const [matchId, playersById] of Object.entries(tournament.matchStats[discipline.id] ?? {})) {
        for (const [playerId, values] of Object.entries(playersById)) {
          const player = tournament.players.find((entry) => entry.id === playerId)
          for (const [key, value] of Object.entries(values)) {
            rows.push([discipline.name, matchId, player?.team ?? '', player?.name ?? playerId, key, String(value)])
          }
        }
      }
      for (const [matchId, values] of Object.entries(tournament.matchDetails[discipline.id] ?? {})) {
        for (const [key, value] of Object.entries(values)) rows.push([discipline.name, matchId, '', '', key, String(value)])
      }
      for (const [matchId, teamValues] of Object.entries(tournament.teamMatchStats[discipline.id] ?? {})) {
        for (const team of ['A', 'B'] as const) {
          for (const [key, value] of Object.entries(teamValues[team] ?? {})) {
            rows.push([discipline.name, matchId, team, '', key, String(value)])
          }
        }
      }
    }
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = 'lan-championship-2026-stats.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Match-by-match MVP input</p>
          <h2 className="mt-2 text-3xl font-black text-white">Player statistics</h2>
        </div>
        <button type="button" onClick={exportCsv} className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20">
          Export CSV
        </button>
      </div>

      {disciplines.map((discipline) => {
        const matchCount = getMatchCount(discipline)
        const matchId = selectedMatches[discipline.id] ?? '1'
        const fields = getStatFields(discipline).filter((field) => {
          if (discipline.id !== 'warcraft3') return !discipline.disabledMetrics?.includes(field.key)
          const metricKey = field.key === 'gold' || field.key === 'lumber'
            ? 'resourcesCollected'
            : field.key === 'experience' ? 'experience' : field.key
          return !discipline.disabledMetrics?.includes(metricKey)
        })
        const detailFields = getDisciplineDetailFields(discipline)
        const teamFields = getTeamStatFields(discipline)
        const scores = calculateDisciplineMvp(discipline, tournament.players, tournament)
        const complete = isDisciplineDataComplete(discipline, tournament.players, tournament)
        const missing = getMissingDisciplineInputs(discipline, tournament.players, tournament)
        const playerColumns = `minmax(150px,1.3fr) repeat(${fields.length},minmax(120px,1fr)) minmax(130px,0.8fr)`

        return (
          <div key={discipline.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{discipline.mode}</p>
                <h3 className="text-2xl font-black text-white">{discipline.name}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  Match
                  <select
                    value={matchId}
                    onChange={(event) => setSelectedMatches((previous) => ({ ...previous, [discipline.id]: event.target.value }))}
                    className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    {Array.from({ length: matchCount }, (_, index) => String(index + 1)).map((id) => <option key={id} value={id}>Match {id}</option>)}
                  </select>
                </label>
                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${complete ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-orange-500/40 bg-orange-500/10 text-orange-200'}`}>
                  {complete ? 'Inputs complete' : `${missing.length} missing`}
                </span>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">
                  {discipline.completed && complete ? 'MVP points final' : 'Provisional'}
                </span>
              </div>
            </div>

            {detailFields.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                {detailFields.map((field) => (
                  <label key={field.key} className="text-xs text-slate-400">
                    <span className="mb-1 block">{field.label}</span>
                    <input
                      type="number"
                      min={field.min}
                      step={field.step}
                      value={statDisplayValue(tournament.matchDetails[discipline.id]?.[matchId]?.[field.key])}
                      max={field.max}
                      onChange={(event) => onMatchDetailChange(discipline.id, matchId, field.key, readNumber(event.target.value, field.step === 1, field.max))}
                      className="w-40 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </label>
                ))}
                <p className="self-end pb-2 text-xs text-slate-500">Enter match duration once for all players.</p>
              </div>
            )}

            {discipline.id === 'peak' && (
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                {(['A', 'B'] as TeamId[]).map((team) => (
                  <div key={team} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <h4 className="mb-3 font-semibold text-white">Team {team} expedition</h4>
                    <div className="flex flex-wrap gap-3">
                      {teamFields.map((field) => (
                        <StatInput
                          key={field.key}
                          field={field}
                          value={getPeakTeamValues(tournament, matchId, team)[field.key]}
                          onChange={(value) => onTeamValueChange(discipline.id, matchId, team, field.key, value)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <div className="min-w-[900px] space-y-2">
                <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-2 text-xs uppercase tracking-[0.16em] text-slate-400" style={{ gridTemplateColumns: playerColumns }}>
                  <span>Player</span>
                  {fields.map((field) => <span key={field.key}>{field.label}</span>)}
                  <span>Weighted score / MVP</span>
                </div>

                {tournament.players.map((player) => {
                  const current = tournament.matchStats[discipline.id]?.[matchId]?.[player.id] ?? {}
                  const entry = scores.find((score) => score.playerId === player.id)

                  return (
                    <div key={player.id} className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-2" style={{ gridTemplateColumns: playerColumns }}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{player.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Team {player.team}</p>
                        </div>
                      </div>

                      {fields.map((field) => (
                        <StatInput
                          key={`${player.id}-${field.key}`}
                          field={field}
                          value={current[field.key]}
                          onChange={(value) => onPlayerValueChange(discipline.id, matchId, player.id, field.key, value)}
                        />
                      ))}
                      <div className="flex flex-col justify-center rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-amber-200">
                        <span>{entry?.score === null || !entry ? '—' : `${entry.score.toFixed(1)} / 100`}</span>
                        <span className="text-[10px] text-slate-400">{entry?.points ? `${entry.points} MVP points` : 'provisional'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {!complete && (
              <details className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3">
                <summary className="cursor-pointer text-sm font-medium text-orange-200">Missing entries (show up to 12)</summary>
                <ul className="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
                  {missing.slice(0, 12).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </details>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {scores.map((entry) => (
                <div key={entry.playerId} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">{entry.playerName}</span>
                    <span className="text-xs text-amber-200">{entry.points ? `${entry.points} MVP pts` : entry.score === null ? 'No score' : `${entry.score.toFixed(1)} provisional`}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {Object.entries(entry.metricScores).map(([name, value]) => (
                      <p key={name} className="flex justify-between gap-2 text-[11px] text-slate-400">
                        <span>{name} ({getDisciplineMvpWeights(discipline)[name]?.toFixed(0) ?? 0}%)</span><span>{value === null ? '—' : `${value.toFixed(1)}%`}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {discipline.id === 'warcraft3' && (
              <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
                {warcraftMetricOptions.map((metric) => (
                  <label key={metric.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!discipline.disabledMetrics?.includes(metric.key)}
                      onChange={() => onDisableMetric(discipline.id, metric.key)}
                      className="accent-cyan-400"
                    />
                    Score {metric.label}
                  </label>
                ))}
                <span>Disable metrics not displayed by your Warcraft III version.</span>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}

function StatInput({ field, value, onChange }: {
  field: { key: string; label: string; type: 'number' | 'text' | 'boolean'; required: boolean; step?: number; min?: number; max?: number }
  value: StatValue | undefined
  onChange: (value: StatValue | undefined) => void
}) {
  if (field.type === 'boolean') {
    return (
      <label className="block min-w-32">
        <span className="mb-1 block text-[10px] text-slate-500">{field.label}</span>
        <select
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value === 'true')}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
          aria-label={field.label}
        >
          <option value="">Select…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    )
  }
  return (
    <label className="block">
      {field.type === 'text' && <span className="mb-1 block text-[10px] text-slate-500">{field.label}</span>}
      <input
        type={field.type}
        min={field.min}
        max={field.max}
        step={field.step}
        required={field.required}
        value={statDisplayValue(value)}
        onChange={(event) => onChange(field.type === 'number' ? readNumber(event.target.value, field.step === 1, field.max) : event.target.value || undefined)}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white outline-none"
        aria-label={field.label}
        placeholder={field.type === 'text' ? field.label : undefined}
      />
    </label>
  )
}

function AdminPage({
  tournament,
  setMysteryGameDetails,
  setMysteryMetrics,
  setMysteryMetricWeight,
  setMysteryMetricDirection,
  setTournament,
}: {
  tournament: TournamentState
  setMysteryGameDetails: (field: 'name' | 'description' | 'mode' | 'active', value: string | boolean) => void
  setMysteryMetrics: (metrics: string[]) => void
  setMysteryMetricWeight: (metricKey: string, weight: number) => void
  setMysteryMetricDirection: (metricKey: string, lowerIsBetter: boolean) => void
  setTournament: Dispatch<SetStateAction<TournamentState>>
}) {
  const mystery = tournament.disciplines.find((discipline) => discipline.id === 'mystery-game')

  if (!mystery) {
    return null
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ ...tournament, version: 2 }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lan-championship-2026-export.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result ?? ''))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('The selected file does not contain a tournament JSON object.')
        }
        setTournament(normalizeTournamentData(parsed as Partial<TournamentState>))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown import error.'
        window.alert(`Import failed: ${message}`)
      }
    }
    reader.onerror = () => window.alert('Import failed: the selected file could not be read.')
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin controls</p>
        <h2 className="mt-2 text-3xl font-black text-white">Tournament configuration</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Settings className="h-5 w-5 text-cyan-300" />
            <h3 className="text-xl font-black text-white">Theme</h3>
          </div>

          <div className="space-y-4">
            {(['teamA', 'teamB', 'accent'] as const).map((key) => (
              <label key={key} className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">{key === 'teamA' ? 'Team A color' : key === 'teamB' ? 'Team B color' : 'MVP accent'}</span>
                <input
                  type="color"
                  value={tournament.theme[key]}
                  onChange={(event) => {
                    setTournament((previous) => ({
                      ...previous,
                      theme: {
                        ...previous.theme,
                        [key]: event.target.value,
                      },
                    }))
                  }}
                  className="h-12 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950 p-1"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Gamepad2 className="h-5 w-5 text-orange-300" />
            <h3 className="text-xl font-black text-white">Mystery game config</h3>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Game name</span>
              <input type="text" value={mystery.name} onChange={(event) => setMysteryGameDetails('name', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0" />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Description</span>
              <textarea value={mystery.description} onChange={(event) => setMysteryGameDetails('description', event.target.value)} className="h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0" />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Mode</span>
              <input type="text" value={mystery.mode} onChange={(event) => setMysteryGameDetails('mode', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0" />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Numeric MVP metrics (one per line)</span>
              <textarea
                value={mystery.metrics.join('\n')}
                onChange={(event) => setMysteryMetrics([...new Set(event.target.value.split('\n').map((metric) => metric.trim()).filter(Boolean))])}
                className="h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                placeholder="e.g. Points scored"
              />
            </label>

            {mystery.metrics.map((metric) => {
              const key = customMetricKey(metric)
              return (
                <div key={key} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-[1fr_120px_auto] sm:items-center">
                  <span className="text-sm text-slate-200">{metric}</span>
                  <label className="text-xs text-slate-400">
                    Weight
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={mystery.metricWeights?.[key] ?? 1}
                      onChange={(event) => setMysteryMetricWeight(key, Math.max(0, Number(event.target.value) || 0))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={mystery.lowerIsBetterMetrics?.includes(key) ?? false}
                      onChange={(event) => setMysteryMetricDirection(key, event.target.checked)}
                      className="accent-cyan-400"
                    />
                    Lower is better
                  </label>
                </div>
              )
            })}

            <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
              <span>Activate mystery game</span>
              <input type="checkbox" checked={mystery.active} onChange={(event) => setMysteryGameDetails('active', event.target.checked)} className="h-4 w-4 accent-cyan-400" />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:flex-row">
          <button type="button" onClick={exportData} className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 font-medium text-cyan-200 hover:bg-cyan-500/20">
            Export JSON
          </button>
          <label className="cursor-pointer rounded-full border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-center font-medium text-orange-200 hover:bg-orange-500/20">
            Import JSON
            <input type="file" accept="application/json" onChange={importData} className="hidden" />
          </label>
        </div>
      </div>
    </section>
  )
}

export default App
