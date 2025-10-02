import MyText from "@/components/text";
import MyButton from "@/components/button";
import React from "react";
import { View, Image } from "react-native";
import tw from "@/app/tailwind";
import { useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import AppContainer from "@/components/app-container";

interface Props {}

function Index(props: Props) {
  const {} = props;
  const router = useRouter();

  return (
    <AppContainer>
      <View style={tw`flex-1 p-4 bg-gray-50`}>
        <View style={tw`flex-col gap-6`}>
          <View style={tw`items-center mb-2`}>
            <View style={tw`w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4`}>
              <MaterialIcons name="admin-panel-settings" size={40} color="#3b82f6" />
            </View>
            <MyText style={tw`text-3xl font-bold text-gray-800 mb-2`}>Admin Panel</MyText>
          </View>

        </View>
      </View>
    </AppContainer>
  );
}

export default Index;
