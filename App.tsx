import React from 'react';
import {createStaticNavigation, useNavigation} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackNavigationProp} from '@react-navigation/native-stack';
//import {Link} from '@react-navigation/native';
//import {Button} from '@react-navigation/elements';
import { Text, View, StyleSheet, TouchableOpacity} from 'react-native';

type RootStackParamList = {
    Home: undefined;
    Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList,'Home'>;


const RootStack = createNativeStackNavigator<RootStackParamList>({
    screens: {
        Home: {
            screen: AppScreen,
            options: {title: 'Home'},
        },
        Profile: {
            screen: ScanScreen,
            options: {title: 'Profile'},
        },
    },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
    return <Navigation />
}

function AppScreen() {
    const navigation = useNavigation<NavigationProp>();
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hello World</Text>

            <TouchableOpacity style={styles.buttonScan} onPress={()=> navigation.navigate('Profile')}>
                <Text style={styles.buttonScanText}>{"Scan!"}</Text>
            </TouchableOpacity>
        </View>

    )
}

function ScanScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Scan your cosmetics!</Text>
        </View>

    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'pink',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 50,
        fontWeight: 'bold',
        color: 'green',
    },
    buttonScan: {
        margin: 20,
        alignItems: 'center',
        width: 100,
        height: 40,
        backgroundColor: 'green',
        justifyContent: 'center',
        borderRadius: 10,
    },
    buttonScanText: {
        fontSize: 20,
        textAlign: 'center',
        color: 'white',

    }
})

//export default ScanScreen;
//export default AppScreen;
