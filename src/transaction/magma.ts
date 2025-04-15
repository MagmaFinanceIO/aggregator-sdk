import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, Path } from ".."

export type MagmaFlashSwapResult = {
  targetCoin: TransactionObjectArgument
  flashReceipt: TransactionObjectArgument
  payAmount: TransactionArgument
}

export class Magma implements Dex {
  private globalConfig: string
  private partner: string

  constructor(env: Env, partner?: string, globalConfig?: string) {
    this.globalConfig =
      globalConfig ??
      (env === Env.Mainnet
        ? "0x680dc99b0e428883e94518612484a7579a3de364af391307e37f63065b1524e2"
        : "0x61f231024561d4dcf9099986a6944dc4be35ee489bdc61a3252a831a06f20b9d")

    this.partner =
      partner ??
      (env === Env.Mainnet
        ? "0xd55811aa24562c6883cde8736f196f992d7a9b07d4b701408f1b5011cdd67a13"
        : "0x00bf176a399bd15edbfc8f1ed778733cf3162bd27259b5f765ca1a7a45486248")
  }

  flash_swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    by_amount_in: boolean,
  ): MagmaFlashSwapResult {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["flash_swap_a2b", from, target]
      : ["flash_swap_b2a", target, from]
    let amount = by_amount_in ? path.amountIn : path.amountOut
    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      txb.pure.u64(amount),
      txb.pure.bool(by_amount_in),
      txb.object(CLOCK_ADDRESS),
    ]
    const res: TransactionObjectArgument[] = txb.moveCall({
      target: `${client.publishedAtV3()}::magma_clmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return {
      targetCoin: res[0],
      flashReceipt: res[1],
      payAmount: res[2],
    }
  }

  repay_flash_swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    receipt: TransactionArgument,
  ): TransactionObjectArgument {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["repay_flash_swap_a2b", from, target]
      : ["repay_flash_swap_b2a", target, from]
    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      inputCoin,
      receipt,
    ]
    const res = txb.moveCall({
      target: `${client.publishedAtV3()}::magma_clmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b", from, target]
      : ["swap_b2a", target, from]
    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const res = txb.moveCall({
      target: `${client.publishedAtV3()}::magma_clmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
