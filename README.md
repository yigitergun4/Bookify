# Bookify

## Firebase Setup

1. Copy `FirebaseConfig.template.ts` to `FirebaseConfig.ts`
2. Create a `.env` file in the root directory
3. Add your Firebase configuration to the `.env` file:

```env
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_auth_domain_here
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
FIREBASE_APP_ID=your_app_id_here
```

4. Never commit your `.env` file or `FirebaseConfig.ts` to version control
