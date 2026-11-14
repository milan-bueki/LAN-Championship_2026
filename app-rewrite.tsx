import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowRight, BarChart3, Flame, Gamepad2, Settings, ShieldCheck, Star, Swords, Trophy, Users } from 'lucide-react'
import { NavLink, Route, Routes, useParams } from 'react-router-dom'
import { ResponsiveContainer, Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { initialTournamentState, teams, type Discipline, type Player, type TeamId, type TournamentState } from './data/tournament'
import { loadTournament, saveTournament } from './services/storage'
import { getChampionshipState, getDisciplineState, getDisciplineWinner, requiredWins, updateDisciplineSeries } from './services/scoring'
import { calculateDisciplineMvp, calculateMvpLeaderBoard, getPlayerMvpBreakdown, isDisciplineDataComplete, withDerivedPlayerData } from './services/mvp'
import { getPlayerLeaderboard, getPlayerMvpRank, getTeamColors, getTeamSummary } from './services/statistics'

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
    () => getChampionshipState(displayTournament.disciplines),
    [displayTournament.disciplines],
  )

  const teamWins = useMemo(() => getTeamSummary(displayTournament.disciplines), [displayTournament.disciplines])
  const activeDisciplines = displayTournament.disciplines.filter((discipline) => discipline.active)

  const updateDisciplineSeriesValue = (disciplineId: string, team: TeamId, change: number) => {
    setTournament((previous) => ({
      ...previous,
      disciplines: previous.disciplines.map((discipline) => {
        if (discipline.id !== disciplineId || !discipline.active) {
          return discipline
        }

        const next = updateDisciplineSeries(discipline, team, change)
        return { ...next, winner: getDisciplineWinner(next), completed: Boolean(getDisciplineWinner(next)) }
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

  const updateMetricValue = (disciplineId: string, playerId: string, metric: string, value: string) => {
    const numericValue = Number(value)
    setTournament((previous) => {
      const existingEntries = previous.disciplineStats[disciplineId] ?? {}
      const currentPlayerStats = existingEntries[playerId] ?? {}

      return {
        ...previous,
        disciplineStats: {
          ...previous.disciplineStats,
          [disciplineId]: {
            ...existingEntries,
            [playerId]: {
              ...currentPlayerStats,
              [metric]: Number.isFinite(numericValue) ? numericValue : 0,
            },
          },
        },
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mb-6 rounded-2xl border border-slate-800/90 bg-slate-950/85 px-4 py-4 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-cyan-400 to-orange-400 p-2.5">
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
            <Route path="/stats" element={<StatsPage tournament={displayTournament} onMetricChange={updateMetricValue} />} />
            <Route path="/admin" element={<AdminPage tournament={displayTournament} setMysteryGameDetails={setMysteryGameDetails} setTournament={setTournament} />} />
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
  const details = [{ label: 'Disziplinen', value: String(activeDisciplines.length) }, { label: 'Siegpunkte', value: `${teamWins.A}:${teamWins.B}` }, { label: 'Status', value: championshipState.label }]

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
                  {team === 'A' ? teams.A.name : teams.B.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">MVP race</p>
          <div className="mt-5 space-y-4">
            {calculateMvpLeaderBoard(tournament.players, tournament.disciplines, tournament.disciplineStats).slice(0, 4).map((player, index) => (
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
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">MVP metric weight</p>
                  <p className="mt-2 text-2xl font-black text-white">{discipline.mvpWeight}%</p>
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
              <LineChart data={activeDisciplines.map((discipline) => ({ name: discipline.name, TeamA: discipline.series.A, TeamB: discipline.series.B }))}>
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
                  <h3 className="mt-2 text-2xl font-black" style={{ color: teamColor }}>{team === 'A' ? teams.A.name : teams.B.name}</h3>
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

  const rank = getPlayerMvpRank(player.id, tournament.players)
  const breakdown = getPlayerMvpBreakdown(player.id, tournament.disciplines, tournament.players, tournament.disciplineStats)
  const totalPoints = breakdown.reduce((sum, item) => sum + item.points, 0)

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
          { label: 'Matches played', value: player.gamesPlayed },
          { label: 'Disciplines won', value: player.disciplinesWon },
          { label: 'MVP Points', value: totalPoints },
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
            <h3 className="text-xl font-black text-white">MVP breakdown</h3>
          </div>

          <div className="space-y-3">
            {breakdown.length === 0 ? (
              <p className="text-sm text-slate-400">No discipline data recorded yet.</p>
            ) : breakdown.map((entry) => (
              <div key={entry.disciplineId} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{entry.disciplineName}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.complete ? 'Completed' : 'Provisional'} </p>
                  </div>
                  <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-semibold text-slate-200">{entry.points.toFixed(1)} pts</div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-400" style={{ width: `${Math.min(100, entry.score)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-amber-300" />
            <h3 className="text-xl font-black text-white">Performance summary</h3>
          </div>

          <div className="space-y-3">
            {tournament.disciplines.filter((discipline) => discipline.active).map((discipline) => {
              const result = calculateDisciplineMvp(discipline, tournament.players, tournament.disciplineStats).find((item) => item.playerId === player.id)
              const value = result ? result.score : 0
              return (
                <div key={discipline.id}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                    <span>{discipline.name}</span>
                    <span>{result ? `${value.toFixed(1)} score` : 'No data'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-400" style={{ width: `${Math.min(100, value)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function StatsPage({ tournament, onMetricChange }: { tournament: TournamentState; onMetricChange: (disciplineId: string, playerId: string, metric: string, value: string) => void }) {
  const disciplines = tournament.disciplines.filter((discipline) => discipline.active)

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Live stats</p>
        <h2 className="mt-2 text-3xl font-black text-white">Player metric capture</h2>
      </div>

      {disciplines.map((discipline) => {
        const mappings = tournament.disciplineStats[discipline.id] ?? {}
        const ranking = calculateDisciplineMvp(discipline, tournament.players, tournament.disciplineStats)
        const complete = isDisciplineDataComplete(discipline, tournament.players, tournament.disciplineStats)

        return (
          <div key={discipline.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{discipline.mode}</p>
                <h3 className="text-2xl font-black text-white">{discipline.name}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">{complete ? 'Complete' : 'Incomplete'}</span>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">{discipline.completed ? 'Finalized' : 'Provisional'}</span>
              </div>
            </div>

            <div className="mb-4 overflow-x-auto">
              <div className="min-w-[900px] space-y-3">
                <div className="grid grid-cols-[1.7fr_repeat(4,minmax(120px,1fr))] gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>Player</span>
                  {discipline.metrics.map((metric) => <span key={metric}>{metric}</span>)}
                  <span>MVP</span>
                </div>

                {tournament.players.map((player) => {
                  const stats = mappings[player.id] ?? {}
                  const rankingEntry = ranking.find((entry) => entry.playerId === player.id)

                  return (
                    <div key={player.id} className="grid grid-cols-[1.7fr_repeat(4,minmax(120px,1fr))] gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{player.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{player.team === 'A' ? 'Team A' : 'Team B'}</p>
                        </div>
                        <span className="text-xs text-amber-200">{rankingEntry ? `${rankingEntry.points.toFixed(1)} pts` : '0.0 pts'}</span>
                      </div>

                      {discipline.metrics.map((metric) => (
                        <label key={metric} className="block">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={Number(stats[metric] ?? 0)}
                            onChange={(event) => onMetricChange(discipline.id, player.id, metric, event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                          />
                        </label>
                      ))}

                      <div className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-sm font-bold text-amber-300">
                        {rankingEntry ? rankingEntry.score.toFixed(1) : '0.0'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function AdminPage({ tournament, setMysteryGameDetails, setTournament }: {
  tournament: TournamentState
  setMysteryGameDetails: (field: 'name' | 'description' | 'mode' | 'active', value: string | boolean) => void
  setTournament: Dispatch<SetStateAction<TournamentState>>
}) {
  const mystery = tournament.disciplines.find((discipline) => discipline.id === 'mystery-game')

  const exportData = () => {
    const blob = new Blob([JSON.stringify(tournament, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lan-championship-2026-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '{}')) as Partial<TournamentState>
        setTournament({
          ...initialTournamentState,
          ...parsed,
          theme: { ...initialTournamentState.theme, ...parsed.theme },
          disciplines: parsed.disciplines?.length ? parsed.disciplines : initialTournamentState.disciplines,
          players: parsed.players?.length ? parsed.players : initialTournamentState.players,
          disciplineStats: parsed.disciplineStats ?? initialTournamentState.disciplineStats,
        })
      } catch {
        window.alert('Import failed. Please choose a valid LAN Championship JSON export.')
      }
    }
    reader.readAsText(file)
  }

  if (!mystery) {
    return null
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

            <label className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
              <span>Activate mystery game</span>
              <input type="checkbox" checked={mystery.active} onChange={(event) => setMysteryGameDetails('active', event.target.checked)} className="h-4 w-4 accent-cyan-400" />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={exportData} className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 font-medium text-cyan-200 hover:bg-cyan-500/20">
            Export JSON
          </button>
          <label className="cursor-pointer rounded-full border border-orange-500/50 bg-orange-500/10 px-4 py-2 font-medium text-orange-200 hover:bg-orange-500/20">
            Import JSON
            <input type="file" accept="application/json" onChange={importData} className="hidden" />
          </label>
        </div>
      </div>
    </section>
  )
}

export default App
