import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { ExportScreen } from '../screens/ExportScreen';
import type { InsightsStackParamList } from './types';

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export function InsightsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f8f9fb' } }}>
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
    </Stack.Navigator>
  );
}
