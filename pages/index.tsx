import Head from 'next/head';
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
        <div className="flex flex-wrap justify-center items-center">
          <span className="p-2 mx-2">[Email]</span>
          <span className="p-2 mx-2">[LinkedIn]</span>
          <span className="p-2 mx-2">[Github]</span>
          <span className="p-2 mx-2">[Codepen]</span>
          <span className="p-2 mx-2">[Medium]</span>
          <span className="p-2 mx-2">[Resume]</span>
        </div>
      </footer>
    </div>
  )
}
