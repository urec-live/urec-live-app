import { Redirect, useLocalSearchParams } from 'expo-router';
export default function MuscleExercises() {
 const { muscle } = useLocalSearchParams<{muscle:string}>();
 return <Redirect href={{pathname:'/workout',params:{muscle}}} />;
}
