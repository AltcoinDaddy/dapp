"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// Contract Configuration
const CONTRACT_ADDRESS = "0xCf2Fc01aa0565071dCDF7517eA4E616312ed5F50";
const MINT_PRICE = 0.005;
const MAX_SUPPLY = 9000;
// const AVALANCHE_RPC = "https://api.avax-test.network/ext/bc/C/rpc";

// const AVALANCHE_TESTNET_PARAMS = {
//   chainId: "0xA869",
//   chainName: "Avalanche Fuji Testnet",
//   nativeCurrency: {
//     name: "Avalanche",
//     symbol: "AVAX",
//     decimals: 18,
//   },
//   rpcUrls: [AVALANCHE_RPC],
//   blockExplorerUrls: ["https://testnet.snowtrace.io/"],
// };
// Replace the RPC and network configuration with Avalanche Mainnet
const AVALANCHE_RPC = "https://api.avax.network/ext/bc/C/rpc";

const AVALANCHE_MAINNET_PARAMS = {
  chainId: "0xA86A", // Mainnet chainId
  chainName: "Avalanche Network",
  nativeCurrency: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrls: [AVALANCHE_RPC],
  blockExplorerUrls: ["https://snowtrace.io/"],
};

const CONTRACT_ABI = [
  "function totalSupply() view returns (uint256)",
  "function mint(uint256 quantity) payable",
  "function MAX_SUPPLY() view returns (uint256)",
];

// Styles
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

.pixel-corners {
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}

.pixel-bg {
  background-image: linear-gradient(45deg, #232323 25%, transparent 25%), 
    linear-gradient(-45deg, #232323 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #232323 75%), 
    linear-gradient(-45deg, transparent 75%, #232323 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.glow {
  box-shadow: 0 0 10px #4f46e5, 0 0 20px #4f46e5, 0 0 30px #4f46e5;
  animation: glow 1.5s ease-in-out infinite alternate;
}

@keyframes glow {
  from {
    box-shadow: 0 0 5px #4f46e5, 0 0 10px #4f46e5, 0 0 15px #4f46e5;
  }
  to {
    box-shadow: 0 0 10px #4f46e5, 0 0 20px #4f46e5, 0 0 30px #4f46e5;
  }
}

.pixel-border {
  border: 4px solid;
  border-image-slice: 2;
  border-image-width: 2;
  border-image-outset: 0;
  border-image-source: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><path d='M0 2h2v2H0zM2 0h2v2H2zM4 2h2v2H4zM2 4h2v2H2z' fill='%234f46e5'/></svg>");
}

.wallet-info {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
`;

// Add styles to document
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default function MosaicNFT() {
  // State Management
  const [quantity, setQuantity] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [provider, setProvider] =
    useState<ethers.providers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [totalSupply, setTotalSupply] = useState(0);
  const [isMinting, setIsMinting] = useState(false);
  const [isMinted, setIsMinted] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<string>("0");

  const disconnectWallet = async () => {
    setIsConnected(false);
    setAccount("");
    setBalance("0");
    setSigner(null);
    setContract(null);
  };

  // Network Management
  const checkAndSwitchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: AVALANCHE_MAINNET_PARAMS.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [AVALANCHE_MAINNET_PARAMS],
          });
        } catch (addError) {
          console.error("Error adding network:", addError);
          setError("Failed to add network");
        }
      } else {
        console.error("Error switching network:", switchError);
        setError("Failed to switch network");
      }
    }
  };

  // Initialize Ethers
  const initializeEthers = async () => {
    if (typeof window.ethereum === "undefined") {
      setError("Please install MetaMask");
      return;
    }

    try {
      await checkAndSwitchNetwork();

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const rpcProvider = new ethers.providers.JsonRpcProvider(AVALANCHE_RPC);
      const signer = web3Provider.getSigner();

      setProvider(rpcProvider);
      setSigner(signer);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts[0]) {
        setAccount(accounts[0]);
        setIsConnected(true);

        // Get wallet balance
        const balance = await web3Provider.getBalance(accounts[0]);
        setBalance(ethers.utils.formatEther(balance));

        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        setContract(contract);

        try {
          const supply = await contract.totalSupply();
          setTotalSupply(supply.toNumber());
        } catch (err) {
          console.error("Error fetching supply:", err);
        }
      }

      // Event Listeners
      window.ethereum.on("accountsChanged", async (newAccounts: string[]) => {
        if (newAccounts.length > 0) {
          setAccount(newAccounts[0]);
          const balance = await web3Provider.getBalance(newAccounts[0]);
          setBalance(ethers.utils.formatEther(balance));
        } else {
          setAccount("");
          setIsConnected(false);
          setBalance("0");
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });

      window.ethereum.on("disconnect", () => {
        setIsConnected(false);
        setAccount("");
        setBalance("0");
      });
    } catch (err) {
      console.error("Initialization error:", err);
      setError("Failed to connect wallet");
    }
  };

  // Connect Wallet
  const connectWallet = async () => {
    try {
      await initializeEthers();
    } catch (err) {
      console.error("Connection error:", err);
      setError("Failed to connect wallet");
    }
  };

  // Handle Minting
  const handleMint = async () => {
    if (!contract || !signer) {
      setError("Please connect your wallet");
      return;
    }

    if (Number(balance) < MINT_PRICE * quantity) {
      setError("Insufficient balance");
      return;
    }

    try {
      setIsMinting(true);
      setError("");
      setIsMinted(false);

      const totalCost = ethers.utils.parseEther(
        (MINT_PRICE * quantity).toString()
      );

      const tx = await contract.mint(quantity, {
        value: totalCost,
      });

      await tx.wait();
      setIsMinted(true);

      // Update totals
      const newSupply = await contract.totalSupply();
      setTotalSupply(newSupply.toNumber());

      // Update balance
      if (provider && account) {
        const newBalance = await provider.getBalance(account);
        setBalance(ethers.utils.formatEther(newBalance));
      }
    } catch (err: any) {
      console.error("Minting error:", err);
      setError(err.message || "Minting failed");
    } finally {
      setIsMinting(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeEthers();
  }, []);

  // Calculate progress and cost
  const progress = (totalSupply / MAX_SUPPLY) * 100;
  const totalCost = quantity * MINT_PRICE;

  return (
    <div className="min-h-screen bg-black pixel-bg p-4 flex items-center justify-center">
      <Card className="w-full max-w-lg bg-gray-900 text-white border-0 pixel-corners pixel-border">
        <CardHeader className="space-y-4 text-center relative">
          {/* Wallet Connection Status */}
          {isConnected && (
            <div className=" flex flex-col items-end space-y-2">
              <div className="px-4 py-2 bg-gray-800 rounded-lg pixel-corners">
                <p className="text-xs font-['Press_Start_2P'] text-indigo-300">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
                <p className="text-xs font-['Press_Start_2P'] text-indigo-400">
                  {Number(balance).toFixed(4)} AVAX
                </p>
              </div>
              <Button
                onClick={disconnectWallet}
                className="bg-red-600 hover:bg-red-700 font-['Press_Start_2P'] text-xs pixel-corners"
              >
                Disconnect
              </Button>
            </div>
          )}

          <CardTitle className="text-2xl font-['Press_Start_2P'] text-indigo-400">
            Mosaic on AXAX
          </CardTitle>
          <CardDescription className="font-['Press_Start_2P'] text-xs text-indigo-300">
            Mint your unique collectibles
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* NFT Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-['Press_Start_2P']">
              <span className="text-indigo-300">Minted</span>
              <span className="text-indigo-400">
                {totalSupply}/{MAX_SUPPLY}
              </span>
            </div>
            <Progress
              value={progress}
              className="h-4 pixel-corners bg-gray-800"
              style={{
                background: "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)",
              }}
            />
          </div>

          {/* Minting Controls */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 bg-gray-800 p-4 pixel-corners">
              <Input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.min(50, Math.max(1, Number(e.target.value))))
                }
                className="w-24 bg-gray-700 border-indigo-500 text-white font-['Press_Start_2P'] text-sm pixel-corners"
                disabled={!isConnected}
              />
              <span className="flex-grow text-indigo-300 font-['Press_Start_2P'] text-sm">
                Cost: {totalCost} AVAX
              </span>
            </div>

            {!isConnected ? (
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 font-['Press_Start_2P'] text-sm pixel-corners glow"
                onClick={connectWallet}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Connect Wallet</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </Button>
            ) : (
              <div className="space-y-4">
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 font-['Press_Start_2P'] text-sm pixel-corners glow"
                  onClick={handleMint}
                  disabled={isMinting}
                >
                  {isMinting ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Minting...</span>
                    </div>
                  ) : (
                    "Mint NFTs"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {error && (
            <Alert
              variant="destructive"
              className="bg-red-900 border-red-500 pixel-corners"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-['Press_Start_2P'] text-xs">
                Error
              </AlertTitle>
              <AlertDescription className="font-['Press_Start_2P'] text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {isMinted && (
            <Alert className="bg-green-900 border-green-500 pixel-corners">
              <AlertTitle className="font-['Press_Start_2P'] text-xs text-green-400">
                Success!
              </AlertTitle>
              <AlertDescription className="font-['Press_Start_2P'] text-xs text-green-300">
                NFTs minted successfully
              </AlertDescription>
            </Alert>
          )}

          {/* Collection Details */}
          <div className="bg-gray-800 p-4 pixel-corners space-y-2">
            <h3 className="font-['Press_Start_2P'] text-sm text-indigo-400">
              Collection Info
            </h3>
            <div className="text-xs font-['Press_Start_2P'] text-indigo-300 space-y-2">
              <p>Price: {MINT_PRICE} AVAX</p>
              <p>Supply: {MAX_SUPPLY}</p>
              <p>Max/Tx: 50</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="text-xs font-['Press_Start_2P'] text-indigo-300 text-center">
          <p className="w-full">
            {isConnected
              ? "Ready to mint your Mosaic treasure!"
              : "Connect wallet to start minting"}
          </p>
        </CardFooter>
      </Card>
    </div>
  );

  //   return (
  //     <div className="min-h-screen bg-black pixel-bg p-4 flex items-center justify-center">
  //       <Card className="w-full max-w-lg bg-gray-900 text-white border-0 pixel-corners pixel-border">
  //         <CardHeader className="space-y-4 text-center">
  //           <CardTitle className="text-2xl font-['Press_Start_2P'] text-indigo-400">
  //             Mosaic on AVAX
  //           </CardTitle>
  //           <CardDescription className="font-['Press_Start_2P'] text-xs text-indigo-300">
  //             Mint your unique collectibles
  //           </CardDescription>
  //         </CardHeader>

  //         <CardContent className="space-y-6">
  //           {/* NFT Progress */}
  //           <div className="space-y-2">
  //             <div className="flex justify-between text-sm font-['Press_Start_2P']">
  //               <span className="text-indigo-300">Minted</span>
  //               <span className="text-indigo-400">{totalSupply}/{MAX_SUPPLY}</span>
  //             </div>
  //             <Progress
  //               value={progress}
  //               className="h-4 pixel-corners bg-gray-800"
  //               style={{
  //                 background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)'
  //               }}
  //             />
  //           </div>

  //           {/* Minting Controls */}
  //           <div className="space-y-4">
  //             <div className="flex items-center space-x-4 bg-gray-800 p-4 pixel-corners">
  //               <Input
  //                 type="number"
  //                 min="1"
  //                 max="50"
  //                 value={quantity}
  //                 onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number(e.target.value))))}
  //                 className="w-24 bg-gray-700 border-indigo-500 text-white font-['Press_Start_2P'] text-sm pixel-corners"
  //               />
  //               <span className="flex-grow text-indigo-300 font-['Press_Start_2P'] text-sm">
  //                 Cost: {totalCost} AVAX
  //               </span>
  //             </div>

  //             {!isConnected ? (
  //               <Button
  //                 className="w-full bg-indigo-600 hover:bg-indigo-700 font-['Press_Start_2P'] text-sm pixel-corners glow"
  //                 onClick={connectWallet}
  //               >
  //                 Connect Wallet
  //               </Button>
  //             ) : (
  //               <Button
  //                 className="w-full bg-indigo-600 hover:bg-indigo-700 font-['Press_Start_2P'] text-sm pixel-corners glow"
  //                 onClick={handleMint}
  //                 disabled={isMinting}
  //               >
  //                 {isMinting ? (
  //                   <div className="flex items-center justify-center">
  //                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  //                     <span>Minting...</span>
  //                   </div>
  //                 ) : (
  //                   'Mint NFTs'
  //                 )}
  //               </Button>
  //             )}
  //           </div>

  //           {/* Status Messages */}
  //           {error && (
  //             <Alert variant="destructive" className="bg-red-900 border-red-500 pixel-corners">
  //               <AlertCircle className="h-4 w-4" />
  //               <AlertTitle className="font-['Press_Start_2P'] text-xs">Error</AlertTitle>
  //               <AlertDescription className="font-['Press_Start_2P'] text-xs">
  //                 {error}
  //               </AlertDescription>
  //             </Alert>
  //           )}

  //           {isMinted && (
  //             <Alert className="bg-green-900 border-green-500 pixel-corners">
  //               <AlertTitle className="font-['Press_Start_2P'] text-xs text-green-400">
  //                 Success!
  //               </AlertTitle>
  //               <AlertDescription className="font-['Press_Start_2P'] text-xs text-green-300">
  //                 NFTs minted successfully
  //               </AlertDescription>
  //             </Alert>
  //           )}

  //           {/* Collection Details */}
  //           <div className="bg-gray-800 p-4 pixel-corners space-y-2">
  //             <h3 className="font-['Press_Start_2P'] text-sm text-indigo-400">
  //               Collection Info
  //             </h3>
  //             <div className="text-xs font-['Press_Start_2P'] text-indigo-300 space-y-2">
  //               <p>Price: {MINT_PRICE} AVAX</p>
  //               <p>Supply: {MAX_SUPPLY}</p>
  //               <p>Max/Tx: 50</p>
  //               {account && (
  //                 <>
  //                   <p className="text-indigo-400">
  //                     Wallet: {account.slice(0, 6)}...{account.slice(-4)}
  //                   </p>
  //                   <p className="text-indigo-400">
  //                     Balance: {Number(balance).toFixed(4)} AVAX
  //                   </p>
  //                 </>
  //               )}
  //             </div>
  //           </div>
  //         </CardContent>

  //         <CardFooter className="text-xs font-['Press_Start_2P'] text-indigo-300 text-center">
  //           <p className="w-full">Ready to mint your Mosaic treasure?</p>
  //         </CardFooter>
  //       </Card>
  //     </div>
  //   );
}
