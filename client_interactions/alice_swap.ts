import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { Program, AnchorProvider, utils, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Connection, clusterApiUrl, TransactionInstruction,
    VersionedTransaction, TransactionMessage,
    AddressLookupTableAccount
} from "@solana/web3.js";
import type { Swapjup } from "../target/types/swapjup";
import {utf8} from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const jupiterProgramId = new PublicKey(
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
);
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

let usdc: PublicKey;
//let usdt: PublicKey;
usdc = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");// Devnet USDC address
//usdt = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
const mainnet_usdc = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const wsol = new PublicKey("So11111111111111111111111111111111111111112");

const aliceJupiterSwap = async () => {
    // Get Quote For WSOL and USDC
    const quoteResponse = await (
        await fetch(
            'https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50&restrictIntermediateTokens=true'
        )
    ).json();
  
    //console.log(JSON.stringify(quoteResponse, null, 2));

    // Call Jupiter's Swap Instruction API
    const instructions = await (
        await fetch('https://lite-api.jup.ag/swap/v1/swap-instructions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey: aliceWallet.publicKey
            })
        })
    ).json();
    //console.log(JSON.stringify(instructions, null, 2));
     
   // Getting Lookup Table 
   const getAddressLookupTableAccounts = async (
    keys: string[]
   ): Promise<AddressLookupTableAccount[]> => {
    const infos = await connection.getMultipleAccountsInfo(
        keys.map((k) => new PublicKey(k))
    );
    return infos.reduce<AddressLookupTableAccount[]>((acc, info, idx) => {
        const lookupKey = keys[idx];
        if (info) {
            acc.push(
                new AddressLookupTableAccount({
                    key: new PublicKey(lookupKey),
                    state: AddressLookupTableAccount.deserialize(info.data),
                })
            );
        }
        return acc;
    }, []);
   };
   // load the ATLs
   const addressLookupTableAddresses: string[] = instructions['AddressLookupTableAccount'] || [];
   const addressLookupTableAccounts: AddressLookupTableAccount[] = 
    await getAddressLookupTableAccounts(addressLookupTableAddresses);
   const swapInstructionPayload = instructions['swapInstruction'];

   const swapPayloadData = Buffer.from(swapInstructionPayload.data, "base64");

   // Get Our Swap PDAs
   const [vaultInPDA, vaultInBump] = PublicKey.findProgramAddressSync(
           [utils.bytes.utf8.encode("vault"), wsol.toBuffer()],
           programId
       );
    const [vaultOutPDA, vaultOutBump] = PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("vault"), usdc.toBuffer()],
            programId
        );
    const [depositorPDA, depositorBump] = PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("depositor"), wsol.toBuffer(), aliceWallet.publicKey.toBuffer()],
            programId
    );
   const vaultInTokenAta = await getAssociatedTokenAddressSync(
        wsol,
        vaultInPDA,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const vaultOutTokenAta = await getAssociatedTokenAddressSync(
        usdc,
        vaultOutPDA,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const userOutTokenAta = await getAssociatedTokenAddressSync(
        usdc,
        aliceWallet.publicKey,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
   // Call our anchor swap-ix
   const anchorSwapIx = await program.methods
    .makeJupiterSwap(swapPayloadData)
    .accounts({
        user: aliceWallet.publicKey,
        inToken: wsol,
        inTokenProgram: TOKEN_2022_PROGRAM_ID,
        outToken: usdc,
        outTokenProgram: TOKEN_2022_PROGRAM_ID,
        //@ts-ignore
        vaultInToken: vaultInPDA,
        vaultOutToken: vaultOutPDA,
        depositorAccount: depositorPDA,
        vaultInTokenAta,
        vaultOutTokenAta,
        userOutTokenAta,
        jupiterProgram: jupiterProgramId,
    })
    .remainingAccounts(
        swapInstructionPayload.accounts.map(a => ({
            pubkey: new PublicKey(a.pubkey),
            isSigner: a.isSigner,
            isWritable: a.isWritable,
        }))
    )
    .instruction();

    // Build Versioned Transaction
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const messagev0 = new TransactionMessage({
        payerKey: aliceWallet.publicKey,
        recentBlockhash: blockhash,
        instructions: [anchorSwapIx],
    }).compileToV0Message(addressLookupTableAccounts);
    const tx = new VersionedTransaction(messagev0);

    // Send The Versioned Transaction
    const signature = await provider.sendAndConfirm(tx, [aliceWallet.payer]);
    console.log("Swap suceeded: ", signature);

}

aliceJupiterSwap();
