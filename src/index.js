import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { HashRouter as Router} from 'react-router-dom';
import { MoralisProvider } from "react-moralis";

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <MoralisProvider
        appId={process.env.REACT_APP_MORALIS_APP_ID}
        serverUrl={process.env.REACT_APP_MORALIS_SERVER_URL}>
          <App />
      </MoralisProvider>
    </Router>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
