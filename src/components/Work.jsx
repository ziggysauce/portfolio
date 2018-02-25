import React from 'react';

const Work = (props) => {
	console.log('from work.jsx: ', props.projects);
	return (
		<div id="work" className="work">
			<h2>Projects.</h2>
			<div className="project-wrapper">
				{props.projects.map((project, index) => {
					return (
						<div key={index} className="project">
							<img src={project.img}/>
							<h3>{project.title}</h3>
							<p>{project.description}</p>
							<span className="project__links">
								<a className="underline" href={project.live} target="_blank">Live</a>//
								<a className="underline" href={project.repo} target="_blank">Repo</a>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default Work;