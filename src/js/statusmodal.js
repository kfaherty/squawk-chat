import React, { Component } from 'react';
import { StandardInput } from './common';

class StatusModal extends Component {
	handleKeyDown() {
		// enter submits
		// escape cancels
	}
	handleFieldChange() {
		// update this.
	}
	closeModal() {
		this.props.closeModal();
	}
    render(){
	    return (
        	<div className={"status-modal " + (this.props.full ? "full " :"") + (this.props.showStatusModal ? "visible" :"")}>
	    		<div className="status-type">
					<div className={"status-badge " + this.props.currentStatus}></div>
	    			<div className="status-text">{this.props.currentStatus}</div>
		            <div className="arrow"></div>
	    		</div>
            	<div className="status-input">
					<StandardInput 
						inputName='Status Message' 
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