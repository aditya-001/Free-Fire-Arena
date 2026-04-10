import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  CalendarDays,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  TimerReset,
  Trophy,
  Users
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { resolveAsset } from "../api/axiosInstance";
import LoadingSpinner from "../components/LoadingSpinner";
import BracketTree from "../components/tournament/BracketTree";
import { useAuth } from "../contexts/AuthContext";
import tournamentService from "../services/tournamentService";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const toTimestamp = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const formatCountdown = (remainingMs) => {
  const safeMs = Math.max(0, Number(remainingMs || 0));
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h`;
  }

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

const getCountdownMeta = (tournament, nowMs) => {
  if (!tournament) {
    return { label: "", value: null };
  }

  if (tournament.registrationState === "full") {
    return { label: "", value: null };
  }

  const startMs = toTimestamp(tournament.registrationStartTime);
  const endMs = toTimestamp(tournament.registrationEndTime || tournament.startTime || tournament.dateTime);

  if (startMs !== null && nowMs < startMs) {
    return {
      label: "Opens in",
      value: formatCountdown(startMs - nowMs)
    };
  }

  if (endMs !== null && nowMs <= endMs) {
    return {
      label: "Closes in",
      value: formatCountdown(endMs - nowMs)
    };
  }

  return {
    label: "Registration",
    value: null
  };
};

const getStatusMeta = (status) => {
  if (status === "open") {
    return {
      label: "Open",
      classes: "border-emerald-300/45 bg-emerald-500/20 text-emerald-100",
      icon: ShieldCheck
    };
  }

  if (status === "full") {
    return {
      label: "Full",
      classes: "border-amber-300/45 bg-amber-500/20 text-amber-100",
      icon: Users
    };
  }

  return {
    label: "Closed",
    classes: "border-rose-300/45 bg-rose-500/20 text-rose-100",
    icon: ShieldAlert
  };
};

const TournamentDetailsPage = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [tournament, setTournament] = useState(location.state?.tournament || null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data } = await tournamentService.getTournamentDetails(tournamentId);
        if (mounted) {
          setTournament(data);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load tournament details");
        if (mounted) {
          navigate("/tournaments", { replace: true });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      mounted = false;
    };
  }, [tournamentId, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const countdownMeta = useMemo(() => getCountdownMeta(tournament, nowMs), [tournament, nowMs]);
  const statusMeta = useMemo(
    () => getStatusMeta(tournament?.registrationState || "closed"),
    [tournament?.registrationState]
  );
  const StatusIcon = statusMeta.icon;

  if (loading && !tournament) {
    return <LoadingSpinner label="Loading tournament details..." fullscreen />;
  }

  if (!tournament) {
    return <LoadingSpinner label="Tournament not found" fullscreen />;
  }

  const registeredTeams = Array.isArray(tournament.registeredTeams) ? tournament.registeredTeams : [];
  const bracket = tournament.bracket || null;
  const maxSlots = Number(tournament.maxSlots || tournament.maxPlayers || 0);
  const filledSlots = Number(tournament.filledSlots || 0);
  const slotPercent = maxSlots > 0 ? Math.min(100, Math.round((filledSlots / maxSlots) * 100)) : 0;
  const canJoinNow = tournament.registrationState === "open";

  const joinedPlayers = Array.isArray(tournament.joinedPlayers) ? tournament.joinedPlayers : [];
  const userJoined = joinedPlayers.some((participant) => {
    const participantId = typeof participant === "string" ? participant : participant?._id;
    return String(participantId || "") === String(user?._id || "");
  });

  const handleJoin = () => {
    if (!canJoinNow) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    if (userJoined) {
      toast.success("You already joined this tournament");
      return;
    }

    navigate(`/tournaments/${tournament._id}/join`, {
      state: {
        tournament
      }
    });
  };

  return (
    <div className="page-content space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_40%),linear-gradient(145deg,rgba(11,19,39,0.92),rgba(8,14,30,0.82))] p-5 shadow-[0_25px_70px_rgba(2,6,23,0.6)] sm:p-7">
        <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative z-[1] space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Tournament Details</p>
              <h2 className="font-['Rajdhani'] text-4xl font-bold text-white sm:text-5xl">
                {tournament.title || tournament.name}
              </h2>
              <p className="mt-2 text-sm text-slate-300/90">
                Starts: {formatDateTime(tournament.startTime || tournament.dateTime)}
              </p>
            </div>

            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusMeta.classes}`}>
              <StatusIcon size={16} />
              {statusMeta.label}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-3">
              <p className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-cyan-100/80">
                <Ticket size={13} /> Entry Fee
              </p>
              <p className="font-['Rajdhani'] text-3xl font-bold text-white">{formatCurrency(tournament.entryFee)}</p>
            </div>

            <div className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-500/10 p-3">
              <p className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-fuchsia-100/85">
                <Trophy size={13} /> Prize Pool
              </p>
              <p className="font-['Rajdhani'] text-3xl font-bold text-white">{formatCurrency(tournament.prizePool)}</p>
            </div>

            <div className="rounded-2xl border border-sky-300/25 bg-sky-500/10 p-3">
              <p className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-sky-100/85">
                <Users size={13} /> Slots
              </p>
              <p className="font-['Rajdhani'] text-3xl font-bold text-white">{filledSlots}/{maxSlots}</p>
            </div>

            <div className="rounded-2xl border border-indigo-300/25 bg-indigo-500/10 p-3">
              <p className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-indigo-100/85">
                <CalendarDays size={13} /> Mode
              </p>
              <p className="font-['Rajdhani'] text-3xl font-bold text-white">{tournament.mode || "BR"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-slate-950/50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-200/85">Slot Progress</p>
              <p className="text-xs font-medium text-slate-300">{slotPercent}% filled</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800/80">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400"
                initial={{ width: 0 }}
                animate={{ width: `${slotPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-4 py-2 text-cyan-100">
              <TimerReset size={16} />
              {countdownMeta.value ? `${countdownMeta.label}: ${countdownMeta.value}` : statusMeta.label}
            </div>
          </div>
        </div>
      </section>

      {tournament.mode === "CS" ? (
        <section className="rounded-3xl border border-fuchsia-300/20 bg-[rgba(17,11,31,0.72)] p-5 shadow-[0_20px_55px_rgba(17,24,39,0.52)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-fuchsia-100/70">Clash Squad</p>
              <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Bracket Tree</h3>
            </div>
            <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/65">
              Single Elimination
            </span>
          </div>

          <BracketTree
            bracket={bracket}
            emptyMessage="The admin has not generated the Clash Squad bracket yet."
          />
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-cyan-300/20 bg-[rgba(9,15,30,0.76)] p-5 shadow-[0_20px_55px_rgba(2,6,23,0.5)] sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-['Rajdhani'] text-2xl font-bold text-white">Registered Teams</h3>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-200">
              {registeredTeams.length} registered
            </span>
          </div>

          <div className="space-y-3">
            {registeredTeams.length ? (
              registeredTeams.map((team) => (
                <div
                  key={team.registrationId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/55 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {team.banner ? (
                      <img
                        src={resolveAsset(team.banner)}
                        alt={team.teamName || team.teamId || "Team banner"}
                        className="h-12 w-12 shrink-0 rounded-xl border border-cyan-300/30 object-cover"
                      />
                    ) : (
                      <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-500/10 text-cyan-100">
                        <Users size={16} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {team.teamName || team.teamId || team.soloGameId || "Registered player"}
                      </p>
                      <p className="truncate text-xs uppercase tracking-[0.12em] text-slate-300/80">
                        {team.joinType} {team.teamId ? `| ${team.teamId}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
                    Slot {team.slotNumber || "--"}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/20 bg-slate-900/30 p-6 text-center">
                <p className="text-sm text-slate-300">No teams registered yet.</p>
              </div>
            )}
          </div>
        </motion.article>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-4 rounded-3xl border border-fuchsia-300/20 bg-[rgba(17,11,31,0.72)] p-5 shadow-[0_20px_55px_rgba(17,24,39,0.52)] sm:p-6"
        >
          <h3 className="font-['Rajdhani'] text-2xl font-bold text-white">Status</h3>

          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusMeta.classes}`}>
            <StatusIcon size={16} />
            {statusMeta.label}
          </div>

          <div className="rounded-2xl border border-white/12 bg-slate-950/45 p-4 text-sm text-slate-200">
            <p className="mb-2 font-medium text-white">Tournament Overview</p>
            <p>
              Slots filled: {filledSlots} / {maxSlots}
            </p>
            <p>Available: {Math.max(0, maxSlots - filledSlots)}</p>
          </div>

          <div className="rounded-2xl border border-white/12 bg-slate-950/45 p-4 text-sm text-slate-200">
            <p className="mb-2 font-medium text-white">Countdown</p>
            <p className="inline-flex items-center gap-2 text-cyan-100">
              <TimerReset size={14} />
              {countdownMeta.value ? `${countdownMeta.label}: ${countdownMeta.value}` : statusMeta.label}
            </p>
          </div>

          {canJoinNow ? (
            <button
              type="button"
              onClick={handleJoin}
              disabled={userJoined}
              className="w-full rounded-xl border border-emerald-300/45 bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {userJoined ? "Already Joined" : user ? "Join Tournament" : "Login to Join"}
            </button>
          ) : null}
        </motion.aside>
      </section>
    </div>
  );
};

export default TournamentDetailsPage;
