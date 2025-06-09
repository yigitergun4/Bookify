import { Stack } from "expo-router";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="recommendbookpage" />
      <Stack.Screen name="photoeditpage" />
      <Stack.Screen name="SearchResults" />
      <Stack.Screen name="recentlyview" />
      <Stack.Screen name="notexactbookfound" />
    </Stack>
  );
}
