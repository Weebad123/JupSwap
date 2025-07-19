import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { Program, AnchorProvider, utils, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Connection, clusterApiUrl} from "@solana/web3.js";
import type { Swapjup } from "../target/types/swapjup";
import {utf8} from "@coral-xyz/anchor/dist/cjs/utils/bytes";


const idlFile = fs.readFileSync(
    path.resolve(__dirname, "../target/idl/swapjup.json"),
    "utf-8"
);
const idl = JSON.parse(idlFile);
const programId = new PublicKey(idl.address);

// Set up devnet connection
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Helper Function To Load Wallet
function loadWallet(name: String): Keypair {
    const walletPath = path.resolve(
        process.cwd(),
        "wallets",
        `${name}-wallet.json`
    );
    const keypairData = fs.readFileSync(walletPath, "utf-8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairData)));
}

// Load The newAdmin 
const newAdminKeypair = loadWallet("newAdmin");

// 
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

// Function to initialize deployer as Admin
const initializeAdmin = async () => {
    // Get Admin PDA
    const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("admin"), wallet.publicKey.toBuffer()],
        programId
    );

    console.log("Initializing admin with address: ", wallet.publicKey.toString());
    console.log("Admin PDA: ", adminPDA.toString());

    // Call program's instruction
    try {
        const tx = await program.methods
            .initializeAdmin(wallet.publicKey)
            .accounts({})
            .signers([wallet.payer])
            .rpc();

        console.log("Transaction submitted successfully: ", tx);
        console.log("View transaction on Solana explorer:",
            `https://explorer.solana.com/tx/${tx}?cluster=devnet`
        );

    } catch (err) {
        console.error("There was an error initializing the admin: ", err);
    }
}

initializeAdmin();