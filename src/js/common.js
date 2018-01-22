import React, { Component } from 'react';

class RelativeTime extends Component {
	relativeTime() {
		// console.log(this.props);
		let time = this.props.created_at;

	 	if (!time) return;

	    // let day,month,year;
	    let date = new Date(time),
	        diff = ( (( new Date().getTime() ) - date.getTime()) / 1000),
	        // day_diff = ( new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()).getTime() - new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime() ) / 1000 / 86400, //
	        day_diff = Math.floor(diff / 86400);
	    
	    if (isNaN(day_diff) || diff <= 0)
	        return (
	        	"now"
	            // year.toString()+'-'+
	            // ((month<10) ? '0'+month.toString() : month.toString())+'-'+
	            // ((day<10) ? '0'+day.toString() : day.toString())
	        );
	    
	    var r = (
	        diff > 0 &&
	        (
	        	// eslint-disable-next-line
	            day_diff === 0 &&
	            (
	                (
	                    (diff < 60 && Math.ceil(diff) + "s") ||
	                    (diff < 3600 && Math.ceil(diff / 60)  + "m") ||
	                    (diff < 7200 && "1h") ||
	                    (diff < 86400 && Math.floor(diff / 3600) + "h")
	                )
	            // eslint-disable-next-line
	            ) ||
	            (day_diff === 1 && "1d") ||
	            (Math.ceil(day_diff) + "d")
	        )
	    );
	    // console.log(r);
	    return r;
	}
   	render() {
   		// console.log(this);
		return (
			<span className="timestamp">{this.relativeTime()}</span>
		) // 
   	}
}

class DropdownMenu extends Component {
	copyTextToClipboard(text) {
		var textArea = document.createElement("textarea");
		textArea.style.position = 'fixed';
		textArea.style.top = 0;
		textArea.style.left = 0;
		textArea.style.width = '2em';
		textArea.style.height = '2em';
		textArea.style.padding = 0;
		textArea.style.border = 'none';
		textArea.style.outline = 'none';
		textArea.style.boxShadow = 'none';
		textArea.style.background = 'transparent';
		textArea.value = text;

		document.body.appendChild(textArea);
		textArea.select();

		try {
			document.execCommand('copy');
			// var successful = document.execCommand('copy');
			// var msg = successful ? 'successful' : 'unsuccessful';
			// console.log('Copying text command was ' + msg);
		} catch (err) {
			console.log('Oops, unable to copy');
		}

		document.body.removeChild(textArea);

		this.props.hideMenu();
	}
	render() {
		if (this.props.tweet) {
			var text;
			if (this.props.tweet.extended_tweet) {
				text = this.props.tweet.extended_tweet.full_text;
			} else if (this.props.tweet.full_text) {
				text = this.props.tweet.full_text;
			} else {
				text = this.props.tweet.text;
			}
			return  (
				<div className={"tweet-menu " + (this.props.visible ? "visible" : "")}>
					<div className="list-item"><div className="list-icon fi-magnifying-glass"></div>Show Details</div>
					<div className="list-item" onClick={() => this.copyTextToClipboard("https://twitter.com/" + this.props.tweet.user.screen_name + "/status/" + this.props.tweet.id_str)}><div className="list-icon fi-quote"></div>Copy Link to Tweet</div>
					<div className="list-item" onClick={() => this.copyTextToClipboard(text)}><div className="list-icon fi-page-copy"></div>Copy Tweet Text</div>
					<a href={"https://twitter.com/" + this.props.tweet.user.screen_name + "/status/" + this.props.tweet.id_str} target="_blank" className="list-item"><div className="list-icon fi-link"></div>View on Twitter.com</a>
					{ this.props.mine && ( <div className="list-item"><div className="list-icon fi-delete"></div>Delete Tweet</div> )}
				</div>
			)
		}
		if (this.props.profile) {
			return  (
				<div className={"tweet-menu " + (this.props.visible ? "visible" : "")}>
					<div className="list-item" onClick={() => this.props.blockUser()}><div className="list-icon fi-prohibited"></div>Block User</div>
					<a href={"https://twitter.com/" + this.props.profile.screen_name } target="_blank" className="list-item"><div className="list-icon fi-link"></div>View on Twitter.com</a>
				</div>
			)
		}
	}
}

class StandardInput extends Component {
	constructor(props) {
    	super(props);
    	this.state = {
    		searchTerm: '',
    	};
    }
	handleChange(event) {
		this.setState({
			searchTerm: event.target.value,
		});
  	}
	render() {
		return (
			<div className="input-form-contain">
				<div className="label">
					{this.props.iconClass && (<div className={"icon "+this.props.iconClass}></div>)}
					<span className={"input-label " + (this.state.searchTerm ? "" : "full" )}>{this.props.inputName}</span>
				</div>
				<input type={this.props.type || "text"} value={this.state.searchTerm} onChange={(event) => this.handleChange(event)} />
			</div>
		);
	}
}
export  { RelativeTime,DropdownMenu,StandardInput };