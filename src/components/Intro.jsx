import React from 'react';

const Intro = (props) => {
	return (
		<div id="intro" className="intro">
			<div className="intro-left fade-in">
				<h2>Hello.</h2>
				<p>My name is Daniel Nguyen.</p>
			</div>
			<div className="intro-right fade-in">
				<p>I'm a passionate web developer based in DC. Interested in <a onClick={(e) => props.scrollTo(e.target.getAttribute('href'))} href="#footer" className="paragraph-link underline">connecting?</a></p>
			</div>
		</div>
	);
}

export default Intro;