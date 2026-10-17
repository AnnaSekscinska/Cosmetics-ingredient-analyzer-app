import { useNavigation} from '@react-navigation/native';
import {Text, TouchableOpacity, View, Image} from "react-native";
import React from "react";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import { styles } from "./style.tsx";

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    Settings: undefined;
};


type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export function SettingsScreen() {
    const navigation = useNavigation<NavigationProp>();

    return (
        <View style={styles.homeContainer}>
            <Image style={styles.logo} source={require('./logoINCI.png')} />
            <Text style={styles.title}>INCiLens</Text>

            <TouchableOpacity
                style={styles.buttonScan}
                onPress={() => navigation.navigate('Scan')}
            >
                <Text style={styles.buttonScanText}>Scan</Text>
            </TouchableOpacity>
        </View>
    );
}