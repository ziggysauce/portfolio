import React from 'react';
import Fade from 'react-reveal/Fade';

const Intro = () => {
	return (
		<div id="intro" className="intro">
			<Fade left>
				<div className="intro-left">
					<h2>Hello.</h2>
					<p>My name is Daniel Nguyen.</p>
				</div>
			</Fade>
			<Fade right>
				<div className="intro-right">
					<p>I'm a passionate front-end web developer based in DC.</p>
				</div>
			</Fade>
		</div>
	);
}

export default Intro;