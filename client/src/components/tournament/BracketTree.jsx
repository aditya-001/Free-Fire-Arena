const roundSpacingClass = (roundKey) => {
  if (roundKey === "semifinal") return "space-y-16 pt-12";
  if (roundKey === "final") return "space-y-0 pt-28";
  return "space-y-5";
};

const statusTone = (status) => {
  if (status === "completed") {
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
  }

  if (status === "live") {
    return "border-cyan-300/35 bg-cyan-500/15 text-cyan-100";
  }

  return "border-white/15 bg-white/[0.05] text-white/70";
};

const TeamSlot = ({
  slot,
  selected,
  winner,
  adminMode,
  canPickWinner,
  onClick
}) => {
  const sharedClass =
    "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition";

  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate font-medium text-white">
          {slot.team?.teamName || "TBD"}
        </p>
        <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/55">
          {slot.team?.teamId || slot.sourceMatchLabel || "Awaiting winner"}
        </p>
      </div>

      {winner ? (
        <span className="shrink-0 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
          Winner
        </span>
      ) : null}
    </>
  );

  const className = `${sharedClass} ${
    winner
      ? "border-emerald-400/45 bg-emerald-500/15"
      : selected
        ? "border-fuchsia-400/55 bg-fuchsia-500/16"
        : "border-white/10 bg-white/[0.03]"
  } ${canPickWinner ? "hover:border-fuchsia-300/65 hover:bg-fuchsia-500/12" : ""}`;

  if (adminMode && canPickWinner && slot.teamId) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
};

const BracketTree = ({
  bracket,
  adminMode = false,
  winnerSelections = {},
  savingMatchId = "",
  onWinnerChange,
  onWinnerSubmit,
  emptyMessage = "Bracket not available yet."
}) => {
  if (!bracket?.enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm text-white/65">
        {emptyMessage}
      </div>
    );
  }

  const rounds = Array.isArray(bracket.rounds) ? bracket.rounds : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/70">
          {bracket.completedMatches}/{bracket.totalMatches} matches complete
        </span>
        {bracket.champion ? (
          <span className="rounded-full border border-amber-300/45 bg-amber-500/15 px-3 py-1 text-xs uppercase tracking-[0.15em] text-amber-100">
            Champion: {bracket.champion.teamName}
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[900px] items-start gap-6">
          {rounds.map((round) => (
            <div key={round.key} className="min-w-[260px] flex-1">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Round</p>
                  <h4 className="font-['Rajdhani'] text-2xl font-bold text-white">{round.label}</h4>
                </div>
                <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-white/60">
                  {round.matches.length} matches
                </span>
              </div>

              <div className={roundSpacingClass(round.key)}>
                {round.matches.map((match) => {
                  const selectedWinner = winnerSelections[match._id] || match.winnerTeamId || "";
                  const canSubmitWinner =
                    adminMode &&
                    match.canReportWinner &&
                    Boolean(selectedWinner) &&
                    selectedWinner !== match.winnerTeamId;

                  return (
                    <div
                      key={match._id}
                      className="relative rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_18px_45px_rgba(2,6,23,0.38)]"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
                            {match.matchLabel}
                          </p>
                          <p className="text-sm text-white/80">Match #{match.matchNumber}</p>
                        </div>

                        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${statusTone(match.status)}`}>
                          {match.status}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {match.teams.map((slot) => (
                          <TeamSlot
                            key={`${match._id}-${slot.slotNumber}`}
                            slot={slot}
                            adminMode={adminMode}
                            canPickWinner={match.canReportWinner}
                            selected={selectedWinner === slot.teamId && !match.winnerTeamId}
                            winner={match.winnerTeamId === slot.teamId}
                            onClick={() => onWinnerChange?.(match._id, slot.teamId)}
                          />
                        ))}
                      </div>

                      {adminMode && match.canReportWinner ? (
                        <button
                          type="button"
                          onClick={() => onWinnerSubmit?.(match._id)}
                          disabled={!canSubmitWinner || savingMatchId === match._id}
                          className="mt-4 w-full rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/16 px-4 py-2 text-sm font-medium text-white transition hover:bg-fuchsia-500/24 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingMatchId === match._id ? "Advancing..." : "Advance Winner"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketTree;
