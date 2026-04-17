import React, {useEffect, useRef, useState} from 'react';
import {Text, View, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';

import {NavigationContainer, useNavigation} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackNavigationProp} from '@react-navigation/native-stack';

import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {HybridOcr} from 'react-native-ocr-fast';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;


function CameraView() {
    const camera = useRef<Camera>(null);
    const device = useCameraDevice('back');

    const [hasPermission, setHasPermission] = useState(false);
    const [ocrText, setOcrText] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
        })();
    }, []);

    if (!hasPermission) return <Text>No camera permission</Text>;
    if (!device) return <Text>Loading camera...</Text>;

    const captureAndScan = async () => {
        if (!camera.current) return;

        setIsScanning(true);

        try {
            const photo = await camera.current.takePhoto({
                flash: 'off',
            });

            const result = await HybridOcr.scanImage(photo.path);

            //console.log('OCR RESULT:', result);

            setOcrText(result || 'No text detected');
        } catch (e: any) {
           // console.error(e);
            setOcrText('Error: ' + e.message);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <View style={styles.container}>
            <Camera
                ref={camera}
                style={styles.preview}
                device={device}
                isActive={true}
                photo={true}
            />

            <View style={styles.focusFrame}>
                <Text style={styles.focusText}>Position text here</Text>
            </View>

            <TouchableOpacity
                style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
                onPress={captureAndScan}
                disabled={isScanning}
            >
                <Text style={styles.captureText}>
                    {isScanning ? 'Scanning...' : 'Scan INCI'}
                </Text>
            </TouchableOpacity>


            {ocrText ? (
                <ScrollView style={styles.resultBox}>
                    <Text style={styles.resultText}>{ocrText}</Text>
                </ScrollView>
            ) : null}
        </View>
    );
}


function HomeScreen() {
    const navigation = useNavigation<NavigationProp>();

    return (
        <View style={styles.homeContainer}>
            <Text style={styles.title}>Welcome to my app!</Text>

            <TouchableOpacity
                style={styles.buttonScan}
                onPress={() => navigation.navigate('Scan')}
            >
                <Text style={styles.buttonScanText}>Scan</Text>
            </TouchableOpacity>
        </View>
    );
}


const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Scan" component={CameraView} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'lightpink',
    },
    preview: {
        flex: 1,
    },
    focusFrame: {
        position: 'absolute',
        left: '10%',
        top: '30%',
        width: '80%',
        height: '40%',
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    focusText: {
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 6,
    },
    captureButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
    },
    captureButtonDisabled: {
        backgroundColor: 'lightgreen',
    },
    captureText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    resultBox: {
        position: 'absolute',
        top: 80,
        left: 20,
        right: 20,
        maxHeight: 200,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 15,
        borderRadius: 10,
    },
    resultText: {
        color: 'white',
        fontSize: 16,
    },
    homeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'lightpink',
    },
    title: {
        fontSize: 40,
        color: 'white',
        marginBottom: 25,
    },
    buttonScan: {
        backgroundColor: 'green',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    buttonScanText: {
        color: 'white',
        fontSize: 18,
    },
});