import React, { Component } from 'react';
import ReactDOM from 'react-dom';

// React smooth scroll
import { Link, DirectLink, Element , Events, animateScroll as scroll, scrollSpy, scroller } from 'react-scroll'

// Import component files
import Navbar from './components/Navbar.jsx';
import Intro from './components/Intro.jsx';
import About from './components/About.jsx';
import Work from './components/Work.jsx';
import Footer from './components/Footer.jsx';
import API from './api/Projects.jsx';

export default class App extends Component {
  state = {
    projects: API.projects
  }

  componentWillMount() {
    this.setState({
      projects: API.projects
    });
  }

  // Smooth scroll to specific element's position in window
  scrollTo(destination) {
    let pos = document.querySelector(destination).getBoundingClientRect().y;
    scroll.scrollMore(pos);
  }

  render() {
    return (
      <div>
        <Navbar scrollTo={this.scrollTo} />
        <Intro scrollTo={this.scrollTo} />
        <About />
        <Work projects={this.state.projects} />
        <Footer scrollTo={this.scrollTo} />
      </div>
    );
  }
}
