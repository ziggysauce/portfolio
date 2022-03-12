/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/jsx-no-comment-textnodes */
import React from 'react';
import Fade from 'react-reveal/Fade';

const Work = (props:any) => {
  const projects = [
    {
      name: "gecho",
      title: "Gecho",
      description: "A video-music playing app that utilizes YouTube's API.",
      live: "https://gecho.herokuapp.com/",
      repo: "https://github.com/chingu-voyage4/Geckos-Team-32",
      img: "https://image.ibb.co/mPFbmx/homepage.png"
    },
    {
      name: "devtab",
      title: "DevTab",
      description: "A frontend developer focused new tab extension for your web browser with features including sticky notes, quicklinks, a color picker, and more.",
      live: "https://chingu-coders.github.io/Voyage2-Turtles-02/TabLandingPage/index.html",
      repo: "https://github.com/chingu-coders/Voyage2-Turtles-02",
      img: "https://image.ibb.co/dzcBXS/devtab.png"
    },
    {
      name: "anjali",
      title: "Artist Webpage",
      description: "A portfolio webpage for a local D.C. music artist.",
      live: "http://anjalitaneja.com/",
      repo: "https://github.com/ziggysauce/anjali_taneja",
      img: "https://i.ibb.co/mN9q6g6/anjali.png"
    },
    {
      name: "koral",
      title: "Koral",
      description: "A business-to-business mock/clone of an advertising agency.",
      live: "http://koral.ziggysauce.surge.sh/",
      repo: "https://github.com/ziggysauce/RocketMocks/tree/master/Koral",
      img: "https://image.ibb.co/gderXS/koral.png"
    },
    // {
    //   name: "duongnewsletter",
    //   title: "Duong's 11 Newsletter",
    //   description: "A webpage to showcase/archive each newsletter submission.",
    //   live: "https://duongs11.herokuapp.com/",
    //   repo: "https://github.com/ziggysauce/duongs_11",
    //   img: "https://s19.postimg.org/nogephhr7/newsletter-portfolio.png"
    // },
  ];

  return (
    <div id="work" className="work">
      <Fade bottom>
        <h2>Projects.</h2>
      </Fade>
      <div className="project-wrapper">
        {projects.map((project, index) => {
          return (
            <Fade key={index} clear>
              <div className="project">
                <a href={project.live} target="_blank" rel="noreferrer">
                  <img src={project.img} alt="screenshot of project"/>
                </a>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <span className="project__links">
                  <a className="underline" href={project.live} target="_blank" rel="noreferrer">Live</a>
                  <span>//</span>
                  <a className="underline" href={project.repo} target="_blank" rel="noreferrer">Repo</a>
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