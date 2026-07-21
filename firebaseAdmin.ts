import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY belum diset di environment variables.");
  }

  const serviceAccount = JSON.parse(serviceAccountRaw);

  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
  return adminApp;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
