import React from 'react';
import Image from 'next/image';

const Intro = (props) => {
  return (
    <div id="intro" className="intro">
      <Image className="intro-pic"
        layout="fill"
        src="https://images.pexels.com/photos/194094/pexels-photo-194094.jpeg?w=940&h=650&dpr=2&auto=compress&cs=tinysrgb"
        alt="background image with boats"/>
      <div className="intro-left">
        <h2>Hello.</h2>
        <p>My name is Daniel Nguyen.</p>
      </div>
      <div className="intro-right">
        <p>I'm a passionate web developer based in DC.</p>
        <a onClick={(e) => props.scrollTo(e.target.getAttribute('href'))} href="#footer" className="intro-cta">Let's connect</a>
      </div>
    </div>
  );
}

export default Intro;