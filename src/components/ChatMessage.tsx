import React from "react";
import RelativeTime from "./RelativeTime";
import { ParsedText } from "./Tags";
import Avatar from "./Avatar";

interface IChatMessage {
  usernameClicked(name: string): void;
  data: any; // TODO: fix
}

const ChatMessage: React.FC<IChatMessage> = ({ data: message }) => {
  if (message.systemMessage) {
    return (
      <div className="system-message">
        <div className={"system-message-icon " + message.icon}></div>
        <ParsedText character={""} text={message.message} />
      </div>
    );
  }

  return (
    <div
      className={
        "chat-message " +
        (message.mine ? "mine " : "") +
        (message.ping ? "ping " : "") +
        (message.friend ? "friend " : "") +
        (message.bookmark ? "bookmark " : "")
      }
    >
      <Avatar name={message.character} type={3} />
      <div className={"status-badge " + message.status}></div>

      <div className="user-name">{message.character}</div>

      <RelativeTime created_at={message.timestamp} />
      <div className="message">
        <ParsedText character={message.character} text={message.message} />
      </div>
    </div>
  );
};

export default ChatMessage;
