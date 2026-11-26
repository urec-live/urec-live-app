import React, { ReactNode } from "react";
export default function AreaPressTarget({label,onPress,children}:{label:string;onPress?:()=>void;children:ReactNode}) {
  return <g role="button" aria-label={label} tabIndex={0} onClick={onPress} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPress?.();}}} style={{cursor:'pointer'}}>{children}</g>;
}
