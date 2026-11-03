exports.handler = async function(event, context) {
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAkJXeuphCG5zIheVDFAYGiF95pgdJbuJA",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "sample-storex-26.firebaseapp.com",
        projectId: process.env.FIREBASE_PROJECT_ID || "sample-storex-26",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "sample-storex-26.firebasestorage.app",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "247277059633",
        appId: process.env.FIREBASE_APP_ID || "1:247277059633:web:baf60ffd0bc26b5d529f10",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://sample-storex-26-default-rtdb.firebaseio.com",
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-6EYZT6PCTW"
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