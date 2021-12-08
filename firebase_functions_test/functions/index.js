const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

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