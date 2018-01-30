import React, { Component } from 'react';
import parser, { Tag } from 'bbcode-to-react';

function performFilterSort(array,searchString,sortType,label) {
	// if (!array) {
	// 	console.log('missing stuff');
	// 	return;
	// }

    function alpha(a,b) {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    }
    function population(a,b) {
        // pop
        if (a.characters > b.characters) return -1;
        if (a.characters < b.characters) return 1;
        
        //alpha
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    }
    function type(a,b) { 
        // bookmarks/favorites..
        if (!a.favorited && b.favorited) return 1;
        if (a.favorited && !b.favorited) return -1;
        if (!a.bookmarked && b.bookmarked) return 1;
        if (a.bookmarked && !b.bookmarked) return -1;

        // channel type
        if (a.type < b.type) return -1;
        if (a.type > b.type) return 1;

        // alpha 
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    }
    function newest(a,b) {
        if (a.timestamp > b.timestamp) return -1;
        if (a.timestamp < b.timestamp) return 1;
        
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    }
    function oldest(a,b) {
        if (a.timestamp < b.timestamp) return -1;
        if (a.timestamp > b.timestamp) return 1;
        
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    }

    if (!Array.isArray(array)) {
        array = Object.values(array);
    }

    switch(label) {
        // type:
        // 0 is public
        // 1 is private
        // 2 is private invite only
        // 3 is private PM

        case 'messages':
            break;
        case 'channels':
            array = array.filter((obj)=> {
                return obj.type < 2;
            });
            break;
        case 'friends':
            array = array.filter((obj)=> {
                return obj.type == 3;
            });
            break;
        default:
            // console.log('missing label',array,label);
            break;
    }


    if (searchString.length) {
        array = array.filter((obj)=> {
            return obj.name.search(new RegExp(searchString, "i")) !== -1;
        });
    }
    
    // determine which function to use here.
    switch(sortType) {
        case 'Alphabetical':
            return array.sort(alpha);
        case 'Population':
            return array.sort(population);
        case 'Type':
            return array.sort(type);
        case 'Newest First':
            return array.sort(newest);
        case 'Oldest First':
            return array.sort(oldest);
        default:
            console.log('invalid sortType',sortType);
            return array;
    }
}


class RelativeTime extends Component {
	constructor(props) {
		super(props)
		this.state = {
			relativeTime: this.relativeTime()
		}
	}
	componentDidMount() {
    	this.interval = setInterval(()=>{
    		this.setState({
    			relativeTime: this.relativeTime()
    		});
    	}, 1000);
  	}
  	componentWillUnmount() {
    	clearInterval(this.interval);
  	}
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
			<span className="timestamp">{this.state.relativeTime}</span>
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
    		inputValue: '',
    	};
    }
	handleChange(event) {
		this.setState({
			inputValue: event.target.value,
		});
		if (this.props.onChange) {
			this.props.onChange(this.props.inputName,event.target.value);
		}
  	}
  	handleKeyDown(event) {
  		if (this.props.onKeyDown) {
  			this.props.onKeyDown(event);
  		}
  	}
	render() {
		return (
			<div className="input-form-contain">
				<div className="label">
					{this.props.iconClass && (<div className={"icon "+this.props.iconClass}></div>)}
					<span className={"input-label " + (this.state.inputValue ? "" : "full" )}>{this.props.inputName}</span>
				</div>
				<input type={this.props.type || "text"} value={this.state.inputValue} onChange={(event) => this.handleChange(event)} onKeyDown={(event) => this.handleKeyDown(event)} />
			</div>
		);
	}
}

class noparseTag extends Tag {
  	toReact() {
  		// console.log(this.getContent(true));
    	return (<p>{this.getContent(true)}</p>);
  	}
}
class urlTag extends Tag {
  	toReact() {
  		const url = this.params.url || this.getContent(true);
  		const body = this.getContent(true) || this.params.url();
    	return (
      		<a href={url}>{body}</a>
    	);
  	}
}
class supTag extends Tag {
  	toReact() {
    	return (<sup>{this.getComponents()}</sup>);
  	}
}
class subTag extends Tag {
  	toReact() {
    	return (<sub>{this.getComponents()}</sub>);
  	}
}
class meTag extends Tag {
	toReact() {
    	return (<span className="action">{this.getContent(true)}</span>);
  	}
}
parser.registerTag('noparse', noparseTag);
parser.registerTag('url', urlTag);
parser.registerTag('sup', supTag);
parser.registerTag('sub', subTag);
parser.registerTag('averyunlikelytag',meTag)
// TODO: icon

// TODO: eicon

// TODO: user // can we calculate this?

class ParsedText extends Component {
	render() {
		let text = this.props.text || '';

		if (text.startsWith('/me')) { // this runs on the chat.js parsing.
			text = text.replace("/me", ( '[averyunlikelytag]'+(this.props.character || '')+'[/averyunlikelytag]' )); // handle /me in here.
		}

		return (
		    <span>{parser.toReact(text)}</span>
		)
	}
}

export  { performFilterSort,RelativeTime,DropdownMenu,StandardInput,ParsedText };