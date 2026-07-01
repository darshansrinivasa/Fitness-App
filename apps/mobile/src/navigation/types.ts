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
};

export type RootTabParamList = {
  Home: undefined;
  Water: undefined;
  Modules: NavigatorScreenParams<ModulesStackParamList>;
  Settings: undefined;
};
