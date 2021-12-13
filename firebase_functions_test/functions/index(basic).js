const functions = require("firebase-functions");
const admin = require("firebase-admin");

const fs = require('fs')
let serviceAccount = JSON.parse(fs.readFileSync('dapp-training-275b0-firebase-adminsdk-4hl06-c47c0ba957.json', 'utf-8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://dapp-training-275b0.appspot.com/"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

exports.uploadProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "user is not authenticated")
  }
  const base64EncodedImageString = data.image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = new Buffer(base64EncodedImageString, 'base64');

  const file = bucket.file(context.auth.uid + ".jpg");
  await file.save(imageBuffer, { contentType: 'image/jpeg' });
  const photoURL = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' }).then(urls => urls[0]);

  let query = await db.collection("users").where("uid", "==", context.auth.uid).get();
  let userData = null;
  query.docs.forEach(user => {
    userData = user.data();
    userData.profileUrl = photoURL
  })

  await db.collection("users").doc(userData.email).set(userData)

  return { photoURL };
});

exports.fetchAvailableColors = functions.https.onCall(async () => {
  let query = await db.collection("color-game").doc("available-colors").get();
  return query.data();
});

exports.fetchUsers = functions.https.onCall(async () => {
  let query = await db.collection("users").get();
  let result = {};

  query.docs.forEach(content => {
    let data = content.data();

    result[data.email] = data;
  })

  return result;
});

exports.updateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "user is not authenticated")
  }
  let query = await db.collection("users").where("uid", "==", context.auth.uid).get();

  let userData = null;
  query.docs.forEach(user => {
    userData = user.data();
  })

  return await db.collection("users").doc(userData.email).set(data.user);
});

exports.updateAvailability = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "user is not authenticated")
  }

  return await db.collection("color-game").doc("available-colors").set(data.availableChoices);
});

