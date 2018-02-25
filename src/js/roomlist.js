
import React, { Component } from 'react';
import { StandardInput } from './common';
import { RoomObject,RoomShortObject } from './roomobject';

class RoomList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sortType: this.props.defaultSort || 'Alphabetical',
            sortMenuOpen: false,
            selectedChat: null,
            searchString: ""
        };
        this.handleFieldChange = this.handleFieldChange.bind(this);     
    }
    performFilterSort(array,searchString,sortType,label) {
        function alpha(a,b) {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        }
        function population(a,b) {
            // pop
            if (a.population > b.population) return -1;
            if (a.population < b.population) return 1;
            
            //alpha
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

            // channel type
            if (a.type < b.type) return -1;
            if (a.type > b.type) return 1;

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
            case 'Status':
                return array.sort(status);
            case 'Newest First':
                return array.sort(newest);
            case 'Oldest First':
                return array.sort(oldest);
            default:
                console.log('invalid sortType',sortType);
                return array;
        }
    }
    toggleSortMenu() {
        this.setState({sortMenuOpen: !this.state.sortMenuOpen });
    }
    
    changeSort(value) {
        this.toggleSortMenu();
        this.setState({
            sortType:value,
        });
    }
    
    handleFieldChange(name,value) {
        this.setState({
            searchString:value,
        });
    }

    setSelectedChat(channelName,type) {
        // console.log(channelid);
        // this goes to root so root can tell chat-window.
        this.props.setSelectedChat(channelName,type);
    }

    render() {
        const rooms = this.performFilterSort(this.props.rooms || [],this.state.searchString,this.state.sortType,this.props.label);
        return (
            <div className={"room-list-contain " + this.props.label+" " + (this.props.activeTab ? "visible" : "")}>
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
                    <div className="list-item" onClick={() => this.changeSort('Population')}><div className="list-icon fi-torsos"></div>Population</div>
                    <div className="list-item" onClick={() => this.changeSort('Type')}><div className="list-icon fi-filter"></div>Type</div>
                    <div className="list-item" onClick={() => this.changeSort('Status')}><div className="list-icon fi-filter"></div>Status</div>
                    <div className="list-item" onClick={() => this.changeSort('Newest First')}><div className="list-icon fi-arrow-up"></div>Newest First</div>
                    <div className="list-item" onClick={() => this.changeSort('Oldest First')}><div className="list-icon fi-arrow-down"></div>Oldest First</div>
                </div>

                <div className="room-list">
                    {rooms.map((obj) => {
                        obj.selected = ( obj.name === this.props.selectedChat ? 'selected' : '' );
                        if (this.props.label === 'messages'){
                            return (
                                <RoomObject 
                                    key={obj.channel}
                                    user={obj}
                                    setSelectedChat={() => this.setSelectedChat(obj.channel,obj.type)}
                                />
                            );
                        } else {
                            return (
                                <RoomShortObject 
                                    key={obj.channel}
                                    user={obj}
                                    setSelectedChat={() => this.setSelectedChat(obj.channel,obj.type)}
                                />
                            );
                        }
                    })}   
                    <div className={'no-rooms ' + (rooms.length ? "hidden" : "")}>No {this.props.label} to show</div>
                </div>
            </div>
        );
    }
}

export default RoomList;