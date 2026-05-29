import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { AggregatorClient } from '.'
import BN from 'bn.js'

function normalizeBN(value: unknown): unknown {
  if (BN.isBN(value)) {
    return value.toString(10)
  }

  if (Array.isArray(value)) {
    return value.map(normalizeBN)
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeBN(item)]),
    )
  }

  return value
}

function stringifyBN(value: unknown): string {
  return JSON.stringify(normalizeBN(value), null, 2)
}

async function run_test() {
  console.log("################# AAAAAA")

  const client = new AggregatorClient()
  const sendKeypair = Ed25519Keypair.fromSecretKey('suiprivkey1qzvnryyn24ftjwr9ytfsfy8sqnln75wu2t7qcu5ym3pz3da8vqnl28jtmdz')
  client.signer = "0xc96690822c4146863abcf370bd3ff651200ddddbd0c556e89d3fc4c35aaf48e3"

  const amount = new BN(1000000)
  const from = "0x2::sui::SUI"
  const target =
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

  console.log("################# BBBBBB")


  //
  // https://app.magmafinance.io/api/router/find_routes?
  // from=0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI&
  // target=0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC&
  // amount=20000000&by_amount_in=true&depth=3&providers=MAGMA,MAGMAALMM,MAGMADARKPOOL,CETUS&v=1000302

  const routerRes = await client.findRouters({
    from,
    target,
    amount,
    byAmountIn: true, // true means fix input amount, false means fix output amount
    providers: ["MAGMA" , "MAGMAALMM", "MAGMADARKPOOL"]
  })

  console.log(
    "############",
    stringifyBN(routerRes),
  )

  const routerTx = new Transaction()

  await client.fastRouterSwap({
    routers: routerRes!.routes,
    byAmountIn: true,
    txb: routerTx,
    slippage: 0.01,
    isMergeTragetCoin: true,
    refreshAllCoins: true,
  })

  let result = await client.devInspectTransactionBlock(routerTx)

  console.log("########### result: ", result)

  if (result.effects.status.status === "success") {
    console.log("Sim exec transaction success")
    const result = await client.signAndExecuteTransaction(routerTx, sendKeypair)
    console.log("result", result)
  }

}

run_test()
