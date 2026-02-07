Learn from `.cursor/skills/firebase-react-native` how to implement Firebase Cloud Storage using Firebase Web SDK in React Native/Expo applications.

## Implementation Steps

1. **Understand File Storage Requirements**
   - Identify file types to handle (images, documents, videos)
   - Plan file organization structure (folders/paths)
   - Determine file naming conventions
   - Plan metadata requirements
   - Design Storage security rules

2. **Implement File Upload (React Native Pattern)**
   - Use Firebase Web SDK patterns from the skill (not @react-native-firebase)
   - Import from `firebase/storage` and use `storage` from `config/firebase`
   - **Critical for React Native**: Convert URI to blob before upload:
     ```typescript
     const response = await fetch(imageUri);
     const blob = await response.blob();
     ```
   - Use `uploadBytes()` or `uploadString()` for uploads
   - Get download URL with `getDownloadURL()` after upload
   - Implement proper file naming (use timestamps or UUIDs)
   - Organize files in folders (e.g., `images/`, `documents/`, `users/{userId}/`)

3. **File Operations**
   - **Upload**: Convert URI → blob → upload → get URL
   - **Download**: Use `getDownloadURL()` to get public URL
   - **Delete**: Use `deleteObject()` with storage reference
   - **Metadata**: Use `getMetadata()` and `updateMetadata()` if needed
   - **List Files**: Use `listAll()` for folder contents

4. **Progress Tracking & Optimization**
   - For images: Implement compression before upload (use libraries like `react-native-image-picker` with quality settings)
   - Show upload progress indicators (Firebase Web SDK doesn't have built-in progress, consider custom implementation)
   - Handle large files appropriately (consider chunking for very large files)
   - Cache download URLs to avoid repeated `getDownloadURL()` calls

5. **Error Handling & Network Issues**
   - Wrap all storage operations in try-catch blocks
   - Handle specific storage error codes:
     - `storage/unauthorized`
     - `storage/object-not-found`
     - `storage/quota-exceeded`
     - `storage/unauthenticated`
   - Handle network failures gracefully
   - Implement retry logic for failed uploads
   - Validate file types and sizes before upload
   - Show user-friendly error messages

6. **React Native Integration**
   - Use `expo-image-picker` or `react-native-image-picker` for file selection
   - Handle both camera and gallery sources
   - Display images using `<Image>` component with download URLs
   - Implement loading states during upload/download
   - Store download URLs in Firestore if needed for app data

## Key Patterns from Skill

- **Blob Conversion**: React Native URIs must be converted to blobs
- **Upload Pattern**: `fetch(uri)` → `blob()` → `uploadBytes()` → `getDownloadURL()`
- **File Organization**: Use folder structure (`images/`, `users/{userId}/`)
- **Error Handling**: Check `error.code` for specific storage errors
- **URL Caching**: Cache download URLs instead of calling `getDownloadURL()` repeatedly

## React Native Specific Considerations

- **Image Picker**: Use `expo-image-picker` or `react-native-image-picker`
- **Blob Conversion**: Required for all file uploads (not needed for web)
- **File URIs**: Handle `file://` and `content://` URIs
- **Permissions**: Request camera/gallery permissions before picking files
- **Image Compression**: Compress images before upload to save bandwidth

## Reference Files

- Main patterns: `.cursor/skills/firebase-react-native/SKILL.md`
- Complete API: `.cursor/skills/firebase-react-native/FIREBASE_API.md`
- Quick reference: `.cursor/skills/firebase-react-native/QUICK_REFERENCE.md`
- Usage examples: `config/FIREBASE_USAGE.md`