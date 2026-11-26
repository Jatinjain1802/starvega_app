import React from 'react';
import { Image } from 'react-native';
import { colors } from './portfolio';

const icons = {
  home: require('./icons/home.png'),
  building: require('./icons/building.png'),
  finance: require('./icons/finance.png'),
  chat: require('./icons/chat.png'),
  user: require('./icons/user.png'),
  people: require('./icons/people.png'),
  receipt: require('./icons/receipt.png'),
  bell: require('./icons/bell.png'),
  room: require('./icons/room.png'),
  chart: require('./icons/chart.png'),
  arrow: require('./icons/arrow.png'),
  down: require('./icons/down.png'),
  tool: require('./icons/tool.png'),
  star: require('./icons/star.png'),
};

export default function Icon({ name, size = 22, color = colors.primary }) {
  return <Image accessible={false} source={icons[name]} style={{ width: size, height: size, tintColor: color }} />;
}
