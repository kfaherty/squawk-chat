import * as React from "react";

interface IUserProfile {
  userListOpen: boolean;
}

class UserProfile extends React.Component<IUserProfile> {
  render() {
    return (
      <div
        className={
          "chat-user-profile-contain " + (this.props.userListOpen ? "" : "full")
        }
      >
        profile.
      </div>
    );
  }
}

export default UserProfile;
