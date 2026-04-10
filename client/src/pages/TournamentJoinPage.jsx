import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { CheckCircle2, ImagePlus, ShieldCheck, Swords, TimerReset } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import tournamentService from "../services/tournamentService";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const glassCardClass =
  "rounded-3xl border border-cyan-400/20 bg-[rgba(8,12,24,0.72)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]";

const inputClass =
  "w-full rounded-xl border border-slate-500/40 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.18),0_0_20px_rgba(34,211,238,0.2)]";

const normalizeGameId = (value) => String(value || "").trim().toUpperCase();

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
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const getRegistrationMeta = (tournament, nowMs) => {
  if (!tournament) {
    return {
      closed: false,
      notStarted: false,
      countdownLabel: "Closes in",
      countdownValue: null
    };
  }

  const startMs = toTimestamp(tournament.registrationStartTime);
  const endMs = toTimestamp(
    tournament.registrationEndTime || tournament.startTime || tournament.dateTime
  );

  const closed = endMs !== null && nowMs > endMs;
  const notStarted = !closed && startMs !== null && nowMs < startMs;
  const countdownTarget = notStarted ? startMs : endMs;

  return {
    closed,
    notStarted,
    countdownLabel: notStarted ? "Opens in" : "Closes in",
    countdownValue:
      countdownTarget !== null && !closed ? formatCountdown(countdownTarget - nowMs) : null
  };
};

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load payment gateway"));
    document.body.appendChild(script);
  });

const TournamentJoinPage = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [tournament, setTournament] = useState(location.state?.tournament || null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [registration, setRegistration] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const [teamName, setTeamName] = useState("");
  const [teamLeaderGameId, setTeamLeaderGameId] = useState("");
  const [playerIds, setPlayerIds] = useState(["", "", "", ""]);
  const [soloGameId, setSoloGameId] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadTournament = async () => {
      if (tournament && String(tournament._id) === String(tournamentId)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data } = await tournamentService.getTournaments({ limit: 200 });
        const list = Array.isArray(data) ? data : [];
        const found = list.find((entry) => String(entry._id) === String(tournamentId));

        if (!found) {
          toast.error("Tournament not found");
          navigate("/tournaments", { replace: true });
          return;
        }

        if (mounted) {
          setTournament(found);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load tournament details");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTournament();

    return () => {
      mounted = false;
    };
  }, [tournament, tournamentId, navigate]);

  useEffect(() => {
    return () => {
      if (bannerPreview.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [bannerPreview]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const isSquad = useMemo(
    () => String(tournament?.mode || "").toUpperCase() === "BR",
    [tournament?.mode]
  );

  const registrationMeta = useMemo(
    () => getRegistrationMeta(tournament, nowMs),
    [tournament, nowMs]
  );

  const handlePlayerIdChange = (index, value) => {
    setPlayerIds((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? value : entry))
    );
  };

  const handleBannerChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBannerFile(file);
    setBannerPreview((current) => {
      if (current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
  };

  const validateForm = () => {
    if (!tournament?._id) {
      return "Tournament not found";
    }

    if (isSquad) {
      if (!teamName.trim() || teamName.trim().length < 2) {
        return "Team name is required";
      }

      if (!normalizeGameId(teamLeaderGameId) || normalizeGameId(teamLeaderGameId).length < 3) {
        return "Team leader game ID is required";
      }

      const normalizedPlayers = playerIds.map((entry) => normalizeGameId(entry)).filter(Boolean);
      const uniquePlayers = [...new Set(normalizedPlayers)];

      if (uniquePlayers.length !== 4) {
        return "Please enter exactly 4 unique player IDs";
      }

      if (!bannerFile) {
        return "Team banner image is required for squad registration";
      }

      return null;
    }

    if (!normalizeGameId(soloGameId) || normalizeGameId(soloGameId).length < 3) {
      return "Game ID is required for solo registration";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (registrationMeta.closed) {
      toast.error("Registration closed for this tournament");
      return;
    }

    if (registrationMeta.notStarted) {
      toast.error("Registration has not started yet");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!tournament?._id) {
      toast.error("Tournament not found");
      return;
    }

    const payload = new FormData();
    payload.append("tournamentId", tournament._id);

    if (isSquad) {
      const normalizedPlayers = playerIds.map((entry) => normalizeGameId(entry)).filter(Boolean);

      payload.append("joinType", "squad");
      payload.append("teamName", teamName.trim());
      payload.append("teamLeaderGameId", normalizeGameId(teamLeaderGameId));
      payload.append("players", JSON.stringify(normalizedPlayers));
      payload.append("banner", bannerFile);
    } else {
      payload.append("joinType", "solo");
      payload.append("gameId", normalizeGameId(soloGameId));
    }

    setSubmitting(true);
    try {
      const { data: registrationData } = await tournamentService.registerTournament(payload);
      setRegistration(registrationData);

      const { data: orderData } = await tournamentService.createTournamentPaymentOrder({
        registrationId: registrationData.registrationId,
        method: "UPI"
      });

      setPaymentOrder(orderData);

      if (orderData?.confirmed && orderData?.slotNumber) {
        setBookingSuccess(orderData);
        toast.success(`Slot #${orderData.slotNumber} booked successfully`);
      } else {
        toast.success("Registration saved. Summary ready. Proceed with secure payment.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save tournament registration");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!registration?.registrationId) {
      toast.error("Registration not found");
      return;
    }

    if (!paymentOrder?.orderId) {
      toast.error("Payment order not available. Submit form again.");
      return;
    }

    setPaying(true);
    try {
      await loadRazorpayScript();

      const razorpayResponse = await new Promise((resolve, reject) => {
        const instance = new window.Razorpay({
          key: paymentOrder.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: Math.round(Number(paymentOrder.amount || 0) * 100),
          currency: paymentOrder.currency || "INR",
          name: "EsportWeb Arena",
          description: "Tournament Slot Booking",
          order_id: paymentOrder.orderId,
          theme: {
            color: "#22d3ee"
          },
          handler: (response) => {
            resolve(response);
          }
        });

        instance.on("payment.failed", (response) => {
          reject(new Error(response?.error?.description || "Payment failed"));
        });

        instance.open();
      });

      const { data } = await tournamentService.verifyTournamentPayment({
        registrationId: registration.registrationId,
        orderId: razorpayResponse.razorpay_order_id,
        paymentId: razorpayResponse.razorpay_payment_id,
        signature: razorpayResponse.razorpay_signature,
        method: "UPI"
      });

      setBookingSuccess(data);
      toast.success(`Payment verified. Slot #${data.slotNumber} booked.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment could not be completed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading tournament join form..." fullscreen />;
  }

  if (!tournament) {
    return <LoadingSpinner label="Tournament not available" fullscreen />;
  }

  return (
    <div className="space-y-6">
      <section className={`${glassCardClass} overflow-hidden p-5 sm:p-7`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Join Tournament</p>
            <h2 className="font-['Rajdhani'] text-3xl font-bold text-white sm:text-4xl">
              {tournament.title || tournament.name}
            </h2>
            <p className="mt-2 text-sm text-slate-300/85">
              Mode: {tournament.mode} | Starts: {formatDateTime(tournament.startTime || tournament.dateTime)}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em]">
              <span
                className={`rounded-full border px-3 py-1 ${
                  registrationMeta.closed
                    ? "border-rose-300/50 bg-rose-500/20 text-rose-100"
                    : registrationMeta.notStarted
                      ? "border-amber-300/50 bg-amber-500/20 text-amber-100"
                      : "border-emerald-300/45 bg-emerald-500/20 text-emerald-100"
                }`}
              >
                {registrationMeta.closed
                  ? "Registration Closed"
                  : registrationMeta.notStarted
                    ? "Registration Not Started"
                    : "Registration Open"}
              </span>

              {registrationMeta.countdownValue ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-3 py-1 text-cyan-100">
                  <TimerReset size={13} />
                  {registrationMeta.countdownLabel}: {registrationMeta.countdownValue}
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-100/85">Entry Fee</p>
            <p className="font-['Rajdhani'] text-3xl font-bold text-white">
              {formatCurrency(tournament.entryFee)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSquad ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Team Name
                  <input
                    required
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    className={`${inputClass} mt-1`}
                    placeholder="Enter your squad name"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Team Leader Game ID
                  <input
                    required
                    value={teamLeaderGameId}
                    onChange={(event) => setTeamLeaderGameId(event.target.value)}
                    className={`${inputClass} mt-1`}
                    placeholder="Leader game ID"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-500/25 bg-slate-900/45 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.15em] text-cyan-100/80">Player IDs (4)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {playerIds.map((playerId, index) => (
                    <label key={`player-${index}`} className="text-sm text-slate-300">
                      Player {index + 1}
                      <input
                        required
                        value={playerId}
                        onChange={(event) => handlePlayerIdChange(index, event.target.value)}
                        className={`${inputClass} mt-1`}
                        placeholder={`Player ${index + 1} game ID`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-500/25 bg-slate-900/45 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.15em] text-cyan-100/80">Team Banner Upload</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/60">
                  <ImagePlus size={16} />
                  Upload Banner
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                </label>

                {bannerPreview ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-cyan-300/30 bg-slate-950/60 p-3">
                    <img
                      src={bannerPreview}
                      alt="Team banner preview"
                      className="h-44 w-full rounded-xl object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <label className="text-sm text-slate-300">
              Game ID
              <input
                required
                value={soloGameId}
                onChange={(event) => setSoloGameId(event.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="Enter your game ID"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={submitting || registrationMeta.closed || registrationMeta.notStarted}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/15 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-50"
          >
            <Swords size={16} />
            {submitting
              ? "Saving..."
              : registrationMeta.closed
                ? "Registration Closed"
                : registrationMeta.notStarted
                  ? "Registration Not Started"
                  : "Submit Registration"}
          </button>
        </form>
      </section>

      {registration ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${glassCardClass} p-5 sm:p-7`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-['Rajdhani'] text-2xl font-bold text-white">Registration Summary</h3>
            <span className="rounded-full border border-amber-300/45 bg-amber-500/15 px-3 py-1 text-xs uppercase tracking-[0.14em] text-amber-100">
              {registration.status}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/45 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300/80">Join Type</p>
              <p className="mt-1 font-medium capitalize">{registration.joinType}</p>
            </div>

            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/45 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300/80">Tournament</p>
              <p className="mt-1 font-medium">{registration.tournamentTitle}</p>
            </div>

            {registration.teamName ? (
              <div className="rounded-2xl border border-slate-500/25 bg-slate-900/45 p-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-300/80">Team Name</p>
                <p className="mt-1 font-medium">{registration.teamName}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/45 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300/80">Players / IDs</p>
              <p className="mt-1 font-medium">{(registration.players || []).join(", ")}</p>
            </div>

            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/45 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300/80">Team ID</p>
              <p className="mt-1 font-medium">{registration.teamId || "Pending"}</p>
            </div>

            <div className="rounded-2xl border border-slate-500/25 bg-slate-900/45 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300/80">Amount</p>
              <p className="mt-1 font-medium">{formatCurrency(paymentOrder?.amount || registration.entryFee || 0)}</p>
            </div>
          </div>

          {!bookingSuccess ? (
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={paying || !paymentOrder?.requiresPayment}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/15 px-5 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              <ShieldCheck size={16} />
              {paying ? "Processing..." : paymentOrder?.requiresPayment ? "Proceed to Secure Payment" : "Slot Confirmed"}
            </button>
          ) : null}
        </motion.section>
      ) : null}

      <AnimatePresence>
        {bookingSuccess?.slotNumber ? (
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            className={`${glassCardClass} border-emerald-400/35 p-6 text-center`}
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: [0.9, 1.06, 1] }}
              transition={{ duration: 0.6 }}
              className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-500/20 text-emerald-100"
            >
              <CheckCircle2 size={28} />
            </motion.div>

            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/85">Booking Confirmed</p>
            <h3 className="mt-2 font-['Rajdhani'] text-4xl font-bold text-white">
              Slot #{bookingSuccess.slotNumber}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Team ID: {bookingSuccess.teamId || registration?.teamId || "--"}
            </p>

            <button
              type="button"
              onClick={() => navigate("/tournaments", { replace: true })}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/15 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25"
            >
              <Swords size={16} />
              Back to Tournaments
            </button>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default TournamentJoinPage;
