import { Activity, BadgeIndianRupee, LayoutDashboard, LogOut, ShieldAlert, Swords, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const links = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/tournaments/control", label: "Tournament Control", icon: Trophy },
  { to: "/admin/tournaments/manage", label: "Manage Tournaments", icon: ShieldAlert },
  { to: "/admin/matches/control", label: "Match Control", icon: Swords },
  { to: "/admin/matches/result-entry", label: "Result Entry", icon: Activity },
  { to: "/admin/matches/edit", label: "Edit Result", icon: ShieldAlert },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: BadgeIndianRupee }
];

const resolveTitle = (pathname) => {
  const active = links.find((item) => pathname.startsWith(item.to));
  return active?.label || "Command Center";
};

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090512] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-14 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-rose-500/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-violet-600/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/65 p-6 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-2 text-rose-300">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="font-['Rajdhani'] text-xl font-bold tracking-[0.08em]">Arena Admin</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Control Layer</p>
            </div>
          </div>

          <nav className="space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                    isActive
                      ? "border-rose-400/50 bg-rose-500/20 text-white"
                      : "border-transparent bg-white/[0.03] text-white/70 hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10 hover:text-white"
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <Icon size={16} />
                  <span className="font-medium">{label}</span>
                </span>
                <Activity size={14} className="opacity-0 transition group-hover:opacity-100" />
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/75 transition hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-white"
          >
            <LogOut size={16} />
            Exit Admin
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/55 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-rose-200/80">Admin Console</p>
                <h1 className="font-['Rajdhani'] text-3xl font-bold tracking-wide text-white">
                  {resolveTitle(location.pathname)}
                </h1>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-500" />
                <div>
                  <p className="text-sm font-semibold text-white">{user?.username || "Admin"}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/60">{user?.gameId || "secured"}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition ${
                      isActive
                        ? "border-rose-400/60 bg-rose-500/20 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/70"
                    }`
                  }
                >
                  <Icon size={14} />
                  {label}
                </NavLink>
              ))}
            </div>
          </header>

          <motion.main
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
