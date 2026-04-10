import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Clock3,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Swords,
  TimerReset,
  Users
} from "lucide-react";
import adminService from "../../services/adminService";
import { createRowsFromMatch, hasDuplicateRanks, normalizeRowsForApi } from "./resultFormUtils";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/20";

const cardClass = "rounded-2xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl";

const statusBadgeClass = (status) => {
  if (status === "approved") {
    return "border-emerald-400/45 bg-emerald-500/18 text-emerald-100";
  }

  if (status === "rejected") {
    return "border-rose-400/45 bg-rose-500/18 text-rose-100";
  }

  if (status === "paid") {
    return "border-cyan-300/45 bg-cyan-500/18 text-cyan-100";
  }

  if (status === "failed") {
    return "border-rose-400/45 bg-rose-500/18 text-rose-100";
  }

  return "border-amber-300/45 bg-amber-500/18 text-amber-100";
};

const formatTeamLabel = (registration) =>
  registration.teamName || registration.teamId || registration.soloGameId || "Registered Team";

const TournamentControl = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  const [registrationsData, setRegistrationsData] = useState({ results: [], page: 1, total: 0, totalPages: 1 });
  const [matches, setMatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [increaseMinutes, setIncreaseMinutes] = useState("15");
  const [assignForm, setAssignForm] = useState({
    matchNumber: "",
    startTime: ""
  });
  const [assignTeamIds, setAssignTeamIds] = useState([]);

  const [resultMatchId, setResultMatchId] = useState("");
  const [resultRows, setResultRows] = useState([]);
  const [loadingResultMatch, setLoadingResultMatch] = useState(false);

  const selectedTournament = useMemo(
    () => tournaments.find((entry) => String(entry._id) === String(selectedTournamentId)) || null,
    [tournaments, selectedTournamentId]
  );

  const approvedTeams = useMemo(
    () =>
      (registrationsData.results || [])
        .filter(
          (registration) =>
            registration.approvalStatus === "approved" && registration.approvedTeam && registration.approvedTeam._id
        )
        .map((registration) => ({
          registrationId: registration._id,
          teamId: registration.approvedTeam._id,
          teamCode: registration.approvedTeam.teamId,
          teamName: registration.approvedTeam.teamName || formatTeamLabel(registration)
        })),
    [registrationsData.results]
  );

  const approvedTeamIdSet = useMemo(
    () => new Set(approvedTeams.map((team) => String(team.teamId))),
    [approvedTeams]
  );

  const fetchTournaments = async () => {
    const { data } = await adminService.getTournaments({ page: 1, limit: 120 });
    const items = data.results || [];
    setTournaments(items);

    if (!items.length) {
      setSelectedTournamentId("");
      return;
    }

    setSelectedTournamentId((current) => {
      if (current && items.some((entry) => String(entry._id) === String(current))) {
        return current;
      }
      return String(items[0]._id);
    });
  };

  const fetchRegistrations = async (tournamentId) => {
    if (!tournamentId) {
      setRegistrationsData({ results: [], page: 1, total: 0, totalPages: 1 });
      return;
    }

    const { data } = await adminService.getTournamentRegistrations(tournamentId, {
      page: 1,
      limit: 200
    });

    setRegistrationsData(data);
  };

  const fetchMatches = async (tournamentId) => {
    if (!tournamentId) {
      setMatches([]);
      return;
    }

    const { data } = await adminService.getMatches({
      page: 1,
      limit: 100,
      tournamentId
    });

    setMatches(data.results || []);
  };

  const refreshAll = async (tournamentId = selectedTournamentId) => {
    if (!tournamentId) return;

    setLoading(true);
    try {
      await Promise.all([fetchTournaments(), fetchRegistrations(tournamentId), fetchMatches(tournamentId)]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to refresh tournament control data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchTournaments();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load tournaments");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadTournamentData = async () => {
      if (!selectedTournamentId) {
        setRegistrationsData({ results: [], page: 1, total: 0, totalPages: 1 });
        setMatches([]);
        return;
      }

      setLoading(true);
      try {
        await Promise.all([fetchRegistrations(selectedTournamentId), fetchMatches(selectedTournamentId)]);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load tournament control data");
      } finally {
        setLoading(false);
      }
    };

    loadTournamentData();
  }, [selectedTournamentId]);

  useEffect(() => {
    setAssignTeamIds((current) =>
      current.filter((teamId) => approvedTeamIdSet.has(String(teamId)))
    );
  }, [approvedTeamIdSet]);

  useEffect(() => {
    const loadResultMatch = async () => {
      if (!resultMatchId) {
        setResultRows([]);
        return;
      }

      setLoadingResultMatch(true);
      try {
        const { data } = await adminService.getMatch(resultMatchId);
        setResultRows(createRowsFromMatch(data, true));
      } catch (error) {
        setResultRows([]);
        toast.error(error.response?.data?.message || "Failed to load selected match");
      } finally {
        setLoadingResultMatch(false);
      }
    };

    loadResultMatch();
  }, [resultMatchId]);

  const reviewRegistration = async (registrationId, approve) => {
    setSaving(true);
    try {
      await adminService.reviewTournamentRegistration({
        registrationId,
        approve
      });

      toast.success(approve ? "Team approved" : "Team rejected");
      await Promise.all([fetchRegistrations(selectedTournamentId), fetchMatches(selectedTournamentId)]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to review registration");
    } finally {
      setSaving(false);
    }
  };

  const runTournamentAction = async (action) => {
    if (!selectedTournamentId) return;

    setSaving(true);
    try {
      if (action === "close") {
        await adminService.closeTournamentRegistration({ tournamentId: selectedTournamentId });
        toast.success("Registration closed");
      }

      if (action === "increase") {
        const minutes = Number.parseInt(increaseMinutes, 10);
        if (!Number.isFinite(minutes) || minutes < 1) {
          toast.error("Enter a valid number of minutes");
          setSaving(false);
          return;
        }

        await adminService.increaseTournamentTime({
          tournamentId: selectedTournamentId,
          minutes
        });
        toast.success(`Registration time increased by ${minutes} minutes`);
      }

      if (action === "start") {
        await adminService.startTournament({ tournamentId: selectedTournamentId });
        toast.success("Tournament started");
      }

      await Promise.all([
        fetchTournaments(),
        fetchRegistrations(selectedTournamentId),
        fetchMatches(selectedTournamentId)
      ]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Tournament action failed");
    } finally {
      setSaving(false);
    }
  };

  const assignMatch = async () => {
    if (!selectedTournamentId) {
      toast.error("Select a tournament first");
      return;
    }

    if (!assignTeamIds.length) {
      toast.error("Select at least one approved team");
      return;
    }

    setSaving(true);
    try {
      await adminService.assignTournamentMatch({
        tournamentId: selectedTournamentId,
        teamIds: assignTeamIds,
        mode: selectedTournament?.mode,
        ...(assignForm.matchNumber ? { matchNumber: Number(assignForm.matchNumber) } : {}),
        ...(assignForm.startTime
          ? { startTime: new Date(assignForm.startTime).toISOString() }
          : {})
      });

      toast.success("Match assigned successfully");
      setAssignForm({ matchNumber: "", startTime: "" });
      setAssignTeamIds([]);
      await fetchMatches(selectedTournamentId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign match");
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignTeam = (teamId) => {
    setAssignTeamIds((current) => {
      if (current.includes(teamId)) {
        return current.filter((entry) => entry !== teamId);
      }

      return [...current, teamId];
    });
  };

  const updateTeamField = (teamIndex, field, value) => {
    setResultRows((current) =>
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
    setResultRows((current) =>
      current.map((row, index) => {
        if (index !== teamIndex) return row;

        return {
          ...row,
          players: row.players.map((player, innerIndex) =>
            innerIndex === playerIndex
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

  const submitResults = async (event) => {
    event.preventDefault();

    if (!resultMatchId) {
      toast.error("Select a match first");
      return;
    }

    if (!resultRows.length) {
      toast.error("No teams found in this match");
      return;
    }

    if (hasDuplicateRanks(resultRows)) {
      toast.error("Each team must have a unique rank");
      return;
    }

    const hasInvalidPlayers = resultRows.some((row) =>
      row.players.some((player) => !player.userId || Number(player.kills) < 0)
    );

    if (hasInvalidPlayers) {
      toast.error("Each player row needs a valid user and non-negative kills");
      return;
    }

    setSaving(true);
    try {
      await adminService.updateMatch({
        matchId: resultMatchId,
        results: normalizeRowsForApi(resultRows)
      });

      toast.success("Results updated");
      const { data } = await adminService.getMatch(resultMatchId);
      setResultRows(createRowsFromMatch(data, true));
      await fetchMatches(selectedTournamentId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update results");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Tournament Admin Control</p>
            <h2 className="font-['Rajdhani'] text-3xl font-bold text-white">Full Tournament Command Panel</h2>
          </div>

          <button
            type="button"
            onClick={() => refreshAll()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-cyan-300/45"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <select
            value={selectedTournamentId}
            onChange={(event) => {
              setSelectedTournamentId(event.target.value);
              setResultMatchId("");
            }}
            className={inputClass}
          >
            <option value="">Select tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.title} ({tournament.mode})
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/75">
            <p className="text-xs uppercase tracking-[0.15em] text-white/55">Tournament Status</p>
            <p className="mt-1 font-medium uppercase text-cyan-100">{selectedTournament?.status || "-"}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/75">
            <p className="text-xs uppercase tracking-[0.15em] text-white/55">Mode</p>
            <p className="mt-1 font-medium uppercase text-cyan-100">{selectedTournament?.mode || "-"}</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className={cardClass}>
        <p className="text-xs uppercase tracking-[0.18em] text-white/65">Admin Actions</p>
        <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Registration and Start Control</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            disabled={!selectedTournamentId || saving}
            onClick={() => runTournamentAction("close")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-400/45 bg-rose-500/16 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/24 disabled:opacity-50"
          >
            <ShieldCheck size={16} />
            Close Registration
          </button>

          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={increaseMinutes}
              onChange={(event) => setIncreaseMinutes(event.target.value)}
              className={inputClass}
              placeholder="Minutes"
            />
            <button
              type="button"
              disabled={!selectedTournamentId || saving}
              onClick={() => runTournamentAction("increase")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/16 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/24 disabled:opacity-50"
            >
              <TimerReset size={16} />
              Increase
            </button>
          </div>

          <button
            type="button"
            disabled={!selectedTournamentId || saving}
            onClick={() => runTournamentAction("start")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/16 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/24 disabled:opacity-50"
          >
            <PlayCircle size={16} />
            Start Tournament
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Team Registrations</p>
            <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Table of Teams</h3>
          </div>
          <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/70">
            {registrationsData.total || 0} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.14em] text-white/60">
              <tr>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Player IDs</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Approval</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4 text-white/65" colSpan={6}>
                    Loading registrations...
                  </td>
                </tr>
              ) : null}

              {!loading && !(registrationsData.results || []).length ? (
                <tr>
                  <td className="px-3 py-4 text-white/65" colSpan={6}>
                    No registrations for this tournament.
                  </td>
                </tr>
              ) : null}

              {(registrationsData.results || []).map((registration) => (
                <tr key={registration._id} className="border-t border-white/8 text-white/80">
                  <td className="px-3 py-2">
                    <div>
                      <p className="font-medium text-white">{formatTeamLabel(registration)}</p>
                      <p className="text-xs text-white/55">{registration.teamId || registration.user?.username || "-"}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2 uppercase">{registration.joinType || "-"}</td>
                  <td className="px-3 py-2 text-xs text-white/70">
                    {(registration.players || []).join(", ") || "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs uppercase tracking-[0.12em] ${statusBadgeClass(registration.paymentStatus)}`}>
                      {registration.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs uppercase tracking-[0.12em] ${statusBadgeClass(registration.approvalStatus)}`}>
                      {registration.approvalStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving || registration.paymentStatus !== "paid"}
                        onClick={() => reviewRegistration(registration._id, true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/45 px-2 py-1 text-xs text-emerald-100 disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => reviewRegistration(registration._id, false)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-400/45 px-2 py-1 text-xs text-rose-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className={cardClass}>
        <p className="text-xs uppercase tracking-[0.18em] text-white/65">Match Control Panel</p>
        <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Assign Matches</h3>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-white/60">Approved teams</p>
              <span className="text-xs text-white/60">{approvedTeams.length} available</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {approvedTeams.map((team) => {
                const checked = assignTeamIds.includes(String(team.teamId));

                return (
                  <label
                    key={team.teamId}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-cyan-300/55 bg-cyan-500/18 text-white"
                        : "border-white/10 text-white/75 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAssignTeam(String(team.teamId))}
                    />
                    <span>{team.teamName}</span>
                    <span className="ml-auto text-xs text-white/55">{team.teamCode || "TEAM"}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <label className="text-xs uppercase tracking-[0.12em] text-white/70">
              Match Number (optional)
              <input
                type="number"
                min="1"
                value={assignForm.matchNumber}
                onChange={(event) => setAssignForm((current) => ({ ...current, matchNumber: event.target.value }))}
                className={`${inputClass} mt-1`}
              />
            </label>

            <label className="text-xs uppercase tracking-[0.12em] text-white/70">
              Start Time (optional)
              <input
                type="datetime-local"
                value={assignForm.startTime}
                onChange={(event) => setAssignForm((current) => ({ ...current, startTime: event.target.value }))}
                className={`${inputClass} mt-1`}
              />
            </label>

            <button
              type="button"
              disabled={saving || !approvedTeams.length}
              onClick={assignMatch}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/16 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/24 disabled:opacity-50"
            >
              <Swords size={16} />
              Assign Match
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.14em] text-white/60">
              <tr>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Teams</th>
                <th className="px-3 py-2">Start</th>
              </tr>
            </thead>
            <tbody>
              {!matches.length ? (
                <tr>
                  <td className="px-3 py-4 text-white/65" colSpan={4}>
                    No matches assigned yet.
                  </td>
                </tr>
              ) : null}

              {matches.map((match) => (
                <tr key={match._id} className="border-t border-white/8 text-white/80">
                  <td className="px-3 py-2">
                    {match.bracket?.roundLabel
                      ? `${match.bracket.roundLabel} ${match.bracket.matchOrder || ""}`.trim()
                      : `Match #${match.matchNumber}`}
                  </td>
                  <td className="px-3 py-2 uppercase text-cyan-100">{match.status}</td>
                  <td className="px-3 py-2">{match.selectedTeamsCount}</td>
                  <td className="px-3 py-2">{match.startTime ? new Date(match.startTime).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.form
        onSubmit={submitResults}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className={cardClass}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Update Results</p>
            <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Quick Result Editor</h3>
          </div>
          <Clock3 size={18} className="text-white/65" />
        </div>

        <select
          value={resultMatchId}
          onChange={(event) => setResultMatchId(event.target.value)}
          className={inputClass}
        >
          <option value="">Select assigned match</option>
          {matches.map((match) => (
            <option key={match._id} value={match._id}>
              {match.bracket?.roundLabel
                ? `${match.bracket.roundLabel} ${match.bracket.matchOrder || ""}`.trim()
                : `Match #${match.matchNumber}`} - {match.status}
            </option>
          ))}
        </select>

        {loadingResultMatch ? <p className="mt-3 text-sm text-white/60">Loading selected match...</p> : null}

        <div className="mt-4 space-y-4">
          {resultRows.map((row, teamIndex) => (
            <div key={row.teamId} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-medium text-white">{row.teamName}</h4>
                <span className="text-xs text-white/55">{row.teamId}</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
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
                  Total Kills
                  <input
                    type="number"
                    min="0"
                    value={row.totalKills}
                    onChange={(event) => updateTeamField(teamIndex, "totalKills", event.target.value)}
                    className={`${inputClass} mt-1`}
                  />
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.12em] text-white/70">
                  <input
                    type="checkbox"
                    checked={row.booyah}
                    onChange={(event) => updateTeamField(teamIndex, "booyah", event.target.checked)}
                  />
                  Booyah
                </label>
              </div>

              <div className="mt-3 space-y-2">
                {row.players.map((player, playerIndex) => (
                  <div key={player.key} className="grid gap-2 sm:grid-cols-[1fr_130px]">
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
                      className={inputClass}
                      placeholder="Kills"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasDuplicateRanks(resultRows) ? (
            <p className="text-sm text-rose-200">Every team must have a unique rank.</p>
          ) : null}

          <button
            type="submit"
            disabled={saving || !resultRows.length || hasDuplicateRanks(resultRows)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/16 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/24 disabled:opacity-50"
          >
            <Users size={16} />
            Save Results
          </button>
        </div>
      </motion.form>
    </section>
  );
};

export default TournamentControl;
