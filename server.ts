import path from "node:path";

// Set production environment variables
process.env.NODE_ENV = "production";
// Set the port to 3000 (which is the only port accessible from the outside)
process.env.PORT = process.env.PORT ?? "3000";
// Set the path to the compiled frontend static files
process.env.FRONTEND_DIST = path.resolve("artifacts/pos-system/dist/public");

console.log(`Starting production server on port ${process.env.PORT}...`);
console.log(`Serving frontend from: ${process.env.FRONTEND_DIST}`);

// Dynamically import the compiled Express API server entry point
await import("./artifacts/api-server/dist/index.mjs");
