import React, { Component } from 'react';

class UserList extends Component {
	constructor(props) {
    	super(props);

    	this.state= {
    		sortType: this.props.defaultSort || 'Alphabetical',
            searchString: ""
    	}
	}
	performFilterSort(array,searchString,sortType,label) {
	    function alpha(a,b) {
	        if (a.identity < b.identity) return -1;
	        if (a.identity > b.identity) return 1;
	        return 0;
	    }
	  
	    function type(a,b) { 
	        // bookmarks/favorites..
	        if (!a.favorited && b.favorited) return 1;
	        if (a.favorited && !b.favorited) return -1;
	        if (!a.bookmarked && b.bookmarked) return 1;
	        if (a.bookmarked && !b.bookmarked) return -1;

	        // TODO: gender

	        // alpha 
	        if (a.identity < b.identity) return -1;
	        if (a.identity > b.identity) return 1;
	        return 0;
	    }

	    if (!Array.isArray(array)) {
	        array = Object.values(array);
	    }

	    if (searchString.length) {
	        array = array.filter((obj)=> {
	            return obj.identity.search(new RegExp(searchString, "i")) !== -1;
	        });
	    }
	    
	    // determine which function to use here.
	    switch(sortType) {
	        case 'Alphabetical':
	            return array.sort(alpha);
	        case 'Type':
	            return array.sort(type);
	        default:
	            console.log('invalid sortType',sortType);
	            return array;
	    }
	}
	handleClick(name) {
		if (!name) {
			console.log('whatd you click?',name);
			return;
		}
		this.props.usernameClicked(name);
	}
   	render() {
        const users = this.performFilterSort(this.props.users || [],this.state.searchString,this.state.sortType); //this.state.filteredRooms;
		return (
			<div className={"chat-user-list-contain " + ( this.props.userListOpen ? "" : "full" )}>
				{users && users.map((obj) => {
					// TODO: gender stuff.
					// TODO: status icons.

					return (
						<div className="list-user" key={obj.identity} onClick={() => this.handleClick(obj.identity)}>
							<div className="status-icon"></div>
							<div className="rank-icon"></div>
							<div className="user-name">{obj.identity}</div>
						</div>
					)	
				})}
			</div>
		)
	}
}

export default UserList;