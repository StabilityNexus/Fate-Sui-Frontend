import "dotenv/config"

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from "@mysten/sui/utils"

import { SuiJsonRpcClient, SuiObjectChange } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions'
import path, { dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

const priv_key = process.env.PRIVATE_KEY;
if (!priv_key) {
    console.log("Error: PRIVATE_KEY not set in .env");
    process.exit(1);
}
const keypair = Ed25519Keypair.fromSecretKey(fromBase64(priv_key).slice(1));
const path_to_contracts = path.join(dirname(fileURLToPath(import.meta.url)), "../contracts")
const client = new SuiJsonRpcClient({
    url: 'https://fullnode.testnet.sui.io',
    network: 'testnet',
});


console.log("Building contracts")
const { modules, dependencies } = JSON.parse(execSync(
    `sui move build --dump-bytecode-as-base64 --path ${path_to_contracts}`,
    { encoding: "utf-8" }
))

console.log(`Deploying from ${keypair.toSuiAddress()}`)
console.log("modules", modules);
console.log("dependecies", dependencies)

const deploy_trx = new Transaction();
const [upgrade_cap] = deploy_trx.publish({
    modules,
    dependencies,
})

// Transfer upgrade cap to sender
deploy_trx.transferObjects([upgrade_cap], keypair.toSuiAddress());
deploy_trx.setGasBudget(200_000_000);
const { objectChanges, balanceChanges } = await client.signAndExecuteTransaction({
    signer: keypair, transaction: deploy_trx, options: {
        showBalanceChanges: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
        showInput: false,
        showRawInput: false
    }
})

console.log(objectChanges, balanceChanges)


const path_to_address_file = path.join(dirname(fileURLToPath(import.meta.url)), "/deployed_addresses.json")
writeFileSync(path_to_address_file, JSON.stringify(objectChanges, null, 4))
console.log("Wrote deployed_addresses.json successfully:", objectChanges);
