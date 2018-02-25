import React from 'react';

const Navbar = () => {
	return (
		<header className="navbar">
			<a href="#intro" className="navbar__logo">dtn.</a>
			<ul className="navbar__list">
				<li className="navbar__link"><a className="underline" href="#about">About</a></li>
				<li className="navbar__link"><a className="underline" href="#work">Projects</a></li>
				<li className="navbar__link"><a className="underline" href="#footer">Contact</a></li>
			</ul>
		</header>
	);
}

export default Navbar;