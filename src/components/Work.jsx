import React from 'react';
import Fade from 'react-reveal/Fade';

const Work = (props) => {
	return (
		<div id="work" className="work">
			<Fade bottom>
				<h2>Projects.</h2>
			</Fade>
			<div className="project-wrapper">
				{props.projects.map((project, index) => {
					return (
						<Fade key={index} clear>
							<div className="project">
								<img src={project.img} alt="screenshot of project"/>
								<h3>{project.title}</h3>
								<p>{project.description}</p>
								<span className="project__links">
									<a className="underline" href={project.live} target="_blank">Live</a>//
									<a className="underline" href={project.repo} target="_blank">Repo</a>
								</span>
							</div>
						</Fade>
					);
				})}
			</div>
		</div>
	);
}

export default Work;