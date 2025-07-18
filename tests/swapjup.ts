import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Swapjup } from "../target/types/swapjup";
import { 
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
 } from "@solana/web3.js";

describe("swapjup", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.swapjup as Program<Swapjup>;

  const deployer = provider.wallet;
  const newAdmin = anchor.web3.Keypair.generate()

  it("Initialize An Administrator", async () => {});

  it("Initialize Vaults", async () => {});

  it("Make Deposits Into Vault", async () => {});

  it("Perform a Jupiter Swap", async () => {});
});
