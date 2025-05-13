import React from "react";
import { Image, Text, View } from "react-native";
import { Tabs } from "expo-router";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import homeIcon from "@/assets/images/homeicon.png";
import { DarkTheme } from "@react-navigation/native/src";

const HomeIcon = () => (
  <Image
    src={homeIcon}
    style={{ width: 40, height: 40 }}
    resizeMode="contain"
  />
);

type TabsViewProps = {
  color: string;
  size: number;
  label: string;
  source: any;
};

const TabsView = ({ color, size, label, source }: TabsViewProps) => {
  return (
    <View style={{ alignItems: "center", minWidth: 60 }}>
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
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          paddingTop: 10,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="homefolder"
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ size }: any) => (
            <TabsView
              color="black"
              size={size}
              label="Home"
              source={require("@/assets/images/homeicon.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search/index"
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ size }: any) => (
            <TabsView
              color="black"
              size={size}
              label="Search"
              source={require("@/assets/images/searchicon.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reading/index"
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ size }: any) => (
            <TabsView
              color="black"
              size={size}
              label="Reading"
              source={require("@/assets/images/readingicon.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ size }: any) => (
            <TabsView
              color="black"
              size={size}
              label="My Profile"
              source={require("@/assets/images/profileicon.png")}
            />
          ),
        }}
      />
    </Tabs>
  );
}
