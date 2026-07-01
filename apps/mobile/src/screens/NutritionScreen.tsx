import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import type { Food, MealLog } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { screenStyles } from '../components/ScreenLayout';
import {
  addFood,
  ensureDefaultNutritionGoal,
  getActiveNutritionGoal,
  getFoods,
  getTodayMacroTotals,
  getTodayMealLogs,
  logMeal,
  type MacroTotals,
} from '../db/nutrition';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Nutrition'>;

const MEAL_TYPES: MealLog['meal_type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function NutritionScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [foods, setFoods] = useState<Food[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [totals, setTotals] = useState<MacroTotals>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [goal, setGoal] = useState({ calories: 2200, protein_g: 150, carbs_g: 220, fat_g: 70 });
  const [tab, setTab] = useState<'today' | 'foods'>('today');
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [quantityG, setQuantityG] = useState('100');
  const [mealType, setMealType] = useState<MealLog['meal_type']>('lunch');
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodCal, setNewFoodCal] = useState('100');
  const [newFoodProtein, setNewFoodProtein] = useState('10');
  const [newFoodCarbs, setNewFoodCarbs] = useState('12');
  const [newFoodFat, setNewFoodFat] = useState('3');

  const reload = useCallback(async () => {
    if (!user) return;
    await ensureDefaultNutritionGoal(db, user.id);
    const [foodList, mealList, macroTotals, activeGoal] = await Promise.all([
      getFoods(db, user.id),
      getTodayMealLogs(db, user.id),
      getTodayMacroTotals(db, user.id),
      getActiveNutritionGoal(db, user.id),
    ]);
    setFoods(foodList);
    setMeals(mealList);
    setTotals(macroTotals);
    if (activeGoal) {
      setGoal({
        calories: activeGoal.calories ?? 2200,
        protein_g: activeGoal.protein_g ?? 150,
        carbs_g: activeGoal.carbs_g ?? 220,
        fat_g: activeGoal.fat_g ?? 70,
      });
    }
    if (!selectedFoodId && foodList[0]) setSelectedFoodId(foodList[0].id);
  }, [db, user, selectedFoodId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handleAddFood = async () => {
    if (!user || !newFoodName.trim()) return;
    await addFood(db, user.id, {
      name: newFoodName.trim(),
      calories_per_serving: Number.parseFloat(newFoodCal),
      protein_g: Number.parseFloat(newFoodProtein),
      carbs_g: Number.parseFloat(newFoodCarbs),
      fat_g: Number.parseFloat(newFoodFat),
    });
    setNewFoodName('');
    await reload();
    await afterLocalWrite();
  };

  const handleLogMeal = async () => {
    if (!user) return;
    const food = foods.find((f) => f.id === selectedFoodId);
    const qty = Number.parseFloat(quantityG);
    if (!food || !Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Select a food', 'Choose a food and quantity.');
      return;
    }
    await logMeal(db, user.id, food, qty, mealType);
    await reload();
    await afterLocalWrite();
    Alert.alert('Logged', `${food.name} added to ${mealType}.`);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Nutrition</Text>
        <Text style={screenStyles.subtitle}>
          {totals.calories} / {goal.calories} kcal today
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Macros today</Text>
        <Text style={styles.macroLine}>
          P {totals.protein_g}/{goal.protein_g}g · C {totals.carbs_g}/{goal.carbs_g}g · F {totals.fat_g}/{goal.fat_g}g
        </Text>
      </Card>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('today')} style={[styles.tab, tab === 'today' && styles.tabActive]}>
          <Text style={styles.tabText}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setTab('foods')} style={[styles.tab, tab === 'foods' && styles.tabActive]}>
          <Text style={styles.tabText}>Foods</Text>
        </Pressable>
      </View>

      {tab === 'today' ? (
        <Card>
          <Text style={styles.cardTitle}>Log meal</Text>
          {foods.length === 0 ? (
            <Text style={styles.meta}>Add a food first (Foods tab).</Text>
          ) : (
            <>
              <Text style={styles.label}>Food</Text>
              <View style={styles.chips}>
                {foods.map((food) => (
                  <Pressable
                    key={food.id}
                    onPress={() => setSelectedFoodId(food.id)}
                    style={[styles.chip, selectedFoodId === food.id && styles.chipActive]}
                  >
                    <Text style={styles.chipText}>{food.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Input value={quantityG} onChangeText={setQuantityG} keyboardType="number-pad" placeholder="Quantity (g)" />
              <Text style={styles.label}>Meal</Text>
              <View style={styles.chips}>
                {MEAL_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setMealType(type)}
                    style={[styles.chip, mealType === type && styles.chipActive]}
                  >
                    <Text style={styles.chipText}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              <Button label="Log meal" onPress={() => void handleLogMeal()} />
            </>
          )}
          <Text style={[styles.cardTitle, { marginTop: spacing.lg }]}>Today&apos;s meals</Text>
          {meals.length === 0 ? (
            <Text style={styles.meta}>No meals logged.</Text>
          ) : (
            meals.map((meal) => (
              <View key={meal.id} style={styles.mealRow}>
                <Text style={styles.mealTitle}>{meal.food_name}</Text>
                <Text style={styles.meta}>
                  {meal.meal_type} · {meal.quantity_g}g · {meal.calories ?? 0} kcal
                </Text>
              </View>
            ))
          )}
        </Card>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>Add custom food</Text>
          <Input value={newFoodName} onChangeText={setNewFoodName} placeholder="Food name" />
          <View style={styles.row}>
            <Input value={newFoodCal} onChangeText={setNewFoodCal} keyboardType="number-pad" placeholder="kcal/100g" style={styles.field} />
            <Input value={newFoodProtein} onChangeText={setNewFoodProtein} keyboardType="number-pad" placeholder="P" style={styles.field} />
          </View>
          <View style={styles.row}>
            <Input value={newFoodCarbs} onChangeText={setNewFoodCarbs} keyboardType="number-pad" placeholder="C" style={styles.field} />
            <Input value={newFoodFat} onChangeText={setNewFoodFat} keyboardType="number-pad" placeholder="F" style={styles.field} />
          </View>
          <Button label="Save food" onPress={() => void handleAddFood()} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  back: { marginBottom: spacing.sm },
  backText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  macroLine: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.text, fontWeight: '600' },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: '#0c4a6e' },
  chipText: { color: colors.text, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 14 },
  mealRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  mealTitle: { color: colors.text, fontSize: 16, fontWeight: '500' },
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1, marginBottom: spacing.md },
});
