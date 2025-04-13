import { Stack } from 'expo-router';

export default function HomeStackLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="home" />
            <Stack.Screen name="recommendbookpage" />
        </Stack>
    );
}
