use anchor_lang::prelude::*;
use crate::contexts::*;

// VAULT CREATION BY PRIVILEGED ROLE
pub fn create_vault(ctx: Context<InitializeVault>) -> Result<()> {

    // Initialize Vault
    let vault_information = &mut ctx.accounts.vault_account;
    vault_information.native_token = ctx.accounts.vault_token.key();
    vault_information.vault_total_tokens = 0;
    vault_information.vault_bump = ctx.bumps.vault_account;
    
    Ok(())
}