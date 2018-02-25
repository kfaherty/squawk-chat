import React, { Component } from 'react';
import { Avatar,StandardInput } from './common';

class UserList extends Component {
	constructor(props) {
    	super(props);

    	this.state= {
    		sortType: this.props.defaultSort || 'Status',
            searchString: "",
            sortMenuOpen: false,
    	}

        this.handleFieldChange = this.handleFieldChange.bind(this);
	}
	performFilterSort(array,searchString,sortType,label) {
	    function alpha(a,b) {
	        if (a.name < b.name) return -1;
	        if (a.name > b.name) return 1;
	        return 0;
	    }
	  
	    function type(a,b) { 
	        // bookmarks/favorites..
	    	if (a.favorite && !b.favorite) return 1;
            if (!a.favorite && b.favorite) return -1;
            if (a.friend && !b.friend) return 1;
            if (!a.friend && b.friend) return -1;
            if (a.bookmark && !b.bookmark) return 1;
            if (!a.bookmark && b.bookmark) return -1;

	        // alpha 
	        if (a.name < b.name) return -1;
	        if (a.name > b.name) return 1;
	        return 0;
	    }

	    function status(a,b) {
            // looking
            if (a.status === 'looking' && b.status !== 'looking') return -1;
            if (a.status !== 'looking' && b.status === 'looking') return 1;
            // online
            if (a.status === 'online' && b.status !== 'online') return -1;
            if (a.status !== 'online' && b.status === 'online') return 1;
            // everything else
            if (a.status !== 'offline' && b.status === 'offline') return -1;
            if (a.status === 'offline' && b.status !== 'offline') return 1;

            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        }

	    if (!Array.isArray(array)) {
	        array = Object.values(array);
	    }

	    if (searchString.length && array.length) {
	        array = array.filter((obj)=> {
	            return obj.name.search(new RegExp(searchString, "i")) !== -1;
	        });
	    }
	    
	    // determine which function to use here.
	    switch(sortType) {
	        case 'Alphabetical':
	            return array.sort(alpha);
	        case 'Type':
	            return array.sort(type);
	        case 'Status':
	            return array.sort(status);
	        default:
	            console.log('invalid sortType',sortType);
	            return array;
	    }
	}
    toggleSortMenu() {
        this.setState({sortMenuOpen: !this.state.sortMenuOpen });
    }
    handleFieldChange(name,value) {
        this.setState({
            searchString:value,
        });
	}
	changeSort(value) {
        this.toggleSortMenu();
        this.setState({
            sortType:value,
        });
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
				<div className="search">
                    <StandardInput 
                        iconClass="fi-magnifying-glass"
                        inputName='Search' 
                        onChange={this.handleFieldChange}
                    />
                </div>

                <div className="sort" onClick={() => this.toggleSortMenu()}>
                  	<div className="label">Sort: {this.state.sortType}</div>
                    <div className={"arrow " + (this.state.sortMenuOpen ? "flipped" : "")}></div>
                </div>
                <div className={"dropdown " + (this.state.sortMenuOpen ? "visible" : "")}>
                    <div className="list-item" onClick={() => this.changeSort('Alphabetical')}><div className="list-icon fi-text-color"></div>Alphabetical</div>
                    <div className="list-item" onClick={() => this.changeSort('Type')}><div className="list-icon fi-filter"></div>Type</div>
                    <div className="list-item" onClick={() => this.changeSort('Status')}><div className="list-icon fi-pencil"></div>Status</div>
                </div>

                <div className="users-scroll">
					{users && users.map((obj) => {
						return (
							<div className="list-user" key={obj.name} onClick={() => this.handleClick(obj.name)}>
								<Avatar name={obj.name} type={3} />
								<div className={"status-badge " + obj.status}></div>

								<div className="rank-icon"></div>
								<div className="user-name">{obj.name}</div>
							</div>
						)	
					})}
				</div>
			</div>
		)
	}
}

export default UserList;