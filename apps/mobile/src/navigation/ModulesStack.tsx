import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BodyScreen } from '../screens/BodyScreen';
import { FitnessScreen } from '../screens/FitnessScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { HaircareScreen } from '../screens/HaircareScreen';
import { HabitsScreen } from '../screens/HabitsScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { ModulesScreen } from '../screens/ModulesScreen';
import { NutritionScreen } from '../screens/NutritionScreen';
import { PhotosScreen } from '../screens/PhotosScreen';
import { SkincareScreen } from '../screens/SkincareScreen';
import { SleepScreen } from '../screens/SleepScreen';
import { SupplementsScreen } from '../screens/SupplementsScreen';
import { WaterScreen } from '../screens/WaterScreen';
import type { ModulesStackParamList } from './types';

const Stack = createNativeStackNavigator<ModulesStackParamList>();

export function ModulesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }}>
      <Stack.Screen name="ModulesList" component={ModulesScreen} />
      <Stack.Screen name="Water" component={WaterScreen} />
      <Stack.Screen name="Fitness" component={FitnessScreen} />
      <Stack.Screen name="Nutrition" component={NutritionScreen} />
      <Stack.Screen name="Body" component={BodyScreen} />
      <Stack.Screen name="Sleep" component={SleepScreen} />
      <Stack.Screen name="Habits" component={HabitsScreen} />
      <Stack.Screen name="Supplements" component={SupplementsScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="Health" component={HealthScreen} />
      <Stack.Screen name="Photos" component={PhotosScreen} />
      <Stack.Screen name="Haircare" component={HaircareScreen} />
      <Stack.Screen name="Skincare" component={SkincareScreen} />
    </Stack.Navigator>
  );
}
