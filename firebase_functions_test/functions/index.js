const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PrismaClient } = require('@prisma/client');

const fs = require('fs');
let serviceAccount = JSON.parse(fs.readFileSync('dapp-training-275b0-firebase-adminsdk-4hl06-c47c0ba957.json', 'utf-8'));

process.env.DATABASE_URL = functions.config().db.gcurl;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://dapp-training-275b0.appspot.com/"
});

const bucket = admin.storage().bucket();

const prisma = new PrismaClient();

exports.uploadProfile = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "user is not authenticated")
    }
    const base64EncodedImageString = data.image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = new Buffer(base64EncodedImageString, 'base64');

    const file = bucket.file(context.auth.uid + (Math.floor(Math.random() * 10000) + ".jpg"));
    await file.save(imageBuffer, { contentType: 'image/jpeg' });
    const photoURL = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' }).then(urls => urls[0]);

    return await prisma.users.update({
        where: {
            uid: context.auth.uid
        },
        data: {
            profileurl: photoURL
        }
    })
});

exports.fetchAvailableColors = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "user is not authenticated")
    }

    let colors = await prisma.availablecolors.findMany();
    let result = {};

    for (let x = 0; x < colors.length; x++) {
        result[colors[x].colors] = colors[x].available
    }

    return result
});

exports.fetchUsers = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "user is not authenticated")
    }

    let users = await prisma.users.findMany();
    let result = {};

    for (let x = 0; x < users.length; x++) {
        let user = {};
        user.choice = users[x].choice;
        user.email = users[x].email;
        user.profileUrl = users[x].profileurl;
        user.uid = users[x].uid;

        result[user.email] = user;
    }

    return result;
});

exports.updateUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "user is not authenticated")
    }

    return await prisma.users.update({
        where: {
            uid: context.auth.uid
        },
        data: {
            choice: data.user.choice
        }
    })

});

exports.updateAvailability = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "user is not authenticated")
    }

    let keys = Object.keys(data.availableChoices);
    let newAvailability = {};

    for (let x=0; x < keys.length; x++) {
        let option = await prisma.availablecolors.update({
            where: {
                colors: keys[x]
            },
            data: {
                available: data.availableChoices[keys[x]]
            }
        });

        newAvailability[option.colors] = option.available;
    }

    return newAvailability;
});

