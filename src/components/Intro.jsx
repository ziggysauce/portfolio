import React from 'react';
import Fade from 'react-reveal/Fade';

const Intro = (props) => {
	return (
		<div id="intro" className="intro">
			<Fade clear>
				<div className="intro-left">
					<h2>Hello.</h2>
					<p>My name is Daniel Nguyen.</p>
				</div>
			</Fade>
			<Fade clear>
				<div className="intro-right">
					<p>I'm a passionate web developer based in DC. Interested in <a onClick={(e) => props.scrollTo(e.target.getAttribute('href'))} href="#footer" className="paragraph-link underline">connecting?</a></p>
				</div>
			</Fade>
		</div>
	);
}

export default Intro;