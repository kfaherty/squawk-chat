import * as React from "react";
import { avatarUrl } from "../config/api-urls";

export interface IAvatar {
  name: string | undefined;
  type: number;
}

const getAvatar = (type: number, name?: string) => {
  switch (type) {
    case 0:
      return ""; // Default public image
    case 1:
      return ""; // Default private image
    case 2:
      return ""; // Default private invite only image
    case 3: // user image.
      if (name) {
        return avatarUrl + encodeURI(name).toLowerCase() + ".png";
      }
    // eslint-disable-next-line no-fallthrough
    default:
      return ""; // TODO: load a ? avatar here.
  }
};

const Avatar: React.FC<IAvatar> = ({ type, name }) => {
  const iconurl = getAvatar(type, name);
  const avatarStyle = {
    background: "url(" + iconurl + ") no-repeat 50% 50% / cover"
  };

  return <div className="avatar-contain" style={avatarStyle}></div>;
};

export default Avatar;
