import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Lock, Pencil, RefreshCw, Save, ShieldCheck } from "lucide-react";
import adminService from "../../services/adminService";
import { createRowsFromMatch, hasDuplicateRanks, normalizeRowsForApi } from "./resultFormUtils";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-rose-300/55 focus:ring-2 focus:ring-rose-300/20";

const cardClass = "rounded-2xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl";

const EditResult = () => {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [matchDetails, setMatchDetails] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getMatches({ page: 1, limit: 120 });
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

  const canEdit = Boolean(matchDetails?.canEdit);

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

  const submitEdit = async (event) => {
    event.preventDefault();

    if (!selectedMatchId) {
      toast.error("Select match first");
      return;
    }

    if (!canEdit) {
      toast.error("This match is locked");
      return;
    }

    if (hasDuplicateRanks(rows)) {
      toast.error("Rank must be unique for each team");
      return;
    }

    setSaving(true);
    try {
      await adminService.editMatch(selectedMatchId, {
        results: normalizeRowsForApi(rows)
      });

      toast.success("Match result edited successfully");
      loadMatch(selectedMatchId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit result");
    } finally {
      setSaving(false);
    }
  };

  const endMatch = async () => {
    if (!selectedMatchId) {
      toast.error("Select match first");
      return;
    }

    setSaving(true);
    try {
      await adminService.endMatch({ matchId: selectedMatchId });
      toast.success("Match locked and finalized");
      fetchMatches();
      loadMatch(selectedMatchId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to end match");
    } finally {
      setSaving(false);
    }
  };

  const selectedMatch = useMemo(
    () => matches.find((match) => String(match._id) === String(selectedMatchId)),
    [matches, selectedMatchId]
  );

  return (
    <section className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Manual Corrections</p>
            <h2 className="font-['Rajdhani'] text-3xl font-bold text-white">Edit Match Results</h2>
          </div>

          <button
            type="button"
            onClick={fetchMatches}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-rose-300/45"
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
          <option value="">Select match to edit</option>
          {matches.map((match) => (
            <option key={match._id} value={match._id}>
              Match #{match.matchNumber} - {match.tournamentTitle || "Tournament"} ({match.status})
            </option>
          ))}
        </select>

        {loading ? <p className="mt-3 text-sm text-white/60">Loading matches...</p> : null}
        {loadingMatch ? <p className="mt-3 text-sm text-white/60">Loading selected match...</p> : null}

        {selectedMatch ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.13em] text-white/75">
            Match Status: {selectedMatch.status}
          </div>
        ) : null}
      </motion.div>

      {matchDetails && !canEdit ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cardClass}>
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300/35 bg-amber-500/15 px-3 py-2 text-sm text-amber-100">
            <Lock size={14} />
            This match is locked. Results are read-only.
          </div>
        </motion.div>
      ) : null}

      <form onSubmit={submitEdit} className="space-y-4">
        {!rows.length ? (
          <div className={cardClass}>
            <p className="text-sm text-white/65">Select a match to load editable result entries.</p>
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-rose-200/80">Team</p>
                <h3 className="font-['Rajdhani'] text-2xl font-semibold text-white">{row.teamName}</h3>
              </div>
              <Pencil size={16} className="text-rose-200" />
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs uppercase tracking-[0.12em] text-white/70">
                Rank
                <input
                  type="number"
                  min="1"
                  value={row.rank}
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                  onChange={(event) => updateTeamField(teamIndex, "totalKills", event.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs uppercase tracking-[0.12em] text-white/80 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={row.booyah}
                  disabled={!canEdit}
                  onChange={(event) => updateTeamField(teamIndex, "booyah", event.target.checked)}
                />
                Booyah Winner
              </label>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.13em] text-white/60">Player Kills</p>
              <div className="space-y-2">
                {row.players.map((player, playerIndex) => (
                  <div key={player.key} className="grid gap-2 sm:grid-cols-[1fr_130px]">
                    <select
                      value={player.userId}
                      disabled={!canEdit}
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
                      disabled={!canEdit}
                      onChange={(event) =>
                        updatePlayerField(teamIndex, playerIndex, "kills", event.target.value)
                      }
                      placeholder="Kills"
                      className={inputClass}
                    />
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
                disabled={!canEdit || saving || hasDuplicateRanks(rows)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300/45 bg-rose-500/15 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Edited Result"}
              </button>

              <button
                type="button"
                onClick={endMatch}
                disabled={saving || !selectedMatchId || !rows.length || !canEdit}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                {saving ? "Processing..." : "End & Lock Match"}
              </button>
            </div>

            {hasDuplicateRanks(rows) ? <p className="mt-2 text-sm text-rose-200">Rank must be unique.</p> : null}
          </div>
        ) : null}
      </form>
    </section>
  );
};

export default EditResult;
