use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, 
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}};
use jupiter_aggregator::program::Jupiter;
use crate::{Vault, Depositor, Administrator};
use crate::states::SwapjpuError;

declare_program!(jupiter_aggregator);


/// ADMINISTRATOR ACCOUNT CONTEXT
#[derive(Accounts)]
#[instruction(admin_pubkey: Pubkey)]
pub struct InitializeAdmin<'info>  {

    #[account(mut)]
    pub deployer: Signer<'info>,

    #[account(
        init,
        payer = deployer,
        space = 8 + Administrator::INIT_SPACE,
        seeds = [
            b"admin",
            admin_pubkey.as_ref()
        ],
        bump
    )]
    pub admin_account: Account<'info, Administrator>,

    pub system_program: Program<'info, System>,
}

/// PROGRAM VAULT ACCOUNT CONTEXT 

#[derive(Accounts)]
//#[instruction(vault_token: Pubkey)]
pub struct InitializeVault<'info> {

    #[account(
        mut,
        constraint = admin.key() == admin_account.admin_pubkey @SwapjpuError::OnlyAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"admin",
            admin_account.admin_pubkey.as_ref()
        ],
        bump = admin_account.admin_bump
    )]
    pub admin_account: Account<'info, Administrator>,

    #[account()]
    pub vault_token: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = 8 + Vault::INIT_SPACE,
        seeds = [
            b"vault",
            vault_token.key().as_ref()
        ],
        bump
    )]
    pub vault_account: Account<'info, Vault>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}


/// DEPOSITOR ACCOUNT CONTEXT
#[derive(Accounts)]
pub struct DepositorInfo<'info> {
    
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut)]
    pub deposit_token: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = depositor,
        space = 8 + Depositor::INIT_SPACE,
        seeds = [
            b"depositor",
            deposit_token.key().as_ref(),
            depositor.key().as_ref()
        ],
        bump,
    )]
    pub depositor_account: Account<'info, Depositor>,

    #[account(
        mut,
        seeds = [
            b"vault",
            deposit_token.key().as_ref(),
        ],
        bump = vault_account.vault_bump,
    )]
    pub vault_account: Account<'info, Vault>,

    #[account(
        mut,
        associated_token::mint = deposit_token,
        associated_token::authority = depositor.key(),
    )]
    pub depositor_ata: InterfaceAccount<'info, TokenAccount>,
 
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = deposit_token,
        associated_token::authority = vault_account
    )]
    pub vault_ata: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}
    

// SWAP CONTEXT
#[derive(Accounts)]
pub struct JupiterSwap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub in_token: InterfaceAccount<'info, Mint>,

    pub out_token: InterfaceAccount<'info, Mint>,

    pub in_token_program: Interface<'info, TokenInterface>,

    pub out_token_program: Interface<'info, TokenInterface>,

    // Vault Accounts To Track Tokens In Vault After A Swap
    #[account(
        mut,
        seeds = [
            b"vault",
            in_token.key().as_ref()
        ],
        bump = vault_in_token.vault_bump
    )]
    pub vault_in_token: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [
            b"vault",
            out_token.key().as_ref()
        ],
        bump = vault_out_token.vault_bump
    )]
    pub vault_out_token: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [
            b"depositor",
            in_token.key().as_ref(),
            user.key().as_ref()
        ],
        bump,
    )]
    pub depositor_account: Account<'info, Depositor>,

    // Actual Vault ATAs Involved In Swaps
    #[account(
        mut,
        associated_token::mint = in_token,
        associated_token::authority = vault_in_token,
        associated_token::token_program = in_token_program,
    )]
    pub vault_in_token_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = out_token,
        associated_token::authority = vault_out_token,
        associated_token::token_program = out_token_program,
    )]
    pub vault_out_token_ata: InterfaceAccount<'info, TokenAccount>,

    // User ATA to receive Out_Token From Vault
    #[account(
        mut,
        associated_token::mint = out_token,
        associated_token::authority = user,
        associated_token::token_program = out_token_program,
    )]
    pub user_out_token_ata: InterfaceAccount<'info, TokenAccount>,

    pub jupiter_program: Program<'info, Jupiter>,
}

impl<'info> JupiterSwap<'info> {
    // Associated Method That Transfers Swapped out Token From Vault To User After Jupiter Swap
    // Successfully Done
    pub fn transfer_to_user_after_swap(&mut self, amount: u64) -> Result<()> {

        let accounts = TransferChecked {
            from: self.vault_out_token_ata.to_account_info(),
            mint: self.vault_out_token.to_account_info(),
            to: self.user_out_token_ata.to_account_info(),
            authority: self.vault_out_token.to_account_info()
        };
        let out_token_key = self.out_token.key();
        let vault_seeds = &[
            b"vault",
            out_token_key.as_ref(),
            &[self.vault_out_token.vault_bump]
        ];
        let signing_vault_seeds = &[&vault_seeds[..]];

        let transfer_cpi = CpiContext::new_with_signer(
            self.out_token_program.to_account_info(),
            accounts,
            signing_vault_seeds
        );

        transfer_checked(transfer_cpi, amount, self.out_token.decimals)?;
        Ok(())
    }
}