    import React from 'react';
    import {Image, Text, View} from "react-native";
    import { Tabs } from 'expo-router';
    import Colors from '@/constants/Colors';
    import { useColorScheme } from '@/components/useColorScheme';
    import { useClientOnlyValue } from '@/components/useClientOnlyValue';
    import homeIcon from '@/assets/images/homeicon.png'

    const HomeIcon = () => (
        <Image src={homeIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
    );

    type TabsViewProps = {
        color: string;
        size: number;
        label: string;
        source: any;
    };

    const TabsView = ({ color, size, label, source }: TabsViewProps) => {
        return (
            <View style={{ alignItems: 'center', minWidth: 60 }}>
                <Image
                    source={source}
                    style={{
                        width: size,
                        height: size,
                        marginBottom: 5,
                    }}
                    resizeMode="contain"
                />
                <Text style={{ color, fontSize: 12 }}>{label}</Text>
            </View>
        );
    };
    export default function TabLayout() {
      const colorScheme = useColorScheme();
      const bottomMarginIcon:number = 5;
      return (
        <Tabs
          screenOptions={{
              tabBarStyle: {
                  paddingTop: 10,
              },
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            // Disable the static render of the header on web
            // to prevent a hydration error in React Navigation v6.
            headerShown:false,
          }}>
          <Tabs.Screen
            name="home"
            options={{
                tabBarShowLabel: false,
                tabBarIcon: ({ color,size }:any) => (
                    <TabsView
                        color={color}
                        size={size}
                        label="Home"
                        source={require('@/assets/images/homeicon.png')}
                    />),
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
                tabBarShowLabel: false,
                tabBarIcon: ({ color,size }:any) => (
                    <TabsView
                        color={color}
                        size={size}
                        label="Search"
                        source={require('@/assets/images/searchicon.png')}
                    />),
            }}
          />
            <Tabs.Screen
                name="reading"
                options={{
                    tabBarShowLabel: false,
                    tabBarIcon: ({ color,size }:any) => (
                        <TabsView
                            color={color}
                            size={size}
                            label="Reading"
                            source={require('@/assets/images/readingicon.png')}
                        />),
                }}
            />
            <Tabs.Screen
                name="myprofile"
                options={{
                    tabBarShowLabel: false,
                    tabBarIcon: ({ color,size }:any) => (
                        <TabsView
                            color={color}
                            size={size}
                            label="My Profile"
                            source={require("@/assets/images/profileicon.png")}
                        />),
                }}
            />
        </Tabs>
      );
    }
