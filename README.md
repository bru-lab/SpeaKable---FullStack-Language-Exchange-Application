[README.md](https://github.com/user-attachments/files/35248648/README.md)
# SpeakAble

**SpeakAble** is a language-exchange application that helps people
connect with other learners and native speakers, practice languages, and
communicate through real-time conversations.

The project is built with **React Native, Expo, Node.js, Express,
MongoDB, and Socket.IO**. The frontend supports mobile and web, while
the backend provides authentication, user discovery, exchange requests,
and messaging.

## Live application

-   **Web app:**
    https://speakable-language-exchange-application.onrender.com
-   **Backend API:** https://speakable-backend-8c77.onrender.com
-   **Backend health check:**
    https://speakable-backend-8c77.onrender.com/health
-   **GitHub repository:** https://github.com/bru-lab/speakable

> The hosted services may take a short time to respond after periods of
> inactivity.

## Features

-   **Authentication:** user registration and login with JWT-based
    authentication.
-   **User profiles:** profile information, profile pictures,
    biographies, locations, interests, and language preferences.
-   **Language matching:** discover other users based on
    language-exchange interests.
-   **Exchange requests:** send and manage requests to connect with
    other learners.
-   **Real-time messaging:** communicate through conversations powered
    by Socket.IO.
-   **Online presence:** see when other users are online or offline.
-   **Typing indicators:** receive real-time feedback when someone is
    typing.
-   **Message status:** delivery and read receipts.
-   **Message management:** edit and delete messages.
-   **Profile image uploads:** images are stored using Cloudinary.

## Technology stack

### Frontend

-   React Native
-   Expo
-   Expo Router
-   React Native Web
-   NativeWind
-   Zustand
-   Axios
-   Socket.IO Client
-   Expo SecureStore

### Backend

-   Node.js
-   Express
-   MongoDB
-   Mongoose
-   JSON Web Tokens (JWT)
-   Socket.IO
-   Cloudinary

### Deployment and services

-   Render --- backend and web frontend hosting
-   MongoDB Atlas --- database
-   Cloudinary --- profile image storage
-   Expo Application Services (EAS) --- native application builds

## Project structure

``` text
speakable/
├── backend/
│   ├── lib/
│   ├── src/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   └── package.json
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── store/
│   ├── assets/
│   └── package.json
│
└── README.md
```

The exact contents of each folder may evolve as the project develops.

## Run locally

### Prerequisites

-   Node.js (22 or later recommended)
-   npm
-   A MongoDB database (local MongoDB or MongoDB Atlas)
-   A Cloudinary account for profile image uploads

### 1. Clone the repository

``` bash
git clone https://github.com/bru-lab/speakable.git
cd speakable
```

### 2. Configure the backend

``` bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

``` env
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

FRONTEND_URL=http://localhost:8081
```

Start the backend using the start script:

``` bash
npm start
```

The API should be available at `http://localhost:5000`.

### 3. Configure the frontend

Open a second terminal:

``` bash
cd speakable/frontend
npm install
```

Create a `.env` file inside `frontend/`:

``` env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
```

For testing on a physical device, replace `localhost` with your
computer's local network IP address so the device can reach the backend.

### 4. Start the application

``` bash
npx expo start
```

To run the web version:

``` bash
npx expo start --web
```

Use the Expo development tools to open the app on a simulator, device,
or web browser.

## Environment variables

  --------------------------------------------------------------------------
  Variable                   Where                   Purpose
  -------------------------- ----------------------- -----------------------
  `PORT`                     Backend                 Port used by the
                                                     Express server

  `NODE_ENV`                 Backend                 Runtime environment

  `MONGO_URI`                Backend                 MongoDB connection
                                                     string

  `JWT_SECRET`               Backend                 Secret used to sign
                                                     authentication tokens

  `CLOUDINARY_CLOUD_NAME`    Backend                 Cloudinary cloud name

  `CLOUDINARY_API_KEY`       Backend                 Cloudinary API key

  `CLOUDINARY_API_SECRET`    Backend                 Cloudinary API secret

  `FRONTEND_URL`             Backend                 Allowed deployed web
                                                     frontend origin for
                                                     CORS

  `EXPO_PUBLIC_API_URL`      Frontend                Base URL for API
                                                     requests

  `EXPO_PUBLIC_SOCKET_URL`   Frontend                Base URL for Socket.IO
                                                     connections
  --------------------------------------------------------------------------

**Security:** Never commit `.env` files, database credentials, JWT
secrets, or Cloudinary secrets. The `EXPO_PUBLIC_` variables are
included in the client application bundle, so they must contain only
values intended to be public. Configure production variables in the
hosting provider's environment settings.

## Deployment

The current deployment uses Render:

-   The **backend** runs as a Docker-based web service.
-   The **web frontend** is built as a static Expo web export and
    published from the `frontend/dist` directory.
-   The backend connects to MongoDB Atlas and Cloudinary through
    environment variables.
-   The backend's `FRONTEND_URL` must match the deployed frontend origin
    so browser requests pass CORS validation.

The frontend build command used for the Render static site is:

``` bash
npm ci && npx expo export --platform web
```

The publish directory is:

``` text
dist
```

## What I learned

Building SpeakAble has been an opportunity to work across the full
application lifecycle, including:

-   Developing a cross-platform application with React Native and Expo.
-   Structuring a REST API with Express and MongoDB.
-   Implementing authentication and protected API routes.
-   Building real-time features with Socket.IO.
-   Managing application state with Zustand.
-   Handling image uploads with Cloudinary.
-   Configuring CORS and environment variables across local and
    production environments.
-   Deploying a Dockerized backend and a static web frontend.

## Future improvements

Potential next steps include:

-   Automated tests for frontend and backend workflows.
-   Push notifications for new messages and exchange requests.
-   Improved user search and language filters.
-   More profile customization and conversation features.
-   Accessibility and performance improvements.

## Author

**Bruno Pires**

-   GitHub: https://github.com/bru-lab
-   LinkedIn: https://linkedin.com/in/bruno-pires-3ba401355/

------------------------------------------------------------------------

*SpeakAble --- Connect, communicate, and learn languages together.*
