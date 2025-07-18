use anchor_lang::{
    prelude::*, solana_program::{instruction::Instruction, program::invoke_signed}};
use std::str::FromStr;

//use jupiter_aggregator::program::Jupiter;

use crate::JupiterSwap;

declare_program!(jupiter_aggregator);

pub fn jupiter_program_id() -> Pubkey {
    Pubkey::from_str("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4").unwrap()
}


// BUILD SWAP INSTRUCTION
/// @dev:: Make sure swapping amount is exactly equal to user's deposited Amount . Off-chain check
pub fn swap(ctx: Context<JupiterSwap>, data: Vec<u8>) -> Result<()> {

    // Check To Ensure Correct Program
    require_keys_eq!(*ctx.accounts.jupiter_program.key, jupiter_program_id());
    // Get Vault Accounts For Tracking
    let in_token_vault_info = &mut ctx.accounts.vault_in_token;
    let out_token_vault_info = &mut ctx.accounts.vault_out_token;
    let depositor_account_info = &mut ctx.accounts.depositor_account;

    // Get Initial Balances Of Vaults
    let in_token_vault_balance_before = ctx.accounts.vault_in_token_ata.amount;
    let out_token_vault_balance_before = ctx.accounts.vault_out_token_ata.amount;

    // Cpi Into Jupiter Swapping Mechanism
    let accounts_for_jupiter: Vec<AccountMeta> = ctx.remaining_accounts
        .iter()
        .map(|acc| {
            let is_signer = acc.key == &in_token_vault_info.key();
            AccountMeta {
                pubkey: *acc.key,
                is_signer,
                is_writable: acc.is_writable,
            }
        })
        .collect();

    let accounts_infos: Vec<AccountInfo> = ctx.remaining_accounts
        .iter()
        .map(|acc| AccountInfo { ..acc.clone()})
        .collect();

    // in_token vault will sign instruction, so let's get the seeds
    let token_in = ctx.accounts.in_token.key();
    let vault_seeds = &[
        b"vault",
        token_in.as_ref(),
        &[in_token_vault_info.vault_bump]
    ];
    let signing_vault_seeds = &[&vault_seeds[..]];

    // Get Jupiter instruction data
    let jupiter_instruction_data = Instruction {
        program_id: ctx.accounts.jupiter_program.key(),
        accounts: accounts_for_jupiter,
        data
    };

    // Actual cpi call via invoke signed
    invoke_signed(
        &jupiter_instruction_data,
        &accounts_infos,
        signing_vault_seeds
    )?;

    // Get Vault Balances After Jupiter Swap
    let in_vault_token_delta = ctx.accounts.vault_in_token_ata.amount
        .checked_sub(in_token_vault_balance_before).unwrap();
    let out_vault_token_delta = ctx.accounts.vault_out_token_ata.amount
        .checked_sub(out_token_vault_balance_before).unwrap();

    // Update Vault States
    in_token_vault_info.vault_total_tokens = in_token_vault_info.vault_total_tokens
        .checked_sub(in_vault_token_delta).unwrap();
    out_token_vault_info.vault_total_tokens = out_token_vault_info.vault_total_tokens
        .checked_add(out_vault_token_delta).unwrap();

    // Update Depositor Account State
    depositor_account_info.total_deposits = depositor_account_info.total_deposits
        .checked_sub(in_vault_token_delta).unwrap();

    // Transfer Swapped Tokens To User
    ctx.accounts.transfer_to_user_after_swap(out_vault_token_delta)?;

    Ok(())
}