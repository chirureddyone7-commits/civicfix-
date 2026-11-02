import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme";

export default function RootLayout() {
  return <>
    <StatusBar style="dark" backgroundColor={colors.canvas} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
  </>;
}