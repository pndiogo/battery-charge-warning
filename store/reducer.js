import { SET_BATTERY_LEVEL } from "./types";

const initialState = {
    batteryLevel: 0
}
const reducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_BATTERY_LEVEL:
            return {
            ...state,
            batteryLevel: action.payload,
            }
        break;

        default:
            return state;
    }
}

export default reducer;