import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class About extends Component {
	
  render() {
		return (
			<div className="about">
				<div className="about__description">
					<h2>About me.</h2>
					<div className="about__description-top">
						<img src="https://s19.postimg.org/9cfrp092b/Tea_Time.jpg" alt="profile picture"/>
						<p>
							<span className="paragraph-icon">
								<i className="fas fa-code"></i>
							</span>
						I'm a freelance web-developer with skills in both front-end and back-end applications development. I desire to meet and collaborate with other professionals to build innovative and useful applications. I strive to add my own flavor while focusing on code efficiency, speed optimization, and seamless user experience with design that is pleasing to the eye. I am continuously learning and always pushing towards mastering my craft.</p>
					</div>
				</div>
				<div className="about__tools">
					<h3>Technologies</h3>
					<ul>
						<li><i className="fab fa-html5"></i></li>
						<li><i className="fab fa-css3-alt"></i></li>
						<li><i className="fab fa-js"></i></li>
						<li><i className="fab fa-react"></i></li>
						<li><i className="fab fa-node-js"></i></li>
						<li><i className="fab fa-sass"></i></li>
						<li><i className="fab fa-gulp"></i></li>
					</ul>
				</div>
				<div>
					<p>
						<span className="paragraph-icon">
							<i className="fas fa-gamepad"></i>
						</span>
					When I'm not <a className="paragraph-link underline" href="https://github.com/ziggysauce">coding</a> you can find me in the kitchen experimenting with new dishes, outside getting a run in, at the local Michigan bar cheering on my alma mater <span className="michigan">GO BLUE!</span>, or still behind a keyboard playing video games.</p>
				</div>
			</div>
		);
  }
}