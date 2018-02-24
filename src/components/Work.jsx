import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Work extends Component {
	
  render() {
		return (
			<div className="work">
				<h2>Projects.</h2>
				<div className="project">
					<img src="https://images.pexels.com/photos/122383/pexels-photo-122383.jpeg?w=1260&h=750&dpr=2&auto=compress&cs=tinysrgb"/>
					<h3>Project Title</h3>
					<p>Short project description</p>
					<span className="project__links">
						<a className="underline" href="#">Demo</a>//
						<a className="underline" href="#">Repo</a>
					</span>
				</div>
			</div>
		);
  }
}