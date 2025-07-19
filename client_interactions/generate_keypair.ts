import fs from "fs";
import path from "path";
import { Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";


function generateWallets() {

    const walletNames = [
        "newAdmin",
        "userAlice",
        "userBob",
    ];

    const walletsDir = path.resolve(process.cwd(), "wallets");

    walletNames.forEach((name) => {
        const keypair = Keypair.generate();
        const filename = `${name}-wallet.json`;
        const filepath = path.join(walletsDir, filename);

        fs.writeFileSync(
            filepath,
            JSON.stringify(Array.from(keypair.secretKey)),
            "utf-8"
        );

        console.log(`Generated ${name} wallet: ${keypair.publicKey.toString()}`);
        console.log(`Saved To ${filepath}`);
    })

    console.log(`\nAll wallets generated successfully!`);
}

generateWallets();