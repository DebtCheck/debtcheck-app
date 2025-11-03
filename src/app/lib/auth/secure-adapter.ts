import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import type { PrismaClient } from "@prisma/client";
import { encryptToken } from "@/app/lib/crypto/token-crypto";

function protectAccountTokens<T extends AdapterAccount>(acc: T): T {
  const next = { ...acc };
  if (typeof next.access_token === "string" && next.access_token.length > 0) {
    next.access_token = encryptToken(next.access_token);
  }
  if (typeof next.refresh_token === "string" && next.refresh_token.length > 0) {
    next.refresh_token = encryptToken(next.refresh_token);
  }
  return next as T;
}


export function SecurePrismaAdapter(prisma: PrismaClient): Adapter {
  const base = PrismaAdapter(prisma) as Adapter;

  // `linkAccount` existe dans PrismaAdapter (obligatoire côté Adapter).
  const linkImpl = base.linkAccount as (
    a: AdapterAccount
  ) => Promise<AdapterAccount | null | undefined>;

  return {
    ...base,

    async linkAccount(account: any) {
      const safe = protectAccountTokens(account);
      return linkImpl(safe);
    },

    // On ne touche pas aux autres méthodes. Si un jour tu écris/rafraîchis
    // les tokens ailleurs, fais l’update via prisma en chiffrant avant.
  };
}