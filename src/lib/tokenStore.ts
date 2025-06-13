import { extendedToken } from "@/types/next-auth";

let latestToken: extendedToken = {};

export function setLatestToken(token: extendedToken) {
  latestToken = token;
}

export function getLatestToken() {
  return latestToken;
}