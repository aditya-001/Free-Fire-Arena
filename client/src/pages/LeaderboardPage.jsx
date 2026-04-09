import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axiosInstance";
import LeaderboardTable from "../components/LeaderboardTable";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const tabs = [
  { label: "All India", value: "india" },
  { label: "State", value: "state" },
  { label: "City", value: "city" }
];

const LeaderboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const { user } = useAuth();

  const scope = searchParams.get("scope") || "india";
  const state = user?.location?.state || "Uttar Pradesh";
  const city = user?.location?.city || "Mathura";

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      try {
        const { data } = await api.get("/leaderboard", {
          params: {
            scope,
            state: scope === "state" ? state : undefined,
            city: scope === "city" ? city : undefined,
            limit: 20
          }
        });

        setLeaderboard(data.results);
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [scope, state, city]);

  if (loading) {
    return <LoadingSpinner label="Loading leaderboard..." fullscreen />;
  }

  return (
    <div className="page-content">
      <section className="section-spacing">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Leaderboard</p>
            <h2>Track top players across India, your state and your city.</h2>
            <p className="section-copy">
              State and city filters use your current profile location: {state}, {city}.
            </p>
          </div>
        </div>

        <div className="tab-row">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={`tab-button ${scope === tab.value ? "tab-button--active" : ""}`}
              onClick={() => setSearchParams({ scope: tab.value })}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <LeaderboardTable
          emptyMessage="No leaderboard entries found for the selected region."
          rows={leaderboard}
        />
      </section>
    </div>
  );
};

export default LeaderboardPage;
