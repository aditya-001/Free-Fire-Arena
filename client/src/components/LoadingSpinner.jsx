const LoadingSpinner = ({ label = "Loading...", fullscreen = false }) => (
  <div className={`loading-shell ${fullscreen ? "loading-shell--fullscreen" : ""}`}>
    <div className="spinner" />
    <p>{label}</p>
  </div>
);

export default LoadingSpinner;
