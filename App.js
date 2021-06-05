import * as React from 'react';
import store from './store/store';
import { Provider } from 'react-redux'
import BatteryChargeWarning from './components/battery-charge-warning';
export default class App extends React.Component {
  render() {
    return (
      <Provider store={store}>
        <BatteryChargeWarning />
      </Provider>
    );
  }
}

