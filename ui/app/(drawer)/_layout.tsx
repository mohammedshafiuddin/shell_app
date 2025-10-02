import { Drawer } from "expo-router/drawer";
import React, { useEffect } from "react";
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";

// import { useQueryClient } from "@tanstack/react-query";

import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";

import {
  Entypo,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { IconButton } from "react-native-paper";
import { colors } from "@/lib/theme-colors";
import tw from "../tailwind";
import { useTheme } from "../hooks/theme.context";
import MyText from "@/components/text";
import MyButton from "@/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { useRoles } from "@/components/context/roles-context";
import { useAuth } from "@/components/context/auth-context";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGetUserById } from "../../api-hooks/user.api";
import { ROLE_NAMES } from "@/lib/constants";
import DashboardHeader from "@/components/dashboard-header";

interface Props {}

function _layout(props: Props) {
  const {} = props;
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const roles = useRoles();
  const isAdmin = roles?.includes("admin");
  const isGenUser = roles?.includes(ROLE_NAMES.GENERAL_USER);
  const router = useRouter();

  useEffect(() => {
    // refreshRoles();
  }, []);

  const [spinning, setSpinning] = React.useState(false);

  const handleRefersh = () => {
    setSpinning(true);
    queryClient.clear();
    queryClient.removeQueries();
    queryClient.resetQueries({
      exact: false,
      type: "all",
    });
    // Simulate async operation
    setTimeout(() => {
      setSpinning(false);
    }, 1000);
  };

  return (
    <View style={{ marginBottom: 32, flexGrow: 1, backgroundColor: theme.colors.gray3 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <DashboardHeader
              onMenuPress={() => navigation.toggleDrawer()}
              onNotificationsPress={() =>
                router.push("/(drawer)/notifications" as any)
              }
              onProfilePress={() => router.push("/(drawer)/my-profile" as any)}
              onRefreshPress={handleRefersh}
              refreshing={spinning}
            />
          ),
        })}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: "Home",
            headerShown: false,
            drawerItemStyle: { height: 0 },
          }}
        />
        <Drawer.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            headerShown: true, // Show header only for dashboard root
            drawerIcon: ({
              color,
              focused,
            }: {
              focused: boolean;
              color: string;
            }) => (
              <MaterialCommunityIcons
                color={focused ? theme.colors.blue1 : theme.colors.gray1}
                name="view-dashboard-outline"
                size={24}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="login"
          options={{
            title: "Login",
            headerShown: true, // Show header only for dashboard root
            drawerIcon: ({
              color,
              focused,
            }: {
              focused: boolean;
              color: string;
            }) => (
              <MaterialCommunityIcons
                color={focused ? theme.colors.blue1 : theme.colors.gray1}
                name="view-dashboard-outline"
                size={24}
              />
            ),
          }}
        />

        <Drawer.Screen
          name="admin-panel"
          options={{
            title: "Admin Panel",
            headerShown: true,
            //   drawerItemStyle: isAdmin ? {} : { display: "none" },
            drawerIcon: ({
              color,
              focused,
            }: {
              focused: boolean;
              color: string;
            }) => (
              <Ionicons
                //   color={focused ? theme.colors.blue1 : theme.colors.gray1}
                name="settings-outline"
                size={24}
              />
            ),
          }}
        />

        <Drawer.Screen
          name="my-profile"
          options={{
            title: "My Profile",
            headerShown: true,
            drawerIcon: ({
              color,
              focused,
            }: {
              focused: boolean;
              color: string;
            }) => (
              <Ionicons
                name="person-outline"
                size={24}
                color={focused ? theme.colors.blue1 : theme.colors.gray1}
              />
            ),
          }}
        />
      </Drawer>
    </View>
  );
}

export default _layout;

function CustomDrawerContent(props: any) {
  const { theme } = useTheme();
  // const {userId} = useCurrentUserId();
  const { userId } = useAuth();
  const { data: user, refetch: refetchUserDetails } = useGetUserById(userId);

  const router = useRouter();

  const isHospitalAdmin = useRoles()?.includes(ROLE_NAMES.HOSPITAL_ADMIN);
  const isDoctorSecretary = useRoles()?.includes(ROLE_NAMES.DOCTOR_SECRETARY);
  const isGenUser = useRoles()?.includes(ROLE_NAMES.GENERAL_USER);
  const shouldFetchMyDoctors =
    Boolean(isHospitalAdmin) || Boolean(isDoctorSecretary);

  const hiddenRoutes = [
    "users",
    "home",
    "notifications",
    "not-found",
    "login",
    "signup",
    "payment-successful",
    "payment-failed",
    "index",
  ];
  const adminOnlyRoutes = ["admin-panel"];
  const genUserOnlyRoutes = ["my-tokens"];
  const hostpitalAdminOnlyRoutes = ["my-hospital", "todays-tokens"];
  const { logout, refreshRoles } = useAuth();
  const roles = useRoles();
  const isAdmin = roles?.includes("admin");

  useFocusEffect(
    React.useCallback(() => {
      if (Boolean(userId)) {
        refetchUserDetails();
        refreshRoles();
      }
    }, [])
  );

  React.useEffect(() => {
    refetchUserDetails();
  }, [userId]);

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        style={{ marginBottom: 24, height: "100%", backgroundColor: theme.colors.white1 }}
      >
        {/* User Profile Section */}
        {user && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.blue1,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderBottomRightRadius: 16,
              borderBottomLeftRadius: 16,
              marginBottom: 16,
            }}
          >
            {user.profilePicUrl ? (
              <Image
                source={{ uri: user.profilePicUrl }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              />
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: "#fff",
                  backgroundColor: theme.colors.blue2,
                }}
              >
                <MyText weight="bold" color="white1" style={{ fontSize: 24 }}>
                  {user.name?.[0] || "?"}
                </MyText>
              </View>
            )}
            <View>
              <MyText
                weight="bold"
                color="white1"
                style={{ fontSize: 18, marginBottom: 4 }}
              >
                {user.name}
              </MyText>
              <MyText color="white1" style={{ fontSize: 14, opacity: 0.9 }}>
                {user.mobile}
              </MyText>
            </View>
          </View>
        )}

        {/* Navigation Items */}
        <View style={{ paddingHorizontal: 8 }}>
          {props.state.routes.map((route: any, index: any) => {
            const { options } = props.descriptors[route.key];
            const isFocused = props.state.index === index;
            if (
              hiddenRoutes.includes(route.name) ||
              (!isAdmin && adminOnlyRoutes.includes(route.name)) ||
              (genUserOnlyRoutes.includes(route.name) && !isGenUser) ||
              (hostpitalAdminOnlyRoutes.includes(route.name) &&
                !isHospitalAdmin)
            ) {
              return null;
            }
            return (
              <React.Fragment key={route.key}>
                <DrawerItem
                  key={index}
                  label={({
                    focused,
                    color,
                  }: {
                    focused: boolean;
                    color: string;
                  }) => {
                    return (
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <MyText
                          weight={focused ? "bold" : "regular"}
                          color={focused ? "blue1" : "gray1"}
                          style={{ fontSize: 16 }}
                        >
                          {options.title}
                        </MyText>
                        <MaterialIcons
                          name="chevron-right"
                          color={
                            focused ? theme.colors.blue1 : theme.colors.gray1
                          }
                          size={20}
                        />
                      </View>
                    );
                  }}
                  onPress={() => props.navigation.navigate(route.name)}
                  focused={isFocused}
                  activeBackgroundColor={theme.colors.blue3}
                  inactiveBackgroundColor={theme.colors.white1}
                  icon={({ color, focused, size }) => (
                    <View style={{ marginRight: 12 }}>
                      {options.drawerIcon({ color, focused, size })}
                    </View>
                  )}
                  style={{
                    borderRadius: 8,
                    marginHorizontal: 8,
                    marginVertical: 2,
                  }}
                />
              </React.Fragment>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View
        style={{
          padding: 12,
          backgroundColor: theme.colors.gray3,
          borderTopWidth: 1,
          borderTopColor: theme.colors.gray2,
        }}
      >
        <MyButton
          onPress={() => logout({})}
          style={{
            backgroundColor: colors.red1,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 16,
          }}
        >
          <MyText weight="bold" color="white1" style={{ textAlign: "center" }}>
            Logout
          </MyText>
        </MyButton>
      </View>
    </View>
  );
}
