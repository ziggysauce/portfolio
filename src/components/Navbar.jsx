import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Navbar extends Component {
	
  render() {
		return (
			<div className="navbar">
				<a href="#" className="navbar__logo">
					dtn.
				</a>
				<ul className="navbar__list">
					<li className="navbar__link"><a href="#">About</a></li>
					<li className="navbar__link"><a href="#">Projects</a></li>
					<li className="navbar__link"><a href="#">Contact</a></li>
				</ul>
			</div>
		);
  }
}