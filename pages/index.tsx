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
      <Work />
      <Footer scrollTo={scrollTo} />
    </div>
  );
};

export default Home;
