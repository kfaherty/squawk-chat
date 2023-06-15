import * as React from 'react';
import { avatarUrl } from '../config/api-urls';

export interface IAvatar {
  name: string;
  type: number;
}

class Avatar extends React.Component<IAvatar> {
	render() {
		let iconurl = '';
		switch(this.props.type) {
			case 0:
				iconurl = ''; // Default public image
				break;
			case 1:
				iconurl = ''; // Default private image
				break;
			case 2:
				iconurl = ''; // Default private invite only image
				break;
			case 3:
				if (this.props.name) {
					iconurl = avatarUrl+encodeURI(this.props.name).toLowerCase()+'.png';
				}
				break;
			case 4: 
				iconurl = ''; // TODO: load a ? avatar here.
			default:
				break;
    }
 
		const avatarStyle = {
			background: 'url(' + iconurl + ') no-repeat 50% 50% / cover',
		};
		return (
			<div className="avatar-contain" style={avatarStyle}></div>
		)
	}
}

export default Avatar;
