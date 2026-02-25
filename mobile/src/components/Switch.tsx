import React from 'react'
import { Switch } from 'react-native-switch'

interface CustomSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export default function CustomSwitch({ value, onValueChange }: CustomSwitchProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      activeText={''}
      inActiveText={''}
      backgroundActive={'#D9FD00'}
      backgroundInactive={'#555'}
      circleBorderWidth={0}
      circleSize={20}
      barHeight={25}
      switchWidthMultiplier={2.5}
    />
  )
}
