// Import and configure dotenv at the VERY TOP of the file
import * as dotenv from 'dotenv';
dotenv.config();

// NOW you can import and use other parts of your application
import express from 'express';
// ... your other imports for controllers, routes, etc.

// The rest of your server setup...
const app = express();
const port = 3000;

// When your PostgresAuthRepository is instantiated somewhere in your app,
// it will now successfully find process.env.DATABASE_URL.

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});