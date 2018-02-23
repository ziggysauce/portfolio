import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Footer extends Component {
	
  render() {
		return (
			<footer className="footer">
				<div className="footer-left">
					<h2>Let's talk.</h2>
					<p>Got a great idea?</p>
					<p>Contact me about collaborating.</p>
				</div>
				<div className="footer-right">
					<a href="mainto:dtn3423@gmail.com">dtn3423@gmail.com</a>
					<ul className="footer__link-list">
						<li><a className="footer__link" href="https://www.linkedin.com/in/daniel-nguyen-1a041495/" target="_blank"><i className="fab fa-linkedin-in"></i></a></li>
						<li><a className="footer__link" href="https://github.com/ziggysauce" target="_blank"><i className="fab fa-github"></i></a></li>
						<li><a className="footer__link" href="https://codepen.io/ziggysauce/" target="_blank"><i className="fab fa-codepen"></i></a></li>
						<li><a className="footer__link" href="https://medium.com/@ziggysauce" target="_blank"><i className="fab fa-medium-m"></i></a></li>
					</ul>
				</div>
			</footer>
		);
  }
}