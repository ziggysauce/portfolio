import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLinkedin, faGithub, faCodepen, faMedium } from "@fortawesome/free-brands-svg-icons";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";

import styles from '../styles/Home.module.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Skills from './components/Skills';
import Projects from './components/Projects';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>DTN Portfolio</title>
        <meta name="description" content="Daniel T Nguyen Software Developer Portfolio" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div class="flex flex-col">
          <Navbar />
          <Hero />
          <Skills />
          <Projects />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className="flex flex-wrap justify-between items-center w-full">
          <span className="p-2 mx-2">dtn3423@gmail.com</span>
          <div>
            <FontAwesomeIcon icon={faLinkedin} size="xl" className="mx-2" />
            <FontAwesomeIcon icon={faGithub} size="xl" className="mx-2" />
            <FontAwesomeIcon icon={faCodepen} size="xl" className="mx-2" />
            <FontAwesomeIcon icon={faMedium} size="xl" className="mx-2" />
            <FontAwesomeIcon icon={faFilePdf} size="xl" className="mx-2" />
          </div>
        </div>
      </footer>
    </div>
  )
}
