import React from "react";
import { View, ActivityIndicator } from "react-native";
import tw from "@/app/tailwind";
import UserDashboard from "@/components/user-dashboard";
import { useThemeColor } from "@/hooks/useThemeColor";
import MyText from "@/components/text";
import { useRoles } from "@/components/context/roles-context";
import { ROLE_NAMES } from "@/lib/constants";
import useHideDrawerHeader from "@/hooks/useHideDrawerHeader";
import { useAuth } from "@/components/context/auth-context";
import { useGetUserById } from "@/api-hooks/user.api";
import AppContainer from "@/components/app-container";

function Index() {
  const roles = useRoles();
  const { userId } = useAuth();
  const { data: user, isLoading: isUserLoading } = useGetUserById(userId);

  const accentColor = useThemeColor(
    { light: "#4f46e5", dark: "#818cf8" },
    "tint"
  );

  // Use the hook to hide the drawer header if needed

  // If roles or user data are still loading, show a loading indicator
  if (!roles || isUserLoading) {
    return (
      <AppContainer >
        <ActivityIndicator size="large" color={accentColor} />
        <MyText style={tw`mt-4`}>Loading dashboard...</MyText>
      </AppContainer>
    );
  } else {
    // Default to the regular user dashboard
    return <UserDashboard userName={user?.name || "User"} />;
  }
}

export default Index;
