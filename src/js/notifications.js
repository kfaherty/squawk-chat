// notification

import React, { Component } from 'react';
import { ToastContainer, toast } from 'react-toastify';

class NotificationTemplate extends Component {
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


function createToast(icon,text) {
	toast(<NotificationTemplate text={text} icon={icon} />)
}

class Notifications extends Component {
    render() {
	    return (
          	<ToastContainer autoClose={15000} />
      	);
    }
}

export default { createToast, Notifications };