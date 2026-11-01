import { Redirect } from 'expo-router';
export default function Category() { return <Redirect href={{pathname:'/workout',params:{training:'MOBILITY'}}} />; }
