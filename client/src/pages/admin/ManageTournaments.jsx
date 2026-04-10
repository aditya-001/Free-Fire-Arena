import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Eye, Info, Pencil, Plus, Search, Trash2 } from "lucide-react";
import adminService from "../../services/adminService";
import AdminModal from "../../components/admin/AdminModal";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20";

const sectionClass =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/65 via-slate-900/45 to-fuchsia-950/25 p-4 shadow-[inset_0_0_30px_rgba(34,211,238,0.05)]";

const previewRowClass =
  "flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/85";

const TYPE_TO_PLAYERS = Object.freeze({
  solo: 1,
  duo: 2,
  squad: 4
});

const defaultCreateForm = {
  title: "",
  mode: "BR",
  type: "squad",
  entryFee: "",
  prizePool: "",
  maxTeams: "12",
  tournamentDateTime: "",
  matchStartTime: "",
  registrationStartTime: "",
  registrationEndTime: ""
};

const defaultEditForm = {
  title: "",
  mode: "BR",
  entryFee: "",
  prizePool: "",
  maxPlayers: "50",
  dateTime: "",
  registrationStartTime: "",
  registrationEndTime: ""
};

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().slice(0, 16);
};

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTimestamp = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const TooltipLabel = ({ label, tooltip, required = false }) => (
  <span className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-white/70">
    {label}
    {required ? " *" : ""}
    <span title={tooltip} className="inline-flex cursor-help text-cyan-200/85">
      <Info size={13} />
    </span>
  </span>
);

const ManageTournaments = () => {
  const [data, setData] = useState({ results: [], page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ page: 1, limit: 10, search: "", status: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [createPreviewOpen, setCreatePreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [editingId, setEditingId] = useState(null);

  const createInsights = useMemo(() => {
    const errors = [];
    const playersPerTeam = TYPE_TO_PLAYERS[createForm.type] || 4;
    const maxTeams = parsePositiveInt(createForm.maxTeams);
    const maxPlayers = maxTeams > 0 ? maxTeams * playersPerTeam : 0;

    const entryFee = parseAmount(createForm.entryFee);
    const prizePool = parseAmount(createForm.prizePool);

    const tournamentTs = toTimestamp(createForm.tournamentDateTime);
    const matchStartTs = toTimestamp(createForm.matchStartTime);
    const registrationStartTs = toTimestamp(createForm.registrationStartTime);
    const registrationEndTs = toTimestamp(createForm.registrationEndTime);

    if (!createForm.title.trim() || createForm.title.trim().length < 3) {
      errors.push("Tournament title must be at least 3 characters.");
    }

    if (!["BR", "CS"].includes(createForm.mode)) {
      errors.push("Mode must be BR or CS.");
    }

    if (!Object.hasOwn(TYPE_TO_PLAYERS, createForm.type)) {
      errors.push("Type must be Solo, Duo, or Squad.");
    }

    if (!Number.isFinite(entryFee) || entryFee < 0) {
      errors.push("Entry fee must be a non-negative number.");
    }

    if (!Number.isFinite(prizePool) || prizePool < 0) {
      errors.push("Prize pool must be a non-negative number.");
    }

    if (!Number.isFinite(maxTeams) || maxTeams < 1) {
      errors.push("Max teams must be at least 1.");
    }

    if (!tournamentTs) {
      errors.push("Tournament date and time is required.");
    }

    if (!matchStartTs) {
      errors.push("Match start time is required.");
    }

    if (tournamentTs && matchStartTs && matchStartTs < tournamentTs) {
      errors.push("Match start time must be same or after tournament date and time.");
    }

    if (registrationStartTs && registrationEndTs && registrationStartTs > registrationEndTs) {
      errors.push("Registration start time must be before registration end time.");
    }

    if (registrationEndTs && matchStartTs && registrationEndTs > matchStartTs) {
      errors.push("Registration end time must be before or equal to match start time.");
    }

    return {
      playersPerTeam,
      maxTeams,
      maxPlayers,
      filledSlots: 0,
      progressPct: 0,
      errors,
      isValid: errors.length === 0
    };
  }, [createForm]);

  const fetchTournaments = async (nextQuery = query) => {
    setLoading(true);
    try {
      const { data: response } = await adminService.getTournaments(nextQuery);
      setData(response);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [query.page, query.status]);

  const updateCreateFormField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreatePreviewOpen(false);
  };

  const openCreateModal = () => {
    setCreateForm(defaultCreateForm);
    setCreatePreviewOpen(false);
    setCreateOpen(true);
  };

  const openEditModal = (tournament) => {
    setEditingId(tournament._id);
    setEditForm({
      title: tournament.title || "",
      mode: tournament.mode || "BR",
      entryFee: String(tournament.entryFee || 0),
      prizePool: String(tournament.prizePool || 0),
      maxPlayers: String(tournament.maxPlayers || 0),
      dateTime: toDateTimeLocal(tournament.startTime),
      registrationStartTime: toDateTimeLocal(tournament.registrationStartTime),
      registrationEndTime: toDateTimeLocal(tournament.registrationEndTime || tournament.startTime)
    });
    setEditOpen(true);
  };

  const submitCreate = async (event) => {
    event.preventDefault();

    if (!createInsights.isValid) {
      toast.error(createInsights.errors[0] || "Please fix the form validation issues");
      return;
    }

    if (!createPreviewOpen) {
      toast.error("Open preview before creating the tournament");
      return;
    }

    setSaving(true);

    try {
      await adminService.createTournament({
        title: createForm.title.trim(),
        mode: createForm.mode,
        type: createForm.type,
        entryFee: Number(createForm.entryFee),
        prizePool: Number(createForm.prizePool),
        maxSlots: createInsights.maxTeams,
        maxPlayers: createInsights.maxPlayers,
        dateTime: new Date(createForm.tournamentDateTime).toISOString(),
        startTime: new Date(createForm.matchStartTime).toISOString(),
        ...(createForm.registrationStartTime
          ? { registrationStartTime: new Date(createForm.registrationStartTime).toISOString() }
          : {}),
        ...(createForm.registrationEndTime
          ? { registrationEndTime: new Date(createForm.registrationEndTime).toISOString() }
          : {})
      });

      toast.success("Tournament created");
      setCreateOpen(false);
      setCreatePreviewOpen(false);
      fetchTournaments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create tournament");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await adminService.updateTournament(editingId, {
        title: editForm.title,
        mode: editForm.mode,
        entryFee: Number(editForm.entryFee),
        prizePool: Number(editForm.prizePool),
        maxPlayers: Number(editForm.maxPlayers),
        dateTime: new Date(editForm.dateTime).toISOString()
      });

      if (editForm.registrationStartTime || editForm.registrationEndTime) {
        await adminService.updateTournamentTime({
          tournamentId: editingId,
          ...(editForm.registrationStartTime
            ? { registrationStartTime: new Date(editForm.registrationStartTime).toISOString() }
            : {}),
          ...(editForm.registrationEndTime
            ? { registrationEndTime: new Date(editForm.registrationEndTime).toISOString() }
            : {})
        });
      }

      toast.success("Tournament updated");
      setEditOpen(false);
      fetchTournaments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update tournament");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      await adminService.deleteTournament(deleteTarget._id);
      toast.success("Tournament deleted");
      setDeleteTarget(null);
      fetchTournaments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete tournament");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Tournament Management</p>
            <h2 className="font-['Rajdhani'] text-3xl font-bold text-white">Create, Edit & Control Tournaments</h2>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/20 px-4 py-2 text-sm text-white transition hover:bg-fuchsia-500/30"
          >
            <Plus size={16} />
            New Tournament
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-white/45" size={16} />
            <input
              value={query.search}
              onChange={(event) => setQuery((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search by title or mode"
              className={`${inputClass} pl-9`}
            />
          </label>

          <div className="flex gap-2">
            <select
              value={query.status}
              onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, status: event.target.value }))}
              className={inputClass}
            >
              <option value="">All status</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>

            <button
              type="button"
              onClick={() => setQuery((prev) => ({ ...prev, page: 1 }))}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-fuchsia-400/40"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 backdrop-blur-xl"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.15em] text-white/60">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Entry Fee</th>
                <th className="px-4 py-3">Prize Pool</th>
                <th className="px-4 py-3">Players</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Start Time</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-white/65" colSpan={8}>
                    Loading tournaments...
                  </td>
                </tr>
              ) : null}

              {!loading && !data.results.length ? (
                <tr>
                  <td className="px-4 py-6 text-white/65" colSpan={8}>
                    No tournaments found.
                  </td>
                </tr>
              ) : null}

              {data.results.map((tournament) => (
                <tr key={tournament._id} className="border-t border-white/8 transition hover:bg-fuchsia-500/[0.09]">
                  <td className="px-4 py-3 font-medium text-white">{tournament.title}</td>
                  <td className="px-4 py-3 text-white/75">{tournament.mode}</td>
                  <td className="px-4 py-3 text-white/75">Rs {Number(tournament.entryFee || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-white/75">Rs {Number(tournament.prizePool || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-white/75">
                    {tournament.joinedPlayersCount}/{tournament.maxPlayers}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-fuchsia-200">
                    {tournament.status}
                  </td>
                  <td className="px-4 py-3 text-white/75">
                    {tournament.startTime ? new Date(tournament.startTime).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(tournament)}
                        className="rounded-lg border border-white/15 p-2 text-white/80 transition hover:border-fuchsia-400/40 hover:text-white"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(tournament)}
                        className="rounded-lg border border-rose-400/40 p-2 text-rose-200 transition hover:bg-rose-500/15"
                      >
                        <Trash2 size={14} />
                      </button>
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
          Showing page {data.page} of {data.totalPages} ({data.total} tournaments)
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setQuery((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setQuery((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="rounded-lg border border-white/15 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <AdminModal
        isOpen={createOpen}
        title="Create Tournament"
        maxWidthClass="max-w-5xl"
        onClose={() => setCreateOpen(false)}
      >
        <form className="space-y-4" onSubmit={submitCreate}>
          <div className="rounded-2xl border border-cyan-300/35 bg-gradient-to-r from-cyan-500/18 via-fuchsia-500/15 to-cyan-500/18 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/90">Premium Tournament Creation</p>
            <h4 className="font-['Rajdhani'] text-2xl font-bold text-white">Neon Control Form</h4>
            <p className="text-sm text-white/75">
              Configure tournament logic with auto player math, registration controls, and preview confirmation.
            </p>
          </div>

          <div className={sectionClass}>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-cyan-200/80">1. Basic Info</p>
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="block lg:col-span-3">
                <TooltipLabel
                  label="Tournament Title"
                  tooltip="Public title shown to players in listings and match cards."
                  required
                />
                <input
                  required
                  value={createForm.title}
                  onChange={(event) => updateCreateFormField("title", event.target.value)}
                  placeholder="e.g. Friday Night BR Showdown"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <TooltipLabel
                  label="Mode"
                  tooltip="BR supports battle royale format, CS supports clash squad format."
                  required
                />
                <select
                  value={createForm.mode}
                  onChange={(event) => updateCreateFormField("mode", event.target.value)}
                  className={inputClass}
                >
                  <option value="BR">Battle Royale (BR)</option>
                  <option value="CS">Clash Squad (CS)</option>
                </select>
              </label>

              <label className="block">
                <TooltipLabel
                  label="Type"
                  tooltip="Team type decides players per team and affects auto player setup."
                  required
                />
                <select
                  value={createForm.type}
                  onChange={(event) => updateCreateFormField("type", event.target.value)}
                  className={inputClass}
                >
                  <option value="solo">Solo</option>
                  <option value="duo">Duo</option>
                  <option value="squad">Squad</option>
                </select>
              </label>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-white/65">Selected</p>
                <p className="mt-1 text-sm font-medium text-cyan-100">
                  {createForm.mode} - {createForm.type.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-cyan-200/80">2. Entry Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <TooltipLabel
                  label="Entry Fee"
                  tooltip="Fee charged per registration unit for joining this tournament."
                  required
                />
                <input
                  type="number"
                  min="0"
                  required
                  value={createForm.entryFee}
                  onChange={(event) => updateCreateFormField("entryFee", event.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <TooltipLabel
                  label="Prize Pool"
                  tooltip="Total reward amount distributed to winners."
                  required
                />
                <input
                  type="number"
                  min="0"
                  required
                  value={createForm.prizePool}
                  onChange={(event) => updateCreateFormField("prizePool", event.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-cyan-200/80">3. Player Setup</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <TooltipLabel
                  label="Max Teams"
                  tooltip="Number of team slots available in the tournament."
                  required
                />
                <input
                  type="number"
                  min="1"
                  required
                  value={createForm.maxTeams}
                  onChange={(event) => updateCreateFormField("maxTeams", event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <TooltipLabel
                  label="Players Per Team"
                  tooltip="Automatically derived from selected type."
                />
                <input
                  value={createInsights.playersPerTeam}
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-80`}
                />
              </label>

              <label className="block">
                <TooltipLabel
                  label="Total Players Capacity"
                  tooltip="Auto computed as max teams x players per team."
                />
                <input
                  value={createInsights.maxPlayers}
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-80`}
                />
              </label>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-cyan-200/80">4. Schedule</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <TooltipLabel
                  label="Tournament Date & Time"
                  tooltip="Overall schedule marker used in tournament listings."
                  required
                />
                <input
                  type="datetime-local"
                  required
                  value={createForm.tournamentDateTime}
                  onChange={(event) => updateCreateFormField("tournamentDateTime", event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <TooltipLabel
                  label="Match Start Time"
                  tooltip="Actual match start used for match scheduling and lifecycle."
                  required
                />
                <input
                  type="datetime-local"
                  required
                  value={createForm.matchStartTime}
                  onChange={(event) => updateCreateFormField("matchStartTime", event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-cyan-200/80">5. Registration Control</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <TooltipLabel
                  label="Registration Start Time"
                  tooltip="When players can begin registration."
                />
                <input
                  type="datetime-local"
                  value={createForm.registrationStartTime}
                  onChange={(event) => updateCreateFormField("registrationStartTime", event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <TooltipLabel
                  label="Registration End Time"
                  tooltip="When registration closes automatically."
                />
                <input
                  type="datetime-local"
                  value={createForm.registrationEndTime}
                  onChange={(event) => updateCreateFormField("registrationEndTime", event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-cyan-200/80">6. Auto Slot System</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-cyan-100/80">Total Slots</p>
                <p className="mt-1 font-['Rajdhani'] text-3xl font-bold text-white">{createInsights.maxTeams}</p>
              </div>

              <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/10 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-fuchsia-100/80">Filled Slots</p>
                <p className="mt-1 font-['Rajdhani'] text-3xl font-bold text-white">{createInsights.filledSlots}</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-white/65">
                <span>Slot Fill Progress</span>
                <span>{createInsights.progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-300 transition-all duration-300"
                  style={{ width: `${createInsights.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {createInsights.errors.length ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/12 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-rose-200">Validation Issues</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-rose-100/90">
                {createInsights.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !createInsights.isValid}
              onClick={() => setCreatePreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-50"
            >
              <Eye size={15} />
              Show Preview
            </button>

            <button
              type="button"
              onClick={() => setCreatePreviewOpen(false)}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-fuchsia-400/45"
            >
              Hide Preview
            </button>
          </div>

          {createPreviewOpen ? (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-emerald-100">Preview Before Submit</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className={previewRowClass}>
                  <span>Title</span>
                  <span>{createForm.title || "-"}</span>
                </div>
                <div className={previewRowClass}>
                  <span>Mode / Type</span>
                  <span>{createForm.mode} / {createForm.type.toUpperCase()}</span>
                </div>
                <div className={previewRowClass}>
                  <span>Entry / Prize</span>
                  <span>Rs {parseAmount(createForm.entryFee)} / Rs {parseAmount(createForm.prizePool)}</span>
                </div>
                <div className={previewRowClass}>
                  <span>Teams / Players Per Team</span>
                  <span>{createInsights.maxTeams} / {createInsights.playersPerTeam}</span>
                </div>
                <div className={previewRowClass}>
                  <span>Tournament Date</span>
                  <span>{createForm.tournamentDateTime || "-"}</span>
                </div>
                <div className={previewRowClass}>
                  <span>Match Start</span>
                  <span>{createForm.matchStartTime || "-"}</span>
                </div>
                <div className={previewRowClass}>
                  <span>Registration Start</span>
                  <span>{createForm.registrationStartTime || "Auto"}</span>
                </div>
                <div className={previewRowClass}>
                  <span>Registration End</span>
                  <span>{createForm.registrationEndTime || "Auto"}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !createInsights.isValid || !createPreviewOpen}
                className="mt-4 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 font-medium text-emerald-50 transition hover:bg-emerald-500/30 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Create Tournament"}
              </button>
            </div>
          ) : null}
        </form>
      </AdminModal>

      <AdminModal isOpen={editOpen} title="Edit Tournament" onClose={() => setEditOpen(false)}>
        <form className="grid gap-3" onSubmit={submitEdit}>
          <input
            required
            value={editForm.title}
            onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Tournament title"
            className={inputClass}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={editForm.mode}
              onChange={(event) => setEditForm((prev) => ({ ...prev, mode: event.target.value }))}
              className={inputClass}
            >
              <option value="BR">BR</option>
              <option value="CS">CS</option>
            </select>
            <input
              type="number"
              min="0"
              required
              value={editForm.entryFee}
              onChange={(event) => setEditForm((prev) => ({ ...prev, entryFee: event.target.value }))}
              placeholder="Entry fee"
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              required
              value={editForm.prizePool}
              onChange={(event) => setEditForm((prev) => ({ ...prev, prizePool: event.target.value }))}
              placeholder="Prize pool"
              className={inputClass}
            />
            <input
              type="number"
              min="1"
              required
              value={editForm.maxPlayers}
              onChange={(event) => setEditForm((prev) => ({ ...prev, maxPlayers: event.target.value }))}
              placeholder="Max players"
              className={inputClass}
            />
          </div>

          <input
            type="datetime-local"
            required
            value={editForm.dateTime}
            onChange={(event) => setEditForm((prev) => ({ ...prev, dateTime: event.target.value }))}
            className={inputClass}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="datetime-local"
              value={editForm.registrationStartTime}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, registrationStartTime: event.target.value }))
              }
              className={inputClass}
              placeholder="Registration start"
            />
            <input
              type="datetime-local"
              value={editForm.registrationEndTime}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, registrationEndTime: event.target.value }))
              }
              className={inputClass}
              placeholder="Registration end"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/20 px-4 py-2 font-medium text-white transition hover:bg-fuchsia-500/30 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Tournament"}
          </button>
        </form>
      </AdminModal>

      <AdminModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Tournament"
        onClose={() => setDeleteTarget(null)}
      >
        <p className="text-sm text-white/75">
          This will remove the tournament and all linked matches. This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={saving}
            className="rounded-xl border border-rose-400/60 bg-rose-500/20 px-4 py-2 text-sm text-rose-100 disabled:opacity-50"
          >
            {saving ? "Deleting..." : "Delete"}
          </button>
        </div>
      </AdminModal>
    </section>
  );
};

export default ManageTournaments;
