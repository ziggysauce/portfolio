import React from 'react';
import Fade from 'react-reveal/Fade';

const Footer = (props) => {

	return (
		<footer id="footer" className="footer">
			<div className="to-top">
			<span className="rocket"><a onClick={(e) => props.scrollTo(e.currentTarget.getAttribute('href'))} href="#intro"><i className="fas fa-rocket"></i></a></span>
			<span className="rocket-fire"><i className="fas fa-fire"></i></span>
		</div>
			<Fade left>
				<div className="footer-left">
					<h2><a className="footer__link-header" href="mainto:dtn3423@gmail.com">Let's talk.</a></h2>
					<p>Got a great idea?
						<span className="paragraph-icon">
							<i className="far fa-comment-alt"></i>
						</span></p>
					<p>Contact me about collaborating.</p>
				</div>
			</Fade>
			<Fade right>
				<div className="footer-right">
					<a className="underline" href="mainto:dtn3423@gmail.com">dtn3423@gmail.com</a>
					<ul className="footer__link-list">
						<li><a className="footer__link" href="https://www.linkedin.com/in/dtn3423/" target="_blank"><i className="fab fa-linkedin-in"></i></a></li>
						<li><a className="footer__link" href="https://github.com/ziggysauce" target="_blank"><i className="fab fa-github"></i></a></li>
						<li><a className="footer__link" href="https://codepen.io/ziggysauce/" target="_blank"><i className="fab fa-codepen"></i></a></li>
						<li><a className="footer__link" href="https://medium.com/@ziggysauce" target="_blank"><i className="fab fa-medium-m"></i></a></li>
						<li><a className="footer__link" href="https://drive.google.com/file/d/1VdoxUOacJ6HNdt8ZyIqjZT9s1QxdWzi1/view" target="_blank"><i className="fas fa-file-pdf"></i></a></li>
					</ul>
				</div>
			</Fade>
		</footer>
	);
}

export default Footer;