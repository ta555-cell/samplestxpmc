exports.handler = async function(event, context) {
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC1wDCkQF9b8XT2zIcOvZGdQonqzmf1tPU",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "samplestxpl.firebaseapp.com",
        projectId: process.env.FIREBASE_PROJECT_ID || "samplestxpl",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "samplestxpl.firebasestorage.app",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "933477631802",
        appId: process.env.FIREBASE_APP_ID || "1:933477631802:web:524c9b805fa30de1b7b203",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://samplestxpl-default-rtdb.firebaseio.com",
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-MGX68RJBR4"
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