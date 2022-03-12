import type { NextPage } from 'next';
import Script from 'next/script'
import Head from 'next/head';
import styles from '../styles/Home.module.scss';

// React smooth scroll
import { Link, DirectLink, Element , Events, animateScroll as scroll, scrollSpy, scroller } from 'react-scroll';

// Import component files
import Navbar from './components/navbar.tsx';
import Intro from './components/intro.tsx';
import About from './components/about.tsx';
import Work from './components/work.tsx';
import Footer from './components/footer.tsx';

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

const Home: NextPage = () => {
  // Smooth scroll to specific element's position in window
  const scrollTo = (destination) => {
    let pos = document.querySelector(destination).getBoundingClientRect().y;
    scroll.scrollMore(pos);
  };

  return (
    <div>
      <Script src="https://kit.fontawesome.com/e997904764.js" crossorigin="anonymous"/>
      <Navbar scrollTo={scrollTo} />
      <Intro scrollTo={scrollTo} />
      <About scrollTo={scrollTo} />
      <Work projects={projects} />
      <Footer scrollTo={scrollTo} />
    </div>
  );
};

export default Home;
