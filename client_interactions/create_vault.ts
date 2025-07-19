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
const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));

// create wallet object 
const wallet = new anchor.Wallet(walletKeypair);
// Set up provider
const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed"
});
anchor.setProvider(provider);

// Initialize the Program
const program = new Program<Swapjup>(idl, provider);

let usdcTokenMint: PublicKey;
usdcTokenMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const createVault = async () => {
    // Get PDAs
    const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("admin"), wallet.publicKey.toBuffer()],
            programId
    );
    const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("vault"), usdcTokenMint.toBuffer()],
        programId
    );

    // Call instruction
    try {
        const tx = await program.methods
            .initializeVault()
            .accounts({
                admin: wallet.publicKey,
                //@ts-ignore
                adminAccount: adminPDA,
                vaultToken: usdcTokenMint,
                vaultAccount: vaultPDA,
                tokenProgram: TOKEN_PROGRAM_ID
            })
            .signers([wallet.payer])
            .rpc();

        console.log("Vault Creation Transaction submitted successfully: ", tx);
        console.log("View Vault Creation Transaction On Solana Explorer: ", 
            `https://explorer.solana.com/tx/${tx}?cluster=devnet`
        );
    } catch (error) {
        console.error("There was an error initializing the Vault: ", error);
    }
}

createVault();