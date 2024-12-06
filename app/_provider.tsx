"use client";

import {
  ThirdwebProvider,
  coinbaseWallet,
  embeddedWallet,
  en,
  localWallet,
  metamaskWallet,
  rainbowWallet,
  walletConnect,
} from "@thirdweb-dev/react";
import { Avalanche } from "@thirdweb-dev/chains";

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider
      activeChain={Avalanche}
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
      locale={en()}
      // signer={}
      supportedWallets={[
        metamaskWallet(),
        coinbaseWallet(),
        walletConnect(),
        localWallet(),
        embeddedWallet({
          auth: {
            options: ["email", "google", "apple", "facebook"],
          },
        }),
        rainbowWallet(),
      ]}
    >
      {children}
    </ThirdwebProvider>
  );
}
