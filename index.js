import React from 'react';
import ReactDOM from 'react-dom';
import App from './src/App.jsx';
import './src/styles/main.scss';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBoujQmBIz7Z1SB6F6avS_CwbUIht-aeoA",
  authDomain: "dtn-portfolio.firebaseapp.com",
  projectId: "dtn-portfolio",
  storageBucket: "dtn-portfolio.appspot.com",
  messagingSenderId: "675554078037",
  appId: "1:675554078037:web:aa91ae8d02f181d71993dc",
  measurementId: "G-1MDQ136T7T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

ReactDOM.render(<App />, document.getElementById('root'));