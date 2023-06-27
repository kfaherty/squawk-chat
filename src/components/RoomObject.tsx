import React from "react";

import Avatar from "./Avatar";
import { ParsedText } from "./Tags";
import RelativeTime from "./RelativeTime";

interface IRoomObject {
  user: any; //TODO: typedef this.
  setSelectedChat: () => void; // TODO: type.
}

export const RoomShortObject: React.FC<IRoomObject> = ({
  user,
  setSelectedChat
}) => {
  const roomObjectClicked: React.MouseEventHandler<HTMLDivElement> =
    React.useCallback(() => {
      setSelectedChat();
    }, [setSelectedChat]);

  return (
    <div
      className={"room-object short " + (user.selected ? "selected" : "")}
      onClick={roomObjectClicked}
    >
      <Avatar name={user.name} type={user.type} />

      <div className={"unread-badge " + (user.unread > 0 ? "" : "hidden")}>
        {user.unread}
      </div>

      {user.type === 3 && (
        <div className={"status-badge " + (user.status || "Unknown")}></div>
      )}

      <div className="details-contain">
        <div className="user-name">{user.name}</div>
        {(() => {
          switch (user.type) {
            case 0:
              return (
                <div className="message-type">
                  Public Channel: {user.population}
                </div>
              );
            case 1:
              return (
                <div className="message-type">
                  Private Channel: {user.population}
                </div>
              );
            case 2:
              return (
                <div className="message-type">
                  Invite Only: {user.population}
                </div>
              );
            case 3:
              switch (user.typing) {
                case "typing":
                  return (
                    <div className="message-type">
                      {user.channel} is typing..
                    </div>
                  );
                case "paused":
                  return (
                    <div className="message-type">
                      {user.channel} has entered text
                    </div>
                  );
                case "clear":
                  return (
                    <div className="message-type">
                      <span className="user-status">
                        {user.status || "Unknown"}
                      </span>
                      {user.statusmsg && (
                        <ParsedText
                          character={user.name}
                          text={": " + user.statusmsg}
                        />
                      )}
                    </div>
                  );
                default:
                  return (
                    <div className="message-type">
                      <span className="user-status">
                        {user.status || "Unknown"}
                      </span>
                      {user.statusmsg && (
                        <ParsedText
                          character={user.name}
                          text={": " + user.statusmsg}
                        />
                      )}
                    </div>
                  );
              }
            default:
              return "";
          }
        })()}
      </div>
    </div>
  );
};

export const RoomObject: React.FC<IRoomObject> = ({
  user,
  setSelectedChat
}) => {
  const roomObjectClicked: React.MouseEventHandler<HTMLDivElement> =
    React.useCallback(() => {
      setSelectedChat();
    }, [setSelectedChat]);
  return (
    <div
      className={"room-object " + (user.selected ? "selected" : "")}
      onClick={roomObjectClicked}
    >
      <Avatar name={user.name} type={user.type} />

      <div className={"unread-badge " + (user.unread > 0 ? "" : "hidden")}>
        {user.unread}
      </div>

      {user.type === 3 && (
        <div className={"status-badge " + (user.status || "Unknown")}></div>
      )}

      <div className="user-icon-contain">
        <div
          className={"user-icon fi-star " + (user.friend ? "active" : "")}
        ></div>
        <div
          className={"user-icon fi-bookmark " + (user.bookmark ? "active" : "")}
        ></div>
      </div>

      <div className="details-contain">
        <div className="user-name">{user.name}</div>
        {(() => {
          switch (user.type) {
            case 0:
              return (
                <div className="message-type">
                  Public Channel: {user.population}
                </div>
              );
            case 1:
              return (
                <div className="message-type">
                  Private Channel: {user.population}
                </div>
              );
            case 2:
              return (
                <div className="message-type">
                  Invite Only: {user.population}
                </div>
              );
            case 3:
              switch (user.typing) {
                case "typing":
                  return (
                    <div className="message-type">
                      {user.channel} is typing..
                    </div>
                  );
                case "paused":
                  return (
                    <div className="message-type">
                      {user.channel} has entered text
                    </div>
                  );
                case "clear":
                  return (
                    <div className="message-type">
                      <span className="user-status">
                        {user.status || "Unknown"}
                      </span>
                      {user.statusmsg && (
                        <ParsedText
                          character={user.name}
                          text={": " + user.statusmsg}
                        />
                      )}
                    </div>
                  );
                default:
                  return (
                    <div className="message-type">
                      <span className="user-status">
                        {user.status || "Unknown"}
                      </span>
                      {user.statusmsg && (
                        <ParsedText
                          character={user.name}
                          text={": " + user.statusmsg}
                        />
                      )}
                    </div>
                  );
              }
            default:
              return "";
          }
        })()}
        <div className="snippet">
          {user.lastUser && (
            <span className="user-from">{user.lastUser}: </span>
          )}
          {user.lastMessage ? (
            <ParsedText character={user.lastUser} text={user.lastMessage} />
          ) : (
            "No messages to show"
          )}
        </div>
      </div>

      <RelativeTime created_at={user.timestamp} />
    </div>
  );
};
