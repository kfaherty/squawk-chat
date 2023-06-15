// notification
import * as React from 'react';
import { ToastContainer, toast } from 'react-toastify';

interface INotification {
	icon: string;
	text: string;
	closeToast(): void;
}

class NotificationTemplate extends React.Component<INotification, {}> {
  render(){
    return (
        <div className="toast-item">
          <div className="content-wrap">
            <div className={"toast-icon " + this.props.icon}></div>
          <div className="toast-content">{this.props.text}</div>
        </div>
        <button onClick={this.props.closeToast}>Dismiss</button>
      </div>
    );
  }
}

const createToast: (icon: string, text: string, closeToast: () => void) => void = (icon, text, closeToast) => {
	toast(<NotificationTemplate text={text} icon={icon} closeToast={closeToast}/>)
}

const Notifications: React.StatelessComponent = () => 
	<ToastContainer autoClose={15000} />

export default { createToast, Notifications };
