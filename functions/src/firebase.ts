import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (getApps().length === 0) initializeApp();

export const db = () => getFirestore();
/** Default Firebase Storage bucket of the project. */
export const bucket = () => getStorage().bucket();

export type StorageFile = ReturnType<ReturnType<typeof bucket>["file"]>;

/**
 * Private bucket of user resumes (`<project id>-resumes`, created by Terraform). Kept apart from the
 * CMS bucket so personal data has its own retention and access.
 */
export const resumesBucket = () =>
  getStorage().bucket(`${process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT}-resumes`);
