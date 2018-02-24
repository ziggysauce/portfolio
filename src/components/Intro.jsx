import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Intro extends Component {
	
  render() {
		return (
			<div className="intro">
				<div className="intro-left">
					<h2>Hello.</h2>
					<p>My name is Dan Nguyen.</p>
				</div>
				<div className="intro-right">
					<p>I'm a passionate front-end web developer based in DC.</p>
				</div>
			</div>
		);
  }
}