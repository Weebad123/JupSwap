use anchor_lang::prelude::*;


#[error_code]
pub enum SwapjpuError {
    #[msg(Only Admin Can Initialize A Vault)]
    OnlyAdmin
}