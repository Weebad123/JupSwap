import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { Program, AnchorProvider, utils, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Connection, clusterApiUrl} from "@solana/web3.js";
import type { Swapjup } from "../target/types/swapjup";
import {utf8} from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";


const idlFile = fs.readFileSync(
    path.resolve(__dirname, "../target/idl/swapjup.json"),
    "utf-8"
);
const idl = JSON.parse(idlFile);
const programId = new PublicKey(idl.address);

// Set up devnet connection
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const keypairFile = fs.readFileSync(
    path.resolve(__dirname, "../../../.config/solana/id.json"),
    "utf-8"
);
const bobKeypairFile = fs.readFileSync(
    path.resolve(__dirname, "./wallets/userBob-wallet.json"),
    "utf-8"
);
const bobWalletKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(bobKeypairFile)));

// create wallet object 
const bobWallet = new anchor.Wallet(bobWalletKeypair);
// Set up provider
const provider = new AnchorProvider(connection, bobWallet, {
    commitment: "confirmed"
});
anchor.setProvider(provider);

// Initialize the Program
const program = new Program<Swapjup>(idl, provider);

let usdcTokenMint: PublicKey;
usdcTokenMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");


const bobDeposit = async () => {
    // Get PDAs
    const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("vault"), usdcTokenMint.toBuffer()],
        programId
    );

    const [depositorPDA, depositorBump] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("depositor"), usdcTokenMint.toBuffer(), bobWallet.publicKey.toBuffer()],
        programId
    );

   // Call Deposit instruction
   try {
     const bobDepositTx = await program.methods
        .deposit(new BN(10 * 10 ** 6))
        .accounts({
            depositor: bobWallet.publicKey,
            depositToken: usdcTokenMint,
            //@ts-ignore
            depositorAccount: depositorPDA,
            vaultAccount: vaultPDA,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([bobWallet.payer])
        .rpc();

    console.log("Bob Deposit Transaction Into USDC Vault done successfully: ", bobDepositTx);
    console.log("View Bob 10 USDC deposit transaction on Solana Explorer",
        `https://explorer.solana.com/tx/${bobDepositTx}?cluster=devnet`
    );

   } catch (error) {
    console.log("There was an error when Bob Deposits Into USDC Vault: ", error);
   }
}

bobDeposit();