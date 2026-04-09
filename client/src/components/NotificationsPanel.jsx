import { BellRing } from "lucide-react";
import { formatRelativeTime } from "../utils/formatters";

const NotificationsPanel = ({ notifications = [], onMarkRead }) => (
  <section className="glass-card panel-section">
    <div className="panel-section__header">
      <div>
        <p className="section-kicker">Notifications</p>
        <h3>Live updates</h3>
      </div>
      <button className="text-button" onClick={onMarkRead} type="button">
        Mark all read
      </button>
    </div>

    <div className="notification-list">
      {notifications.length ? (
        notifications.map((notification) => (
          <article key={notification._id} className={`notification-item ${notification.read ? "" : "notification-item--unread"}`}>
            <BellRing size={16} />
            <div>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
              <span>{formatRelativeTime(notification.createdAt)}</span>
            </div>
          </article>
        ))
      ) : (
        <p className="muted-copy">No updates yet. Tournament alerts will show here.</p>
      )}
    </div>
  </section>
);

export default NotificationsPanel;
