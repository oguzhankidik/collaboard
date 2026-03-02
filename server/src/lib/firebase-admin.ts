import * as admin from 'firebase-admin'

const hasCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY

if (!admin.apps.length) {
  if (hasCredentials) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } else {
    console.warn('[firebase-admin] No credentials set — auth will be skipped (dev mode)')
    admin.initializeApp()
  }
}

export { admin, hasCredentials }
