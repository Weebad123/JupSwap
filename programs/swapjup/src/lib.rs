use anchor_lang::prelude::*;
pub mod instructions;
pub mod states;

pub use instructions::*;
pub use states::*;

declare_id!("22EFk8AUkEELevcUYQYbHZvFmZi7RwPmMGKokHpdxAyu");

#[program]
pub mod swapjup {
    use super::*;

    pub fn initialize_admin(ctx: Context<InitializeAdmin>, admin_pubkey: Pubkey) -> Result<()> {

        instructions::admin_init(ctx, admin_pubkey)?;
        Ok(())
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        
        instructions::create_vault(ctx)?;
        Ok(())
    }

    pub fn deposit(ctx: Context<DepositorInfo>, amount_to_deposit: u64) -> Result<()> {

        instructions::make_deposit(ctx, amount_to_deposit)?;
        Ok(())
    }

    pub fn make_jupiter_swap(ctx: Context<JupiterSwap>, data: Vec<u8>) -> Result<()> {

        instructions::swap(ctx, data)?;
        Ok(())
    }
}


