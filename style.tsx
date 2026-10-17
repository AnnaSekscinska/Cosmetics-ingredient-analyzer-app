import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffdab9',
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
        borderColor: '#f8ad9d',
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
        backgroundColor: '#f8ad9d',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
    },
    captureButtonDisabled: {
        backgroundColor: '#f08080',
    },
    captureText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    resultBox: {
        position: 'absolute',
        top: 20,
        bottom: 115,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 15,
        borderRadius: 10,
    },
    resultText: {
        color: '#f08080',
        fontSize: 16,
    },

    closeResultButton: {
        alignSelf: 'flex-end',
        justifyContent: 'center',
        alignItems: 'center',
        width: 35,
        height: 35,
        marginBottom: 5,
    },

    closeResultText: {
        color: '#f08080',
        fontSize: 26,
        fontWeight: 'bold',
    },

    resultScroll: {
        flex: 1,
    },
    homeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffdab9',
    },
    title: {
        fontSize: 40,
        color: '#f08080',
        marginBottom: 25,
    },
    buttonScan: {
        backgroundColor: '#f8ad9d',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 20
    },
    buttonScanText: {
        color: '#f08080',
        fontSize: 18,
    },
    logo: {
        width: 180,
        height: 20,
        flex: 1
    },

    buttonSettings: {
        backgroundColor: '#f8ad9d',

    }
});