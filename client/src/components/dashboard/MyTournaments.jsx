import { motion } from "framer-motion";
import TournamentRow from "./TournamentRow";

const MyTournaments = ({ tournaments, onViewDetails }) => (
  <motion.section
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.4 }}
    className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl"
  >
    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-xs tracking-[0.22em] text-cyan-300">MY TOURNAMENTS</p>
        <h3 className="font-['Rajdhani'] text-3xl font-bold text-white">Joined Matches</h3>
      </div>
      <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300">
        {tournaments?.length || 0} joined
      </span>
    </div>

    <div className="space-y-3">
      {tournaments?.length ? (
        tournaments.map((tournament) => (
          <TournamentRow
            key={tournament?._id || `${tournament?.title || tournament?.name}-mine`}
            tournament={tournament}
            onViewDetails={onViewDetails}
          />
        ))
      ) : (
        <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-6 text-sm text-slate-300">
          No joined tournaments yet. Jump into the next room and start earning.
        </div>
      )}
    </div>
  </motion.section>
);

export default MyTournaments;
