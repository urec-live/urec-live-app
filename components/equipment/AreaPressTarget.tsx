import React, { ReactNode } from "react";
import { G } from "react-native-svg";
export default function AreaPressTarget({label,onPress,children}:{label:string;onPress?:()=>void;children:ReactNode}) {
  return <G accessibilityLabel={label} accessibilityRole="button" onPress={onPress}>{children}</G>;
}
