import * as React from 'react';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Battery from 'expo-battery';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { connect } from 'react-redux'
import store from '../store/store';
import { setBatteryLevel } from '../store/actions';
import { SET_BATTERY_LEVEL } from '../store/types';

const MAX_BATTERY_LEVEL = 70;
const BACKGROUND_BATTERY_CHECK = "BACKGROUND_BATTERY_CHECK";

TaskManager.defineTask(BACKGROUND_BATTERY_CHECK, async () => {
  try {
    const batteryLevel = await Battery.getBatteryLevelAsync();
    console.log("TaskManager batteryLevel", formatBatteryLevel(batteryLevel));

    store.dispatch({
      type: SET_BATTERY_LEVEL,
      payload: formatBatteryLevel(batteryLevel)
    });

    return batteryLevel
      ? BackgroundFetch.Result.NewData
      : BackgroundFetch.Result.NoData
  } catch (err) {
    return BackgroundFetch.Result.Failed
  }
})

const RegisterBackgroundTask = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_BATTERY_CHECK, {
      minimumInterval: 5, // seconds,
      startOnBoot: true,
      stopOnTerminate: false
    })
    console.log("Task registered")
  } catch (err) {
    console.log("Task Register failed:", err)
  }
}

RegisterBackgroundTask();

const formatBatteryLevel = (batteryLevel) => {
  return Math.round(batteryLevel * 100);
};

class BatteryWarnings extends React.Component {
  state = {
    isPlaying: false,
    soundNotificationActive: true,
    sound: null,
  };

  async componentDidMount() {
    const sound = new Audio.Sound();
    sound.setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate);
    await sound.loadAsync(
      require('../assets/audio/notification.mp3'),
      {},
      true
    );

    await sound.setIsLoopingAsync(true);

    await Audio.setAudioModeAsync({
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      staysActiveInBackground: true,
    });

    this.setState({ sound });

    this.batteryCheck();
    this.subscribeBatteryLevel();

    this._interval = setInterval(() => {
      this.batteryCheck();
    }, 10000);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.batteryLevel !== this.props.batteryLevel) {
        console.log('componentDidUpdate prev changed', prevProps.batteryLevel);
        console.log('componentDidUpdate this.props changed', this.props.batteryLevel);
        this.playSoundGate();
      }
  }

  componentWillUnmount() {
    this.unloadSound();
    this.unsubscribe();
    clearInterval(this._interval);
  }

  batteryCheck = async () => {
    console.log('batteryCheck');
    const batteryLevel = await Battery.getBatteryLevelAsync();
    console.log('batteryCheck batteryLevel', formatBatteryLevel(batteryLevel));

    this.props.dispatchBatteryLevel(formatBatteryLevel(batteryLevel));

    this.playSoundGate();
  }

  onPlaybackStatusUpdate = playbackStatus => {
    if (!playbackStatus.isLoaded) {
      console.log('sound is NOT loaded')
      if (playbackStatus.error) {
        console.log(`Encountered a fatal error during playback: ${playbackStatus.error}`);
      }
    } else {
      console.log('sound is loaded')
      if (playbackStatus.isPlaying) {
        console.log('sound isPlaying')
        this.setState({ isPlaying: true });
      } else {
        console.log('sound is NOT playing')
        this.setState({ isPlaying: false });
      }

      if (playbackStatus.didJustFinish) {
        console.log('sound didJustFinish')
      }
    }
  }

  playSound = async () => {
    console.log('Playing sound');
    this.setState({ soundNotificationActive: false });
    await this.state.sound.playAsync();
  }

  playSoundGate() {
    console.log('playSoundGate batteryLevel', this.props.batteryLevel);
    console.log('playSoundGate soundNotificationActive', this.state.soundNotificationActive);

    if (!this.state.soundNotificationActive) {
      console.log('Notification is NOT active')
      return;
    }

    if (!this.state.isPlaying && (this.props.batteryLevel >= MAX_BATTERY_LEVEL)) {
      console.log('Lets play sound!!!')
      this.playSound();
    }
  }

  stopSound = async () => {
    if (this.state.sound) {
      console.log('Stoping sound');
      await this.state.sound.setPositionAsync(0);
      await this.state.sound.stopAsync();
    }
  }

  async subscribeBatteryLevel() {
    this._subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      console.log('batterySubscription batteryLevel!', formatBatteryLevel(batteryLevel));

      this.props.dispatchBatteryLevel(formatBatteryLevel(batteryLevel));

      this.setState({ soundNotificationActive: true });

      this.playSoundGate();
    });
  }

  unloadSound() {
    return this.state.sound
      ? () => {
          console.log('Unloading Sound');
          this.state.sound.unloadAsync(); }
      : undefined;
  }

  unsubscribe() {
    this._subscription && this._subscription.remove();
    this._subscription = null;
  }

  render() {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/img/icon.png')}
          style={styles.image}
        >

        </Image>
        <Text style={styles.title}>Current Battery Level</Text>
        <Text style={styles.text}>{`${this.props.batteryLevel}%`}</Text>
        <Pressable onPress={this.stopSound} style={styles.button} title="Stop Sound" android_ripple={styles.buttonRipple}>
          <Text style={styles.buttonText}>Stop Sound</Text>
        </Pressable>
      </View>
  );
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 46,
    borderRadius: 4,
    elevation: 3,
    backgroundColor: '#2d2b45',
  },
  buttonText: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: 'bold',
    letterSpacing: 0.25,
    color: '#fff',
  },
  buttonRipple: {
    color: '#525484'
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 150,
    height: 150,
    marginBottom: 10
  },
  title: {
    color: '#2d2b45',
    fontWeight: 'bold',
    fontSize: 30,
    marginBottom: 15
  },
  text: {
    color: '#e85c40',
    fontWeight: 'bold',
    fontSize: 50,
    marginBottom: 30
  }
});

const mapStateToProps = (state) => {
  const { batteryLevel } = state;
  return {
    batteryLevel
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    dispatchBatteryLevel: (batteryLevel) => dispatch(setBatteryLevel(batteryLevel)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BatteryWarnings);
