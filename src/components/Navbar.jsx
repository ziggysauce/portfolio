import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Navbar extends Component {
	
  render() {
		return (
			<header className="navbar">
				<a href="#" className="navbar__logo">dtn.</a>
				<ul className="navbar__list">
					<li className="navbar__link"><a className="underline" href="#">About</a></li>
					<li className="navbar__link"><a className="underline" href="#">Projects</a></li>
					<li className="navbar__link"><a className="underline" href="#">Contact</a></li>
				</ul>
			</header>
		);
  }
}