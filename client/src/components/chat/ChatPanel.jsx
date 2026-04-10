import { SendHorizonal } from "lucide-react";
import { resolveAsset } from "../api/axiosInstance";
import { formatTimeOnly } from "../utils/formatters";

const ChatPanel = ({
  selectedUser,
  messages,
  messageText,
  onMessageChange,
  onSend,
  currentUserId
}) => (
  <section className="glass-card panel-section chat-panel">
    <div className="panel-section__header">
      <div>
        <p className="section-kicker">Private chat</p>
        <h3>{selectedUser ? `Talking to ${selectedUser.username}` : "Pick a player to chat"}</h3>
      </div>
    </div>

    <div className="chat-history">
      {selectedUser ? (
        messages.length ? (
          messages.map((message) => {
            const mine = message.sender?._id === currentUserId || message.sender === currentUserId;

            return (
              <div key={message._id} className={`chat-bubble ${mine ? "chat-bubble--mine" : ""}`}>
                {!mine && selectedUser.profileImage && (
                  <img alt={selectedUser.username} className="chat-avatar" src={resolveAsset(selectedUser.profileImage)} />
                )}
                <div>
                  <p>{message.content}</p>
                  <span>{formatTimeOnly(message.createdAt)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="muted-copy">No messages yet. Start the conversation.</p>
        )
      ) : (
        <p className="muted-copy">Search a player and hit chat to open a private room.</p>
      )}
    </div>

    <form className="chat-form" onSubmit={onSend}>
      <input
        disabled={!selectedUser}
        placeholder={selectedUser ? "Type your message" : "Select a player first"}
        value={messageText}
        onChange={(event) => onMessageChange(event.target.value)}
      />
      <button className="icon-button" disabled={!selectedUser} type="submit">
        <SendHorizonal size={16} />
      </button>
    </form>
  </section>
);

export default ChatPanel;
