use anchor_lang::prelude::*;


/// ADMINISTRATOR ACCOUNT
#[account]
#[derive(InitSpace)]
pub struct Administrator {

    pub admin_pubkey: Pubkey,

    pub admin_bump: u8,
}


/// PROGRAM VAULT TO HOLD ALL DEPOSITED TOKENS

#[account]
#[derive(InitSpace)]
pub struct Vault {

    pub native_token: Pubkey,

    pub vault_total_tokens: u64,

    pub vault_bump: u8,
}
/// DEPOSITOR ACCOUNT

#[account]
#[derive(InitSpace)]
pub struct Depositor {

    pub owner_pubkey: Pubkey,

    pub total_deposits: u64,

    pub depositor_bump: u8
}