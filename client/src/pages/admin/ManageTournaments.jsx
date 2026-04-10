import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import adminService from "../../services/adminService";
import AdminModal from "../../components/admin/AdminModal";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20";

const defaultForm = {
  title: "",
  mode: "BR",
  entryFee: "",
  prizePool: "",
  maxPlayers: "50",
  dateTime: ""
};

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().slice(0, 16);
};

const ManageTournaments = () => {
  const [data, setData] = useState({ results: [], page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ page: 1, limit: 10, search: "", status: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);

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

  const openCreateModal = () => {
    setForm(defaultForm);
    setCreateOpen(true);
  };

  const openEditModal = (tournament) => {
    setEditingId(tournament._id);
    setForm({
      title: tournament.title || "",
      mode: tournament.mode || "BR",
      entryFee: String(tournament.entryFee || 0),
      prizePool: String(tournament.prizePool || 0),
      maxPlayers: String(tournament.maxPlayers || 0),
      dateTime: toDateTimeLocal(tournament.startTime)
    });
    setEditOpen(true);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await adminService.createTournament({
        title: form.title,
        mode: form.mode,
        entryFee: Number(form.entryFee),
        prizePool: Number(form.prizePool),
        maxPlayers: Number(form.maxPlayers),
        dateTime: new Date(form.dateTime).toISOString()
      });

      toast.success("Tournament created");
      setCreateOpen(false);
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
        title: form.title,
        mode: form.mode,
        entryFee: Number(form.entryFee),
        prizePool: Number(form.prizePool),
        maxPlayers: Number(form.maxPlayers),
        dateTime: new Date(form.dateTime).toISOString()
      });

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

      <AdminModal isOpen={createOpen} title="Create Tournament" onClose={() => setCreateOpen(false)}>
        <form className="grid gap-3" onSubmit={submitCreate}>
          <input
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Tournament title"
            className={inputClass}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.mode}
              onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))}
              className={inputClass}
            >
              <option value="BR">BR</option>
              <option value="CS">CS</option>
            </select>
            <input
              type="number"
              min="0"
              required
              value={form.entryFee}
              onChange={(event) => setForm((prev) => ({ ...prev, entryFee: event.target.value }))}
              placeholder="Entry fee"
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              required
              value={form.prizePool}
              onChange={(event) => setForm((prev) => ({ ...prev, prizePool: event.target.value }))}
              placeholder="Prize pool"
              className={inputClass}
            />
            <input
              type="number"
              min="1"
              required
              value={form.maxPlayers}
              onChange={(event) => setForm((prev) => ({ ...prev, maxPlayers: event.target.value }))}
              placeholder="Max players"
              className={inputClass}
            />
          </div>

          <input
            type="datetime-local"
            required
            value={form.dateTime}
            onChange={(event) => setForm((prev) => ({ ...prev, dateTime: event.target.value }))}
            className={inputClass}
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/20 px-4 py-2 font-medium text-white transition hover:bg-fuchsia-500/30 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Tournament"}
          </button>
        </form>
      </AdminModal>

      <AdminModal isOpen={editOpen} title="Edit Tournament" onClose={() => setEditOpen(false)}>
        <form className="grid gap-3" onSubmit={submitEdit}>
          <input
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Tournament title"
            className={inputClass}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.mode}
              onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))}
              className={inputClass}
            >
              <option value="BR">BR</option>
              <option value="CS">CS</option>
            </select>
            <input
              type="number"
              min="0"
              required
              value={form.entryFee}
              onChange={(event) => setForm((prev) => ({ ...prev, entryFee: event.target.value }))}
              placeholder="Entry fee"
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              required
              value={form.prizePool}
              onChange={(event) => setForm((prev) => ({ ...prev, prizePool: event.target.value }))}
              placeholder="Prize pool"
              className={inputClass}
            />
            <input
              type="number"
              min="1"
              required
              value={form.maxPlayers}
              onChange={(event) => setForm((prev) => ({ ...prev, maxPlayers: event.target.value }))}
              placeholder="Max players"
              className={inputClass}
            />
          </div>

          <input
            type="datetime-local"
            required
            value={form.dateTime}
            onChange={(event) => setForm((prev) => ({ ...prev, dateTime: event.target.value }))}
            className={inputClass}
          />

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
