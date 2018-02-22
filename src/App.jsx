import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Navbar from './components/Navbar.jsx';
import Intro from './components/Intro.jsx';
import About from './components/About.jsx';
import Work from './components/Work.jsx';
import Footer from './components/Footer.jsx';

export default class App extends Component {
  render() {
    return (
      <div>
        <Navbar />
        <Intro />
        <About />
        <Work />
        <Footer />
      </div>
    );
  }
}
