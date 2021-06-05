import { SET_BATTERY_LEVEL } from './types';

export const setBatteryLevel = (batteryLevel) => {
    console.log('store setBatteryLevel', batteryLevel);
    
    return ({
        type: SET_BATTERY_LEVEL,
        payload: batteryLevel
    })
};