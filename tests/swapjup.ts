import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Swapjup } from "../target/types/swapjup";
import { 
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
 } from "@solana/web3.js";
 import { 
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
 } from "@solana/spl-token";
import { expect } from "chai";

describe("swapjup", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.swapjup as Program<Swapjup>;

  const deployer = provider.wallet;
  const newAdmin = anchor.web3.Keypair.generate();
  const userAlice = anchor.web3.Keypair.generate();
  let usdcTokenMint: PublicKey;

  async function airdropSol(provider, publicKey, solAmount) {
    const airdropSig = await provider.connection.requestAirdrop(
      publicKey,
      solAmount * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);
  }

  
  before(async () => {
    await airdropSol(provider, newAdmin.publicKey, 5);
    await airdropSol(provider, userAlice.publicKey, 5);
  })

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

    // Create USDC Token Mint
  usdcTokenMint = await createMint(
    provider.connection,
    deployer.payer,
    deployer.publicKey,
    null,
    6
  );
    // Get PDAs
  const [adminPDA, adminBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), newAdmin.publicKey.toBuffer()],
      program.programId
    );

  const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), usdcTokenMint.toBuffer()],
    program.programId
  );

  // Call Instruction
  await program.methods
    .initializeVault()
    .accounts({
      admin: newAdmin.publicKey,
      //@ts-ignore
      adminAccount: adminPDA,
      vaultToken: usdcTokenMint,
      vaultAccount: vaultPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([newAdmin])
    .rpc();

    // Make Assertions on Vault
    const vaultData = await program.account.vault.fetch(vaultPDA);
    expect(vaultData.nativeToken.toBuffer()).to.deep.eq(usdcTokenMint.toBuffer());
    expect(vaultData.vaultTotalTokens.toNumber()).to.eq(0);
    expect(vaultData.vaultBump).to.eq(vaultBump);
  });

  it("Make Deposits Into Vault", async () => {
    // Mint usdc Token To User
    const userAliceAta = await createAssociatedTokenAccount(
      provider.connection,
      deployer.payer,
      usdcTokenMint,
      userAlice.publicKey
    );
    await mintTo(
      provider.connection,
      deployer.payer,
      usdcTokenMint,
      userAliceAta,
      deployer.publicKey,
      100,
      [deployer.payer]
    );

    // Get PDAs
  const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), usdcTokenMint.toBuffer()],
    program.programId
  );

  const [depositorPDA, depositorBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("depositor"), usdcTokenMint.toBuffer(), userAlice.publicKey.toBuffer()],
    program.programId
  );
  const vaultATA = await getAssociatedTokenAddressSync(
    usdcTokenMint,
    vaultPDA,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const AliceAtaBalanceBefore = await getAccount(
      provider.connection,
      userAliceAta,
    );
  expect(Number(AliceAtaBalanceBefore.amount)).to.eq(100);

  // Call instruction: Make (80 / 10 ** 6) USDC deposit
  await program.methods
    .deposit(new anchor.BN(80 /** 10 ** 6*/))
    .accounts({
      depositor: userAlice.publicKey,
      depositToken: usdcTokenMint,
      //@ts-ignore
      depositorAccount: depositorPDA,
      vaultAccount: vaultPDA,
      depositorAta: userAliceAta,
      vaultAta: vaultATA,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram: SystemProgram.programId,
    })
    .signers([userAlice])
    .rpc();

    // Make (15 / 10 ** 6) USDC deposit
    await program.methods
    .deposit(new anchor.BN(15 /* * 10 ** 6*/))
    .accounts({
      depositor: userAlice.publicKey,
      depositToken: usdcTokenMint,
      //@ts-ignore
      depositorAccount: depositorPDA,
      vaultAccount: vaultPDA,
      depositorAta: userAliceAta,
      vaultAta: vaultATA,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram: SystemProgram.programId,
    })
    .signers([userAlice])
    .rpc();

    // Make Assertions
    const vaultData = await program.account.vault.fetch(vaultPDA);
    const depositorData = await program.account.depositor.fetch(depositorPDA);
    const AliceAtaBalanceAfter = await getAccount(
      provider.connection,
      userAliceAta,
    );
    const vaultAtaBalanceAfter = await getAccount(provider.connection, vaultATA);
    console.log(Number(vaultAtaBalanceAfter.amount));
    console.log(Number(AliceAtaBalanceAfter.amount));
    expect(vaultData.vaultTotalTokens.toNumber()).to.eq(95);
    expect(depositorData.totalDeposits.toNumber()).to.eq(95);
  });

  it("Perform a Jupiter Swap", async () => {}); 
});
