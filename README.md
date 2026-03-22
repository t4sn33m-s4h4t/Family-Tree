# 🌳 Tasneem Family Tree

A full-featured family tree web application built with React, Firebase, and Cloudinary. Explore your family heritage, manage relationships, and celebrate birthdays together.

🔗 **Live Site:** [https://tasneem-family-tree.web.app](https://tasneem-family-tree.web.app)

---

## ✨ Features

### 🌳 Family Tree View
- Interactive drag-to-pan and scroll-to-zoom tree
- Spouse connector lines (dashed pink)
- Child connector lines (purple curves)
- Click any person to open their profile modal
- Floating member stats (male / female / total count)
- Auto-centers on the root person on load

### 👤 Person Profiles
- Photo, name, gender, birth date, death date
- Age calculated automatically
- Clickable phone number (opens dialer)
- Clickable Facebook ID (opens profile in new tab)
- Shows parents, spouses, and children

### 🎂 Birthdays Page
- Today's birthdays highlighted in gold
- Upcoming birthdays (next 30 days) with countdown
- Full Jan → Dec birthday calendar
- Line chart showing birthdays per month
- Zodiac sign for each person

### 💍 Marriage Queue (বিয়ের সিরিয়াল)
- Lists all unmarried, living family members above 18
- Sorted by age (oldest first)
- Separate Male and Female sections
- Summary stats card

### ✏️ Edit System
- Password-protected edit page for regular users
- Editors can request access — admin approves
- All edits go to admin as pending requests
- Admin can edit, approve, or decline requests
- Editors bypass password and save directly

### 🛡️ Admin Panel
- Add and delete people
- Manage relationships (parents, spouses, children)
- Approve / decline / edit pending requests
- Manage editor access (approve/revoke)
- Change global edit password
- Delete all people (danger zone)

### 👤 User Accounts
- Google and Email/Password login
- Profile page — change display name, photo, password
- Google users managed through Google account

### 🎨 Design
- Dark glassmorphism theme
- Fully responsive navbar with mobile hamburger menu
- Smooth animations and hover effects

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 + inline styles |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Hosting | Firebase Hosting |
| Image Upload | Cloudinary |
| Charts | Recharts |
| Routing | React Router v6 |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase account
- Cloudinary account

### Installation
```bash
git clone https://github.com/YOURUSERNAME/family-tree.git
cd family-tree
npm install
```

### Environment Variables

Create a `.env` file in the root of your project:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_API_KEY=your_cloudinary_api_key
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** (start in test mode)
3. Enable **Authentication** → Email/Password + Google
4. Enable **Firebase Hosting**
5. Create a `config/settings` document in Firestore:
```
adminUID: "your_firebase_uid"
editPassword: "your_edit_password"
editorUIDs: []
```

### Cloudinary Setup

1. Create account at [cloudinary.com](https://cloudinary.com)
2. Go to Settings → Upload → Upload Presets
3. Create a preset named `family_tree_preset` with **Unsigned** signing mode

### Run Locally
```bash
npm run dev
```

### Deploy to Firebase
```bash
npm run build
firebase deploy --only hosting
```

---

## 🔐 Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/config/settings).data.adminUID == request.auth.uid;
    }

    function isEditor() {
      return isSignedIn() &&
        request.auth.uid in get(/databases/$(database)/documents/config/settings).data.editorUIDs;
    }

    function isAdminOrEditor() {
      return isAdmin() || isEditor();
    }

    match /config/settings {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /people/{personId} {
      allow read: if true;
      allow write: if isAdminOrEditor();
    }

    match /pendingEdits/{editId} {
      allow read: if isAdminOrEditor();
      allow create: if isSignedIn();
      allow update, delete: if isAdminOrEditor();
    }

    match /editorRequests/{reqId} {
      allow read: if isAdmin();
      allow create: if isSignedIn();
      allow delete: if isAdmin();
    }

    match /approvedEditors/{docId} {
      allow read, write: if isAdmin();
    }
  }
}
```

---

## 📁 Project Structure
```
src/
├── components/
│   ├── Navbar.jsx          # Responsive navbar with mobile menu
│   └── ProtectedRoute.jsx
├── contexts/
│   └── AuthContext.jsx     # Firebase auth + editor/admin state
├── pages/
│   ├── Home.jsx            # Family tree view
│   ├── Login.jsx           # Email + Google login
│   ├── EditPage.jsx        # Password protected edit page
│   ├── AdminPage.jsx       # Full admin panel
│   ├── Profile.jsx         # User profile settings
│   ├── Birthdays.jsx       # Birthday calendar + chart
│   ├── MarriageList.jsx    # Unmarried members list
│   └── SeedData.jsx        # Demo data seeder (remove in prod)
├── firebase.js             # Firebase config
├── App.jsx                 # Routes
├── main.jsx
└── index.css               # Tailwind + global styles
```

---

## 👨‍💼 Admin Access

- **Admin Email:** mdsahat6397@gmail.com
- Admin panel is accessible at `/admin`
- Only the admin UID stored in Firestore has access

---

## 📝 Notes

- Remove the `/seed` route from `App.jsx` before going to production
- `.env` file must never be committed to GitHub
- Firebase free tier (Spark plan) is sufficient for family use
- Cloudinary free tier allows 25GB storage

---

## 📄 License

This project is private and intended for personal family use only.