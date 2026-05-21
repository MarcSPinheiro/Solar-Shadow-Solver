// Plain JS handler: imports the pre-built Express app bundle so Vercel's
// TypeScript compiler never touches pino-http source and hits TS2349.
export { default } from "../dist/handler.mjs";
