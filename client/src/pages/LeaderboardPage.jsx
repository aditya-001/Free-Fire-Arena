import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  Crown,
  Filter,
  Search,
  Target,
  Trophy,
  Users,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import api, { resolveAsset } from "../api/axiosInstance";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const TAB_OPTIONS = [
  { id: "match", label: "Match", icon: Target },
  { id: "players", label: "Players", icon: Trophy },
  { id: "teams", label: "Teams", icon: Users }
];

const MODE_OPTIONS = ["BR", "CS"];
const SORT_OPTIONS = [
  { id: "kills", label: "Kills" },
  { id: "wins", label: "Wins" },
  { id: "points", label: "Points" }
];

const parseTime = (value) => {
  if (!value) return Number.NaN;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const formatDate = (value) => {
  const parsed = parseTime(value);
  if (!Number.isFinite(parsed)) return "-";
  return new Date(parsed).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatTime = (value) => {
  const parsed = parseTime(value);
  if (!Number.isFinite(parsed)) return "-";
  return new Date(parsed).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const isToday = (value) => {
  const parsed = parseTime(value);
  if (!Number.isFinite(parsed)) return false;

  const current = new Date();
  const day = new Date(parsed);

  return (
    current.getDate() === day.getDate() &&
    current.getMonth() === day.getMonth() &&
    current.getFullYear() === day.getFullYear()
  );
};

const getTournamentTitle = (item) => item?.title || item?.name || "Tournament Match";

const rankGlow = (rank) => {
  if (rank === 1) return "border-amber-300/70 bg-amber-300/10 shadow-[0_0_30px_rgba(251,191,36,0.42)]";
  if (rank === 2) return "border-slate-300/65 bg-slate-200/8 shadow-[0_0_24px_rgba(226,232,240,0.28)]";
  if (rank === 3) return "border-orange-400/65 bg-orange-300/8 shadow-[0_0_24px_rgba(251,146,60,0.32)]";
  return "border-white/12 bg-white/[0.03]";
};

const initialsFromName = (name) => {
  if (!name) return "FF";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const trendFromSeed = (seed) => {
  const value = seed % 3;
  if (value === 0) return 1;
  if (value === 1) return 0;
  return -1;
};

const seedFromText = (text) =>
  String(text || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

const CountUpNumber = ({ value, className = "", durationMs = 850 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    let frame = 0;
    const start = performance.now();

    const update = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(target * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(update);
      }
    };

    frame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return <span className={className}>{displayValue.toLocaleString()}</span>;
};

const RankMovement = ({ trend }) => {
  if (trend === 0) {
    return <span className="text-xs font-semibold text-slate-400">-</span>;
  }

  if (trend > 0) {
    return (
      <motion.span
        className="inline-flex items-center text-emerald-300"
        animate={{ y: [0, -2, 0] }}
        transition={{ repeat: Infinity, duration: 1.1 }}
      >
        <ArrowUp size={14} />
      </motion.span>
    );
  }

  return (
    <motion.span
      className="inline-flex items-center text-rose-300"
      animate={{ y: [0, 2, 0] }}
      transition={{ repeat: Infinity, duration: 1.1 }}
    >
      <ArrowDown size={14} />
    </motion.span>
  );
};

const buildLiveRows = (liveMatch, players, mode) => {
  if (!players.length) return [];

  const participantSet = new Set(
    Array.isArray(liveMatch?.joinedPlayers)
      ? liveMatch.joinedPlayers
          .map((item) => (item && typeof item === "object" ? item._id : item))
          .filter(Boolean)
          .map(String)
      : []
  );

  const sourcePool = participantSet.size
    ? players.filter((player) => participantSet.has(String(player.id)))
    : players;

  const selected = (sourcePool.length ? sourcePool : players).slice(0, 12);

  const rows = selected.map((player, index) => {
    const multiplier = mode === "BR" ? 1 : 0.75;
    const kills = Math.max(1, Math.round(player.kills * multiplier + (index % 3)));
    const booyah = mode === "BR" ? player.wins : Math.max(1, Math.round(player.wins * 0.75));
    const points = kills * 12 + booyah * 26;

    return {
      id: `live-${player.id}`,
      name: player.name,
      team: `${player.state} Rangers`,
      kills,
      booyah,
      points,
      trend: trendFromSeed(points + index + 9)
    };
  });

  return rows
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));
};

const buildHistoryRows = (match, players, mode) => {
  if (!players.length) return [];

  const seed = seedFromText(`${match?._id || ""}${getTournamentTitle(match)}`);
  const offset = seed % players.length;
  const rotated = [...players.slice(offset), ...players.slice(0, offset)];
  const selected = rotated.slice(0, 10);

  return selected
    .map((player, index) => {
      const variance = (seed + index * 7) % 9;
      const kills = Math.max(1, Math.round(player.kills * (mode === "BR" ? 0.9 : 0.74)) + variance);
      const booyah =
        mode === "BR"
          ? Math.max(0, Math.round(player.wins * 0.82) + (variance % 3))
          : Math.max(1, Math.round(player.wins * 1.1) + (variance % 2));
      const points = kills * 11 + booyah * 23;

      return {
        id: `history-${match?._id || "x"}-${player.id}`,
        name: player.name,
        team: `${player.state} Rangers`,
        kills,
        booyah,
        points,
        trend: trendFromSeed(seed + points + index)
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));
};

const LeaderboardPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rawLeaderboard, setRawLeaderboard] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [activeTab, setActiveTab] = useState("match");
  const [mode, setMode] = useState("BR");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("kills");
  const [liveRows, setLiveRows] = useState([]);
  const [selectedMatchData, setSelectedMatchData] = useState(null);
  const { user } = useAuth();

  const scope = searchParams.get("scope") || "india";
  const state = user?.location?.state || "Uttar Pradesh";
  const city = user?.location?.city || "Mathura";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const [leaderboardResponse, tournamentsResponse] = await Promise.all([
          api.get("/leaderboard", {
            params: {
              scope,
              state: scope === "state" ? state : undefined,
              city: scope === "city" ? city : undefined,
              limit: 60
            }
          }),
          api.get("/tournaments", { params: { limit: 30 } })
        ]);

        setRawLeaderboard(Array.isArray(leaderboardResponse.data?.results) ? leaderboardResponse.data.results : []);
        setTournaments(Array.isArray(tournamentsResponse.data) ? tournamentsResponse.data : []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [scope, state, city]);

  const players = useMemo(
    () =>
      rawLeaderboard.map((entry, index) => {
        const points = Number(entry?.points || 0);
        const wins = Number(entry?.wins || 0);
        const matches = Number(entry?.matches || 0);
        const kills = Math.max(1, Math.round(points / 8 + wins * 1.5 + (matches ? points / (matches + 5) : 2)));
        const baseRank = Number(entry?.rank || index + 1);

        return {
          id: entry?._id || `player-${index}`,
          baseRank,
          name: entry?.playerName || "Unknown Player",
          uid: entry?.uid || "FF-PLAYER",
          points,
          wins,
          matches,
          kills,
          state: entry?.state || "Unknown",
          city: entry?.city || "Unknown",
          avatar: entry?.profileImage || ""
        };
      }),
    [rawLeaderboard]
  );

  const lifetimePlayers = useMemo(
    () =>
      [...players]
        .sort((a, b) => b.points - a.points || b.wins - a.wins)
        .map((player, index) => ({
          ...player,
          rank: index + 1,
          trend:
            player.baseRank > index + 1 ? 1 : player.baseRank < index + 1 ? -1 : trendFromSeed(player.points + index)
        })),
    [players]
  );

  const todayLiveMatch = useMemo(() => {
    const now = Date.now();

    const explicitLive = tournaments.find((match) => String(match?.status || "").toLowerCase() === "live");
    if (explicitLive) return explicitLive;

    const today = tournaments
      .filter((match) => isToday(match?.startTime || match?.dateTime))
      .sort((a, b) => {
        const aTime = parseTime(a?.startTime || a?.dateTime);
        const bTime = parseTime(b?.startTime || b?.dateTime);
        return Math.abs(aTime - now) - Math.abs(bTime - now);
      })[0];

    return today || null;
  }, [tournaments]);

  const liveMatch =
    todayLiveMatch || {
      _id: "virtual-live-match",
      title: "Today Live Showmatch",
      startTime: new Date().toISOString(),
      status: "live",
      joinedPlayers: []
    };

  const historyMatches = useMemo(() => {
    const liveId = todayLiveMatch?._id;

    return tournaments
      .filter((match) => !liveId || match?._id !== liveId)
      .sort((a, b) => parseTime(b?.startTime || b?.dateTime) - parseTime(a?.startTime || a?.dateTime))
      .slice(0, 10);
  }, [tournaments, todayLiveMatch]);

  useEffect(() => {
    setLiveRows(buildLiveRows(liveMatch, lifetimePlayers, mode));
  }, [liveMatch, lifetimePlayers, mode]);

  useEffect(() => {
    if (activeTab !== "match") return undefined;

    const interval = window.setInterval(() => {
      setLiveRows((currentRows) => {
        if (!currentRows.length) return currentRows;

        const previousRanks = Object.fromEntries(currentRows.map((row) => [row.id, row.rank]));
        const metricKey = sortBy === "wins" ? "booyah" : sortBy;

        const updatedRows = currentRows
          .map((row, index) => {
            const killStep = Math.random() > 0.43 ? Math.floor(Math.random() * 2) + 1 : 0;
            const booyahStep = Math.random() > 0.82 ? 1 : 0;
            const kills = row.kills + killStep;
            const booyah = row.booyah + booyahStep;
            const points = kills * 12 + booyah * 26;

            return {
              ...row,
              kills,
              booyah,
              points,
              trend: trendFromSeed(points + index)
            };
          })
          .sort((a, b) => Number(b[metricKey] || 0) - Number(a[metricKey] || 0))
          .map((row, index) => {
            const newRank = index + 1;
            const oldRank = previousRanks[row.id] || newRank;

            return {
              ...row,
              rank: newRank,
              trend: oldRank > newRank ? 1 : oldRank < newRank ? -1 : 0
            };
          });

        return updatedRows;
      });
    }, 3500);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeTab, sortBy]);

  const playerRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = lifetimePlayers.filter((player) => {
      if (!query) return true;

      return (
        player.name.toLowerCase().includes(query) ||
        player.uid.toLowerCase().includes(query) ||
        player.state.toLowerCase().includes(query) ||
        player.city.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered]
      .sort((a, b) => Number(b[sortBy] || 0) - Number(a[sortBy] || 0))
      .map((row, index) => ({
        ...row,
        rank: index + 1,
        trend: row.baseRank > index + 1 ? 1 : row.baseRank < index + 1 ? -1 : 0
      }));

    return sorted;
  }, [lifetimePlayers, searchQuery, sortBy]);

  const topThreePlayers = useMemo(() => {
    const top = lifetimePlayers.slice(0, 3);
    return [top[1], top[0], top[2]].filter(Boolean);
  }, [lifetimePlayers]);

  const matchRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const metricKey = sortBy === "wins" ? "booyah" : sortBy;

    return [...liveRows]
      .filter((row) => {
        if (!query) return true;
        return row.name.toLowerCase().includes(query) || row.team.toLowerCase().includes(query);
      })
      .sort((a, b) => Number(b[metricKey] || 0) - Number(a[metricKey] || 0))
      .map((row, index) => ({
        ...row,
        rank: index + 1
      }));
  }, [liveRows, searchQuery, sortBy]);

  const teamRows = useMemo(() => {
    const grouped = {};

    lifetimePlayers.forEach((player) => {
      const key = player.state || "Open";

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          name: `${key} Titans`,
          kills: 0,
          wins: 0,
          matchesPlayed: 0,
          points: 0
        };
      }

      grouped[key].kills += player.kills;
      grouped[key].wins += player.wins;
      grouped[key].matchesPlayed += player.matches;
      grouped[key].points += player.points;
    });

    const query = searchQuery.trim().toLowerCase();

    return Object.values(grouped)
      .map((team, index) => {
        const modeWins = mode === "BR" ? team.wins : Math.max(1, Math.round(team.wins * 1.18));
        const score = team.kills * 4 + modeWins * 18;

        return {
          ...team,
          wins: modeWins,
          score,
          trend: trendFromSeed(score + index)
        };
      })
      .filter((team) => {
        if (!query) return true;
        return team.name.toLowerCase().includes(query);
      })
      .sort((a, b) => Number(b[sortBy === "wins" ? "wins" : sortBy] || 0) - Number(a[sortBy === "wins" ? "wins" : sortBy] || 0))
      .map((row, index) => ({
        ...row,
        rank: index + 1
      }));
  }, [lifetimePlayers, mode, searchQuery, sortBy]);

  const modeHighlightLabel = mode === "BR" ? "Booyah" : "Wins";

  const openHistoryResult = (match) => {
    const rows = buildHistoryRows(match, lifetimePlayers, mode);
    setSelectedMatchData({
      source: "history",
      match,
      rows
    });
  };

  const openLiveResult = () => {
    setSelectedMatchData({
      source: "live",
      match: liveMatch,
      rows: matchRows
    });
  };

  if (loading) {
    return <LoadingSpinner label="Loading esports leaderboard..." fullscreen />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="space-y-5 text-slate-100"
    >
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F1A]/82 p-6 shadow-[0_24px_80px_rgba(3,8,20,0.55)] backdrop-blur-2xl md:p-7">
        <div className="pointer-events-none absolute -top-20 left-0 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -top-16 right-4 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />

        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Leaderboard</p>

        <div className="mt-4 inline-flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                type="button"
                className={`relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? "text-white" : "text-slate-300 hover:text-white"
                }`}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <motion.span
                    layoutId="leaderboard-tab-glow"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6b21ff]/70 via-[#00d3ff]/60 to-[#1d4ed8]/70"
                    transition={{ type: "spring", stiffness: 450, damping: 36 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Icon size={15} />
                  {tab.label}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="leaderboard-tab-underline"
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-cyan-200"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="sticky top-[5.5rem] z-30">
        <div className="rounded-2xl border border-cyan-300/15 bg-[#0B0F1A]/78 p-3 backdrop-blur-xl md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {MODE_OPTIONS.map((value) => (
                <motion.button
                  key={value}
                  type="button"
                  className={`relative rounded-xl px-4 py-2 text-sm font-semibold ${
                    mode === value ? "text-white" : "text-slate-300"
                  }`}
                  onClick={() => setMode(value)}
                  whileTap={{ scale: 0.97 }}
                >
                  {mode === value && (
                    <motion.span
                      layoutId="mode-toggle-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/70 to-cyan-500/70"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10">{value === "BR" ? "Battle Royale" : "Clash Squad"}</span>
                </motion.button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-[220px] sm:min-w-[260px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300"
                />
                <input
                  className="w-full rounded-xl border border-white/15 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:shadow-[0_0_18px_rgba(34,211,238,0.24)]"
                  placeholder={activeTab === "teams" ? "Search team..." : "Search player or team..."}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>

              <label className="relative min-w-[150px]">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300"
                />
                <select
                  className="w-full appearance-none rounded-xl border border-white/15 bg-white/[0.03] py-2.5 pl-9 pr-8 text-sm text-white outline-none transition focus:border-cyan-300/70"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id} className="bg-[#0B0F1A] text-white">
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {activeTab === "match" && (
          <motion.section
            key="match-view"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.28 }}
            className="space-y-4"
          >
            <motion.div
              className="relative overflow-hidden rounded-3xl border border-rose-400/35 bg-[#0B0F1A]/90 p-5 backdrop-blur-2xl"
              animate={{
                boxShadow: [
                  "0 0 18px rgba(251,113,133,0.24)",
                  "0 0 36px rgba(248,113,113,0.34)",
                  "0 0 18px rgba(251,113,133,0.24)"
                ]
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl" />

              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-rose-200/80">Today Live Match</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{getTournamentTitle(liveMatch)}</h3>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-300">
                    <Clock3 size={14} className="text-cyan-300" />
                    {formatDate(liveMatch?.startTime || liveMatch?.dateTime)} • {formatTime(liveMatch?.startTime || liveMatch?.dateTime)}
                  </p>
                </div>

                <motion.span
                  className="inline-flex items-center gap-2 rounded-full border border-rose-300/50 bg-rose-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-rose-100"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-300" />
                  LIVE
                </motion.span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                <div className="max-h-[360px] overflow-y-auto">
                  <div className="sticky top-0 z-10 grid grid-cols-[82px_minmax(200px,1fr)_120px_130px] bg-gradient-to-r from-rose-500/20 via-violet-500/20 to-cyan-500/20 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-slate-200 backdrop-blur-xl">
                    <span>Rank</span>
                    <span>Player / Team</span>
                    <span>Kills</span>
                    <span>Booyah</span>
                  </div>

                  <div className="divide-y divide-white/7">
                    {matchRows.map((row) => (
                      <motion.button
                        key={row.id}
                        layout
                        type="button"
                        whileHover={{ scale: 1.02, y: -1 }}
                        transition={{ type: "spring", stiffness: 350, damping: 26 }}
                        onClick={openLiveResult}
                        className={`grid w-full grid-cols-[82px_minmax(200px,1fr)_120px_130px] items-center border-l px-4 py-3 text-left ${rankGlow(row.rank)}`}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-xs font-bold">
                            #{row.rank}
                          </span>
                          <RankMovement trend={row.trend} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-white">{row.name}</p>
                          <p className="text-xs text-slate-400">{row.team}</p>
                        </div>

                        <CountUpNumber value={row.kills} className="text-sm font-semibold text-cyan-200" />
                        <CountUpNumber value={row.booyah} className="text-sm font-semibold text-violet-200" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="rounded-3xl border border-white/10 bg-[#0B0F1A]/84 p-5 backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">Match History</p>
                  <h4 className="mt-1 text-lg font-semibold text-white">Last 10 Matches</h4>
                </div>
              </div>

              <div className="space-y-3">
                {historyMatches.length ? (
                  historyMatches.map((match, index) => (
                    <motion.div
                      key={match?._id || `history-${index}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ scale: 1.01 }}
                      className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 transition hover:border-cyan-300/40 hover:shadow-[0_0_22px_rgba(34,211,238,0.2)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{getTournamentTitle(match)}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(match?.startTime || match?.dateTime)} • {formatTime(match?.startTime || match?.dateTime)}
                          </p>
                        </div>

                        <motion.button
                          type="button"
                          onClick={() => openHistoryResult(match)}
                          whileTap={{ scale: 0.96 }}
                          className="group relative overflow-hidden rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100"
                        >
                          <span className="relative z-10">View Result</span>
                          <motion.span
                            className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-cyan-400/35 to-blue-500/0"
                            initial={{ x: "-100%" }}
                            whileHover={{ x: "100%" }}
                            transition={{ duration: 0.6 }}
                          />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
                    No recent matches found.
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === "players" && (
          <motion.section
            key="players-view"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.28 }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-3">
              {topThreePlayers.map((player) => {
                const isChampion = player.rank === 1;

                return (
                  <motion.div
                    key={`top-${player.id}`}
                    className={`relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl ${rankGlow(player.rank)} ${
                      isChampion ? "md:scale-[1.04]" : ""
                    }`}
                    animate={{
                      boxShadow: isChampion
                        ? [
                            "0 0 18px rgba(250,204,21,0.28)",
                            "0 0 34px rgba(56,189,248,0.28)",
                            "0 0 18px rgba(250,204,21,0.28)"
                          ]
                        : [
                            "0 0 10px rgba(148,163,184,0.14)",
                            "0 0 20px rgba(34,211,238,0.2)",
                            "0 0 10px rgba(148,163,184,0.14)"
                          ]
                    }}
                    transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold">
                        <Crown size={12} className="text-amber-300" />#{player.rank}
                      </span>
                      <RankMovement trend={player.trend} />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 overflow-hidden rounded-full border border-cyan-300/35 bg-slate-900">
                        {player.avatar ? (
                          <img
                            alt={player.name}
                            src={resolveAsset(player.avatar)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs font-bold text-cyan-200">
                            {initialsFromName(player.name)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{player.name}</p>
                        <p className="text-xs text-slate-400">{player.uid}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-white/12 bg-black/25 py-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Kills</p>
                        <CountUpNumber value={player.kills} className="text-sm font-semibold text-cyan-200" />
                      </div>
                      <div className="rounded-lg border border-white/12 bg-black/25 py-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Booyah</p>
                        <CountUpNumber value={player.wins} className="text-sm font-semibold text-violet-200" />
                      </div>
                      <div className="rounded-lg border border-white/12 bg-black/25 py-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Points</p>
                        <CountUpNumber value={player.points} className="text-sm font-semibold text-blue-200" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F1A]/84 backdrop-blur-2xl">
              <div className="max-h-[420px] overflow-y-auto">
                <div className="sticky top-0 z-10 grid grid-cols-[82px_minmax(210px,1fr)_120px_120px_130px] bg-gradient-to-r from-violet-500/15 via-cyan-500/15 to-blue-500/15 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-slate-300 backdrop-blur-xl">
                  <span>Rank</span>
                  <span>Username</span>
                  <span>Total Kills</span>
                  <span>Booyah</span>
                  <span>Points</span>
                </div>

                {playerRows.length ? (
                  <div className="divide-y divide-white/6">
                    {playerRows.map((row) => (
                      <motion.div
                        key={row.id}
                        whileHover={{ scale: 1.02, y: -1 }}
                        transition={{ duration: 0.2 }}
                        className={`grid grid-cols-[82px_minmax(210px,1fr)_120px_120px_130px] items-center border-l px-4 py-3 ${rankGlow(row.rank)}`}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-xs font-bold">
                            #{row.rank}
                          </span>
                          <RankMovement trend={row.trend} />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-cyan-300/35 bg-slate-900">
                            {row.avatar ? (
                              <img
                                alt={row.name}
                                src={resolveAsset(row.avatar)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-[11px] font-bold text-cyan-200">
                                {initialsFromName(row.name)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{row.name}</p>
                            <p className="text-xs text-slate-400">{row.uid}</p>
                          </div>
                        </div>

                        <CountUpNumber value={row.kills} className="text-sm font-semibold text-cyan-200" />
                        <CountUpNumber value={row.wins} className="text-sm font-semibold text-violet-200" />
                        <CountUpNumber value={row.points} className="text-sm font-semibold text-blue-200" />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-slate-400">No players matched your filters.</div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === "teams" && (
          <motion.section
            key="teams-view"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.28 }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-3">
              {teamRows.slice(0, 3).map((team) => (
                <motion.div
                  key={`team-card-${team.id}`}
                  className={`rounded-2xl border p-4 backdrop-blur-xl ${rankGlow(team.rank)}`}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold">
                      <Crown size={12} className="text-cyan-200" />#{team.rank}
                    </span>
                    <RankMovement trend={team.trend} />
                  </div>
                  <p className="text-sm font-semibold text-white">{team.name}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-white/12 bg-black/25 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Kills</p>
                      <CountUpNumber value={team.kills} className="text-sm font-semibold text-cyan-200" />
                    </div>
                    <div className="rounded-lg border border-white/12 bg-black/25 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{modeHighlightLabel}</p>
                      <CountUpNumber value={team.wins} className="text-sm font-semibold text-violet-200" />
                    </div>
                    <div className="rounded-lg border border-white/12 bg-black/25 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Matches</p>
                      <CountUpNumber value={team.matchesPlayed} className="text-sm font-semibold text-blue-200" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F1A]/84 backdrop-blur-2xl">
              <div className="max-h-[420px] overflow-y-auto">
                <div className="sticky top-0 z-10 grid grid-cols-[82px_minmax(220px,1fr)_120px_170px_140px] bg-gradient-to-r from-violet-500/15 via-cyan-500/15 to-blue-500/15 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-slate-300 backdrop-blur-xl">
                  <span>Rank</span>
                  <span>Team Name</span>
                  <span>Total Kills</span>
                  <span>{modeHighlightLabel}</span>
                  <span>Matches Played</span>
                </div>

                {teamRows.length ? (
                  <div className="divide-y divide-white/6">
                    {teamRows.map((team) => (
                      <motion.div
                        key={team.id}
                        whileHover={{ scale: 1.02, y: -1 }}
                        transition={{ duration: 0.2 }}
                        className={`grid grid-cols-[82px_minmax(220px,1fr)_120px_170px_140px] items-center border-l px-4 py-3 ${rankGlow(team.rank)}`}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-xs font-bold">
                            #{team.rank}
                          </span>
                          <RankMovement trend={team.trend} />
                        </div>

                        <p className="text-sm font-semibold text-white">{team.name}</p>
                        <CountUpNumber value={team.kills} className="text-sm font-semibold text-cyan-200" />

                        <span
                          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            mode === "BR"
                              ? "border border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                              : "border border-violet-300/40 bg-violet-400/10 text-violet-200"
                          }`}
                        >
                          <Crown size={12} />
                          <CountUpNumber value={team.wins} />
                        </span>

                        <CountUpNumber value={team.matchesPlayed} className="text-sm font-semibold text-blue-200" />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-slate-400">No teams matched your filters.</div>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMatchData && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#05070f]/78 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMatchData(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-300/35 bg-[#0B0F1A]/95 shadow-[0_24px_80px_rgba(6,182,212,0.2)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
                    {selectedMatchData.source === "live" ? "Live Result" : "Match Result"}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{getTournamentTitle(selectedMatchData.match)}</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(selectedMatchData.match?.startTime || selectedMatchData.match?.dateTime)} • {" "}
                    {formatTime(selectedMatchData.match?.startTime || selectedMatchData.match?.dateTime)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMatchData(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-slate-200 transition hover:scale-105 hover:border-cyan-300/45"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[430px] overflow-y-auto">
                <div className="sticky top-0 z-10 grid grid-cols-[82px_minmax(200px,1fr)_120px_120px_130px] bg-gradient-to-r from-violet-500/15 via-cyan-500/15 to-blue-500/15 px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-slate-300 backdrop-blur-xl">
                  <span>Rank</span>
                  <span>Player / Team</span>
                  <span>Kills</span>
                  <span>Booyah</span>
                  <span>Points</span>
                </div>

                <div className="divide-y divide-white/7 px-5 py-2">
                  {selectedMatchData.rows.map((row) => (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`grid grid-cols-[82px_minmax(200px,1fr)_120px_120px_130px] items-center border-l px-3 py-3 ${rankGlow(row.rank)}`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-xs font-bold">
                          #{row.rank}
                        </span>
                        <RankMovement trend={row.trend} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{row.name}</p>
                        <p className="text-xs text-slate-400">{row.team}</p>
                      </div>
                      <CountUpNumber value={row.kills} className="text-sm font-semibold text-cyan-200" />
                      <CountUpNumber value={row.booyah} className="text-sm font-semibold text-violet-200" />
                      <CountUpNumber value={row.points} className="text-sm font-semibold text-blue-200" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LeaderboardPage;
