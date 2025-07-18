import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Swapjup } from "../target/types/swapjup";
import { 
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
 } from "@solana/web3.js";
 import { 
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  mintTo,
 } from "@solana/spl-token";
import { expect } from "chai";

describe("swapjup", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.swapjup as Program<Swapjup>;

  const deployer = provider.wallet;
  const newAdmin = anchor.web3.Keypair.generate();
  let usdcTokenMint: PublicKey;

  it("Initialize An Administrator", async () => {
    // Get PDA
    const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .initializeAdmin(newAdmin.publicKey)
      .accounts({})
      .signers([deployer.payer])
      .rpc();

    // Get Admin PDA and Make Assertions
    const adminPDAdata = await program.account.administrator.fetch(adminPDA);
    expect(adminPDAdata.adminPubkey).to.deep.equal(newAdmin.publicKey);
    expect(adminPDAdata.adminBump).to.eq(adminBump);
  });

  it("Initialize Vaults", async () => {
    // Get PDAs
  const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Make Deposits Into Vault", async () => {});

  it("Perform a Jupiter Swap", async () => {});
});
