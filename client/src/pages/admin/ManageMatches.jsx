import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { PlayCircle, RadioTower, Save, ShieldCheck } from "lucide-react";
import adminService from "../../services/adminService";
import AdminModal from "../../components/admin/AdminModal";
import { useSocket } from "../../contexts/SocketContext";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20";

const defaultLiveUpdate = {
  matchId: "",
  userId: "",
  teamId: "",
  kills: "0",
  rank: "1",
  booyah: false
};

const defaultRoom = {
  matchId: "",
  roomId: "",
  password: ""
};

const ManageMatches = () => {
  const { socket } = useSocket();
  const [matchesData, setMatchesData] = useState({ results: [], page: 1, totalPages: 1, total: 0 });
  const [tournaments, setTournaments] = useState([]);
  const [query, setQuery] = useState({ page: 1, limit: 10, status: "" });
  const [loading, setLoading] = useState(true);

  const [createForm, setCreateForm] = useState({
    tournamentId: "",
    matchNumber: "",
    startTime: ""
  });

  const [roomModal, setRoomModal] = useState({ open: false, ...defaultRoom });
  const [updateModal, setUpdateModal] = useState({ open: false, ...defaultLiveUpdate });
  const [endModal, setEndModal] = useState({ open: false, matchId: "" });

  const [saving, setSaving] = useState(false);

  const fetchMatches = async (nextQuery = query) => {
    setLoading(true);
    try {
      const { data } = await adminService.getMatches(nextQuery);
      setMatchesData(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data } = await adminService.getTournaments({ page: 1, limit: 100, status: "" });
      setTournaments(data.results || []);
    } catch (error) {
      setTournaments([]);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [query.page, query.status]);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const matchIds = useMemo(
    () => (matchesData.results || []).map((match) => String(match._id)).filter(Boolean),
    [matchesData.results]
  );

  useEffect(() => {
    if (!socket || !matchIds.length) return;

    matchIds.forEach((matchId) => {
      socket.emit("match:join", { matchId });
    });

    const handleLeaderboardUpdate = () => {
      fetchMatches();
    };

    const handleMatchEnd = () => {
      fetchMatches();
    };

    socket.on("leaderboardUpdate", handleLeaderboardUpdate);
    socket.on("match:end", handleMatchEnd);

    return () => {
      matchIds.forEach((matchId) => {
        socket.emit("match:leave", { matchId });
      });
      socket.off("leaderboardUpdate", handleLeaderboardUpdate);
      socket.off("match:end", handleMatchEnd);
    };
  }, [socket, matchIds.join("|")]);

  const submitCreateMatch = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await adminService.createMatch({
        tournamentId: createForm.tournamentId,
        matchNumber: createForm.matchNumber ? Number(createForm.matchNumber) : undefined,
        startTime: createForm.startTime ? new Date(createForm.startTime).toISOString() : undefined
      });

      toast.success("Match created");
      setCreateForm({ tournamentId: "", matchNumber: "", startTime: "" });
      fetchMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create match");
    } finally {
      setSaving(false);
    }
  };

  const submitRoomDetails = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await adminService.addRoomDetails({
        matchId: roomModal.matchId,
        roomId: roomModal.roomId,
        password: roomModal.password
      });

      toast.success("Room details saved");
      setRoomModal({ open: false, ...defaultRoom });
      fetchMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save room details");
    } finally {
      setSaving(false);
    }
  };

  const submitLiveUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await adminService.updateMatch({
        matchId: updateModal.matchId,
        userId: updateModal.userId,
        teamId: updateModal.teamId || null,
        kills: Number(updateModal.kills || 0),
        rank: Number(updateModal.rank || 1),
        booyah: Boolean(updateModal.booyah)
      });

      toast.success("Leaderboard updated");
      setUpdateModal({ open: false, ...defaultLiveUpdate });
      fetchMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update match");
    } finally {
      setSaving(false);
    }
  };

  const confirmEndMatch = async () => {
    if (!endModal.matchId) return;

    setSaving(true);
    try {
      await adminService.endMatch({ matchId: endModal.matchId });
      toast.success("Match ended and stats finalized");
      setEndModal({ open: false, matchId: "" });
      fetchMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to end match");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-white/65">Match Control System</p>
        <h2 className="font-['Rajdhani'] text-3xl font-bold text-white">Live Match Operations</h2>

        <form onSubmit={submitCreateMatch} className="mt-4 grid gap-3 lg:grid-cols-4">
          <select
            required
            value={createForm.tournamentId}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, tournamentId: event.target.value }))}
            className={inputClass}
          >
            <option value="">Select tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.title} ({tournament.mode})
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={createForm.matchNumber}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, matchNumber: event.target.value }))}
            placeholder="Match # (optional)"
            className={inputClass}
          />

          <input
            type="datetime-local"
            value={createForm.startTime}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, startTime: event.target.value }))}
            className={inputClass}
          />

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/20 px-4 py-2 text-sm text-white transition hover:bg-fuchsia-500/30 disabled:opacity-50"
          >
            <PlayCircle size={16} />
            {saving ? "Creating..." : "Start Match"}
          </button>
        </form>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="font-['Rajdhani'] text-2xl font-semibold text-white">Active & Recent Matches</h3>

          <select
            value={query.status}
            onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, status: event.target.value }))}
            className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
          >
            <option value="">All statuses</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.15em] text-white/60">
              <tr>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Tournament</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Participants</th>
                <th className="px-4 py-3">Results</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-white/65">
                    Loading matches...
                  </td>
                </tr>
              ) : null}

              {!loading && !matchesData.results.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-white/65">
                    No matches found.
                  </td>
                </tr>
              ) : null}

              {matchesData.results.map((match) => (
                <tr key={match._id} className="border-t border-white/8 transition hover:bg-fuchsia-500/[0.09]">
                  <td className="px-4 py-3 font-medium text-white">#{match.matchNumber}</td>
                  <td className="px-4 py-3 text-white/75">{match.tournamentTitle || "Unknown"}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-fuchsia-200">{match.status}</td>
                  <td className="px-4 py-3 text-white/75">{match.roomId || "Not set"}</td>
                  <td className="px-4 py-3 text-white/75">{match.participantsCount}</td>
                  <td className="px-4 py-3 text-white/75">{match.resultsCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setRoomModal({
                            open: true,
                            matchId: match._id,
                            roomId: match.roomId || "",
                            password: match.roomPassword || ""
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80 hover:border-fuchsia-400/50"
                      >
                        <RadioTower size={12} />
                        Room
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setUpdateModal({
                            open: true,
                            ...defaultLiveUpdate,
                            matchId: match._id
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80 hover:border-fuchsia-400/50"
                      >
                        <Save size={12} />
                        Live Update
                      </button>

                      {match.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => setEndModal({ open: true, matchId: match._id })}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/15"
                        >
                          <ShieldCheck size={12} />
                          End
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="flex items-center justify-between text-sm text-white/70">
        <p>
          Page {matchesData.page} of {matchesData.totalPages} ({matchesData.total} matches)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={matchesData.page <= 1}
            onClick={() => setQuery((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={matchesData.page >= matchesData.totalPages}
            onClick={() => setQuery((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <AdminModal isOpen={roomModal.open} title="Add Room Details" onClose={() => setRoomModal({ open: false, ...defaultRoom })}>
        <form onSubmit={submitRoomDetails} className="grid gap-3">
          <input value={roomModal.matchId} readOnly className={`${inputClass} opacity-70`} />
          <input
            required
            value={roomModal.roomId}
            onChange={(event) => setRoomModal((prev) => ({ ...prev, roomId: event.target.value }))}
            placeholder="Room ID"
            className={inputClass}
          />
          <input
            required
            value={roomModal.password}
            onChange={(event) => setRoomModal((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Room Password"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/20 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Room"}
          </button>
        </form>
      </AdminModal>

      <AdminModal isOpen={updateModal.open} title="Live Match Update" onClose={() => setUpdateModal({ open: false, ...defaultLiveUpdate })}>
        <form onSubmit={submitLiveUpdate} className="grid gap-3">
          <input value={updateModal.matchId} readOnly className={`${inputClass} opacity-70`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={updateModal.userId}
              onChange={(event) => setUpdateModal((prev) => ({ ...prev, userId: event.target.value }))}
              placeholder="User ID"
              className={inputClass}
            />
            <input
              value={updateModal.teamId}
              onChange={(event) => setUpdateModal((prev) => ({ ...prev, teamId: event.target.value }))}
              placeholder="Team ID (optional)"
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              value={updateModal.kills}
              onChange={(event) => setUpdateModal((prev) => ({ ...prev, kills: event.target.value }))}
              placeholder="Kills"
              className={inputClass}
            />
            <input
              type="number"
              min="1"
              value={updateModal.rank}
              onChange={(event) => setUpdateModal((prev) => ({ ...prev, rank: event.target.value }))}
              placeholder="Rank"
              className={inputClass}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={updateModal.booyah}
              onChange={(event) => setUpdateModal((prev) => ({ ...prev, booyah: event.target.checked }))}
            />
            Booyah
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/20 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Leaderboard"}
          </button>
        </form>
      </AdminModal>

      <AdminModal isOpen={endModal.open} title="End Match" onClose={() => setEndModal({ open: false, matchId: "" })}>
        <p className="text-sm text-white/75">
          Ending this match will finalize results, update player/team stats, and emit the match end event.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEndModal({ open: false, matchId: "" })}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmEndMatch}
            disabled={saving}
            className="rounded-xl border border-rose-400/60 bg-rose-500/20 px-4 py-2 text-sm text-rose-100 disabled:opacity-50"
          >
            {saving ? "Ending..." : "End Match"}
          </button>
        </div>
      </AdminModal>
    </section>
  );
};

export default ManageMatches;
