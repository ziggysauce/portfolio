import React from 'react';

const Navbar = (props) => {

  return (
    <header className="navbar">
      <a onClick={(e) => props.scrollTo(e.target.getAttribute('href'))} href="#intro" className="navbar__logo">dtn.</a>
      <ul className="navbar__list">
        <li className="navbar__link"><a onClick={(e) => props.scrollTo(e.target.getAttribute('href'))} className="underline" href="#about">About</a></li>
        <li className="navbar__link"><a onClick={(e) => props.scrollTo(e.target.getAttribute('href'))} className="underline" href="#work">Projects</a></li>
        <li className="navbar__link"><a onClick={(e) => props.scrollTo(e.target.getAttribute('href'))} className="underline" href="#footer">Contact</a></li>
      </ul>
    </header>
  );
}

export default Navbar;