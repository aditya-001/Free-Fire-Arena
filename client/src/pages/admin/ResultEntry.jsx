import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { CheckCircle2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import adminService from "../../services/adminService";
import { createRowsFromMatch, hasDuplicateRanks, normalizeRowsForApi } from "./resultFormUtils";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/20";

const cardClass = "rounded-2xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl";

const ResultEntry = () => {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [matchDetails, setMatchDetails] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successPulse, setSuccessPulse] = useState(false);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getMatches({ page: 1, limit: 100, status: "live" });
      setMatches(data.results || []);
    } catch (error) {
      setMatches([]);
      toast.error(error.response?.data?.message || "Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  const loadMatch = async (matchId) => {
    if (!matchId) {
      setMatchDetails(null);
      setRows([]);
      return;
    }

    setLoadingMatch(true);
    try {
      const { data } = await adminService.getMatch(matchId);
      setMatchDetails(data);
      setRows(createRowsFromMatch(data, true));
    } catch (error) {
      setMatchDetails(null);
      setRows([]);
      toast.error(error.response?.data?.message || "Failed to load match details");
    } finally {
      setLoadingMatch(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    loadMatch(selectedMatchId);
  }, [selectedMatchId]);

  const isSubmitDisabled = useMemo(
    () => !selectedMatchId || !rows.length || saving || hasDuplicateRanks(rows),
    [selectedMatchId, rows, saving]
  );

  const updateTeamField = (teamIndex, field, value) => {
    setRows((current) =>
      current.map((row, index) =>
        index === teamIndex
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  };

  const updatePlayerField = (teamIndex, playerIndex, field, value) => {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== teamIndex) return row;

        return {
          ...row,
          players: row.players.map((player, pIndex) =>
            pIndex === playerIndex
              ? {
                  ...player,
                  [field]: value
                }
              : player
          )
        };
      })
    );
  };

  const addPlayerRow = (teamIndex) => {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== teamIndex) return row;

        const fallbackPlayer = row.availablePlayers[0]?.userId || "";
        return {
          ...row,
          players: [...row.players, { userId: fallbackPlayer, kills: "0", key: `${row.teamId}-${Date.now()}` }]
        };
      })
    );
  };

  const removePlayerRow = (teamIndex, playerIndex) => {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== teamIndex) return row;
        if (row.players.length <= 1) return row;

        return {
          ...row,
          players: row.players.filter((_, pIndex) => pIndex !== playerIndex)
        };
      })
    );
  };

  const syncTeamKills = (teamIndex) => {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== teamIndex) return row;

        const totalKills = row.players.reduce((sum, player) => sum + Number(player.kills || 0), 0);
        return {
          ...row,
          totalKills: String(totalKills)
        };
      })
    );
  };

  const submitResults = async (event) => {
    event.preventDefault();

    if (hasDuplicateRanks(rows)) {
      toast.error("Every team must have a unique rank");
      return;
    }

    const hasInvalidPlayers = rows.some((row) =>
      row.players.some((player) => !player.userId || Number(player.kills) < 0)
    );

    if (hasInvalidPlayers) {
      toast.error("Player selection and kills must be valid");
      return;
    }

    setSaving(true);
    try {
      await adminService.updateMatch({
        matchId: selectedMatchId,
        results: normalizeRowsForApi(rows)
      });

      setSuccessPulse(true);
      setTimeout(() => setSuccessPulse(false), 1200);
      toast.success("Match results saved manually");
      loadMatch(selectedMatchId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Core Manual Entry</p>
            <h2 className="font-['Rajdhani'] text-3xl font-bold text-white">Result Entry Form</h2>
          </div>

          <button
            type="button"
            onClick={fetchMatches}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-cyan-300/45"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <select
          value={selectedMatchId}
          onChange={(event) => setSelectedMatchId(event.target.value)}
          className={inputClass}
        >
          <option value="">Select live match</option>
          {matches.map((match) => (
            <option key={match._id} value={match._id}>
              Match #{match.matchNumber} - {match.tournamentTitle || "Tournament"}
            </option>
          ))}
        </select>

        {loading ? <p className="mt-3 text-sm text-white/60">Loading matches...</p> : null}
        {loadingMatch ? <p className="mt-3 text-sm text-white/60">Loading selected match...</p> : null}
      </motion.div>

      <form onSubmit={submitResults} className="space-y-4">
        {!rows.length ? (
          <div className={cardClass}>
            <p className="text-sm text-white/65">Select a match to start manual result entry.</p>
          </div>
        ) : null}

        {rows.map((row, teamIndex) => (
          <motion.div
            key={row.teamId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: teamIndex * 0.04 }}
            className={cardClass}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/80">Team</p>
                <h3 className="font-['Rajdhani'] text-2xl font-semibold text-white">{row.teamName}</h3>
              </div>

              <button
                type="button"
                onClick={() => syncTeamKills(teamIndex)}
                className="rounded-lg border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-100"
              >
                Sync Team Kills
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs uppercase tracking-[0.12em] text-white/70">
                Rank
                <input
                  type="number"
                  min="1"
                  value={row.rank}
                  onChange={(event) => updateTeamField(teamIndex, "rank", event.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>

              <label className="text-xs uppercase tracking-[0.12em] text-white/70">
                Total Team Kills
                <input
                  type="number"
                  min="0"
                  value={row.totalKills}
                  onChange={(event) => updateTeamField(teamIndex, "totalKills", event.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs uppercase tracking-[0.12em] text-white/80 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={row.booyah}
                  onChange={(event) => updateTeamField(teamIndex, "booyah", event.target.checked)}
                />
                Booyah Winner
              </label>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.13em] text-white/60">Player Kills</p>
                <button
                  type="button"
                  onClick={() => addPlayerRow(teamIndex)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80 transition hover:border-cyan-300/40"
                >
                  <Plus size={12} />
                  Add Player
                </button>
              </div>

              <div className="space-y-2">
                {row.players.map((player, playerIndex) => (
                  <div key={player.key} className="grid gap-2 sm:grid-cols-[1fr_120px_70px]">
                    <select
                      value={player.userId}
                      onChange={(event) =>
                        updatePlayerField(teamIndex, playerIndex, "userId", event.target.value)
                      }
                      className={inputClass}
                    >
                      {row.availablePlayers.map((option) => (
                        <option key={option.userId} value={option.userId}>
                          {option.username} ({option.gameId || "NO-ID"})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="0"
                      value={player.kills}
                      onChange={(event) =>
                        updatePlayerField(teamIndex, playerIndex, "kills", event.target.value)
                      }
                      placeholder="Kills"
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={() => removePlayerRow(teamIndex, playerIndex)}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-400/45 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}

        {rows.length ? (
          <div className={cardClass}>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Submit Match Results"}
              </button>

              {hasDuplicateRanks(rows) ? (
                <p className="text-sm text-rose-200">Rank must be unique for each team.</p>
              ) : null}
            </div>

            <AnimatePresence>
              {successPulse ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
                >
                  <CheckCircle2 size={16} />
                  Result saved and leaderboard updated.
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </form>

      {matchDetails?.qualifiedTeams?.length ? (
        <div className={cardClass}>
          <p className="text-xs uppercase tracking-[0.14em] text-white/60">Qualified Teams</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {matchDetails.qualifiedTeams.map((team) => (
              <span key={team._id} className="rounded-full border border-emerald-400/45 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100">
                {team.teamName}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ResultEntry;
