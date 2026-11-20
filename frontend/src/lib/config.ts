// Where the frontend sends API calls. Set NEXT_PUBLIC_API_BASE_URL in .env.local to change it.
//   (not set)                   -> the Spring Boot backend on this machine (default)
//   /mock-api                   -> built-in mock in src/mock, no backend needed
const DEFAULT_API_BASE_URL = "http://localhost:8080/api";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
