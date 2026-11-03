exports.handler = async function(event, context) {
    const firebaseConfig = {
        apiKey: "YAHAN_APNI_ASAL_API_KEY_LIKHEIN",
        authDomain: "samplestxpl.firebaseapp.com",
        projectId: "samplestxpl",
        storageBucket: "samplestxpl.firebasestorage.app",
        messagingSenderId: "933477631802",
        appId: "1:933477631802:web:524c9b805fa30de1b7b203",
        databaseURL: "https://samplestxpl-default-rtdb.firebaseio.com",
        measurementId: "G-MGX68RJBR4"
    };

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            status: "success",
            config: firebaseConfig,
            message: "Secure config loaded from Netlify Serverless Function!"
        })
    };
};