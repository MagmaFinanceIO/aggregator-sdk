# Install

The SDK is published to npm registry. To use the SDK in your project, you can

```sh
npm install @magmaprotocol/aggregator-sdk
```

# Usage

## 1. Init client with rpc and package config

```typescript
const client = new AggregatorClient()
```

## 2. Get best router swap result from aggregator service

```typescript
const amount = new BN(1000000)
const from = "0x2::sui::SUI"
const target =
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

const routerRes = await client.findRouters({
  from,
  target,
  amount,
  byAmountIn: true, // true means fix input amount, false means fix output amount
})
```

## 3. Confirm and do fast swap

```typescript
const routerTx = new Transaction()

if (routerRes != null) {
  await client.fastRouterSwap({
    routers: routerRes.routes,
    byAmountIn,
    txb: routerTx,
    slippage: 0.01,
    isMergeTragetCoin: true,
    refreshAllCoins: true,
  })

  let result = await client.devInspectTransactionBlock(routerTx, keypair)

  if (result.effects.status.status === "success") {
    console.log("Sim exec transaction success")
    const result = await client.signAndExecuteTransaction(routerTx, keypair)
  }
  console.log("result", result)
}
```

## 4. Build PTB and return target coin

```typescript
const routerTx = new Transaction()
const byAmountIn = true;

if (routerRes != null) {
  const targetCoin = await client.routerSwap({
    routers: routerRes.routes,
    byAmountIn,
    txb: routerTx,
    inputCoin,
    slippage: 0.01,
  })

  // you can use this target coin object argument to build your ptb.
  const client.transferOrDestoryCoin(
      txb,
      targetCoin,
      targetCoinType
  )

  let result = await client.devInspectTransactionBlock(routerTx, keypair)

  if (result.effects.status.status === "success") {
    console.log("Sim exec transaction success")
    const result = await client.signAndExecuteTransaction(routerTx, keypair)
  }
  console.log("result", result)
}
```
