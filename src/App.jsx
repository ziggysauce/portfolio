import React, { Component } from 'react';
import ReactDOM from 'react-dom';
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
    console.log('componentWillMount: ', this.state);
  }

  render() {
    return (
      <div>
        <Navbar />
        <Intro />
        <About />
        <Work projects={this.state.projects} />
        <Footer />
      </div>
    );
  }
}
