use anchor_lang::prelude::*;

use crate::{ contexts::*, Administrator};


pub fn admin_init(ctx: Context<InitializeAdmin>, admin_pubkey: Pubkey) -> Result<()> {

    let admin_info = &mut ctx.accounts.admin_account;

    admin_info.set_inner(Administrator {
        admin_pubkey,
        admin_bump: ctx.bumps.admin_account
    });
    Ok(())
}