import React, { Component } from "react";
import StandardInput from "./StandardInput";
import { VALID_USER_STATUS } from "../interfaces";

interface IStatusModalProps {
  currentStatus: VALID_USER_STATUS;
  currentStatusMessage: string;
  full: boolean;
  showStatusModal: boolean;
  closeModal: () => void;
  updateStatus: (value: string, message: string) => void;
}

interface IStatusModalState {
  statusMenuOpen: boolean;
  currentStatus: VALID_USER_STATUS;
  // currentStatusMessage: string;
}

class StatusModal extends Component<IStatusModalProps, IStatusModalState> {
  private message: string;

  constructor(props: IStatusModalProps) {
    super(props);

    this.state = {
      statusMenuOpen: false,
      currentStatus: this.props.currentStatus || "online"
    };

    this.message = this.props.currentStatusMessage || "";
    // this.status = this.props.currentStatus || 'online';

    this.handleFieldChange = this.handleFieldChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      // escape cancels
      this.props.closeModal();
    }
    if (event.key === "Enter") {
      // enter submits
      this.submitStatus(this.state.currentStatus, this.message);
    }
  }
  handleFieldChange(name: string, value: string) {
    switch (name) {
      case "Status Message":
        this.message = value;
        break;
      default:
        break;
    }
  }

  toggleStatusMenu() {
    this.setState({ statusMenuOpen: !this.state.statusMenuOpen });
  }
  setStatus(value: string | null) {
    if (!value) return;
    // this.status = value;
    this.setState({
      statusMenuOpen: false,
      currentStatus: value as VALID_USER_STATUS
    });
    this.submitStatus(value, this.message);
  }

  submitStatus(value: string, message: string) {
    this.props.updateStatus(value, message);
  }
  closeModal() {
    this.props.closeModal();
  }

  render() {
    return (
      <div
        className={
          "status-modal " +
          (this.props.full ? "" : "full ") +
          (this.props.showStatusModal ? "visible" : "")
        }
      >
        <div className="status-type" onClick={() => this.toggleStatusMenu()}>
          <div className={"status-badge " + this.state.currentStatus}></div>
          <div className="status-text">{this.state.currentStatus}</div>
          <div
            className={"arrow " + (this.state.statusMenuOpen ? "flipped" : "")}
          ></div>
        </div>
        <div
          className={"dropdown " + (this.state.statusMenuOpen ? "visible" : "")}
        >
          <div className="list-item" onClick={() => this.setStatus("online")}>
            {" "}
            <div className="list-icon status-badge online"></div>{" "}
            <span>Online</span>
          </div>
          <div className="list-item" onClick={() => this.setStatus("looking")}>
            {" "}
            <div className="list-icon status-badge looking"></div>{" "}
            <span>Looking</span>
          </div>
          <div className="list-item" onClick={() => this.setStatus("idle")}>
            {" "}
            <div className="list-icon status-badge idle"></div>{" "}
            <span>Idle</span>
          </div>
          <div className="list-item" onClick={() => this.setStatus("busy")}>
            {" "}
            <div className="list-icon status-badge busy"></div>{" "}
            <span>Busy</span>
          </div>
          <div className="list-item" onClick={() => this.setStatus("dnd")}>
            {" "}
            <div className="list-icon status-badge dnd"></div> <span>Dnd</span>
          </div>
          <div className="list-item" onClick={() => this.setStatus("away")}>
            {" "}
            <div className="list-icon status-badge away"></div>{" "}
            <span>Away</span>
          </div>
        </div>
        <div className="status-input">
          <StandardInput
            inputName="Status Message"
            initialValue={this.props.currentStatusMessage}
            iconClass="fi-text-color"
            onChange={this.handleFieldChange}
            onKeyDown={this.handleKeyDown}
          />
        </div>
      </div>
    );
  }
}

export default StatusModal;
