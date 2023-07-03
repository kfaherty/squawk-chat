import * as React from "react";
import * as parser from "bbcode-to-react";
import { Tag } from "bbcode-to-react";

import { avatarUrl, characterUrl, eiconUrl } from "../config/api-urls";

export class noparseTag extends Tag {
  toReact() {
    return <p>{this.getContent(true)}</p>;
  }
}

export class urlTag extends Tag {
  toReact() {
    const url = this.params.url || this.getContent(true);
    const body = this.getContent(true) || this.params.url;
    return (
      <a target="_blank" href={url}>
        {body}
      </a>
    );
  }
}

export class supTag extends Tag {
  toReact() {
    return <sup>{this.getComponents()}</sup>;
  }
}

export class subTag extends Tag {
  toReact() {
    return <sub>{this.getComponents()}</sub>;
  }
}

export class meTag extends Tag {
  toReact() {
    return <span className="action">{this.getContent(true)}</span>;
  }
}

export class iconTag extends Tag {
  toReact() {
    return (
      <a target="_blank" href={characterUrl + this.getContent(true)}>
        <img
          className="icon"
          src={avatarUrl + this.getContent(true) + ".png"}
          alt={this.getContent(true)}
        />
      </a>
    );
  }
}

export class eiconTag extends Tag {
  toReact() {
    return (
      <img
        className="ecion"
        src={eiconUrl + this.getContent(true) + ".gif"}
        alt={this.getContent(true)}
      />
    );
  }
}

export class userTag extends Tag {
  toReact() {
    return (
      <a target="_blank" href={characterUrl + this.getContent(true)}>
        {this.getContent(true)}
      </a>
    );
  }
}

export class sessionTag extends Tag {
  toReact() {
    return (
      <span
        className="session" /* TODO: onClick={() => joinChannel(this.getContent(true))} */
      >
        <span className="session-icon fi-lock"></span>
        {this.params.session}
      </span>
    );
  }
}

parser.registerTag("noparse", noparseTag);
parser.registerTag("url", urlTag);
parser.registerTag("sup", supTag);
parser.registerTag("sub", subTag);
parser.registerTag("averyunlikelytag", meTag);
parser.registerTag("icon", iconTag);
parser.registerTag("eicon", eiconTag);
parser.registerTag("user", userTag);
parser.registerTag("session", sessionTag);

interface IParsedText {
  text?: string;
  character?: string;
}

export class ParsedText extends React.Component<IParsedText> {
  render(): JSX.Element | null {
    if (!this.props.text) {
      return null;
    }

    // this runs on the chat.js parsing.
    const text = this.props.text.startsWith("/me") // handle /me in here.
      ? this.props.text!.replace(
          "/me",
          "[averyunlikelytag]" +
            (this.props.character || "") +
            "[/averyunlikelytag]"
        )
      : this.props.text;

    return <span>{parser.toReact(text)}</span>;
  }
}
