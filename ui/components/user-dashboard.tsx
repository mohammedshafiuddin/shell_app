import tw from '@/app/tailwind'
import MyText from '@/components/text'
import React from 'react'
import { View, ScrollView, } from 'react-native'
import { useRouter } from 'expo-router'
import { useThemeColor } from '@/hooks/useThemeColor'
import AppContainer from '@/components/app-container'
import { Ionicons } from '@expo/vector-icons'
import WelcomeBanner from '@/components/welcome-banner'
import SectionHeader from '@/components/section-header'
import useHideDrawerHeader from '@/hooks/useHideDrawerHeader'

interface UserDashboardProps {
  userName: string;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ userName }) => {
    const router = useRouter()
    const textColor = useThemeColor({ light: '#333', dark: '#f3f4f6' }, 'text')
    const accentColor = useThemeColor({ light: '#4f46e5', dark: '#818cf8' }, 'tint')
    const backgroundColor = useThemeColor({ light: '#f9fafb', dark: '#111827' }, 'background')

    return (
        <AppContainer>
            <ScrollView style={tw`flex-1 bg-gray-50 dark:bg-gray-900`} contentContainerStyle={tw`pb-8`}>
                {/* Welcome Banner */}
                <WelcomeBanner 
                  userName={userName} 
                />
            </ScrollView>
        </AppContainer>
    )
}

export default UserDashboard