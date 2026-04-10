import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { CheckCircle2, PlusCircle, RefreshCw, Shuffle, Swords, Users } from "lucide-react";
import BracketTree from "../../components/tournament/BracketTree";
import adminService from "../../services/adminService";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20";

const cardClass = "rounded-2xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl";

const MatchControl = () => {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [playerSearch, setPlayerSearch] = useState("");

  const [teamForm, setTeamForm] = useState({
    teamName: "",
    players: []
  });

  const [matchForm, setMatchForm] = useState({
    tournamentId: "",
    matchNumber: "",
    mode: "BR",
    selectedTeams: [],
    startTime: ""
  });

  const [qualificationForm, setQualificationForm] = useState({
    matchId: "",
    qualifiedTeams: []
  });
  const [bracketForm, setBracketForm] = useState({
    tournamentId: "",
    teamIds: []
  });
  const [bracket, setBracket] = useState(null);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [winnerSelections, setWinnerSelections] = useState({});
  const [bracketSavingMatchId, setBracketSavingMatchId] = useState("");

  const buildWinnerSelections = (bracketData, previous = {}) => {
    const next = {};

    (bracketData?.rounds || []).forEach((round) => {
      (round.matches || []).forEach((match) => {
        if (match.winnerTeamId) {
          next[match._id] = String(match.winnerTeamId);
          return;
        }

        if (previous[match._id]) {
          next[match._id] = previous[match._id];
        }
      });
    });

    return next;
  };

  const loadBracket = async (tournamentId) => {
    if (!tournamentId) {
      setBracket(null);
      setWinnerSelections({});
      return;
    }

    setBracketLoading(true);
    try {
      const { data } = await adminService.getTournamentBracket(tournamentId);
      setBracket(data);
      setWinnerSelections((current) => buildWinnerSelections(data, current));
    } catch (error) {
      setBracket(null);
      setWinnerSelections({});
      toast.error(error.response?.data?.message || "Failed to load bracket");
    } finally {
      setBracketLoading(false);
    }
  };

  const fetchUsers = async (search = "") => {
    try {
      const { data } = await adminService.getUsers({ page: 1, limit: 100, search });
      setUsers(data.results || []);
    } catch (error) {
      setUsers([]);
    }
  };

  const refreshAllData = async () => {
    await fetchAll();
    if (bracketForm.tournamentId) {
      await loadBracket(bracketForm.tournamentId);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [teamsResponse, tournamentsResponse, matchesResponse] = await Promise.all([
        adminService.getTeams({ page: 1, limit: 200 }),
        adminService.getTournaments({ page: 1, limit: 100 }),
        adminService.getMatches({ page: 1, limit: 100 })
      ]);

      setTeams(teamsResponse.data.results || []);
      setTournaments(tournamentsResponse.data.results || []);
      setMatches(matchesResponse.data.results || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load match control data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchUsers();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(playerSearch);
    }, 220);

    return () => clearTimeout(timeout);
  }, [playerSearch]);

  useEffect(() => {
    loadBracket(bracketForm.tournamentId);
  }, [bracketForm.tournamentId]);

  const selectedMatch = useMemo(
    () => matches.find((match) => String(match._id) === String(qualificationForm.matchId)),
    [matches, qualificationForm.matchId]
  );
  const clashSquadTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.mode === "CS"),
    [tournaments]
  );

  useEffect(() => {
    const loadSelectedMatch = async () => {
      if (!qualificationForm.matchId) return;

      try {
        const { data } = await adminService.getMatch(qualificationForm.matchId);
        const qualified = Array.isArray(data.qualifiedTeams)
          ? data.qualifiedTeams.map((team) => String(team._id || "")).filter(Boolean)
          : [];

        setQualificationForm((current) => ({
          ...current,
          qualifiedTeams: qualified
        }));
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load selected match");
      }
    };

    loadSelectedMatch();
  }, [qualificationForm.matchId]);

  const toggleSelect = (list, value) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const toggleBracketTeam = (teamId) => {
    setBracketForm((current) => {
      const alreadySelected = current.teamIds.includes(teamId);

      if (!alreadySelected && current.teamIds.length >= 8) {
        toast.error("Select exactly 8 teams for the bracket");
        return current;
      }

      return {
        ...current,
        teamIds: toggleSelect(current.teamIds, teamId)
      };
    });
  };

  const submitTeamRegistration = async (event) => {
    event.preventDefault();

    if (!teamForm.players.length) {
      toast.error("Select at least one player");
      return;
    }

    setSaving(true);
    try {
      await adminService.registerTeam({
        teamName: teamForm.teamName,
        players: teamForm.players
      });

      toast.success("Team registered successfully");
      setTeamForm({ teamName: "", players: [] });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to register team");
    } finally {
      setSaving(false);
    }
  };

  const submitCreateMatch = async (event) => {
    event.preventDefault();

    if (matchForm.mode !== "BR" && !matchForm.selectedTeams.length) {
      toast.error("Select teams for this match");
      return;
    }

    setSaving(true);
    try {
      await adminService.createMatch({
        tournamentId: matchForm.tournamentId,
        matchNumber: matchForm.matchNumber ? Number(matchForm.matchNumber) : undefined,
        mode: matchForm.mode,
        selectedTeams: matchForm.mode === "BR" ? undefined : matchForm.selectedTeams,
        startTime: matchForm.startTime ? new Date(matchForm.startTime).toISOString() : undefined
      });

      toast.success(matchForm.mode === "BR" ? "BR match created with all teams" : "Manual match created");
      setMatchForm({
        tournamentId: "",
        matchNumber: "",
        mode: "BR",
        selectedTeams: [],
        startTime: ""
      });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create match");
    } finally {
      setSaving(false);
    }
  };

  const saveQualifiedTeams = async () => {
    if (!qualificationForm.matchId) {
      toast.error("Select a match first");
      return;
    }

    if (!qualificationForm.qualifiedTeams.length) {
      toast.error("Select at least one qualified team");
      return;
    }

    setSaving(true);
    try {
      await adminService.saveQualifiedTeams({
        matchId: qualificationForm.matchId,
        qualifiedTeams: qualificationForm.qualifiedTeams
      });

      toast.success("Qualified teams updated");
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save qualified teams");
    } finally {
      setSaving(false);
    }
  };

  const submitCreateBracket = async (event) => {
    event.preventDefault();

    if (!bracketForm.tournamentId) {
      toast.error("Select a Clash Squad tournament");
      return;
    }

    if (bracketForm.teamIds.length !== 8) {
      toast.error("Select exactly 8 teams");
      return;
    }

    setSaving(true);
    try {
      const { data } = await adminService.createTournamentBracket({
        tournamentId: bracketForm.tournamentId,
        teamIds: bracketForm.teamIds
      });

      setBracket(data);
      setWinnerSelections(buildWinnerSelections(data));
      toast.success("Bracket created and teams shuffled");
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create bracket");
    } finally {
      setSaving(false);
    }
  };

  const submitBracketWinner = async (matchId) => {
    const winnerTeamId = winnerSelections[matchId];

    if (!winnerTeamId) {
      toast.error("Select a winner first");
      return;
    }

    setBracketSavingMatchId(matchId);
    try {
      const { data } = await adminService.saveTournamentBracketResult({
        matchId,
        winnerTeamId
      });

      setBracket(data);
      setWinnerSelections((current) => buildWinnerSelections(data, current));
      toast.success("Winner advanced to the next round");
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save bracket result");
    } finally {
      setBracketSavingMatchId("");
    }
  };

  const selectedMatchTeams = Array.isArray(selectedMatch?.selectedTeams)
    ? selectedMatch.selectedTeams
    : [];
  const getMatchLabel = (match) =>
    match?.bracket?.roundLabel
      ? `${match.bracket.roundLabel} ${match.bracket.matchOrder || ""}`.trim()
      : `Match #${match.matchNumber}`;

  return (
    <section className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Team Registration System</p>
            <h2 className="font-['Rajdhani'] text-3xl font-bold text-white">Register Teams Manually</h2>
          </div>
          <button
            type="button"
            onClick={refreshAllData}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-fuchsia-400/40"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <form onSubmit={submitTeamRegistration} className="grid gap-3">
          <input
            required
            value={teamForm.teamName}
            onChange={(event) => setTeamForm((current) => ({ ...current, teamName: event.target.value }))}
            placeholder="Team name"
            className={inputClass}
          />

          <input
            value={playerSearch}
            onChange={(event) => setPlayerSearch(event.target.value)}
            placeholder="Search players"
            className={inputClass}
          />

          <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {users.map((user) => {
                const userId = String(user._id);
                const checked = teamForm.players.includes(userId);

                return (
                  <label
                    key={userId}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-fuchsia-400/50 bg-fuchsia-500/15 text-white"
                        : "border-white/10 text-white/75 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setTeamForm((current) => ({
                          ...current,
                          players: toggleSelect(current.players, userId)
                        }))
                      }
                    />
                    <span>{user.username}</span>
                    <span className="ml-auto text-xs text-white/50">{user.gameId || "NO-ID"}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
          >
            <PlusCircle size={16} />
            {saving ? "Registering..." : "Register Team"}
          </button>
        </form>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={cardClass}>
        <p className="text-xs uppercase tracking-[0.18em] text-white/65">Match Creation</p>
        <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Create Manual Match</h3>

        <form onSubmit={submitCreateMatch} className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              required
              value={matchForm.tournamentId}
              onChange={(event) => setMatchForm((current) => ({ ...current, tournamentId: event.target.value }))}
              className={inputClass}
            >
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament._id} value={tournament._id}>
                  {tournament.title}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              placeholder="Match #"
              value={matchForm.matchNumber}
              onChange={(event) => setMatchForm((current) => ({ ...current, matchNumber: event.target.value }))}
              className={inputClass}
            />

            <select
              value={matchForm.mode}
              onChange={(event) =>
                setMatchForm((current) => ({
                  ...current,
                  mode: event.target.value,
                  selectedTeams: event.target.value === "BR" ? [] : current.selectedTeams
                }))
              }
              className={inputClass}
            >
              <option value="BR">BR</option>
              <option value="CS">CS</option>
            </select>

            <input
              type="datetime-local"
              value={matchForm.startTime}
              onChange={(event) => setMatchForm((current) => ({ ...current, startTime: event.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            {matchForm.mode === "BR" ? (
              <div className="rounded-lg border border-cyan-300/35 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                All registered teams will be included automatically for BR matches.
              </div>
            ) : (
              <>
                <p className="mb-2 text-xs uppercase tracking-[0.15em] text-white/60">Select teams</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {teams.map((team) => {
                    const teamId = String(team._id);
                    const checked = matchForm.selectedTeams.includes(teamId);

                    return (
                      <label
                        key={teamId}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          checked
                            ? "border-fuchsia-400/50 bg-fuchsia-500/15 text-white"
                            : "border-white/10 text-white/75 hover:border-white/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setMatchForm((current) => ({
                              ...current,
                              selectedTeams: toggleSelect(current.selectedTeams, teamId)
                            }))
                          }
                        />
                        <span>{team.teamName}</span>
                        <span className="ml-auto text-xs text-white/50">{team.teamId}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/20 px-4 py-2 text-sm text-white transition hover:bg-fuchsia-500/30 disabled:opacity-50"
          >
            <Swords size={16} />
            {saving ? "Creating..." : "Create Match"}
          </button>
        </form>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cardClass}>
        <p className="text-xs uppercase tracking-[0.18em] text-white/65">Clash Squad Bracket</p>
        <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Generate 8-Team Elimination Tree</h3>

        <form onSubmit={submitCreateBracket} className="mt-4 grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <select
              value={bracketForm.tournamentId}
              onChange={(event) =>
                setBracketForm({
                  tournamentId: event.target.value,
                  teamIds: []
                })
              }
              className={inputClass}
            >
              <option value="">Select Clash Squad tournament</option>
              {clashSquadTournaments.map((tournament) => (
                <option key={tournament._id} value={tournament._id}>
                  {tournament.title}
                </option>
              ))}
            </select>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/75">
              {bracket?.enabled ? (
                <span>Bracket generated. Enter winners directly from the tree below.</span>
              ) : (
                <span>Select 8 teams. They will be shuffled automatically into quarter finals.</span>
              )}
            </div>
          </div>

          {!bracket?.enabled ? (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/60">Choose 8 teams</p>
                  <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-white/70">
                    {bracketForm.teamIds.length}/8 selected
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {teams.map((team) => {
                    const teamId = String(team._id);
                    const checked = bracketForm.teamIds.includes(teamId);
                    const disableUnchecked = !checked && bracketForm.teamIds.length >= 8;

                    return (
                      <label
                        key={`bracket-${teamId}`}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          checked
                            ? "border-cyan-300/50 bg-cyan-500/15 text-white"
                            : "border-white/10 text-white/75 hover:border-white/30"
                        } ${disableUnchecked ? "opacity-45" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disableUnchecked}
                          onChange={() => toggleBracketTeam(teamId)}
                        />
                        <span>{team.teamName}</span>
                        <span className="ml-auto text-xs text-white/50">{team.teamId}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || bracketForm.teamIds.length !== 8 || !bracketForm.tournamentId}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/16 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/24 disabled:opacity-50"
              >
                <Shuffle size={16} />
                {saving ? "Generating..." : "Generate Bracket"}
              </button>
            </>
          ) : null}
        </form>

        <div className="mt-5">
          {bracketLoading ? (
            <p className="text-sm text-white/60">Loading bracket...</p>
          ) : (
            <BracketTree
              bracket={bracket}
              adminMode
              winnerSelections={winnerSelections}
              savingMatchId={bracketSavingMatchId}
              onWinnerChange={(matchId, winnerTeamId) =>
                setWinnerSelections((current) => ({
                  ...current,
                  [matchId]: winnerTeamId
                }))
              }
              onWinnerSubmit={submitBracketWinner}
              emptyMessage={
                bracketForm.tournamentId
                  ? "No bracket has been generated for this tournament yet."
                  : "Select a Clash Squad tournament to view or create its bracket."
              }
            />
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cardClass}>
        <p className="text-xs uppercase tracking-[0.18em] text-white/65">Next Round Selection</p>
        <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Set Qualified Teams</h3>

        <div className="mt-4 grid gap-3">
          <select
            value={qualificationForm.matchId}
            onChange={(event) =>
              setQualificationForm({
                matchId: event.target.value,
                qualifiedTeams: []
              })
            }
            className={inputClass}
          >
            <option value="">Select match</option>
            {matches.map((match) => (
              <option key={match._id} value={match._id}>
                {getMatchLabel(match)} - {match.tournamentTitle || "Tournament"}
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.15em] text-white/60">Qualified teams</p>
            {!selectedMatchTeams.length ? <p className="text-sm text-white/60">Select a match to load teams.</p> : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {selectedMatchTeams.map((team) => {
                const teamId = String(team._id || "");
                const checked = qualificationForm.qualifiedTeams.includes(teamId);

                return (
                  <label
                    key={teamId}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-emerald-400/50 bg-emerald-500/15 text-white"
                        : "border-white/10 text-white/75 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setQualificationForm((current) => ({
                          ...current,
                          qualifiedTeams: toggleSelect(current.qualifiedTeams, teamId)
                        }))
                      }
                    />
                    <span>{team.teamName || team.name || "Team"}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={saveQualifiedTeams}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            {saving ? "Saving..." : "Save Qualified Teams"}
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className={cardClass}>
        <div className="mb-3 flex items-center gap-2">
          <Users size={16} className="text-white/80" />
          <p className="text-xs uppercase tracking-[0.15em] text-white/65">Registered Teams</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.12em] text-white/60">
              <tr>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Team ID</th>
                <th className="px-3 py-2">Players</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-white/65">
                    Loading teams...
                  </td>
                </tr>
              ) : null}

              {!loading && !teams.length ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-white/65">
                    No teams registered yet.
                  </td>
                </tr>
              ) : null}

              {teams.map((team) => (
                <tr key={team._id} className="border-t border-white/8 text-white/80">
                  <td className="px-3 py-2">{team.teamName}</td>
                  <td className="px-3 py-2">{team.teamId}</td>
                  <td className="px-3 py-2">{team.playerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
};

export default MatchControl;
