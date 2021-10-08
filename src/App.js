import './App.css';
import UnityGameContainer from "./components/UnityGameContainer";
import { Route, Switch} from 'react-router-dom';

function App() {
  return (
      
      <Switch>
        <Route exact strict path='/:walletId' component={UnityGameContainer} />
        <Route component={UnityGameContainer} />
      </Switch>
      
      
  );
}

export default App;
