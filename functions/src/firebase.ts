import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (getApps().length === 0) initializeApp();

export const db = () => getFirestore();
/** Default Firebase Storage bucket of the project. */
export const bucket = () => getStorage().bucket();

export type StorageFile = ReturnType<ReturnType<typeof bucket>["file"]>;
