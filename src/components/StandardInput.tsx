
import * as React from 'react';

interface IStandardInputProps {
	type: string;
	iconClass: string;
	inputName: string;
	initialValue?: string;
	onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
	onChange: (inputName: string, value: string) => void;
}

interface IStandardInputState {
	inputValue: string;
}

class StandardInput extends React.Component<IStandardInputProps, IStandardInputState> {
	public state = {
		inputValue: this.props.initialValue || ''
	};

	handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		this.setState({
			inputValue: event.target.value,
		});
		if (this.props.onChange) {
			this.props.onChange(this.props.inputName,event.target.value);
		}
	}
	handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
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

export default StandardInput;
