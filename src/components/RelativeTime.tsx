
import * as React from 'react';

interface IRelativeTimeProps {
  created_at: string;
}

interface IRelativeTimeState {
  relativeTime: string;
}

const DEFAULT_INTERVAL = 1000;
const MINUTE_INTERVAL = 60000;
const HOUR_INTERVAL = 3600000;

class RelativeTime extends React.Component<IRelativeTimeProps, IRelativeTimeState> {
  private interval: number = DEFAULT_INTERVAL;

  createInterval(time: number): void {
		this.interval = setInterval(()=>{
      this.setState({
        relativeTime: this.relativeTime()
      });
    }, time) as any as number; // YIKES
  }
  
  componentWillMount() {
    this.setState({ relativeTime: this.relativeTime() });
  }
	componentDidMount() {
    this.createInterval(DEFAULT_INTERVAL);
  }
  componentWillUnmount() {
    clearInterval(this.interval);
  }
	relativeTime(): string {
	 	if (!this.props.created_at) return '';    
    const date = new Date(this.props.created_at);
    const diff = ((new Date().getTime() - date.getTime()) / 1000 );
    const day_diff = Math.floor(diff / 86400);
    
    if (isNaN(day_diff) || diff <= 0) {
        return "now";
    }

    if (diff > 62 && diff < 80 ) {
      clearInterval(this.interval);
      this.createInterval(MINUTE_INTERVAL);
    } else if (diff > 3600 && diff < 3680 ) {
      clearInterval(this.interval);
      this.createInterval(HOUR_INTERVAL);
    }
      
    return (
      diff > 0 &&
      (
        day_diff === 0 &&
        (
          (diff < 60 && Math.ceil(diff) + "s") ||
          (diff < 3600 && Math.ceil(diff / 60)  + "m") ||
          (diff < 7200 && "1h") ||
          (diff < 86400 && Math.floor(diff / 3600) + "h")
        ) ||
        (day_diff === 1 && "1d") ||
        (Math.ceil(day_diff) + "d")
      ) || 
      this.props.created_at
    );
	}
  render() {
		return (
			<span className="timestamp">{this.state.relativeTime}</span>
		)
  }
}

export default RelativeTime;
