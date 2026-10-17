import React, {useEffect, useRef, useState} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    NativeModules,
    LayoutChangeEvent,
} from 'react-native';

import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {HybridOcr} from 'react-native-ocr-fast';

import {HomeScreen} from './HomeScreen.tsx';
import {styles} from './style.tsx';

const {YoloModule} = NativeModules;

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    Settings: undefined;
};

const extractIngredients = (text: string): string => {
    if (!text) {
        return '';
    }

    const cleaned = text
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

    const startRegex =
        /\b(?:ingredients?|ingredlents?|ingred\s*ients?|ingrédients?|ingredientes?|składniki|skład)\s*[:\-]?\s*/i;

    const match = startRegex.exec(cleaned);

    if (!match) {
        return '';
    }

    let ingredients = cleaned.substring(
        match.index + match[0].length,
    );

    const endRegex =
        /\b(?:directions?|how to use|warnings?|caution|usage|made in|produced by|manufactured by|distributed by|www\.|volume|vol\.?)\b/i;

    const endMatch = endRegex.exec(ingredients);

    if (endMatch) {
        ingredients = ingredients.substring(0, endMatch.index);
    }

    ingredients = ingredients
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const parts = ingredients
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

    if (parts.length < 3) {
        return '';
    }

    return ingredients;
};

function CameraView() {
    const camera = useRef<Camera>(null);
    const device = useCameraDevice('back');

    const [hasPermission, setHasPermission] = useState(false);
    const [ocrText, setOcrText] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const [previewSize, setPreviewSize] = useState({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const onPreviewLayout = (event: LayoutChangeEvent) => {
        const {width, height} = event.nativeEvent.layout;

        setPreviewSize(previous => {
            if (
                previous.width === width &&
                previous.height === height
            ) {
                return previous;
            }

            return {width, height};
        });
    };

    const captureAndScan = async () => {
        if (!camera.current || isScanning) {
            return;
        }

        if (
            previewSize.width <= 0 ||
            previewSize.height <= 0
        ) {
            setOcrText(
                'Podgląd aparatu nie jest jeszcze gotowy.',
            );
            return;
        }

        setIsScanning(true);
        setOcrText('');

        try {
            const photo = await camera.current.takePhoto({
                flash: 'off',
            });

        console.log('PHOTO SIZE:', {
                width: photo.width,
                height: photo.height,
                orientation: photo.orientation,
            });

        console.log('PREVIEW SIZE:', previewSize);

            const detection = await YoloModule.detectIngredients(
                photo.path,
                previewSize.width,
                previewSize.height,
            );

        console.log('YOLO DETECTION:', detection);
        console.log('OCR używa cropa:', detection.cropPath);

            const result = await HybridOcr.scanImage(
                detection.cropPath,
            );

            const ingredients = extractIngredients(result || '');

        console.log('RAW OCR:', result);
        console.log('INCI ONLY:', ingredients);

            setOcrText(
                ingredients ||
                'Nie udało się rozpoznać samego składu. Spróbuj zeskanować ponownie.',
            );
        } catch (e: any) {
        console.error('SCAN ERROR:', e);

        const code = String(e?.code || '');
        const message = String(e?.message || e || '');

        if (
            code === 'OUTSIDE_FRAME' ||
            message.includes('OUTSIDE_FRAME') ||
            message.includes('poza ramką')
        ) {
            setOcrText(
                'Skład INCI znajduje się poza ramką. Umieść cały skład wewnątrz ramki i spróbuj ponownie.',
            );
        } else if (
            code === 'NO_DETECTION' ||
            message.includes('NO_DETECTION') ||
            message.includes('Nie wykryto składu')
        ) {
            setOcrText(
                'Nie wykryto składu INCI. Spróbuj ponownie.',
            );
        } else {
            setOcrText(
                'Nie udało się zeskanować składu. Spróbuj ponownie.',
            );
        }
    } finally {
        setIsScanning(false);
    }
    };

    if (!hasPermission) {
        return <Text>No camera permission</Text>;
    }

    if (!device) {
        return <Text>Loading camera...</Text>;
    }

    return (
        <View
            style={styles.container}
            onLayout={onPreviewLayout}>

            <Camera
                ref={camera}
                style={styles.preview}
                device={device}
                isActive={true}
                photo={true}
            />

            <View style={styles.focusFrame}>
                <Text style={styles.focusText}>
                    Position text here
                </Text>
            </View>

            <TouchableOpacity
                style={[
                    styles.captureButton,
                    isScanning && styles.captureButtonDisabled,
                ]}
                onPress={captureAndScan}
                disabled={isScanning}>
                <Text style={styles.captureText}>
                    {isScanning ? 'Scanning...' : 'Scan INCI'}
                </Text>
            </TouchableOpacity>

            {ocrText ? (
                <View style={styles.resultBox}>

                    <TouchableOpacity
                        style={styles.closeResultButton}
                        onPress={() => setOcrText('')}>
                        <Text style={styles.closeResultText}>✕</Text>
                    </TouchableOpacity>

                    <ScrollView
                        style={styles.resultScroll}
                        nestedScrollEnabled={true}>
                        <Text style={styles.resultText}>
                            {ocrText}
                        </Text>
                    </ScrollView>

                </View>
            ) : null}
        </View>
    );
}

const Stack =
    createNativeStackNavigator<RootStackParamList>();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                />
                <Stack.Screen
                    name="Scan"
                    component={CameraView}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}