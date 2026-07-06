import React, { useEffect, useRef, useState } from 'react';
import { Animated, TextStyle } from 'react-native';

interface Props {
  value: number;
  style?: TextStyle | TextStyle[];
  duration?: number;
  suffix?: string;
  decimals?: number;
}

/**
 * Animates a number from its previous value to the new one (first render:
 * from 0). Drives React state from an Animated.Value listener — cheap for
 * the handful of hero stats it's used on, and works on web + native without
 * extra dependencies.
 */
export default function CountUp({ value, style, duration = 240, suffix = '', decimals = 0 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  const lastTarget = useRef(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start(() => setDisplay(value));
    // JS-driven animations depend on requestAnimationFrame, which browsers
    // throttle in background tabs — guarantee the final value regardless.
    const failSafe = setTimeout(() => setDisplay(value), duration + 150);
    lastTarget.current = value;
    return () => {
      clearTimeout(failSafe);
      anim.removeListener(id);
    };
  }, [anim, value, duration]);

  return (
    <Animated.Text style={style}>
      {display.toFixed(decimals)}
      {suffix}
    </Animated.Text>
  );
}
