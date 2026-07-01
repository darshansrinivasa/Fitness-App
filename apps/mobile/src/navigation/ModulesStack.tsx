import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BodyScreen } from '../screens/BodyScreen';
import { FitnessScreen } from '../screens/FitnessScreen';
import { ModulesScreen } from '../screens/ModulesScreen';
import { NutritionScreen } from '../screens/NutritionScreen';
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
    </Stack.Navigator>
  );
}
