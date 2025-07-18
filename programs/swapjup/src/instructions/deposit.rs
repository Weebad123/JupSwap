use anchor_lang::prelude::*;

use anchor_spl::token_interface::{TransferChecked, transfer_checked};

use crate::DepositorInfo;


// DEPOSIT TOKENS INTO VAULT
pub fn make_deposit(ctx: Context<DepositorInfo>, amount_to_deposit: u64) -> Result<()> {

    // Depositor Account
    let depositor_information = &mut ctx.accounts.depositor_account;
    let vault_information = &mut ctx.accounts.vault_account;

    // Make Token Transfer From Depositor ATA to Vault ATA
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.depositor_ata.to_account_info(),
        to: ctx.accounts.vault_ata.to_account_info(),
        mint: ctx.accounts.deposit_token.to_account_info(),
        authority: ctx.accounts.depositor.to_account_info()
    };
    let transfer_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts
    );
    transfer_checked(transfer_cpi, amount_to_deposit, ctx.accounts.deposit_token.decimals)?;

    // Update Depositor and Vault Account Informations
    depositor_information.owner_pubkey = ctx.accounts.depositor.key();
    // Track user's total deposits in vault
    depositor_information.total_deposits = depositor_information.total_deposits
        .checked_add(amount_to_deposit).unwrap();

    depositor_information.depositor_bump = ctx.bumps.depositor_account;


    // Track Total tokens in vault :: would not overflow, so just unwrap
    vault_information.vault_total_tokens = vault_information.vault_total_tokens
        .checked_add(amount_to_deposit).unwrap();
    
    Ok(())
}