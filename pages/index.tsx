import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Navbar from './components/Navbar';
import Carousel from './components/Carousel';

export default function Home() {
  const toolkitData = [
    {
      title: 'About',
      asset: 'someicon',
      description: 'some text',
    },
    {
      title: 'Projects',
      asset: 'someicon',
      description: 'some text',
    },
    {
      title: 'Skills',
      asset: 'someicon',
      description: 'some text',
    },
    {
      title: 'Social Links',
      asset: 'someicon',
      description: 'some text',
    },
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>DTN Portfolio</title>
        <meta name="description" content="Daniel T Nguyen Software Developer Portfolio" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div>
          {/* Narbar*/}
          <Navbar />

          {/* Hero Section */}
          <div>
            <h1 className="text-green-400">Hero Section goes here!</h1>
          </div>

          {/* Toolkit Section */}
          <div>
            <Carousel data={toolkitData} />
          </div>

          {/* Skills Section */}
          <div>
            <p>JS, SQL, PostgrSQL, Express, NodeJS, etc.</p>
            <Carousel />
          </div>

          {/* Projects Section */}
          <div>
            <p>Showcase of projects</p>
            <Carousel />
          </div>

          {/* About Section */}
          <div>
            <p>Blurb about me</p>
            <Carousel />
          </div>

          {/* Social Links Section */}
          <div>
            <p>This should maybe be the footer with social links</p>
            <Carousel />
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Footer will go here.</p>
      </footer>
    </div>
  )
}
