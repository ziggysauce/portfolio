import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Footer extends Component {
	
  render() {
		return (
			<footer className="footer">
				<div className="footer-left">
					<h2>Let's talk.</h2>
					<p>Got a great idea?
						<span className="paragraph-icon">
							<i className="far fa-comment-alt"></i>
						</span></p>
					<p>Contact me about collaborating.</p>
				</div>
				<div className="footer-right">
					<a className="underline" href="mainto:dtn3423@gmail.com">dtn3423@gmail.com</a>
					<ul className="footer__link-list">
						<li><a className="footer__link" href="https://www.linkedin.com/in/daniel-nguyen-1a041495/" target="_blank"><i className="fab fa-linkedin-in"></i></a></li>
						<li><a className="footer__link" href="https://github.com/ziggysauce" target="_blank"><i className="fab fa-github"></i></a></li>
						<li><a className="footer__link" href="https://codepen.io/ziggysauce/" target="_blank"><i className="fab fa-codepen"></i></a></li>
						<li><a className="footer__link" href="https://medium.com/@ziggysauce" target="_blank"><i className="fab fa-medium-m"></i></a></li>
						<li><a className="footer__link" href="https://drive.google.com/file/d/1svpj_x4qLEkNHlha-2QQC9xEiH0nfzx3/view?usp=sharing" target="_blank"><i className="fas fa-file-pdf"></i></a></li>
					</ul>
				</div>
			</footer>
		);
  }
}