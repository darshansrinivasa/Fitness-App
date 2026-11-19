import type { NavigatorScreenParams } from '@react-navigation/native';

export type ModulesStackParamList = {
  ModulesList: undefined;
  Water: undefined;
  Fitness: undefined;
  Nutrition: undefined;
  Body: undefined;
  Sleep: undefined;
  Habits: undefined;
  Supplements: undefined;
  Goals: undefined;
  Health: undefined;
  Photos: undefined;
  Haircare: undefined;
  Skincare: undefined;
};

export type InsightsStackParamList = {
  Analytics: undefined;
  Export: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Modules: NavigatorScreenParams<ModulesStackParamList>;
  Analytics: undefined;
  Export: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<RootTabParamList>;
  Settings: undefined;
};
