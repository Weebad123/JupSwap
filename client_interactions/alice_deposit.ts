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
const aliceKeypairFile = fs.readFileSync(
    path.resolve(__dirname, "./wallets/userAlice-wallet.json"),
    "utf-8"
);
const aliceWalletKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(aliceKeypairFile)));

// create wallet object 
const aliceWallet = new anchor.Wallet(aliceWalletKeypair);
// Set up provider
const provider = new AnchorProvider(connection, aliceWallet, {
    commitment: "confirmed"
});
anchor.setProvider(provider);

// Initialize the Program
const program = new Program<Swapjup>(idl, provider);

let usdcTokenMint: PublicKey;
usdcTokenMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");


const aliceDeposit = async () => {
    // Get PDAs
    const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("vault"), usdcTokenMint.toBuffer()],
        programId
    );

    const [depositorPDA, depositorBump] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("depositor"), usdcTokenMint.toBuffer(), aliceWallet.publicKey.toBuffer()],
        programId
    );

   // Call Deposit instruction
   try {
     const aliceDepositTx = await program.methods
        .deposit(new BN(15 * 10 ** 6))
        .accounts({
            depositor: aliceWallet.publicKey,
            depositToken: usdcTokenMint,
            //@ts-ignore
            depositorAccount: depositorPDA,
            vaultAccount: vaultPDA,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([aliceWallet.payer])
        .rpc();

    console.log("Alice Deposit Transaction Into USDC Vault done successfully: ", aliceDepositTx);
    console.log("View Alice 15 USDC deposit transaction on Solana Explorer",
        `https://explorer.solana.com/tx/${aliceDepositTx}?cluster=devnet`
    );

   } catch (error) {
    console.log("There was an error when Alice Deposits Into USDC Vault: ", error);
   }
}

aliceDeposit();