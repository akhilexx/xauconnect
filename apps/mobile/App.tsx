/**
 * XAUConnect mobile — Expo app entry.
 * Bottom tabs: Swap · Discover (stack with Token detail) · Wallet · Settings.
 */
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Image } from "react-native";
import { colors } from "./src/theme";
import { SwapScreen } from "./src/screens/swap";
import { DiscoverScreen } from "./src/screens/discover";
import { TokenScreen } from "./src/screens/token";
import { LaunchpadScreen } from "./src/screens/launchpad";
import { WalletScreen } from "./src/screens/wallet";
import { SettingsScreen } from "./src/screens/settings";
import type { DiscoverStackParams, RootTabParams } from "./src/navigation";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});

const Tab = createBottomTabNavigator<RootTabParams>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParams>();

function DiscoverNavigator() {
  return (
    <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
      <DiscoverStack.Screen name="DiscoverList" component={DiscoverScreen} />
      <DiscoverStack.Screen
        name="Token"
        component={TokenScreen}
        options={{ headerShown: true, headerTitle: "Token", headerTintColor: colors.ink }}
      />
    </DiscoverStack.Navigator>
  );
}

const TAB_ICONS: Record<keyof RootTabParams, number> = {
  Swap: require("./assets/nav/swap.png"),
  Discover: require("./assets/nav/discover.png"),
  Launch: require("./assets/nav/launchpad.png"),
  Wallet: require("./assets/nav/wallet.png"),
  Settings: require("./assets/nav/profile.png"),
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.base,
    card: "rgba(255,255,255,0.94)",
    primary: colors.goldDark,
    text: colors.ink,
    border: "rgba(15,23,42,0.08)",
  },
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer theme={theme}>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.goldDark,
            tabBarInactiveTintColor: colors.inkMuted,
            tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
            tabBarIcon: () => (
              <Image source={TAB_ICONS[route.name]} style={{ width: 22, height: 22 }} />
            ),
          })}
        >
          <Tab.Screen name="Swap" component={SwapScreen} />
          <Tab.Screen name="Discover" component={DiscoverNavigator} />
          <Tab.Screen name="Launch" component={LaunchpadScreen} />
          <Tab.Screen name="Wallet" component={WalletScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
